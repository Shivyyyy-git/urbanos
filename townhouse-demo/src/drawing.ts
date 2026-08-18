// Community drawing models. The planning-feature paths are built ONCE from
// the canonical layout and shared by reference between the technical and
// presentation models — the two sheets cannot drift because they render the
// same objects (kernel DG-1 discipline). Annotation content (dimensions,
// legend, north arrow, scale bar, title) differs per sheet and carries
// 'anno.' ids so the parity oracle compares planning features only.

import type { DemoSiteFixture } from './fixture.ts'
import { roundM, type Point } from './geom.ts'
import { featureRing, type CommunityLayout, type FeatureClass } from './layout.ts'
import type { CommunityEnvelopeReport } from './report.ts'
import type { DemoRuleSlot, ResolvedDemoRulebook } from './rulebook.ts'

export type DemoLayer =
  | 'SITE'
  | 'ENVELOPE'
  | 'ROAD-PRIMARY'
  | 'ROAD-SECONDARY'
  | 'PLOT'
  | 'GREEN'
  | 'AMENITY'
  | 'CLUB'
  | 'POOL'
  | 'GATE'
  | 'PARKING'
  | 'TREE'
  | 'BUILDING'
  | 'PAVING'
  | 'WATER'
  | 'LAWN'
  | 'SHADOW'
  | 'MARKING'
  | 'DIMENSION'
  | 'TEXT'
  | 'ANNOTATION'
  | 'WATERMARK'

export interface DemoLayerStyle {
  readonly name: DemoLayer
  readonly aci: number
  readonly stroke: readonly [number, number, number]
  readonly fill: readonly [number, number, number] | null
  readonly lineWeightMm: number
  readonly dashed: boolean
}

export const DEMO_LAYERS: readonly DemoLayerStyle[] = [
  { name: 'SITE', aci: 7, stroke: [0.05, 0.05, 0.05], fill: [0.96, 0.95, 0.92], lineWeightMm: 0.7, dashed: false },
  { name: 'ENVELOPE', aci: 1, stroke: [0.65, 0.25, 0.25], fill: null, lineWeightMm: 0.3, dashed: true },
  { name: 'ROAD-PRIMARY', aci: 8, stroke: [0.32, 0.32, 0.36], fill: [0.55, 0.55, 0.58], lineWeightMm: 0.4, dashed: false },
  { name: 'ROAD-SECONDARY', aci: 9, stroke: [0.45, 0.45, 0.48], fill: [0.68, 0.68, 0.7], lineWeightMm: 0.3, dashed: false },
  { name: 'PLOT', aci: 30, stroke: [0.55, 0.42, 0.24], fill: [0.9, 0.81, 0.62], lineWeightMm: 0.25, dashed: false },
  { name: 'GREEN', aci: 3, stroke: [0.36, 0.55, 0.25], fill: [0.62, 0.79, 0.44], lineWeightMm: 0.25, dashed: false },
  { name: 'AMENITY', aci: 40, stroke: [0.72, 0.56, 0.28], fill: [0.95, 0.85, 0.6], lineWeightMm: 0.3, dashed: false },
  { name: 'CLUB', aci: 32, stroke: [0.58, 0.34, 0.18], fill: [0.83, 0.56, 0.36], lineWeightMm: 0.3, dashed: false },
  { name: 'POOL', aci: 5, stroke: [0.16, 0.38, 0.64], fill: [0.43, 0.66, 0.88], lineWeightMm: 0.3, dashed: false },
  { name: 'GATE', aci: 6, stroke: [0.32, 0.26, 0.38], fill: [0.5, 0.44, 0.56], lineWeightMm: 0.35, dashed: false },
  { name: 'PARKING', aci: 9, stroke: [0.5, 0.48, 0.44], fill: [0.84, 0.82, 0.77], lineWeightMm: 0.14, dashed: false },
  { name: 'TREE', aci: 3, stroke: [0.29, 0.47, 0.22], fill: [0.53, 0.72, 0.36], lineWeightMm: 0.16, dashed: false },
  { name: 'BUILDING', aci: 34, stroke: [0.45, 0.31, 0.19], fill: [0.76, 0.55, 0.36], lineWeightMm: 0.18, dashed: false },
  { name: 'PAVING', aci: 9, stroke: [0.62, 0.6, 0.56], fill: [0.86, 0.84, 0.79], lineWeightMm: 0.14, dashed: false },
  { name: 'WATER', aci: 5, stroke: [0.2, 0.45, 0.7], fill: [0.55, 0.76, 0.92], lineWeightMm: 0.2, dashed: false },
  { name: 'LAWN', aci: 3, stroke: [0.45, 0.63, 0.3], fill: [0.72, 0.85, 0.55], lineWeightMm: 0.16, dashed: false },
  { name: 'SHADOW', aci: 8, stroke: [0.55, 0.5, 0.45], fill: [0.55, 0.5, 0.45], lineWeightMm: 0.1, dashed: false },
  { name: 'MARKING', aci: 7, stroke: [0.97, 0.96, 0.93], fill: [0.97, 0.96, 0.93], lineWeightMm: 0.1, dashed: false },
  { name: 'DIMENSION', aci: 2, stroke: [0.3, 0.3, 0.28], fill: null, lineWeightMm: 0.18, dashed: false },
  { name: 'TEXT', aci: 7, stroke: [0.05, 0.05, 0.05], fill: null, lineWeightMm: 0.18, dashed: false },
  { name: 'ANNOTATION', aci: 7, stroke: [0.04, 0.04, 0.04], fill: null, lineWeightMm: 0.18, dashed: false },
  { name: 'WATERMARK', aci: 8, stroke: [0.78, 0.78, 0.78], fill: null, lineWeightMm: 0.3, dashed: false },
]

