const { postJson, parseJsonText } = require('./httpClient');
const { VoiceServiceError } = require('../errors');

// Cohere's JSON-schema validator does not support regex patterns. Date
// format validation still happens after generation in normalizeExpenseDraft.
const cohereSchema = (schema) => {
  const copy = JSON.parse(JSON.stringify(schema));
  delete copy.properties?.date?.pattern;
  return copy;
};

const createCohereProvider = ({ apiKey, model, timeoutMs, retries }) => {
  if (!apiKey || !model) {
    throw new VoiceServiceError('Cohere voice extraction is not configured.', {
      code: 'LLM_NOT_CONFIGURED',
      status: 503
    });
  }

  return {
    name: 'cohere',
    async generateStructured({ system, user, schema }) {
      const response = await postJson('https://api.cohere.com/v2/chat', {
        headers: { Authorization: `Bearer ${apiKey}` },
        timeoutMs,
        retries,
        body: {
          model,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user }
          ],
          response_format: {
            type: 'json_object',
            schema: cohereSchema(schema)
          },
          temperature: 0
        }
      });

      const text = response.message?.content?.[0]?.text;
      if (!text) {
        throw new VoiceServiceError('Cohere returned an empty extraction.', {
          code: 'LLM_EMPTY_RESPONSE',
          status: 502
        });
      }
      return parseJsonText(text);
    }
  };
};

module.exports = { createCohereProvider };
