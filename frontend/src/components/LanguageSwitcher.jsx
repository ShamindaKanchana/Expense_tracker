import React from 'react';
import { useTranslation } from 'react-i18next';
import { SUPPORTED } from '../i18n';
import './LanguageSwitcher.css';

/**
 * Compact EN | සිං | த language control.
 * @param {'default' | 'compact' | 'auth'} variant
 */
const LanguageSwitcher = ({ variant = 'default', className = '' }) => {
  const { i18n, t } = useTranslation();
  const current = (i18n.resolvedLanguage || i18n.language || 'en').split('-')[0];

  const setLang = (lng) => {
    if (lng !== current) {
      i18n.changeLanguage(lng);
    }
  };

  return (
    <div
      className={`lang-switcher lang-switcher--${variant} ${className}`.trim()}
      role="group"
      aria-label={t('language.label')}
    >
      {SUPPORTED.map((lng) => (
        <button
          key={lng}
          type="button"
          className={`lang-switcher-btn${current === lng ? ' active' : ''}`}
          onClick={() => setLang(lng)}
          aria-pressed={current === lng}
          title={t(`language.${lng}`)}
        >
          {lng === 'en' ? 'EN' : lng === 'si' ? 'සිං' : 'த'}
        </button>
      ))}
    </div>
  );
};

export default LanguageSwitcher;
