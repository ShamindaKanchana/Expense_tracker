const { createGeminiProvider } = require('./gemini');
const { createCohereProvider } = require('./cohere');
const { createOpenAiCompatibleProvider } = require('./openAiCompatible');
const { createMockProvider } = require('./mock');
const { VoiceServiceError } = require('../errors');

const toPositiveInteger = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
};

const createConfiguredLlmProvider = (env = process.env) => {
  const provider = (env.LLM_PROVIDER || '').trim().toLowerCase();
  const common = {
    model: env.LLM_MODEL,
    timeoutMs: toPositiveInteger(env.LLM_TIMEOUT_MS, 15000),
    retries: Math.min(toPositiveInteger(env.LLM_MAX_RETRIES, 1), 2)
  };

  if (provider === 'mock') {
    if (env.NODE_ENV === 'production' || env.VOICE_ALLOW_MOCK !== 'true') {
      throw new VoiceServiceError('The mock LLM provider is disabled.', {
        code: 'LLM_NOT_CONFIGURED',
        status: 503
      });
    }
    return createMockProvider();
  }

  if (provider === 'gemini') {
    return createGeminiProvider({ ...common, apiKey: env.GEMINI_API_KEY });
  }

  if (provider === 'cohere') {
    return createCohereProvider({ ...common, apiKey: env.COHERE_API_KEY });
  }

  if (provider === 'openai') {
    return createOpenAiCompatibleProvider({
      ...common,
      providerName: 'openai',
      apiKey: env.OPENAI_API_KEY,
      baseUrl: env.LLM_BASE_URL || 'https://api.openai.com/v1',
      strictSchema: true
    });
  }

  if (provider === 'deepseek') {
    return createOpenAiCompatibleProvider({
      ...common,
      providerName: 'deepseek',
      apiKey: env.DEEPSEEK_API_KEY,
      baseUrl: env.LLM_BASE_URL || 'https://api.deepseek.com',
      strictSchema: false
    });
  }

  throw new VoiceServiceError('No supported LLM provider is configured.', {
    code: 'LLM_NOT_CONFIGURED',
    status: 503
  });
};

module.exports = { createConfiguredLlmProvider };
