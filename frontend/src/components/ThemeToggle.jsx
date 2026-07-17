import React from 'react';
import { useTheme } from '../theme/ThemeContext';
import './ThemeToggle.css';

/**
 * Compact light/dark control — safe for navbar and auth pages.
 */
const ThemeToggle = ({ className = '' }) => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      className={`theme-toggle ${className}`.trim()}
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Light mode' : 'Dark mode'}
    >
      <span className="theme-toggle-icon" aria-hidden="true">
        {isDark ? (
          /* sun */
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.75">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2.5v2M12 19.5v2M4.5 12h-2M21.5 12h-2M6.2 6.2 4.8 4.8M19.2 19.2l-1.4-1.4M6.2 17.8l-1.4 1.4M19.2 4.8l-1.4 1.4" strokeLinecap="round" />
          </svg>
        ) : (
          /* moon */
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.75">
            <path d="M20 14.5A7.5 7.5 0 1 1 9.5 4 6 6 0 0 0 20 14.5z" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      <span className="theme-toggle-label">{isDark ? 'Light' : 'Dark'}</span>
    </button>
  );
};

export default ThemeToggle;
