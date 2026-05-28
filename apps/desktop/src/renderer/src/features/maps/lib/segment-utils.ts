export function segmentGroupColor(segmentGroupId: string) {
  let hash = 0;
  for (let index = 0; index < segmentGroupId.length; index += 1) {
    hash = segmentGroupId.charCodeAt(index) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue} 72% 42%)`;
}

export function lineStringToLatLngs(coordinates: [number, number][]) {
  return coordinates.map(([longitude, latitude]) => ({ lat: latitude, lng: longitude }));
}
