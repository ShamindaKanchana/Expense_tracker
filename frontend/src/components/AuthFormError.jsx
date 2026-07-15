import React from 'react';

const AuthFormError = ({ message }) => {
  if (!message) return null;

  return (
    <p className="auth-form-error" role="alert">
      {message}
    </p>
  );
};

export default AuthFormError;