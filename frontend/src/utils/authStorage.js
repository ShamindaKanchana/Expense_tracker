/**
 * Auth token/user storage helpers.
 * Remember me → localStorage (survives browser close)
 * Otherwise → sessionStorage (cleared when the tab/window ends)
 */

const TOKEN_KEY = 'token';
const USER_KEY = 'user';

export const getToken = () =>
  localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);

export const getUser = () => {
  const raw = localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const setAuth = (token, user, rememberMe = true) => {
  const primary = rememberMe ? localStorage : sessionStorage;
  const secondary = rememberMe ? sessionStorage : localStorage;

  secondary.removeItem(TOKEN_KEY);
  secondary.removeItem(USER_KEY);

  primary.setItem(TOKEN_KEY, token);
  if (user != null) {
    primary.setItem(USER_KEY, JSON.stringify(user));
  }
};

export const clearAuth = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
};

export const setStoredUser = (user) => {
  const json = JSON.stringify(user);
  if (localStorage.getItem(TOKEN_KEY)) {
    localStorage.setItem(USER_KEY, json);
  } else if (sessionStorage.getItem(TOKEN_KEY)) {
    sessionStorage.setItem(USER_KEY, json);
  } else {
    localStorage.setItem(USER_KEY, json);
  }
};
