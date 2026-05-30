import { forwardRef } from "react";
import {
  Panel,
  PanelGroup,
  PanelResizeHandle,
  type ImperativePanelHandle,
  type PanelGroupProps,
  type PanelProps,
  type PanelResizeHandleProps,
} from "react-resizable-panels";

export type { ImperativePanelHandle };

type HandleProps = PanelResizeHandleProps & { withHandle?: boolean };

export function ResizablePanelGroup({ className = "", ...props }: PanelGroupProps) {
  return (
    <PanelGroup
      className={`flex size-full data-[panel-group-direction=vertical]:flex-col ${className}`}
      {...props}
    />
  );
}

export const ResizablePanel = forwardRef<ImperativePanelHandle, PanelProps>(
  function ResizablePanel(props, ref) {
    return <Panel ref={ref} {...props} />;
  },
);

export function ResizableHandle({ withHandle, className = "", ...props }: HandleProps) {
  return (
    <PanelResizeHandle
      className={`relative flex w-px items-center justify-center bg-base-content/10 after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2 ${className}`}
      {...props}
    >
      {withHandle ? <div className="z-10 h-8 w-1 rounded-full bg-base-content/20" /> : null}
    </PanelResizeHandle>
  );
}
