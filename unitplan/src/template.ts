// ---------------------------------------------------------------------------
// Parametric 2BHK template (v0), room schedule per the Spaze Privy AT4
// brochure. The ARRANGEMENT is UrbanOS's own rectilinear design — it is not a
// trace of the brochure plan, and the sheet says so. Every placement is
// derived arithmetically from the schedule dimensions plus the declared wall
// and template assumptions, so a changed input moves the whole plan
// consistently.
//
// Adjacency reproduced from the brochure: entrance lobby -> drawing/dining
// with kitchen at the entry side; study off the drawing room; master bedroom
// with attached toilet and balcony; second bedroom with balcony; common
// toilet off the circulation spine; toilets clustered on one service shaft.
// ---------------------------------------------------------------------------
import type { UnitPlanBrief } from './brief.ts'
import { fail } from './errors.ts'
import type { Rect } from './geom.ts'
import { toMetres, type FeetInches } from './units.ts'

export interface PlacedRoom {
  readonly id: string
  readonly label: string
  readonly use: 'habitable' | 'kitchen' | 'toilet' | 'circulation' | 'shaft'
  readonly rect: Rect
  /** Printed schedule lettering; null for derived spaces (no invented sizes). */
  readonly sizeText: string | null
  /** Printed clear size in template axes (null for derived spaces). */
  readonly printed: { readonly width: FeetInches; readonly depth: FeetInches; readonly rotated: boolean } | null
}

export interface WindowPlacement {
  readonly id: string
  readonly roomId: string
  readonly side: 'N' | 'S' | 'E' | 'W'
  readonly widthM: number
}

export interface BalconyPlacement {
  readonly id: string
  readonly label: string
  readonly attachedToRoomId: string
  readonly rect: Rect
}

export interface TemplateLayout {
  readonly rooms: readonly PlacedRoom[]
  readonly balconies: readonly BalconyPlacement[]
  readonly windows: readonly WindowPlacement[]
  /** Room id whose east face carries the entrance door. */
  readonly entryRoomId: string
}

export const PRIVY_AT4_2BHK_ROOM_IDS = [
  'study',
  'dwg-dining',
  'kitchen',
  'lobby',
  'master-bedroom',
  'toilet-master',
  'toilet-common',
  'bedroom-2',
] as const

function required(brief: UnitPlanBrief, id: string) {
  const room = brief.rooms.find((candidate) => candidate.id === id)
  if (room === undefined) {
    fail({
      code: 'E_UNKNOWN_ROOM_REF',
      message: `The 2BHK template requires room "${id}" in the brief.`,
      required: PRIVY_AT4_2BHK_ROOM_IDS.join(', '),
    })
  }
  return room
}

/** Placed width/height respecting the room's declared rotation. */
function placedSize(room: { clearWidth: FeetInches; clearDepth: FeetInches; rotated: boolean }) {
  const w = toMetres(room.rotated ? room.clearDepth : room.clearWidth)
  const h = toMetres(room.rotated ? room.clearWidth : room.clearDepth)
  return { w, h }
}

