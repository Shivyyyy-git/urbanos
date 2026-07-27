// ---------------------------------------------------------------------------
// Coded errors (contract §7.7).
//
// A thrown bare Error carries no stable code, so a test could only assert THAT it
// threw, never WHY. KernelError carries the ratified BlockerCode and the Finding.
//
// Note the asymmetry, which is deliberate: assertExportable THROWS, because a
// guard that can be ignored is not a guard. resolveSitePlan and validateSitePlan
// do NOT throw for contract failures — they return findings, because an invalid
// draft is an expected outcome of intake, not an exceptional condition.
// ---------------------------------------------------------------------------
import type { BlockerCode, Finding } from './contract.ts'

export class KernelError extends Error {
  readonly code: BlockerCode
  readonly finding: Finding

  constructor(finding: Finding) {
    super(finding.message)
    this.name = 'KernelError'
    this.code = finding.code as BlockerCode
    this.finding = finding
  }
}
