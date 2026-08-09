// ---------------------------------------------------------------------------
// Unit-plan drawing model. One neutral model feeds both the DXF and PDF
// writers; neither writer rebuilds geometry (the site kernel's DG-1 rule).
//
// Wall reading: each room's clear outline is drawn, and the envelope outer
// face is drawn around everything, so the poche between outlines reads as
// wall. Door leaves cut the facing room outlines; swing arcs are symbolic.
// ---------------------------------------------------------------------------
import { fail } from './errors.ts'
import type { Point, Rect } from './geom.ts'
import type { PlacedDoor, PlacedWindow, ValidatedUnitPlan } from './validate.ts'

export type UnitLayer =
  | 'ENVELOPE'
  | 'ROOM'
  | 'BALCONY'
  | 'DOOR'
  | 'WINDOW'
  | 'ROOM-TEXT'
  | 'DIMENSION'
  | 'NORTH'
  | 'ANNOTATION'

export interface UnitLayerStyle {
  name: UnitLayer
  aci: number
  rgb: readonly [number, number, number]
  lineWeightMm: number
  dashed: boolean
}

export const UNIT_LAYERS: readonly UnitLayerStyle[] = [
  { name: 'ENVELOPE', aci: 7, rgb: [0.05, 0.05, 0.05], lineWeightMm: 0.70, dashed: false },
  { name: 'ROOM', aci: 8, rgb: [0.15, 0.15, 0.15], lineWeightMm: 0.35, dashed: false },
  { name: 'BALCONY', aci: 8, rgb: [0.35, 0.35, 0.35], lineWeightMm: 0.30, dashed: false },
  { name: 'DOOR', aci: 30, rgb: [0.72, 0.35, 0.05], lineWeightMm: 0.25, dashed: false },
  { name: 'WINDOW', aci: 5, rgb: [0.10, 0.25, 0.72], lineWeightMm: 0.25, dashed: false },
  { name: 'ROOM-TEXT', aci: 7, rgb: [0.05, 0.05, 0.05], lineWeightMm: 0.18, dashed: false },
  { name: 'DIMENSION', aci: 2, rgb: [0.30, 0.30, 0.28], lineWeightMm: 0.18, dashed: false },
  { name: 'NORTH', aci: 7, rgb: [0.05, 0.05, 0.05], lineWeightMm: 0.40, dashed: false },
  { name: 'ANNOTATION', aci: 7, rgb: [0.04, 0.04, 0.04], lineWeightMm: 0.18, dashed: false },
] as const

export interface UnitDrawingPath {
  kind: 'path'
  id: string
  layer: UnitLayer
  points: readonly Point[]
  closed: boolean
  critical: boolean
}

export interface UnitDrawingText {
  kind: 'text'
  id: string
  layer: UnitLayer
  at: Point
  heightMm: number
  text: string
  rotationDegrees: number
  align: 'left' | 'center' | 'right'
  bold: boolean
}

export interface UnitDrawingModel {
  coordinateUnit: 'm'
  scaleDenominator: number
  projectName: string
  unitLabel: string
  reviewStatus: 'RESEARCH DRAFT - NOT FOR CONSTRUCTION'
  sourceNote: string
  assumptionNotes: readonly string[]
  issueDate: string
  digest: string
  carpetAreaSqm: number
  paths: readonly UnitDrawingPath[]
  texts: readonly UnitDrawingText[]
  bounds: { minX: number; minY: number; maxX: number; maxY: number }
}

interface Cut {
  readonly from: number
  readonly to: number
}

type Side = 'S' | 'E' | 'N' | 'W'

