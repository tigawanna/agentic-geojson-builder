import { useEffect, useState } from "react";
import type { IpcEventName, IpcEventPayload } from "@shared/ipc-contract";
import { getApi } from "@renderer/lib/api";

export function useIpcEvent<K extends IpcEventName>(
  event: K,
  listener?: (payload: IpcEventPayload<K>) => void,
) {
  const [payload, setPayload] = useState<IpcEventPayload<K> | null>(null);

  useEffect(() => {
    const api = getApi();
    if (!api) {
      return;
    }
    return api.on(event, (next) => {
      setPayload(next);
      listener?.(next);
    });
  }, [event, listener]);

  return payload;
}
