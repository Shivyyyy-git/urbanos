// ---------------------------------------------------------------------------
// Planar geometry primitives. Everything here is in canonical metres and is
// pure: no clock, no randomness, no mutation of inputs.
//
// Tolerance discipline: every predicate takes `eps` explicitly rather than
// reading a module constant, so a caller can never accidentally compare two
// values under two different tolerances.
// ---------------------------------------------------------------------------
// polygon-clipping 0.15.7's declaration file advertises named functions, while
// its browser ESM bundle actually exposes those functions on the default
// export. Import the runtime shape truthfully and retain the published geometry
// types separately.
import polygonClipping from 'polygon-clipping'
import type { Pair as ClipPair, Polygon as ClipPolygon } from 'polygon-clipping'

const polygonDifference = (
  polygonClipping as { difference: typeof import('polygon-clipping').difference }
).difference

export interface Pt {
  x: number
  y: number
}

export type Ring = Pt[]

export const sub = (a: Pt, b: Pt): Pt => ({ x: a.x - b.x, y: a.y - b.y })
export const cross = (a: Pt, b: Pt): number => a.x * b.y - a.y * b.x
export const dot = (a: Pt, b: Pt): number => a.x * b.x + a.y * b.y

export function dist(a: Pt, b: Pt): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

export function samePoint(a: Pt, b: Pt, eps: number): boolean {
  return dist(a, b) <= eps
}

/** Signed area (positive = counter-clockwise). Shoelace. */
export function signedArea(ring: readonly Pt[]): number {
  let twice = 0
  for (let i = 0; i < ring.length; i += 1) {
    const a = ring[i]
    const b = ring[(i + 1) % ring.length]
    if (a === undefined || b === undefined) continue
    twice += a.x * b.y - b.x * a.y
  }
  return twice / 2
}

export const area = (ring: readonly Pt[]): number => Math.abs(signedArea(ring))

export function perimeter(ring: readonly Pt[]): number {
  let total = 0
  for (let i = 0; i < ring.length; i += 1) {
    const a = ring[i]
    const b = ring[(i + 1) % ring.length]
    if (a === undefined || b === undefined) continue
    total += dist(a, b)
  }
  return total
}

export function boundingBox(ring: readonly Pt[]): { minX: number; minY: number; maxX: number; maxY: number } {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const p of ring) {
    if (p.x < minX) minX = p.x
    if (p.x > maxX) maxX = p.x
    if (p.y < minY) minY = p.y
    if (p.y > maxY) maxY = p.y
  }
  return { minX, minY, maxX, maxY }
}

// ------------------------------ segment logic -------------------------------

/** Perpendicular distance from `p` to the segment `a`→`b`. */
export function distToSegment(p: Pt, a: Pt, b: Pt): number {
  const ab = sub(b, a)
  const len2 = dot(ab, ab)
  if (len2 === 0) return dist(p, a)
  let t = dot(sub(p, a), ab) / len2
  t = Math.max(0, Math.min(1, t))
  return dist(p, { x: a.x + ab.x * t, y: a.y + ab.y * t })
}

export function onSegment(p: Pt, a: Pt, b: Pt, eps: number): boolean {
  return distToSegment(p, a, b) <= eps
}

export type SegmentRelation = 'disjoint' | 'proper-cross' | 'touch' | 'collinear-overlap'

/**
 * Classify how two segments meet. The distinction matters because the contract
 * gives self-crossing and self-touching different codes: a bow-tie is a
 * different defect from a spike that doubles back.
 */
