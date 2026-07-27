// ---------------------------------------------------------------------------
// UrbanOS MVP — drawing engine (Module 5, part 1 of 3).
//
// Turns a generated scenario into a SCALED, ANNOTATED 2D site drawing: a
// neutral vector model that both the DXF and the PDF writer serialise. This is
// the piece that makes the layout leave UrbanOS as a real drawing rather than
// a picture — a standard paper scale is chosen, annotation is sized for that
// scale, and everything lands on named layers.
//
// Coordinate system: METRES, Y-UP (CAD convention), origin at the bottom-left
// plot corner. The planning engine emits Y-DOWN screen coordinates, so every
// parcel is flipped on the way in.
//
// Pure & deterministic — no Date, no Math.random. The issue date is passed in
// by the caller so this stays reproducible.
// ---------------------------------------------------------------------------
import type { BylawRules, GeoPoint, Parcel, ProjectBrief, Scenario } from '../types'
import { DEV_TYPE_LABELS, LAND_USE_ZONE_LABELS, SQM_PER_ACRE } from '../types'
import { FLOOR_TO_FLOOR_M, requiredSetbacks } from './compliance'

export type Pt = [number, number]

export type DrawLayer =
  | 'PLOT-BOUNDARY'
  | 'SETBACK'
  | 'BUILDING'
  | 'PARCEL'
  | 'ROAD'
  | 'PARKING'
  | 'OPEN-SPACE'
  | 'AMENITY'
  | 'UTILITY'
  | 'DIMENSIONS'
  | 'TEXT'
  | 'NORTH-SCALE'
  | 'TITLEBLOCK'

export interface LayerDef {
  name: DrawLayer
  /** AutoCAD Color Index, written to the DXF LAYER table. */
  aci: number
  /** DASHED vs CONTINUOUS linetype. */
  dashed: boolean
  /** Stroke colour for the PDF, 0-1 RGB. */
  rgb: [number, number, number]
  /** Plotted line weight, mm. */
  lwMm: number
  /** PDF area fill, or null for outline-only. DXF is always outline-only —
   * planners hatch in their own CAD environment. */
  fill: [number, number, number] | null
}

/** Layer table. Order here is the order written to the DXF. */
export const DRAW_LAYERS: LayerDef[] = [
  { name: 'PLOT-BOUNDARY', aci: 7, dashed: true, rgb: [0.1, 0.1, 0.1], lwMm: 0.6, fill: null },
  { name: 'SETBACK', aci: 1, dashed: true, rgb: [0.78, 0.24, 0.24], lwMm: 0.25, fill: null },
  { name: 'BUILDING', aci: 5, dashed: false, rgb: [0.09, 0.31, 0.58], lwMm: 0.5, fill: [0.82, 0.88, 0.96] },
  { name: 'PARCEL', aci: 30, dashed: false, rgb: [0.72, 0.5, 0.0], lwMm: 0.25, fill: [0.99, 0.94, 0.82] },
  { name: 'ROAD', aci: 8, dashed: false, rgb: [0.45, 0.45, 0.42], lwMm: 0.25, fill: [0.9, 0.9, 0.87] },
  { name: 'PARKING', aci: 9, dashed: false, rgb: [0.4, 0.4, 0.38], lwMm: 0.25, fill: [0.84, 0.84, 0.8] },
  { name: 'OPEN-SPACE', aci: 3, dashed: false, rgb: [0.0, 0.42, 0.0], lwMm: 0.25, fill: [0.85, 0.94, 0.85] },
  { name: 'AMENITY', aci: 6, dashed: false, rgb: [0.29, 0.23, 0.65], lwMm: 0.25, fill: [0.9, 0.88, 0.97] },
  { name: 'UTILITY', aci: 253, dashed: false, rgb: [0.45, 0.44, 0.42], lwMm: 0.25, fill: [0.92, 0.92, 0.9] },
  { name: 'DIMENSIONS', aci: 2, dashed: false, rgb: [0.3, 0.3, 0.28], lwMm: 0.18, fill: null },
  { name: 'TEXT', aci: 7, dashed: false, rgb: [0.04, 0.04, 0.04], lwMm: 0.18, fill: null },
  { name: 'NORTH-SCALE', aci: 7, dashed: false, rgb: [0.15, 0.15, 0.15], lwMm: 0.35, fill: [0.15, 0.15, 0.15] },
  { name: 'TITLEBLOCK', aci: 7, dashed: false, rgb: [0.04, 0.04, 0.04], lwMm: 0.35, fill: null },
]

