// ---------------------------------------------------------------------------
// UnitPlanBrief — the input surface for Feature 2 v0.
//
// The draft carries no derived values (the site kernel's G2 lesson). Room
// placements are produced by a template function, never supplied by the
// caller, and validation recomputes everything it certifies.
// ---------------------------------------------------------------------------
import type { FeetInches } from './units.ts'

/** Every non-measured quantity must say where it came from. */
export interface AssumptionRecord {
  readonly kind: 'assumption'
  /** PENDING-MANNU marker (e.g. "M-U4") or other open-question reference. */
  readonly pendingRef: string
  readonly note: string
}

export interface WallAssumptions {
  readonly externalMm: number
  readonly internalMm: number
  readonly provenance: AssumptionRecord
}

export type RoomUse =
  | 'habitable'
  | 'kitchen'
  | 'toilet'
  | 'circulation'
  | 'shaft'

export interface RoomSpec {
  readonly id: string
  readonly label: string
  readonly use: RoomUse
  /** Clear (finished-face) size exactly as the source schedule prints it. */
  readonly clearWidth: FeetInches
  readonly clearDepth: FeetInches
  /**
   * True when the printed schedule gives depth x width relative to the
   * template's axes and the template places the room rotated 90 degrees.
   * The lettering on the sheet always shows the printed order.
   */
  readonly rotated: boolean
}

export interface DoorSpec {
  readonly id: string
  /** 'EXTERIOR' is allowed for the entrance door. */
  readonly fromRoomId: string
  readonly toRoomId: string
  readonly width: FeetInches
}

export interface BalconySpec {
  readonly id: string
  readonly label: string
  readonly attachedToRoomId: string
  /** The brochure's "6' WIDE BALCONY" figure — the projection depth. */
  readonly projection: FeetInches
}

/**
 * Spaces the template must add that the source schedule does not list
 * (circulation and service shafts). Their sizes are assumptions and must be
 * declared as such — the sheet prints no clear-size lettering for them.
 */
export interface TemplateAssumptions {
  readonly corridorWidth: FeetInches
  readonly shaftWidth: FeetInches
  readonly provenance: AssumptionRecord
}

export type RequestedStatus = 'research-draft' | 'ready-for-professional-review'

export interface SheetRequest {
  readonly ref: string
  readonly widthMm: number
  readonly heightMm: number
  readonly scaleDenominator: number
}

export interface SourceAttribution {
  readonly document: string
  readonly note: string
}

export interface UnitPlanBrief {
  readonly projectName: string
  readonly unitLabel: string
  readonly source: SourceAttribution
  readonly rooms: readonly RoomSpec[]
  readonly doors: readonly DoorSpec[]
  readonly balconies: readonly BalconySpec[]
  readonly walls: WallAssumptions | null
  readonly template: TemplateAssumptions | null
  readonly requestedStatus: RequestedStatus
  readonly sheet: SheetRequest
  /** Supplied by the caller; the module never reads a clock. */
  readonly issueDate: string
}
