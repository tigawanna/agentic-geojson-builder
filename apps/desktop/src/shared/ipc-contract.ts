import type {
  CreateMapInput,
  CreateMapProjectInput,
  DeleteMapInput,
  MapListItem,
  MapSourceFilePayload,
  MapThumbnailPayload,
  MapWorkspaceState,
  MapsChangedEvent,
  ReplaceMapSourceInput,
  UpdateMapWorkspaceInput,
} from "./maps.types.js";
import type {
  ControlPointRecord,
  ControlPointsChangedEvent,
  CreateControlPointFromViewportPixelsInput,
  CreateControlPointInput,
  DeleteControlPointInput,
  ImagePixelResult,
  LonLatResult,
  MapPanePixelInput,
  PdfPanePixelInput,
  UpdateControlPointInput,
} from "./control-points.types.js";
import type { McpStatus } from "./mcp.types.js";
import type { AppMenuAction, ShowMapContextMenuInput } from "./menu.types.js";
import type {
  BuildTileCacheResult,
  GetMapSectorViewInput,
  MapSectorViewResult,
  MapTileCacheConfig,
  SetTileCacheBoundsInput,
  TileCacheBuildProgressEvent,
} from "./tile-cache.types.js";
import type {
  GetRenderedMapViewResult,
  RenderedMapView,
  SetMapViewportEvent,
  SetMapViewportResponse,
  WorkspaceCaptureRequestEvent,
  WorkspaceCaptureResponseInput,
} from "./rendered-map-view.types.js";
import type {
  DeleteMapReferenceGeoJsonInput,
  ImportMapReferenceGeoJsonInput,
  ImportMapReferenceGeoJsonResult,
  ListMapReferenceGeoJsonResult,
  ReferenceGeoJsonChangedEvent,
  SetMapReferenceGeoJsonVisibilityInput,
} from "./reference-geojson.types.js";
import type { MapReferenceGeoJsonLayer } from "./reference-geojson.types.js";
import type {
  CreateDataBackupInput,
  DataBackupInfo,
  DataBackupListResult,
  DataBackupVerifyResult,
  DbBackupChangedEvent,
  DeleteDataBackupInput,
  GetDataBackupInput,
  PruneDataBackupsInput,
  PruneDataBackupsResult,
  RestoreDataBackupInput,
  VerifyDataBackupInput,
  DataBackupStoragePaths,
} from "./data-backup.types.js";
import type {
  PickPlaygroundGeoJsonFilesResult,
  PlaygroundDeleteLayerInput,
  PlaygroundDeleteLayerResult,
  PlaygroundListLayersResult,
  PlaygroundSaveLayerInput,
  PlaygroundSaveLayerResult,
  PlaygroundUpdateLayerInput,
  PlaygroundUpdateLayerResult,
} from "./playground.types.js";
import type {
  ApplyFeaturePatchInput,
  CreateGeoSegmentInput,
  DeleteGeoSegmentInput,
  ExportGeoJsonInput,
  ExportGeoJsonResult,
  FindFeatureGapsInput,
  GeoSegmentRecord,
  GeoSegmentsChangedEvent,
  MergeFeatureSegmentsInput,
  UpdateGeoSegmentInput,
  UpdateGeoSegmentStatusInput,
} from "./geo-segments.types.js";

/**
 * Single source of truth for every IPC channel in the app.
 *
 * Each entry: `'channel-name': { req: RequestType; res: ResponseType }`.
 * Add new channels here — main handlers, preload bridge, and renderer hooks
 * all derive their types from this map, so the TypeScript compiler keeps every
 * layer honest.
 */
export interface IpcContract {
  // --- App meta --------------------------------------------------------------
  "app:getVersion": { req: void; res: string };
  "app:getPlatform": { req: void; res: NodeJS.Platform };
  "app:showMapContextMenu": { req: ShowMapContextMenuInput; res: { ok: true } | { ok: false } };
  "app:hardReload": { req: void; res: { ok: true } | { ok: false } };

  // --- Generic key/value storage (electron-store backend) --------------------
  // Also fulfilled by the sqlite backend via a `kv` table.
  "store:get": { req: { key: string }; res: unknown };
  "store:set": { req: { key: string; value: unknown }; res: { ok: true } };
  "store:delete": { req: { key: string }; res: { ok: true } };
  "store:clear": { req: void; res: { ok: true } };

  // --- Relational DB (better-sqlite3 backend only) ---------------------------
  // Safe, schema-validated query surface. See docs/04-storage.md.
  "db:run": {
    req: { sql: string; params?: unknown[] };
    res: { changes: number; lastInsertRowid: number | bigint };
  };
  "db:all": { req: { sql: string; params?: unknown[] }; res: unknown[] };
  "db:get": { req: { sql: string; params?: unknown[] }; res: unknown };
  "db:ping": { req: void; res: { ok: boolean } };