export type TextAlign = 'left' | 'center' | 'right'

export type DrawEntity =
  | { k: 'polyline'; layer: DrawLayer; pts: Pt[]; closed: boolean }
  | { k: 'line'; layer: DrawLayer; a: Pt; b: Pt }
  | { k: 'circle'; layer: DrawLayer; c: Pt; r: number }
  | { k: 'solid'; layer: DrawLayer; pts: Pt[] }
  | {
      k: 'text'
      layer: DrawLayer
      at: Pt
      /** Cap height in MODEL metres (already scaled for the paper size). */
      h: number
      text: string
      align: TextAlign
      /** Degrees, counter-clockwise. */
      rot: number
      bold: boolean
    }

export interface SheetSpec {
  name: string
  widthMm: number
  heightMm: number
}

export const SHEETS: Record<'A4' | 'A3' | 'A2' | 'A1', SheetSpec> = {
  A4: { name: 'A4', widthMm: 297, heightMm: 210 },
  A3: { name: 'A3', widthMm: 420, heightMm: 297 },
  A2: { name: 'A2', widthMm: 594, heightMm: 420 },
  A1: { name: 'A1', widthMm: 841, heightMm: 594 },
}

/** Standard architectural / town-planning scale denominators. */
const SCALES = [50, 100, 200, 250, 500, 1000, 1250, 2000, 2500, 5000, 10000]

// Sheet furniture, all in PAPER millimetres. The pads are measured from where
// the annotation actually lands further down (dimension offsets, scale-bar
// position, north-arrow offset) — keep them in step if those move, or the
// chosen scale will not match the space the drawing really needs.
const MARGIN_MM = 10
const PAD_TOP_MM = 3
/** Depth dimension line at 13 mm out, plus its rotated text. */
const PAD_LEFT_MM = 18
/** North arrow sits 12 mm clear of the plot and is ~4 mm wide. */
const PAD_RIGHT_MM = 18
/** Width dimension (13 mm) + scale bar and its labels (to ~30 mm). */
const PAD_BOTTOM_MM = 34

// Annotation sizes, PAPER millimetres.
const TXT_PARCEL_MM = 2.0
const TXT_DIM_MM = 2.2
const TXT_NORTH_MM = 3.6
const TXT_SCALE_MM = 2.4
const TXT_TB_TITLE_MM = 4.2
const TXT_TB_SUB_MM = 2.6
const TXT_TB_BODY_MM = 2.4
const TXT_TB_FINE_MM = 2.0

// Title block rows, top to bottom, in PAPER mm. The box height is DERIVED from
// these so content can never outgrow its frame — add a row here and the sheet
// budget (and therefore the chosen scale) adjusts with it.
const TB_PAD_MM = 3
const TB_LEADING = 1.75
const TB_DIVIDER_GAP_MM = 2
const TB_ROW_MM = [
  TXT_TB_TITLE_MM, // project name
  TXT_TB_SUB_MM, // development type · scenario
  TXT_TB_BODY_MM, // jurisdiction · authority        (divider follows)
  TXT_TB_BODY_MM, // plot area · size · zone
  TXT_TB_BODY_MM, // far · coverage · built-up · height · parking
  TXT_TB_BODY_MM, // scale · gps · issued
  TXT_TB_FINE_MM, // status disclaimer
]
const TITLEBLOCK_H_MM =
  TB_PAD_MM * 2 + TB_DIVIDER_GAP_MM + TB_ROW_MM.reduce((a, h) => a + h * TB_LEADING, 0)

export interface DrawingMeta {
  projectName: string
  scenarioName: string
  jurisdictionName: string
  authority: string
  landUseZone: string
  developmentType: string
  plotAreaSqm: number
  plotW: number
  plotD: number
  far: number
  groundCoveragePct: number
  maxFloors: number
  totalUnits: number
  builtUpAreaSqm: number
  /** Equivalent Car Spaces required by the bylaw parking schedule. */
  parkingEcs: number
  setbacks: { front: number; side: number; rear: number }
  /** False when the required setback envelope cannot physically fit inside
   * the supplied plot dimensions. No reduced/fictional envelope is drawn. */
  setbackEnvelopeFits: boolean
  location?: GeoPoint
  issuedOn?: string
}

export interface Drawing {
  entities: DrawEntity[]
  layers: LayerDef[]
  sheet: SheetSpec
  /** Denominator of the drawing scale — 500 means 1:500. */
  scale: number
  marginMm: number
  /** Model-space extents in metres, annotation and title block included. */
  min: Pt
  max: Pt
  meta: DrawingMeta
}

