export type PdfViewTransform = {
  scale: number;
  rotation: number;
  panX: number;
  panY: number;
};

export type PdfWorkspacePatch = {
  pdfScale?: number;
  pdfRotation?: number;
  pdfPanX?: number;
  pdfPanY?: number;
};

export const MIN_PDF_SCALE = 0.25;
export const MAX_PDF_SCALE = 5;
export const PDF_RENDER_SCALE = 1.5;

export function clampPdfScale(scale: number) {
  return Math.min(MAX_PDF_SCALE, Math.max(MIN_PDF_SCALE, scale));
}

export function workspaceToPdfTransform(workspace: {
  pdfScale: number;
  pdfRotation: number;
  pdfPanX: number;
  pdfPanY: number;
}): PdfViewTransform {
  return {
    scale: workspace.pdfScale,
    rotation: workspace.pdfRotation,
    panX: workspace.pdfPanX,
    panY: workspace.pdfPanY,
  };
}

export function defaultPdfTransform(): PdfViewTransform {
  return { scale: 1, rotation: 0, panX: 0, panY: 0 };
}

export function pdfTransformToWorkspacePatch(patch: Partial<PdfViewTransform>): PdfWorkspacePatch {
  return {
    ...(patch.scale !== undefined ? { pdfScale: patch.scale } : {}),
    ...(patch.rotation !== undefined ? { pdfRotation: patch.rotation } : {}),
    ...(patch.panX !== undefined ? { pdfPanX: patch.panX } : {}),
    ...(patch.panY !== undefined ? { pdfPanY: patch.panY } : {}),
  };
}