  // --- Data backups (PGlite + map assets under userData/data-backups) --------
  "dbBackup:list": { req: void; res: DataBackupListResult };
  "dbBackup:get": { req: GetDataBackupInput; res: DataBackupInfo };
  "dbBackup:verify": { req: VerifyDataBackupInput; res: DataBackupVerifyResult };
  "dbBackup:create": { req: CreateDataBackupInput; res: DataBackupInfo };
  "dbBackup:restore": { req: RestoreDataBackupInput; res: { ok: true } };
  "dbBackup:delete": { req: DeleteDataBackupInput; res: { ok: true } };
  "dbBackup:prune": { req: PruneDataBackupsInput; res: PruneDataBackupsResult };
  "dbBackup:getStoragePaths": { req: void; res: DataBackupStoragePaths };
  "dbBackup:openStorageFolder": {
    req: {
      target: keyof Pick<
        DataBackupStoragePaths,
        "userDataDir" | "backupsDir" | "pgliteDir" | "mapsDir"
      >;
    };
    res: { ok: true };
  };

  // --- Maps (PGlite domain) --------------------------------------------------
  "maps:list": { req: void; res: MapListItem[] };
  "maps:create": { req: CreateMapInput; res: MapListItem };
  "maps:createProject": { req: CreateMapProjectInput; res: MapWorkspaceState };
  "maps:getWorkspace": { req: { mapId: number }; res: MapWorkspaceState | null };
  "maps:readSource": { req: { mapId: number }; res: MapSourceFilePayload | null };
  "maps:updateWorkspace": { req: UpdateMapWorkspaceInput; res: MapWorkspaceState };
  "maps:replaceSource": { req: ReplaceMapSourceInput; res: MapSourceFilePayload };
  "maps:readThumbnail": { req: { mapId: number }; res: MapThumbnailPayload | null };
  "maps:delete": { req: DeleteMapInput; res: { ok: true } };

  // --- Tile cache (local map tiles) ------------------------------------------
  "tileCache:getStatus": { req: { mapId: number }; res: MapTileCacheConfig | null };
  "tileCache:setBoundsFromCorners": { req: SetTileCacheBoundsInput; res: MapTileCacheConfig };
  "tileCache:build": { req: { mapId: number }; res: BuildTileCacheResult };
  "tileCache:getSectorView": { req: GetMapSectorViewInput; res: MapSectorViewResult };

  // --- Workspace snapshots (PDF + map pane capture) -------------------------
  "workspace:captureResponse": { req: WorkspaceCaptureResponseInput; res: { ok: true } };
  "workspace:saveRenderedView": { req: { snapshot: RenderedMapView }; res: { ok: true } };
  "workspace:getRenderedView": { req: { mapId: number }; res: GetRenderedMapViewResult };
  "workspace:requestRenderedView": {
    req: { mapId: number; liveCapture?: boolean };
    res: GetRenderedMapViewResult;
  };
  "workspace:setMapViewportResponse": {
    req: SetMapViewportResponse;
    res: { ok: true };
  };

  // --- Control points (PDF ↔ map references) -------------------------------
  "controlPoints:list": { req: { mapId: number }; res: { controlPoints: ControlPointRecord[] } };
  "controlPoints:create": {
    req: CreateControlPointInput;
    res: { controlPoint: ControlPointRecord };
  };
  "controlPoints:update": {
    req: UpdateControlPointInput;
    res: { controlPoint: ControlPointRecord };
  };
  "controlPoints:delete": { req: DeleteControlPointInput; res: { ok: true } };
  "controlPoints:mapPanePixelToLonLat": { req: MapPanePixelInput; res: LonLatResult };
  "controlPoints:pdfPanePixelToImageXY": { req: PdfPanePixelInput; res: ImagePixelResult };
  "controlPoints:createFromViewportPixels": {
    req: CreateControlPointFromViewportPixelsInput;
    res: {
      controlPoint: ControlPointRecord;
      converted: ImagePixelResult & LonLatResult;
    };
  };

  // --- Reference GeoJSON (per-map files under userData/maps/{id}/) ----------
  "referenceGeoJson:list": { req: { mapId: number }; res: ListMapReferenceGeoJsonResult };
  "referenceGeoJson:import": {
    req: ImportMapReferenceGeoJsonInput;
    res: ImportMapReferenceGeoJsonResult;
  };
  "referenceGeoJson:delete": { req: DeleteMapReferenceGeoJsonInput; res: { ok: true } };
  "referenceGeoJson:setVisibility": {
    req: SetMapReferenceGeoJsonVisibilityInput;
    res: { layer: MapReferenceGeoJsonLayer };
  };

