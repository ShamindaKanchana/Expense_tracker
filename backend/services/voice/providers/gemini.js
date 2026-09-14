const { postJson, parseJsonText } = require('./httpClient');
const { VoiceServiceError } = require('../errors');

const createGeminiProvider = ({ apiKey, model, timeoutMs, retries }) => {
  if (!apiKey || !model) {
    throw new VoiceServiceError('Gemini voice extraction is not configured.', {
      code: 'LLM_NOT_CONFIGURED',
      status: 503
    });
  }

  return {
    name: 'gemini',
    async generateStructured({ system, user, schema }) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
      const response = await postJson(url, {
        headers: { 'x-goog-api-key': apiKey },
        timeoutMs,
        retries,
        body: {
          system_instruction: { parts: [{ text: system }] },
          contents: [{ role: 'user', parts: [{ text: user }] }],
          generationConfig: {
            temperature: 0,
            responseMimeType: 'application/json',
            responseJsonSchema: schema
          }
        }
      });

      const text = response.candidates?.[0]?.content?.parts
        ?.map((part) => part.text || '')
        .join('');
      if (!text) {
        throw new VoiceServiceError('Gemini returned an empty extraction.', {
          code: 'LLM_EMPTY_RESPONSE',
          status: 502
        });
      }
      return parseJsonText(text);
    }
  };
};

module.exports = { createGeminiProvider };
