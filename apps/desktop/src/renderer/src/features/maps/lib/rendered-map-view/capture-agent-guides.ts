type Bounds = {
  north: number;
  south: number;
  east: number;
  west: number;
};

export const PDF_GUIDE_GRID_STEP = 100;
export const MAP_GUIDE_GRID_STEP = 64;

export function drawPdfAgentGuides(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
) {
  context.save();

  context.strokeStyle = "rgba(148, 163, 184, 0.35)";
  context.lineWidth = 1;
  for (let x = 0; x <= width; x += PDF_GUIDE_GRID_STEP) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, height);
    context.stroke();
  }
  for (let y = 0; y <= height; y += PDF_GUIDE_GRID_STEP) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(width, y);
    context.stroke();
  }

  context.fillStyle = "rgba(15, 23, 42, 0.72)";
  context.font = "10px sans-serif";
  context.textAlign = "center";
  context.textBaseline = "top";

  for (let x = 0; x <= width; x += PDF_GUIDE_GRID_STEP) {
    if (x === 0) {
      continue;
    }
    const label = String(x);
    const textWidth = context.measureText(label).width + 8;
    context.fillRect(x - textWidth / 2, height - 18, textWidth, 14);
    context.fillStyle = "#f8fafc";
    context.fillText(label, x, height - 16);
    context.fillStyle = "rgba(15, 23, 42, 0.72)";
  }

  context.textAlign = "right";
  context.textBaseline = "middle";
  for (let y = 0; y <= height; y += PDF_GUIDE_GRID_STEP) {
    if (y === 0) {
      continue;
    }
    const label = String(y);
    const textWidth = context.measureText(label).width + 8;
    context.fillRect(0, y - 7, textWidth, 14);
    context.fillStyle = "#f8fafc";
    context.fillText(label, textWidth - 4, y);
    context.fillStyle = "rgba(15, 23, 42, 0.72)";
  }

  const header = `${width} x ${height} px · origin top-left · pdf-pixels`;
  const headerWidth = context.measureText(header).width + 12;
  context.fillStyle = "rgba(15, 23, 42, 0.78)";
  context.fillRect(width - headerWidth - 8, 8, headerWidth, 18);
  context.fillStyle = "#f8fafc";
  context.textAlign = "right";
  context.textBaseline = "top";
  context.fillText(header, width - 12, 11);

  context.restore();
}

export function drawPdfControlPointLabel(
  context: CanvasRenderingContext2D,
  imageX: number,
  imageY: number,
  index: number,
) {
  const label = `${index + 1}: ${Math.round(imageX)}, ${Math.round(imageY)}`;
  context.font = "9px sans-serif";
  const textWidth = context.measureText(label).width + 8;
  const boxX = imageX - textWidth / 2;
  const boxY = imageY + 12;

  context.fillStyle = "rgba(15, 23, 42, 0.82)";
  context.fillRect(boxX, boxY, textWidth, 14);
  context.fillStyle = "#f8fafc";
  context.textAlign = "center";
  context.textBaseline = "top";
  context.fillText(label, imageX, boxY + 2);
}

export function drawMapAgentGuides(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  bounds: Bounds,
) {
  context.save();

  context.strokeStyle = "rgba(148, 163, 184, 0.3)";
  context.lineWidth = 1;
  for (let x = 0; x <= width; x += MAP_GUIDE_GRID_STEP) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, height);
    context.stroke();
  }
  for (let y = 0; y <= height; y += MAP_GUIDE_GRID_STEP) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(width, y);
    context.stroke();
  }

  const lonStep = pickNiceDegreeStep(bounds.east - bounds.west, 6);
  const latStep = pickNiceDegreeStep(bounds.north - bounds.south, 5);

  context.font = "9px sans-serif";
  context.fillStyle = "rgba(15, 23, 42, 0.78)";
  context.textAlign = "center";
  context.textBaseline = "top";

  for (let lon = ceilToStep(bounds.west, lonStep); lon <= bounds.east; lon += lonStep) {
    const x = ((lon - bounds.west) / (bounds.east - bounds.west)) * width;
    const label = lon.toFixed(3);
    const textWidth = context.measureText(label).width + 8;
    context.fillRect(x - textWidth / 2, height - 18, textWidth, 14);
    context.fillStyle = "#f8fafc";
    context.fillText(label, x, height - 16);
    context.fillStyle = "rgba(15, 23, 42, 0.78)";
  }

  context.textAlign = "right";
  context.textBaseline = "middle";
  for (let lat = ceilToStep(bounds.south, latStep); lat <= bounds.north; lat += latStep) {
    const y = ((bounds.north - lat) / (bounds.north - bounds.south)) * height;
    const label = lat.toFixed(4);
    const textWidth = context.measureText(label).width + 8;
    context.fillRect(0, y - 7, textWidth, 14);
    context.fillStyle = "#f8fafc";
    context.fillText(label, textWidth - 4, y);
    context.fillStyle = "rgba(15, 23, 42, 0.78)";
  }

  const header = `N ${bounds.north.toFixed(4)}  S ${bounds.south.toFixed(4)}  E ${bounds.east.toFixed(4)}  W ${bounds.west.toFixed(4)}`;
  const headerWidth = context.measureText(header).width + 12;
  context.fillStyle = "rgba(15, 23, 42, 0.78)";
  context.fillRect(8, 8, headerWidth, 18);
  context.fillStyle = "#f8fafc";
  context.textAlign = "left";
  context.textBaseline = "top";
  context.fillText(header, 14, 11);

  context.restore();
}

function pickNiceDegreeStep(span: number, targetTickCount: number) {
  const rough = span / Math.max(targetTickCount, 1);
  const magnitude = 10 ** Math.floor(Math.log10(Math.max(rough, 1e-6)));
  const normalized = rough / magnitude;
  if (normalized <= 1) {
    return magnitude;
  }
  if (normalized <= 2) {
    return 2 * magnitude;
  }
  if (normalized <= 5) {
    return 5 * magnitude;
  }
  return 10 * magnitude;
}

function ceilToStep(value: number, step: number) {
  return Math.ceil(value / step) * step;
}

export async function annotateMapCaptureImage(
  imageBase64: string,
  width: number,
  height: number,
  bounds: Bounds,
) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    return imageBase64;
  }

  const image = new Image();
  const dataUrl = `data:image/png;base64,${imageBase64}`;
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("Could not load map capture image."));
    image.src = dataUrl;
  });

  context.drawImage(image, 0, 0, width, height);
  drawMapAgentGuides(context, width, height, bounds);

  const annotated = canvas.toDataURL("image/png").split(",")[1];
  return annotated ?? imageBase64;
}
