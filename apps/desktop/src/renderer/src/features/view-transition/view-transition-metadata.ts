export type ViewTransitionStyle = "default" | "vertical" | "wipe" | "angled" | "flip" | "slides";

export const DEFAULT_VIEW_TRANSITION: ViewTransitionStyle = "vertical";

export const VIEW_TRANSITION_OPTIONS: ViewTransitionStyle[] = [
  "default",
  "vertical",
  "wipe",
  "angled",
  "flip",
  "slides",
];

function isViewTransitionStyle(value: unknown): value is ViewTransitionStyle {
  return (
    typeof value === "string" && VIEW_TRANSITION_OPTIONS.includes(value as ViewTransitionStyle)
  );
}

export function parseViewTransitionStyle(value: unknown): ViewTransitionStyle {
  return isViewTransitionStyle(value) ? value : DEFAULT_VIEW_TRANSITION;
}
