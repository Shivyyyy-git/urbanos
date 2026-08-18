// Community One layout engine. Deterministic and rule-driven: every binding
// dimension comes from a selected rulebook entry; the only free choices are
// the layout *strategy* (double-loaded rows filling south-to-north, green
// band at the front, amenity parcel east of the spine), which is engine
// design, not a jurisdiction value. Strategy dimensions (amenity depth, pool
// and club sizing, gate depth, segment breaks) are derived from rule values
// so THD-08's novel-value probes move them measurably.

import { fail } from './errors.ts'
import {
  ceilDecimetre,
  rectArea,
  rectContains,
  rectRing,
  rectsOverlap,
  roundM,
  type Point,
  type Rect,
} from './geom.ts'
import { sha256 } from './hash.ts'
import type { DemoSiteFixture } from './fixture.ts'
import {
  SQUARE_METRES_PER_ACRE,
  type DemoRuleSlot,
  type ResolvedDemoRulebook,
} from './rulebook.ts'

export type FeatureClass =
  | 'site-boundary'
  | 'envelope'
  | 'road-primary'
  | 'road-secondary'
  | 'plot'
  | 'green'
  | 'amenity'
  | 'club'
  | 'pool'
  | 'gate'
  | 'parking'

export interface CommunityFeature {
  readonly id: string
  readonly featureClass: FeatureClass
  readonly rect: Rect
}

export interface CommunityMeasures {
  readonly siteAreaSqm: number
  readonly siteAreaAcres: number
  readonly envelope: Rect
  readonly densityCeilingDu: number
  readonly coverageCapSqm: number
  readonly coverageCapDuEquivalent: number
  readonly geometricFillDu: number
  readonly placedDu: number
  readonly builtFootprintSqm: number
  readonly greenAreaSqm: number
  readonly greenRequiredSqm: number
  readonly amenityAreaSqm: number
  readonly amenityRequiredSqm: number
  readonly requiredParkingEcs: number
  /** Whole spaces drawn under each home's stilt (floor of the active rate). */
  readonly onPlotEcsPerHome: number
  /** Shared visitor bays drawn for the rate's fractional remainder. */
  readonly sharedEcsDrawn: number
  /** True only when every required ECS exists as canonical PARKING geometry. */
  readonly parkingDrawn: boolean
  readonly shortfallDu: number
  /** Entry ids of the constraints that actually limited the placed count. */
  readonly bindingEntryIds: readonly string[]
  readonly bindingDescription: string
}

export interface CommunityLayout {
  readonly slice: string
  readonly features: readonly CommunityFeature[]
  readonly measures: CommunityMeasures
  readonly geometryDigest: string
  /** Tree-canopy decor: rendered, manifest-listed, gate-verified; never a
   * planning feature and never part of any measured rule check. */
  readonly decor: readonly DecorFeature[]
}

export function validateSiteFixture(site: DemoSiteFixture): void {
  const require = (condition: boolean, field: string, present: boolean): void => {
    if (!condition) {
      if (!present) fail('E_INPUT_MISSING', `Required fixture field "${field}" is absent.`, field)
      fail('E_INPUT_INVALID', `Fixture field "${field}" is unusable.`, field)
    }
  }
  const s = site as Partial<DemoSiteFixture> | null | undefined
  if (!s || typeof s !== 'object') fail('E_INPUT_MISSING', 'No site fixture supplied.', 'site')
  require(s.widthM !== undefined && s.widthM !== null, 'site.widthM', false)
  require(typeof s.widthM === 'number' && Number.isFinite(s.widthM) && s.widthM! > 0, 'site.widthM', true)
  require(s.depthM !== undefined && s.depthM !== null, 'site.depthM', false)
  require(typeof s.depthM === 'number' && Number.isFinite(s.depthM) && s.depthM! > 0, 'site.depthM', true)
  require(s.northBearingDeg !== undefined && s.northBearingDeg !== null, 'site.northBearingDeg', false)
  require(s.northBearingDeg === 0, 'site.northBearingDeg', true)
  require(s.accessRoad !== undefined && s.accessRoad !== null, 'site.accessRoad', false)
  require(s.accessRoad!.edge !== undefined, 'site.accessRoad.edge', false)
  require(s.accessRoad!.edge === 'south', 'site.accessRoad.edge', true)
  require(s.accessRoad!.widthM !== undefined && s.accessRoad!.widthM !== null, 'site.accessRoad.widthM', false)
  require(
    typeof s.accessRoad!.widthM === 'number'
      && Number.isFinite(s.accessRoad!.widthM)
      && s.accessRoad!.widthM > 0,
    'site.accessRoad.widthM',
    true,
  )
  require(
    s.requestedDwellingUnits !== undefined && s.requestedDwellingUnits !== null,
    'site.requestedDwellingUnits',
    false,
  )
  require(
    typeof s.requestedDwellingUnits === 'number'
      && Number.isInteger(s.requestedDwellingUnits)
      && s.requestedDwellingUnits > 0,
    'site.requestedDwellingUnits',
    true,
  )
}

/** Decorative tree canopy (octagon ring) — presentation/preview/DXF decor,
 * listed in the parity manifest and gate-verified, never a planning feature. */
export interface DecorFeature {
  readonly id: string
  /** Render class: never a planning feature, never a measured rule input. */
  readonly kind: 'tree' | 'building' | 'paving' | 'water' | 'lawn' | 'shadow' | 'marking'
  readonly ring: readonly Point[]
}

function circle(centreX: number, centreY: number, radius: number, segments = 16): readonly Point[] {
  const ring: Point[] = []
  for (let step = 0; step < segments; step += 1) {
    const angle = (2 * Math.PI * step) / segments
    ring.push([roundM(centreX + radius * Math.cos(angle)), roundM(centreY + radius * Math.sin(angle))])
  }
  return ring
}

