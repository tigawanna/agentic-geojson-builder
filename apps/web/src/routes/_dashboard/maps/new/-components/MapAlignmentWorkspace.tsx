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
} from "@/data-access-layer/pglite/control-points-query-options";
import {
  getMapWorkspaceQueryOptions,
  loadMapPdfFile,
  saveMapPdfMutationOptions,
  updateMapWorkspaceMutationOptions,
  type MapBaseMapStyle,
  type MapViewport,
} from "@/data-access-layer/pglite/maps-query-options";
import { useDebouncedValue } from "@/hooks/use-debouncer";
import { usePglite } from "@/lib/pglite/components/PgliteProvider";
import { cn } from "@/lib/utils";
import { unwrapUnknownError } from "@/utils/errors";
import { parseMapCoordinates } from "@/utils/parse-map-coordinates";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
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

type BaseMapStyle = MapBaseMapStyle;

const DEFAULT_MAP_VIEWPORT: MapViewport = {
  latitude: -1.286389,
  longitude: 36.817223,
  zoom: 13,
};

type BaseMapConfig = {
  url: string;
  attribution: string;
  maxZoom: number;
};

const BASE_MAP_CONFIG: Record<BaseMapStyle, BaseMapConfig> = {
  outline: {
    url: "https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxZoom: 20,
  },
  standard: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  },
  satellite: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution:
      "Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community",
    maxZoom: 19,
  },
};

type GeocodeResult = {
  lat: number;
  lng: number;
  bounds?: [[number, number], [number, number]];
};

type MapHandle = {
  panToQuery: (query: string) => Promise<{ error?: string }>;
  setViewport: (viewport: MapViewport) => void;
};

type MapAlignmentWorkspaceProps = {
  mapId: number;
};

async function geocodePlace(query: string): Promise<GeocodeResult> {
  const params = new URLSearchParams({
    format: "json",
    q: query,
    limit: "1",
  });

  const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("Location search failed. Try again.");
  }

  const results = (await response.json()) as Array<{
    lat: string;
    lon: string;
    boundingbox?: [string, string, string, string];
  }>;

  if (results.length === 0) {
    throw new Error("No matching location found.");
  }

  const [first] = results;
  const lat = Number(first.lat);
  const lng = Number(first.lon);
  let bounds: [[number, number], [number, number]] | undefined;

  if (first.boundingbox) {
    const [south, north, west, east] = first.boundingbox;
    bounds = [
      [Number(south), Number(west)],
      [Number(north), Number(east)],
    ];
  }

  return { lat, lng, bounds };
}

function clampPdfScale(scale: number) {
  return Math.min(MAX_PDF_SCALE, Math.max(MIN_PDF_SCALE, scale));
}

function formatMapCoordinates(latitude: number, longitude: number) {
  return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
}

async function copyMapCoordinates(latitude: number, longitude: number) {
  const text = formatMapCoordinates(latitude, longitude);
  await navigator.clipboard.writeText(text);
  toast.success("Coordinates copied", { description: text });
}

function getImageCoordinatesFromClick(
  canvas: HTMLCanvasElement,
  event: React.MouseEvent<HTMLCanvasElement>,
) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  return {
    imageX: (event.clientX - rect.left) * scaleX,
    imageY: (event.clientY - rect.top) * scaleY,
  };
}

