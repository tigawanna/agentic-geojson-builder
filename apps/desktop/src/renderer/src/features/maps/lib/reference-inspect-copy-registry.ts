import type { ReferenceInspectCopyTarget } from "@renderer/features/maps/lib/reference-inspect-tooltip";

let activeCopyTarget: ReferenceInspectCopyTarget | null = null;

export function setReferenceInspectCopyTarget(target: ReferenceInspectCopyTarget | null) {
  activeCopyTarget = target;
}

export function getReferenceInspectCopyTarget(): ReferenceInspectCopyTarget | null {
  return activeCopyTarget;
}
