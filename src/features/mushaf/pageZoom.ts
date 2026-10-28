/*
 * The printed page's size control (the reader's text-size steps): the Hafs page is never reflowed, it is
 * scaled as a whole — larger pages are panned, its 15 lines and their breaks never change. Pure, so it
 * is tested.
 */

/** One zoom per text-size step (readerPrefs FONT_SIZES); the default step is the page at screen size. */
export const PAGE_ZOOMS = [0.85, 1, 1.25, 1.5, 1.8] as const;
export const MIN_ZOOM = PAGE_ZOOMS[0];
export const MAX_ZOOM = PAGE_ZOOMS[PAGE_ZOOMS.length - 1];

/** The page's scale at a text-size step (out-of-range steps are clamped). */
export function pageZoom(step: number): number {
  const index = Math.max(0, Math.min(PAGE_ZOOMS.length - 1, Math.round(Number.isFinite(step) ? step : 1)));
  return PAGE_ZOOMS[index]!;
}

/** The step nearest to a zoom (after a pinch), clamped to the range. */
export function zoomStep(zoom: number): number {
  const clamped = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Number.isFinite(zoom) ? zoom : 1));
  let best = 0;
  PAGE_ZOOMS.forEach((value, index) => {
    if (Math.abs(value - clamped) < Math.abs(PAGE_ZOOMS[best]! - clamped)) best = index;
  });
  return best;
}

/** The step a pinch ends on: the current zoom times the pinch's scale. */
export function stepAfterPinch(step: number, scale: number): number {
  return zoomStep(pageZoom(step) * scale);
}
