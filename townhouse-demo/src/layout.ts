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

interface RowStrip {
  readonly y: number
  readonly half: 'w' | 'e'
  readonly index: number
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

  const cx = W / 2
  const spine: Rect = { x: cx - Wp / 2, y: 0, w: Wp, h: env.y + env.h }
  const gateDepth = Ws / 3
  const gate: Rect = { x: spine.x, y: 0, w: Wp, h: gateDepth }
  const west: Rect = { x: env.x, y: env.y, w: spine.x - env.x, h: env.h }
  const east: Rect = { x: spine.x + spine.w, y: env.y, w: env.x + env.w - (spine.x + spine.w), h: env.h }
  if (west.w < F || east.w < F) {
    fail('E_INPUT_INVALID', 'The spine road leaves no usable half-width for plots.', 'road-width-primary')
  }

  // Green band across both halves at the front of the envelope, sized to the
  // open-space minimum (ceil to 0.1 m so the measured share always satisfies
  // the rule).
  const greenRequired = (rule('open-space-min') / 100) * siteArea
  const greenBandH = ceilDecimetre(greenRequired / (west.w + east.w))
  if (greenBandH > env.h) {
    fail('E_INPUT_INVALID', 'Open-space requirement exceeds the buildable envelope.', 'open-space-min')
  }
  const greenWest: Rect = { x: west.x, y: env.y, w: west.w, h: greenBandH }
  const greenEast: Rect = { x: east.x, y: env.y, w: east.w, h: greenBandH }
  const greenTop = env.y + greenBandH

  // Amenity parcel (club + pool) east of the spine, above the green band.
  const amenityRequired = (rule('amenity-share-min') / 100) * siteArea
  const amenityDepth = 3 * D
  const amenityWidth = ceilDecimetre(amenityRequired / amenityDepth)
  const amenity: Rect = { x: east.x, y: greenTop, w: amenityWidth, h: amenityDepth }
  if (!rectContains(east, amenity) || amenity.y + amenity.h > env.y + env.h) {
    fail('E_INPUT_INVALID', 'Amenity parcel does not fit the east half of the envelope.', 'amenity-share-min')
  }
  const club: Rect = { x: amenity.x + F, y: amenity.y + D / 2, w: 2 * F, h: D }
  const pool: Rect = { x: club.x + club.w + F / 2, y: amenity.y + D / 2, w: 1.5 * F, h: 0.6 * D }
  if (!rectContains(amenity, club) || !rectContains(amenity, pool)) {
    fail('E_INPUT_INVALID', 'Club/pool sizing does not fit the amenity parcel.', 'amenity-share-min')
  }

  // Double-loaded row fill, south to north, per half. Module: row fronting
  // north onto its road, the road, row fronting south. A trailing single
  // road+row is added where it fits.
  const roads: CommunityFeature[] = []
  const rowStrips: RowStrip[] = []
  const fillHalf = (half: Rect, startY: number, tag: 'w' | 'e'): void => {
    const module = 2 * D + Ws
    let y = startY
    let roadIndex = 0
    let rowIndex = 0
    while (y + module <= half.y + half.h + 1e-9) {
      rowStrips.push({ y, half: tag, index: rowIndex })
      rowIndex += 1
      roads.push({
        id: `road-secondary-${tag}-${roadIndex}`,
        featureClass: 'road-secondary',
        rect: { x: half.x, y: y + D, w: half.w, h: Ws },
      })
      roadIndex += 1
      rowStrips.push({ y: y + D + Ws, half: tag, index: rowIndex })
      rowIndex += 1
      y += module
    }
    if (y + Ws + D <= half.y + half.h + 1e-9) {
      roads.push({
        id: `road-secondary-${tag}-${roadIndex}`,
        featureClass: 'road-secondary',
        rect: { x: half.x, y, w: half.w, h: Ws },
      })
      rowStrips.push({ y: y + Ws, half: tag, index: rowIndex })
    }
  }
  fillHalf(west, greenTop, 'w')
  fillHalf(east, amenity.y + amenity.h, 'e')

  // Rows to plots: segments of at most row-length-max, broken by a secondary-
  // road-width gap; plots of exactly the minimum frontage x depth.
  const plotsPerRow = (half: Rect): number[] => {
    const starts: number[] = []
    let cursor = half.x
    let segmentLength = 0
    while (cursor + F <= half.x + half.w + 1e-9) {
      if (segmentLength + F > rowMax + 1e-9) {
        cursor += Ws
        segmentLength = 0
        continue
      }
      starts.push(cursor)
      cursor += F
      segmentLength += F
    }
    return starts
  }

