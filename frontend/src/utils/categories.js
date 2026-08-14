/** Stable category keys stored in the DB (must match MySQL ENUM). */
export const CATEGORY_KEYS = [
  'Food',
  'Transport',
  'Entertainment',
  'Bills',
  'Shopping',
  'Construction',
  'Health',
  'Education',
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

/** Plain, muted palette for each known category (used to tint table rows). */
const CATEGORY_COLORS = {
  Food: '#e28743',
  Transport: '#3b82f6',
  Entertainment: '#a855f7',
  Bills: '#f59e0b',
  Shopping: '#ec4899',
  Construction: '#6b7280',
  Health: '#22c57e',
  Education: '#0ea5e9',
  Others: '#6366f1',
  Uncategorized: '#94a3b8'
};

const DEFAULT_CATEGORY_COLOR = '#94a3b8';

function hexToRgb(hex) {
  const clean = String(hex).replace('#', '');
  const bigint = parseInt(clean, 16);
  if (Number.isNaN(bigint)) return null;
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255
  };
}

/**
 * Returns theme-aware rgba strings for a category's row accent and background.
 * Produces plain, low-saturation tints that stay readable on light and dark
 * navbars/backgrounds.
 * @param {string} name  raw category name from the API
 * @param {'light'|'dark'} theme
 */
export function getCategoryRowColors(name, theme) {
  const key = normalizeCategoryKey(name);
  const lower = String(name || '').toLowerCase();
  let base;
  if (key && CATEGORY_COLORS[key]) {
    base = CATEGORY_COLORS[key];
  } else if (lower === 'uncategorized') {
    base = CATEGORY_COLORS.Uncategorized;
  } else {
    base = DEFAULT_CATEGORY_COLOR;
  }

  const rgb = hexToRgb(base);
  if (!rgb) return { bg: 'transparent', accent: base };

  const { r, g, b } = rgb;
  const isDark = theme === 'dark';
  return {
    bg: `rgba(${r}, ${g}, ${b}, ${isDark ? 0.15 : 0.1})`,
    accent: `rgba(${r}, ${g}, ${b}, ${isDark ? 0.9 : 0.8})`
  };
}

/**
 * Theme-aware, solid-ish colors for chart segments and detail swatches.
 * Slightly more opaque on dark surfaces so segments stay legible.
 */
export function getCategoryChartColors(name, theme) {
  const { accent } = getCategoryRowColors(name, theme);
  return { fill: accent, border: accent };
}