export const LAYER_BY_CLASS: Readonly<Record<FeatureClass, DemoLayer>> = {
  'site-boundary': 'SITE',
  envelope: 'ENVELOPE',
  'road-primary': 'ROAD-PRIMARY',
  'road-secondary': 'ROAD-SECONDARY',
  plot: 'PLOT',
  green: 'GREEN',
  amenity: 'AMENITY',
  club: 'CLUB',
  pool: 'POOL',
  gate: 'GATE',
  parking: 'PARKING',
}

export interface DemoDrawingPath {
  readonly id: string
  readonly layer: DemoLayer
  readonly points: readonly Point[]
  readonly closed: boolean
  /** Present only on planning-feature paths ('f.' ids). */
  readonly featureClass?: FeatureClass
}

export interface DemoDrawingText {
  readonly id: string
  readonly layer: DemoLayer
  readonly at: Point
  readonly heightMm: number
  readonly text: string
  readonly rotationDegrees: number
  readonly align: 'left' | 'center' | 'right'
  readonly bold: boolean
}

export interface DemoDrawingModel {
  readonly kind: 'technical' | 'presentation'
  readonly title: string
  readonly slice: string
  readonly stamp: string
  readonly fixtureDigest: string
  readonly rulebookDigest: string
  readonly geometryDigest: string
  readonly scaleDenominator: number
  readonly paths: readonly DemoDrawingPath[]
  readonly texts: readonly DemoDrawingText[]
  readonly titleLines: readonly string[]
  /** Hero numbers for the presentation poster's side panel. */
  readonly stats: readonly { readonly label: string; readonly value: string }[]
  /** The single honesty line a poster carries under its stamp. */
  readonly footerLine: string
  readonly legend: readonly { readonly label: string; readonly layer: DemoLayer }[]
  /**
   * Neighbourhood place names. Drawn by the PDF composer in paper space and
   * listed in the preview panel: the preview's inline-SVG text vocabulary is
   * closed by the frozen gate, so map-side naming lives on the poster while
   * both surfaces carry the names (ledger 056).
   */
  readonly placeLabels: readonly { readonly at: Point; readonly text: string }[]
  /** Stilt bays drawn per home — floor of the ACTIVE slice's parking rate. */
  readonly stiltBaysPerHome: number
  /** Typical-plot inset caption, dimensioned and derived from the slice. */
  readonly insetCaption: string
  readonly bounds: { minX: number; minY: number; maxX: number; maxY: number }
}

