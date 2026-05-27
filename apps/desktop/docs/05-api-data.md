# API data layer — Axios + TanStack Query

## Axios

[`src/renderer/src/lib/axios.ts`](../src/renderer/src/lib/axios.ts) exports a
pre-configured `api` instance:

- `baseURL` is read from `VITE_API_BASE_URL` (set in `.env` / `.env.local`).
- Response errors are normalized to an `ApiError` shape.
- Add auth tokens / trace ids in the request interceptor.

```typescript
import { api } from '@renderer/lib/axios'

const res = await api.get<User>('/me')
```

## TanStack Query

[`src/renderer/src/lib/query-client.ts`](../src/renderer/src/lib/query-client.ts)
exports a shared `QueryClient`. Already mounted at the root via
`QueryClientProvider` in [`main.tsx`](../src/renderer/src/main.tsx).

### Reading data

Co-locate query hooks inside the feature folder:

```typescript
// src/renderer/src/features/users/useUserQuery.ts
import { useQuery } from '@tanstack/react-query'
import { api } from '@renderer/lib/axios'

export interface User {
  id: string
  name: string
}

export function useUserQuery(id: string) {
  return useQuery<User>({
    queryKey: ['users', id],
    queryFn: async () => (await api.get<User>(`/users/${id}`)).data,
    enabled: Boolean(id),
  })
}
```

### Writing data

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@renderer/lib/axios'

export function useCreateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { name: string }) => (await api.post<User>('/users', input)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })
}
```

### DevTools

`@tanstack/react-query-devtools` is only mounted in development
(see `main.tsx`). Toggle it with the floating flower icon at the bottom-right.

## IPC vs HTTP

| Use                                     | Pick                 |
| --------------------------------------- | -------------------- |
| Calling a remote REST/GraphQL API       | Axios + React Query  |
| Talking to the local main process       | `useIpcQuery` hook   |
| Fire-and-forget notifications from main | `window.api.on(...)` |

Both go through TanStack Query, so cache semantics are consistent — the only
difference is the transport.
