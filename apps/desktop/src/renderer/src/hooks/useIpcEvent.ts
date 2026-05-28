import { useEffect, useState } from "react";
import type { IpcEventName, IpcEventPayload } from "@shared/ipc-contract";

export function useIpcEvent<K extends IpcEventName>(
  event: K,
  listener?: (payload: IpcEventPayload<K>) => void,
) {
  const [payload, setPayload] = useState<IpcEventPayload<K> | null>(null);

  useEffect(() => {
    return window.api.on(event, (next) => {
      setPayload(next);
      listener?.(next);
    });
  }, [event, listener]);

  return payload;
}
