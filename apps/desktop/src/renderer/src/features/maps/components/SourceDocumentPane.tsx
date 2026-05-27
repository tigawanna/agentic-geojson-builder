import { useEffect, useRef, useState } from "react";
import * as pdfjs from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.mjs?url";
import type { ControlPointRecord } from "@shared/control-points.types";
import type { MapSourceFilePayload } from "@shared/maps.types";
import { fileBase64ToDataUrl } from "../hooks/map-workspace-api";
import { clampPdfScale, PDF_RENDER_SCALE, type PdfViewTransform } from "../lib/pdf-view-transform";
import { getImageCoordinatesFromPointer } from "../lib/pdf-image-coordinates";
import { isPickModifierEvent, usePickModifierHeld } from "../lib/pick-modifier";

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

type SourceDocumentPaneProps = {
  sourceFile: MapSourceFilePayload;
  transform: PdfViewTransform;
  controlPoints?: ControlPointRecord[];
  selectedControlPointId?: number | null;
  referenceMode?: boolean;
  canPickPdfPoint?: boolean;
  onTransformChange: (patch: Partial<PdfViewTransform>) => void;
  onPdfLocationPick?: (imageX: number, imageY: number) => void;
  onControlPointPdfMove?: (controlPointId: number, imageX: number, imageY: number) => void;
  onCaptureReady?: (elements: {
    getPdfCanvas: () => HTMLCanvasElement | null;
    getSourceViewport: () => HTMLDivElement | null;
  }) => void;
};

