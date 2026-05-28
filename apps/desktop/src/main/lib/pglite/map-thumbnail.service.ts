import sharp from "sharp";
import {
  MAP_THUMBNAIL_FILE_NAME,
  readMapThumbnailFile,
  saveMapThumbnailFile,
} from "@main/lib/pglite/map-files.service.js";

const THUMBNAIL_MAX_WIDTH = 480;

function isImageMimeType(mimeType: string): boolean {
  return mimeType.startsWith("image/");
}

export async function saveMapThumbnailFromBase64(
  mapId: number,
  thumbnailBase64: string,
  _mimeType: string,
): Promise<string> {
  const buffer = Buffer.from(thumbnailBase64, "base64");
  const optimized = await sharp(buffer)
    .rotate()
    .resize({ width: THUMBNAIL_MAX_WIDTH, withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();

  await saveMapThumbnailFile(mapId, optimized);
  return MAP_THUMBNAIL_FILE_NAME;
}

export async function generateMapThumbnailFromSource(
  mapId: number,
  sourceBuffer: Buffer,
  mimeType: string,
  fileName: string,
): Promise<string | null> {
  const lowerName = fileName.toLowerCase();
  const isImage =
    isImageMimeType(mimeType) ||
    lowerName.endsWith(".png") ||
    lowerName.endsWith(".jpg") ||
    lowerName.endsWith(".jpeg") ||
    lowerName.endsWith(".webp");

  if (!isImage) {
    return null;
  }

  const optimized = await sharp(sourceBuffer)
    .rotate()
    .resize({ width: THUMBNAIL_MAX_WIDTH, withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();

  await saveMapThumbnailFile(mapId, optimized);
  return MAP_THUMBNAIL_FILE_NAME;
}

export async function readMapThumbnailPayload(
  folderPath: string,
  thumbnailFileName: string,
): Promise<{ mimeType: string; fileBase64: string } | null> {
  try {
    const buffer = await readMapThumbnailFile(folderPath, thumbnailFileName);
    return {
      mimeType: "image/webp",
      fileBase64: buffer.toString("base64"),
    };
  } catch {
    return null;
  }
}
