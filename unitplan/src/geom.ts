// ---------------------------------------------------------------------------
// Axis-aligned geometry helpers for the unit-plan template.
// All coordinates are model-space metres.
// ---------------------------------------------------------------------------
import polygonClipping from 'polygon-clipping'
import { fail } from './errors.ts'

export interface Rect {
  readonly x: number
  readonly y: number
  readonly w: number
  readonly h: number
}

export type Point = readonly [x: number, y: number]

export function rectCorners(rect: Rect): readonly Point[] {
  return [
    [rect.x, rect.y],
    [rect.x + rect.w, rect.y],
    [rect.x + rect.w, rect.y + rect.h],
    [rect.x, rect.y + rect.h],
  ]
}

export function rectArea(rect: Rect): number {
  return rect.w * rect.h
}

export function expand(rect: Rect, margin: number): Rect {
  return {
    x: rect.x - margin,
    y: rect.y - margin,
    w: rect.w + 2 * margin,
    h: rect.h + 2 * margin,
  }
}

/** Strictly positive overlap area (touching edges do not count). */
export function rectsOverlap(a: Rect, b: Rect): boolean {
  const eps = 1e-9
  return (
    a.x + eps < b.x + b.w
    && b.x + eps < a.x + a.w
    && a.y + eps < b.y + b.h
    && b.y + eps < a.y + a.h
  )
}

export interface SharedWall {
  /** 'x' means the shared wall is vertical (rooms side by side). */
  readonly axis: 'x' | 'y'
  /** Clear gap between the two facing room faces, in metres. */
  readonly gap: number
  /** Length of the facing overlap along the wall, in metres. */
  readonly overlapLength: number
  /** Interval of the overlap along the wall axis. */
  readonly from: number
  readonly to: number
  /** Wall centreline position on the perpendicular axis. */
  readonly at: number
}

/**
 * Detects a facing wall between two disjoint rectangles: opposite faces
 * separated by a gap in [minGap, maxGap] with positive overlap length.
 */
export function sharedWall(
  a: Rect,
  b: Rect,
  minGap: number,
  maxGap: number,
): SharedWall | null {
  const eps = 1e-9
  // Vertical wall: a left of b, or b left of a.
  const gapX = Math.max(b.x - (a.x + a.w), a.x - (b.x + b.w))
  const overlapY = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y)
  if (gapX >= minGap - eps && gapX <= maxGap + eps && overlapY > eps) {
    const leftFace = b.x - (a.x + a.w) > a.x - (b.x + b.w) ? a.x + a.w : b.x + b.w
    return {
      axis: 'x',
      gap: gapX,
      overlapLength: overlapY,
      from: Math.max(a.y, b.y),
      to: Math.min(a.y + a.h, b.y + b.h),
      at: leftFace + gapX / 2,
    }
  }
  const gapY = Math.max(b.y - (a.y + a.h), a.y - (b.y + b.h))
  const overlapX = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)
  if (gapY >= minGap - eps && gapY <= maxGap + eps && overlapX > eps) {
    const bottomFace = b.y - (a.y + a.h) > a.y - (b.y + b.h) ? a.y + a.h : b.y + b.h
    return {
      axis: 'y',
      gap: gapY,
      overlapLength: overlapX,
      from: Math.max(a.x, b.x),
      to: Math.min(a.x + a.w, b.x + b.w),
      at: bottomFace + gapY / 2,
    }
  }
  return null
}

function toPcPolygon(rect: Rect): [number, number][][] {
  return [[
    [rect.x, rect.y],
    [rect.x + rect.w, rect.y],
    [rect.x + rect.w, rect.y + rect.h],
    [rect.x, rect.y + rect.h],
    [rect.x, rect.y],
  ]]
}

export interface EnvelopeResult {
  /** Outer ring, counter-clockwise, first point not repeated. */
  readonly outerRing: readonly Point[]
}

/**
 * Envelope = union of every room rectangle expanded by the external wall
 * thickness. Fails closed when the union is disconnected (a layout with an
 * unreachable wing) or contains holes (a fully enclosed void nobody placed).
 */
export function computeEnvelope(rooms: readonly Rect[], externalWallM: number): EnvelopeResult {
  const expanded = rooms.map((room) => toPcPolygon(expand(room, externalWallM)))
  const [first, ...rest] = expanded
  if (first === undefined) {
    fail({ code: 'E_ENVELOPE_DISCONNECTED', message: 'No rooms were placed.' })
  }
  const union = polygonClipping.union(first, ...rest)
  if (union.length !== 1) {
    fail({
      code: 'E_ENVELOPE_DISCONNECTED',
      message: 'The placed rooms do not form one connected envelope.',
      observed: `${union.length} disconnected regions`,
      required: 'exactly 1 connected region',
    })
  }
  const polygon = union[0]!
  if (polygon.length !== 1) {
    fail({
      code: 'E_ENVELOPE_HAS_HOLES',
      message: 'The envelope contains an enclosed void no room accounts for.',
      observed: `${polygon.length - 1} hole(s)`,
      required: '0 holes',
    })
  }
  const raw = polygon[0]!
  const ring: Point[] = raw.map((point) => [point[0], point[1]] as const as Point)
  const last = ring[ring.length - 1]
  const head = ring[0]
  if (last !== undefined && head !== undefined && last[0] === head[0] && last[1] === head[1]) {
    ring.pop()
  }
  return { outerRing: ring }
}

/** Point-in-polygon (ray casting); boundary points count as inside. */
export function pointInRing(point: Point, ring: readonly Point[]): boolean {
  const eps = 1e-9
  let inside = false
  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index, index += 1) {
    const a = ring[index]!
    const b = ring[previous]!
    // On-segment check for axis-aligned edges.
    if (
      Math.abs(a[0] - b[0]) < eps
      && Math.abs(point[0] - a[0]) < eps
      && point[1] >= Math.min(a[1], b[1]) - eps
      && point[1] <= Math.max(a[1], b[1]) + eps
    ) return true
    if (
      Math.abs(a[1] - b[1]) < eps
      && Math.abs(point[1] - a[1]) < eps
      && point[0] >= Math.min(a[0], b[0]) - eps
      && point[0] <= Math.max(a[0], b[0]) + eps
    ) return true
    if (
      a[1] > point[1] !== b[1] > point[1]
      && point[0] < ((b[0] - a[0]) * (point[1] - a[1])) / (b[1] - a[1]) + a[0]
    ) {
      inside = !inside
    }
  }
  return inside
}