export function SourceDocumentPane({
  sourceFile,
  transform,
  controlPoints = [],
  selectedControlPointId = null,
  referenceMode = false,
  canPickPdfPoint = false,
  onTransformChange,
  onPdfLocationPick,
  onControlPointPdfMove,
  onCaptureReady,
}: SourceDocumentPaneProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    panX: number;
    panY: number;
  } | null>(null);
  const markerDragRef = useRef<{ pointerId: number; controlPointId: number } | null>(null);
  const transformRef = useRef(transform);
  const onTransformChangeRef = useRef(onTransformChange);
  const onControlPointPdfMoveRef = useRef(onControlPointPdfMove);
  const [localTransform, setLocalTransform] = useState(transform);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isDraggingMarker, setIsDraggingMarker] = useState(false);
  const [pdfDragPreview, setPdfDragPreview] = useState<{
    id: number;
    imageX: number;
    imageY: number;
  } | null>(null);
  const pickModifierHeld = usePickModifierHeld();

  transformRef.current = localTransform;
  onTransformChangeRef.current = onTransformChange;
  onControlPointPdfMoveRef.current = onControlPointPdfMove;

  useEffect(() => {
    onCaptureReady?.({
      getPdfCanvas: () => canvasRef.current,
      getSourceViewport: () => viewportRef.current,
    });
  }, [onCaptureReady, sourceFile.fileName]);

  useEffect(() => {
    if (!isDragging) {
      setLocalTransform(transform);
    }
  }, [isDragging, transform]);

  const isPdf =
    sourceFile.mimeType === "application/pdf" || sourceFile.fileName.toLowerCase().endsWith(".pdf");

  useEffect(() => {
    if (!isPdf) {
      setImageUrl(fileBase64ToDataUrl(sourceFile.mimeType, sourceFile.fileBase64));
      return;
    }

    let cancelled = false;

    async function renderPdf() {
      const data = Uint8Array.from(atob(sourceFile.fileBase64), (char) => char.charCodeAt(0));
      const pdf = await pdfjs.getDocument({ data }).promise;
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: PDF_RENDER_SCALE });
      const canvas = canvasRef.current;
      if (!canvas || cancelled) {
        return;
      }

      const context = canvas.getContext("2d");
      if (!context) {
        return;
      }

      canvas.width = viewport.width;
      canvas.height = viewport.height;
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;
      await page.render({ canvas, canvasContext: context, viewport }).promise;
    }

    void renderPdf().catch(() => {
      if (!cancelled) {
        setImageUrl(null);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [isPdf, sourceFile.fileBase64, sourceFile.mimeType]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }

    function handleWheel(event: WheelEvent) {
      event.preventDefault();

      const viewportEl = viewportRef.current;
      if (!viewportEl) {
        return;
      }

      const current = transformRef.current;
      const rect = viewportEl.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const pointerX = event.clientX - centerX;
      const pointerY = event.clientY - centerY;
      const nextScale = clampPdfScale(current.scale * (1 - event.deltaY * 0.0015));
      const scaleFactor = nextScale / current.scale;
      const nextTransform = {
        scale: nextScale,
        panX: pointerX - (pointerX - current.panX) * scaleFactor,
        panY: pointerY - (pointerY - current.panY) * scaleFactor,
      };

      setLocalTransform((previous) => ({ ...previous, ...nextTransform }));
      onTransformChangeRef.current(nextTransform);
    }

    viewport.addEventListener("wheel", handleWheel, { passive: false });
    return () => viewport.removeEventListener("wheel", handleWheel);
  }, [sourceFile.fileName]);

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || isDraggingMarker) {
      return;
    }

    if (canPickPdfPoint && isPickModifierEvent(event)) {
      return;
    }

    event.preventDefault();

    dragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      panX: localTransform.panX,
      panY: localTransform.panY,
    };
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    event.preventDefault();

    const nextPan = {
      panX: dragState.panX + (event.clientX - dragState.startX),
      panY: dragState.panY + (event.clientY - dragState.startY),
    };

    setLocalTransform((previous) => ({ ...previous, ...nextPan }));
  }

  function handlePointerUp(event: React.PointerEvent<HTMLDivElement>) {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    const nextPan = {
      panX: dragState.panX + (event.clientX - dragState.startX),
      panY: dragState.panY + (event.clientY - dragState.startY),
    };

    dragStateRef.current = null;
    setIsDragging(false);
    onTransformChangeRef.current(nextPan);

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function getSourceElement(): HTMLCanvasElement | HTMLImageElement | null {
    return canvasRef.current ?? imageRef.current;
  }

  function handleCanvasClick(event: React.MouseEvent<HTMLCanvasElement>) {
    if (!canPickPdfPoint || !canvasRef.current || !isPickModifierEvent(event)) {
      return;
    }

    event.stopPropagation();
    const coords = getImageCoordinatesFromPointer(canvasRef.current, event.clientX, event.clientY);
    onPdfLocationPick?.(coords.imageX, coords.imageY);
  }

  function handleMarkerPointerDown(
    event: React.PointerEvent<HTMLDivElement>,
    controlPointId: number,
  ) {
    if (event.button !== 0) {
      return;
    }

    if (canPickPdfPoint && isPickModifierEvent(event)) {
      return;
    }

    event.stopPropagation();
    markerDragRef.current = { pointerId: event.pointerId, controlPointId };
    setIsDraggingMarker(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleMarkerPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const drag = markerDragRef.current;
    const sourceElement = getSourceElement();
    if (!drag || drag.pointerId !== event.pointerId || !sourceElement) {
      return;
    }

    event.stopPropagation();
    const coords = getImageCoordinatesFromPointer(sourceElement, event.clientX, event.clientY);
    setPdfDragPreview({ id: drag.controlPointId, imageX: coords.imageX, imageY: coords.imageY });
  }

  function handleMarkerPointerUp(event: React.PointerEvent<HTMLDivElement>) {
    const drag = markerDragRef.current;
    const sourceElement = getSourceElement();
    if (!drag || drag.pointerId !== event.pointerId || !sourceElement) {
      return;
    }

    event.stopPropagation();
    const coords = getImageCoordinatesFromPointer(sourceElement, event.clientX, event.clientY);
    onControlPointPdfMoveRef.current?.(drag.controlPointId, coords.imageX, coords.imageY);
    markerDragRef.current = null;
    setIsDraggingMarker(false);
    setPdfDragPreview(null);

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  const content = isPdf ? (
    <canvas
      ref={canvasRef}
      className={`max-w-none shadow-[0_0_0_1px_rgba(0,0,0,0.12),0_12px_40px_rgba(0,0,0,0.18)] ${
        canPickPdfPoint ? "pointer-events-auto cursor-crosshair" : "pointer-events-none"
      }`}
      onClick={handleCanvasClick}
    />
  ) : (
    imageUrl && (
      <img
        ref={imageRef}
        src={imageUrl}
        alt={sourceFile.fileName}
        draggable={false}
        className={`max-w-none object-contain shadow-[0_0_0_1px_rgba(0,0,0,0.12),0_12px_40px_rgba(0,0,0,0.18)] ${
          canPickPdfPoint ? "pointer-events-auto cursor-crosshair" : "pointer-events-none"
        }`}
        onClick={(event) => {
          if (!canPickPdfPoint || !imageRef.current || !isPickModifierEvent(event)) {
            return;
          }

          event.stopPropagation();
          const coords = getImageCoordinatesFromPointer(
            imageRef.current,
            event.clientX,
            event.clientY,
          );
          onPdfLocationPick?.(coords.imageX, coords.imageY);
        }}
      />
    )
  );

  return (
    <div
      ref={viewportRef}
      className={`absolute inset-0 touch-none overflow-hidden bg-base-300/40 select-none ${
        canPickPdfPoint && pickModifierHeld
          ? "cursor-crosshair"
          : isDragging
            ? "cursor-grabbing"
            : "cursor-grab"
      }`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <div className="pointer-events-none absolute top-1/2 left-1/2">
        <div
          className="relative inline-block"
          style={{
            transform: `translate(calc(-50% + ${localTransform.panX}px), calc(-50% + ${localTransform.panY}px)) scale(${localTransform.scale}) rotate(${localTransform.rotation}deg)`,
            transformOrigin: "center center",
          }}
        >
          {content}
          {controlPoints.map((point, index) => {
            const displayX = pdfDragPreview?.id === point.id ? pdfDragPreview.imageX : point.imageX;
            const displayY = pdfDragPreview?.id === point.id ? pdfDragPreview.imageY : point.imageY;

            return (
              <div
                key={point.id}
                className={`pointer-events-auto absolute flex -translate-x-1/2 -translate-y-1/2 touch-none items-center justify-center rounded-full border-2 border-white text-[10px] font-bold text-white select-none ${
                  selectedControlPointId === point.id
                    ? "z-10 size-5 cursor-grab bg-blue-600 active:cursor-grabbing"
                    : "size-4 cursor-grab bg-primary active:cursor-grabbing"
                }`}
                style={{ left: displayX, top: displayY }}
                onPointerDown={(event) => handleMarkerPointerDown(event, point.id)}
                onPointerMove={handleMarkerPointerMove}
                onPointerUp={handleMarkerPointerUp}
                onPointerCancel={handleMarkerPointerUp}
              >
                {index + 1}
              </div>
            );
          })}
        </div>
      </div>
      {referenceMode ? (
        <div className="pointer-events-none absolute bottom-3 left-3 z-10 rounded-box bg-base-100/90 px-2 py-1 text-xs text-base-content/70">
          {canPickPdfPoint
            ? "Ctrl+click the same spot on the PDF"
            : "Ctrl+click the base map to set a pin"}
        </div>
      ) : null}
    </div>
  );
}
