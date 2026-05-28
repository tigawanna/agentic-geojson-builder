import type { AppMenuAction } from "@shared/menu.types.js";
import { broadcastToRenderers } from "@main/ipc/broadcast.js";

export function sendAppMenuAction(action: AppMenuAction): void {
  broadcastToRenderers("app:menuAction", action);
}
