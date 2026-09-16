import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.shaminda.expensetracker',
  appName: 'Expense Tracker',
  webDir: 'build',
  // Dev only: serve WebView over http so local http:// backend
  // isn't blocked as mixed content (page is https://localhost by default).
  // Production (HTTPS API) should remove this override.
  server: {
    androidScheme: 'http'
  }
};

export default config;
