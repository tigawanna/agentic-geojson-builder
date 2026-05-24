import type * as Leaflet from "leaflet";
import { toPng } from "html-to-image";
import type { MapCaptureOverlayInput, RenderedMapViewMapPane } from "./types";

function readMapBounds(map: Leaflet.Map) {
  const bounds = map.getBounds();
  return {
    north: bounds.getNorth(),
    south: bounds.getSouth(),
    east: bounds.getEast(),
    west: bounds.getWest(),
  };
}

function buildMapPaneCapture(
  map: Leaflet.Map,
  overlays: MapCaptureOverlayInput,
  imageBase64: string,
  captureMode: RenderedMapViewMapPane["captureMode"],
): RenderedMapViewMapPane {
  const container = map.getContainer();
  const width = Math.max(container.clientWidth, 1);
  const height = Math.max(container.clientHeight, 1);
  const center = map.getCenter();

  return {
    imageBase64,
    mimeType: "image/png",
    viewport: {
      center: {
        latitude: center.lat,
        longitude: center.lng,
      },
      zoom: map.getZoom(),
      bounds: readMapBounds(map),
    },
    coordinateSpace: "wgs84",
    baseMapStyle: overlays.baseMapStyle,
    containerWidth: width,
    containerHeight: height,
    captureMode,
  };
}

function waitForMapPaint() {
  return new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => resolve());
    });
  });
}

async function prepareMapForCapture(map: Leaflet.Map) {
  map.invalidateSize();
  map.eachLayer((layer) => {
    if ("redraw" in layer && typeof layer.redraw === "function") {
      layer.redraw();
    }
  });

  await new Promise<void>((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) {
        return;
      }
      settled = true;
      map.off("load", handleLoad);
      window.clearTimeout(timeoutId);
      window.clearTimeout(settleId);
      resolve();
    };

    const handleLoad = () => {
      window.setTimeout(finish, 200);
    };

    map.on("load", handleLoad);
    const timeoutId = window.setTimeout(finish, 3000);
    const settleId = window.setTimeout(finish, 500);

    const loadingTiles = map
      .getContainer()
      .querySelectorAll(".leaflet-tile-pane img.leaflet-tile-loading");
    if (loadingTiles.length === 0) {
      handleLoad();
    }
  });

  await waitForMapPaint();
}

async function captureDomScreenshot(map: Leaflet.Map, overlays: MapCaptureOverlayInput) {
  const container = map.getContainer();
  const width = Math.max(container.clientWidth, 1);
  const height = Math.max(container.clientHeight, 1);

  const dataUrl = await toPng(container, {
    cacheBust: true,
    pixelRatio: 1,
    width,
    height,
    skipAutoScale: true,
    filter: (node) => {
      if (!(node instanceof HTMLElement)) {
        return true;
      }

      return !node.classList.contains("leaflet-control-container");
    },
  });

  const imageBase64 = dataUrl.split(",")[1];
  if (!imageBase64) {
    throw new Error("Could not capture map image.");
  }

  return buildMapPaneCapture(map, overlays, imageBase64, "dom-screenshot");
}

export function captureMapPaneSchematic(
  map: Leaflet.Map,
  overlays: MapCaptureOverlayInput,
): RenderedMapViewMapPane {
  const container = map.getContainer();
  const width = Math.max(container.clientWidth, 1);
  const height = Math.max(container.clientHeight, 1);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Could not create a canvas context for map capture.");
  }

  context.fillStyle = "#111827";
  context.fillRect(0, 0, width, height);

  context.strokeStyle = "rgba(148, 163, 184, 0.35)";
  context.lineWidth = 1;
  const gridStep = 64;
  for (let x = 0; x <= width; x += gridStep) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, height);
    context.stroke();
  }
  for (let y = 0; y <= height; y += gridStep) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(width, y);
    context.stroke();
  }

  for (const segment of overlays.geoSegments) {
    const coordinates = segment.geometry.coordinates;
    if (coordinates.length < 2) {
      continue;
    }

    context.strokeStyle = "#38bdf8";
    context.lineWidth = 3;
    context.beginPath();

    coordinates.forEach(([longitude, latitude], index) => {
      const point = map.latLngToContainerPoint([latitude, longitude]);
      if (index === 0) {
        context.moveTo(point.x, point.y);
        return;
      }
      context.lineTo(point.x, point.y);
    });
    context.stroke();
  }

  if (overlays.pendingTracePoints.length >= 2) {
    context.strokeStyle = "#fbbf24";
    context.lineWidth = 2;
    context.setLineDash([6, 4]);
    context.beginPath();
    overlays.pendingTracePoints.forEach((point, index) => {
      const containerPoint = map.latLngToContainerPoint([point.latitude, point.longitude]);
      if (index === 0) {
        context.moveTo(containerPoint.x, containerPoint.y);
        return;
      }
      context.lineTo(containerPoint.x, containerPoint.y);
    });
    context.stroke();
    context.setLineDash([]);
  }

  overlays.controlPoints.forEach((point, index) => {
    const containerPoint = map.latLngToContainerPoint([point.latitude, point.longitude]);
    context.fillStyle = "#ef4444";
    context.beginPath();
    context.arc(containerPoint.x, containerPoint.y, 7, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#ffffff";
    context.font = "bold 10px sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(String(index + 1), containerPoint.x, containerPoint.y);
  });

  if (overlays.pendingMapPoint) {
    const containerPoint = map.latLngToContainerPoint([
      overlays.pendingMapPoint.latitude,
      overlays.pendingMapPoint.longitude,
    ]);
    context.fillStyle = "#22c55e";
    context.beginPath();
    context.arc(containerPoint.x, containerPoint.y, 8, 0, Math.PI * 2);
    context.fill();
  }

  const dataUrl = canvas.toDataURL("image/png");
  const imageBase64 = dataUrl.split(",")[1];

  if (!imageBase64) {
    throw new Error("Could not capture the map pane.");
  }

  return buildMapPaneCapture(map, overlays, imageBase64, "schematic-overlays");
}