const SCALE_DENOMINATOR = 1000

function bounds(
  paths: readonly DemoDrawingPath[],
  texts: readonly DemoDrawingText[],
  marginM: number,
): { minX: number; minY: number; maxX: number; maxY: number } {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const path of paths) {
    for (const [x, y] of path.points) {
      minX = Math.min(minX, x)
      minY = Math.min(minY, y)
      maxX = Math.max(maxX, x)
      maxY = Math.max(maxY, y)
    }
  }
  for (const text of texts) {
    minX = Math.min(minX, text.at[0])
    minY = Math.min(minY, text.at[1])
    maxX = Math.max(maxX, text.at[0])
    maxY = Math.max(maxY, text.at[1])
  }
  return {
    minX: roundM(minX - marginM),
    minY: roundM(minY - marginM),
    maxX: roundM(maxX + marginM),
    maxY: roundM(maxY + marginM),
  }
}

function metres(value: number): string {
  return `${value.toFixed(3)} m`
}

export function buildDrawingModels(
  site: DemoSiteFixture,
  rulebook: ResolvedDemoRulebook,
  layout: CommunityLayout,
  report: CommunityEnvelopeReport,
): { technical: DemoDrawingModel; presentation: DemoDrawingModel } {
  const rule = (slot: DemoRuleSlot): number => rulebook.bySlot[slot].value
  const ruleId = (slot: DemoRuleSlot): string => rulebook.bySlot[slot].id
  const W = site.widthM
  const H = site.depthM

  // Planning-feature paths, built once and shared by both models.
  const featurePaths: readonly DemoDrawingPath[] = layout.features.map((feature) => ({
    id: `f.${feature.id}`,
    layer: LAYER_BY_CLASS[feature.featureClass],
    points: featureRing(feature),
    closed: true,
    featureClass: feature.featureClass,
  }))
  // Tree-canopy decor: same canonical source on both sheets, 'deco.' ids so
  // the planning-parity oracle ignores them while the preview gate verifies
  // them against the manifest's decor list.
  const DECOR_LAYER: Readonly<Record<string, DemoLayer>> = {
    tree: 'TREE', building: 'BUILDING', paving: 'PAVING', water: 'WATER', lawn: 'LAWN',
    shadow: 'SHADOW', marking: 'MARKING',
  }
  // Decor paints in landscape → paving → building order so homes read above
  // their gardens and drives (rendering only; no canonical geometry).
  const decorOrder = ['lawn', 'water', 'paving', 'marking', 'shadow', 'building', 'tree']
  const decorPaths: readonly DemoDrawingPath[] = [...layout.decor]
    .sort((a, b) => decorOrder.indexOf(a.kind) - decorOrder.indexOf(b.kind))
    .map((item) => ({
      id: `deco.${item.id}`,
      layer: DECOR_LAYER[item.kind] ?? 'TREE',
      points: item.ring,
      closed: true,
    }))

  // North arrow (both sheets): triangle + N, west of the site, clear of the
  // page-corner stamp and the presentation legend.
  const northAt: Point = [-14, H - 6]
  const northPaths: DemoDrawingPath[] = [
    {
      id: 'anno.north-arrow',
      layer: 'ANNOTATION',
      points: [
        [northAt[0] - 2.5, northAt[1] - 4],
        [northAt[0] + 2.5, northAt[1] - 4],
        [northAt[0], northAt[1] + 4],
      ],
      closed: true,
    },
  ]
  const northText: DemoDrawingText = {
    id: 'anno.north-label',
    layer: 'ANNOTATION',
    at: [northAt[0], northAt[1] - 9],
    heightMm: 4,
    text: 'N (DECLARED)',
    rotationDegrees: 0,
    align: 'center',
    bold: true,
  }

  const watermarkText: DemoDrawingText = {
    id: 'anno.watermark-demo',
    layer: 'WATERMARK',
    at: [W / 2, H / 2],
    heightMm: 60,
    text: 'DEMO',
    rotationDegrees: 30,
    align: 'center',
    bold: true,
  }

  // --- Technical sheet annotations -------------------------------------
  const dimensionPaths: DemoDrawingPath[] = [
    { id: 'anno.dim-width-line', layer: 'DIMENSION', points: [[0, -10], [W, -10]], closed: false },
    { id: 'anno.dim-width-tick-a', layer: 'DIMENSION', points: [[0, -12], [0, -8]], closed: false },
    { id: 'anno.dim-width-tick-b', layer: 'DIMENSION', points: [[W, -12], [W, -8]], closed: false },
    { id: 'anno.dim-depth-line', layer: 'DIMENSION', points: [[-10, 0], [-10, H]], closed: false },
    { id: 'anno.dim-depth-tick-a', layer: 'DIMENSION', points: [[-12, 0], [-8, 0]], closed: false },
    { id: 'anno.dim-depth-tick-b', layer: 'DIMENSION', points: [[-12, H], [-8, H]], closed: false },
  ]
  const env = layout.measures.envelope
  const spine = layout.features.find((feature) => feature.id === 'road-primary-spine')!
  const firstRoad = layout.features.find((feature) => feature.featureClass === 'road-secondary')
  const firstPlot = layout.features.find((feature) => feature.featureClass === 'plot')
  const technicalTexts: DemoDrawingText[] = [
    { id: 'anno.dim-width-text', layer: 'DIMENSION', at: [W / 2, -16], heightMm: 3.2, text: metres(W), rotationDegrees: 0, align: 'center', bold: false },
    { id: 'anno.dim-depth-text', layer: 'DIMENSION', at: [-16, H / 2], heightMm: 3.2, text: metres(H), rotationDegrees: 90, align: 'center', bold: false },
    { id: 'anno.setback-front', layer: 'DIMENSION', at: [W * 0.25, env.y - 5], heightMm: 2.6, text: `FRONT SETBACK ${metres(rule('setback-front'))} [${ruleId('setback-front')}]`, rotationDegrees: 0, align: 'center', bold: false },
    { id: 'anno.setback-periphery', layer: 'DIMENSION', at: [W * 0.75, env.y + env.h + 4], heightMm: 2.6, text: `PERIPHERY SETBACK ${metres(rule('setback-periphery'))} [${ruleId('setback-periphery')}]`, rotationDegrees: 0, align: 'center', bold: false },
    { id: 'anno.spine-width', layer: 'DIMENSION', at: [spine.rect.x + spine.rect.w / 2, H * 0.62], heightMm: 2.6, text: `${metres(spine.rect.w)} ROW [${ruleId('road-width-primary')}]`, rotationDegrees: 90, align: 'center', bold: false },
    ...(firstRoad
      ? [{
          id: 'anno.secondary-width',
          layer: 'DIMENSION' as const,
          at: [firstRoad.rect.x + 14, firstRoad.rect.y + firstRoad.rect.h / 2] as Point,
          heightMm: 2.2,
          text: `${metres(firstRoad.rect.h)} ROW [${ruleId('road-width-secondary')}]`,
          rotationDegrees: 0,
          align: 'left' as const,
          bold: false,
        }]
      : []),
    ...(firstPlot
      ? [{
          id: 'anno.plot-dims',
          layer: 'DIMENSION' as const,
          at: [firstPlot.rect.x + firstPlot.rect.w / 2, firstPlot.rect.y - 4] as Point,
          heightMm: 2.2,
          text: `TYP. PLOT ${firstPlot.rect.w.toFixed(3)} x ${firstPlot.rect.h.toFixed(3)} m [${ruleId('unit-plot-frontage-min')}, ${ruleId('unit-plot-depth-min')}]`,
          rotationDegrees: 0,
          align: 'left' as const,
          bold: false,
        }]
      : []),
    { id: 'anno.access-road', layer: 'DIMENSION', at: [W / 2, -22], heightMm: 2.6, text: `EXTERNAL ACCESS ROAD (SOUTH) ${metres(site.accessRoad.widthM)} — DECLARED FIXTURE INPUT`, rotationDegrees: 0, align: 'center', bold: false },
  ]

  const labelTexts: DemoDrawingText[] = [
    { id: 'anno.label-club', layer: 'TEXT', at: [layout.features.find((f) => f.id === 'club-house')!.rect.x + rule('unit-plot-frontage-min'), layout.features.find((f) => f.id === 'club-house')!.rect.y + rule('unit-plot-depth-min') / 2], heightMm: 2.6, text: 'CLUB', rotationDegrees: 0, align: 'center', bold: true },
    { id: 'anno.label-pool', layer: 'TEXT', at: [layout.features.find((f) => f.id === 'pool')!.rect.x + 0.75 * rule('unit-plot-frontage-min'), layout.features.find((f) => f.id === 'pool')!.rect.y + 0.3 * rule('unit-plot-depth-min')], heightMm: 2.2, text: 'POOL', rotationDegrees: 0, align: 'center', bold: true },
    {
      id: 'anno.label-green-west',
      layer: 'TEXT',
      at: (() => {
        const park = layout.features.find((f) => f.id === 'green-west')!.rect
        return [park.x + park.w / 2, park.y + park.h * 0.82] as Point
      })(),
      heightMm: 3.2,
      text: 'CENTRAL PARK',
      rotationDegrees: 0,
      align: 'center',
      bold: true,
    },
    { id: 'anno.label-gate', layer: 'TEXT', at: [W / 2, -4], heightMm: 2.6, text: 'ENTRY GATE', rotationDegrees: 0, align: 'center', bold: false },
  ]

  // Neighbourhood naming, derived from the quarters the engine actually
  // built (each quarter's loop road bounds its neighbourhood).
  const QUARTER_NAMES: Readonly<Record<string, string>> = {
    sw: 'PARKSIDE WEST', se: 'GARDEN QUARTER', nw: 'ORCHARD WEST', ne: 'THE MEWS',
  }
  const placeLabels: { at: Point; text: string }[] = []
  for (const [tag, name] of Object.entries(QUARTER_NAMES)) {
    const loops = layout.features.filter((feature) => feature.id.startsWith(`road-secondary-${tag}-loop-`))
    if (loops.length === 0) continue
    const minX = Math.min(...loops.map((loop) => loop.rect.x))
    const maxX = Math.max(...loops.map((loop) => loop.rect.x + loop.rect.w))
    const minY = Math.min(...loops.map((loop) => loop.rect.y))
    const maxY = Math.max(...loops.map((loop) => loop.rect.y + loop.rect.h))
    placeLabels.push({ at: [(minX + maxX) / 2, maxY - 6] as Point, text: name })
  }
  const amenityFeature = layout.features.find((feature) => feature.id === 'amenity-parcel')
  if (amenityFeature) {
    placeLabels.push({
      at: [amenityFeature.rect.x + amenityFeature.rect.w * 0.62, amenityFeature.rect.y + amenityFeature.rect.h - 8] as Point,
      text: 'CLUB & POOL GARDENS',
    })
  }

  const m = layout.measures
  // Hero numbers: what a client reads first. Every one is a computed fact
  // already present in the report — the poster leads with them instead of
  // with provenance (ledger 053 P1-6).
  const openSharePercent = (m.greenAreaSqm / m.siteAreaSqm) * 100
  const stats: { label: string; value: string }[] = [
    { label: 'HOMES PLACED', value: `${m.placedDu}` },
    { label: 'HOMES REQUESTED', value: `${site.requestedDwellingUnits}` },
    { label: 'SITE', value: `${m.siteAreaAcres.toFixed(2)} ac` },
    { label: `PARKING REQUIRED (${rule('parking-ecs-per-du')}/HOME)`, value: `${m.requiredParkingEcs} ECS` },
    { label: 'GREEN / OPEN', value: `${openSharePercent.toFixed(1)}%` },
    { label: 'HEIGHT', value: `${rule('height-max')} m · G+${rule('storeys-max') - 1}` },
  ]
  // One honesty line. It must NOT repeat the sanctionability claim: the
  // computed claim is exclusive, and the gate enforces exactly one.
  // Parking narration derived from the active slice and from what is drawn:
  // whole spaces under each stilt, the fractional remainder as shared bays.
  const parkingSentence =
    `PARKING ${m.requiredParkingEcs} ECS REQUIRED AT ${rule('parking-ecs-per-du')}/HOME `
    + `[${ruleId('parking-ecs-per-du')}] — PARKING STRATEGY NOT YET DEMONSTRATED`
  const insetCaption =
    `Plot ${rule('unit-plot-frontage-min')} x ${rule('unit-plot-depth-min')} m `
    + `[${ruleId('unit-plot-frontage-min')}, ${ruleId('unit-plot-depth-min')}]. `
    + `${m.requiredParkingEcs} ECS required at ${rule('parking-ecs-per-du')}/home `
    + `[${ruleId('parking-ecs-per-du')}] — parking strategy not yet demonstrated: no rulebook entry `
    + `supplies bay or access dimensions, so none are drawn as measured geometry.`
  const footerLine =
    'All rule values are DEMO — illustrative and unverified; no real jurisdiction is represented; '
    + 'axis-aligned reference layout on one fixed imaginary site.'
  const presentationTitleLines = [
    `${m.placedDu} OF ${site.requestedDwellingUnits} REQUESTED TOWNHOUSES PLACED — ${m.siteAreaAcres.toFixed(2)} ACRES`,
    `ENTRY BOULEVARD · NEIGHBOURHOOD LOOPS · CUL-DE-SAC COURTS · CENTRAL PARK · CLUB & POOL`,
    parkingSentence,
    `SLICE ${rulebook.slice}  ·  SCALE 1:${SCALE_DENOMINATOR} ON A1  ·  UNITS: METRES  ·  NORTH DECLARED (PLAN-UP)`,
    // THD-18: the FULL computed reason, verbatim — never a shortened variant.
    `SANCTIONABLE TODAY: ${report.actionability.sanctionableToday.toUpperCase()} — ${report.actionability.reason}`,
  ]
  const sharedTitleLines = [
    `SLICE: ${rulebook.slice}  |  SCALE 1:${SCALE_DENOMINATOR}  |  UNITS: METRES  |  NORTH: DECLARED (PLAN-UP)`,
    `PLACED IN THIS REFERENCE LAYOUT: ${m.placedDu} DU  |  REQUESTED (INTENT): ${site.requestedDwellingUnits} DU  |  DENSITY CEILING: ${m.densityCeilingDu} DU`,
    `HEIGHT CAP ${metres(rule('height-max'))} / G+${rule('storeys-max') - 1} [${ruleId('height-max')}, ${ruleId('storeys-max')}] — CITED LIMITS; NO ELEVATIONS DRAWN`,
    parkingSentence,
    // THD-18: the FULL computed reason, verbatim — never a shortened variant.
    `SANCTIONABLE TODAY: ${report.actionability.sanctionableToday.toUpperCase()} — ${report.actionability.reason}`,
    'ALL RULE VALUES ARE DEMO — ILLUSTRATIVE, UNVERIFIED; NO REAL JURISDICTION IS REPRESENTED',
    'AXIS-ALIGNED REFERENCE LAYOUT — ONE FIXED IMAGINARY SITE, NO GENERAL SITE SOLVER',
    `FIXTURE ${report.fixtureDigest.slice(0, 16)}…  RULEBOOK ${report.rulebookDigest.slice(0, 16)}…  GEOMETRY ${report.geometryDigest.slice(0, 16)}…`,
  ]

  const technicalPaths = [...featurePaths, ...decorPaths, ...northPaths, ...dimensionPaths]
  const technicalAllTexts = [northText, watermarkText, ...technicalTexts, ...labelTexts]
  const technical: DemoDrawingModel = {
    kind: 'technical',
    title: `${site.name} — DEMO technical sheet`,
    slice: rulebook.slice,
    stamp: report.stamp,
    fixtureDigest: report.fixtureDigest,
    rulebookDigest: report.rulebookDigest,
    geometryDigest: report.geometryDigest,
    scaleDenominator: SCALE_DENOMINATOR,
    paths: technicalPaths,
    texts: technicalAllTexts,
    titleLines: sharedTitleLines,
    stats,
    footerLine,
    legend: [],
    placeLabels: [],
    stiltBaysPerHome: m.onPlotEcsPerHome,
    insetCaption,
    bounds: bounds(technicalPaths, technicalAllTexts, 14),
  }

  // --- Presentation map -------------------------------------------------
  const legend: { label: string; layer: DemoLayer }[] = [
    { label: 'TOWNHOUSE PLOT', layer: 'PLOT' },
    { label: 'PRIMARY ROAD', layer: 'ROAD-PRIMARY' },
    { label: 'SECONDARY ROAD', layer: 'ROAD-SECONDARY' },
    { label: 'GREEN / OPEN SPACE', layer: 'GREEN' },
    { label: 'AMENITY PARCEL', layer: 'AMENITY' },
    { label: 'CLUB HOUSE', layer: 'CLUB' },
    { label: 'SWIMMING POOL', layer: 'POOL' },
    { label: 'ENTRY GATE', layer: 'GATE' },
  ]
  // Scale bar: 0–50–100 m, south-west of the site.
  const scaleBarY = -14
  const scaleBarPaths: DemoDrawingPath[] = [
    { id: 'anno.scalebar-0', layer: 'ANNOTATION', points: [[0, scaleBarY], [50, scaleBarY], [50, scaleBarY + 2.5], [0, scaleBarY + 2.5]], closed: true },
    { id: 'anno.scalebar-1', layer: 'ANNOTATION', points: [[50, scaleBarY], [100, scaleBarY], [100, scaleBarY + 2.5], [50, scaleBarY + 2.5]], closed: true },
  ]
  const scaleBarTexts: DemoDrawingText[] = [
    { id: 'anno.scalebar-t0', layer: 'ANNOTATION', at: [0, scaleBarY - 5], heightMm: 2.4, text: '0', rotationDegrees: 0, align: 'center', bold: false },
    { id: 'anno.scalebar-t50', layer: 'ANNOTATION', at: [50, scaleBarY - 5], heightMm: 2.4, text: '50 m', rotationDegrees: 0, align: 'center', bold: false },
    { id: 'anno.scalebar-t100', layer: 'ANNOTATION', at: [100, scaleBarY - 5], heightMm: 2.4, text: '100 m', rotationDegrees: 0, align: 'center', bold: false },
  ]

  const presentationPaths = [...featurePaths, ...decorPaths, ...northPaths, ...scaleBarPaths]
  const presentationAllTexts = [northText, watermarkText, ...labelTexts, ...scaleBarTexts]
  const presentation: DemoDrawingModel = {
    kind: 'presentation',
    title: `${site.name} — DEMO presentation map`,
    slice: rulebook.slice,
    stamp: report.stamp,
    fixtureDigest: report.fixtureDigest,
    rulebookDigest: report.rulebookDigest,
    geometryDigest: report.geometryDigest,
    scaleDenominator: SCALE_DENOMINATOR,
    paths: presentationPaths,
    texts: presentationAllTexts,
    titleLines: presentationTitleLines,
    stats,
    footerLine,
    legend,
    placeLabels,
    stiltBaysPerHome: m.onPlotEcsPerHome,
    insetCaption,
    bounds: bounds(presentationPaths, presentationAllTexts, 14),
  }

  return { technical, presentation }
}