export function relateSegments(
  a1: Pt, a2: Pt, b1: Pt, b2: Pt, eps: number,
): SegmentRelation {
  const d1 = sub(a2, a1)
  const d2 = sub(b2, b1)
  const denom = cross(d1, d2)
  const collinearish = Math.abs(denom) <= eps * eps * 1e-6

  if (collinearish) {
    // Parallel. Overlapping only if they are also colinear and share extent.
    const offAxis = Math.abs(cross(d1, sub(b1, a1)))
    const len = Math.hypot(d1.x, d1.y)
    if (len === 0 || offAxis / len > eps) return 'disjoint'
    const len2 = dot(d1, d1)
    const t1 = dot(sub(b1, a1), d1) / len2
    const t2 = dot(sub(b2, a1), d1) / len2
    const lo = Math.min(t1, t2)
    const hi = Math.max(t1, t2)
    const relEps = eps / Math.max(len, eps)
    if (hi < -relEps || lo > 1 + relEps) return 'disjoint'
    // Shared extent longer than a point => overlap; otherwise a touch.
    const overlap = Math.min(hi, 1) - Math.max(lo, 0)
    return overlap > relEps ? 'collinear-overlap' : 'touch'
  }

  const t = cross(sub(b1, a1), d2) / denom
  const u = cross(sub(b1, a1), d1) / denom
  const lenA = Math.hypot(d1.x, d1.y) || eps
  const lenB = Math.hypot(d2.x, d2.y) || eps
  const epsA = eps / lenA
  const epsB = eps / lenB
  if (t < -epsA || t > 1 + epsA || u < -epsB || u > 1 + epsB) return 'disjoint'

  const atEndA = t <= epsA || t >= 1 - epsA
  const atEndB = u <= epsB || u >= 1 - epsB
  return atEndA || atEndB ? 'touch' : 'proper-cross'
}

export function intersectionPoint(a1: Pt, a2: Pt, b1: Pt, b2: Pt): Pt | null {
  const d1 = sub(a2, a1)
  const d2 = sub(b2, b1)
  const denom = cross(d1, d2)
  if (denom === 0) return null
  const t = cross(sub(b1, a1), d2) / denom
  return { x: a1.x + d1.x * t, y: a1.y + d1.y * t }
}

// ------------------------------- containment --------------------------------

export type PointRelation = 'inside' | 'outside' | 'boundary'

export function relatePointToRing(p: Pt, ring: readonly Pt[], eps: number): PointRelation {
  for (let i = 0; i < ring.length; i += 1) {
    const a = ring[i]
    const b = ring[(i + 1) % ring.length]
    if (a === undefined || b === undefined) continue
    if (onSegment(p, a, b, eps)) return 'boundary'
  }
  // Ray casting on the half-open rule; boundary already excluded above.
  let inside = false
  for (let i = 0; i < ring.length; i += 1) {
    const a = ring[i]
    const b = ring[(i + 1) % ring.length]
    if (a === undefined || b === undefined) continue
    if ((a.y > p.y) !== (b.y > p.y)) {
      const xAt = a.x + ((p.y - a.y) / (b.y - a.y)) * (b.x - a.x)
      if (p.x < xAt) inside = !inside
    }
  }
  return inside ? 'inside' : 'outside'
}

// ------------------------------ ring validity -------------------------------

export type RingDefect =
  | 'too-few-vertices'
  | 'degenerate-edge'
  | 'zero-area'
  | 'self-intersects'
  | 'self-touches'

export interface RingCheck {
  defect: RingDefect | null
  /** Indices involved, for the Finding's refs. */
  at?: readonly number[]
}

export function checkRing(ring: readonly Pt[], eps: number): RingCheck {
  const distinct: Pt[] = []
  for (const p of ring) {
    if (!distinct.some((q) => samePoint(p, q, eps))) distinct.push(p)
  }
  if (ring.length < 3 || distinct.length < 3) {
    return { defect: 'too-few-vertices' }
  }

  for (let i = 0; i < ring.length; i += 1) {
    const a = ring[i]
    const b = ring[(i + 1) % ring.length]
    if (a === undefined || b === undefined) continue
    if (dist(a, b) <= eps) return { defect: 'degenerate-edge', at: [i] }
  }

  // A ring whose every vertex lies on one line encloses nothing. This is tested
  // BEFORE the crossing tests because a fully collinear ring also reads as a
  // degenerate overlap, and "collinear" is the more informative diagnosis.
  if (allCollinear(ring, eps)) {
    return { defect: 'zero-area' }
  }

  const n = ring.length
  // Non-adjacent edge pairs must not meet at all; adjacent pairs must meet only
  // at their shared endpoint (a doubling-back spike shows up as an overlap).
  for (let i = 0; i < n; i += 1) {
    const a1 = ring[i]
    const a2 = ring[(i + 1) % n]
    if (a1 === undefined || a2 === undefined) continue
    for (let j = i + 1; j < n; j += 1) {
      const b1 = ring[j]
      const b2 = ring[(j + 1) % n]
      if (b1 === undefined || b2 === undefined) continue
      const adjacent = j === i + 1 || (i === 0 && j === n - 1)
      const rel = relateSegments(a1, a2, b1, b2, eps)
      if (rel === 'disjoint') continue
      if (rel === 'proper-cross') return { defect: 'self-intersects', at: [i, j] }
      if (rel === 'collinear-overlap') return { defect: 'self-touches', at: [i, j] }
      if (rel === 'touch' && !adjacent) return { defect: 'self-touches', at: [i, j] }
    }
  }

  // Only now is |area| meaningful. A bow-tie's two lobes cancel to EXACTLY zero
  // signed area, so testing area before the crossing tests would have reported a
  // self-intersecting boundary as merely collinear.
  if (area(ring) <= eps * eps) {
    return { defect: 'zero-area' }
  }
  return { defect: null }
}

