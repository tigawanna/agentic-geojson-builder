import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import type {
  IpcChannel,
  IpcEventName,
  IpcEventPayload,
  IpcRequest,
  IpcResponse,
} from '../shared/ipc-contract.js'

/**
 * Strongly-typed bridge exposed to the renderer as `window.api`.
 *
 * `invoke` returns `Promise<Response>` for the given channel — TS enforces
 * both the request shape and the resolved response type.
 *
 * `on` registers a listener for main → renderer events; call the returned
 * function to unsubscribe.
 */
const api = {
  invoke<K extends IpcChannel>(channel: K, req: IpcRequest<K>): Promise<IpcResponse<K>> {
    return ipcRenderer.invoke(channel, req) as Promise<IpcResponse<K>>
  },

  on<K extends IpcEventName>(
    event: K,
    listener: (payload: IpcEventPayload<K>) => void,
  ): () => void {
    const handler = (_e: IpcRendererEvent, payload: IpcEventPayload<K>) => listener(payload)
    ipcRenderer.on(event, handler)
    return () => ipcRenderer.removeListener(event, handler)
  },
}

export type Api = typeof api

try {
  contextBridge.exposeInMainWorld('api', api)
} catch (err) {
  // In tests (e.g. JSDOM) contextBridge may not be available; fall back safely.
  const g = globalThis as typeof globalThis & { api?: Api }
  g.api = api
  console.warn('[preload] contextBridge unavailable, using globalThis fallback', err)
}
