// ---------------------------------------------------------------------------
// Fail-closed validation for the unit-plan template output.
//
// The validator recomputes everything it certifies: overlaps, envelope
// topology, containment, door walls, balcony attachment and printed-size
// integrity. Nothing is trusted because the template produced it.
// ---------------------------------------------------------------------------
import type { DoorSpec, UnitPlanBrief } from './brief.ts'
import { fail } from './errors.ts'
import {
  computeEnvelope,
  pointInRing,
  rectArea,
  rectCorners,
  rectsOverlap,
  sharedWall,
  type Point,
  type Rect,
  type SharedWall,
} from './geom.ts'
import { sha256 } from './hash.ts'
import {
  buildPrivyAt42BhkLayout,
  type BalconyPlacement,
  type PlacedRoom,
  type TemplateLayout,
  type WindowPlacement,
} from './template.ts'
import { formatSize, toMetres } from './units.ts'

const MIN_WALL_GAP = 0.05
const MAX_WALL_GAP = 0.35

export interface PlacedDoor {
  readonly spec: DoorSpec
  readonly widthM: number
  readonly wall: SharedWall
  /** Interval of the leaf along the wall axis, centred on the shared overlap. */
  readonly from: number
  readonly to: number
  readonly exterior: boolean
}

export interface PlacedWindow extends WindowPlacement {
  /** Interval along the face and the fixed coordinate of the room face. */
  readonly from: number
  readonly to: number
  readonly faceAt: number
  readonly outwardSign: 1 | -1
  readonly axis: 'x' | 'y'
}

export interface ValidatedUnitPlan {
  readonly brief: UnitPlanBrief
  readonly rooms: readonly PlacedRoom[]
  readonly balconies: readonly BalconyPlacement[]
  readonly doors: readonly PlacedDoor[]
  readonly windows: readonly PlacedWindow[]
  readonly envelopeRing: readonly Point[]
  readonly carpetAreaSqm: number
  readonly wallExternalM: number
  readonly wallInternalM: number
  readonly reviewStatus: 'RESEARCH DRAFT - NOT FOR CONSTRUCTION'
  readonly digest: string
  readonly assumptionNotes: readonly string[]
}

function roomById(rooms: readonly PlacedRoom[], id: string): PlacedRoom {
  const room = rooms.find((candidate) => candidate.id === id)
  if (room === undefined) {
    fail({
      code: 'E_UNKNOWN_ROOM_REF',
      message: `Reference to unknown room "${id}".`,
      required: rooms.map((candidate) => candidate.id).join(', '),
    })
  }
  return room
}

function checkNoDuplicateIds(layout: TemplateLayout): void {
  const seen = new Set<string>()
  for (const room of layout.rooms) {
    if (seen.has(room.id)) {
      fail({ code: 'E_DUPLICATE_ROOM_ID', message: `Duplicate room id "${room.id}".` })
    }
    seen.add(room.id)
  }
}

export interface LayoutSpaces {
  readonly rooms: readonly { readonly id: string; readonly rect: Rect }[]
  readonly balconies: readonly { readonly id: string; readonly rect: Rect }[]
}

/**
 * Declared test seam (same precedent as the site kernel's
 * verifyDimensionIntegrity): the geometry invariants that guard against
 * template bugs, runnable against a hostile layout. validateUnitPlan calls
 * exactly this; tests may call it with layouts the template would never
 * produce, so a future template edit cannot silently disable a gate.
 */
