const { modelExpenseDraftSchema } = require('./schema');
const { VoiceServiceError } = require('./errors');

const isValidDate = (date) => {
  const parsed = new Date(`${date}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
};

const normalizeExpenseDraft = (rawDraft, { localDate }) => {
  const parsed = modelExpenseDraftSchema.safeParse(rawDraft);
  if (!parsed.success) {
    throw new VoiceServiceError('The extraction provider returned an invalid expense draft.', {
      code: 'INVALID_MODEL_OUTPUT',
      status: 502
    });
  }

  const raw = parsed.data;
  const date = raw.date || localDate;
  if (!isValidDate(date) || date > localDate) {
    throw new VoiceServiceError('The extracted expense date is invalid.', {
      code: 'INVALID_EXPENSE_DATE',
      status: 422
    });
  }

  const draft = {
    amount: raw.amount,
    description: raw.description,
    category: raw.category,
    date
  };

  const fieldStatus = {
    amount: raw.amount === null ? 'missing' : 'explicit',
    description: raw.description === null ? 'missing' : 'explicit',
    category: raw.category === null ? 'missing' : 'inferred',
    date: raw.date === null ? 'defaulted' : 'resolved'
  };

  const warnings = [];
  if (fieldStatus.category === 'inferred') warnings.push('CATEGORY_INFERRED');
  if (fieldStatus.date === 'defaulted') warnings.push('DATE_DEFAULTED');
  if (Object.values(fieldStatus).includes('missing')) warnings.push('INCOMPLETE_DRAFT');

  return {
    draft,
    fieldStatus,
    warnings,
    canProceed: !Object.values(draft).some((value) => value === null)
  };
};

module.exports = {
  isValidDate,
  normalizeExpenseDraft
};
