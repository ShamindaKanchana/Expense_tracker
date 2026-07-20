/** Stable category keys stored in the DB (must match MySQL ENUM). */
export const CATEGORY_KEYS = [
  'Food',
  'Transport',
  'Entertainment',
  'Bills',
  'Shopping',
  'Others'
];

/**
 * Normalize a category name from API/UI to a known key, or null if unknown.
 */
export function normalizeCategoryKey(name) {
  if (!name) return null;
  const raw = String(name).trim();
  const found = CATEGORY_KEYS.find((k) => k.toLowerCase() === raw.toLowerCase());
  return found || null;
}

/**
 * Translate a category for display. Falls back to original name if unknown.
 */
export function translateCategory(t, name) {
  const key = normalizeCategoryKey(name);
  if (key) return t(`categories.${key}`);
  if (!name) return t('categories.Uncategorized');
  return String(name);
}
