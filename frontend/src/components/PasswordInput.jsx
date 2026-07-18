import React, { useState } from 'react';
import './PasswordInput.css';

/**
 * Password field with show/hide toggle so users can verify what they typed.
 */
const PasswordInput = ({
  id,
  name,
  value,
  onChange,
  placeholder,
  autoComplete = 'current-password',
  required = false,
  className = '',
  minLength,
  'aria-describedby': ariaDescribedBy
}) => {
  const [visible, setVisible] = useState(false);

  return (
    <div className="password-input-wrap">
      <input
        id={id}
        name={name}
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        minLength={minLength}
        aria-describedby={ariaDescribedBy}
        className={`password-input-field ${className}`.trim()}
      />
      <button
        type="button"
        className="password-input-toggle"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        title={visible ? 'Hide password' : 'Show password'}
        tabIndex={0}
      >
        {visible ? (
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.75">
            <path d="M3 3l18 18" strokeLinecap="round" />
            <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" strokeLinecap="round" />
            <path d="M9.9 5.1A10.5 10.5 0 0 1 12 5c5 0 9.3 3.1 10.7 7.5a11.4 11.4 0 0 1-2.3 3.7" strokeLinecap="round" />
            <path d="M6.1 6.1A11.4 11.4 0 0 0 1.3 12.5C2.7 16.9 7 20 12 20c1.6 0 3.1-.3 4.4-.9" strokeLinecap="round" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.75">
            <path d="M1.5 12.5C2.9 8.1 7.2 5 12.2 5s9.3 3.1 10.7 7.5c-1.4 4.4-5.7 7.5-10.7 7.5S2.9 16.9 1.5 12.5z" />
            <circle cx="12" cy="12.5" r="2.75" />
          </svg>
        )}
      </button>
    </div>
  );
};

export default PasswordInput;
