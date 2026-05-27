import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

/**
 * Stub the `window.api` bridge so renderer-side tests can run without Electron.
 * Override per-test with `vi.spyOn(window.api, 'invoke').mockResolvedValue(...)`.
 */
Object.defineProperty(window, 'api', {
  configurable: true,
  value: {
    invoke: vi.fn().mockResolvedValue(undefined),
    on: vi.fn().mockReturnValue(() => undefined),
  },
})