function sideSegment(rect: Rect, side: Side): { a: Point; b: Point; axis: 'x' | 'y'; fixed: number } {
  switch (side) {
    case 'S':
      return { a: [rect.x, rect.y], b: [rect.x + rect.w, rect.y], axis: 'y', fixed: rect.y }
    case 'E':
      return {
        a: [rect.x + rect.w, rect.y],
        b: [rect.x + rect.w, rect.y + rect.h],
        axis: 'x',
        fixed: rect.x + rect.w,
      }
    case 'N':
      return {
        a: [rect.x + rect.w, rect.y + rect.h],
        b: [rect.x, rect.y + rect.h],
        axis: 'y',
        fixed: rect.y + rect.h,
      }
    case 'W':
      return { a: [rect.x, rect.y + rect.h], b: [rect.x, rect.y], axis: 'x', fixed: rect.x }
  }
}

/**
 * Emits a rectangle outline with door/window intervals removed. Each side is
 * cut independently; output is a list of open polylines.
 */
function rectWithCuts(
  idPrefix: string,
  layer: UnitLayer,
  rect: Rect,
  cuts: ReadonlyMap<Side, readonly Cut[]>,
): UnitDrawingPath[] {
  const paths: UnitDrawingPath[] = []
  const sides: Side[] = ['S', 'E', 'N', 'W']
  let pending: Point[] = []
  let pieceIndex = 0

  const flush = () => {
    if (pending.length >= 2) {
      paths.push({
        kind: 'path',
        id: `${idPrefix}/${pieceIndex}`,
        layer,
        points: pending,
        closed: false,
        critical: true,
      })
      pieceIndex += 1
    }
    pending = []
  }

  for (const side of sides) {
    const segment = sideSegment(rect, side)
    const sideCuts = [...(cuts.get(side) ?? [])].sort((l, r) => l.from - r.from)
    const start = segment.a
    const end = segment.b
    const along = (t: number): Point => {
      // t is the absolute coordinate along the side's variable axis.
      if (side === 'S' || side === 'N') return [t, segment.fixed === rect.y || side === 'S' ? segment.fixed : segment.fixed]
      return [segment.fixed, t]
    }
    const startT = side === 'S' ? start[0] : side === 'N' ? start[0] : start[1]
    const endT = side === 'S' ? end[0] : side === 'N' ? end[0] : end[1]
    const direction = Math.sign(endT - startT)
    if (pending.length === 0) pending.push(start)

    let cursor = startT
    const ordered = direction > 0 ? sideCuts : [...sideCuts].reverse()
    for (const cut of ordered) {
      const cutStart = direction > 0 ? cut.from : cut.to
      const cutEnd = direction > 0 ? cut.to : cut.from
      if (direction > 0 ? cutStart <= cursor : cutStart >= cursor) {
        cursor = cutEnd
        flush()
        pending.push(side === 'S' || side === 'N' ? [cutEnd, segment.fixed] : [segment.fixed, cutEnd])
        continue
      }
      pending.push(side === 'S' || side === 'N' ? [cutStart, segment.fixed] : [segment.fixed, cutStart])
      flush()
      pending.push(side === 'S' || side === 'N' ? [cutEnd, segment.fixed] : [segment.fixed, cutEnd])
      cursor = cutEnd
    }
    void along
    pending.push(end)
  }
  // Close back to the first corner if nothing was cut on the last stretch.
  flush()
  return paths
}

function quarterArc(centre: Point, radius: number, startDeg: number, endDeg: number): Point[] {
  const points: Point[] = []
  const steps = 12
  for (let index = 0; index <= steps; index += 1) {
    const angle = ((startDeg + ((endDeg - startDeg) * index) / steps) * Math.PI) / 180
    points.push([
      centre[0] + radius * Math.cos(angle),
      centre[1] + radius * Math.sin(angle),
    ])
  }
  return points
}

function doorSymbol(door: PlacedDoor, index: number): UnitDrawingPath[] {
  const { wall } = door
  const hinge: Point = wall.axis === 'x'
    ? [wall.at, door.from]
    : [door.from, wall.at]
  const leafAngle = wall.axis === 'x' ? 90 : 0
  const arc = quarterArc(hinge, door.widthM, leafAngle, leafAngle + 90)
  const leafEnd = arc[0]!
  return [
    {
      kind: 'path',
      id: `door/${door.spec.id}/${index}/leaf`,
      layer: 'DOOR',
      points: [hinge, leafEnd],
      closed: false,
      critical: false,
    },
    {
      kind: 'path',
      id: `door/${door.spec.id}/${index}/swing`,
      layer: 'DOOR',
      points: arc,
      closed: false,
      critical: false,
    },
  ]
}

