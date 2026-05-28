export type ViewportCommandFn = (command: {
  latitude?: number;
  longitude?: number;
  zoom?: number;
  fitBounds?: { north: number; south: number; east: number; west: number };
}) => { latitude: number; longitude: number; zoom: number };

const handlers = new Map<number, ViewportCommandFn>();

export function registerViewportCommand(mapId: number, handler: ViewportCommandFn) {
  handlers.set(mapId, handler);
  return () => {
    if (handlers.get(mapId) === handler) {
      handlers.delete(mapId);
    }
  };
}

export function getViewportCommand(mapId: number) {
  return handlers.get(mapId) ?? null;
}
