const test = require('node:test');
const assert = require('node:assert/strict');
const {
  DEFAULT_EDIT_WINDOW_HOURS,
  getEditWindowHours,
  isExpenseEditable
} = require('../utils/expenseEditWindow');

const HOUR_MS = 60 * 60 * 1000;
const NOW = new Date('2026-11-03T12:00:00.000Z').getTime();

test('default edit window is 24 hours', () => {
  const previous = process.env.EXPENSE_EDIT_WINDOW_HOURS;
  delete process.env.EXPENSE_EDIT_WINDOW_HOURS;
  assert.equal(getEditWindowHours(), DEFAULT_EDIT_WINDOW_HOURS);
  assert.equal(DEFAULT_EDIT_WINDOW_HOURS, 24);
  if (previous !== undefined) process.env.EXPENSE_EDIT_WINDOW_HOURS = previous;
});

test('editable inside the window and expired after it', () => {
  const previous = process.env.EXPENSE_EDIT_WINDOW_HOURS;
  process.env.EXPENSE_EDIT_WINDOW_HOURS = '24';

  assert.equal(isExpenseEditable(new Date(NOW - 23 * HOUR_MS), NOW), true);
  assert.equal(isExpenseEditable(new Date(NOW - 24 * HOUR_MS), NOW), true);
  assert.equal(isExpenseEditable(new Date(NOW - 25 * HOUR_MS), NOW), false);

  if (previous === undefined) delete process.env.EXPENSE_EDIT_WINDOW_HOURS;
  else process.env.EXPENSE_EDIT_WINDOW_HOURS = previous;
});

test('zero disables editing, invalid values fall back to 24', () => {
  const previous = process.env.EXPENSE_EDIT_WINDOW_HOURS;
  process.env.EXPENSE_EDIT_WINDOW_HOURS = '0';
  assert.equal(isExpenseEditable(new Date(NOW), NOW), false);

  process.env.EXPENSE_EDIT_WINDOW_HOURS = 'not-a-number';
  assert.equal(getEditWindowHours(), DEFAULT_EDIT_WINDOW_HOURS);

  if (previous === undefined) delete process.env.EXPENSE_EDIT_WINDOW_HOURS;
  else process.env.EXPENSE_EDIT_WINDOW_HOURS = previous;
});

test('missing or invalid created_at is not editable', () => {
  assert.equal(isExpenseEditable(null, NOW), false);
  assert.equal(isExpenseEditable('not-a-date', NOW), false);
});
