import type { SourcePanelPresentation } from "@shared/workspace-layout.types";

export const SIDEBAR_STATE_STORE_KEY = "ui.sidebarState";
export const MAP_WORKSPACE_LAYOUT_STORE_KEY = "maps.workspaceLayout";

export type PersistedMapWorkspaceLayout = {
  mapPanelCollapsed: boolean;
  sourcePanelPresentation: SourcePanelPresentation;
};

const SOURCE_PANEL_PRESENTATIONS = new Set<SourcePanelPresentation>([
  "docked",
  "collapsed",
  "detached",
]);

export function parsePersistedMapWorkspaceLayout(
  value: unknown,
): Partial<PersistedMapWorkspaceLayout> | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const result: Partial<PersistedMapWorkspaceLayout> = {};

  if (typeof record.mapPanelCollapsed === "boolean") {
    result.mapPanelCollapsed = record.mapPanelCollapsed;
  }

  if (typeof record.sourcePanelPresentation === "string") {
    if (record.sourcePanelPresentation === "detached") {
      result.sourcePanelPresentation = "docked";
    } else if (
      SOURCE_PANEL_PRESENTATIONS.has(record.sourcePanelPresentation as SourcePanelPresentation)
    ) {
      result.sourcePanelPresentation = record.sourcePanelPresentation as SourcePanelPresentation;
    }
  }

  return Object.keys(result).length > 0 ? result : null;
}

export function parsePersistedSidebarState(value: unknown): "expanded" | "collapsed" | null {
  if (value === "expanded" || value === "collapsed") {
    return value;
  }
  return null;
}
