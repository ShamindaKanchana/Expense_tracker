const DEFAULT_EDIT_WINDOW_HOURS = 24;
const HOUR_MS = 60 * 60 * 1000;

function getEditWindowHours() {
  const raw = process.env.EXPENSE_EDIT_WINDOW_HOURS;
  if (raw === undefined || raw === '') return DEFAULT_EDIT_WINDOW_HOURS;
  const hours = Number(raw);
  if (!Number.isFinite(hours) || hours < 0) return DEFAULT_EDIT_WINDOW_HOURS;
  return hours;
}

function isExpenseEditable(createdAt, now = Date.now()) {
  const hours = getEditWindowHours();
  if (hours === 0 || !createdAt) return false;

  const created = createdAt instanceof Date ? createdAt.getTime() : new Date(createdAt).getTime();
  if (Number.isNaN(created)) return false;

  return now - created <= hours * HOUR_MS;
}

module.exports = {
  DEFAULT_EDIT_WINDOW_HOURS,
  getEditWindowHours,
  isExpenseEditable
};
