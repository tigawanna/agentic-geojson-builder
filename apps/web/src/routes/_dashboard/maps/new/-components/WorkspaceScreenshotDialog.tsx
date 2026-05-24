import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  copyScreenshotBlobToClipboard,
  downloadScreenshotBlob,
} from "@/lib/rendered-map-view/build-chat-screenshot";
import { unwrapUnknownError } from "@/utils/errors";
import { Copy, Download } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type WorkspaceScreenshotDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mapName: string;
  previewUrl: string | null;
  combinedBlob: Blob | null;
  pdfBlob: Blob | null;
  mapBlob: Blob | null;
};

export function WorkspaceScreenshotDialog({
  open,
  onOpenChange,
  mapName,
  previewUrl,
  combinedBlob,
  pdfBlob,
  mapBlob,
}: WorkspaceScreenshotDialogProps) {
  const [isCopying, setIsCopying] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (!combinedBlob) {
      return;
    }

    let cancelled = false;

    void copyScreenshotBlobToClipboard(combinedBlob)
      .then(() => {
        if (!cancelled) {
          toast.success("Combined screenshot copied. Paste it into chat with Ctrl+V.");
        }
      })
      .catch(() => {
        if (!cancelled) {
          toast.message("Screenshot ready", {
            description: "Copy did not auto-run. Use the buttons below.",
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [open, combinedBlob]);

  async function handleCopy(blob: Blob | null, label: string) {
    if (!blob) {
      return;
    }

    setIsCopying(true);
    try {
      await copyScreenshotBlobToClipboard(blob);
      toast.success(`${label} copied to clipboard.`);
    } catch (err: unknown) {
      toast.error(unwrapUnknownError(err).message);
    } finally {
      setIsCopying(false);
    }
  }

  function handleDownload(blob: Blob | null, suffix: string) {
    if (!blob) {
      return;
    }

    downloadScreenshotBlob(`${mapName}-${suffix}.png`, blob);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl" data-test="workspace-screenshot-dialog">
        <DialogHeader>
          <DialogTitle>Workspace screenshot</DialogTitle>
          <DialogDescription>
            Paste the combined image into Cursor chat, or copy the PDF and map panes separately. Refresh
            the page once if the map side looks like a numbered grid instead of satellite imagery.
          </DialogDescription>
        </DialogHeader>

        {previewUrl ? (
          <div className="overflow-auto rounded-lg border border-base-content/10 bg-base-200 p-3">
            <img
              src={previewUrl}
              alt="Combined workspace screenshot"
              className="mx-auto max-h-[60vh] w-full object-contain"
              data-test="workspace-screenshot-preview"
            />
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="default"
            disabled={!combinedBlob || isCopying}
            onClick={() => void handleCopy(combinedBlob, "Combined screenshot")}
            data-test="workspace-screenshot-copy-combined"
          >
            <Copy className="size-4" />
            Copy combined
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!pdfBlob || isCopying}
            onClick={() => void handleCopy(pdfBlob, "PDF screenshot")}
            data-test="workspace-screenshot-copy-pdf"
          >
            <Copy className="size-4" />
            Copy PDF
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!mapBlob || isCopying}
            onClick={() => void handleCopy(mapBlob, "Map screenshot")}
            data-test="workspace-screenshot-copy-map"
          >
            <Copy className="size-4" />
            Copy map
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={!combinedBlob}
            onClick={() => handleDownload(combinedBlob, "workspace")}
            data-test="workspace-screenshot-download-combined"
          >
            <Download className="size-4" />
            Download combined
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
