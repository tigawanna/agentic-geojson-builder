import { useEffect, useRef, useState } from "react";
import * as pdfjs from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.mjs?url";
import type { MapSourceFilePayload } from "@shared/maps.types";
import { fileBase64ToDataUrl } from "../hooks/map-workspace-api";

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

type SourceDocumentPaneProps = {
  sourceFile: MapSourceFilePayload;
};

export function SourceDocumentPane({ sourceFile }: SourceDocumentPaneProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
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
      const viewport = page.getViewport({ scale: 1.5 });
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

  return (
    <div className="absolute inset-0 overflow-auto bg-base-300/40 p-4">
      {isPdf ? (
        <canvas ref={canvasRef} className="mx-auto max-w-full shadow-lg" />
      ) : (
        imageUrl && (
          <img
            src={imageUrl}
            alt={sourceFile.fileName}
            className="mx-auto max-h-full max-w-full object-contain"
          />
        )
      )}
    </div>
  );
}