export function auditLayoutGeometry(
  spaces: LayoutSpaces,
  wallExternalM: number,
): { outerRing: readonly Point[] } {
  const all = [...spaces.rooms, ...spaces.balconies]
  for (const space of all) {
    if (
      !Number.isFinite(space.rect.x)
      || !Number.isFinite(space.rect.y)
      || !Number.isFinite(space.rect.w)
      || !Number.isFinite(space.rect.h)
      || space.rect.w <= 0
      || space.rect.h <= 0
    ) {
      fail({
        code: 'E_VALUE_NOT_FINITE',
        message: `Space "${space.id}" has a degenerate or non-finite rectangle.`,
        observed: `${space.rect.w.toFixed(4)} x ${space.rect.h.toFixed(4)} m at (${space.rect.x.toFixed(4)}, ${space.rect.y.toFixed(4)})`,
        required: 'finite position and strictly positive width and height',
      })
    }
  }
  for (let a = 0; a < all.length; a += 1) {
    for (let b = a + 1; b < all.length; b += 1) {
      if (rectsOverlap(all[a]!.rect, all[b]!.rect)) {
        fail({
          code: 'E_ROOM_OVERLAP',
          message: `Spaces "${all[a]!.id}" and "${all[b]!.id}" overlap.`,
          required: 'strictly disjoint clear areas separated by wall thickness',
        })
      }
    }
  }
  const envelope = computeEnvelope(spaces.rooms.map((room) => room.rect), wallExternalM)
  for (const room of spaces.rooms) {
    for (const corner of rectCorners(room.rect)) {
      if (!pointInRing(corner, envelope.outerRing)) {
        fail({
          code: 'E_ROOM_OUTSIDE_ENVELOPE',
          message: `Room "${room.id}" has a corner outside the envelope.`,
          observed: `(${corner[0].toFixed(4)}, ${corner[1].toFixed(4)})`,
        })
      }
    }
  }
  return envelope
}

function checkPrintedSizes(layout: TemplateLayout): void {
  for (const room of layout.rooms) {
    if (room.printed === null) continue
    const expectedW = toMetres(room.printed.rotated ? room.printed.depth : room.printed.width)
    const expectedH = toMetres(room.printed.rotated ? room.printed.width : room.printed.depth)
    if (Math.abs(room.rect.w - expectedW) > 1e-9 || Math.abs(room.rect.h - expectedH) > 1e-9) {
      fail({
        code: 'E_DIMENSION_MISMATCH',
        message: `Placed geometry for "${room.id}" does not equal its printed clear size.`,
        observed: `${room.rect.w.toFixed(4)} x ${room.rect.h.toFixed(4)} m`,
        required: `${expectedW.toFixed(4)} x ${expectedH.toFixed(4)} m`,
      })
    }
  }
}

function isExteriorFace(
  room: Rect,
  side: 'N' | 'S' | 'E' | 'W',
  allSpaces: readonly Rect[],
  wallExternalM: number,
  ring: readonly Point[],
): { faceAt: number; axis: 'x' | 'y'; outwardSign: 1 | -1; from: number; to: number } | null {
  const axis: 'x' | 'y' = side === 'E' || side === 'W' ? 'x' : 'y'
  const outwardSign: 1 | -1 = side === 'N' || side === 'E' ? 1 : -1
  const faceAt = axis === 'x'
    ? (side === 'E' ? room.x + room.w : room.x)
    : (side === 'N' ? room.y + room.h : room.y)
  const from = axis === 'x' ? room.y : room.x
  const to = axis === 'x' ? room.y + room.h : room.x + room.w
  const mid = (from + to) / 2
  const probeDistance = wallExternalM + 0.01
  const probe: Point = axis === 'x'
    ? [faceAt + outwardSign * probeDistance, mid]
    : [mid, faceAt + outwardSign * probeDistance]
  if (pointInRing(probe, ring)) return null
  void allSpaces
  return { faceAt, axis, outwardSign, from, to }
}

