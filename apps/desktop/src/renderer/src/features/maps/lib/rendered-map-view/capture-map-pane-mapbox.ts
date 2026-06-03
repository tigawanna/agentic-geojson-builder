import type mapboxgl from "mapbox-gl";
import type {
  MapCaptureOverlayInput,
  RenderedMapViewMapPane,
} from "@shared/rendered-map-view.types";
import { annotateMapCaptureImage } from "@renderer/features/maps/lib/rendered-map-view/capture-agent-guides";

function readMapBounds(map: mapboxgl.Map) {
  const bounds = map.getBounds();
  if (!bounds) {
    const center = map.getCenter();
    return { north: center.lat, south: center.lat, east: center.lng, west: center.lng };
  }
  return {
    north: bounds.getNorth(),
    south: bounds.getSouth(),
    east: bounds.getEast(),
    west: bounds.getWest(),
  };
}

function waitForMapIdle(map: mapboxgl.Map) {
  return new Promise<void>((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) {
        return;
      }
      settled = true;
      map.off("idle", finish);
      window.clearTimeout(timeoutId);
      resolve();
    };

    const timeoutId = window.setTimeout(finish, 3000);
    map.on("idle", finish);
    if (map.loaded() && map.areTilesLoaded()) {
      finish();
    }
  });
}

export async function captureMapboxPane(
  map: mapboxgl.Map,
  overlays: MapCaptureOverlayInput,
): Promise<RenderedMapViewMapPane> {
  await waitForMapIdle(map);
  map.triggerRepaint();
  await new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => resolve()));
  });

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

  context.drawImage(map.getCanvas(), 0, 0, width, height);

  const project = (longitude: number, latitude: number) => map.project([longitude, latitude]);

  for (const segment of overlays.geoSegments) {
    const coordinates = segment.geometry.coordinates;
    if (coordinates.length < 2) {
      continue;
    }
    context.strokeStyle = "#38bdf8";
    context.lineWidth = 3;
    context.beginPath();
    coordinates.forEach(([longitude, latitude], index) => {
      const point = project(longitude, latitude);
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
      const containerPoint = project(point.longitude, point.latitude);
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
    const containerPoint = project(point.longitude, point.latitude);
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
    const containerPoint = project(
      overlays.pendingMapPoint.longitude,
      overlays.pendingMapPoint.latitude,
    );
    context.fillStyle = "#22c55e";
    context.beginPath();
    context.arc(containerPoint.x, containerPoint.y, 8, 0, Math.PI * 2);
    context.fill();
  }

  const dataUrl = canvas.toDataURL("image/png");
  const imageBase64 = dataUrl.split(",")[1];
  if (!imageBase64) {
    throw new Error("Could not export Mapbox GL capture.");
  }

  const bounds = readMapBounds(map);
  const annotated = await annotateMapCaptureImage(imageBase64, width, height, bounds);
  const center = map.getCenter();

  return {
    imageBase64: annotated,
    mimeType: "image/png",
    viewport: {
      center: { latitude: center.lat, longitude: center.lng },
      zoom: map.getZoom(),
      bounds,
    },
    coordinateSpace: "wgs84",
    baseMapStyle: overlays.baseMapStyle,
    containerWidth: width,
    containerHeight: height,
    captureMode: "tile-composite",
  };
}
