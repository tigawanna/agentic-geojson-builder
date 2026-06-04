import {
  buildReferenceInspectCopyTarget,
  type ReferenceInspectHover,
} from "@renderer/features/maps/lib/reference-inspect-tooltip";

type ReferenceInspectTooltipBodyProps = {
  hover: ReferenceInspectHover;
  elevationMeters?: number | null;
};

function formatCoord(value: number) {
  return value.toFixed(6);
}

function formatElevation(meters: number | null) {
  if (meters === null) {
    return null;
  }
  return `${Math.round(meters)} m`;
}

function formatDistanceMeters(meters: number) {
  if (meters < 1) {
    return `${(meters * 100).toFixed(0)} cm`;
  }
  return `${meters.toFixed(1)} m`;
}

export function ReferenceInspectTooltipBody({
  hover,
  elevationMeters,
}: ReferenceInspectTooltipBodyProps) {
  const { nearest } = hover;
  const trailElevation = elevationMeters ?? buildReferenceInspectCopyTarget(hover).elevationMeters;
  const elevationLabel = formatElevation(trailElevation);

  return (
    <div className="text-xs">
      <p className="reference-inspect-tooltip-title">{nearest.lineName}</p>
      <div className="reference-inspect-tooltip-row">
        <span className="reference-inspect-tooltip-label">Lat</span>
        <span className="reference-inspect-tooltip-value">{formatCoord(nearest.latitude)}</span>
      </div>
      <div className="reference-inspect-tooltip-row">
        <span className="reference-inspect-tooltip-label">Lng</span>
        <span className="reference-inspect-tooltip-value">{formatCoord(nearest.longitude)}</span>
      </div>
      {elevationLabel ? (
        <div className="reference-inspect-tooltip-row">
          <span className="reference-inspect-tooltip-label">Alt</span>
          <span className="reference-inspect-tooltip-value">{elevationLabel}</span>
        </div>
      ) : null}
      <div className="reference-inspect-tooltip-row">
        <span className="reference-inspect-tooltip-label">Offset</span>
        <span className="reference-inspect-tooltip-value">
          {formatDistanceMeters(nearest.distanceMeters)}
        </span>
      </div>
    </div>
  );
}
