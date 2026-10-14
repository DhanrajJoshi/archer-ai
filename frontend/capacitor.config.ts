import type { CapacitorConfig } from '@capacitor/cli';

/**
 * ARCHER AI Android shell.
 *
 * The bundled web assets (dist/) are served inside the WebView and talk to
 * the ARCHER backend over HTTP. Point the app at a backend by building the
 * frontend with VITE_API_URL (e.g. VITE_API_URL=http://192.168.1.20:4000)
 * before running `npx cap sync android`.
 *
 * Supported devices: Android 16 (API 36) and Android 17 (API 37) only.
 * minSdkVersion is enforced in android/variables.gradle.
 */
const config: CapacitorConfig = {
  appId: 'ai.archer.app',
  appName: 'ARCHER AI',
  webDir: 'dist',
  android: {
    allowMixedContent: false,
  },
  server: {
    // Optional: load the frontend from a hosted URL instead of the bundled
    // assets. Set ARCHER_WEBVIEW_URL at sync time to enable.
    ...(process.env.ARCHER_WEBVIEW_URL
      ? { url: process.env.ARCHER_WEBVIEW_URL, cleartext: true }
      : {}),
  },
};

export default config;
