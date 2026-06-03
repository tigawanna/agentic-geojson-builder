import type { MenuItemConstructorOptions } from "electron";
import { getMapWorkspaceMenuState } from "@main/lib/map-workspace-menu-state.js";
import { sendAppMenuAction } from "@main/menu/menu-actions.js";
import { MAPBOX_GL_STYLE_MENU_LABELS, MAPBOX_GL_STYLE_ORDER } from "@shared/mapbox-menu.types.js";

function menuClick(id: string): MenuItemConstructorOptions["click"] {
  return () => {
    sendAppMenuAction({ type: "map-workspace-menu", id });
  };
}

export function buildMapWorkspaceMenuSubmenu(): MenuItemConstructorOptions[] {
  const state = getMapWorkspaceMenuState();
  const exportDisabled = state.segmentCount === 0 || state.exportPending;

  const items: MenuItemConstructorOptions[] = [
    {
      label: "Add Reference Point",
      type: "checkbox",
      checked: state.referenceMode,
      enabled: state.hasSourceFile && !state.traceMode,
      click: menuClick("reference-mode"),
    },
    {
      label: "Trace Trail",
      type: "checkbox",
      checked: state.traceMode,
      enabled: !state.referenceMode,
      click: menuClick("trace-mode"),
    },
    {
      label: "Add Marker",
      type: "checkbox",
      checked: state.markerMode,
      enabled: !state.referenceMode && !state.traceMode,
      click: menuClick("marker-mode"),
    },
    {
      label: "Link Points",
      type: "checkbox",
      checked: state.linkMode,
      enabled: !state.referenceMode && !state.traceMode,
      click: menuClick("link-mode"),
    },
    { type: "separator" },
  ];

  if (state.hasReferenceGeoJson) {
    items.push({
      label: "Show Reference Overlay",
      type: "checkbox",
      checked: state.showReferenceOverlay,
      click: menuClick("reference-overlay"),
    });
  }

  items.push(
    {
      label: "Trail Inspect Tooltip",
      type: "checkbox",
      checked: state.showReferenceInspectTooltip,
      click: menuClick("reference-inspect-tooltip"),
    },
    {
      label: "Drag Reference Points",
      type: "checkbox",
      checked: state.controlPointDragEnabled,
      click: menuClick("control-point-drag"),
    },
    { type: "separator" },
    {
      label: "Base Map Renderer",
      submenu: [
        {
          label: "Leaflet (raster)",
          type: "radio",
          checked: state.baseRenderer === "leaflet",
          click: menuClick("base-renderer:leaflet"),
        },
        {
          label: "Mapbox GL (vector)",
          type: "radio",
          checked: state.baseRenderer === "mapbox-gl",
          enabled: state.mapboxTokenAvailable,
          click: menuClick("base-renderer:mapbox-gl"),
        },
      ],
    },
  );

  if (state.baseRenderer === "mapbox-gl") {
    items.push(
      {
        label: "Mapbox Style",
        submenu: MAPBOX_GL_STYLE_ORDER.map((styleId) => ({
          label: MAPBOX_GL_STYLE_MENU_LABELS[styleId],
          type: "radio",
          checked: state.mapboxGlStyle === styleId,
          click: menuClick(`mapbox-style:${styleId}`),
        })),
      },
      {
        label: "Inspect Mode",
        type: "checkbox",
        checked: state.mapboxInspectMode,
        accelerator: "CmdOrCtrl+Shift+I",
        click: menuClick("mapbox-inspect"),
      },
    );
  }

  items.push(
    { type: "separator" },
    {
      label: "Preview GeoJSON",
      enabled: state.segmentCount > 0,
      click: menuClick("preview-geojson"),
    },
    {
      label: "Export GeoJSON…",
      enabled: !exportDisabled,
      click: menuClick("export-geojson"),
    },
    {
      label: "Open Export Screen…",
      click: menuClick("open-export-page"),
    },
    { type: "separator" },
    {
      label: "Map Settings…",
      accelerator: "CmdOrCtrl+,",
      click: menuClick("open-controls"),
    },
    {
      label: "Change History…",
      accelerator: "CmdOrCtrl+Shift+H",
      click: menuClick("open-history"),
    },
    {
      label: "Workspace Guide",
      click: menuClick("show-guide"),
    },
    { type: "separator" },
    {
      label: "Reload Map View",
      click: menuClick("hard-reload"),
    },
    { type: "separator" },
    {
      label: "Toggle Tools Panel",
      accelerator: "CmdOrCtrl+Shift+P",
      click: menuClick("toggle-tools-panel"),
    },
  );

  return items;
}