function placeDoors(
  brief: UnitPlanBrief,
  layout: TemplateLayout,
  ring: readonly Point[],
  wallExternalM: number,
): PlacedDoor[] {
  const placed: PlacedDoor[] = []
  for (const door of brief.doors) {
    const widthM = toMetres(door.width)
    if (door.fromRoomId === 'EXTERIOR' || door.toRoomId === 'EXTERIOR') {
      const roomId = door.fromRoomId === 'EXTERIOR' ? door.toRoomId : door.fromRoomId
      const room = roomById(layout.rooms, roomId)
      const face = isExteriorFace(room.rect, 'E', [], wallExternalM, ring)
      if (face === null) {
        fail({
          code: 'E_DOOR_NOT_ON_SHARED_WALL',
          message: `Entrance door "${door.id}" requires an exterior east face on "${roomId}".`,
        })
      }
      if (widthM > face.to - face.from) {
        fail({
          code: 'E_DOOR_TOO_WIDE_FOR_WALL',
          message: `Entrance door "${door.id}" is wider than the wall face.`,
          observed: `${widthM.toFixed(3)} m`,
          required: `<= ${(face.to - face.from).toFixed(3)} m`,
        })
      }
      const centre = (face.from + face.to) / 2
      placed.push({
        spec: door,
        widthM,
        wall: {
          axis: 'x',
          gap: wallExternalM,
          overlapLength: face.to - face.from,
          from: face.from,
          to: face.to,
          at: face.faceAt + wallExternalM / 2,
        },
        from: centre - widthM / 2,
        to: centre + widthM / 2,
        exterior: true,
      })
      continue
    }
    const roomA = roomById(layout.rooms, door.fromRoomId)
    const balcony = layout.balconies.find((candidate) => candidate.id === door.toRoomId)
    const rectB = balcony !== undefined ? balcony.rect : roomById(layout.rooms, door.toRoomId).rect
    const wall = sharedWall(roomA.rect, rectB, MIN_WALL_GAP, MAX_WALL_GAP)
    if (wall === null) {
      fail({
        code: 'E_DOOR_NOT_ON_SHARED_WALL',
        message: `Door "${door.id}" joins "${door.fromRoomId}" and "${door.toRoomId}", which share no wall.`,
        required: `facing walls with a gap of ${MIN_WALL_GAP}-${MAX_WALL_GAP} m and positive overlap`,
      })
    }
    if (widthM > wall.overlapLength + 1e-9) {
      fail({
        code: 'E_DOOR_TOO_WIDE_FOR_WALL',
        message: `Door "${door.id}" is wider than the shared wall between "${door.fromRoomId}" and "${door.toRoomId}".`,
        observed: `${widthM.toFixed(3)} m leaf`,
        required: `<= ${wall.overlapLength.toFixed(3)} m shared`,
      })
    }
    const centre = (wall.from + wall.to) / 2
    placed.push({
      spec: door,
      widthM,
      wall,
      from: centre - widthM / 2,
      to: centre + widthM / 2,
      exterior: false,
    })
  }
  return placed
}

function placeWindows(
  layout: TemplateLayout,
  ring: readonly Point[],
  wallExternalM: number,
): PlacedWindow[] {
  const placed: PlacedWindow[] = []
  for (const window of layout.windows) {
    const room = roomById(layout.rooms, window.roomId)
    const face = isExteriorFace(room.rect, window.side, [], wallExternalM, ring)
    if (face === null) {
      fail({
        code: 'E_DOOR_NOT_ON_SHARED_WALL',
        message: `Window "${window.id}" is declared on a face of "${window.roomId}" that is not exterior.`,
        observed: `side ${window.side}`,
      })
    }
    const centre = (face.from + face.to) / 2
    placed.push({
      ...window,
      from: centre - window.widthM / 2,
      to: centre + window.widthM / 2,
      faceAt: face.faceAt,
      outwardSign: face.outwardSign,
      axis: face.axis,
    })
  }
  return placed
}

function checkBalconies(layout: TemplateLayout, wallExternalM: number): void {
  for (const balcony of layout.balconies) {
    const room = roomById(layout.rooms, balcony.attachedToRoomId)
    const wall = sharedWall(
      balcony.rect,
      room.rect,
      wallExternalM - 1e-6,
      wallExternalM + 1e-6,
    )
    if (wall === null || wall.overlapLength < 1.0) {
      fail({
        code: 'E_BALCONY_DETACHED',
        message: `Balcony "${balcony.id}" is not flush against the external wall of "${balcony.attachedToRoomId}".`,
        required: `gap exactly ${wallExternalM.toFixed(3)} m (the external wall) with >= 1.0 m of shared face`,
      })
    }
  }
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    if (typeof value === 'number' && Object.is(value, -0)) return '0'
    return JSON.stringify(value)
  }
  if (Array.isArray(value)) {
    return `[${value.map((entry) => canonicalJson(entry)).join(',')}]`
  }
  const entries = Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
    .map(([key, entry]) => `${JSON.stringify(key)}:${canonicalJson(entry)}`)
  return `{${entries.join(',')}}`
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value)
    for (const key of Object.getOwnPropertyNames(value)) {
      deepFreeze((value as Record<string, unknown>)[key])
    }
  }
  return value
}

