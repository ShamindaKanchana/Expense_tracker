/**
 * Auth token/user storage helpers.
 *
 * Web:
 *   Remember me → localStorage (survives browser close)
 *   Otherwise   → sessionStorage (cleared when the tab/window ends)
 *
 * Native (Capacitor):
 *   Tokens and user data use @aparajita/capacitor-secure-storage
 *   (Android Keystore AES-GCM / iOS Keychain). The sync getters read an
 *   in-memory cache populated by initAuthStorage() during app bootstrap.
 *
 * Never fall back to localStorage/sessionStorage for native tokens.
 */
import { Capacitor } from '@capacitor/core';
import { SecureStorage } from '@aparajita/capacitor-secure-storage';

const TOKEN_KEY = 'token';
const USER_KEY = 'user';
const REMEMBER_KEY = 'rememberMe';

const memory = {
  token: null,
  user: null,
  rememberMe: true,
  initialized: false,
};

let initPromise = null;

const isNative = () => Capacitor.isNativePlatform();

const parseUser = (raw) => {
  if (!raw) return null;
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const readWebAuth = () => {
  const persistentToken = localStorage.getItem(TOKEN_KEY);
  const sessionToken = sessionStorage.getItem(TOKEN_KEY);
  const token = persistentToken || sessionToken;
  const rawUser =
    localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY);

  return {
    token,
    user: parseUser(rawUser),
    // A persistent token means remember-me; session-only means it is off.
    // With no token, default to remember-me for the next refresh.
    rememberMe: Boolean(persistentToken) || !sessionToken,
  };
};

const writeWebAuth = (token, user, rememberMe) => {
  const primary = rememberMe ? localStorage : sessionStorage;
  const secondary = rememberMe ? sessionStorage : localStorage;

  secondary.removeItem(TOKEN_KEY);
  secondary.removeItem(USER_KEY);

  primary.setItem(TOKEN_KEY, token);
  if (user != null) {
    primary.setItem(USER_KEY, JSON.stringify(user));
  }
};

const clearWebAuth = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
};

const readNativeSecure = async () => {
  const [token, user, rememberMe] = await Promise.all([
    SecureStorage.get(TOKEN_KEY),
    SecureStorage.get(USER_KEY),
    SecureStorage.get(REMEMBER_KEY),
  ]);

  return {
    token: typeof token === 'string' ? token : null,
    user: parseUser(user),
    rememberMe: rememberMe !== false,
  };
};

const migrateLegacyWebStorage = async () => {
  const legacy = readWebAuth();
  if (!legacy.token) {
    // Remove any stale plaintext profile left without a token.
    clearWebAuth();
    return null;
  }

  try {
    if (legacy.rememberMe) {
      await SecureStorage.set(TOKEN_KEY, legacy.token);
      await SecureStorage.set(REMEMBER_KEY, true);
      if (legacy.user != null) {
        await SecureStorage.set(USER_KEY, legacy.user);
      }
    }
  } finally {
    // Remove plaintext WebView copies whether or not migration succeeded.
    clearWebAuth();
  }

  return legacy;
};

const persistNative = async (token, user, rememberMe) => {
  if (!isNative()) return;

  try {
    if (rememberMe && token) {
      await SecureStorage.set(TOKEN_KEY, token);
      await SecureStorage.set(REMEMBER_KEY, true);
      if (user != null) {
        await SecureStorage.set(USER_KEY, user);
      } else {
        await SecureStorage.remove(USER_KEY);
      }
    } else {
      await SecureStorage.remove(TOKEN_KEY);
      await SecureStorage.remove(USER_KEY);
      await SecureStorage.remove(REMEMBER_KEY);
    }
  } catch (error) {
    // Keep the in-memory session working; do not write plaintext as a fallback.
    console.warn('Secure auth storage write failed:', error?.message || error);
  }
};

export const initAuthStorage = () => {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      if (isNative()) {
        let native = await readNativeSecure();

        if (!native.token) {
          const migrated = await migrateLegacyWebStorage();
          if (migrated) {
            native = {
              token: migrated.token,
              user: migrated.user,
              rememberMe: migrated.rememberMe,
            };
          }
        }

        memory.token = native.token;
        memory.user = native.user;
        memory.rememberMe = native.rememberMe;
      } else {
        const web = readWebAuth();
        memory.token = web.token;
        memory.user = web.user;
        memory.rememberMe = web.rememberMe;
      }
    } catch (error) {
      // Fail closed: surface no token and keep the user out rather than
      // reading a plaintext fallback.
      memory.token = null;
      memory.user = null;
      console.warn('Secure auth storage unavailable:', error?.message || error);
    } finally {
      memory.initialized = true;
    }

    return memory.token;
  })();

  return initPromise;
};

export const getToken = () => {
  if (isNative()) {
    return memory.initialized ? memory.token : null;
  }
  return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
};

export const getUser = () => {
  if (isNative()) {
    return memory.initialized ? memory.user : null;
  }

  const raw =
    localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY);
  return parseUser(raw);
};

export const getRememberMe = () => {
  if (isNative()) {
    return memory.rememberMe;
  }
  return (
    Boolean(localStorage.getItem(TOKEN_KEY)) ||
    !sessionStorage.getItem(TOKEN_KEY)
  );
};

export const setAuth = async (token, user, rememberMe = true) => {
  memory.token = token;
  memory.user = user ?? null;
  memory.rememberMe = rememberMe;
  memory.initialized = true;

  if (isNative()) {
    await persistNative(token, user, rememberMe);
    // Drop any plaintext copy left by an older build.
    clearWebAuth();
    return;
  }

  writeWebAuth(token, user, rememberMe);
};

export const updateToken = async (token) => {
  memory.token = token;

  if (isNative()) {
    if (memory.rememberMe) {
      try {
        await SecureStorage.set(TOKEN_KEY, token);
      } catch (error) {
        console.warn('Secure auth token update failed:', error?.message || error);
      }
    }
    return;
  }

  if (localStorage.getItem(TOKEN_KEY)) {
    localStorage.setItem(TOKEN_KEY, token);
  } else if (sessionStorage.getItem(TOKEN_KEY)) {
    sessionStorage.setItem(TOKEN_KEY, token);
  }
};

export const clearAuth = async () => {
  memory.token = null;
  memory.user = null;
  memory.rememberMe = true;

  if (isNative()) {
    try {
      await Promise.all([
        SecureStorage.remove(TOKEN_KEY),
        SecureStorage.remove(USER_KEY),
        SecureStorage.remove(REMEMBER_KEY),
      ]);
    } catch (error) {
      console.warn('Secure auth storage clear failed:', error?.message || error);
    }
  }

  clearWebAuth();
};

export const setStoredUser = async (user) => {
  memory.user = user;

  if (isNative()) {
    if (memory.token && memory.rememberMe) {
      try {
        await SecureStorage.set(USER_KEY, user);
      } catch (error) {
        console.warn('Secure auth user update failed:', error?.message || error);
      }
    }
    return;
  }

  const json = JSON.stringify(user);
  if (localStorage.getItem(TOKEN_KEY)) {
    localStorage.setItem(USER_KEY, json);
  } else if (sessionStorage.getItem(TOKEN_KEY)) {
    sessionStorage.setItem(USER_KEY, json);
  } else {
    localStorage.setItem(USER_KEY, json);
  }
};
