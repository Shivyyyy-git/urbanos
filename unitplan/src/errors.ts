// ---------------------------------------------------------------------------
// UrbanOS unit-plan module — coded errors.
// Same philosophy as the site kernel: every refusal carries a stable code.
// ---------------------------------------------------------------------------

export type UnitPlanErrorCode =
  | 'E_VALUE_NOT_FINITE'
  | 'E_WALL_ASSUMPTION_MISSING'
  | 'E_ROOM_OVERLAP'
  | 'E_ROOM_OUTSIDE_ENVELOPE'
  | 'E_ENVELOPE_DISCONNECTED'
  | 'E_ENVELOPE_HAS_HOLES'
  | 'E_DOOR_NOT_ON_SHARED_WALL'
  | 'E_DOOR_TOO_WIDE_FOR_WALL'
  | 'E_BALCONY_DETACHED'
  | 'E_DIMENSION_MISMATCH'
  | 'E_ASSUMPTIONS_BLOCK_REVIEW'
  | 'E_DUPLICATE_ROOM_ID'
  | 'E_UNKNOWN_ROOM_REF'
  | 'E_EXPORT_PARITY'

export interface UnitPlanFinding {
  code: UnitPlanErrorCode
  message: string
  observed?: string
  required?: string
}

export class UnitPlanError extends Error {
  readonly code: UnitPlanErrorCode
  readonly finding: UnitPlanFinding

  constructor(finding: UnitPlanFinding) {
    super(`${finding.code}: ${finding.message}`)
    this.name = 'UnitPlanError'
    this.code = finding.code
    this.finding = finding
  }
}

export function fail(finding: UnitPlanFinding): never {
  throw new UnitPlanError(finding)
}
