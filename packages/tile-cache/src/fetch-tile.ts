import { buildTileUrl } from "./tile-url";

export async function fetchTileBuffer(style: Parameters<typeof buildTileUrl>[0], z: number, x: number, y: number) {
  const url = buildTileUrl(style, z, x, y);
  const response = await fetch(url, {
    headers: {
      "User-Agent": "agentic-geojson-builder/0.1 tile-cache-prototype",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch tile ${z}/${x}/${y}: ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