/** Do all vertices lie on a single line, within `eps` of it? */
export function allCollinear(ring: readonly Pt[], eps: number): boolean {
  const a = ring[0]
  if (a === undefined) return true
  // Use the farthest vertex from `a` as the second anchor so a near-duplicate
  // neighbour cannot define a meaningless direction.
  let b = a
  let best = 0
  for (const p of ring) {
    const d = dist(a, p)
    if (d > best) { best = d; b = p }
  }
  if (best <= eps) return true
  const dir = sub(b, a)
  const len = Math.hypot(dir.x, dir.y)
  return ring.every((p) => Math.abs(cross(dir, sub(p, a))) / len <= eps)
}

/** Sine and cosine of an angle in DEGREES, exact at the cardinal bearings.
 *
 * Math.sin(Math.PI) is 1.2e-16, not 0. Left alone, a due-south leg injects that
 * error into a traverse's misclosure — enough to push a survey that closes at
 * exactly 1:10,000 to 1:9,999.999999995 and fail it. Surveying bearings land on
 * 0/90/180/270 constantly, and those four values ARE exactly representable, so we
 * return them exactly instead of letting a radian conversion decide.
 */
export function sinDeg(degrees: number): number {
  const m = ((degrees % 360) + 360) % 360
  if (m === 0 || m === 180) return 0
  if (m === 90) return 1
  if (m === 270) return -1
  return Math.sin((m * Math.PI) / 180)
}

export function cosDeg(degrees: number): number {
  const m = ((degrees % 360) + 360) % 360
  if (m === 0) return 1
  if (m === 90 || m === 270) return 0
  if (m === 180) return -1
  return Math.cos((m * Math.PI) / 180)
}

// --------------------------- ring-to-ring relations -------------------------

export type RingRelation = 'strictly-inside' | 'touching' | 'crossing' | 'disjoint' | 'contains'

export function relateRings(inner: readonly Pt[], outer: readonly Pt[], eps: number): RingRelation {
  let anyInside = false
  let anyOutside = false
  let anyBoundary = false
  for (const p of inner) {
    const rel = relatePointToRing(p, outer, eps)
    if (rel === 'inside') anyInside = true
    else if (rel === 'outside') anyOutside = true
    else anyBoundary = true
  }

  for (let i = 0; i < inner.length; i += 1) {
    const a1 = inner[i]
    const a2 = inner[(i + 1) % inner.length]
    if (a1 === undefined || a2 === undefined) continue
    for (let j = 0; j < outer.length; j += 1) {
      const b1 = outer[j]
      const b2 = outer[(j + 1) % outer.length]
      if (b1 === undefined || b2 === undefined) continue
      const rel = relateSegments(a1, a2, b1, b2, eps)
      if (rel === 'proper-cross') return 'crossing'
      if (rel === 'touch' || rel === 'collinear-overlap') anyBoundary = true
    }
  }

  if (anyInside && anyOutside) return 'crossing'
  if (anyBoundary) return 'touching'
  if (anyInside) return 'strictly-inside'
  // No vertex inside and none on the boundary: either disjoint, or `inner`
  // swallows `outer`.
  const firstOuter = outer[0]
  if (firstOuter !== undefined && relatePointToRing(firstOuter, inner, eps) === 'inside') {
    return 'contains'
  }
  return 'disjoint'
}

