/// <reference types="vite/client" />

import type { Api } from '../../preload'

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_FEATURE_DEVTOOLS: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare global {
  interface Window {
    api: Api
  }
}

export {}
