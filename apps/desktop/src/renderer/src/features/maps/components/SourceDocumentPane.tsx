import { useEffect, useRef, useState } from "react";
import * as pdfjs from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.mjs?url";
import type { MapSourceFilePayload } from "@shared/maps.types";
import { fileBase64ToDataUrl } from "../hooks/map-workspace-api";
import { clampPdfScale, PDF_RENDER_SCALE, type PdfViewTransform } from "../lib/pdf-view-transform";

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

type SourceDocumentPaneProps = {
  sourceFile: MapSourceFilePayload;
  transform: PdfViewTransform;
  onTransformChange: (patch: Partial<PdfViewTransform>) => void;
};

export function SourceDocumentPane({
  sourceFile,
  transform,
  onTransformChange,
}: SourceDocumentPaneProps) {
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
  const [localTransform, setLocalTransform] = useState(transform);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  transformRef.current = localTransform;
  onTransformChangeRef.current = onTransformChange;

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
    if (event.button !== 0) {
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

  const content = isPdf ? (
    <canvas
      ref={canvasRef}
      className="pointer-events-none max-w-none shadow-[0_0_0_1px_rgba(0,0,0,0.12),0_12px_40px_rgba(0,0,0,0.18)]"
    />
  ) : (
    imageUrl && (
      <img
        src={imageUrl}
        alt={sourceFile.fileName}
        draggable={false}
        className="pointer-events-none max-w-none object-contain shadow-[0_0_0_1px_rgba(0,0,0,0.12),0_12px_40px_rgba(0,0,0,0.18)]"
      />
    )
  );

  return (
    <div
      ref={viewportRef}
      className={`absolute inset-0 touch-none overflow-hidden bg-base-300/40 select-none ${
        isDragging ? "cursor-grabbing" : "cursor-grab"
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
        </div>
      </div>
    </div>
  );
}
