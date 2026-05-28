import { buildTileUrl, buildTileUrlFallback } from "./tile-url.js";

async function fetchUrlBuffer(url: string) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "agentic-geojson-builder/0.1 tile-cache-prototype",
    },
  });

  if (!response.ok) {
    return null;
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function fetchTileBuffer(
  style: Parameters<typeof buildTileUrl>[0],
  z: number,
  x: number,
  y: number,
) {
  const primary = await fetchUrlBuffer(buildTileUrl(style, z, x, y));
  if (primary) {
    return primary;
  }

  const fallback = await fetchUrlBuffer(buildTileUrlFallback(style, z, x, y));
  if (fallback) {
    return fallback;
  }

  throw new Error(`Failed to fetch tile ${z}/${x}/${y}`);
}