/** A point strictly inside the ring, or null if none can be found. */
export function interiorPoint(ring: readonly Pt[], eps: number): Pt | null {
  const n = ring.length
  if (n < 3) return null
  const centroid = {
    x: ring.reduce((sum, p) => sum + p.x, 0) / n,
    y: ring.reduce((sum, p) => sum + p.y, 0) / n,
  }
  if (relatePointToRing(centroid, ring, eps) === 'inside') return centroid
  // Concave rings can push the centroid outside; try short-diagonal midpoints.
  for (let i = 0; i < n; i += 1) {
    const a = ring[i]
    const b = ring[(i + 2) % n]
    if (a === undefined || b === undefined) continue
    const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
    if (relatePointToRing(m, ring, eps) === 'inside') return m
  }
  const bb = boundingBox(ring)
  for (let r = 1; r < 12; r += 1) {
    const y = bb.minY + ((bb.maxY - bb.minY) * r) / 12
    for (let c = 1; c < 24; c += 1) {
      const p = { x: bb.minX + ((bb.maxX - bb.minX) * c) / 24, y }
      if (relatePointToRing(p, ring, eps) === 'inside') return p
    }
  }
  return null
}

/**
 * Do two rings share interior area? Touching along an edge is NOT overlap.
 *
 * Vertex classification alone is not enough: for two IDENTICAL rings every vertex
 * of each lies on the other's boundary, which reads as "touching" and would let
 * two buildings occupy the same footprint. An interior sample settles it.
 */
export function ringsOverlap(a: readonly Pt[], b: readonly Pt[], eps: number): boolean {
  const rel = relateRings(a, b, eps)
  if (rel === 'crossing' || rel === 'strictly-inside' || rel === 'contains') return true
  const ia = interiorPoint(a, eps)
  if (ia !== null && relatePointToRing(ia, b, eps) === 'inside') return true
  const ib = interiorPoint(b, eps)
  if (ib !== null && relatePointToRing(ib, a, eps) === 'inside') return true
  return false
}

/** Inward normal of edge a→b for a counter-clockwise ring. */
export function inwardNormal(a: Pt, b: Pt): Pt {
  const e = sub(b, a)
  const len = Math.hypot(e.x, e.y) || 1
  return { x: -e.y / len, y: e.x / len }
}

export function ringsTouch(a: readonly Pt[], b: readonly Pt[], eps: number): boolean {
  return relateRings(a, b, eps) === 'touching'
}

// -------------------------------- orientation -------------------------------

export function asCounterClockwise(ring: readonly Pt[]): Pt[] {
  return signedArea(ring) < 0 ? [...ring].reverse() : [...ring]
}

export function asClockwise(ring: readonly Pt[]): Pt[] {
  return signedArea(ring) > 0 ? [...ring].reverse() : [...ring]
}

// ------------------------------ inward offset -------------------------------

/**
 * Offset a simple ring inward by a per-edge distance.
 *
 * Method: shift each edge's supporting line inward, then intersect consecutive
 * offset lines to get new vertices. This is correct for both convex and concave
 * rings, which matters — clipping against half-planes would silently convexify a
 * notched plot and let a building sit in the notch.
 *
 * Returns null when the offset collapses: no vertices, inverted winding, or an
 * area that vanishes. A collapsed envelope is reported, never shrunk to fit.
 */