function r2(v: number): number {
  return Math.round(v * 100) / 100
}

/** Indian-grouped integer without locale plumbing — the drawing writers need
 * plain ASCII, and toLocaleString can emit non-breaking spaces. */
function intStr(n: number): string {
  const s = String(Math.round(Math.abs(n)))
  if (s.length <= 3) return (n < 0 ? '-' : '') + s
  const last3 = s.slice(-3)
  let rest = s.slice(0, -3)
  const groups: string[] = []
  while (rest.length > 2) {
    groups.unshift(rest.slice(-2))
    rest = rest.slice(0, -2)
  }
  if (rest.length) groups.unshift(rest)
  return (n < 0 ? '-' : '') + groups.join(',') + ',' + last3
}

/** Nice round scale-bar length in metres, divisible into 4 equal segments. */
function pickScaleBar(plotW: number): number {
  const nice = [4, 10, 20, 40, 100, 200, 400, 1000, 2000, 4000]
  let best = nice[0]
  for (const n of nice) if (n <= plotW * 0.45) best = n
  return best
}

/** Which layer a generated parcel belongs on. A parcel carrying floors is a
 * built structure regardless of its land-use category. */
function layerForParcel(p: Parcel): DrawLayer {
  if (p.floors && p.floors > 0) return 'BUILDING'
  const label = (p.label ?? '').toLowerCase()
  switch (p.use) {
    case 'roads':
      // The house generator emits a combined "Drive & Car Park" strip; the
      // masterplan generator emits carriageway only.
      return label.includes('park') ? 'PARKING' : 'ROAD'
    case 'green':
      return 'OPEN-SPACE'
    case 'amenities':
      return 'AMENITY'
    case 'utilities':
      return 'UTILITY'
    default:
      return 'PARCEL'
  }
}

/** Rough plotted width of a string at cap height `h`, in the same units as h.
 * Only used to decide whether a label fits inside a parcel, so it deliberately
 * over-estimates — a clipped label is worse than a dropped one. */
function textWidth(s: string, h: number): number {
  return s.length * h * 0.62
}

/** Fraction of a parcel's width a label may occupy before it is dropped. */
const LABEL_FIT = 0.9

