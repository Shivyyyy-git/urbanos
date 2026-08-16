// Fail-closed error surface for the townhouse demo. Codes are the stable
// contract Sol's acceptance harness asserts against; messages are for humans.
// This list may only grow via a ledger-recorded decision — never shrink.

export type TownhouseDemoErrorCode =
  | 'E_NOT_IMPLEMENTED'
  // Rulebook resolution (fail-closed on data — brief §3.2, Stage1Spec §5)
  | 'E_RULE_SLOT_MISSING' // a required slot has no applicable entry; detail names the slot
  | 'E_RULE_SLOT_DUPLICATE' // two applicable entries fill the same slot in one slice
  | 'E_RULE_ENTRY_NOT_DEMO' // an entry claims non-demo classification or a verified state
  | 'E_RULE_ENTRY_INVALID' // malformed entry (unit/value/id); detail names entry and field
  | 'E_RULE_SLICE_MIXED' // entries from different slices passed as one rulebook
  // Inputs (kernel refusal style — no silent defaults)
  | 'E_INPUT_MISSING' // a required fixture field is absent; detail names the field
  | 'E_INPUT_INVALID' // a fixture field or allocation is unusable; detail says why
  // Output gates
  | 'E_DEMO_WATERMARK_MISSING' // an artifact lacks the DEMO watermark; detail names artifact/page
  | 'E_CITATION_MISSING' // a printed number has no entry id backing it
  | 'E_GEOMETRY_PARITY' // outputs disagree on geometry, or a sheet cannot fit unrescaled
  | 'E_STAMP_UNREACHABLE' // something tried to compute a stamp other than the locked demo stamp

export interface TownhouseDemoFinding {
  readonly code: TownhouseDemoErrorCode
  readonly message: string
  readonly detail?: string
}

export class TownhouseDemoError extends Error {
  readonly code: TownhouseDemoErrorCode
  readonly finding: TownhouseDemoFinding

  constructor(finding: TownhouseDemoFinding) {
    super(`${finding.code}: ${finding.message}`)
    this.name = 'TownhouseDemoError'
    this.code = finding.code
    this.finding = finding
  }
}

export function fail(
  code: TownhouseDemoErrorCode,
  message: string,
  detail?: string,
): never {
  throw new TownhouseDemoError({
    code,
    message,
    ...(detail === undefined ? {} : { detail }),
  })
}
