import { useRef } from "react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "../../../components/common/Resizable";
import type { MapHandle } from "../lib/map-handle";
import { useMapWorkspaceState } from "../store/MapWorkspaceProvider";
import { LeafletMapPane } from "./LeafletMapPane";
import { SourceDocumentPane } from "./SourceDocumentPane";

export function MapWorkspaceSplitView() {
  const workspace = useMapWorkspaceState((state) => state.workspace);
  const sourceFile = useMapWorkspaceState((state) => state.sourceFile);
  const mapHandleRef = useRef<MapHandle | null>(null);

  if (!workspace) {
    return null;
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="border-b border-base-content/10 px-4 py-3">
        <h1 className="text-lg font-semibold">{workspace.name}</h1>
        {workspace.description ? (
          <p className="mt-1 text-sm text-base-content/60">{workspace.description}</p>
        ) : null}
      </header>

      <div className="min-h-0 flex-1">
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel defaultSize={50} minSize={25}>
            <section className="relative h-full min-h-0 bg-base-200">
              <span className="absolute top-3 left-3 z-10 rounded-box bg-base-100/90 px-2 py-1 text-xs font-medium">
                Source document
              </span>
              {sourceFile ? (
                <SourceDocumentPane sourceFile={sourceFile} />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-base-content/50">
                  No source file found
                </div>
              )}
            </section>
          </ResizablePanel>

          <ResizableHandle withHandle />

          <ResizablePanel defaultSize={50} minSize={25}>
            <section className="relative h-full min-h-0 bg-base-200">
              <span className="absolute top-3 left-3 z-10 rounded-box bg-base-100/90 px-2 py-1 text-xs font-medium">
                Base map
              </span>
              <LeafletMapPane
                workspace={workspace}
                onReady={(handle) => {
                  mapHandleRef.current = handle;
                }}
              />
            </section>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}
