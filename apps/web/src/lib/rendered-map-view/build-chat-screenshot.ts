type ChatScreenshotPane = {
  label: string;
  image: CanvasImageSource | string;
  width: number;
  height: number;
};

type BuildChatScreenshotInput = {
  panes: ChatScreenshotPane[];
  maxHeight?: number;
  gap?: number;
};

function loadImage(base64: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not load screenshot image."));
    image.src = `data:image/png;base64,${base64}`;
  });
}

export async function loadScreenshotImage(source: CanvasImageSource | string): Promise<CanvasImageSource> {
  if (typeof source === "string") {
    return loadImage(source);
  }
  return source;
}

export async function buildChatScreenshotBlob(input: BuildChatScreenshotInput) {
  const gap = input.gap ?? 16;
  const maxHeight = input.maxHeight ?? 1200;
  const loadedPanes = await Promise.all(
    input.panes.map(async (pane) => {
      const image = await loadScreenshotImage(pane.image);
      const scale = Math.min(1, maxHeight / pane.height);
      return {
        label: pane.label,
        image,
        width: Math.round(pane.width * scale),
        height: Math.round(pane.height * scale),
      };
    }),
  );

  const canvas = document.createElement("canvas");
  const headerHeight = 36;
  canvas.width = loadedPanes.reduce((total, pane, index) => total + pane.width + (index > 0 ? gap : 0), 0);
  canvas.height = maxHeight + headerHeight;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Could not create a screenshot canvas.");
  }

  context.fillStyle = "#0f172a";
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.fillStyle = "#e2e8f0";
  context.font = "600 14px sans-serif";
  context.textBaseline = "middle";

  let offsetX = 0;
  for (const pane of loadedPanes) {
    context.fillText(pane.label, offsetX, 18);
    context.drawImage(pane.image, offsetX, headerHeight, pane.width, pane.height);
    offsetX += pane.width + gap;
  }

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Could not build screenshot image."));
        return;
      }
      resolve(blob);
    }, "image/png");
  });
}

export async function copyScreenshotBlobToClipboard(blob: Blob) {
  if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined") {
    throw new Error("Clipboard image copy is not supported in this browser.");
  }

  await navigator.clipboard.write([
    new ClipboardItem({
      "image/png": blob,
    }),
  ]);
}

export function downloadScreenshotBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function canvasToPngBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Could not export canvas image."));
        return;
      }
      resolve(blob);
    }, "image/png");
  });
}