export function buildDrawing(
  brief: ProjectBrief,
  scenario: Scenario,
  rules: BylawRules,
  opts: { sheet?: keyof typeof SHEETS; issuedOn?: string } = {},
): Drawing {
  const sheet = SHEETS[opts.sheet ?? 'A3']
  const plotW = Math.max(scenario.layout.plotW, 1)
  const plotD = Math.max(scenario.layout.plotD, 1)

  // ------------------------- choose the paper scale -------------------------
  const availW = sheet.widthMm - 2 * MARGIN_MM - PAD_LEFT_MM - PAD_RIGHT_MM
  const availH =
    sheet.heightMm - 2 * MARGIN_MM - PAD_TOP_MM - PAD_BOTTOM_MM - TITLEBLOCK_H_MM
  let scale = SCALES[SCALES.length - 1]
  for (const s of SCALES) {
    if ((plotW * 1000) / s <= availW && (plotD * 1000) / s <= availH) {
      scale = s
      break
    }
  }
  /** Paper millimetres -> model metres at the chosen scale. */
  const M = (mm: number) => (mm * scale) / 1000

  const ents: DrawEntity[] = []
  const add = (e: DrawEntity) => ents.push(e)
  const rect = (layer: DrawLayer, x0: number, y0: number, x1: number, y1: number) =>
    add({
      k: 'polyline',
      layer,
      pts: [
        [r2(x0), r2(y0)],
        [r2(x1), r2(y0)],
        [r2(x1), r2(y1)],
        [r2(x0), r2(y1)],
      ],
      closed: true,
    })

  // ------------------------------ plot boundary -----------------------------
  rect('PLOT-BOUNDARY', 0, 0, plotW, plotD)

  // --------------------------- setback envelope -----------------------------
  // The planning engine treats the TOP of the layout (y=0, screen) as the road
  // frontage, which is the TOP edge (Y = plotD) once flipped to CAD Y-up.
  //
  // Required setbacks come from the compliance engine, not from the raw bylaw
  // minimums: above 15 m they scale with building height, so a base-value line
  // would under-draw the envelope the compliance report is actually testing.
  const req = requiredSetbacks(rules, scenario.maxFloors * FLOOR_TO_FLOOR_M)
  const sbF = req.front
  const sbR = req.rear
  const sbS = req.side
  const setbackEnvelopeFits = plotW - 2 * sbS > 1 && plotD - sbF - sbR > 1
  if (setbackEnvelopeFits) {
    rect('SETBACK', sbS, sbR, plotW - sbS, plotD - sbF)
    // Keyed below the plot rather than on it — an annotation laid over the
    // plan collides with parcel labels at every scale.
    add({
      k: 'text',
      layer: 'SETBACK',
      at: [0, r2(-M(5.5))],
      h: M(2.0),
      text: `- - -  SETBACK LINE:  FRONT ${sbF} m / SIDE ${sbS} m / REAR ${sbR} m`,
      align: 'left',
      rot: 0,
      bold: false,
    })
  } else {
    add({
      k: 'text',
      layer: 'SETBACK',
      at: [0, r2(-M(5.5))],
      h: M(2.0),
      text: `NO COMPLIANT SETBACK ENVELOPE: REQUIRED FRONT ${sbF} m / SIDE ${sbS} m / REAR ${sbR} m`,
      align: 'left',
      rot: 0,
      bold: true,
    })
  }

  // -------------------------------- parcels ---------------------------------
  const hPar = M(TXT_PARCEL_MM)
  for (const p of scenario.layout.parcels) {
    const layer = layerForParcel(p)
    const x0 = p.x
    const x1 = p.x + p.w
    // Flip the planning engine's Y-down rectangle into CAD Y-up.
    const y0 = plotD - (p.y + p.h)
    const y1 = plotD - p.y
    rect(layer, x0, y0, x1, y1)

    // Labels only where they actually fit inside the parcel at plot scale.
    const cx = (x0 + x1) / 2
    const cy = (y0 + y1) / 2
    const lines: string[] = []
    if (p.label) lines.push(p.label)
    const sub: string[] = []
    if (p.floors && p.floors > 0) sub.push(`G+${p.floors - 1}`)
    sub.push(`${intStr(p.w * p.h)} sqm`)
    lines.push(sub.join('  ·  '))

    const fits = lines.every((t) => textWidth(t, hPar) <= p.w * LABEL_FIT)
    if (fits && p.h >= hPar * 3.2) {
      lines.forEach((t, i) => {
        const dy = lines.length === 2 ? (i === 0 ? hPar * 0.75 : -hPar * 0.75) : 0
        add({
          k: 'text',
          layer: 'TEXT',
          at: [r2(cx), r2(cy + dy)],
          h: hPar,
          text: t,
          align: 'center',
          rot: 0,
          bold: i === 0,
        })
      })
    } else if (p.label && textWidth(p.label, hPar) <= p.w * LABEL_FIT && p.h >= hPar * 1.8) {
      add({
        k: 'text',
        layer: 'TEXT',
        at: [r2(cx), r2(cy)],
        h: hPar,
        text: p.label,
        align: 'center',
        rot: 0,
        bold: false,
      })
    }
  }

  // ------------------------------ dimensions --------------------------------
  // Drawn as explicit geometry (extension lines + dimension line + architect's
  // tick marks + text) on the DIMENSIONS layer, NOT as parametric DIMENSION
  // entities — those need a block table that R12 DXF cannot carry portably.
  const hDim = M(TXT_DIM_MM)
  const tick = M(1.6)
  const dimOff = M(13)
  const extOver = M(2.5)

  // Overall width, below the plot.
  {
    const y = -dimOff
    add({ k: 'line', layer: 'DIMENSIONS', a: [0, -M(2)], b: [0, y - extOver] })
    add({ k: 'line', layer: 'DIMENSIONS', a: [r2(plotW), -M(2)], b: [r2(plotW), y - extOver] })
    add({ k: 'line', layer: 'DIMENSIONS', a: [0, r2(y)], b: [r2(plotW), r2(y)] })
    add({ k: 'line', layer: 'DIMENSIONS', a: [-tick, r2(y - tick)], b: [tick, r2(y + tick)] })
    add({
      k: 'line',
      layer: 'DIMENSIONS',
      a: [r2(plotW - tick), r2(y - tick)],
      b: [r2(plotW + tick), r2(y + tick)],
    })
    add({
      k: 'text',
      layer: 'DIMENSIONS',
      at: [r2(plotW / 2), r2(y + hDim * 0.6)],
      h: hDim,
      text: `${r2(plotW)} m`,
      align: 'center',
      rot: 0,
      bold: false,
    })
  }

  // Overall depth, left of the plot, text reading bottom-to-top.
  {
    const x = -dimOff
    add({ k: 'line', layer: 'DIMENSIONS', a: [-M(2), 0], b: [r2(x - extOver), 0] })
    add({ k: 'line', layer: 'DIMENSIONS', a: [-M(2), r2(plotD)], b: [r2(x - extOver), r2(plotD)] })
    add({ k: 'line', layer: 'DIMENSIONS', a: [r2(x), 0], b: [r2(x), r2(plotD)] })
    add({ k: 'line', layer: 'DIMENSIONS', a: [r2(x - tick), -tick], b: [r2(x + tick), tick] })
    add({
      k: 'line',
      layer: 'DIMENSIONS',
      a: [r2(x - tick), r2(plotD - tick)],
      b: [r2(x + tick), r2(plotD + tick)],
    })
    add({
      k: 'text',
      layer: 'DIMENSIONS',
      at: [r2(x - hDim * 0.6), r2(plotD / 2)],
      h: hDim,
      text: `${r2(plotD)} m`,
      align: 'center',
      rot: 90,
      bold: false,
    })
  }

  // ------------------------------ north arrow -------------------------------
  {
    const ax = plotW + M(12)
    const ay = plotD - M(2)
    const hgt = M(11)
    const wid = M(3.6)
    add({
      k: 'solid',
      layer: 'NORTH-SCALE',
      pts: [
        [r2(ax), r2(ay)],
        [r2(ax - wid), r2(ay - hgt)],
        [r2(ax + wid), r2(ay - hgt)],
      ],
    })
    add({ k: 'line', layer: 'NORTH-SCALE', a: [r2(ax), r2(ay)], b: [r2(ax), r2(ay - hgt * 1.55)] })
    add({
      k: 'text',
      layer: 'NORTH-SCALE',
      at: [r2(ax), r2(ay - hgt * 1.55 - M(TXT_NORTH_MM) * 1.3)],
      h: M(TXT_NORTH_MM),
      text: 'N',
      align: 'center',
      rot: 0,
      bold: true,
    })
  }

  // ------------------------------- scale bar --------------------------------
  const barLen = pickScaleBar(plotW)
  {
    const y = -M(25)
    const hBar = M(1.8)
    const seg = barLen / 4
    for (let i = 0; i < 4; i++) {
      const x0 = i * seg
      const x1 = x0 + seg
      if (i % 2 === 0) {
        // Filled segment — two triangles, since SOLID takes a quad.
        add({
          k: 'solid',
          layer: 'NORTH-SCALE',
          pts: [
            [r2(x0), r2(y)],
            [r2(x1), r2(y)],
            [r2(x0), r2(y + hBar)],
            [r2(x1), r2(y + hBar)],
          ],
        })
      }
      rect('NORTH-SCALE', x0, y, x1, y + hBar)
    }
    for (const [v, label] of [
      [0, '0'],
      [barLen / 2, intStr(barLen / 2)],
      [barLen, `${intStr(barLen)} m`],
    ] as [number, string][]) {
      add({
        k: 'text',
        layer: 'NORTH-SCALE',
        at: [r2(v), r2(y - M(TXT_SCALE_MM) * 1.5)],
        h: M(TXT_SCALE_MM),
        text: label,
        align: 'center',
        rot: 0,
        bold: false,
      })
    }
    add({
      k: 'text',
      layer: 'NORTH-SCALE',
      at: [r2(barLen + M(8)), r2(y + hBar / 2)],
      h: M(TXT_SCALE_MM),
      text: `SCALE 1:${scale} @ ${sheet.name}`,
      align: 'left',
      rot: 0,
      bold: true,
    })
  }

  // ------------------------------ title block -------------------------------
  const parkingEcs = Math.ceil(
    (scenario.builtUpAreaSqm / 100) * Math.max(0, rules.parkingEcsPer100Sqm),
  )
  const meta: DrawingMeta = {
    projectName: brief.name,
    scenarioName: `${scenario.name} — ${scenario.tagline}`,
    jurisdictionName: `${rules.name}, ${rules.state}`,
    authority: rules.authority,
    landUseZone: LAND_USE_ZONE_LABELS[brief.landUseZone],
    developmentType: DEV_TYPE_LABELS[brief.developmentType],
    plotAreaSqm: brief.plotAreaSqm,
    plotW,
    plotD,
    far: scenario.far,
    groundCoveragePct: scenario.groundCoveragePct,
    maxFloors: scenario.maxFloors,
    totalUnits: scenario.totalUnits,
    builtUpAreaSqm: scenario.builtUpAreaSqm,
    parkingEcs,
    setbacks: { front: sbF, side: sbS, rear: sbR },
    setbackEnvelopeFits,
    location: brief.location,
    issuedOn: opts.issuedOn,
  }

  {
    // At least 180 mm of paper so the longest schedule line clears the frame.
    const tbW = Math.max(plotW + M(12), M(180))
    const tbH = M(TITLEBLOCK_H_MM)
    const top = -M(34)
    const pad = M(TB_PAD_MM)
    rect('TITLEBLOCK', 0, top - tbH, tbW, top)

    const pin = brief.location
      ? `GPS ${brief.location.lat.toFixed(5)} N, ${brief.location.lng.toFixed(5)} E`
      : 'GPS not recorded'
    const rows: string[] = [
      brief.name.toUpperCase(),
      `${meta.developmentType}  -  ${meta.scenarioName}`,
      `${meta.jurisdictionName}  -  ${meta.authority}`,
      `PLOT ${intStr(brief.plotAreaSqm)} sqm (${(brief.plotAreaSqm / SQM_PER_ACRE).toFixed(2)} ac)   ` +
        `SIZE ${r2(plotW)} x ${r2(plotD)} m   ZONE ${meta.landUseZone}`,
      `FAR ${scenario.far.toFixed(2)}   COVERAGE ${Math.round(scenario.groundCoveragePct)}%   ` +
        `BUILT-UP ${intStr(scenario.builtUpAreaSqm)} sqm   ` +
        `HEIGHT G+${Math.max(0, scenario.maxFloors - 1)}   PARKING ${intStr(parkingEcs)} ECS`,
      `SCALE 1:${scale} @ ${sheet.name}   ${pin}` +
        (opts.issuedOn ? `   ISSUED ${opts.issuedOn}` : ''),
      'CONCEPT DRAWING - NOT FOR CONSTRUCTION. Demo-grade bylaw data; verify against the sanctioned master plan.',
    ]

    // Walk the same row table the box height was derived from, so text and
    // frame stay in step by construction.
    let cursor = top - pad
    rows.forEach((text, i) => {
      const h = M(TB_ROW_MM[i])
      cursor -= h * TB_LEADING
      add({
        k: 'text',
        layer: 'TITLEBLOCK',
        at: [r2(pad), r2(cursor + h * 0.35)],
        h,
        text,
        align: 'left',
        rot: 0,
        bold: i === 0,
      })
      // Divider between the identity block and the schedule.
      if (i === 2) {
        cursor -= M(TB_DIVIDER_GAP_MM)
        add({
          k: 'line',
          layer: 'TITLEBLOCK',
          a: [r2(pad), r2(cursor)],
          b: [r2(tbW - pad), r2(cursor)],
        })
      }
    })
  }

  // ------------------------------- extents ----------------------------------
  let minX = 0
  let minY = 0
  let maxX = plotW
  let maxY = plotD
  const see = (p: Pt) => {
    if (p[0] < minX) minX = p[0]
    if (p[0] > maxX) maxX = p[0]
    if (p[1] < minY) minY = p[1]
    if (p[1] > maxY) maxY = p[1]
  }
  for (const e of ents) {
    if (e.k === 'polyline' || e.k === 'solid') e.pts.forEach(see)
    else if (e.k === 'line') {
      see(e.a)
      see(e.b)
    } else if (e.k === 'circle') {
      see([e.c[0] - e.r, e.c[1] - e.r])
      see([e.c[0] + e.r, e.c[1] + e.r])
    } else {
      // Text: bound generously so nothing clips out of the plotted extents.
      const w = textWidth(e.text, e.h)
      if (e.rot === 90) {
        see([e.at[0] - e.h, e.at[1] - w / 2])
        see([e.at[0] + e.h, e.at[1] + w / 2])
      } else {
        const x0 = e.align === 'left' ? e.at[0] : e.align === 'center' ? e.at[0] - w / 2 : e.at[0] - w
        see([x0, e.at[1] - e.h])
        see([x0 + w, e.at[1] + e.h])
      }
    }
  }

  return {
    entities: ents,
    layers: DRAW_LAYERS,
    sheet,
    scale,
    marginMm: MARGIN_MM,
    min: [r2(minX), r2(minY)],
    max: [r2(maxX), r2(maxY)],
    meta,
  }
}