export function offsetRingInward(
  ring: readonly Pt[],
  distanceForEdge: readonly number[],
  eps: number,
): Pt[] | null {
  const n = ring.length
  if (n < 3) return null
  const ccw = signedArea(ring) > 0 ? ring : [...ring].reverse()
  const dists = signedArea(ring) > 0
    ? distanceForEdge
    // Reversing the ring re-indexes edges: old edge i (v_i→v_i+1) becomes
    // new edge n-2-i. Keep each distance attached to its own edge.
    : distanceForEdge.map((_, i) => distanceForEdge[(n - 2 - i + n) % n] ?? 0)

  interface Line { p: Pt; d: Pt }
  const lines: Line[] = []
  for (let i = 0; i < n; i += 1) {
    const a = ccw[i]
    const b = ccw[(i + 1) % n]
    if (a === undefined || b === undefined) return null
    const edge = sub(b, a)
    const len = Math.hypot(edge.x, edge.y)
    if (len <= eps) return null
    // For a CCW ring the interior is to the left of travel: normal = (-dy, dx).
    const nx = -edge.y / len
    const ny = edge.x / len
    const d = dists[i] ?? 0
    lines.push({ p: { x: a.x + nx * d, y: a.y + ny * d }, d: edge })
  }

  // Track which two offset lines produced each vertex, so the clearance check
  // below can compare against the right setback distances after dedup.
  const raw: { p: Pt; prevLine: number; currLine: number }[] = []
  for (let i = 0; i < n; i += 1) {
    const prevIdx = (i - 1 + n) % n
    const prev = lines[prevIdx]
    const curr = lines[i]
    if (prev === undefined || curr === undefined) return null
    const hit = intersectionPoint(
      prev.p, { x: prev.p.x + prev.d.x, y: prev.p.y + prev.d.y },
      curr.p, { x: curr.p.x + curr.d.x, y: curr.p.y + curr.d.y },
    )
    if (hit === null) {
      // Parallel consecutive edges are a straight-through survey vertex. When
      // their setbacks differ, one diagonal bridge would violate the larger
      // setback over most of its source edge. Preserve the discontinuity as a
      // step: the previous offset reaches the source vertex, then a connector
      // moves to the current offset.
      const prevAtVertex = {
        x: prev.p.x + prev.d.x,
        y: prev.p.y + prev.d.y,
      }
      if (!samePoint(prevAtVertex, curr.p, eps)) {
        raw.push({
          p: prevAtVertex,
          prevLine: prevIdx,
          currLine: prevIdx,
        })
        raw.push({ p: curr.p, prevLine: i, currLine: i })
      } else {
        raw.push({ p: curr.p, prevLine: prevIdx, currLine: i })
      }
      continue
    }
    if (!Number.isFinite(hit.x) || !Number.isFinite(hit.y)) return null
    raw.push({ p: hit, prevLine: prevIdx, currLine: i })
  }

  const kept: typeof raw = []
  for (const entry of raw) {
    const last = kept[kept.length - 1]
    if (last === undefined || !samePoint(entry.p, last.p, eps)) kept.push(entry)
  }
  if (kept.length >= 2) {
    const first = kept[0]
    const last = kept[kept.length - 1]
    if (first !== undefined && last !== undefined && samePoint(first.p, last.p, eps)) kept.pop()
  }
  if (kept.length < 3) return null
  const deduped = kept.map((k) => k.p)

  // Winding must survive.
  if (signedArea(deduped) <= eps) return null
  if (checkRing(deduped, eps).defect !== null) return null

  // Every offset vertex must still stand at least its own setback clear of the
  // ORIGINAL boundary.
  //
  // Winding alone does not catch an over-inset polygon: inset a 10 m square by
  // 6 m on all four sides and the offset lines cross TWICE, so the result has
  // positive area (4 m²) and correct winding while sitting only 4 m from the
  // boundary it was supposed to be 6 m clear of. A double inversion preserves
  // orientation, so orientation cannot be the test.
  for (let i = 0; i < kept.length; i += 1) {
    const entry = kept[i]
    if (entry === undefined) continue
    const need = Math.min(dists[entry.prevLine] ?? 0, dists[entry.currLine] ?? 0)
    if (need <= 0) continue
    let closest = Infinity
    for (let j = 0; j < ccw.length; j += 1) {
      const a = ccw[j]
      const b = ccw[(j + 1) % ccw.length]
      if (a === undefined || b === undefined) continue
      const d = distToSegment(entry.p, a, b)
      if (d < closest) closest = d
    }
    if (closest < need - Math.max(eps, need * 1e-9)) return null
  }

  // And the offset must lie within the plot, never escape it.
  for (const p of deduped) {
    if (relatePointToRing(p, ccw, eps) === 'outside') return null
  }
  return deduped
}

// --------------------------- polygon difference ------------------------------

export interface PolygonShape {
  outer: Pt[]
  holes: Pt[][]
}

/**
 * Subtract `cutters` from `subject`, returning components and their voids.
 *
 * Fragment-classification method: split every edge at all crossings, keep the
 * subject fragments that lie outside all cutters plus the cutter fragments that
 * lie inside the subject, then trace closed contours and sort them into shells
 * and voids by containment. This preserves the distinction a flat ring list
 * cannot express — two buildable components versus one component with a hole.
 */
