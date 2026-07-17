/**
 * Chart.js colors for light/dark mode.
 * Canvas text is not CSS-driven, so options must set tick/legend colors.
 */
export function getChartTheme(theme) {
  const isDark = theme === 'dark';
  return {
    isDark,
    // Near-white labels on dark cards; slate on light
    text: isDark ? '#f8fafc' : '#334155',
    textMuted: isDark ? '#e2e8f0' : '#64748b',
    grid: isDark ? 'rgba(248, 250, 252, 0.12)' : 'rgba(15, 23, 42, 0.08)',
    tooltipBg: isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(0, 0, 0, 0.8)',
    tooltipText: '#f8fafc',
    border: isDark ? '#1e293b' : '#ffffff'
  };
}
