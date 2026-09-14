const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { EXPENSE_CATEGORIES } = require('../domain/expenseCategories');
const { buildExpenseExtractionMessages } = require('../services/voice/prompt');
const {
  voiceDraftRequestSchema,
  modelExpenseDraftSchema
} = require('../services/voice/schema');
const { normalizeExpenseDraft } = require('../services/voice/normalizeDraft');
const { extractExpenseDraft } = require('../services/voice/extractDraft');

test('frontend and backend category keys stay synchronized', () => {
  const frontendSource = fs.readFileSync(
    path.resolve(__dirname, '../../frontend/src/utils/categories.js'),
    'utf8'
  );
  const categoryArray = frontendSource.match(/CATEGORY_KEYS\s*=\s*\[([\s\S]*?)\]/);
  assert.ok(categoryArray, 'frontend CATEGORY_KEYS declaration was not found');
  const frontendCategories = [...categoryArray[1].matchAll(/'([^']+)'/g)]
    .map((match) => match[1]);

  assert.deepEqual(frontendCategories, [...EXPENSE_CATEGORIES]);
});

test('system prompt includes every canonical category and non-invention rule', () => {
  const messages = buildExpenseExtractionMessages({
    transcript: 'Lunch was 2500',
    locale: 'en-LK',
    timezone: 'Asia/Colombo',
    localDate: '2026-09-14'
  });

  for (const category of EXPENSE_CATEGORIES) {
    assert.match(messages.system, new RegExp(category));
  }
  assert.match(messages.system, /Never invent/);
  assert.match(messages.system, /concise item-focused noun phrase/);
  assert.match(messages.system, /Remove first-person pronouns/);
  assert.doesNotMatch(messages.system, /Lunch was 2500/);
  assert.match(messages.user, /Lunch was 2500/);
});

test('request schema accepts supported trilingual locales and rejects invalid input', () => {
  for (const locale of ['en-LK', 'si-LK', 'ta-LK']) {
    assert.equal(voiceDraftRequestSchema.safeParse({
      transcript: 'test',
      locale,
      timezone: 'Asia/Colombo'
    }).success, true);
  }
  assert.equal(voiceDraftRequestSchema.safeParse({
    transcript: '',
    locale: 'fr-FR',
    timezone: 'not-a-zone'
  }).success, false);
});

test('model schema rejects invented categories and extra keys', () => {
  assert.equal(modelExpenseDraftSchema.safeParse({
    amount: 1200,
    description: 'Lunch',
    category: 'Dining',
    date: '2026-09-14'
  }).success, false);

  assert.equal(modelExpenseDraftSchema.safeParse({
    amount: 1200,
    description: 'Lunch',
    category: 'Food',
    date: '2026-09-14',
    currency: 'LKR'
  }).success, false);
});

test('normalizer defaults a missing date and reports inferred fields', () => {
  const result = normalizeExpenseDraft({
    amount: 2500,
    description: 'Lunch',
    category: 'Food',
    date: null
  }, { localDate: '2026-09-14' });

  assert.deepEqual(result.draft, {
    amount: 2500,
    description: 'Lunch',
    category: 'Food',
    date: '2026-09-14'
  });
  assert.equal(result.fieldStatus.category, 'inferred');
  assert.equal(result.fieldStatus.date, 'defaulted');
  assert.equal(result.canProceed, true);
});

test('extraction pipeline validates provider output before returning a preview', async () => {
  const provider = {
    name: 'test-provider',
    async generateStructured({ system, transcript }) {
      assert.match(system, /Food, Transport/);
      assert.equal(transcript, 'Bus ticket 450');
      return {
        amount: 450,
        description: 'Bus ticket',
        category: 'Transport',
        date: null
      };
    }
  };

  const result = await extractExpenseDraft({
    transcript: 'Bus ticket 450',
    locale: 'en-LK',
    timezone: 'Asia/Colombo'
  }, {
    provider,
    now: new Date('2026-09-14T03:00:00.000Z')
  });

  assert.equal(result.draft.category, 'Transport');
  assert.equal(result.draft.date, '2026-09-14');
  assert.equal(result.provider, 'test-provider');
  assert.equal(result.canProceed, true);
});