async function captureMapPaneTiles(map: Leaflet.Map, overlays: MapCaptureOverlayInput) {
  const container = map.getContainer();
  const width = Math.max(container.clientWidth, 1);
  const height = Math.max(container.clientHeight, 1);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Could not create a canvas context for map capture.");
  }

  context.fillStyle = "#cbd5e1";
  context.fillRect(0, 0, width, height);

  const containerRect = container.getBoundingClientRect();
  const tileImages = container.querySelectorAll<HTMLImageElement>(
    ".leaflet-tile-pane img.leaflet-tile-loaded",
  );
  let paintedTileCount = 0;

  tileImages.forEach((tile) => {
    if (!tile.complete || tile.naturalWidth === 0) {
      return;
    }

    const rect = tile.getBoundingClientRect();
    const x = rect.left - containerRect.left;
    const y = rect.top - containerRect.top;

    try {
      context.drawImage(tile, x, y, rect.width, rect.height);
      paintedTileCount += 1;
    } catch {
      return;
    }
  });

  if (paintedTileCount === 0) {
    throw new Error("Could not paint map tiles.");
  }

  for (const segment of overlays.geoSegments) {
    const coordinates = segment.geometry.coordinates;
    if (coordinates.length < 2) {
      continue;
    }

    context.strokeStyle = "#38bdf8";
    context.lineWidth = 3;
    context.beginPath();
    coordinates.forEach(([longitude, latitude], index) => {
      const point = map.latLngToContainerPoint([latitude, longitude]);
      if (index === 0) {
        context.moveTo(point.x, point.y);
        return;
      }
      context.lineTo(point.x, point.y);
    });
    context.stroke();
  }

  if (overlays.pendingTracePoints.length >= 2) {
    context.strokeStyle = "#fbbf24";
    context.lineWidth = 2;
    context.setLineDash([6, 4]);
    context.beginPath();
    overlays.pendingTracePoints.forEach((point, index) => {
      const containerPoint = map.latLngToContainerPoint([point.latitude, point.longitude]);
      if (index === 0) {
        context.moveTo(containerPoint.x, containerPoint.y);
        return;
      }
      context.lineTo(containerPoint.x, containerPoint.y);
    });
    context.stroke();
    context.setLineDash([]);
  }

  overlays.controlPoints.forEach((point, index) => {
    const containerPoint = map.latLngToContainerPoint([point.latitude, point.longitude]);
    context.fillStyle = "#ef4444";
    context.strokeStyle = "#ffffff";
    context.lineWidth = 2;
    context.beginPath();
    context.arc(containerPoint.x, containerPoint.y, 8, 0, Math.PI * 2);
    context.fill();
    context.stroke();
    context.fillStyle = "#ffffff";
    context.font = "bold 10px sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(String(index + 1), containerPoint.x, containerPoint.y);
  });

  if (overlays.pendingMapPoint) {
    const containerPoint = map.latLngToContainerPoint([
      overlays.pendingMapPoint.latitude,
      overlays.pendingMapPoint.longitude,
    ]);
    context.fillStyle = "#22c55e";
    context.beginPath();
    context.arc(containerPoint.x, containerPoint.y, 8, 0, Math.PI * 2);
    context.fill();
  }

  const dataUrl = canvas.toDataURL("image/png");
  const imageBase64 = dataUrl.split(",")[1];
  if (!imageBase64) {
    throw new Error("Could not export map tile capture.");
  }

  return buildMapPaneCapture(map, overlays, imageBase64, "tile-composite");
}

export async function captureMapPaneFromDom(
  map: Leaflet.Map,
  overlays: MapCaptureOverlayInput,
): Promise<RenderedMapViewMapPane> {
  await prepareMapForCapture(map);

  try {
    return await captureDomScreenshot(map, overlays);
  } catch {
    // Fall through to tile compositing.
  }

  try {
    return await captureMapPaneTiles(map, overlays);
  } catch {
    // Fall through to schematic fallback.
  }

  return captureMapPaneSchematic(map, overlays);
}
