jest.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: jest.fn(),
  },
}));

jest.mock('@aparajita/capacitor-secure-storage', () => ({
  SecureStorage: {
    get: jest.fn(),
    set: jest.fn(),
    remove: jest.fn(),
  },
}));

const loadAuthStorage = (native) => {
  let authStorage;
  let core;
  let secureStorage;

  jest.isolateModules(() => {
    core = require('@capacitor/core');
    secureStorage = require('@aparajita/capacitor-secure-storage');
    core.Capacitor.isNativePlatform.mockReturnValue(native);
    authStorage = require('./authStorage');
  });

  return { authStorage, core, secureStorage };
};

const secureValues = (values) => {
  return (key) => Promise.resolve(values[key] ?? null);
};

describe('authStorage', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    jest.clearAllMocks();
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    console.warn.mockRestore();
  });

  test('web keeps remember-me in localStorage and session-only in sessionStorage', async () => {
    const { authStorage } = loadAuthStorage(false);

    await authStorage.initAuthStorage();
    await authStorage.setAuth('persistent-token', { id: 1 }, true);

    expect(authStorage.getToken()).toBe('persistent-token');
    expect(authStorage.getUser()).toEqual({ id: 1 });
    expect(localStorage.getItem('token')).toBe('persistent-token');

    await authStorage.setAuth('session-token', { id: 2 }, false);

    expect(authStorage.getToken()).toBe('session-token');
    expect(localStorage.getItem('token')).toBeNull();
    expect(sessionStorage.getItem('token')).toBe('session-token');
  });

  test('native reads tokens from secure storage, not WebView storage', async () => {
    const { authStorage, secureStorage } = loadAuthStorage(true);
    secureStorage.SecureStorage.get.mockImplementation(
      secureValues({
        token: 'native-token',
        user: { id: 7, username: 'Sachinthani' },
        rememberMe: true,
      })
    );

    await authStorage.initAuthStorage();

    expect(authStorage.getToken()).toBe('native-token');
    expect(authStorage.getUser()).toEqual({
      id: 7,
      username: 'Sachinthani',
    });
    expect(localStorage.getItem('token')).toBeNull();
    expect(sessionStorage.getItem('token')).toBeNull();
  });

  test('native writes and clears secure storage without plaintext fallback', async () => {
    const { authStorage, secureStorage } = loadAuthStorage(true);
    secureStorage.SecureStorage.get.mockResolvedValue(null);

    await authStorage.initAuthStorage();
    await authStorage.setAuth('native-token', { id: 3 }, true);

    expect(secureStorage.SecureStorage.set).toHaveBeenCalledWith(
      'token',
      'native-token'
    );
    expect(secureStorage.SecureStorage.set).toHaveBeenCalledWith('user', {
      id: 3,
    });
    expect(localStorage.getItem('token')).toBeNull();

    await authStorage.clearAuth();

    expect(secureStorage.SecureStorage.remove).toHaveBeenCalledWith('token');
    expect(secureStorage.SecureStorage.remove).toHaveBeenCalledWith('user');
    expect(secureStorage.SecureStorage.remove).toHaveBeenCalledWith(
      'rememberMe'
    );
    expect(authStorage.getToken()).toBeNull();
  });

  test('native migrates legacy WebView tokens and removes the plaintext copy', async () => {
    localStorage.setItem('token', 'legacy-token');
    localStorage.setItem('user', JSON.stringify({ id: 9 }));

    const { authStorage, secureStorage } = loadAuthStorage(true);
    secureStorage.SecureStorage.get.mockResolvedValue(null);

    await authStorage.initAuthStorage();

    expect(secureStorage.SecureStorage.set).toHaveBeenCalledWith(
      'token',
      'legacy-token'
    );
    expect(authStorage.getToken()).toBe('legacy-token');
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
  });

  test('native never falls back to plaintext when secure storage is unavailable', async () => {
    const { authStorage, secureStorage } = loadAuthStorage(true);
    secureStorage.SecureStorage.get.mockRejectedValue(
      new Error('keystore unavailable')
    );

    await authStorage.initAuthStorage();

    expect(authStorage.getToken()).toBeNull();

    await authStorage.setAuth('token', { id: 1 }, true);

    // The session can continue in memory, but nothing is written to
    // localStorage or sessionStorage.
    expect(authStorage.getToken()).toBe('token');
    expect(localStorage.getItem('token')).toBeNull();
    expect(sessionStorage.getItem('token')).toBeNull();
  });
});