export function buildPrivyAt42BhkLayout(brief: UnitPlanBrief): TemplateLayout {
  if (brief.walls === null) {
    fail({
      code: 'E_WALL_ASSUMPTION_MISSING',
      message: 'Wall thicknesses must be declared (they are assumptions until M-U4 is answered); the template refuses silent defaults.',
      required: 'brief.walls with externalMm, internalMm and an AssumptionRecord',
    })
  }
  if (brief.template === null) {
    fail({
      code: 'E_WALL_ASSUMPTION_MISSING',
      message: 'Corridor and shaft sizes are template assumptions and must be declared, not defaulted.',
      required: 'brief.template with corridorWidth, shaftWidth and an AssumptionRecord',
    })
  }
  const wallInternal = brief.walls.internalMm / 1000
  const wallExternal = brief.walls.externalMm / 1000
  const corridorW = toMetres(brief.template.corridorWidth)
  const shaftW = toMetres(brief.template.shaftWidth)

  const study = required(brief, 'study')
  const dwg = required(brief, 'dwg-dining')
  const kitchen = required(brief, 'kitchen')
  const lobby = required(brief, 'lobby')
  const master = required(brief, 'master-bedroom')
  const toiletM = required(brief, 'toilet-master')
  const toilet2 = required(brief, 'toilet-common')
  const br2 = required(brief, 'bedroom-2')

  const sizes = {
    study: placedSize(study),
    dwg: placedSize(dwg),
    kitchen: placedSize(kitchen),
    lobby: placedSize(lobby),
    master: placedSize(master),
    toiletM: placedSize(toiletM),
    toilet2: placedSize(toilet2),
    br2: placedSize(br2),
  }

  // --- South band: study | drawing-dining | kitchen, lobby above kitchen ---
  const studyRect: Rect = { x: 0, y: 0, w: sizes.study.w, h: sizes.study.h }
  const dwgRect: Rect = {
    x: studyRect.x + studyRect.w + wallInternal,
    y: 0,
    w: sizes.dwg.w,
    h: sizes.dwg.h,
  }
  const kitchenRect: Rect = {
    x: dwgRect.x + dwgRect.w + wallInternal,
    y: 0,
    w: sizes.kitchen.w,
    h: sizes.kitchen.h,
  }
  const lobbyRect: Rect = {
    x: kitchenRect.x,
    y: kitchenRect.y + kitchenRect.h + wallInternal,
    w: sizes.lobby.w,
    h: sizes.lobby.h,
  }

  // --- Circulation spine between the bands ---
  const corridorRect: Rect = {
    x: dwgRect.x,
    y: dwgRect.y + dwgRect.h + wallInternal,
    w: lobbyRect.x + lobbyRect.w - dwgRect.x,
    h: corridorW,
  }

  // --- North band: master | service column (toilets + shaft) | bedroom 2 ---
  const northY = corridorRect.y + corridorRect.h + wallInternal
  const masterRect: Rect = { x: 0, y: northY, w: sizes.master.w, h: sizes.master.h }
  const serviceX = masterRect.x + masterRect.w + wallInternal
  const toilet2Rect: Rect = { x: serviceX, y: northY, w: sizes.toilet2.w, h: sizes.toilet2.h }
  const toiletMRect: Rect = {
    x: serviceX,
    y: toilet2Rect.y + toilet2Rect.h + wallInternal,
    w: sizes.toiletM.w,
    h: sizes.toiletM.h,
  }
  const shaftRect: Rect = {
    x: toiletMRect.x + toiletMRect.w,
    y: northY,
    w: shaftW,
    h: toiletMRect.y + toiletMRect.h - northY,
  }
  const br2Rect: Rect = {
    x: shaftRect.x + shaftRect.w + wallInternal,
    y: northY,
    w: sizes.br2.w,
    h: sizes.br2.h,
  }

  // --- Balconies: flush against the external wall face (outside envelope) ---
  // The template has exactly three balcony slots. A balcony pointed anywhere
  // else must fail loudly — silently dropping it would be the same defect
  // class as the old prototype's fabricated setbacks (output quietly missing
  // something the input declared).
  const BALCONY_SLOTS = ['dwg-dining', 'master-bedroom', 'bedroom-2']
  for (const balcony of brief.balconies) {
    if (!BALCONY_SLOTS.includes(balcony.attachedToRoomId)) {
      fail({
        code: 'E_BALCONY_DETACHED',
        message: `The 2BHK template has no balcony slot on room "${balcony.attachedToRoomId}"; balcony "${balcony.id}" cannot be placed.`,
        required: BALCONY_SLOTS.join(', '),
      })
    }
  }
  const balconyOf = (id: string) => brief.balconies.find((b) => b.attachedToRoomId === id)
  const balconies: BalconyPlacement[] = []
  const livingBalcony = balconyOf('dwg-dining')
  if (livingBalcony !== undefined) {
    const projection = toMetres(livingBalcony.projection)
    const inset = toMetres({ feet: 1, inches: 6 })
    balconies.push({
      id: livingBalcony.id,
      label: livingBalcony.label,
      attachedToRoomId: 'dwg-dining',
      rect: {
        x: dwgRect.x + inset,
        y: dwgRect.y - wallExternal - projection,
        w: dwgRect.w - 2 * inset,
        h: projection,
      },
    })
  }
  const masterBalcony = balconyOf('master-bedroom')
  if (masterBalcony !== undefined) {
    const projection = toMetres(masterBalcony.projection)
    balconies.push({
      id: masterBalcony.id,
      label: masterBalcony.label,
      attachedToRoomId: 'master-bedroom',
      rect: {
        x: masterRect.x,
        y: masterRect.y + masterRect.h + wallExternal,
        w: masterRect.w,
        h: projection,
      },
    })
  }
  const br2Balcony = balconyOf('bedroom-2')
  if (br2Balcony !== undefined) {
    const projection = toMetres(br2Balcony.projection)
    balconies.push({
      id: br2Balcony.id,
      label: br2Balcony.label,
      attachedToRoomId: 'bedroom-2',
      rect: {
        x: br2Rect.x + br2Rect.w + wallExternal,
        y: br2Rect.y,
        w: projection,
        h: br2Rect.h,
      },
    })
  }

  const place = (
    spec: typeof study,
    rect: Rect,
  ): PlacedRoom => ({
    id: spec.id,
    label: spec.label,
    use: spec.use,
    rect,
    sizeText: null, // filled by the drawing stage from printed sizes
    printed: { width: spec.clearWidth, depth: spec.clearDepth, rotated: spec.rotated },
  })

  const rooms: PlacedRoom[] = [
    place(study, studyRect),
    place(dwg, dwgRect),
    place(kitchen, kitchenRect),
    place(lobby, lobbyRect),
    place(master, masterRect),
    place(toiletM, toiletMRect),
    place(toilet2, toilet2Rect),
    place(br2, br2Rect),
    {
      id: 'corridor',
      label: 'CIRCULATION',
      use: 'circulation',
      rect: corridorRect,
      sizeText: null,
      printed: null,
    },
    {
      id: 'shaft',
      label: 'SHAFT',
      use: 'shaft',
      rect: shaftRect,
      sizeText: null,
      printed: null,
    },
  ]

  const ft = (feet: number, inches: number) => toMetres({ feet, inches })
  const windows: WindowPlacement[] = [
    { id: 'win-study-s', roomId: 'study', side: 'S', widthM: ft(4, 0) },
    { id: 'win-kitchen-s', roomId: 'kitchen', side: 'S', widthM: ft(4, 0) },
    { id: 'win-kitchen-e', roomId: 'kitchen', side: 'E', widthM: ft(3, 0) },
    { id: 'win-master-w', roomId: 'master-bedroom', side: 'W', widthM: ft(5, 0) },
    { id: 'win-br2-n', roomId: 'bedroom-2', side: 'N', widthM: ft(5, 0) },
    { id: 'win-toiletm-n', roomId: 'toilet-master', side: 'N', widthM: ft(2, 0) },
  ]

  return { rooms, balconies, windows, entryRoomId: 'lobby' }
}
