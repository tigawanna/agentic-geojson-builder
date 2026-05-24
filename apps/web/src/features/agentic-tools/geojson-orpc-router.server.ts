import "@tanstack/react-start/server-only";

import {
  controlPointToolOutputSchema,
  coordinateConversionOutputSchema,
  createControlPointToolInputSchema,
  createMapToolInputSchema,
  createMapToolOutputSchema,
  deleteControlPointToolInputSchema,
  deleteControlPointToolOutputSchema,
  deleteMapToolOutputSchema,
  georeferenceToolOutputSchema,
  getMapWorkspaceToolOutputSchema,
  getProjectContextToolOutputSchema,
  applyFeaturePatchToolInputSchema,
  applyFeaturePatchToolOutputSchema,
  exportGeoJsonToolInputSchema,
  exportGeoJsonToolOutputSchema,
  listFeatureSegmentsToolOutputSchema,
  listControlPointsToolOutputSchema,
  listMapsToolInputSchema,
  listMapsToolOutputSchema,
  loadMapPdfToolOutputSchema,
  lonLatToolInputSchema,
  mapIdInputSchema,
  pdfPixelConversionOutputSchema,
  pdfPixelToolInputSchema,
  saveMapPdfToolInputSchema,
  saveMapPdfToolOutputSchema,
  updateControlPointToolInputSchema,
  updateMapWorkspaceToolInputSchema,
  updateMapWorkspaceToolOutputSchema,
} from "./geojson-tool-schemas";
import {
  geojsonCreateProcedure,
  geojsonDeleteProcedure,
  geojsonListProcedure,
  geojsonReadProcedure,
  geojsonUpdateProcedure,
} from "./geojson-orpc-base.server";
import {
  applyFeaturePatchTool,
  computeGeoreferenceTool,
  createControlPointTool,
  createMapTool,
  deleteControlPointTool,
  deleteMapTool,
  exportGeoJsonTool,
  getGeoreferenceTool,
  getMapWorkspaceTool,
  getProjectContextTool,
  listFeatureSegmentsTool,
  listControlPointsTool,
  listMapsTool,
  loadMapPdfTool,
  lonLatToPdfPixelTool,
  pdfPixelToLonLatTool,
  saveMapPdfTool,
  updateControlPointTool,
  updateMapWorkspaceTool,
} from "./geojson-tools.server";

const listMapsProcedure = geojsonListProcedure
  .route({
    method: "POST",
    path: "/maps/list",
    summary: "List maps",
    description: "List paginated maps for the authenticated user.",
    tags: ["Agentic GeoJSON"],
    successStatus: 200,
  })
  .input(listMapsToolInputSchema)
  .output(listMapsToolOutputSchema)
  .handler(async ({ context, input }) => listMapsTool({ userId: context.userId }, input));

const getMapWorkspaceProcedure = geojsonReadProcedure
  .route({
    method: "POST",
    path: "/maps/workspace",
    summary: "Get map workspace",
    description: "Load map metadata and workspace preferences.",
    tags: ["Agentic GeoJSON"],
    successStatus: 200,
  })
  .input(mapIdInputSchema)
  .output(getMapWorkspaceToolOutputSchema)
  .handler(async ({ context, input }) =>
    getMapWorkspaceTool({ userId: context.userId }, input.mapId),
  );

const createMapProcedure = geojsonCreateProcedure
  .route({
    method: "POST",
    path: "/maps/create",
    summary: "Create map",
    description: "Create a new map project for the authenticated user.",
    tags: ["Agentic GeoJSON"],
    successStatus: 200,
  })
  .input(createMapToolInputSchema)
  .output(createMapToolOutputSchema)
  .handler(async ({ context, input }) => createMapTool({ userId: context.userId }, input));

const updateMapWorkspaceProcedure = geojsonUpdateProcedure
  .route({
    method: "POST",
    path: "/maps/update-workspace",
    summary: "Update map workspace",
    description: "Update viewport, PDF transform, base map style, and related prefs.",
    tags: ["Agentic GeoJSON"],
    successStatus: 200,
  })
  .input(updateMapWorkspaceToolInputSchema)
  .output(updateMapWorkspaceToolOutputSchema)
  .handler(async ({ context, input }) => updateMapWorkspaceTool({ userId: context.userId }, input));

