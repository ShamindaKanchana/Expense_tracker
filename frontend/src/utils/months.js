/** English full month names as returned by the API / older data. */
export const EN_MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
];

/**
 * @param {number} monthIndex 1–12
 * @param {'full' | 'short'} form
 */
export function monthLabel(t, monthIndex, form = 'full') {
  const key = form === 'short' ? 'monthsShort' : 'months';
  return t(`${key}.${monthIndex}`);
}

/** All 12 labels for the current language. */
export function allMonthLabels(t, form = 'full') {
  return Array.from({ length: 12 }, (_, i) => monthLabel(t, i + 1, form));
}

/**
 * Translate an English month name (e.g. from API) into the current locale.
 * @param {'full' | 'short'} form
 */
export function translateEnglishMonth(t, name, form = 'full') {
  if (!name) return '';
  const idx = EN_MONTHS.findIndex((m) => m.toLowerCase() === String(name).toLowerCase());
  if (idx >= 0) return monthLabel(t, idx + 1, form);
  // Numeric month 1–12
  const n = Number(name);
  if (n >= 1 && n <= 12) return monthLabel(t, n, form);
  return String(name);
}
