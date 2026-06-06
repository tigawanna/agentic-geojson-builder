import { markerHasNeighborLinks } from "@shared/marker-neighbor-coverage";

export type MapPointMarkerAppearanceInput = {
  pointId: number;
  selected: boolean;
  linkMode: boolean;
  inChain: boolean;
  isLinkHead: boolean;
  isSuggestion: boolean;
  isRouteStart?: boolean;
  isRouteEnd?: boolean;
  isRouteVia?: boolean;
  showNeighborCoverage: boolean;
  markerIdsWithNeighborLinks: ReadonlySet<number>;
};

export function resolveMapPointMarkerRing(input: MapPointMarkerAppearanceInput): string {
  if (input.linkMode) {
    if (input.isRouteStart) {
      return "#10b981";
    }
    if (input.isRouteEnd) {
      return "#ef4444";
    }
    if (input.isRouteVia) {
      return "#a855f7";
    }
    if (input.isLinkHead) {
      return "#f59e0b";
    }
    if (input.inChain) {
      return "#0ea5e9";
    }
    if (input.isSuggestion) {
      return "#22c55e";
    }
  }

  if (input.selected) {
    return "#2563eb";
  }

  if (input.showNeighborCoverage) {
    if (markerHasNeighborLinks(input.pointId, input.markerIdsWithNeighborLinks)) {
      return "#22c55e";
    }
    return "#f59e0b";
  }

  return "#ffffff";
}

export function resolveMapPointMarkerHalo(
  ring: string,
  input: MapPointMarkerAppearanceInput,
): string {
  if (
    input.linkMode &&
    (input.inChain ||
      input.isSuggestion ||
      input.isLinkHead ||
      input.isRouteStart ||
      input.isRouteEnd ||
      input.isRouteVia)
  ) {
    return `box-shadow:0 0 0 4px ${ring}55;`;
  }

  if (
    input.showNeighborCoverage &&
    !markerHasNeighborLinks(input.pointId, input.markerIdsWithNeighborLinks) &&
    !input.selected
  ) {
    return "box-shadow:0 0 0 5px rgba(245,158,11,0.45);";
  }

  if (
    input.showNeighborCoverage &&
    markerHasNeighborLinks(input.pointId, input.markerIdsWithNeighborLinks)
  ) {
    return "box-shadow:0 0 0 3px rgba(34,197,94,0.35);";
  }

  return "box-shadow:0 1px 3px rgba(0,0,0,0.4);";
}