export function validateUnitPlan(brief: UnitPlanBrief): ValidatedUnitPlan {
  if (brief.walls === null) {
    fail({
      code: 'E_WALL_ASSUMPTION_MISSING',
      message: 'Wall thicknesses must be declared with provenance; no silent defaults.',
      required: 'brief.walls with an AssumptionRecord',
    })
  }
  if (
    !Number.isFinite(brief.walls.externalMm)
    || !Number.isFinite(brief.walls.internalMm)
    || brief.walls.externalMm <= 0
    || brief.walls.internalMm <= 0
  ) {
    fail({
      code: 'E_VALUE_NOT_FINITE',
      message: 'Wall thicknesses must be finite positive millimetres.',
      observed: `${String(brief.walls.externalMm)} / ${String(brief.walls.internalMm)}`,
    })
  }

  const assumptionNotes: string[] = []
  assumptionNotes.push(
    `WALLS ASSUMED ${brief.walls.externalMm} MM EXTERNAL / ${brief.walls.internalMm} MM INTERNAL`
      + ` (${brief.walls.provenance.pendingRef} PENDING)`,
  )
  if (brief.template !== null) {
    assumptionNotes.push(
      `CIRCULATION AND SHAFT SIZES ARE TEMPLATE ASSUMPTIONS (${brief.template.provenance.pendingRef} PENDING)`,
    )
  }

  if (brief.requestedStatus === 'ready-for-professional-review') {
    fail({
      code: 'E_ASSUMPTIONS_BLOCK_REVIEW',
      message:
        'This plan is built on declared assumptions (walls, circulation, arrangement). '
        + 'It cannot be marked Ready for Professional Review; only Research Draft is available in v0.',
      observed: assumptionNotes.join('; '),
      required: "requestedStatus: 'research-draft'",
    })
  }

  const layout = buildPrivyAt42BhkLayout(brief)
  checkNoDuplicateIds(layout)
  checkPrintedSizes(layout)

  const wallExternalM = brief.walls.externalMm / 1000
  const wallInternalM = brief.walls.internalMm / 1000
  const envelope = auditLayoutGeometry(
    {
      rooms: layout.rooms.map((room) => ({ id: room.id, rect: room.rect })),
      balconies: layout.balconies.map((balcony) => ({ id: balcony.id, rect: balcony.rect })),
    },
    wallExternalM,
  )
  checkBalconies(layout, wallExternalM)
  const doors = placeDoors(brief, layout, envelope.outerRing, wallExternalM)
  const windows = placeWindows(layout, envelope.outerRing, wallExternalM)

  const carpetAreaSqm = layout.rooms
    .filter((room) => room.printed !== null)
    .reduce((total, room) => total + rectArea(room.rect), 0)

  const roomsWithText: PlacedRoom[] = layout.rooms.map((room) => ({
    ...room,
    sizeText: room.printed === null
      ? null
      : formatSize(room.printed.width, room.printed.depth),
  }))

  const digestPayload = {
    brief,
    rooms: roomsWithText,
    balconies: layout.balconies,
    doors,
    windows,
    envelopeRing: envelope.outerRing,
    carpetAreaSqm,
  }

  const validated: ValidatedUnitPlan = {
    brief,
    rooms: roomsWithText,
    balconies: layout.balconies,
    doors,
    windows,
    envelopeRing: envelope.outerRing,
    carpetAreaSqm,
    wallExternalM,
    wallInternalM,
    reviewStatus: 'RESEARCH DRAFT - NOT FOR CONSTRUCTION',
    digest: sha256(canonicalJson(digestPayload)),
    assumptionNotes,
  }
  return deepFreeze(validated)
}
