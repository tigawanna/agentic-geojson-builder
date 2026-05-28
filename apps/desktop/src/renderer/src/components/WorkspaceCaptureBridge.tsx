import type { WorkspaceCaptureRequestEvent } from "@shared/rendered-map-view.types";
import { getWorkspaceCapture } from "@renderer/features/maps/lib/workspace-capture-registry";
import { useIpcEvent } from "@renderer/hooks/useIpcEvent";

export function WorkspaceCaptureBridge() {
  useIpcEvent("workspace:captureRequest", (payload: WorkspaceCaptureRequestEvent) => {
    void handleCaptureRequest(payload);
  });

  return null;
}

async function handleCaptureRequest(payload: WorkspaceCaptureRequestEvent) {
  const capture = getWorkspaceCapture(payload.mapId);
  if (!capture) {
    return;
  }

  try {
    const snapshot = await capture();
    await window.api.invoke("workspace:captureResponse", {
      requestId: payload.requestId,
      snapshot,
    });
  } catch (error) {
    await window.api.invoke("workspace:captureResponse", {
      requestId: payload.requestId,
      error: error instanceof Error ? error.message : "Workspace capture failed.",
    });
  }
}
