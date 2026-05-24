import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Check, Copy, ExternalLink } from "lucide-react";
import { useState } from "react";

interface IdePickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  apiKey: string;
}

function getMcpServerUrl(): string {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/api/mcp`;
}

function buildServerTransport(mcpUrl: string, apiKey: string) {
  return {
    url: mcpUrl,
    headers: {
      "x-api-key": apiKey,
    },
  };
}

function buildMcpServersConfig(name: string, mcpUrl: string, apiKey: string) {
  return {
    [name]: buildServerTransport(mcpUrl, apiKey),
  };
}

function encodeBase64Json(value: unknown) {
  const json = JSON.stringify(value);
  const bytes = new TextEncoder().encode(json);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function buildCursorDeepLink(mcpUrl: string, name: string, apiKey: string): string {
  const config = encodeBase64Json(buildMcpServersConfig(name, mcpUrl, apiKey));
  return `cursor://anysphere.cursor-deeplink/mcp/install?name=${encodeURIComponent(name)}&config=${encodeURIComponent(config)}`;
}

function buildVsCodeDeepLink(mcpUrl: string, name: string, apiKey: string): string {
  const config = encodeBase64Json(buildMcpServersConfig(name, mcpUrl, apiKey));
  return `vscode://ms-vscode.vscode-mcp/install?name=${encodeURIComponent(name)}&config=${encodeURIComponent(config)}`;
}

function buildManualConfig(mcpUrl: string, name: string, apiKey: string): string {
  return JSON.stringify({ mcpServers: buildMcpServersConfig(name, mcpUrl, apiKey) }, null, 2);
}

export function IdePickerDialog({ open, onOpenChange, apiKey }: IdePickerDialogProps) {
  const [copied, setCopied] = useState(false);
  const mcpUrl = getMcpServerUrl();
  const serverName = "agentic-geojson-builder";

  const handleCopyConfig = async () => {
    await navigator.clipboard.writeText(buildManualConfig(mcpUrl, serverName, apiKey));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-test="ide-picker-dialog">
        <DialogHeader>
          <DialogTitle>Open in your IDE</DialogTitle>
          <DialogDescription>
            Choose your editor to configure the MCP server automatically, or copy the config into{" "}
            <code className="text-xs">~/.cursor/mcp.json</code> if auto-install fails.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 py-2">
          <a
            href={buildCursorDeepLink(mcpUrl, serverName, apiKey)}
            className="btn flex w-full items-center justify-between rounded-lg bg-base-200 px-4 py-3 btn-ghost hover:bg-base-300"
            data-test="ide-picker-cursor"
          >
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                <span className="text-lg font-bold text-primary">C</span>
              </div>
              <div className="text-left">
                <p className="text-sm font-medium">Cursor</p>
                <p className="text-xs text-muted-foreground">Open and configure automatically</p>
              </div>
            </div>
            <ExternalLink className="size-4 text-muted-foreground" />
          </a>

          <a
            href={buildVsCodeDeepLink(mcpUrl, serverName, apiKey)}
            className="btn flex w-full items-center justify-between rounded-lg bg-base-200 px-4 py-3 btn-ghost hover:bg-base-300"
            data-test="ide-picker-vscode"
          >
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                <span className="text-lg font-bold text-primary">VS</span>
              </div>
              <div className="text-left">
                <p className="text-sm font-medium">VS Code</p>
                <p className="text-xs text-muted-foreground">Open and configure automatically</p>
              </div>
            </div>
            <ExternalLink className="size-4 text-muted-foreground" />
          </a>
        </div>

        <div className="rounded-lg bg-base-200/70 p-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-medium">Manual config</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyConfig}
              className="h-7 gap-1 text-xs"
              data-test="copy-mcp-config"
            >
              {copied ? (
                <>
                  <Check className="size-3" /> Copied
                </>
              ) : (
                <>
                  <Copy className="size-3" /> Copy
                </>
              )}
            </Button>
          </div>
          <pre className="overflow-x-auto text-xs leading-relaxed text-muted-foreground">
            {buildManualConfig(mcpUrl, serverName, apiKey)}
          </pre>
        </div>

        <DialogFooter showCloseButton />
      </DialogContent>
    </Dialog>
  );
}
