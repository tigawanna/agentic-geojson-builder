import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createControlPointMutationOptions,
  deleteControlPointMutationOptions,
  listControlPointsQueryOptions,
  updateControlPointMutationOptions,
  type ControlPointViewModel,
} from "@/data-access-layer/control-points/control-points-query-options";
import {
  createGeoSegmentMutationOptions,
  deleteGeoSegmentMutationOptions,
  listGeoSegmentsQueryOptions,
  type GeoSegmentPathKind,
  type GeoSegmentViewModel,
} from "@/data-access-layer/geo-segments/geo-segments-query-options";
import { getGeoreferenceQueryOptions } from "@/data-access-layer/georeference/georeference-query-options";
import {
  getMapWorkspaceQueryOptions,
  loadMapPdfFile,
  saveMapPdfMutationOptions,
  updateMapWorkspaceMutationOptions,
  type MapViewport,
} from "@/data-access-layer/maps/maps-query-options";
import {
  copyMapCoordinates,
  createBaseLayer,
  createMapHandle,
  DEFAULT_MAP_VIEWPORT,
  type BaseMapStyle,
  type MapHandle,
} from "./map-handle";
import { segmentGroupColor, lineStringToLatLngs } from "./segment-utils";
import { useDebouncedValue } from "@/hooks/use-debouncer";
import { cn } from "@/lib/utils";
import { unwrapUnknownError } from "@/utils/errors";
import { parseMapCoordinates } from "@/utils/parse-map-coordinates";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Crosshair,
  MapPin,
  Pencil,
  RotateCcw,
  Search,
  Settings2,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { PDFDocumentLoadingTask, RenderTask } from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.mjs?url";
import "leaflet/dist/leaflet.css";
import type * as Leaflet from "leaflet";

type PdfViewTransform = {
  scale: number;
  rotation: number;
  panX: number;
  panY: number;
};

type PendingMapPoint = {
  latitude: number;
  longitude: number;
};

type PendingTracePoint = {
  latitude: number;
  longitude: number;
};

const SEGMENT_PATH_KINDS: GeoSegmentPathKind[] = [
  "walking-trail",
  "bike-path",
  "dog-path",
  "service-road",
  "boundary",
  "landmark",
  "unknown",
];

type ControlPointEditDraft = {
  imageX: string;
  imageY: string;
  mapCoordinatesInput: string;
};

const DEFAULT_TRANSFORM: PdfViewTransform = {
  scale: 1,
  rotation: 0,
  panX: 0,
  panY: 0,
};

const MIN_PDF_SCALE = 0.25;
const MAX_PDF_SCALE = 5;

type MapAlignmentWorkspaceProps = {
  mapId: number;
};

function clampPdfScale(scale: number) {
  return Math.min(MAX_PDF_SCALE, Math.max(MIN_PDF_SCALE, scale));
}

function getImageCoordinatesFromClick(
  canvas: HTMLCanvasElement,
  event: React.MouseEvent<HTMLCanvasElement>,
) {
  return getImageCoordinatesFromPointer(canvas, event.clientX, event.clientY);
}

function getImageCoordinatesFromPointer(
  canvas: HTMLCanvasElement,
  clientX: number,
  clientY: number,
) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  return {
    imageX: (clientX - rect.left) * scaleX,
    imageY: (clientY - rect.top) * scaleY,
  };
}