const deleteMapProcedure = geojsonDeleteProcedure
  .route({
    method: "POST",
    path: "/maps/delete",
    summary: "Delete map",
    description: "Delete a map and its control points.",
    tags: ["Agentic GeoJSON"],
    successStatus: 200,
  })
  .input(mapIdInputSchema)
  .output(deleteMapToolOutputSchema)
  .handler(async ({ context, input }) => deleteMapTool({ userId: context.userId }, input.mapId));

const saveMapPdfProcedure = geojsonUpdateProcedure
  .route({
    method: "POST",
    path: "/maps/save-pdf",
    summary: "Save map PDF",
    description: "Upload or replace the PDF bytea for a map.",
    tags: ["Agentic GeoJSON"],
    successStatus: 200,
  })
  .input(saveMapPdfToolInputSchema)
  .output(saveMapPdfToolOutputSchema)
  .handler(async ({ context, input }) => saveMapPdfTool({ userId: context.userId }, input));

const loadMapPdfProcedure = geojsonReadProcedure
  .route({
    method: "POST",
    path: "/maps/load-pdf",
    summary: "Load map PDF",
    description: "Download the stored PDF as base64.",
    tags: ["Agentic GeoJSON"],
    successStatus: 200,
  })
  .input(mapIdInputSchema)
  .output(loadMapPdfToolOutputSchema)
  .handler(async ({ context, input }) => loadMapPdfTool({ userId: context.userId }, input.mapId));

const listControlPointsProcedure = geojsonReadProcedure
  .route({
    method: "POST",
    path: "/control-points/list",
    summary: "List control points",
    description: "List georeferencing control points for a map.",
    tags: ["Agentic GeoJSON"],
    successStatus: 200,
  })
  .input(mapIdInputSchema)
  .output(listControlPointsToolOutputSchema)
  .handler(async ({ context, input }) =>
    listControlPointsTool({ userId: context.userId }, input.mapId),
  );

const createControlPointProcedure = geojsonUpdateProcedure
  .route({
    method: "POST",
    path: "/control-points/create",
    summary: "Create control point",
    description: "Create a PDF pixel to WGS84 control point pair.",
    tags: ["Agentic GeoJSON"],
    successStatus: 200,
  })
  .input(createControlPointToolInputSchema)
  .output(controlPointToolOutputSchema)
  .handler(async ({ context, input }) => createControlPointTool({ userId: context.userId }, input));

const updateControlPointProcedure = geojsonUpdateProcedure
  .route({
    method: "POST",
    path: "/control-points/update",
    summary: "Update control point",
    description: "Update an existing control point pair.",
    tags: ["Agentic GeoJSON"],
    successStatus: 200,
  })
  .input(updateControlPointToolInputSchema)
  .output(controlPointToolOutputSchema)
  .handler(async ({ context, input }) => updateControlPointTool({ userId: context.userId }, input));

const deleteControlPointProcedure = geojsonDeleteProcedure
  .route({
    method: "POST",
    path: "/control-points/delete",
    summary: "Delete control point",
    description: "Delete a control point from a map.",
    tags: ["Agentic GeoJSON"],
    successStatus: 200,
  })
  .input(deleteControlPointToolInputSchema)
  .output(deleteControlPointToolOutputSchema)
  .handler(async ({ context, input }) => deleteControlPointTool({ userId: context.userId }, input));

const getGeoreferenceProcedure = geojsonReadProcedure
  .route({
    method: "POST",
    path: "/georeference/get",
    summary: "Get georeference",
    description: "Return stored georeference or compute when control points changed.",
    tags: ["Agentic GeoJSON"],
    successStatus: 200,
  })
  .input(mapIdInputSchema)
  .output(georeferenceToolOutputSchema)
  .handler(async ({ context, input }) =>
    getGeoreferenceTool({ userId: context.userId }, input.mapId),
  );

const computeGeoreferenceProcedure = geojsonUpdateProcedure
  .route({
    method: "POST",
    path: "/georeference/compute",
    summary: "Compute georeference",
    description: "Recompute and persist the affine transform from control points.",
    tags: ["Agentic GeoJSON"],
    successStatus: 200,
  })
  .input(mapIdInputSchema)
  .output(georeferenceToolOutputSchema)
  .handler(async ({ context, input }) =>
    computeGeoreferenceTool({ userId: context.userId }, input.mapId),
  );

