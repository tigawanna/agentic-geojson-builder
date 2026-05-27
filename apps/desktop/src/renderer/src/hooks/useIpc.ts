import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseMutationOptions,
  type UseQueryOptions,
} from "@tanstack/react-query";
import type { IpcChannel, IpcRequest, IpcResponse } from "../../../shared/ipc-contract";

/**
 * Typed wrapper around `window.api.invoke` + TanStack Query.
 *
 * Usage — read:
 *   const { data } = useIpcQuery('app:getVersion', undefined)
 *
 * Usage — write:
 *   const { mutate } = useIpcMutation('store:set')
 *   mutate({ key: 'theme', value: 'dark' })
 */

export function useIpcQuery<K extends IpcChannel>(
  channel: K,
  req: IpcRequest<K>,
  options?: Omit<UseQueryOptions<IpcResponse<K>, Error>, "queryKey" | "queryFn">,
) {
  return useQuery<IpcResponse<K>, Error>({
    queryKey: [channel, req],
    queryFn: () => window.api.invoke(channel, req),
    ...options,
  });
}

export function useIpcMutation<K extends IpcChannel>(
  channel: K,
  options?: UseMutationOptions<IpcResponse<K>, Error, IpcRequest<K>>,
) {
  const qc = useQueryClient();
  return useMutation<IpcResponse<K>, Error, IpcRequest<K>>({
    mutationFn: (req) => window.api.invoke(channel, req),
    onSuccess: (...args) => {
      // Invalidate any query scoped to the same channel by default.
      qc.invalidateQueries({ queryKey: [channel] });
      options?.onSuccess?.(...args);
    },
    ...options,
  });
}

/**
 * Imperative invoker — handy inside event handlers or one-off effects where
 * you don't want a cached query.
 */
export function ipcInvoke<K extends IpcChannel>(
  channel: K,
  req: IpcRequest<K>,
): Promise<IpcResponse<K>> {
  return window.api.invoke(channel, req);
}
