import { SegmentBuildFromPathPanel } from "@renderer/features/maps/components/SegmentBuildFromPathPanel";
import { useMapDataExplorerPageStore } from "@renderer/features/maps/store/map-data-explorer-page-store";
import type { GeoSegmentRecord } from "@shared/geo-segments.types";

type MapDataExplorerBuildSegmentsPanelProps = {
  mapId: number;
  geoSegments: GeoSegmentRecord[];
};

export function MapDataExplorerBuildSegmentsPanel({
  mapId,
  geoSegments,
}: MapDataExplorerBuildSegmentsPanelProps) {
  const setStatusMessage = useMapDataExplorerPageStore((state) => state.setStatusMessage);

  return (
    <div
      className="mb-4 rounded-box border border-primary/20 bg-primary/5 p-4"
      data-test="data-explorer-build-segments"
    >
      <SegmentBuildFromPathPanel
        mapId={mapId}
        geoSegments={geoSegments}
        showPathSelect
        onStatusMessage={setStatusMessage}
      />
    </div>
  );
}