const pdfPixelToLonLatProcedure = geojsonReadProcedure
  .route({
    method: "POST",
    path: "/georeference/pdf-pixel-to-lon-lat",
    summary: "Convert PDF pixel to lon/lat",
    tags: ["Agentic GeoJSON"],
    successStatus: 200,
  })
  .input(pdfPixelToolInputSchema)
  .output(coordinateConversionOutputSchema)
  .handler(async ({ context, input }) => pdfPixelToLonLatTool({ userId: context.userId }, input));

const lonLatToPdfPixelProcedure = geojsonReadProcedure
  .route({
    method: "POST",
    path: "/georeference/lon-lat-to-pdf-pixel",
    summary: "Convert lon/lat to PDF pixel",
    tags: ["Agentic GeoJSON"],
    successStatus: 200,
  })
  .input(lonLatToolInputSchema)
  .output(pdfPixelConversionOutputSchema)
  .handler(async ({ context, input }) => lonLatToPdfPixelTool({ userId: context.userId }, input));

const getProjectContextProcedure = geojsonReadProcedure
  .route({
    method: "POST",
    path: "/project/context",
    summary: "Get project context",
    description: "Aggregated map, control points, and georeference status for agents.",
    tags: ["Agentic GeoJSON"],
    successStatus: 200,
  })
  .input(mapIdInputSchema)
  .output(getProjectContextToolOutputSchema)
  .handler(async ({ context, input }) =>
    getProjectContextTool({ userId: context.userId }, input.mapId),
  );

const listFeatureSegmentsProcedure = geojsonReadProcedure
  .route({
    method: "POST",
    path: "/feature-segments/list",
    summary: "List feature segments",
    description: "List draft and accepted trail segments for a map.",
    tags: ["Agentic GeoJSON"],
    successStatus: 200,
  })
  .input(mapIdInputSchema)
  .output(listFeatureSegmentsToolOutputSchema)
  .handler(async ({ context, input }) =>
    listFeatureSegmentsTool({ userId: context.userId }, input.mapId),
  );

const applyFeaturePatchProcedure = geojsonUpdateProcedure
  .route({
    method: "POST",
    path: "/feature-segments/patch",
    summary: "Apply feature patch",
    description: "Upsert or delete a trail segment. PDF pixel geometry is converted to WGS84.",
    tags: ["Agentic GeoJSON"],
    successStatus: 200,
  })
  .input(applyFeaturePatchToolInputSchema)
  .output(applyFeaturePatchToolOutputSchema)
  .handler(async ({ context, input }) => applyFeaturePatchTool({ userId: context.userId }, input));

const exportGeoJsonProcedure = geojsonReadProcedure
  .route({
    method: "POST",
    path: "/geojson/export",
    summary: "Export GeoJSON",
    description: "Build a FeatureCollection from saved trail segments.",
    tags: ["Agentic GeoJSON"],
    successStatus: 200,
  })
  .input(exportGeoJsonToolInputSchema)
  .output(exportGeoJsonToolOutputSchema)
  .handler(async ({ context, input }) => exportGeoJsonTool({ userId: context.userId }, input));

export const geojsonAgenticRouter = {
  maps: {
    list: listMapsProcedure,
    workspace: getMapWorkspaceProcedure,
    create: createMapProcedure,
    updateWorkspace: updateMapWorkspaceProcedure,
    delete: deleteMapProcedure,
    savePdf: saveMapPdfProcedure,
    loadPdf: loadMapPdfProcedure,
  },
  controlPoints: {
    list: listControlPointsProcedure,
    create: createControlPointProcedure,
    update: updateControlPointProcedure,
    delete: deleteControlPointProcedure,
  },
  georeference: {
    get: getGeoreferenceProcedure,
    compute: computeGeoreferenceProcedure,
    pdfPixelToLonLat: pdfPixelToLonLatProcedure,
    lonLatToPdfPixel: lonLatToPdfPixelProcedure,
  },
  project: {
    context: getProjectContextProcedure,
  },
  featureSegments: {
    list: listFeatureSegmentsProcedure,
    patch: applyFeaturePatchProcedure,
  },
  export: {
    geojson: exportGeoJsonProcedure,
  },
};

export type GeojsonAgenticRouter = typeof geojsonAgenticRouter;
