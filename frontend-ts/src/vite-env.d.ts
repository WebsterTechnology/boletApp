/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of backend-ts, e.g. https://boletapp-production.up.railway.app */
  readonly VITE_API_URL?: string;
  readonly VITE_STRIPE_PUBLIC_KEY?: string;
  /** Only read by the unused DepositPix page. */
  readonly VITE_STRIPE_PUBLISHABLE_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  /** Set by the axios 401 interceptor so the session-expired alert fires once. */
  __logoutTriggered?: boolean;
}
