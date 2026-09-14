const { postJson, parseJsonText } = require('./httpClient');
const { VoiceServiceError } = require('../errors');

const createOpenAiCompatibleProvider = ({
  providerName,
  apiKey,
  model,
  baseUrl,
  timeoutMs,
  retries,
  strictSchema
}) => {
  if (!apiKey || !model || !baseUrl) {
    throw new VoiceServiceError(`${providerName} voice extraction is not configured.`, {
      code: 'LLM_NOT_CONFIGURED',
      status: 503
    });
  }

  return {
    name: providerName,
    async generateStructured({ system, user, schema, schemaName }) {
      const responseFormat = strictSchema
        ? {
            type: 'json_schema',
            json_schema: { name: schemaName, strict: true, schema }
          }
        : { type: 'json_object' };

      const response = await postJson(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
        headers: { Authorization: `Bearer ${apiKey}` },
        timeoutMs,
        retries,
        body: {
          model,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user }
          ],
          response_format: responseFormat,
          temperature: 0
        }
      });

      const text = response.choices?.[0]?.message?.content;
      if (!text) {
        throw new VoiceServiceError(`${providerName} returned an empty extraction.`, {
          code: 'LLM_EMPTY_RESPONSE',
          status: 502
        });
      }
      return parseJsonText(text);
    }
  };
};

module.exports = { createOpenAiCompatibleProvider };
