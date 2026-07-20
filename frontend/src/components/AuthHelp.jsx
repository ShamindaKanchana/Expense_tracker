import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import ThemeToggle from './ThemeToggle';
import LanguageSwitcher from './LanguageSwitcher';
import './AuthHelp.css';

const AuthHelp = () => {
  const { t } = useTranslation();
  const [open, setOpen] = React.useState(null);
  const closeBtnRef = useRef(null);

  const panels = {
    info: {
      title: t('authHelp.infoTitle'),
      sections: [
        { heading: t('authHelp.infoWhatHeading'), body: t('authHelp.infoWhatBody') },
        { heading: t('authHelp.infoDoHeading'), body: t('authHelp.infoDoBody') },
        { heading: t('authHelp.infoWhoHeading'), body: t('authHelp.infoWhoBody') }
      ]
    },
    help: {
      title: t('authHelp.helpTitle'),
      sections: [
        { heading: t('authHelp.helpCreateHeading'), body: t('authHelp.helpCreateBody') },
        { heading: t('authHelp.helpSignInHeading'), body: t('authHelp.helpSignInBody') },
        { heading: t('authHelp.helpSlowHeading'), body: t('authHelp.helpSlowBody') },
        { heading: t('authHelp.helpSessionHeading'), body: t('authHelp.helpSessionBody') }
      ]
    }
  };

  const panel = open ? panels[open] : null;

  useEffect(() => {
    if (!open) return undefined;

    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(null);
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeBtnRef.current?.focus();

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  return (
    <>
      <div className="auth-help-bar" role="group" aria-label={t('authHelp.ariaGroup')}>
        <LanguageSwitcher variant="compact" />
        <ThemeToggle className="theme-toggle--compact" />
        <span className="auth-help-sep" aria-hidden="true">
          ·
        </span>
        <button
          type="button"
          className="auth-help-btn"
          onClick={() => setOpen('info')}
          aria-haspopup="dialog"
          aria-expanded={open === 'info'}
        >
          {t('authHelp.info')}
        </button>
        <span className="auth-help-sep" aria-hidden="true">
          ·
        </span>
        <button
          type="button"
          className="auth-help-btn"
          onClick={() => setOpen('help')}
          aria-haspopup="dialog"
          aria-expanded={open === 'help'}
        >
          {t('authHelp.help')}
        </button>
      </div>

      {panel && (
        <div
          className="auth-help-overlay"
          onClick={() => setOpen(null)}
          role="presentation"
        >
          <div
            className="auth-help-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="auth-help-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="auth-help-modal-header">
              <h3 id="auth-help-title">{panel.title}</h3>
              <button
                type="button"
                className="auth-help-close"
                onClick={() => setOpen(null)}
                ref={closeBtnRef}
                aria-label={t('common.close')}
              >
                ×
              </button>
            </div>

            <div className="auth-help-tabs">
              <button
                type="button"
                className={`auth-help-tab ${open === 'info' ? 'active' : ''}`}
                onClick={() => setOpen('info')}
              >
                {t('authHelp.info')}
              </button>
              <button
                type="button"
                className={`auth-help-tab ${open === 'help' ? 'active' : ''}`}
                onClick={() => setOpen('help')}
              >
                {t('authHelp.help')}
              </button>
            </div>

            <div className="auth-help-body">
              {panel.sections.map((section) => (
                <section key={section.heading} className="auth-help-section">
                  <h4>{section.heading}</h4>
                  <p>{section.body}</p>
                </section>
              ))}
            </div>

            <div className="auth-help-footer">
              <button
                type="button"
                className="auth-help-done"
                onClick={() => setOpen(null)}
              >
                {t('common.gotIt')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AuthHelp;