export function MapAlignmentWorkspace({ mapId }: MapAlignmentWorkspaceProps) {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [transform, setTransform] = useState<PdfViewTransform>(DEFAULT_TRANSFORM);
  const [baseMapStyle, setBaseMapStyle] = useState<BaseMapStyle>("satellite");
  const [locationQuery, setLocationQuery] = useState("");
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [controlsOpen, setControlsOpen] = useState(false);
  const [referenceMode, setReferenceMode] = useState(false);
  const [traceMode, setTraceMode] = useState(false);
  const [pendingTracePoints, setPendingTracePoints] = useState<PendingTracePoint[]>([]);
  const [segmentGroupId, setSegmentGroupId] = useState("10k-blue");
  const [segmentName, setSegmentName] = useState("");
  const [segmentPathKind, setSegmentPathKind] = useState<GeoSegmentPathKind>("walking-trail");
  const [pendingMapPoint, setPendingMapPoint] = useState<PendingMapPoint | null>(null);
  const [pinCoordinateInput, setPinCoordinateInput] = useState("");
  const [pinCoordinateError, setPinCoordinateError] = useState<string | null>(null);
  const [selectedControlPointId, setSelectedControlPointId] = useState<number | null>(null);
  const [editingControlPointId, setEditingControlPointId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<ControlPointEditDraft | null>(null);
  const [editDraftError, setEditDraftError] = useState<string | null>(null);
  const [mapViewport, setMapViewport] = useState<MapViewport>(DEFAULT_MAP_VIEWPORT);
  const [isHydrated, setIsHydrated] = useState(false);
  const mapHandleRef = useRef<MapHandle | null>(null);

  const mapQuery = useQuery({
    ...getMapWorkspaceQueryOptions(mapId),
  });
  const controlPointsQuery = useQuery({
    ...listControlPointsQueryOptions(mapId),
  });
  const controlPoints = controlPointsQuery.data ?? [];
  const controlPointSignature =
    controlPoints.length >= 3
      ? controlPoints
          .map(
            (point) =>
              `${point.id}:${point.imageX.toFixed(3)}:${point.imageY.toFixed(3)}:${point.latitude.toFixed(6)}:${point.longitude.toFixed(6)}`,
          )
          .join("|")
      : null;
  const { debouncedValue: debouncedControlPointSignature } = useDebouncedValue(
    controlPointSignature ?? "",
    600,
  );
  const georeferenceQuery = useQuery({
    ...getGeoreferenceQueryOptions(
      mapId,
      debouncedControlPointSignature.length > 0 ? debouncedControlPointSignature : null,
    ),
  });
  const geoSegmentsQuery = useQuery({
    ...listGeoSegmentsQueryOptions(mapId),
  });
  const createControlPointMutation = useMutation(createControlPointMutationOptions());
  const deleteControlPointMutation = useMutation(deleteControlPointMutationOptions());
  const updateControlPointMutation = useMutation(updateControlPointMutationOptions());
  const createGeoSegmentMutation = useMutation(createGeoSegmentMutationOptions());
  const deleteGeoSegmentMutation = useMutation(deleteGeoSegmentMutationOptions());
  const savePdfMutation = useMutation(saveMapPdfMutationOptions());
  const saveWorkspaceMutation = useMutation(updateMapWorkspaceMutationOptions());

  const workspaceSnapshot = useMemo(
    () => ({
      locationQuery,
      baseMapStyle,
      pdfScale: transform.scale,
      pdfRotation: transform.rotation,
      pdfPanX: transform.panX,
      pdfPanY: transform.panY,
      pdfPageCount: pageCount,
      mapCenterLat: mapViewport.latitude,
      mapCenterLng: mapViewport.longitude,
      mapZoom: mapViewport.zoom,
    }),
    [locationQuery, baseMapStyle, transform, mapViewport, pageCount],
  );
  const { debouncedValue: debouncedWorkspace } = useDebouncedValue(workspaceSnapshot, 800);

  useEffect(() => {
    if (!mapQuery.data || isHydrated) {
      return;
    }

    const map = mapQuery.data;
    setLocationQuery(map.locationQuery);
    setBaseMapStyle(map.baseMapStyle);
    setTransform({
      scale: map.pdfScale,
      rotation: map.pdfRotation,
      panX: map.pdfPanX,
      panY: map.pdfPanY,
    });
    setPageCount(map.pdfPageCount);

    if (map.mapCenterLat !== null && map.mapCenterLng !== null && map.mapZoom !== null) {
      setMapViewport({
        latitude: map.mapCenterLat,
        longitude: map.mapCenterLng,
        zoom: map.mapZoom,
      });
    }

    setIsHydrated(true);
  }, [mapQuery.data, isHydrated]);

  useEffect(() => {
    if (!isHydrated || !mapQuery.data?.hasPdf) {
      return;
    }

    let cancelled = false;

    void loadMapPdfFile(mapId).then((file) => {
      if (!cancelled && file) {
        setPdfFile(file);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [isHydrated, mapId, mapQuery.data?.hasPdf]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    saveWorkspaceMutation.mutate({
      mapId,
      ...debouncedWorkspace,
    });
  }, [debouncedWorkspace, isHydrated, mapId]);

  function registerMapHandle(handle: MapHandle) {
    mapHandleRef.current = handle;
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.currentTarget.files?.[0] ?? null;
    setPdfError(null);
    setPageCount(null);

    if (!selectedFile) {
      setPdfFile(null);
      return;
    }

    if (selectedFile.type !== "application/pdf") {
      setPdfFile(null);
      setPdfError("Choose a PDF file to use as the overlay.");
      return;
    }

    setPdfFile(selectedFile);
    setTransform(DEFAULT_TRANSFORM);

    savePdfMutation.mutate({
      mapId,
      file: selectedFile,
    });
  }

  function updateTransform(patch: Partial<PdfViewTransform>) {
    setTransform((current) => ({ ...current, ...patch }));
  }

  function stopReferenceMode() {
    setReferenceMode(false);
    setPendingMapPoint(null);
    setPinCoordinateError(null);
  }

  function stopTraceMode() {
    setTraceMode(false);
    setPendingTracePoints([]);
  }

  function handleTracePointAdd(latitude: number, longitude: number) {
    setPendingTracePoints((current) => [...current, { latitude, longitude }]);
  }

  function handleUndoTracePoint() {
    setPendingTracePoints((current) => current.slice(0, -1));
  }

  function handleFinishTrace() {
    if (pendingTracePoints.length < 2) {
      return;
    }

    const groupId = segmentGroupId.trim() || `trail-${Date.now()}`;

    createGeoSegmentMutation.mutate(
      {
        mapId,
        segmentGroupId: groupId,
        name: segmentName.trim() || undefined,
        pathKind: segmentPathKind,
        geometry: {
          type: "LineString",
          coordinates: pendingTracePoints.map(
            (point) => [point.longitude, point.latitude] as [number, number],
          ),
        },
      },
      {
        onSuccess: () => {
          setPendingTracePoints([]);
        },
      },
    );
  }

  function handleDeleteGeoSegment(segmentId: number) {
    deleteGeoSegmentMutation.mutate({ mapId, segmentId });
  }

  function applyMapPinFromInput(rawInput: string) {
    const parsed = parseMapCoordinates(rawInput);
    if (!parsed.ok) {
      setPinCoordinateError(parsed.error);
      return;
    }

    setPinCoordinateError(null);
    setReferenceMode(true);
    setPendingMapPoint(parsed.value);
    setPinCoordinateInput(
      `${parsed.value.latitude.toFixed(6)}, ${parsed.value.longitude.toFixed(6)}`,
    );

    mapHandleRef.current?.setViewport({
      latitude: parsed.value.latitude,
      longitude: parsed.value.longitude,
      zoom: Math.max(mapViewport.zoom, 16),
    });
  }

  function handlePinCoordinateSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    applyMapPinFromInput(pinCoordinateInput);
  }

  function handleDeleteControlPoint(controlPointId: number) {
    deleteControlPointMutation.mutate(
      { mapId, controlPointId },
      {
        onSuccess: () => {
          if (selectedControlPointId === controlPointId) {
            setSelectedControlPointId(null);
          }
          if (editingControlPointId === controlPointId) {
            setEditingControlPointId(null);
            setEditDraft(null);
            setEditDraftError(null);
          }
        },
      },
    );
  }

  function startEditingControlPoint(point: ControlPointViewModel) {
    setEditingControlPointId(point.id);
    setEditDraft({
      imageX: point.imageX.toFixed(1),
      imageY: point.imageY.toFixed(1),
      mapCoordinatesInput: `${point.latitude.toFixed(6)}, ${point.longitude.toFixed(6)}`,
    });
    setEditDraftError(null);
    setSelectedControlPointId(point.id);
    mapHandleRef.current?.setViewport({
      latitude: point.latitude,
      longitude: point.longitude,
      zoom: Math.max(mapViewport.zoom, 16),
    });
  }

  function cancelEditingControlPoint() {
    setEditingControlPointId(null);
    setEditDraft(null);
    setEditDraftError(null);
  }

  function handleControlPointMapMove(controlPointId: number, latitude: number, longitude: number) {
    const point = controlPointsQuery.data?.find((item) => item.id === controlPointId);
    if (!point) {
      return;
    }

    updateControlPointMutation.mutate({
      mapId,
      controlPointId,
      imageX: point.imageX,
      imageY: point.imageY,
      latitude,
      longitude,
      silent: true,
    });
  }

  function handleControlPointPdfMove(controlPointId: number, imageX: number, imageY: number) {
    const point = controlPointsQuery.data?.find((item) => item.id === controlPointId);
    if (!point) {
      return;
    }

    updateControlPointMutation.mutate({
      mapId,
      controlPointId,
      imageX,
      imageY,
      latitude: point.latitude,
      longitude: point.longitude,
      silent: true,
    });
  }

  function handleSaveControlPointEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (editingControlPointId === null || !editDraft) {
      return;
    }

    const parsed = parseMapCoordinates(editDraft.mapCoordinatesInput);
    if (!parsed.ok) {
      setEditDraftError(parsed.error);
      return;
    }

    const imageX = Number(editDraft.imageX);
    const imageY = Number(editDraft.imageY);
    if (!Number.isFinite(imageX) || !Number.isFinite(imageY)) {
      setEditDraftError("PDF coordinates must be valid numbers.");
      return;
    }

    updateControlPointMutation.mutate(
      {
        mapId,
        controlPointId: editingControlPointId,
        imageX,
        imageY,
        latitude: parsed.value.latitude,
        longitude: parsed.value.longitude,
      },
      {
        onSuccess: (point) => {
          cancelEditingControlPoint();
          setSelectedControlPointId(point.id);
          mapHandleRef.current?.setViewport({
            latitude: point.latitude,
            longitude: point.longitude,
            zoom: Math.max(mapViewport.zoom, 16),
          });
        },
      },
    );
  }

  function handleMapLocationPick(latitude: number, longitude: number) {
    if (!referenceMode) {
      return;
    }

    setPendingMapPoint({ latitude, longitude });
    setPinCoordinateInput(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
    setPinCoordinateError(null);
  }

  function handlePdfLocationPick(imageX: number, imageY: number) {
    if (!referenceMode || !pendingMapPoint) {
      return;
    }

    createControlPointMutation.mutate(
      {
        mapId,
        imageX,
        imageY,
        longitude: pendingMapPoint.longitude,
        latitude: pendingMapPoint.latitude,
      },
      {
        onSuccess: () => {
          setPendingMapPoint(null);
        },
      },
    );
  }

  async function handleLocationSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const query = locationQuery.trim();
    if (!query) {
      return;
    }

    if (!mapHandleRef.current) {
      setLocationError("The base map is still loading.");
      return;
    }

    setIsSearchingLocation(true);
    setLocationError(null);

    const result = await mapHandleRef.current.panToQuery(query);
    if (result.error) {
      setLocationError(result.error);
    }

    setIsSearchingLocation(false);
  }

  const referenceHint = !referenceMode
    ? null
    : pendingMapPoint
      ? `Map pin set at ${pendingMapPoint.latitude.toFixed(5)}, ${pendingMapPoint.longitude.toFixed(5)}. Click the same spot on the PDF.`
      : "Click the base map or paste coordinates from Google Maps.";

  if (mapQuery.isLoading || !isHydrated) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <p className="text-sm text-base-content/70">Loading map...</p>
      </div>
    );
  }

  if (mapQuery.isError || !mapQuery.data) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <p className="text-sm text-error">Could not load this map.</p>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] w-full flex-col bg-base-100 text-base-content">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-base-content/10 px-4 py-3">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold tracking-normal">Create map</h1>
          <p className="truncate text-sm text-base-content/70" data-test="pdf-file-status">
            {pdfFile ? pdfFile.name : mapQuery.data.name}
            {pageCount ? ` Page 1 of ${pageCount}.` : ""}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Label
            htmlFor="source-pdf"
            className="btn btn-primary btn-sm cursor-pointer"
            data-test="pdf-upload-label"
          >
            <Upload className="size-4" />
            PDF
          </Label>
          <Input
            id="source-pdf"
            type="file"
            accept="application/pdf"
            className="sr-only"
            onChange={handleFileChange}
            data-test="pdf-upload-input"
          />
          <Button
            type="button"
            size="sm"
            variant={referenceMode ? "default" : "outline"}
            disabled={!pdfFile}
            onClick={() => {
              if (referenceMode) {
                stopReferenceMode();
                return;
              }
              stopTraceMode();
              setReferenceMode(true);
              setPendingMapPoint(null);
            }}
            data-test="reference-mode-toggle"
          >
            <Crosshair className="size-4" />
            Add reference
          </Button>
          <Button
            type="button"
            size="sm"
            variant={traceMode ? "default" : "outline"}
            onClick={() => {
              if (traceMode) {
                stopTraceMode();
                return;
              }
              stopReferenceMode();
              setTraceMode(true);
            }}
            data-test="trace-mode-toggle"
          >
            <Pencil className="size-4" />
            Trace trail
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setControlsOpen(true)}
            data-test="alignment-controls-open"
          >
            <Settings2 className="size-4" />
            Controls
          </Button>
        </div>
      </header>

      {referenceHint ? (
        <div
          className="flex shrink-0 flex-col gap-2 border-b border-primary/20 bg-primary/10 px-4 py-2 text-sm lg:flex-row lg:items-center lg:justify-between"
          data-test="reference-mode-hint"
        >
          <span>{referenceHint}</span>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            {!pendingMapPoint ? (
              <form
                className="flex min-w-0 flex-1 gap-2 sm:max-w-md"
                onSubmit={handlePinCoordinateSubmit}
              >
                <Input
                  value={pinCoordinateInput}
                  onChange={(event) => setPinCoordinateInput(event.currentTarget.value)}
                  placeholder="-1.24500, 36.81234 or Google Maps link"
                  aria-label="Paste map coordinates"
                  data-test="reference-pin-input"
                />
                <Button type="submit" size="sm" data-test="reference-pin-submit">
                  <MapPin className="size-4" />
                  Set pin
                </Button>
              </form>
            ) : null}
            <div className="flex items-center gap-2">
              {pendingMapPoint ? (
                <Button
                  type="button"
                  size="xs"
                  variant="outline"
                  onClick={() => setPendingMapPoint(null)}
                  data-test="reference-pending-cancel"
                >
                  Pick map point again
                </Button>
              ) : null}
              <Button
                type="button"
                size="xs"
                variant="ghost"
                onClick={stopReferenceMode}
                data-test="reference-mode-cancel"
              >
                <X className="size-3.5" />
                Cancel
              </Button>
            </div>
          </div>
          {pinCoordinateError ? (
            <p className="text-sm text-error lg:w-full" data-test="reference-pin-error">
              {pinCoordinateError}
            </p>
          ) : null}
        </div>
      ) : null}

      {traceMode ? (
        <div
          className="flex shrink-0 flex-col gap-3 border-b border-secondary/20 bg-secondary/10 px-4 py-3 text-sm lg:flex-row lg:items-end lg:justify-between"
          data-test="trace-mode-hint"
        >
          <div className="space-y-2">
            <p>
              Click the base map to add vertices. Finish when you have at least 2 points (
              {pendingTracePoints.length} added).
            </p>
            <div className="grid gap-2 sm:grid-cols-3">
              <div className="space-y-1">
                <Label htmlFor="trace-group-id">Trail group</Label>
                <Input
                  id="trace-group-id"
                  value={segmentGroupId}
                  onChange={(event) => setSegmentGroupId(event.currentTarget.value)}
                  placeholder="10k-blue"
                  data-test="trace-group-id"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="trace-name">Name</Label>
                <Input
                  id="trace-name"
                  value={segmentName}
                  onChange={(event) => setSegmentName(event.currentTarget.value)}
                  placeholder="10 km Blue Loop"
                  data-test="trace-name"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="trace-path-kind">Path kind</Label>
                <select
                  id="trace-path-kind"
                  className="select select-bordered select-sm w-full"
                  value={segmentPathKind}
                  onChange={(event) =>
                    setSegmentPathKind(event.currentTarget.value as GeoSegmentPathKind)
                  }
                  data-test="trace-path-kind"
                >
                  {SEGMENT_PATH_KINDS.map((kind) => (
                    <option key={kind} value={kind}>
                      {kind}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pendingTracePoints.length === 0}
              onClick={handleUndoTracePoint}
              data-test="trace-undo-point"
            >
              Undo point
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={pendingTracePoints.length < 2 || createGeoSegmentMutation.isPending}
              onClick={handleFinishTrace}
              data-test="trace-finish"
            >
              Finish segment
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={stopTraceMode}>
              <X className="size-3.5" />
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

      <div
        className="grid min-h-0 flex-1 grid-cols-1 divide-y divide-base-content/10 lg:grid-cols-2 lg:divide-x lg:divide-y-0"
        data-test="map-alignment-stage"
      >
        <section className="relative min-h-0 bg-base-200">
          <PanelLabel>Source PDF</PanelLabel>
          <PdfPreviewPane
            file={pdfFile}
            transform={transform}
            controlPoints={controlPointsQuery.data ?? []}
            selectedControlPointId={selectedControlPointId}
            referenceMode={referenceMode}
            canPickPdfPoint={referenceMode && pendingMapPoint !== null}
            onError={setPdfError}
            onPageCountChange={setPageCount}
            onPdfLocationPick={handlePdfLocationPick}
            onControlPointPdfMove={handleControlPointPdfMove}
            onTransformChange={updateTransform}
          />
          {!pdfFile ? (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
              <p className="max-w-xs text-center text-sm text-base-content/60">
                Upload a PDF to show its first page here for reference.
              </p>
            </div>
          ) : null}
        </section>

        <section className="relative min-h-0 bg-base-200">
          <PanelLabel>Base map</PanelLabel>
          <LeafletMapPane
            baseMapStyle={baseMapStyle}
            controlPoints={controlPointsQuery.data ?? []}
            geoSegments={geoSegmentsQuery.data ?? []}
            pendingMapPoint={pendingMapPoint}
            pendingTracePoints={pendingTracePoints}
            traceMode={traceMode}
            canPickMapPoint={referenceMode && pendingMapPoint === null}
            canPickTracePoint={traceMode}
            selectedControlPointId={selectedControlPointId}
            initialViewport={mapViewport}
            onReady={registerMapHandle}
            onMapLocationPick={handleMapLocationPick}
            onControlPointMapMove={handleControlPointMapMove}
            onTracePointAdd={handleTracePointAdd}
            onViewportChange={setMapViewport}
          />
        </section>
      </div>

      {pdfError ? (
        <p className="shrink-0 px-4 py-2 text-sm text-error" data-test="pdf-file-error">
          {pdfError}
        </p>
      ) : null}

      <Dialog open={controlsOpen} onOpenChange={setControlsOpen}>
        <DialogContent
          className="max-h-[85vh] overflow-y-auto sm:max-w-md"
          data-test="alignment-controls-dialog"
        >
          <DialogHeader>
            <DialogTitle>Alignment controls</DialogTitle>
            <DialogDescription>
              Search for the map area, pick a base style, and review saved reference points.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-5">
            <div className="space-y-2 rounded-md border border-base-content/10 bg-base-200 px-3 py-3">
              <div className="space-y-1">
                <h2 className="text-sm font-semibold">Georeference</h2>
                <p className="text-sm text-base-content/70">
                  Affine transform from saved reference points (PDF pixels to map coordinates).
                </p>
              </div>
              {georeferenceQuery.isLoading || georeferenceQuery.isFetching ? (
                <p className="text-sm text-base-content/60" data-test="georeference-status">
                  Computing transform…
                </p>
              ) : georeferenceQuery.data?.ready ? (
                <div className="space-y-1 text-sm" data-test="georeference-status">
                  <p className="font-medium text-success">Ready</p>
                  <p className="text-base-content/70">
                    RMS error {georeferenceQuery.data.residualErrorMeters.toFixed(1)} m · max{" "}
                    {georeferenceQuery.data.maxErrorMeters.toFixed(1)} m ·{" "}
                    {georeferenceQuery.data.controlPointCount} reference points
                  </p>
                </div>
              ) : (
                <p className="text-sm text-base-content/60" data-test="georeference-status">
                  {georeferenceQuery.data?.reason === "insufficient_control_points"
                    ? `Need at least 3 reference points (${georeferenceQuery.data.controlPointCount} saved).`
                    : georeferenceQuery.data?.reason === "singular_transform"
                      ? "Reference points do not form a valid affine transform."
                      : "Georeference not ready."}
                </p>
              )}
            </div>

            <div className="space-y-3 border-t border-base-content/10 pt-5">
              <div className="space-y-1">
                <h2 className="text-sm font-semibold">Trail segments</h2>
                <p className="text-sm text-base-content/70">
                  Saved LineStrings traced on the base map. Use Trace trail in the header to add
                  more.
                </p>
              </div>
              {geoSegmentsQuery.data && geoSegmentsQuery.data.length > 0 ? (
                <ul className="space-y-2" data-test="geo-segment-list">
                  {geoSegmentsQuery.data.map((segment) => (
                    <li
                      key={segment.id}
                      className="rounded-md border border-base-content/10 bg-base-200 px-3 py-2 text-sm"
                      data-test={`geo-segment-${segment.id}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span
                              className="inline-block size-2.5 shrink-0 rounded-full"
                              style={{ backgroundColor: segmentGroupColor(segment.segmentGroupId) }}
                            />
                            <span className="font-medium">
                              {segment.name ??
                                `${segment.segmentGroupId} #${segment.segmentIndex + 1}`}
                            </span>
                          </div>
                          <div className="mt-1 text-xs text-base-content/70">
                            {segment.pathKind} · {segment.geometry.coordinates.length} vertices ·{" "}
                            {segment.status}
                          </div>
                        </div>
                        <Button
                          type="button"
                          size="icon-sm"
                          variant="ghost"
                          disabled={deleteGeoSegmentMutation.isPending}
                          onClick={() => handleDeleteGeoSegment(segment.id)}
                          data-test={`geo-segment-delete-${segment.id}`}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-base-content/60" data-test="geo-segment-empty">
                  No trail segments saved yet.
                </p>
              )}
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <h2 className="text-sm font-semibold">Reference points</h2>
                <p className="text-sm text-base-content/70">
                  Saved links between PDF pixels and map coordinates in Postgres.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="controls-pin-input">Map pin from coordinates</Label>
                <p className="text-xs text-base-content/60">
                  Copy a point from Google Maps and paste it here to place the map pin without
                  clicking the map.
                </p>
                <form className="flex gap-2" onSubmit={handlePinCoordinateSubmit}>
                  <Input
                    id="controls-pin-input"
                    value={pinCoordinateInput}
                    onChange={(event) => setPinCoordinateInput(event.currentTarget.value)}
                    placeholder="-1.24500, 36.81234"
                    data-test="controls-pin-input"
                  />
                  <Button type="submit" size="sm" data-test="controls-pin-submit">
                    <MapPin className="size-4" />
                    Set pin
                  </Button>
                </form>
                {pinCoordinateError ? (
                  <p className="text-sm text-error" data-test="controls-pin-error">
                    {pinCoordinateError}
                  </p>
                ) : null}
              </div>

              {controlPointsQuery.data && controlPointsQuery.data.length > 0 ? (
                <ul className="space-y-2" data-test="control-point-list">
                  {controlPointsQuery.data.map((point, index) => (
                    <li
                      key={point.id}
                      className={cn(
                        "rounded-md border border-base-content/10 bg-base-200 px-3 py-2 text-sm",
                        selectedControlPointId === point.id && "ring-2 ring-primary",
                      )}
                      data-test={`control-point-${point.id}`}
                    >
                      {editingControlPointId === point.id && editDraft ? (
                        <form className="space-y-3" onSubmit={handleSaveControlPointEdit}>
                          <div className="font-medium">Edit point {index + 1}</div>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label htmlFor={`edit-pdf-x-${point.id}`}>PDF X</Label>
                              <Input
                                id={`edit-pdf-x-${point.id}`}
                                value={editDraft.imageX}
                                onChange={(event) => {
                                  const value = event.target.value;
                                  setEditDraft((current) =>
                                    current ? { ...current, imageX: value } : current,
                                  );
                                }}
                                data-test={`control-point-edit-pdf-x-${point.id}`}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor={`edit-pdf-y-${point.id}`}>PDF Y</Label>
                              <Input
                                id={`edit-pdf-y-${point.id}`}
                                value={editDraft.imageY}
                                onChange={(event) => {
                                  const value = event.target.value;
                                  setEditDraft((current) =>
                                    current ? { ...current, imageY: value } : current,
                                  );
                                }}
                                data-test={`control-point-edit-pdf-y-${point.id}`}
                              />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor={`edit-map-coords-${point.id}`}>Map coordinates</Label>
                            <Input
                              id={`edit-map-coords-${point.id}`}
                              value={editDraft.mapCoordinatesInput}
                              onChange={(event) => {
                                const value = event.target.value;
                                setEditDraft((current) =>
                                  current ? { ...current, mapCoordinatesInput: value } : current,
                                );
                              }}
                              placeholder="-1.24500, 36.81234"
                              data-test={`control-point-edit-map-${point.id}`}
                            />
                          </div>
                          {editDraftError ? (
                            <p
                              className="text-sm text-error"
                              data-test={`control-point-edit-error-${point.id}`}
                            >
                              {editDraftError}
                            </p>
                          ) : null}
                          <div className="flex gap-2">
                            <Button
                              type="submit"
                              size="sm"
                              disabled={updateControlPointMutation.isPending}
                              data-test={`control-point-save-${point.id}`}
                            >
                              Save
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={cancelEditingControlPoint}
                              data-test={`control-point-cancel-${point.id}`}
                            >
                              Cancel
                            </Button>
                          </div>
                        </form>
                      ) : (
                        <div className="flex items-start justify-between gap-2">
                          <button
                            type="button"
                            className="min-w-0 flex-1 text-left"
                            onClick={() => {
                              setSelectedControlPointId((current) =>
                                current === point.id ? null : point.id,
                              );
                              mapHandleRef.current?.setViewport({
                                latitude: point.latitude,
                                longitude: point.longitude,
                                zoom: Math.max(mapViewport.zoom, 16),
                              });
                            }}
                            data-test={`control-point-select-${point.id}`}
                          >
                            <div className="font-medium">Point {index + 1}</div>
                            <div className="font-mono text-xs text-base-content/70">
                              PDF ({point.imageX.toFixed(1)}, {point.imageY.toFixed(1)}) → map (
                              {point.latitude.toFixed(5)}, {point.longitude.toFixed(5)})
                            </div>
                          </button>
                          <div className="flex shrink-0 items-center gap-1">
                            <Button
                              type="button"
                              size="icon-sm"
                              variant="ghost"
                              onClick={() => startEditingControlPoint(point)}
                              data-test={`control-point-edit-${point.id}`}
                            >
                              <Pencil className="size-4" />
                            </Button>
                            <Button
                              type="button"
                              size="icon-sm"
                              variant="ghost"
                              disabled={deleteControlPointMutation.isPending}
                              onClick={() => handleDeleteControlPoint(point.id)}
                              data-test={`control-point-delete-${point.id}`}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-base-content/60" data-test="control-point-empty">
                  No reference points saved yet.
                </p>
              )}
            </div>

            <div className="space-y-3 border-t border-base-content/10 pt-5">
              <div className="space-y-1">
                <h2 className="text-sm font-semibold">Map area</h2>
                <p className="text-sm text-base-content/70">
                  Jump the base map to the place your PDF covers.
                </p>
              </div>
              <form className="flex gap-2" onSubmit={handleLocationSearch}>
                <Input
                  value={locationQuery}
                  onChange={(event) => setLocationQuery(event.currentTarget.value)}
                  placeholder="Karura Forest, Nairobi"
                  aria-label="Search map location"
                  data-test="map-location-search"
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSearchingLocation || locationQuery.trim().length === 0}
                  data-test="map-location-search-submit"
                >
                  <Search className="size-4" />
                  Go
                </Button>
              </form>
              {locationError ? (
                <p className="text-sm text-error" data-test="map-location-search-error">
                  {locationError}
                </p>
              ) : null}
            </div>

            <div className="space-y-2 border-t border-base-content/10 pt-5">
              <Label>Base map style</Label>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={baseMapStyle === "satellite" ? "default" : "outline"}
                  onClick={() => setBaseMapStyle("satellite")}
                  data-test="base-map-satellite"
                >
                  Satellite
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={baseMapStyle === "outline" ? "default" : "outline"}
                  onClick={() => setBaseMapStyle("outline")}
                  data-test="base-map-outline"
                >
                  Outline
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={baseMapStyle === "standard" ? "default" : "outline"}
                  onClick={() => setBaseMapStyle("standard")}
                  data-test="base-map-standard"
                >
                  Standard
                </Button>
              </div>
              <p className="text-xs text-base-content/60">
                Use Satellite for forest areas. Zoom to 15–16 and anchor on roads or gates, not
                trails.
              </p>
            </div>

            <div className="grid gap-4 border-t border-base-content/10 pt-5">
              <RangeControl
                label="PDF scale"
                value={transform.scale}
                min={MIN_PDF_SCALE}
                max={MAX_PDF_SCALE}
                step={0.01}
                displayValue={`${transform.scale.toFixed(2)}x`}
                onChange={(value) => updateTransform({ scale: value })}
                dataTest="pdf-scale"
              />
              <RangeControl
                label="PDF rotation"
                value={transform.rotation}
                min={-180}
                max={180}
                step={0.25}
                displayValue={`${transform.rotation.toFixed(2)}deg`}
                onChange={(value) => updateTransform({ rotation: value })}
                dataTest="pdf-rotation"
              />
            </div>

            <div className="border-t border-base-content/10 pt-5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setTransform(DEFAULT_TRANSFORM)}
                data-test="overlay-reset"
              >
                <RotateCcw className="size-4" />
                Reset PDF view
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PanelLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="pointer-events-none absolute left-3 top-3 z-10 rounded-md border border-base-content/10 bg-base-100/90 px-2 py-1 text-xs font-medium text-base-content/80 shadow-sm backdrop-blur">
      {children}
    </div>
  );
}

type RangeControlProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  displayValue: string;
  dataTest: string;
  onChange: (value: number) => void;
};

function RangeControl({
  label,
  value,
  min,
  max,
  step,
  displayValue,
  dataTest,
  onChange,
}: RangeControlProps) {
  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={dataTest}>{label}</Label>
        <span className="font-mono text-xs text-base-content/65">{displayValue}</span>
      </div>
      <input
        id={dataTest}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        className="range range-primary range-sm"
        onChange={(event) => onChange(Number(event.currentTarget.value))}
        data-test={dataTest}
      />
    </div>
  );
}

type LeafletMapPaneProps = {
  baseMapStyle: BaseMapStyle;
  controlPoints: ControlPointViewModel[];
  geoSegments: GeoSegmentViewModel[];
  pendingMapPoint: PendingMapPoint | null;
  pendingTracePoints: PendingTracePoint[];
  traceMode: boolean;
  canPickMapPoint: boolean;
  canPickTracePoint: boolean;
  selectedControlPointId: number | null;
  initialViewport: MapViewport;
  onReady: (handle: MapHandle) => void;
  onMapLocationPick: (latitude: number, longitude: number) => void;
  onControlPointMapMove: (controlPointId: number, latitude: number, longitude: number) => void;
  onTracePointAdd: (latitude: number, longitude: number) => void;
  onViewportChange: (viewport: MapViewport) => void;
};

function LeafletMapPane({
  baseMapStyle,
  controlPoints,
  geoSegments,
  pendingMapPoint,
  pendingTracePoints,
  traceMode,
  canPickMapPoint,
  canPickTracePoint,
  selectedControlPointId,
  initialViewport,
  onReady,
  onMapLocationPick,
  onControlPointMapMove,
  onTracePointAdd,
  onViewportChange,
}: LeafletMapPaneProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const leafletRef = useRef<typeof Leaflet | null>(null);
  const baseLayerRef = useRef<Leaflet.TileLayer | null>(null);
  const markersLayerRef = useRef<Leaflet.LayerGroup | null>(null);
  const segmentsLayerRef = useRef<Leaflet.LayerGroup | null>(null);
  const onReadyRef = useRef(onReady);
  const onMapLocationPickRef = useRef(onMapLocationPick);
  const onControlPointMapMoveRef = useRef(onControlPointMapMove);
  const onTracePointAddRef = useRef(onTracePointAdd);
  const onViewportChangeRef = useRef(onViewportChange);
  const initialViewportRef = useRef(initialViewport);
  const hasAppliedInitialStyleRef = useRef(false);
  const suppressViewportSyncRef = useRef(false);
  const [mapReady, setMapReady] = useState(false);
  const [cursorCoordinates, setCursorCoordinates] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const setCursorCoordinatesRef = useRef(setCursorCoordinates);
  const mapClickTimerRef = useRef<number | undefined>(undefined);

  setCursorCoordinatesRef.current = setCursorCoordinates;

  onReadyRef.current = onReady;
  onMapLocationPickRef.current = onMapLocationPick;
  onControlPointMapMoveRef.current = onControlPointMapMove;
  onTracePointAddRef.current = onTracePointAdd;
  onViewportChangeRef.current = onViewportChange;
  initialViewportRef.current = initialViewport;

  useEffect(() => {
    let cancelled = false;
    let resizeTimer: number | undefined;
    let resizeObserver: ResizeObserver | undefined;

    async function createMap() {
      const L = await import("leaflet");

      if (cancelled || !containerRef.current || mapRef.current) {
        return;
      }

      leafletRef.current = L;

      const startingViewport = initialViewportRef.current;
      const map = L.map(containerRef.current, {
        center: [startingViewport.latitude, startingViewport.longitude],
        zoom: startingViewport.zoom,
        zoomControl: true,
        doubleClickZoom: false,
      });

      baseLayerRef.current = createBaseLayer(L, baseMapStyle).addTo(map);
      markersLayerRef.current = L.layerGroup().addTo(map);
      segmentsLayerRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;
      hasAppliedInitialStyleRef.current = true;

      function emitViewportChange() {
        if (suppressViewportSyncRef.current) {
          return;
        }

        const center = map.getCenter();
        onViewportChangeRef.current({
          latitude: center.lat,
          longitude: center.lng,
          zoom: map.getZoom(),
        });
      }

      map.on("moveend", emitViewportChange);
      map.on("zoomend", emitViewportChange);

      function handleMouseMove(event: Leaflet.LeafletMouseEvent) {
        setCursorCoordinatesRef.current({
          latitude: event.latlng.lat,
          longitude: event.latlng.lng,
        });
      }

      function handleMouseOut() {
        setCursorCoordinatesRef.current(null);
      }

      map.on("mousemove", handleMouseMove);
      map.on("mouseout", handleMouseOut);

      function handleDoubleClick(event: Leaflet.LeafletMouseEvent) {
        if (mapClickTimerRef.current !== undefined) {
          window.clearTimeout(mapClickTimerRef.current);
        }

        void copyMapCoordinates(event.latlng.lat, event.latlng.lng);
      }

      map.on("dblclick", handleDoubleClick);

      onReadyRef.current(
        createMapHandle(map, {
          setSuppressViewportSync: (value) => {
            suppressViewportSyncRef.current = value;
          },
          emitViewportChange,
        }),
      );

      setMapReady(true);

      resizeTimer = window.setTimeout(() => map.invalidateSize(), 100);

      if (containerRef.current) {
        resizeObserver = new ResizeObserver(() => {
          map.invalidateSize();
        });
        resizeObserver.observe(containerRef.current);
      }
    }

    void createMap();

    return () => {
      cancelled = true;
      hasAppliedInitialStyleRef.current = false;
      setMapReady(false);
      resizeObserver?.disconnect();
      if (resizeTimer !== undefined) {
        window.clearTimeout(resizeTimer);
      }
      if (mapClickTimerRef.current !== undefined) {
        window.clearTimeout(mapClickTimerRef.current);
      }
      mapRef.current?.remove();
      mapRef.current = null;
      baseLayerRef.current = null;
      markersLayerRef.current = null;
      segmentsLayerRef.current = null;
      leafletRef.current = null;
      setCursorCoordinatesRef.current(null);
    };
  }, []);

  useEffect(() => {
    if (!hasAppliedInitialStyleRef.current) {
      return;
    }

    const map = mapRef.current;
    const L = leafletRef.current;
    const currentLayer = baseLayerRef.current;

    const markersLayer = markersLayerRef.current;
    const segmentsLayer = segmentsLayerRef.current;

    if (!map || !L || !currentLayer) {
      return;
    }

    if (markersLayer) {
      map.removeLayer(markersLayer);
    }
    if (segmentsLayer) {
      map.removeLayer(segmentsLayer);
    }

    map.removeLayer(currentLayer);
    baseLayerRef.current = createBaseLayer(L, baseMapStyle).addTo(map);

    if (segmentsLayer) {
      segmentsLayer.addTo(map);
    }
    if (markersLayer) {
      markersLayer.addTo(map);
    }
  }, [baseMapStyle]);

  useEffect(() => {
    if (!mapReady) {
      return;
    }

    const map = mapRef.current;
    const L = leafletRef.current;
    const markersLayer = markersLayerRef.current;

    if (!map || !L || !markersLayer) {
      return;
    }

    markersLayer.clearLayers();

    controlPoints.forEach((point, index) => {
      const isSelected = selectedControlPointId === point.id;
      const fillColor = isSelected ? "#2563eb" : "#16a34a";

      const marker = L.marker([point.latitude, point.longitude], {
        draggable: true,
        icon: L.divIcon({
          className: "",
          html: `<div style="margin-left:-12px;margin-top:-12px;width:24px;height:24px;border-radius:9999px;border:2px solid white;background:${fillColor};display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:white;cursor:grab;">${index + 1}</div>`,
          iconSize: [24, 24],
        }),
      })
        .bindTooltip(`Reference ${index + 1} · drag to move`, { permanent: false })
        .addTo(markersLayer);

      marker.on("dragend", () => {
        const { lat, lng } = marker.getLatLng();
        onControlPointMapMoveRef.current(point.id, lat, lng);
      });
    });

    if (pendingMapPoint) {
      L.circleMarker([pendingMapPoint.latitude, pendingMapPoint.longitude], {
        radius: 9,
        color: "#ffffff",
        weight: 2,
        fillColor: "#f59e0b",
        fillOpacity: 1,
      }).addTo(markersLayer);
    }
  }, [mapReady, controlPoints, pendingMapPoint, selectedControlPointId]);

  useEffect(() => {
    if (!mapReady) {
      return;
    }

    const map = mapRef.current;
    const L = leafletRef.current;
    const segmentsLayer = segmentsLayerRef.current;

    if (!map || !L || !segmentsLayer) {
      return;
    }

    segmentsLayer.clearLayers();

    geoSegments.forEach((segment) => {
      const latlngs = lineStringToLatLngs(segment.geometry.coordinates);
      L.polyline(latlngs, {
        color: segmentGroupColor(segment.segmentGroupId),
        weight: 4,
        opacity: 0.85,
      })
        .bindTooltip(segment.name ?? `${segment.segmentGroupId} #${segment.segmentIndex + 1}`)
        .addTo(segmentsLayer);
    });

    if (pendingTracePoints.length > 0) {
      const pendingLatLngs = pendingTracePoints.map((point) => ({
        lat: point.latitude,
        lng: point.longitude,
      }));

      if (pendingLatLngs.length >= 2) {
        L.polyline(pendingLatLngs, {
          color: "#f59e0b",
          weight: 4,
          dashArray: "8 8",
          opacity: 0.9,
        }).addTo(segmentsLayer);
      }

      pendingTracePoints.forEach((point, index) => {
        L.circleMarker([point.latitude, point.longitude], {
          radius: 6,
          color: "#ffffff",
          weight: 2,
          fillColor: "#f59e0b",
          fillOpacity: 1,
        })
          .bindTooltip(`Vertex ${index + 1}`)
          .addTo(segmentsLayer);
      });
    }
  }, [mapReady, geoSegments, pendingTracePoints]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    function handleClick(event: Leaflet.LeafletMouseEvent) {
      if (canPickTracePoint) {
        onTracePointAddRef.current(event.latlng.lat, event.latlng.lng);
        return;
      }

      if (!canPickMapPoint) {
        return;
      }

      if (mapClickTimerRef.current !== undefined) {
        window.clearTimeout(mapClickTimerRef.current);
      }

      mapClickTimerRef.current = window.setTimeout(() => {
        onMapLocationPickRef.current(event.latlng.lat, event.latlng.lng);
      }, 250);
    }

    map.on("click", handleClick);

    if (containerRef.current) {
      containerRef.current.style.cursor = canPickTracePoint || canPickMapPoint ? "crosshair" : "";
    }

    return () => {
      map.off("click", handleClick);
      if (mapClickTimerRef.current !== undefined) {
        window.clearTimeout(mapClickTimerRef.current);
      }
      if (containerRef.current) {
        containerRef.current.style.cursor = "";
      }
    };
  }, [canPickMapPoint, canPickTracePoint]);

  const cursorCoordinatesLabel = cursorCoordinates
    ? `${cursorCoordinates.latitude.toFixed(5)}, ${cursorCoordinates.longitude.toFixed(5)}`
    : null;

  return (
    <div className="absolute inset-0 z-0">
      <div ref={containerRef} className="absolute inset-0" data-test="leaflet-map" />
      <div className="pointer-events-none absolute bottom-8 left-3 z-[500] rounded-md border border-base-content/10 bg-base-100/90 px-2 py-1 text-xs text-base-content/70 shadow-sm backdrop-blur">
        {traceMode
          ? "Click to add trail vertices · Finish when done"
          : "Double-click to copy · drag refs to move"}
      </div>
      {cursorCoordinatesLabel ? (
        <button
          type="button"
          className="absolute bottom-8 right-3 z-[500] rounded-md border border-base-content/10 bg-base-100/95 px-2 py-1 font-mono text-xs text-base-content shadow-sm backdrop-blur hover:bg-base-100"
          title="Click to copy cursor coordinates"
          onClick={() => {
            if (!cursorCoordinates) {
              return;
            }

            void copyMapCoordinates(cursorCoordinates.latitude, cursorCoordinates.longitude);
          }}
          data-test="map-cursor-coordinates"
        >
          {cursorCoordinatesLabel}
        </button>
      ) : null}
    </div>
  );
}

type PdfPreviewPaneProps = {
  file: File | null;
  transform: PdfViewTransform;
  controlPoints: ControlPointViewModel[];
  selectedControlPointId: number | null;
  referenceMode: boolean;
  canPickPdfPoint: boolean;
  onError: (message: string | null) => void;
  onPageCountChange: (count: number | null) => void;
  onPdfLocationPick: (imageX: number, imageY: number) => void;
  onControlPointPdfMove: (controlPointId: number, imageX: number, imageY: number) => void;
  onTransformChange: (patch: Partial<PdfViewTransform>) => void;
};

function PdfPreviewPane({
  file,
  transform,
  controlPoints,
  selectedControlPointId,
  referenceMode,
  canPickPdfPoint,
  onError,
  onPageCountChange,
  onPdfLocationPick,
  onControlPointPdfMove,
  onTransformChange,
}: PdfPreviewPaneProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    panX: number;
    panY: number;
  } | null>(null);
  const transformRef = useRef(transform);
  const onTransformChangeRef = useRef(onTransformChange);
  const onControlPointPdfMoveRef = useRef(onControlPointPdfMove);
  const pdfMarkerDragRef = useRef<{ pointerId: number; controlPointId: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isDraggingMarker, setIsDraggingMarker] = useState(false);
  const [pdfDragPreview, setPdfDragPreview] = useState<{
    id: number;
    imageX: number;
    imageY: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  transformRef.current = transform;
  onTransformChangeRef.current = onTransformChange;
  onControlPointPdfMoveRef.current = onControlPointPdfMove;

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || !file) {
      return;
    }

    function handleWheel(event: WheelEvent) {
      const viewportEl = viewportRef.current;
      if (!viewportEl) {
        return;
      }

      event.preventDefault();

      const current = transformRef.current;
      const rect = viewportEl.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const pointerX = event.clientX - centerX;
      const pointerY = event.clientY - centerY;
      const nextScale = clampPdfScale(current.scale * (1 - event.deltaY * 0.0015));
      const scaleFactor = nextScale / current.scale;

      onTransformChangeRef.current({
        scale: nextScale,
        panX: pointerX - (pointerX - current.panX) * scaleFactor,
        panY: pointerY - (pointerY - current.panY) * scaleFactor,
      });
    }

    viewport.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      viewport.removeEventListener("wheel", handleWheel);
    };
  }, [file]);

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (canPickPdfPoint || !file || event.button !== 0 || isDraggingMarker) {
      return;
    }

    dragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      panX: transform.panX,
      panY: transform.panY,
    };
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    onTransformChange({
      panX: dragState.panX + (event.clientX - dragState.startX),
      panY: dragState.panY + (event.clientY - dragState.startY),
    });
  }

  function handlePointerUp(event: React.PointerEvent<HTMLDivElement>) {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    dragStateRef.current = null;
    setIsDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function handleMarkerPointerDown(
    event: React.PointerEvent<HTMLDivElement>,
    controlPointId: number,
  ) {
    if (canPickPdfPoint || event.button !== 0) {
      return;
    }

    event.stopPropagation();
    pdfMarkerDragRef.current = { pointerId: event.pointerId, controlPointId };
    setIsDraggingMarker(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleMarkerPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const drag = pdfMarkerDragRef.current;
    const canvas = canvasRef.current;
    if (!drag || drag.pointerId !== event.pointerId || !canvas) {
      return;
    }

    event.stopPropagation();
    const coords = getImageCoordinatesFromPointer(canvas, event.clientX, event.clientY);
    setPdfDragPreview({
      id: drag.controlPointId,
      imageX: coords.imageX,
      imageY: coords.imageY,
    });
  }

  function handleMarkerPointerUp(event: React.PointerEvent<HTMLDivElement>) {
    const drag = pdfMarkerDragRef.current;
    const canvas = canvasRef.current;
    if (!drag || drag.pointerId !== event.pointerId || !canvas) {
      return;
    }

    event.stopPropagation();
    const coords = getImageCoordinatesFromPointer(canvas, event.clientX, event.clientY);
    onControlPointPdfMoveRef.current(drag.controlPointId, coords.imageX, coords.imageY);
    pdfMarkerDragRef.current = null;
    setPdfDragPreview(null);
    setIsDraggingMarker(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  useEffect(() => {
    const canvasElement = canvasRef.current;
    if (!canvasElement) {
      return;
    }

    const targetCanvas: HTMLCanvasElement = canvasElement;

    if (!file) {
      const context = targetCanvas.getContext("2d");
      context?.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
      onError(null);
      onPageCountChange(null);
      return;
    }

    const selectedFile = file;
    let cancelled = false;
    let loadingTask: PDFDocumentLoadingTask | null = null;
    let renderTask: RenderTask | null = null;

    async function renderFirstPage() {
      setIsLoading(true);
      onError(null);

      try {
        const { GlobalWorkerOptions, getDocument } = await import("pdfjs-dist");
        GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

        const source = new Uint8Array(await selectedFile.arrayBuffer());
        loadingTask = getDocument({ data: source });
        const pdf = await loadingTask.promise;
        onPageCountChange(pdf.numPages);

        const page = await pdf.getPage(1);
        if (cancelled) {
          return;
        }

        const viewport = page.getViewport({ scale: 1.5 });
        targetCanvas.width = Math.floor(viewport.width);
        targetCanvas.height = Math.floor(viewport.height);
        targetCanvas.style.width = `${Math.floor(viewport.width)}px`;
        targetCanvas.style.height = `${Math.floor(viewport.height)}px`;

        const context = targetCanvas.getContext("2d");
        if (!context) {
          throw new Error("Could not create a canvas context for PDF rendering.");
        }

        renderTask = page.render({ canvas: targetCanvas, canvasContext: context, viewport });
        await renderTask.promise;
      } catch (err: unknown) {
        if (!cancelled) {
          onError(unwrapUnknownError(err).message);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void renderFirstPage();

    return () => {
      cancelled = true;
      renderTask?.cancel();
      void loadingTask?.destroy();
    };
  }, [file, onError, onPageCountChange]);

  return (
    <div
      ref={viewportRef}
      className={cn(
        "absolute inset-0 overflow-hidden touch-none select-none",
        canPickPdfPoint
          ? "cursor-crosshair"
          : isDragging
            ? "cursor-grabbing"
            : file
              ? "cursor-grab"
              : "",
      )}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      data-test="pdf-preview-pane"
    >
      <div className="absolute left-1/2 top-1/2">
        <div
          className="relative inline-block"
          style={{
            transform: `translate(calc(-50% + ${transform.panX}px), calc(-50% + ${transform.panY}px)) scale(${transform.scale}) rotate(${transform.rotation}deg)`,
            transformOrigin: "center center",
          }}
        >
          <canvas
            ref={canvasRef}
            className={cn(
              "max-w-none shadow-[0_0_0_1px_rgba(0,0,0,0.12),0_12px_40px_rgba(0,0,0,0.18)]",
              !file && "hidden",
            )}
            onClick={(event) => {
              if (!canPickPdfPoint || !canvasRef.current) {
                return;
              }

              event.stopPropagation();
              const coords = getImageCoordinatesFromClick(canvasRef.current, event);
              onPdfLocationPick(coords.imageX, coords.imageY);
            }}
            data-test="pdf-preview-canvas"
          />
          {controlPoints.map((point, index) => {
            const displayX = pdfDragPreview?.id === point.id ? pdfDragPreview.imageX : point.imageX;
            const displayY = pdfDragPreview?.id === point.id ? pdfDragPreview.imageY : point.imageY;

            return (
              <div
                key={point.id}
                className={cn(
                  "absolute flex size-4 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white text-[10px] font-bold text-white touch-none select-none",
                  selectedControlPointId === point.id ? "size-5 bg-blue-600" : "bg-primary",
                  canPickPdfPoint ? "pointer-events-none" : "cursor-grab active:cursor-grabbing",
                )}
                style={{ left: displayX, top: displayY }}
                onPointerDown={(event) => handleMarkerPointerDown(event, point.id)}
                onPointerMove={handleMarkerPointerMove}
                onPointerUp={handleMarkerPointerUp}
                onPointerCancel={handleMarkerPointerUp}
                data-test={`pdf-control-point-${point.id}`}
              >
                {index + 1}
              </div>
            );
          })}
        </div>
      </div>
      {file ? (
        <div className="pointer-events-none absolute bottom-4 left-4 rounded-md border border-base-content/10 bg-base-100/90 px-2 py-1 text-xs text-base-content/70 shadow-sm backdrop-blur">
          Scroll to zoom · drag to pan · drag refs to move
        </div>
      ) : null}
      {referenceMode && !canPickPdfPoint ? (
        <div className="pointer-events-none absolute inset-x-4 bottom-12 rounded-md border border-base-content/10 bg-base-100/90 px-3 py-2 text-sm text-base-content/75 shadow-sm backdrop-blur">
          Choose the matching spot on the base map first.
        </div>
      ) : null}
      {isLoading ? (
        <div className="absolute inset-0 flex items-center justify-center bg-base-200/80">
          <p className="border border-base-content/10 bg-base-100 px-3 py-2 text-sm shadow-sm">
            Rendering PDF...
          </p>
        </div>
      ) : null}
    </div>
  );
}
