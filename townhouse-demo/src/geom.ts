// Minimal axis-aligned geometry for the v0 demo. Every planning feature in
// Community One v0 is an axis-aligned rectangle; this is a deliberate v0
// simplification (declared on the sheet), not a kernel replacement.

export type Point = readonly [number, number]

export interface Rect {
  readonly x: number
  readonly y: number
  readonly w: number
  readonly h: number
}

/** Round to micrometres so serialized geometry is stable across runs. */
export function roundM(value: number): number {
  const rounded = Math.round(value * 1_000_000) / 1_000_000
  return Object.is(rounded, -0) ? 0 : rounded
}

export function rectRing(rect: Rect): readonly Point[] {
  return [
    [roundM(rect.x), roundM(rect.y)],
    [roundM(rect.x + rect.w), roundM(rect.y)],
    [roundM(rect.x + rect.w), roundM(rect.y + rect.h)],
    [roundM(rect.x), roundM(rect.y + rect.h)],
  ]
}

export function rectArea(rect: Rect): number {
  return rect.w * rect.h
}

export function rectContains(outer: Rect, inner: Rect, tolerance = 1e-6): boolean {
  return (
    inner.x >= outer.x - tolerance
    && inner.y >= outer.y - tolerance
    && inner.x + inner.w <= outer.x + outer.w + tolerance
    && inner.y + inner.h <= outer.y + outer.h + tolerance
  )
}

export function rectsOverlap(a: Rect, b: Rect, tolerance = 1e-6): boolean {
  return (
    a.x + a.w > b.x + tolerance
    && b.x + b.w > a.x + tolerance
    && a.y + a.h > b.y + tolerance
    && b.y + b.h > a.y + tolerance
  )
}

/** Ceil to 0.1 m so minimum-share allocations always satisfy their rule. */
export function ceilDecimetre(value: number): number {
  return roundM(Math.ceil(value * 10 - 1e-9) / 10)
}