export function MapAlignmentWorkspace({ mapId }: MapAlignmentWorkspaceProps) {
  const { db } = usePglite();
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
    ...getMapWorkspaceQueryOptions(db, mapId),
  });
  const controlPointsQuery = useQuery({
    ...listControlPointsQueryOptions(db, mapId),
  });
  const createControlPointMutation = useMutation(createControlPointMutationOptions(db));
  const deleteControlPointMutation = useMutation(deleteControlPointMutationOptions(db));
  const updateControlPointMutation = useMutation(updateControlPointMutationOptions(db));
  const savePdfMutation = useMutation(saveMapPdfMutationOptions(db));
  const saveWorkspaceMutation = useMutation(updateMapWorkspaceMutationOptions(db));

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

    void loadMapPdfFile(db, mapId).then((file) => {
      if (!cancelled && file) {
        setPdfFile(file);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [db, isHydrated, mapId, mapQuery.data?.hasPdf]);

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
            pendingMapPoint={pendingMapPoint}
            referenceMode={referenceMode}
            canPickMapPoint={referenceMode && pendingMapPoint === null}
            selectedControlPointId={selectedControlPointId}
            initialViewport={mapViewport}
            onReady={registerMapHandle}
            onMapLocationPick={handleMapLocationPick}
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
            <div className="space-y-3">
              <div className="space-y-1">
                <h2 className="text-sm font-semibold">Reference points</h2>
                <p className="text-sm text-base-content/70">
                  Saved links between PDF pixels and map coordinates in PGLite.
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
  pendingMapPoint: PendingMapPoint | null;
  referenceMode: boolean;
  canPickMapPoint: boolean;
  selectedControlPointId: number | null;
  initialViewport: MapViewport;
  onReady: (handle: MapHandle) => void;
  onMapLocationPick: (latitude: number, longitude: number) => void;
  onViewportChange: (viewport: MapViewport) => void;
};

function createBaseLayer(L: typeof Leaflet, style: BaseMapStyle) {
  const config = BASE_MAP_CONFIG[style];
  return L.tileLayer(config.url, {
    maxZoom: config.maxZoom,
    attribution: config.attribution,
  });
}

function LeafletMapPane({
  baseMapStyle,
  controlPoints,
  pendingMapPoint,
  referenceMode,
  canPickMapPoint,
  selectedControlPointId,
  initialViewport,
  onReady,
  onMapLocationPick,
  onViewportChange,
}: LeafletMapPaneProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const leafletRef = useRef<typeof Leaflet | null>(null);
  const baseLayerRef = useRef<Leaflet.TileLayer | null>(null);
  const markersLayerRef = useRef<Leaflet.LayerGroup | null>(null);
  const onReadyRef = useRef(onReady);
  const onMapLocationPickRef = useRef(onMapLocationPick);
  const onViewportChangeRef = useRef(onViewportChange);
  const initialViewportRef = useRef(initialViewport);
  const hasAppliedInitialStyleRef = useRef(false);
  const suppressViewportSyncRef = useRef(false);
  const [cursorCoordinates, setCursorCoordinates] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const setCursorCoordinatesRef = useRef(setCursorCoordinates);
  const mapClickTimerRef = useRef<number | undefined>(undefined);

  setCursorCoordinatesRef.current = setCursorCoordinates;

  onReadyRef.current = onReady;
  onMapLocationPickRef.current = onMapLocationPick;
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

      onReadyRef.current({
        panToQuery: async (query) => {
          try {
            const result = await geocodePlace(query);

            suppressViewportSyncRef.current = true;
            if (result.bounds) {
              map.fitBounds(result.bounds, { padding: [48, 48] });
            } else {
              map.flyTo([result.lat, result.lng], 14);
            }
            window.setTimeout(() => {
              suppressViewportSyncRef.current = false;
              emitViewportChange();
            }, 300);

            return {};
          } catch (err: unknown) {
            return { error: unwrapUnknownError(err).message };
          }
        },
        setViewport: (viewport) => {
          suppressViewportSyncRef.current = true;
          map.setView([viewport.latitude, viewport.longitude], viewport.zoom, { animate: false });
          suppressViewportSyncRef.current = false;
        },
      });

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

    if (!map || !L || !currentLayer) {
      return;
    }

    map.removeLayer(currentLayer);
    baseLayerRef.current = createBaseLayer(L, baseMapStyle).addTo(map);
  }, [baseMapStyle]);

  useEffect(() => {
    const map = mapRef.current;
    const L = leafletRef.current;
    const markersLayer = markersLayerRef.current;

    if (!map || !L || !markersLayer) {
      return;
    }

    markersLayer.clearLayers();

    controlPoints.forEach((point, index) => {
      const isSelected = selectedControlPointId === point.id;

      L.circleMarker([point.latitude, point.longitude], {
        radius: isSelected ? 11 : 8,
        color: "#ffffff",
        weight: 2,
        fillColor: isSelected ? "#2563eb" : "#16a34a",
        fillOpacity: 1,
      })
        .bindTooltip(`Reference ${index + 1}`, { permanent: false })
        .addTo(markersLayer);

      L.marker([point.latitude, point.longitude], {
        icon: L.divIcon({
          className: "",
          html: `<div style="margin-left:-8px;margin-top:-8px;width:16px;height:16px;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:white;">${index + 1}</div>`,
          iconSize: [16, 16],
        }),
        interactive: false,
      }).addTo(markersLayer);
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
  }, [controlPoints, pendingMapPoint, selectedControlPointId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    function handleClick(event: Leaflet.LeafletMouseEvent) {
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
      containerRef.current.style.cursor = canPickMapPoint
        ? "crosshair"
        : referenceMode
          ? "default"
          : "";
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
  }, [canPickMapPoint, referenceMode]);

  const cursorCoordinatesLabel = cursorCoordinates
    ? `${cursorCoordinates.latitude.toFixed(5)}, ${cursorCoordinates.longitude.toFixed(5)}`
    : null;

  return (
    <div className="absolute inset-0 z-0">
      <div ref={containerRef} className="absolute inset-0" data-test="leaflet-map" />
      <div className="pointer-events-none absolute bottom-8 left-3 z-[500] rounded-md border border-base-content/10 bg-base-100/90 px-2 py-1 text-xs text-base-content/70 shadow-sm backdrop-blur">
        Double-click to copy coordinates
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
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  transformRef.current = transform;
  onTransformChangeRef.current = onTransformChange;

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
    if (canPickPdfPoint || !file || event.button !== 0) {
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
          {controlPoints.map((point, index) => (
            <div
              key={point.id}
              className={cn(
                "pointer-events-none absolute flex size-4 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white text-[10px] font-bold text-white",
                selectedControlPointId === point.id ? "size-5 bg-blue-600" : "bg-primary",
              )}
              style={{ left: point.imageX, top: point.imageY }}
              data-test={`pdf-control-point-${point.id}`}
            >
              {index + 1}
            </div>
          ))}
        </div>
      </div>
      {file ? (
        <div className="pointer-events-none absolute bottom-4 left-4 rounded-md border border-base-content/10 bg-base-100/90 px-2 py-1 text-xs text-base-content/70 shadow-sm backdrop-blur">
          Scroll to zoom · drag to pan
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
