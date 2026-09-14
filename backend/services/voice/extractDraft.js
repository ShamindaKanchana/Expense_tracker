const { buildExpenseExtractionMessages } = require('./prompt');
const { expenseDraftJsonSchema } = require('./schema');
const { normalizeExpenseDraft } = require('./normalizeDraft');
const { getLocalDate } = require('./localDate');
const { createConfiguredLlmProvider } = require('./providers');

const extractExpenseDraft = async (
  { transcript, locale, timezone },
  { provider = createConfiguredLlmProvider(), now = new Date() } = {}
) => {
  const localDate = getLocalDate(timezone, now);
  const messages = buildExpenseExtractionMessages({
    transcript,
    locale,
    timezone,
    localDate
  });

  const rawDraft = await provider.generateStructured({
    ...messages,
    transcript,
    locale,
    timezone,
    localDate,
    schema: expenseDraftJsonSchema,
    schemaName: 'expense_draft'
  });

  return {
    transcript,
    locale,
    provider: provider.name,
    promptVersion: messages.promptVersion,
    ...normalizeExpenseDraft(rawDraft, { localDate })
  };
};

module.exports = { extractExpenseDraft };