  // --- Map playground (home GeoJSON preview) ---------------------------------
  "playground:pickGeoJsonFiles": { req: void; res: PickPlaygroundGeoJsonFilesResult };
  "playground:listLayers": { req: void; res: PlaygroundListLayersResult };
  "playground:saveLayer": { req: PlaygroundSaveLayerInput; res: PlaygroundSaveLayerResult };
  "playground:updateLayer": { req: PlaygroundUpdateLayerInput; res: PlaygroundUpdateLayerResult };
  "playground:deleteLayer": { req: PlaygroundDeleteLayerInput; res: PlaygroundDeleteLayerResult };

  // --- Geo segments (traced trails / paths) ----------------------------------
  "geoSegments:list": { req: { mapId: number }; res: { segments: GeoSegmentRecord[] } };
  "geoSegments:create": { req: CreateGeoSegmentInput; res: { segment: GeoSegmentRecord } };
  "geoSegments:update": { req: UpdateGeoSegmentInput; res: { segment: GeoSegmentRecord } };
  "geoSegments:delete": { req: DeleteGeoSegmentInput; res: { ok: true } };
  "geoSegments:updateStatus": {
    req: UpdateGeoSegmentStatusInput;
    res: { segment: GeoSegmentRecord };
  };
  "geoSegments:export": { req: ExportGeoJsonInput; res: ExportGeoJsonResult };
  "geoSegments:exportToFile": {
    req: ExportGeoJsonInput;
    res: { canceled: true } | { canceled: false; savedPath: string; featureCount: number };
  };
  "geoSegments:findGaps": {
    req: FindFeatureGapsInput;
    res: {
      mapId: number;
      snapToleranceMeters: number;
      gapCount: number;
      gaps: Array<{
        segmentGroupId: string;
        afterSegmentIndex: number;
        beforeSegmentIndex: number;
        afterSegmentId: number;
        beforeSegmentId: number;
        gapMeters: number;
        endCoord: [number, number];
        startCoord: [number, number];
      }>;
      groups: Array<{
        segmentGroupId: string;
        segmentCount: number;
        gapCount: number;
      }>;
    };
  };
  "geoSegments:mergePreview": {
    req: MergeFeatureSegmentsInput;
    res: {
      mapId: number;
      snapToleranceMeters: number;
      mergedCount: number;
      merged: Array<{
        segmentGroupId: string;
        name: string | null;
        pathKind: GeoSegmentRecord["pathKind"];
        status: GeoSegmentRecord["status"];
        sourceSegmentIds: number[];
        vertexCount: number;
        geometry: GeoSegmentRecord["geometry"];
      }>;
    };
  };
  "geoSegments:applyPatch": {
    req: ApplyFeaturePatchInput;
    res: { deleted: true; segmentId: number } | { segment: GeoSegmentRecord };
  };

  // --- Local MCP server ------------------------------------------------------
  "mcp:getStatus": { req: void; res: McpStatus };
  "mcp:setEnabled": { req: { enabled: boolean }; res: McpStatus };

  // --- Auto updater ---------------------------------------------------------
  "updater:check": { req: void; res: { updateAvailable: boolean; version?: string } };
  "updater:download": { req: void; res: { ok: true } };
  "updater:quitAndInstall": { req: void; res: { ok: true } };
}

export type IpcChannel = keyof IpcContract;
export type IpcRequest<K extends IpcChannel> = IpcContract[K]["req"];
export type IpcResponse<K extends IpcChannel> = IpcContract[K]["res"];

/**
 * Events pushed from main -> renderer (fire-and-forget, no response).
 */
export interface IpcEventMap {
  "app:menuAction": AppMenuAction;
  "maps:changed": MapsChangedEvent;
  "tileCache:buildProgress": TileCacheBuildProgressEvent;
  "workspace:captureRequest": WorkspaceCaptureRequestEvent;
  "controlPoints:changed": ControlPointsChangedEvent;
  "referenceGeoJson:changed": ReferenceGeoJsonChangedEvent;
  "geoSegments:changed": GeoSegmentsChangedEvent;
  "workspace:setMapViewport": SetMapViewportEvent;
  "updater:status": {
    state: "checking" | "available" | "not-available" | "downloading" | "downloaded" | "error";
    version?: string;
    progress?: { percent: number; bytesPerSecond: number; transferred: number; total: number };
    error?: string;
  };
  "dbBackup:changed": DbBackupChangedEvent;
}

export type IpcEventName = keyof IpcEventMap;
export type IpcEventPayload<K extends IpcEventName> = IpcEventMap[K];
