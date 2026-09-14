const { VoiceServiceError } = require('../errors');

const postJson = async (url, { headers = {}, body, timeoutMs = 15000, retries = 1 } = {}) => {
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        body: JSON.stringify(body),
        signal: controller.signal
      });

      const text = await response.text();
      if (!response.ok) {
        const retryable = response.status === 429 || response.status >= 500;
        const error = new VoiceServiceError(
          `The configured language-model provider returned HTTP ${response.status}.`,
          { code: 'LLM_PROVIDER_ERROR', status: 502 }
        );
        if (!retryable || attempt === retries) throw error;
        lastError = error;
        continue;
      }

      try {
        return JSON.parse(text);
      } catch (cause) {
        throw new VoiceServiceError('The language-model provider returned invalid JSON.', {
          code: 'LLM_PROVIDER_RESPONSE_INVALID',
          status: 502,
          cause
        });
      }
    } catch (error) {
      if (error instanceof VoiceServiceError) throw error;
      lastError = new VoiceServiceError(
        error.name === 'AbortError'
          ? 'The language-model provider timed out.'
          : 'The language-model provider could not be reached.',
        {
          code: error.name === 'AbortError' ? 'LLM_PROVIDER_TIMEOUT' : 'LLM_PROVIDER_UNAVAILABLE',
          status: 503,
          cause: error
        }
      );
      if (attempt === retries) throw lastError;
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError;
};

const parseJsonText = (text) => {
  try {
    return JSON.parse(text);
  } catch (cause) {
    throw new VoiceServiceError('The language-model provider returned malformed structured output.', {
      code: 'LLM_OUTPUT_NOT_JSON',
      status: 502,
      cause
    });
  }
};

module.exports = {
  postJson,
  parseJsonText
};