function subtractPolygonsLegacy(
  subject: readonly Pt[],
  cutters: readonly (readonly Pt[])[],
  eps: number,
): PolygonShape[] {
  const active = cutters.filter((c) => c.length >= 3 && area(c) > eps * eps)
  if (active.length === 0) return [{ outer: [...subject], holes: [] }]

  const subj = asCounterClockwise(subject)
  const cuts = active.map((c) => asCounterClockwise(c))

  // Each fragment remembers its PARENT edge so a shared-boundary fragment can be
  // classified by comparing inward normals rather than by a point test that
  // cannot distinguish "on the edge from inside" from "on the edge from outside".
  type Seg = { a: Pt; b: Pt; pa: Pt; pb: Pt }
  const fragments: Seg[] = []

  const splitAgainst = (ring: readonly Pt[], others: readonly (readonly Pt[])[]): Seg[] => {
    const segs: Seg[] = []
    for (let i = 0; i < ring.length; i += 1) {
      const a = ring[i]
      const b = ring[(i + 1) % ring.length]
      if (a === undefined || b === undefined) continue
      const cutsAt: number[] = [0, 1]
      const ab = sub(b, a)
      const len2 = dot(ab, ab)
      if (len2 === 0) continue
      for (const other of others) {
        for (let j = 0; j < other.length; j += 1) {
          const c = other[j]
          const d = other[(j + 1) % other.length]
          if (c === undefined || d === undefined) continue
          const rel = relateSegments(a, b, c, d, eps)
          if (rel === 'disjoint') continue
          const hit = intersectionPoint(a, b, c, d)
          if (hit !== null && Number.isFinite(hit.x) && Number.isFinite(hit.y)) {
            const t = dot(sub(hit, a), ab) / len2
            if (t > 0 && t < 1) cutsAt.push(t)
          }
          // Collinear overlap: also cut at the other segment's endpoints.
          if (rel === 'collinear-overlap' || rel === 'touch') {
            for (const q of [c, d]) {
              const t = dot(sub(q, a), ab) / len2
              if (t > 0 && t < 1 && distToSegment(q, a, b) <= eps) cutsAt.push(t)
            }
          }
        }
      }
      cutsAt.sort((p, q) => p - q)
      for (let k = 0; k + 1 < cutsAt.length; k += 1) {
        const t0 = cutsAt[k]
        const t1 = cutsAt[k + 1]
        if (t0 === undefined || t1 === undefined || t1 - t0 < 1e-12) continue
        const p0 = { x: a.x + ab.x * t0, y: a.y + ab.y * t0 }
        const p1 = { x: a.x + ab.x * t1, y: a.y + ab.y * t1 }
        if (dist(p0, p1) > eps) segs.push({ a: p0, b: p1, pa: a, pb: b })
      }
    }
    return segs
  }

  const mid = (s: Seg): Pt => ({ x: (s.a.x + s.b.x) / 2, y: (s.a.y + s.b.y) / 2 })

  /** Does `other` locally lie on the same side of this fragment as the parent
   *  ring's interior? If so the fragment is a shared boundary, not an outer one. */
  const sharesInteriorSide = (s: Seg, other: readonly Pt[]): boolean => {
    const m = mid(s)
    const parentNormal = inwardNormal(s.pa, s.pb)
    for (let j = 0; j < other.length; j += 1) {
      const c = other[j]
      const d = other[(j + 1) % other.length]
      if (c === undefined || d === undefined) continue
      if (!onSegment(m, c, d, eps)) continue
      const otherNormal = inwardNormal(c, d)
      if (dot(parentNormal, otherNormal) > 0) return true
    }
    return false
  }

  // Subject fragments outside every cutter. A fragment lying ON a cutter's edge is
  // dropped when the cutter's interior faces the same way as the subject's —
  // that is a shared boundary, which A\B does not keep.
  for (const s of splitAgainst(subj, cuts)) {
    const m = mid(s)
    let drop = false
    for (const c of cuts) {
      const rel = relatePointToRing(m, c, eps)
      if (rel === 'inside') { drop = true; break }
      if (rel === 'boundary' && sharesInteriorSide(s, c)) { drop = true; break }
    }
    if (!drop) fragments.push(s)
  }
  // Cutter fragments inside the subject, reversed so the void winds the other way.
  for (const c of cuts) {
    for (const s of splitAgainst(c, [subj, ...cuts.filter((o) => o !== c)])) {
      const m = mid(s)
      const rel = relatePointToRing(m, subj, eps)
      if (rel === 'outside') continue
      if (rel === 'boundary' && sharesInteriorSide(s, subj)) continue
      if (cuts.some((o) => o !== c && relatePointToRing(m, o, eps) === 'inside')) continue
      fragments.push({ a: s.b, b: s.a, pa: s.pb, pb: s.pa })
    }
  }

  // Trace contours by chaining fragments end-to-start.
  const used = new Array<boolean>(fragments.length).fill(false)
  const contours: Pt[][] = []
  for (let i = 0; i < fragments.length; i += 1) {
    if (used[i] === true) continue
    const start = fragments[i]
    if (start === undefined) continue
    used[i] = true
    const contour: Pt[] = [start.a, start.b]
    let cursor = start.b
    let guard = 0
    while (guard < fragments.length * 4) {
      guard += 1
      let bestIdx = -1
      let bestDist = Infinity
      for (let j = 0; j < fragments.length; j += 1) {
        if (used[j] === true) continue
        const f = fragments[j]
        if (f === undefined) continue
        const d = dist(cursor, f.a)
        if (d <= eps * 10 && d < bestDist) {
          bestDist = d
          bestIdx = j
        }
      }
      if (bestIdx < 0) break
      const next = fragments[bestIdx]
      if (next === undefined) break
      used[bestIdx] = true
      cursor = next.b
      if (samePoint(cursor, contour[0] ?? cursor, eps * 10)) break
      contour.push(cursor)
    }
    const cleaned: Pt[] = []
    for (const p of contour) {
      const last = cleaned[cleaned.length - 1]
      if (last === undefined || !samePoint(p, last, eps)) cleaned.push(p)
    }
    if (cleaned.length >= 3 && area(cleaned) > eps * eps) contours.push(cleaned)
  }

  // Sort contours into shells (CCW) and voids (CW), then nest voids.
  const shells: Pt[][] = []
  const voids: Pt[][] = []
  for (const c of contours) {
    if (signedArea(c) > 0) shells.push(c)
    else voids.push([...c].reverse())
  }
  if (shells.length === 0) return []

  shells.sort((a, b) => area(b) - area(a))
  const result: PolygonShape[] = shells.map((outer) => ({ outer, holes: [] }))
  for (const v of voids) {
    const probe = v[0]
    if (probe === undefined) continue
    let target: PolygonShape | undefined
    let smallest = Infinity
    for (const shape of result) {
      if (relatePointToRing(probe, shape.outer, eps) !== 'outside') {
        const a = area(shape.outer)
        if (a < smallest) {
          smallest = a
          target = shape
        }
      }
    }
    if (target !== undefined) target.holes.push(v)
  }
  return result
}

