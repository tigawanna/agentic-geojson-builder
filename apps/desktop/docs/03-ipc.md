# IPC — adding a typed channel

Every IPC channel is declared once in [`src/shared/ipc-contract.ts`](../src/shared/ipc-contract.ts).
Adding a new one is a 3-step process — the TypeScript compiler will guide you
through it by failing the build at every missing piece.

## Example — add a "notes:create" channel

### 1. Declare it in the contract

```typescript
// src/shared/ipc-contract.ts
export interface IpcContract {
  // ...existing entries
  'notes:create': {
    req: { title: string; body: string }
    res: { id: number }
  }
}
```

### 2. Write the main-side handler

Either extend an existing file in `src/main/ipc/` or create a new one:

```typescript
// src/main/ipc/notes.ts
import type { IpcChannel, IpcRequest, IpcResponse } from '../../shared/ipc-contract.js'
import { storage } from '../storage/index.js'

type Handler<K extends IpcChannel> = (
  req: IpcRequest<K>,
) => IpcResponse<K> | Promise<IpcResponse<K>>

export const noteHandlers: { [K in IpcChannel]?: Handler<K> } = {
  'notes:create': ({ title, body }) => {
    const result = storage.run?.('INSERT INTO notes (title, body) VALUES (?, ?)', [title, body])
    return { id: Number(result?.lastInsertRowid ?? 0) }
  },
}
```

Then add `...noteHandlers` to the aggregated `handlers` object in
[`src/main/ipc/index.ts`](../src/main/ipc/index.ts).

### 3. Use it in the renderer

```tsx
import { useIpcMutation } from '../../hooks/useIpc'

function NewNoteForm() {
  const createNote = useIpcMutation('notes:create')
  return (
    <button onClick={() => createNote.mutate({ title: 'Hello', body: 'World' })}>
      {createNote.isPending ? 'Saving…' : 'Save'}
    </button>
  )
}
```

That's it — types flow through from the contract to the button click.

## Events (main → renderer)

For fire-and-forget pushes (like `updater:status`):

```typescript
// src/shared/ipc-contract.ts
export interface IpcEventMap {
  'sync:progress': { done: number; total: number }
}

// src/main/somewhere.ts
mainWindow.webContents.send('sync:progress', { done: 12, total: 50 })

// renderer
useEffect(() => window.api.on('sync:progress', (p) => console.log(p)), [])
```

## Why this beats `ipcRenderer.invoke` strings

- **Autocomplete** for channel names.
- **Compile-time check** on request + response types.
- **Single place** to refactor when you rename or remove a channel.
- **One registration site** in `ipc/index.ts` — no hunting through the codebase.
