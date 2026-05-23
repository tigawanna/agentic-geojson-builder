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
import { cn } from "@/lib/utils";
import { unwrapUnknownError } from "@/utils/errors";
import { RotateCcw, Search, Settings2, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { PDFDocumentLoadingTask, RenderTask } from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.mjs?url";
import "leaflet/dist/leaflet.css";
import type * as Leaflet from "leaflet";

type PdfViewTransform = {
  scale: number;
  rotation: number;
};

const DEFAULT_TRANSFORM: PdfViewTransform = {
  scale: 1,
  rotation: 0,
};

type BaseMapStyle = "outline" | "standard";

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
};

type GeocodeResult = {
  lat: number;
  lng: number;
  bounds?: [[number, number], [number, number]];
};

type MapHandle = {
  panToQuery: (query: string) => Promise<{ error?: string }>;
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

export function MapAlignmentWorkspace() {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [transform, setTransform] = useState<PdfViewTransform>(DEFAULT_TRANSFORM);
  const [baseMapStyle, setBaseMapStyle] = useState<BaseMapStyle>("outline");
  const [locationQuery, setLocationQuery] = useState("");
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [controlsOpen, setControlsOpen] = useState(false);
  const mapHandleRef = useRef<MapHandle | null>(null);

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
  }

  function updateTransform(key: keyof PdfViewTransform, value: number) {
    setTransform((current) => ({ ...current, [key]: value }));
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

  return (
    <div className="flex h-[calc(100vh-4rem)] w-full flex-col bg-base-100 text-base-content">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-base-content/10 px-4 py-3">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold tracking-normal">Create map</h1>
          <p className="truncate text-sm text-base-content/70" data-test="pdf-file-status">
            {pdfFile ? pdfFile.name : "Compare your PDF against the base map side by side."}
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

      <div
        className="grid min-h-0 flex-1 grid-cols-1 divide-y divide-base-content/10 lg:grid-cols-2 lg:divide-x lg:divide-y-0"
        data-test="map-alignment-stage"
      >
        <section className="relative min-h-0 bg-base-200">
          <PanelLabel>Source PDF</PanelLabel>
          <PdfPreviewPane
            file={pdfFile}
            transform={transform}
            onError={setPdfError}
            onPageCountChange={setPageCount}
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
          <LeafletMapPane baseMapStyle={baseMapStyle} onReady={registerMapHandle} />
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
              Search for the map area, pick a base style, and adjust how the PDF is displayed.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-5">
            <div className="space-y-3">
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
            </div>

            <div className="grid gap-4 border-t border-base-content/10 pt-5">
              <RangeControl
                label="PDF scale"
                value={transform.scale}
                min={0.25}
                max={3}
                step={0.01}
                displayValue={`${transform.scale.toFixed(2)}x`}
                onChange={(value) => updateTransform("scale", value)}
                dataTest="pdf-scale"
              />
              <RangeControl
                label="PDF rotation"
                value={transform.rotation}
                min={-180}
                max={180}
                step={0.25}
                displayValue={`${transform.rotation.toFixed(2)}deg`}
                onChange={(value) => updateTransform("rotation", value)}
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
  onReady: (handle: MapHandle) => void;
};

function createBaseLayer(L: typeof Leaflet, style: BaseMapStyle) {
  const config = BASE_MAP_CONFIG[style];
  return L.tileLayer(config.url, {
    maxZoom: config.maxZoom,
    attribution: config.attribution,
  });
}

function LeafletMapPane({ baseMapStyle, onReady }: LeafletMapPaneProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const leafletRef = useRef<typeof Leaflet | null>(null);
  const baseLayerRef = useRef<Leaflet.TileLayer | null>(null);
  const onReadyRef = useRef(onReady);
  const hasAppliedInitialStyleRef = useRef(false);

  onReadyRef.current = onReady;

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

      const map = L.map(containerRef.current, {
        center: [-1.286389, 36.817223],
        zoom: 13,
        zoomControl: true,
      });

      baseLayerRef.current = createBaseLayer(L, baseMapStyle).addTo(map);
      mapRef.current = map;
      hasAppliedInitialStyleRef.current = true;

      onReadyRef.current({
        panToQuery: async (query) => {
          try {
            const result = await geocodePlace(query);

            if (result.bounds) {
              map.fitBounds(result.bounds, { padding: [48, 48] });
            } else {
              map.flyTo([result.lat, result.lng], 14);
            }

            return {};
          } catch (err: unknown) {
            return { error: unwrapUnknownError(err).message };
          }
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
      mapRef.current?.remove();
      mapRef.current = null;
      baseLayerRef.current = null;
      leafletRef.current = null;
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

  return <div ref={containerRef} className="absolute inset-0 z-0" data-test="leaflet-map" />;
}

type PdfPreviewPaneProps = {
  file: File | null;
  transform: PdfViewTransform;
  onError: (message: string | null) => void;
  onPageCountChange: (count: number | null) => void;
};

function PdfPreviewPane({ file, transform, onError, onPageCountChange }: PdfPreviewPaneProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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
    <div className="absolute inset-0 overflow-auto p-4" data-test="pdf-preview-pane">
      <div className="flex min-h-full min-w-full items-center justify-center">
        <canvas
          ref={canvasRef}
          className={cn(
            "max-w-none shadow-[0_0_0_1px_rgba(0,0,0,0.12),0_12px_40px_rgba(0,0,0,0.18)]",
            !file && "hidden",
          )}
          style={{
            transform: `scale(${transform.scale}) rotate(${transform.rotation}deg)`,
            transformOrigin: "center center",
          }}
          data-test="pdf-preview-canvas"
        />
      </div>
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
