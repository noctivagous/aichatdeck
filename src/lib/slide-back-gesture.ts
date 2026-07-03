export const SLIDE_BACK_SCROLL_EDGE_PX = 8;
export const SLIDE_BACK_WHEEL_THRESHOLD = 56;
export const SLIDE_BACK_WHEEL_ACCUM_WINDOW_MS = 160;
export const SLIDE_BACK_GESTURE_COOLDOWN_MS = 900;
export const SLIDE_BACK_SWIPE_THRESHOLD = 72;

/** Negative delta means the user is trying to scroll further left. */
export function horizontalWheelDelta(event: WheelEvent): number {
  if (event.deltaX !== 0) return event.deltaX;
  if (event.shiftKey && event.deltaY !== 0) return event.deltaY;
  return 0;
}

export function isAtHorizontalScrollStart(
  scrollLeft: number,
  edgePx = SLIDE_BACK_SCROLL_EDGE_PX,
): boolean {
  return scrollLeft <= edgePx;
}