/** Curved strip approximating an arc — used for promenades and sweeps. */
function arcStrip(
  centreX: number,
  centreY: number,
  radius: number,
  halfWidth: number,
  fromAngle: number,
  toAngle: number,
  segments = 18,
): readonly Point[] {
  const outer: Point[] = []
  const inner: Point[] = []
  for (let step = 0; step <= segments; step += 1) {
    const angle = fromAngle + ((toAngle - fromAngle) * step) / segments
    outer.push([roundM(centreX + (radius + halfWidth) * Math.cos(angle)), roundM(centreY + (radius + halfWidth) * Math.sin(angle))])
    inner.push([roundM(centreX + (radius - halfWidth) * Math.cos(angle)), roundM(centreY + (radius - halfWidth) * Math.sin(angle))])
  }
  return [...outer, ...inner.reverse()]
}

function octagon(centreX: number, centreY: number, radius: number): readonly Point[] {
  const ring: Point[] = []
  for (let step = 0; step < 8; step += 1) {
    const angle = (Math.PI / 4) * step + Math.PI / 8
    ring.push([roundM(centreX + radius * Math.cos(angle)), roundM(centreY + radius * Math.sin(angle))])
  }
  return ring
}

export function buildCommunityLayout(
  site: DemoSiteFixture,
  rulebook: ResolvedDemoRulebook,
): CommunityLayout {
  validateSiteFixture(site)
  const rule = (slot: DemoRuleSlot): number => rulebook.bySlot[slot].value
  const ruleId = (slot: DemoRuleSlot): string => rulebook.bySlot[slot].id

  const W = site.widthM
  const H = site.depthM
  const siteArea = W * H
  const sbP = rule('setback-periphery')
  const sbF = rule('setback-front')
  const Wp = rule('road-width-primary')
  const Ws = rule('road-width-secondary')
  const F = rule('unit-plot-frontage-min')
  const D = rule('unit-plot-depth-min')
  const rowMax = rule('row-length-max')

  const env: Rect = { x: sbP, y: sbF, w: W - 2 * sbP, h: H - sbF - sbP }
  if (env.w <= 0 || env.h <= 0) {
    fail('E_INPUT_INVALID', 'Setbacks consume the site; no buildable envelope remains.', 'envelope')
  }

  // --- Entry boulevard: two primary carriageways around a green median ----
  const cx = W / 2
  const boulevardWidth = 2 * Wp + Ws
  const bx0 = roundM(cx - boulevardWidth / 2)
  const bx1 = roundM(cx + boulevardWidth / 2)

  // --- Perimeter green ring: one lane deep by design, thickened just enough
  // for the slice's open-space minimum (deterministic 0.5 m search) --------
  const amenityRequired = (rule('amenity-share-min') / 100) * siteArea
  const greenRequiredMin = (rule('open-space-min') / 100) * siteArea
  const greenEstimate = (t: number): number => {
    const eastW = env.x + env.w - t - bx1
    const parkD = Math.max(4 * D, Math.ceil((amenityRequired / (0.8 * eastW)) * 10) / 10)
    const amenW = Math.ceil((amenityRequired / parkD) * 10) / 10
    const parkWestW = bx0 - (env.x + t)
    const parkEastW = env.x + env.w - t - (bx1 + amenW)
    return (
      (env.w - boulevardWidth) * t // bottom ring, carved at the boulevard
      + env.w * t // top ring, full width
      + 2 * t * (env.h - 2 * t) // side belts
      + Ws * (env.h - t) // boulevard median
      + (parkWestW + Math.max(0, parkEastW)) * parkD // park spine
    )
  }
  let ringT = Ws
  while (greenEstimate(ringT) < greenRequiredMin && ringT < 6 * Ws) {
    ringT = roundM(ringT + 0.5)
  }
  if (greenEstimate(ringT) < greenRequiredMin) {
    fail('E_INPUT_INVALID', 'The composed open-space system cannot reach the open-space minimum.', 'open-space-min')
  }

  const inner: Rect = { x: env.x + ringT, y: env.y + ringT, w: env.w - 2 * ringT, h: env.h - 2 * ringT }
  const innerTop = inner.y + inner.h
  const innerRight = inner.x + inner.w
  const carriageWest: Rect = { x: bx0, y: 0, w: Wp, h: innerTop }
  const carriageEast: Rect = { x: bx1 - Wp, y: 0, w: Wp, h: innerTop }
  const median: Rect = { x: bx0 + Wp, y: env.y, w: Ws, h: innerTop - env.y }
  const gate: Rect = { x: bx0, y: 0, w: boulevardWidth, h: Ws / 3 }

  // --- Central park spine with the amenity centerpiece east of the median -
  const eastWidth = innerRight - bx1
  const westWidth = bx0 - inner.x
  if (eastWidth < 3 * F || westWidth < 3 * F) {
    fail('E_INPUT_INVALID', 'The boulevard leaves no usable quarter width.', 'road-width-primary')
  }
  const parkDepth = roundM(Math.max(
    4 * D,
    Math.ceil((amenityRequired / (0.8 * eastWidth)) * 10) / 10,
  ))
  const bandY0 = roundM(inner.y + (inner.h - parkDepth) / 2)
  const bandY1 = roundM(bandY0 + parkDepth)
  const amenityWidth = ceilDecimetre(amenityRequired / parkDepth)
  const amenity: Rect = { x: bx1, y: bandY0, w: amenityWidth, h: parkDepth }
  if (amenity.x + amenity.w > innerRight + 1e-9 || bandY1 > innerTop + 1e-9) {
    fail('E_INPUT_INVALID', 'Amenity centerpiece does not fit the park spine.', 'amenity-share-min')
  }
  const parkWest: Rect = { x: inner.x, y: bandY0, w: westWidth, h: parkDepth }
  const parkEast: Rect = { x: amenity.x + amenity.w, y: bandY0, w: innerRight - (amenity.x + amenity.w), h: parkDepth }

  // Club + pool composed as the centerpiece inside the amenity parcel.
  // The heart is composed to its parcel, not dropped in as two boxes: the
  // club sits on the parcel's centre line with the pool beside it, both
  // scaled to the parcel so they read as destinations (ledger 053 P1-4).
  const heartCentreY = roundM(bandY0 + parkDepth / 2)
  const clubW = roundM(Math.max(4 * F, amenity.w * 0.17))
  const clubH = roundM(Math.min(2.8 * D, parkDepth * 0.62))
  const poolW = roundM(Math.max(2 * F, amenity.w * 0.075))
  const poolH = roundM(clubH * 0.55)
  const clubX = roundM(amenity.x + amenity.w * 0.22)
  const club: Rect = { x: clubX, y: roundM(heartCentreY - clubH / 2), w: clubW, h: clubH }
  const pool: Rect = {
    x: roundM(clubX + clubW + Math.max(F, amenity.w * 0.03)),
    y: roundM(heartCentreY - poolH / 2),
    w: poolW,
    h: poolH,
  }
  if (!rectContains(amenity, club) || !rectContains(amenity, pool)) {
    fail('E_INPUT_INVALID', 'Club/pool centerpiece does not fit the amenity parcel.', 'amenity-share-min')
  }

  // --- Perimeter ring rects (bottom ring carved around the boulevard) ----
  const greens: CommunityFeature[] = [
    { id: 'green-ring-s-west', featureClass: 'green', rect: { x: env.x, y: env.y, w: bx0 - env.x, h: ringT } },
    { id: 'green-ring-s-east', featureClass: 'green', rect: { x: bx1, y: env.y, w: env.x + env.w - bx1, h: ringT } },
    { id: 'green-ring-n', featureClass: 'green', rect: { x: env.x, y: innerTop, w: env.w, h: ringT } },
    { id: 'green-ring-w', featureClass: 'green', rect: { x: env.x, y: inner.y, w: ringT, h: inner.h } },
    { id: 'green-ring-e', featureClass: 'green', rect: { x: innerRight, y: inner.y, w: ringT, h: inner.h } },
    { id: 'green-median', featureClass: 'green', rect: median },
    { id: 'green-west', featureClass: 'green', rect: parkWest },
    { id: 'green-east', featureClass: 'green', rect: parkEast },
  ]

  // --- Four residential quarters with alternating row orientation --------
  interface Quarter {
    readonly tag: string
    readonly rect: Rect
    readonly orientation: 'horizontal' | 'vertical'
    /** Fill premium rows first: nearest the park (horizontal quarters) or
     * the boulevard (vertical quarters). */
    readonly fillReversed: boolean
  }
  const quarters: Quarter[] = [
    { tag: 'sw', rect: { x: inner.x, y: inner.y, w: westWidth, h: bandY0 - inner.y }, orientation: 'horizontal', fillReversed: true },
    { tag: 'se', rect: { x: bx1, y: inner.y, w: eastWidth, h: bandY0 - inner.y }, orientation: 'vertical', fillReversed: false },
    { tag: 'nw', rect: { x: inner.x, y: bandY1, w: westWidth, h: innerTop - bandY1 }, orientation: 'vertical', fillReversed: true },
    { tag: 'ne', rect: { x: bx1, y: bandY1, w: eastWidth, h: innerTop - bandY1 }, orientation: 'horizontal', fillReversed: false },
  ]

  const roads: CommunityFeature[] = []
  /** Per-row bookkeeping so unused frontage becomes labelled landscape, never
   * a residual generator void (ledger 053 P0-1). */
  interface RowRecord {
    readonly band: Rect
    readonly alongAxis: 'x' | 'y'
    readonly plots: CommunityFeature[]
    /** Mews links (break gaps) inside the built run, keyed by along-position. */
    readonly gaps: { readonly at: number; readonly rect: Rect }[]
  }
  interface QuarterFill {
    readonly tag: string
    readonly rows: RowRecord[]
    /** Cul-de-sac bulbs, one per quiet lane, with the lane they terminate. */
    readonly bulbs: { readonly laneId: string; readonly rect: Rect }[]
    readonly courtStrip: Rect | null
    /** Across-remainder too shallow for another row module — landscaped. */
    readonly residual: Rect | null
    readonly acrossAxis: 'x' | 'y'
  }
  const quarterFills: QuarterFill[] = []

  const fillQuarter = (quarter: Quarter): QuarterFill => {
    const { tag, rect: q, orientation } = quarter
    const alongAxis = orientation === 'horizontal' ? 'x' : 'y'
    const acrossAxis = orientation === 'horizontal' ? 'y' : 'x'
    // Loop road: a ring one lane wide just inside the quarter boundary.
    roads.push(
      { id: `road-secondary-${tag}-loop-s`, featureClass: 'road-secondary', rect: { x: q.x, y: q.y, w: q.w, h: Ws } },
      { id: `road-secondary-${tag}-loop-n`, featureClass: 'road-secondary', rect: { x: q.x, y: q.y + q.h - Ws, w: q.w, h: Ws } },
      { id: `road-secondary-${tag}-loop-w`, featureClass: 'road-secondary', rect: { x: q.x, y: q.y + Ws, w: Ws, h: q.h - 2 * Ws } },
      { id: `road-secondary-${tag}-loop-e`, featureClass: 'road-secondary', rect: { x: q.x + q.w - Ws, y: q.y + Ws, w: Ws, h: q.h - 2 * Ws } },
    )
    const interior: Rect = { x: q.x + Ws, y: q.y + Ws, w: q.w - 2 * Ws, h: q.h - 2 * Ws }
    const empty: QuarterFill = { tag, rows: [], bulbs: [], courtStrip: null, residual: null, acrossAxis }
    if (interior.w < F || interior.h < F) return empty

    // Transposable fill: "along" = the row direction, "across" = the fill
    // direction. Quiet lanes run along; rows are double-loaded around them.
    const along = orientation === 'horizontal' ? interior.w : interior.h
    const across = orientation === 'horizontal' ? interior.h : interior.w
    const placeRect = (a0: number, c0: number, aLen: number, cLen: number): Rect =>
      orientation === 'horizontal'
        ? { x: roundM(interior.x + a0), y: roundM(interior.y + c0), w: roundM(aLen), h: roundM(cLen) }
        : { x: roundM(interior.x + c0), y: roundM(interior.y + a0), w: roundM(cLen), h: roundM(aLen) }

    // CIRCULATION HIERARCHY (053 P0-2): quiet lanes leave the loop, run
    // inward, and STOP — terminating in a cul-de-sac bulb inside a court
    // strip reserved at the quarter's far end. Nothing runs wall to wall.
    const courtDepth = along >= 6 * F + D ? roundM(D) : 0
    const alongUsable = roundM(along - courtDepth)
    const courtStrip = courtDepth > 0 ? placeRect(alongUsable, 0, courtDepth, across) : null

    const modulePitch = 2 * D + Ws
    const bulbs: { laneId: string; rect: Rect }[] = []
    let cursor = 0
    let laneIndex = 0
    const rowStarts: number[] = []
    const addLane = (laneAcross: number): void => {
      const laneId = `road-secondary-${tag}-lane-${laneIndex}`
      roads.push({ id: laneId, featureClass: 'road-secondary', rect: placeRect(0, laneAcross, alongUsable, Ws) })
      if (courtDepth > 0) {
        // Turning head: wider than the lane across, but its right-of-way
        // DEPTH stays the cited secondary width, so it is measurably a
        // secondary road and not a wider one.
        const flare = Math.min(F / 2, laneAcross, across - laneAcross - Ws)
        bulbs.push({
          laneId,
          rect: placeRect(alongUsable, laneAcross - flare, Ws, Ws + 2 * flare),
        })
      }
      laneIndex += 1
    }
    while (cursor + modulePitch <= across + 1e-9) {
      rowStarts.push(cursor)
      addLane(cursor + D)
      rowStarts.push(cursor + D + Ws)
      cursor += modulePitch
    }
    if (cursor + Ws + D <= across + 1e-9) {
      addLane(cursor)
      rowStarts.push(cursor + Ws)
      cursor += Ws + D
    }
    const residual = across - cursor > 1
      ? placeRect(0, cursor, alongUsable, across - cursor)
      : null

    // Rows -> plots: segments of at most row-length-max broken by a mews
    // link; break positions STAGGER per row so blocks read as a woven fabric
    // rather than a grid. Emission order is premium-first (park/boulevard
    // side), so a program cap empties the least prominent rows.
    const orderedRows = quarter.fillReversed ? [...rowStarts].reverse() : rowStarts
    const rows: RowRecord[] = orderedRows.map((rowStart, rowIndex) => {
      const record: RowRecord = {
        band: placeRect(0, rowStart, alongUsable, D),
        alongAxis,
        plots: [],
        gaps: [],
      }
      const stagger = (rowIndex % 2) * Math.min(3 * F, rowMax / 2)
      let position = 0
      let segmentLength = stagger > 0 ? rowMax - stagger : 0
      let plotIndex = 0
      while (position + F <= alongUsable + 1e-9) {
        if (segmentLength + F > rowMax + 1e-9) {
          record.gaps.push({ at: position, rect: placeRect(position, rowStart, Ws, D) })
          position += Ws
          segmentLength = 0
          continue
        }
        record.plots.push({
          id: `plot-${tag}-${String(rowIndex).padStart(2, '0')}-${String(plotIndex).padStart(2, '0')}`,
          featureClass: 'plot',
          rect: placeRect(position, rowStart, F, D),
        })
        position += F
        segmentLength += F
        plotIndex += 1
      }
      return record
    })
    return { tag, rows, bulbs, courtStrip, residual, acrossAxis }
  }
  for (const quarter of quarters) quarterFills.push(fillQuarter(quarter))
  const quarterPlotLists: CommunityFeature[][] = quarterFills.map((fill) =>
    fill.rows.flatMap((row) => row.plots),
  )
  const plotCandidates: CommunityFeature[] = quarterPlotLists.flat()

  // --- Program cap: place what the client asked for, never more ----------
  const siteAcres = siteArea / SQUARE_METRES_PER_ACRE
  const densityCeiling = Math.floor(siteAcres * rule('density-max'))
  const coverageCap = (rule('site-coverage-max') / 100) * siteArea
  const clubArea = rectArea(club)
  const coverageCapDu = Math.floor((coverageCap - clubArea) / (F * D))
  const geometricFill = plotCandidates.length
  const placedDu = Math.max(
    0,
    Math.min(geometricFill, densityCeiling, coverageCapDu, site.requestedDwellingUnits),
  )
  // Proportional quarter quotas: a program cap thins all four quarters
  // together (each keeps its premium park/boulevard-side rows) instead of
  // emptying the last quarter. Remainders go to the largest fractions,
  // ties broken by quarter order — fully deterministic.
  const totalCandidates = plotCandidates.length
  const quotas = quarterPlotLists.map((list) =>
    totalCandidates === 0 ? 0 : Math.floor((placedDu * list.length) / totalCandidates),
  )
  let assigned = quotas.reduce((sum, quota) => sum + quota, 0)
  const fractions = quarterPlotLists
    .map((list, index) => ({
      index,
      fraction: totalCandidates === 0 ? 0 : (placedDu * list.length) / totalCandidates - quotas[index]!,
    }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index)
  for (const { index } of fractions) {
    if (assigned >= placedDu) break
    if (quotas[index]! < quarterPlotLists[index]!.length) {
      quotas[index]! += 1
      assigned += 1
    }
  }
  const touches = (a: Rect, b: Rect): boolean => {
    const xOverlap = a.x < b.x + b.w - 1e-6 && b.x < a.x + a.w - 1e-6
    const yOverlap = a.y < b.y + b.h - 1e-6 && b.y < a.y + a.h - 1e-6
    const xAbut = Math.abs(a.x + a.w - b.x) < 1e-6 || Math.abs(b.x + b.w - a.x) < 1e-6
    const yAbut = Math.abs(a.y + a.h - b.y) < 1e-6 || Math.abs(b.y + b.h - a.y) < 1e-6
    return (xOverlap && yAbut) || (yOverlap && xAbut)
  }

  // Walk the quarters row by row, in the same premium-first order the quota
  // trims: keep the quota's plots, and give EVERY square metre the quota does
  // not use an intentional landscape identity — mews links inside a built
  // run, pocket parks on unused frontage, landscaped courts around the
  // cul-de-sac bulbs (ledger 053 P0-1: no residual generator voids).
  const plots: CommunityFeature[] = []
  const landscape: CommunityFeature[] = []
  const courtRoads: CommunityFeature[] = []
  let landscapeIndex = 0
  const addLandscape = (rect: Rect, kind: 'pocket' | 'court' | 'mews'): void => {
    if (rect.w < 1 || rect.h < 1) return
    landscape.push({
      id: `green-${kind}-${String(landscapeIndex).padStart(3, '0')}`,
      featureClass: 'green',
      rect: { x: roundM(rect.x), y: roundM(rect.y), w: roundM(rect.w), h: roundM(rect.h) },
    })
    landscapeIndex += 1
  }
  const sliceAcross = (strip: Rect, axis: 'x' | 'y', from: number, to: number): Rect =>
    axis === 'x'
      ? { x: from, y: strip.y, w: to - from, h: strip.h }
      : { x: strip.x, y: from, w: strip.w, h: to - from }

  quarterFills.forEach((fill, quarterIndex) => {
    let remaining = quotas[quarterIndex]!
    if (fill.residual) addLandscape(fill.residual, 'pocket')
    for (const row of fill.rows) {
      const keep = Math.max(0, Math.min(row.plots.length, remaining))
      remaining -= keep
      plots.push(...row.plots.slice(0, keep))
      const axis = row.alongAxis
      const bandStart = axis === 'x' ? row.band.x : row.band.y
      const bandEnd = bandStart + (axis === 'x' ? row.band.w : row.band.h)
      let builtEnd = bandStart
      if (keep > 0) {
        const last = row.plots[keep - 1]!.rect
        builtEnd = axis === 'x' ? last.x + last.w : last.y + last.h
      }
      for (const gap of row.gaps) {
        const gapStart = axis === 'x' ? gap.rect.x : gap.rect.y
        if (gapStart < builtEnd - 1e-9) addLandscape(gap.rect, 'mews')
      }
      if (bandEnd - builtEnd > 1) {
        addLandscape(
          axis === 'x'
            ? { x: builtEnd, y: row.band.y, w: bandEnd - builtEnd, h: row.band.h }
            : { x: row.band.x, y: builtEnd, w: row.band.w, h: bandEnd - builtEnd },
          'pocket',
        )
      }
    }
    // A quiet lane survives only if a placed home fronts it; its cul-de-sac
    // bulb lives or dies with it, and the rest of the court strip is garden.
    const liveLaneIds = new Set(
      roads
        .filter((road) => road.id.includes('-lane-') && plots.some((plot) => touches(plot.rect, road.rect)))
        .map((road) => road.id),
    )
    const liveBulbs = fill.bulbs.filter((bulb) => liveLaneIds.has(bulb.laneId))
    liveBulbs.forEach((bulb, index) => {
      courtRoads.push({
        id: `road-secondary-${fill.tag}-court-${index}`,
        featureClass: 'road-secondary',
        rect: bulb.rect,
      })
    })
    if (fill.courtStrip) {
      const axis = fill.acrossAxis
      const alongAxis = axis === 'x' ? 'y' : 'x'
      // The court strip is a turning-head band one secondary-width deep,
      // then a landscaped garden band behind it.
      const bulbDepth = liveBulbs.length > 0
        ? (alongAxis === 'x' ? liveBulbs[0]!.rect.w : liveBulbs[0]!.rect.h)
        : 0
      const stripAlongStart = alongAxis === 'x' ? fill.courtStrip.x : fill.courtStrip.y
      const stripAlongLength = alongAxis === 'x' ? fill.courtStrip.w : fill.courtStrip.h
      if (stripAlongLength - bulbDepth > 1) {
        addLandscape(
          alongAxis === 'x'
            ? { x: stripAlongStart + bulbDepth, y: fill.courtStrip.y, w: stripAlongLength - bulbDepth, h: fill.courtStrip.h }
            : { x: fill.courtStrip.x, y: stripAlongStart + bulbDepth, w: fill.courtStrip.w, h: stripAlongLength - bulbDepth },
          'court',
        )
      }
      const bulbBand: Rect = alongAxis === 'x'
        ? { x: stripAlongStart, y: fill.courtStrip.y, w: bulbDepth || stripAlongLength, h: fill.courtStrip.h }
        : { x: fill.courtStrip.x, y: stripAlongStart, w: fill.courtStrip.w, h: bulbDepth || stripAlongLength }
      const stripStart = axis === 'x' ? bulbBand.x : bulbBand.y
      const stripEnd = stripStart + (axis === 'x' ? bulbBand.w : bulbBand.h)
      const intervals = liveBulbs
        .map((bulb) => {
          const start = axis === 'x' ? bulb.rect.x : bulb.rect.y
          return [start, start + (axis === 'x' ? bulb.rect.w : bulb.rect.h)] as const
        })
        .sort((a, b) => a[0] - b[0])
      let cursor = stripStart
      for (const [start, end] of intervals) {
        if (start - cursor > 1) addLandscape(sliceAcross(bulbBand, axis, cursor, start), 'court')
        cursor = Math.max(cursor, end)
      }
      if (stripEnd - cursor > 1) addLandscape(sliceAcross(bulbBand, axis, cursor, stripEnd), 'court')
    }
  })

  // --- Parking: REQUIREMENT ONLY (ledger 064, route ii) ------------------
  // The requirement is real and cited: placed DU x the active slice's ECS
  // rate. The LAYOUT is not. Drawing bays as measured geometry would mean
  // inventing bay width, bay length, aisle width and access clearances as
  // planning dimensions that no rulebook entry supplies — the exact
  // hard-coded-value failure TownhouseDemoBrief.md §3.2 forbids, and the
  // reason 064 found 169 unreachable bays and 594 invisible ones. So the
  // engine emits no parking geometry and every surface says the strategy is
  // not yet demonstrated. The `parking` feature class stays defined for the
  // day a real parking standard arrives as a rulebook entry.
  const parkingRate = rule('parking-ecs-per-du')
  const requiredEcs = Math.ceil(plots.length * parkingRate - 1e-9)
  const parkingFeatures: CommunityFeature[] = []
  const parkingFullyDrawn = false

  const prunedRoads = roads.filter(
    (road) => !road.id.includes('-lane-') || plots.some((plot) => touches(plot.rect, road.rect)),
  )
  roads.length = 0
  roads.push(...prunedRoads, ...courtRoads)
  greens.push(...landscape)

  const bindingEntryIds: string[] = []
  let bindingDescription: string
  if (placedDu === site.requestedDwellingUnits && placedDu <= geometricFill) {
    bindingDescription =
      'Client program: every requested dwelling unit is placed; remaining capacity is deliberately left as open space.'
  } else if (placedDu === coverageCapDu && coverageCapDu < geometricFill) {
    bindingEntryIds.push(ruleId('site-coverage-max'))
    bindingDescription = 'Ground-coverage cap: the site cannot carry the full requested program under this slice.'
  } else if (placedDu === densityCeiling) {
    bindingEntryIds.push(ruleId('density-max'))
    bindingDescription = 'Density ceiling.'
  } else {
    bindingEntryIds.push(
      ruleId('setback-periphery'), ruleId('setback-front'), ruleId('road-width-primary'),
      ruleId('road-width-secondary'), ruleId('open-space-min'), ruleId('amenity-share-min'),
      ruleId('unit-plot-frontage-min'), ruleId('unit-plot-depth-min'), ruleId('row-length-max'),
    )
    bindingDescription =
      'Geometric fill of this reference layout under the cited setback, road, open-space, amenity, plot-dimension and row-length entries.'
  }

  const features: CommunityFeature[] = [
    { id: 'site-boundary', featureClass: 'site-boundary', rect: { x: 0, y: 0, w: W, h: H } },
    { id: 'envelope', featureClass: 'envelope', rect: env },
    { id: 'road-primary-spine', featureClass: 'road-primary', rect: carriageWest },
    { id: 'road-primary-spine-east', featureClass: 'road-primary', rect: carriageEast },
    { id: 'gate-entry', featureClass: 'gate', rect: gate },
    ...roads,
    ...greens,
    { id: 'amenity-parcel', featureClass: 'amenity', rect: amenity },
    { id: 'club-house', featureClass: 'club', rect: club },
    { id: 'pool', featureClass: 'pool', rect: pool },
    ...plots,
    ...(parkingFullyDrawn ? parkingFeatures : []),
  ]

  // Internal containment/overlap audit — fail closed before export.
  const siteRect = { x: 0, y: 0, w: W, h: H }
  const compatible = new Set([
    'club|amenity', 'pool|amenity', 'gate|road-primary',
    'parking|plot', // stilt bay physically inside its own townhouse plot
  ])
  const solids = features.filter(
    (feature) => !['site-boundary', 'envelope'].includes(feature.featureClass),
  )
  for (const feature of solids) {
    if (!rectContains(siteRect, feature.rect)) {
      fail('E_GEOMETRY_PARITY', `Feature ${feature.id} escapes the site boundary.`, feature.id)
    }
    if (feature.featureClass === 'plot' && !rectContains(env, feature.rect)) {
      fail('E_GEOMETRY_PARITY', `Plot ${feature.id} violates a setback.`, feature.id)
    }
  }
  for (let a = 0; a < solids.length; a += 1) {
    for (let b = a + 1; b < solids.length; b += 1) {
      const fa = solids[a]!
      const fb = solids[b]!
      if (!rectsOverlap(fa.rect, fb.rect)) continue
      const pair = `${fa.featureClass}|${fb.featureClass}`
      const rev = `${fb.featureClass}|${fa.featureClass}`
      if (compatible.has(pair) || compatible.has(rev)) continue
      fail('E_GEOMETRY_PARITY', `Features ${fa.id} and ${fb.id} overlap.`, `${fa.id}/${fb.id}`)
    }
  }
  // --- Brochure decor (ledger 053 P1-3/4/5) -----------------------------
  // Rendering only: house masses, driveways, park composition, planting.
  // Never a planning feature, never a measured rule input, never part of any
  // area/count fact — the canonical geometry above is untouched by all of it.
  const decor: DecorFeature[] = []
  let decorIndex = 0
  const addDecor = (kind: DecorFeature['kind'], ring: readonly Point[]): void => {
    decor.push({ id: `${kind}-${String(decorIndex).padStart(4, '0')}`, kind, ring })
    decorIndex += 1
  }
  const addRect = (kind: DecorFeature['kind'], rect: Rect): void => {
    if (rect.w <= 0.05 || rect.h <= 0.05) return
    addDecor(kind, rectRing(rect))
  }
  const treeRadius = roundM(Math.min(Ws / 3, F / 2))
  const addTree = (x: number, y: number, scale = 1): void => {
    addDecor('tree', octagon(roundM(x), roundM(y), roundM(treeRadius * scale)))
  }
  /** Planting cluster: a big canopy with two smaller ones, deterministic. */
  const addCluster = (x: number, y: number, seed: number): void => {
    addTree(x, y, 1.15)
    addTree(x + treeRadius * 1.7, y + treeRadius * (seed % 2 === 0 ? 1.3 : -1.3), 0.75)
    addTree(x - treeRadius * 1.5, y - treeRadius * (seed % 3 === 0 ? 1.2 : -1.2), 0.85)
  }

  // Homes: each placed plot reads as a townhouse — built mass to the rear,
  // front garden, and on-plot parking DERIVED FROM THE ACTIVE SLICE — never a
  // hard-coded count (ledger 058 P0-1: B's 1.5 ECS/DU may not be drawn as 2).
  const allRoads = [...roads, { id: 'boulevard-w', featureClass: 'road-primary' as const, rect: carriageWest },
    { id: 'boulevard-e', featureClass: 'road-primary' as const, rect: carriageEast }]
  for (const plot of plots) {
    const p = plot.rect
    const portrait = p.h >= p.w
    // Which end faces a road? Pick the nearest road centre along the depth
    // axis, so the entry always sits on the access side.
    const centreX = p.x + p.w / 2
    const centreY = p.y + p.h / 2
    let bestDistance = Infinity
    let frontLow = true
    for (const road of allRoads) {
      const rx = road.rect.x + road.rect.w / 2
      const ry = road.rect.y + road.rect.h / 2
      const distance = portrait ? Math.abs(ry - centreY) : Math.abs(rx - centreX)
      const across = portrait ? Math.abs(rx - centreX) : Math.abs(ry - centreY)
      if (across > Math.max(road.rect.w, road.rect.h) / 2 + p.w) continue
      if (distance < bestDistance) {
        bestDistance = distance
        frontLow = portrait ? ry < centreY : rx < centreX
      }
    }
    const sideInset = Math.min(0.5, p.w * 0.06, p.h * 0.06)
    const depth = portrait ? p.h : p.w
    const frontYard = Math.min(2.4, depth * 0.14)
    const rearYard = Math.min(1.4, depth * 0.08)
    const houseSpan = depth - frontYard - rearYard
    const shadowOffset = Math.min(0.7, sideInset + 0.4)
    if (portrait) {
      const houseY = frontLow ? p.y + frontYard : p.y + rearYard
      addRect('shadow', {
        x: p.x + sideInset + shadowOffset,
        y: houseY - shadowOffset,
        w: p.w - 2 * sideInset,
        h: houseSpan,
      })
      addRect('building', { x: p.x + sideInset, y: houseY, w: p.w - 2 * sideInset, h: houseSpan })
      addRect('marking', {
        x: p.x + p.w / 2 - 0.15,
        y: houseY + houseSpan * 0.12,
        w: 0.3,
        h: houseSpan * 0.76,
      })
    } else {
      const houseX = frontLow ? p.x + frontYard : p.x + rearYard
      addRect('shadow', {
        x: houseX + shadowOffset,
        y: p.y + sideInset - shadowOffset,
        w: houseSpan,
        h: p.h - 2 * sideInset,
      })
      addRect('building', { x: houseX, y: p.y + sideInset, w: houseSpan, h: p.h - 2 * sideInset })
      addRect('marking', {
        x: houseX + houseSpan * 0.12,
        y: p.y + p.h / 2 - 0.15,
        w: houseSpan * 0.76,
        h: 0.3,
      })
    }
  }

  // Public realm: footways beside every carriageway, centre-line markings on
  // the boulevard, and softened junction/turning-head geometry so the road
  // network reads as designed streets rather than grey slabs.
  const footwayWidth = Math.min(1.8, Ws * 0.18)
  const addFootways = (rect: Rect, along: 'x' | 'y'): void => {
    if (along === 'x') {
      addRect('paving', { x: rect.x, y: rect.y - footwayWidth, w: rect.w, h: footwayWidth })
      addRect('paving', { x: rect.x, y: rect.y + rect.h, w: rect.w, h: footwayWidth })
    } else {
      addRect('paving', { x: rect.x - footwayWidth, y: rect.y, w: footwayWidth, h: rect.h })
      addRect('paving', { x: rect.x + rect.w, y: rect.y, w: footwayWidth, h: rect.h })
    }
  }
  for (const road of roads) {
    const along = road.rect.w >= road.rect.h ? 'x' : 'y'
    if (road.id.includes('-loop-') || road.id.includes('-lane-')) addFootways(road.rect, along)
    if (road.id.includes('-court-')) {
      // Turning head: soften the pad and mark its centre.
      addDecor('paving', octagon(
        road.rect.x + road.rect.w / 2,
        road.rect.y + road.rect.h / 2,
        Math.min(road.rect.w, road.rect.h) * 0.30,
      ))
    }
  }
  for (const carriage of [carriageWest, carriageEast]) {
    for (let y = carriage.y + 4; y < carriage.y + carriage.h - 4; y += 14) {
      addRect('marking', { x: carriage.x + carriage.w / 2 - 0.2, y, w: 0.4, h: 6 })
    }
  }
  // Arrival roundabout where the boulevard meets the park spine.
  const roundaboutR = Math.min(boulevardWidth * 0.34, parkDepth * 0.16)
  addDecor('paving', circle(cx, heartCentreY, roundaboutR, 20))
  addDecor('lawn', circle(cx, heartCentreY, roundaboutR * 0.62, 20))
  addTree(cx, heartCentreY, 1.1)

  // Boulevard median: a formal double avenue with a planted centre.
  const medianCentre = median.x + median.w / 2
  for (let y = median.y + 2 * treeRadius; y < innerTop - 2 * treeRadius; y += 6 * treeRadius) {
    addTree(medianCentre, y, 0.95)
  }

  // THE HEART (053 P1-4): arrival court, club forecourt, pool deck, great
  // lawn, play court, and the path that strings them together.
  const heartY = heartCentreY
  // Promenade spine, arrival court at the gate end, club forecourt, pool
  // deck, great lawns either side, and a play court — the destinations a
  // buyer walks between.
  addRect('paving', { x: amenity.x, y: heartY - Ws / 2, w: amenity.w, h: Ws })
  addRect('paving', {
    x: amenity.x + amenity.w * 0.02,
    y: heartY - parkDepth * 0.3,
    w: amenity.w * 0.14,
    h: parkDepth * 0.6,
  })
  addRect('paving', { x: club.x - F, y: club.y - F * 0.8, w: club.w + 2 * F, h: club.h + 1.6 * F })
  addRect('water', { x: pool.x - F * 0.6, y: pool.y - F * 0.6, w: pool.w + 1.2 * F, h: pool.h + 1.2 * F })
  const playX = pool.x + pool.w + amenity.w * 0.05
  const playW = amenity.w * 0.16
  if (playX + playW < amenity.x + amenity.w) {
    addRect('lawn', { x: playX, y: heartY - parkDepth * 0.32, w: playW, h: parkDepth * 0.64 })
    for (let index = 0; index < 4; index += 1) {
      addCluster(playX + playW * (0.15 + index * 0.25), heartY + parkDepth * (index % 2 ? 0.26 : -0.26), index)
    }
  }
  const lawnEastX = playX + playW + amenity.w * 0.04
  if (lawnEastX + amenity.w * 0.1 < amenity.x + amenity.w) {
    addRect('lawn', {
      x: lawnEastX,
      y: heartY - parkDepth * 0.34,
      w: amenity.x + amenity.w - lawnEastX - amenity.w * 0.02,
      h: parkDepth * 0.68,
    })
    for (let index = 0; index < 5; index += 1) {
      addCluster(lawnEastX + amenity.w * (0.03 + index * 0.055), heartY + parkDepth * (index % 2 ? 0.22 : -0.24), index + 3)
    }
  }
  addCluster(amenity.x + amenity.w * 0.09, heartY + parkDepth * 0.34, 7)
  addCluster(amenity.x + amenity.w * 0.09, heartY - parkDepth * 0.34, 8)
  // Rounded water and a circular arrival plaza give the heart a shape.
  addDecor('water', circle(pool.x + pool.w / 2, pool.y + pool.h / 2, Math.min(pool.w, pool.h) * 0.62, 20))
  addDecor('paving', circle(amenity.x + amenity.w * 0.09, heartY, Math.min(parkDepth * 0.22, amenity.w * 0.05), 18))
  // A gentle promenade sweep that BEGINS at the boulevard plaza and ENDS at
  // the park's west edge, so the curve connects two real places.
  addDecor('paving', arcStrip(
    parkWest.x + parkWest.w * 0.5,
    parkWest.y - parkWest.h * 1.6,
    parkWest.h * 1.95,
    Ws * 0.16,
    Math.PI * 0.40,
    Math.PI * 0.60,
    24,
  ))
  // Great lawn in the west park, with a promenade and framing planting.
  addRect('lawn', {
    x: parkWest.x + parkWest.w * 0.12,
    y: parkWest.y + parkWest.h * 0.2,
    w: parkWest.w * 0.5,
    h: parkWest.h * 0.6,
  })
  addRect('paving', { x: parkWest.x + 2, y: heartY - Ws / 3, w: parkWest.w - 4, h: (2 * Ws) / 3 })
  for (let index = 0; index < 7; index += 1) {
    const x = parkWest.x + parkWest.w * (0.08 + index * 0.14)
    addCluster(x, parkWest.y + parkWest.h * (index % 2 === 0 ? 0.14 : 0.86), index)
  }
  for (let index = 0; index < 3; index += 1) {
    addCluster(parkEast.x + parkEast.w * 0.5, parkEast.y + parkEast.h * (0.2 + index * 0.3), index + 4)
  }

  // Perimeter ring: an avenue of street trees all the way round.
  const ringStep = 10 * treeRadius
  for (let x = env.x + ringStep / 2; x < env.x + env.w; x += ringStep) {
    if (x > bx0 - treeRadius && x < bx1 + treeRadius) continue
    addTree(x, env.y + ringT / 2, 0.9)
    addTree(x, innerTop + ringT / 2, 0.9)
  }
  for (let y = inner.y + ringStep / 2; y < innerTop; y += ringStep) {
    addTree(env.x + ringT / 2, y, 0.9)
    addTree(innerRight + ringT / 2, y, 0.9)
  }

  // Pocket parks and cul-de-sac courts get planting so every landscaped
  // square metre reads as designed, not left over.
  landscape.forEach((green, index) => {
    const g = green.rect
    if (g.w < 3 * treeRadius || g.h < 3 * treeRadius) return
    if (green.id.startsWith('green-court')) {
      addCluster(g.x + g.w / 2, g.y + g.h / 2, index)
      return
    }
    const columns = Math.max(1, Math.floor(g.w / (7 * treeRadius)))
    const rows = Math.max(1, Math.floor(g.h / (7 * treeRadius)))
    for (let cx = 0; cx < columns; cx += 1) {
      for (let cy = 0; cy < rows; cy += 1) {
        addTree(
          g.x + (g.w * (cx + 0.5)) / columns,
          g.y + (g.h * (cy + 0.5)) / rows,
          cx % 2 === cy % 2 ? 1 : 0.8,
        )
      }
    }
  })

  const greenArea = greens.reduce((sum, green) => sum + rectArea(green.rect), 0)
  const greenRequired = (rule('open-space-min') / 100) * siteArea
  if (greenArea < greenRequired - 1e-6) {
    fail('E_INPUT_INVALID', 'The composed open-space system falls below the open-space minimum.', 'open-space-min')
  }
  const builtFootprint = plots.length * F * D + clubArea
  const measures: CommunityMeasures = {
    siteAreaSqm: roundM(siteArea),
    siteAreaAcres: roundM(siteAcres),
    envelope: env,
    densityCeilingDu: densityCeiling,
    coverageCapSqm: roundM(coverageCap),
    coverageCapDuEquivalent: coverageCapDu,
    geometricFillDu: geometricFill,
    placedDu: plots.length,
    builtFootprintSqm: roundM(builtFootprint),
    greenAreaSqm: roundM(greenArea),
    greenRequiredSqm: roundM(greenRequired),
    amenityAreaSqm: roundM(rectArea(amenity)),
    amenityRequiredSqm: roundM(amenityRequired),
    requiredParkingEcs: requiredEcs,
    onPlotEcsPerHome: 0,
    sharedEcsDrawn: 0,
    parkingDrawn: parkingFullyDrawn,
    shortfallDu: Math.max(0, site.requestedDwellingUnits - plots.length),
    bindingEntryIds,
    bindingDescription,
  }

  const canonicalFeatures = features.map((feature) => ({
    id: feature.id,
    featureClass: feature.featureClass,
    ring: rectRing(feature.rect),
  }))
  const geometryDigest = sha256(JSON.stringify({ features: canonicalFeatures, decor }))

  return { slice: rulebook.slice, features, measures, geometryDigest, decor }
}

export function featureRing(feature: CommunityFeature): readonly Point[] {
  return rectRing(feature.rect)
}
