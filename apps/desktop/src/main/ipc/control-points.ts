import { app, dialog } from "electron";
import { copyFile, mkdir } from "node:fs/promises";
import { basename, extname, join } from "node:path";
import { randomUUID } from "node:crypto";
import type { IpcChannel, IpcRequest, IpcResponse } from "@shared/ipc-contract.js";
import {
  addControlPointAttachment,
  createControlPoint,
  deleteControlPoint,
  listControlPointAttachments,
  listControlPoints,
  removeControlPointAttachment,
  updateControlPoint,
} from "@main/lib/pglite/control-points.service.js";
import {
  convertMapPanePixel,
  convertPdfPanePixel,
  createControlPointFromViewportPixels,
} from "@main/lib/viewport-coordinates/viewport-coordinates.service.js";
import { broadcastToRenderers } from "@main/ipc/broadcast.js";

type Handler<K extends IpcChannel> = (
  req: IpcRequest<K>,
) => IpcResponse<K> | Promise<IpcResponse<K>>;

function notifyControlPointsChanged(
  mapId: number,
  reason: "created" | "updated" | "deleted",
  controlPointId?: number,
) {
  broadcastToRenderers("controlPoints:changed", { mapId, reason, controlPointId });
}

function getAttachmentsDir(): string {
  return join(app.getPath("userData"), "control-point-attachments");
}

async function copyFileToAttachments(
  sourcePath: string,
): Promise<{ filePath: string; mimeType: string }> {
  const dir = getAttachmentsDir();
  await mkdir(dir, { recursive: true });

  const ext = extname(sourcePath).toLowerCase();
  const destName = `${randomUUID()}${ext}`;
  const destPath = join(dir, destName);

  await copyFile(sourcePath, destPath);

  const mimeMap: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".heic": "image/heic",
    ".svg": "image/svg+xml",
  };

  return {
    filePath: destPath,
    mimeType: mimeMap[ext] ?? "application/octet-stream",
  };
}

export const controlPointsHandlers: { [K in IpcChannel]?: Handler<K> } = {
  "controlPoints:list": async ({ mapId }) => ({ controlPoints: await listControlPoints(mapId) }),
  "controlPoints:create": async (input) => {
    const controlPoint = await createControlPoint(input);
    notifyControlPointsChanged(input.mapId, "created", controlPoint.id);
    return { controlPoint };
  },
  "controlPoints:update": async (input) => {
    const controlPoint = await updateControlPoint(input);
    notifyControlPointsChanged(input.mapId, "updated", controlPoint.id);
    return { controlPoint };
  },
  "controlPoints:delete": async (input) => {
    await deleteControlPoint(input);
    notifyControlPointsChanged(input.mapId, "deleted", input.controlPointId);
    return { ok: true as const };
  },
  "controlPoints:mapPanePixelToLonLat": async (input) => convertMapPanePixel(input),
  "controlPoints:pdfPanePixelToImageXY": async (input) => convertPdfPanePixel(input),
  "controlPoints:createFromViewportPixels": async (input) => {
    const result = await createControlPointFromViewportPixels(input);
    notifyControlPointsChanged(input.mapId, "created", result.controlPoint.id);
    return result;
  },
  "controlPoints:listAttachments": async (input) => ({
    attachments: await listControlPointAttachments(input),
  }),
  "controlPoints:addAttachment": async (input) => ({
    attachment: await addControlPointAttachment(input),
  }),
  "controlPoints:removeAttachment": async (input) => {
    await removeControlPointAttachment(input);
    return { ok: true as const };
  },
  "controlPoints:pickAttachmentFile": async ({ controlPointId }) => {
    const result = await dialog.showOpenDialog({
      title: "Select image",
      filters: [{ name: "Images", extensions: ["jpg", "jpeg", "png", "webp", "gif", "heic"] }],
      properties: ["openFile"],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return { canceled: true as const };
    }

    const sourcePath = result.filePaths[0]!;
    const { filePath, mimeType } = await copyFileToAttachments(sourcePath);
    const originalName = basename(sourcePath, extname(sourcePath));

    const attachment = await addControlPointAttachment({
      controlPointId,
      filePath,
      mimeType,
      caption: originalName,
    });

    return { attachment };
  },
};
