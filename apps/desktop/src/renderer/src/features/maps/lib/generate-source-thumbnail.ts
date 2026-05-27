import * as pdfjs from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.mjs?url";

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

const THUMBNAIL_MAX_WIDTH = 480;

type ThumbnailResult = {
  mimeType: string;
  base64: string;
};

function canvasToThumbnailBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Failed to encode thumbnail"));
          return;
        }
        resolve(blob);
      },
      "image/webp",
      0.8,
    );
  });
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function resizeCanvas(source: HTMLCanvasElement, maxWidth: number): HTMLCanvasElement {
  const scale = Math.min(1, maxWidth / source.width);
  const target = document.createElement("canvas");
  target.width = Math.max(1, Math.floor(source.width * scale));
  target.height = Math.max(1, Math.floor(source.height * scale));
  const context = target.getContext("2d");
  if (!context) {
    throw new Error("Failed to create thumbnail canvas");
  }
  context.drawImage(source, 0, 0, target.width, target.height);
  return target;
}

async function renderImageThumbnail(file: File): Promise<ThumbnailResult> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("Failed to load image"));
      element.src = objectUrl;
    });

    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Failed to create image canvas");
    }
    context.drawImage(image, 0, 0);
    const resized = resizeCanvas(canvas, THUMBNAIL_MAX_WIDTH);
    const blob = await canvasToThumbnailBlob(resized);
    return {
      mimeType: "image/webp",
      base64: await blobToBase64(blob),
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function renderPdfThumbnail(file: File): Promise<ThumbnailResult> {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise;
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: 1 });
  const scale = Math.min(1, THUMBNAIL_MAX_WIDTH / viewport.width);
  const scaledViewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = Math.floor(scaledViewport.width);
  canvas.height = Math.floor(scaledViewport.height);
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Failed to create PDF canvas");
  }
  await page.render({ canvas, canvasContext: context, viewport: scaledViewport }).promise;
  const blob = await canvasToThumbnailBlob(canvas);
  return {
    mimeType: "image/webp",
    base64: await blobToBase64(blob),
  };
}

export async function generateSourceThumbnail(file: File): Promise<ThumbnailResult | null> {
  const lowerName = file.name.toLowerCase();
  const isPdf = file.type === "application/pdf" || lowerName.endsWith(".pdf");
  const isImage =
    file.type.startsWith("image/") ||
    lowerName.endsWith(".png") ||
    lowerName.endsWith(".jpg") ||
    lowerName.endsWith(".jpeg") ||
    lowerName.endsWith(".webp");

  if (!isPdf && !isImage) {
    return null;
  }

  try {
    return isPdf ? await renderPdfThumbnail(file) : await renderImageThumbnail(file);
  } catch {
    return null;
  }
}