function toClipRing(ring: readonly Pt[]): ClipPair[] {
  const out: ClipPair[] = ring.map((point) => [point.x, point.y])
  const first = out[0]
  const last = out[out.length - 1]
  if (
    first !== undefined
    && last !== undefined
    && (first[0] !== last[0] || first[1] !== last[1])
  ) {
    out.push([first[0], first[1]])
  }
  return out
}

function fromClipRing(ring: readonly ClipPair[], eps: number): Pt[] {
  const out = ring.map(([x, y]) => ({ x, y }))
  const first = out[0]
  const last = out[out.length - 1]
  if (
    first !== undefined
    && last !== undefined
    && samePoint(first, last, eps)
  ) {
    out.pop()
  }
  return out
}

/**
 * Robust polygon difference for construction geometry.
 *
 * Boolean overlay is delegated to the Martinez-Rueda implementation in
 * `polygon-clipping`; the local fragment tracer remains below only as readable
 * historical evidence of why this dependency was adopted. The library unions
 * duplicate/overlapping cutters and retains cutter holes before performing one
 * difference, avoiding double-subtraction and invented closing edges.
 */
export function subtractPolygons(
  subject: readonly Pt[],
  cutters: readonly PolygonShape[],
  eps: number,
): PolygonShape[] {
  if (cutters.length === 0) return [{ outer: [...subject], holes: [] }]
  const subjectPolygon: ClipPolygon = [toClipRing(subject)]
  const cutterPolygons: ClipPolygon[] = cutters.map((cutter) => [
    toClipRing(cutter.outer),
    ...cutter.holes.map(toClipRing),
  ])

  const difference = polygonDifference(subjectPolygon, ...cutterPolygons)
  const result: PolygonShape[] = []
  for (const polygon of difference) {
    const outerCoordinates = polygon[0]
    if (outerCoordinates === undefined) continue
    const outer = asCounterClockwise(fromClipRing(outerCoordinates, eps))
    if (
      outer.length < 3
      || area(outer) <= eps * eps
      || checkRing(outer, eps).defect !== null
    ) {
      continue
    }
    const holes: Pt[][] = []
    for (const holeCoordinates of polygon.slice(1)) {
      const hole = asClockwise(fromClipRing(holeCoordinates, eps))
      if (
        hole.length >= 3
        && area(hole) > eps * eps
        && checkRing(hole, eps).defect === null
      ) {
        holes.push(hole)
      }
    }
    result.push({ outer, holes })
  }
  return result
}

