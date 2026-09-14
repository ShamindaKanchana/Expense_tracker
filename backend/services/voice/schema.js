const { z } = require('zod');
const { EXPENSE_CATEGORIES } = require('../../domain/expenseCategories');

const VOICE_LOCALES = Object.freeze(['en-LK', 'en-US', 'si-LK', 'ta-LK']);
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const isValidTimeZone = (value) => {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
};

const voiceDraftRequestSchema = z.object({
  transcript: z.string().trim().min(1).max(1000),
  locale: z.enum(VOICE_LOCALES),
  timezone: z.string().min(1).max(100).refine(isValidTimeZone, 'Invalid IANA time zone')
}).strict();

const modelExpenseDraftSchema = z.object({
  amount: z.number().finite().positive().nullable(),
  description: z.string().trim().min(1).max(250).nullable(),
  category: z.enum(EXPENSE_CATEGORIES).nullable(),
  date: z.string().regex(DATE_PATTERN).nullable()
}).strict();

const expenseDraftJsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    amount: {
      type: ['number', 'null'],
      description: 'Positive expense amount as a number, or null when missing.'
    },
    description: {
      type: ['string', 'null'],
      description: 'Short expense description in the transcript language, or null when missing.'
    },
    category: {
      type: ['string', 'null'],
      enum: [...EXPENSE_CATEGORIES, null],
      description: 'Exactly one allowed stored category key, or null.'
    },
    date: {
      type: ['string', 'null'],
      pattern: '^\\d{4}-\\d{2}-\\d{2}$',
      description: 'Expense date in YYYY-MM-DD format, or null when not stated.'
    }
  },
  required: ['amount', 'description', 'category', 'date']
};

module.exports = {
  VOICE_LOCALES,
  voiceDraftRequestSchema,
  modelExpenseDraftSchema,
  expenseDraftJsonSchema,
  isValidTimeZone
};