function windowSymbol(window: PlacedWindow, wallExternalM: number): UnitDrawingPath[] {
  const outer = window.faceAt + window.outwardSign * wallExternalM
  const mid = window.faceAt + (window.outwardSign * wallExternalM) / 2
  const rectPoints: Point[] = window.axis === 'x'
    ? [
      [window.faceAt, window.from],
      [outer, window.from],
      [outer, window.to],
      [window.faceAt, window.to],
    ]
    : [
      [window.from, window.faceAt],
      [window.from, outer],
      [window.to, outer],
      [window.to, window.faceAt],
    ]
  const midLine: Point[] = window.axis === 'x'
    ? [
      [mid, window.from],
      [mid, window.to],
    ]
    : [
      [window.from, mid],
      [window.to, mid],
    ]
  return [
    {
      kind: 'path',
      id: `window/${window.id}/frame`,
      layer: 'WINDOW',
      points: rectPoints,
      closed: true,
      critical: false,
    },
    {
      kind: 'path',
      id: `window/${window.id}/mid`,
      layer: 'WINDOW',
      points: midLine,
      closed: false,
      critical: false,
    },
  ]
}

function dimensionLine(
  id: string,
  from: Point,
  to: Point,
  label: string,
  offsetDirection: 'below' | 'left',
): { paths: UnitDrawingPath[]; text: UnitDrawingText } {
  const tick = 0.15
  const paths: UnitDrawingPath[] = [
    { kind: 'path', id: `${id}/line`, layer: 'DIMENSION', points: [from, to], closed: false, critical: false },
  ]
  for (const [pointIndex, point] of [from, to].entries()) {
    const tickPath: Point[] = offsetDirection === 'below'
      ? [
        [point[0] - tick / 2, point[1] - tick / 2],
        [point[0] + tick / 2, point[1] + tick / 2],
      ]
      : [
        [point[0] - tick / 2, point[1] - tick / 2],
        [point[0] + tick / 2, point[1] + tick / 2],
      ]
    paths.push({
      kind: 'path',
      id: `${id}/tick/${pointIndex}`,
      layer: 'DIMENSION',
      points: tickPath,
      closed: false,
      critical: false,
    })
  }
  const mid: Point = [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2]
  const text: UnitDrawingText = {
    kind: 'text',
    id: `${id}/text`,
    layer: 'DIMENSION',
    at: offsetDirection === 'below' ? [mid[0], mid[1] + 0.12] : [mid[0] - 0.12, mid[1]],
    heightMm: 2.5,
    text: label,
    rotationDegrees: offsetDirection === 'below' ? 0 : 90,
    align: 'center',
    bold: false,
  }
  return { paths, text }
}