  const plotCandidates: CommunityFeature[] = []
  const sortedStrips = [...rowStrips].sort((a, b) =>
    a.half === b.half ? a.y - b.y : a.half === 'w' ? -1 : 1,
  )
  for (const strip of sortedStrips) {
    const half = strip.half === 'w' ? west : east
    const starts = plotsPerRow(half)
    starts.forEach((x, plotIndex) => {
      plotCandidates.push({
        id: `plot-${strip.half}-${String(strip.index).padStart(2, '0')}-${String(plotIndex).padStart(2, '0')}`,
        featureClass: 'plot',
        rect: { x, y: strip.y, w: F, h: D },
      })
    })
  }

  // Caps: density ceiling and coverage cap. The engine reports which limit
  // actually bound the placed count — the requested count never becomes a
  // result.
  const siteAcres = siteArea / SQUARE_METRES_PER_ACRE
  const densityCeiling = Math.floor(siteAcres * rule('density-max'))
  const coverageCap = (rule('site-coverage-max') / 100) * siteArea
  const clubArea = rectArea(club)
  const coverageCapDu = Math.floor((coverageCap - clubArea) / (F * D))
  const geometricFill = plotCandidates.length
  const placedDu = Math.max(0, Math.min(geometricFill, densityCeiling, coverageCapDu))
  const plots = plotCandidates.slice(0, placedDu)

  const bindingEntryIds: string[] = []
  let bindingDescription: string
  if (placedDu === geometricFill && placedDu < densityCeiling && placedDu < coverageCapDu) {
    bindingEntryIds.push(
      ruleId('setback-periphery'), ruleId('setback-front'), ruleId('road-width-primary'),
      ruleId('road-width-secondary'), ruleId('open-space-min'), ruleId('amenity-share-min'),
      ruleId('unit-plot-frontage-min'), ruleId('unit-plot-depth-min'), ruleId('row-length-max'),
    )
    bindingDescription =
      'Geometric fill of this reference layout under the cited setback, road, open-space, amenity, plot-dimension and row-length entries.'
  } else if (placedDu === densityCeiling) {
    bindingEntryIds.push(ruleId('density-max'))
    bindingDescription = 'Density ceiling.'
  } else {
    bindingEntryIds.push(ruleId('site-coverage-max'))
    bindingDescription = 'Ground-coverage cap.'
  }

  const features: CommunityFeature[] = [
    { id: 'site-boundary', featureClass: 'site-boundary', rect: { x: 0, y: 0, w: W, h: H } },
    { id: 'envelope', featureClass: 'envelope', rect: env },
    { id: 'road-primary-spine', featureClass: 'road-primary', rect: spine },
    { id: 'gate-entry', featureClass: 'gate', rect: gate },
    ...roads,
    { id: 'green-west', featureClass: 'green', rect: greenWest },
    { id: 'green-east', featureClass: 'green', rect: greenEast },
    { id: 'amenity-parcel', featureClass: 'amenity', rect: amenity },
    { id: 'club-house', featureClass: 'club', rect: club },
    { id: 'pool', featureClass: 'pool', rect: pool },
    ...plots,
  ]

  // Internal containment/overlap audit — the same checks the acceptance
  // harness measures independently; failing here fails closed before export.
  const siteRect = { x: 0, y: 0, w: W, h: H }
  const compatible = new Set(['club|amenity', 'pool|amenity', 'gate|road-primary'])
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

  const greenArea = rectArea(greenWest) + rectArea(greenEast)
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
    requiredParkingEcs: Math.ceil(plots.length * rule('parking-ecs-per-du') - 1e-9),
    shortfallDu: Math.max(0, site.requestedDwellingUnits - plots.length),
    bindingEntryIds,
    bindingDescription,
  }

  const canonicalFeatures = features.map((feature) => ({
    id: feature.id,
    featureClass: feature.featureClass,
    ring: rectRing(feature.rect),
  }))
  const geometryDigest = sha256(JSON.stringify(canonicalFeatures))

  return { slice: rulebook.slice, features, measures, geometryDigest }
}

export function featureRing(feature: CommunityFeature): readonly Point[] {
  return rectRing(feature.rect)
}