void subtractPolygonsLegacy

/** Is `ring` wholly within a shape (inside the outer, outside every hole)? */
export type ShapeContainment = 'inside' | 'vertex-outside' | 'edge-crosses' | 'in-void'

export function containRingInShapes(
  ring: readonly Pt[],
  shapes: readonly PolygonShape[],
  eps: number,
): ShapeContainment {
  if (shapes.length === 0) return 'vertex-outside'

  // A ring wholly inside a void is a distinct, more informative failure. Do not
  // return it yet: Boolean difference can represent an island inside that void
  // as a second buildable component, and that component must win.
  const probe = interiorPoint(ring, eps)
  let liesInVoid = false
  for (const shape of shapes) {
    for (const hole of shape.holes) {
      if (relateRings(ring, hole, eps) === 'strictly-inside') liesInVoid = true
      if (probe !== null && relatePointToRing(probe, hole, eps) === 'inside') {
        liesInVoid = true
      }
    }
  }

  let crossesBuildableBoundary = false
  for (const shape of shapes) {
    const allVerticesIn = ring.every(
      (p) => relatePointToRing(p, shape.outer, eps) !== 'outside',
    )
    if (!allVerticesIn) continue

    const crossesOuter = ringCrossesRing(ring, shape.outer, eps)
    const hitsHole = shape.holes.some(
      (h) => ringsOverlap(ring, h, eps) || ringCrossesRing(ring, h, eps),
    )
    if (!crossesOuter && !hitsHole) return 'inside'
    if (crossesOuter || hitsHole) crossesBuildableBoundary = true
  }

  if (liesInVoid) return 'in-void'
  if (crossesBuildableBoundary) return 'edge-crosses'

  // No shape held every vertex. Decide which failure is the honest one: if some
  // vertex lies outside all shapes it is a vertex failure, otherwise the ring
  // spans between components and its edges must be leaving the envelope.
  const someVertexOutsideAll = ring.some((p) =>
    shapes.every((s) => relatePointToRing(p, s.outer, eps) === 'outside'),
  )
  return someVertexOutsideAll ? 'vertex-outside' : 'edge-crosses'
}

export function ringCrossesRing(a: readonly Pt[], b: readonly Pt[], eps: number): boolean {
  for (let i = 0; i < a.length; i += 1) {
    const a1 = a[i]
    const a2 = a[(i + 1) % a.length]
    if (a1 === undefined || a2 === undefined) continue
    for (let j = 0; j < b.length; j += 1) {
      const b1 = b[j]
      const b2 = b[(j + 1) % b.length]
      if (b1 === undefined || b2 === undefined) continue
      if (relateSegments(a1, a2, b1, b2, eps) === 'proper-cross') return true
    }
  }
  return false
}

/** Aspect ratio of the bounding box, and the closest approach of two
 *  non-adjacent edges — the two sliver signals in the contract. */
export function sliverMetrics(ring: readonly Pt[]): {
  aspectRatio: number
  minEdgeSeparation: number
} {
  const bb = boundingBox(ring)
  const w = bb.maxX - bb.minX
  const h = bb.maxY - bb.minY
  const short = Math.min(w, h)
  const long = Math.max(w, h)
  const aspectRatio = short <= 0 ? Infinity : long / short

  let minSep = Infinity
  const n = ring.length
  for (let i = 0; i < n; i += 1) {
    for (let j = i + 2; j < n; j += 1) {
      if (i === 0 && j === n - 1) continue
      const a1 = ring[i]
      const a2 = ring[(i + 1) % n]
      const b1 = ring[j]
      const b2 = ring[(j + 1) % n]
      if (!a1 || !a2 || !b1 || !b2) continue
      const d = Math.min(
        distToSegment(a1, b1, b2), distToSegment(a2, b1, b2),
        distToSegment(b1, a1, a2), distToSegment(b2, a1, a2),
      )
      if (d < minSep) minSep = d
    }
  }
  return { aspectRatio, minEdgeSeparation: minSep }
}