export function buildUnitDrawingModel(
  plan: ValidatedUnitPlan,
  scaleDenominator: number,
): UnitDrawingModel {
  if (!Number.isFinite(scaleDenominator) || scaleDenominator <= 0) {
    fail({
      code: 'E_EXPORT_PARITY',
      message: 'Scale denominator must be a finite positive number.',
      observed: String(scaleDenominator),
    })
  }
  const paths: UnitDrawingPath[] = []
  const texts: UnitDrawingText[] = []

  // --- Envelope outline with entry-door cut ---
  const envelopeCutDoors = plan.doors.filter((door) => door.exterior)
  const ring = plan.envelopeRing
  let ringPending: Point[] = []
  let ringPiece = 0
  const flushRing = (closedWhole: boolean) => {
    if (ringPending.length >= 2) {
      paths.push({
        kind: 'path',
        id: `envelope/${ringPiece}`,
        layer: 'ENVELOPE',
        points: ringPending,
        closed: closedWhole,
        critical: true,
      })
      ringPiece += 1
    }
    ringPending = []
  }
  if (envelopeCutDoors.length === 0) {
    paths.push({
      kind: 'path',
      id: 'envelope/0',
      layer: 'ENVELOPE',
      points: ring,
      closed: true,
      critical: true,
    })
  } else {
    // Walk ring edges; cut where an exterior door interval lies on the edge.
    const eps = 1e-6
    for (let index = 0; index < ring.length; index += 1) {
      const a = ring[index]!
      const b = ring[(index + 1) % ring.length]!
      if (ringPending.length === 0) ringPending.push(a)
      let cutApplied = false
      for (const door of envelopeCutDoors) {
        const outerFace = door.wall.at + door.wall.gap / 2
        const vertical = Math.abs(a[0] - b[0]) < eps
        if (
          vertical
          && Math.abs(a[0] - outerFace) < 1e-3
          && Math.min(a[1], b[1]) <= door.from + eps
          && Math.max(a[1], b[1]) >= door.to - eps
        ) {
          const direction = Math.sign(b[1] - a[1])
          const firstStop = direction > 0 ? door.from : door.to
          const secondStop = direction > 0 ? door.to : door.from
          ringPending.push([a[0], firstStop])
          flushRing(false)
          ringPending.push([a[0], secondStop])
          cutApplied = true
        }
      }
      void cutApplied
      ringPending.push(b)
    }
    flushRing(false)
  }

  // --- Rooms with door cuts on their outlines ---
  for (const room of plan.rooms) {
    const cuts = new Map<Side, Cut[]>()
    for (const door of plan.doors) {
      if (door.exterior) {
        if (door.spec.toRoomId !== room.id && door.spec.fromRoomId !== room.id) continue
        const face = door.wall.at - door.wall.gap / 2
        if (Math.abs(face - (room.rect.x + room.rect.w)) < 1e-6) {
          const list = cuts.get('E') ?? []
          list.push({ from: door.from, to: door.to })
          cuts.set('E', list)
        }
        continue
      }
      const involved = door.spec.fromRoomId === room.id || door.spec.toRoomId === room.id
      if (!involved) continue
      const lower = door.wall.at - door.wall.gap / 2
      const upper = door.wall.at + door.wall.gap / 2
      if (door.wall.axis === 'x') {
        if (Math.abs(room.rect.x + room.rect.w - lower) < 1e-6) {
          const list = cuts.get('E') ?? []
          list.push({ from: door.from, to: door.to })
          cuts.set('E', list)
        } else if (Math.abs(room.rect.x - upper) < 1e-6) {
          const list = cuts.get('W') ?? []
          list.push({ from: door.from, to: door.to })
          cuts.set('W', list)
        }
      } else if (Math.abs(room.rect.y + room.rect.h - lower) < 1e-6) {
        const list = cuts.get('N') ?? []
        list.push({ from: door.from, to: door.to })
        cuts.set('N', list)
      } else if (Math.abs(room.rect.y - upper) < 1e-6) {
        const list = cuts.get('S') ?? []
        list.push({ from: door.from, to: door.to })
        cuts.set('S', list)
      }
    }
    paths.push(...rectWithCuts(`room/${room.id}`, 'ROOM', room.rect, cuts))

    const centre: Point = [room.rect.x + room.rect.w / 2, room.rect.y + room.rect.h / 2]
    texts.push({
      kind: 'text',
      id: `label/${room.id}`,
      layer: 'ROOM-TEXT',
      at: [centre[0], centre[1] + (room.sizeText === null ? 0 : 0.16)],
      heightMm: room.use === 'shaft' || room.use === 'circulation' ? 2.0 : 2.8,
      text: room.label,
      rotationDegrees: room.use === 'shaft' ? 90 : 0,
      align: 'center',
      bold: room.use === 'habitable',
    })
    if (room.sizeText !== null) {
      texts.push({
        kind: 'text',
        id: `size/${room.id}`,
        layer: 'ROOM-TEXT',
        at: [centre[0], centre[1] - 0.26],
        heightMm: 2.2,
        text: room.sizeText,
        rotationDegrees: 0,
        align: 'center',
        bold: false,
      })
    }
  }

  // --- Balconies: outline + railing midline + label ---
  for (const balcony of plan.balconies) {
    const { rect } = balcony
    paths.push({
      kind: 'path',
      id: `balcony/${balcony.id}`,
      layer: 'BALCONY',
      points: [
        [rect.x, rect.y],
        [rect.x + rect.w, rect.y],
        [rect.x + rect.w, rect.y + rect.h],
        [rect.x, rect.y + rect.h],
      ],
      closed: true,
      critical: true,
    })
    texts.push({
      kind: 'text',
      id: `label/${balcony.id}`,
      layer: 'ROOM-TEXT',
      at: [rect.x + rect.w / 2, rect.y + rect.h / 2],
      heightMm: 2.0,
      text: balcony.label,
      rotationDegrees: rect.h > rect.w ? 90 : 0,
      align: 'center',
      bold: false,
    })
  }

  // --- Door and window symbols ---
  for (const [index, door] of plan.doors.entries()) paths.push(...doorSymbol(door, index))
  for (const window of plan.windows) paths.push(...windowSymbol(window, plan.wallExternalM))

  // --- Extents and overall dimensions ---
  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY
  for (const path of paths) {
    for (const point of path.points) {
      minX = Math.min(minX, point[0])
      minY = Math.min(minY, point[1])
      maxX = Math.max(maxX, point[0])
      maxY = Math.max(maxY, point[1])
    }
  }

  const dimOffset = 1.1
  const bottom = dimensionLine(
    'dim/overall-width',
    [minX, minY - dimOffset],
    [maxX, minY - dimOffset],
    `OVERALL ${(maxX - minX).toFixed(3)} m`,
    'below',
  )
  const left = dimensionLine(
    'dim/overall-height',
    [minX - dimOffset, minY],
    [minX - dimOffset, maxY],
    `OVERALL ${(maxY - minY).toFixed(3)} m`,
    'left',
  )
  paths.push(...bottom.paths, ...left.paths)
  texts.push(bottom.text, left.text)

  // --- North arrow (declared assumption: north = sheet top) ---
  const northBase: Point = [maxX + 0.9, maxY - 0.2]
  paths.push({
    kind: 'path',
    id: 'north/arrow',
    layer: 'NORTH',
    points: [
      [northBase[0] - 0.28, northBase[1] - 0.75],
      [northBase[0], northBase[1]],
      [northBase[0] + 0.28, northBase[1] - 0.75],
      [northBase[0], northBase[1] - 0.5],
    ],
    closed: true,
    critical: false,
  })
  texts.push({
    kind: 'text',
    id: 'north/label',
    layer: 'NORTH',
    at: [northBase[0], northBase[1] + 0.18],
    heightMm: 3.0,
    text: 'N (ASSUMED)',
    rotationDegrees: 0,
    align: 'center',
    bold: true,
  })

  const bounds = {
    minX: minX - 1.6,
    minY: minY - 1.7,
    maxX: maxX + 1.6,
    maxY: maxY + 0.9,
  }

  return {
    coordinateUnit: 'm',
    scaleDenominator,
    projectName: plan.brief.projectName,
    unitLabel: plan.brief.unitLabel,
    reviewStatus: plan.reviewStatus,
    sourceNote: `${plan.brief.source.document} - ${plan.brief.source.note}`,
    assumptionNotes: plan.assumptionNotes,
    issueDate: plan.brief.issueDate,
    digest: plan.digest,
    carpetAreaSqm: plan.carpetAreaSqm,
    paths,
    texts,
    bounds,
  }
}
