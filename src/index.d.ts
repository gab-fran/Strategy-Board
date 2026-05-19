declare module "*.png";

interface ImportMetaEnv {
  readonly VITE_TBA_API_KEY: string;
  readonly VITE_FIREBASE_API_KEY: string;
  readonly VITE_FIRST_API_USERNAME: string;
  readonly VITE_FIRST_API_AUTH_TOKEN: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
