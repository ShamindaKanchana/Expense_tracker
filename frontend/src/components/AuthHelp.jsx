import React, { useEffect, useRef } from 'react';
import ThemeToggle from './ThemeToggle';
import './AuthHelp.css';

const PANELS = {
  info: {
    title: 'About Expense Tracker',
    sections: [
      {
        heading: 'What is this?',
        body:
          'A free personal expense tracking app. Sign in to record spending, see monthly totals, and explore charts on your dashboard.',
      },
      {
        heading: 'What you can do',
        body:
          'Add expenses by category, view your monthly report, and review recent activity — all under your own account.',
      },
      {
        heading: 'Who built it',
        body:
          'A personal project by Shaminda Kanchana, hosted with free-tier services so anyone can try it without cost.',
      },
    ],
  },
  help: {
    title: 'Help & tips',
    sections: [
      {
        heading: 'Create an account',
        body:
          'Open Sign up and choose a username (min 3 characters) and password (min 6). No email is required. Then use Sign in with that username and password.',
      },
      {
        heading: 'Sign in',
        body:
          'Enter your username or the email from an older account, plus your password. Existing email-based accounts still work the same way.',
      },
      {
        heading: 'Why is login sometimes slow?',
        body:
          'This app runs on free hosting with limited resources. After idle time the server may “sleep.” The first request can take 30–60 seconds while it wakes up. Wait a moment and try again if it fails once — it is usually not a permanent outage.',
      },
      {
        heading: 'Session expired?',
        body:
          'Sign-in lasts about one hour. When it expires you will return to this page. Just sign in again to continue.',
      },
    ],
  },
};

/**
 * Compact Info / Help controls for auth screens (mobile + desktop).
 * Small text buttons open a lightweight panel — not large icons.
 */
const AuthHelp = () => {
  const [open, setOpen] = React.useState(null); // 'info' | 'help' | null
  const closeBtnRef = useRef(null);
  const panel = open ? PANELS[open] : null;

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
      <div className="auth-help-bar" role="group" aria-label="App information">
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
          Info
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
          Help
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
                aria-label="Close"
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
                Info
              </button>
              <button
                type="button"
                className={`auth-help-tab ${open === 'help' ? 'active' : ''}`}
                onClick={() => setOpen('help')}
              >
                Help
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
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AuthHelp;
