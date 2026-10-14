/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Absolute base URL of the ARCHER backend, e.g. http://192.168.1.20:4000 */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
