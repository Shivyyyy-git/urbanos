import type { DevelopmentType, Jurisdiction } from '../types'
import {
  REGULATORY_SOURCE_REGISTRY,
  type RegulatorySource,
} from '../data/sourceRegistry'

export type EvidenceClaimStatus = 'Decision Grade' | 'Research Draft'

export type EvidenceBlockCode =
  | 'invalid_claim'
  | 'invalid_evaluation_date'
  | 'missing_source'
  | 'missing_authority'
  | 'missing_artifact_title'
  | 'missing_canonical_url'
  | 'invalid_canonical_url'
  | 'missing_clause'
  | 'missing_effective_date'
  | 'invalid_effective_date'
  | 'not_yet_effective'
  | 'missing_checked_date'
  | 'invalid_checked_date'
  | 'future_checked_date'
  | 'stale_source'
  | 'unverified_source'
  | 'out_of_scope'
  | 'unsigned_source'
  | 'invalid_signature_date'
  | 'future_signature_date'
  | 'insufficient_confidence'

export interface EvidenceBlocker {
  code: EvidenceBlockCode
  sourceId: string | null
  message: string
}

export interface RegulatoryClaim {
  id: string
  jurisdiction: Jurisdiction
  developmentType?: DevelopmentType
  /** Compliance-check id, matching the ids used by the deterministic engine. */
  ruleId: string
  /** Explicit evidence links; the gate never guesses a supporting source. */
  sourceIds: readonly string[]
}

export interface EvidenceGateOptions {
  /**
   * Required instead of reading the system clock, keeping evaluation
   * reproducible. Strict YYYY-MM-DD.
   */
  asOfDate: string
  /** Maximum age of the source's last checked date. Defaults to 180 days. */
  maxCheckedAgeDays?: number
  /** Injectable for tests or a future versioned registry. */
  registry?: readonly RegulatorySource[]
}

export interface EvidenceGateResult {
  claimId: string
  status: EvidenceClaimStatus
  decisionGradeAllowed: boolean
  asOfDate: string
  evaluatedSourceIds: readonly string[]
  blockers: readonly EvidenceBlocker[]
}

const DAY_MS = 86_400_000
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/

/** Parse YYYY-MM-DD without locale or timezone-dependent string parsing. */
function isoDay(value: string): number | null {
  const match = ISO_DATE.exec(value)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (year < 1000 || month < 1 || month > 12 || day < 1 || day > 31) return null
  const timestamp = Date.UTC(year, month - 1, day)
  const date = new Date(timestamp)
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null
  }
  return Math.floor(timestamp / DAY_MS)
}

function nonBlank(value: string): boolean {
  return value.trim().length > 0
}

function canonicalHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value)
    return (parsed.protocol === 'https:' || parsed.protocol === 'http:') && nonBlank(parsed.hostname)
  } catch {
    return false
  }
}

function sourceCoversClaim(source: RegulatorySource, claim: RegulatoryClaim): boolean {
  const registryJurisdictionCovers =
    source.jurisdiction === 'national' || source.jurisdiction.includes(claim.jurisdiction)
  const scopedJurisdictionCovers =
    source.scope.jurisdictions === 'all' ||
    source.scope.jurisdictions.includes(claim.jurisdiction)
  const ruleCovers =
    source.scope.ruleIds === 'all' || source.scope.ruleIds.includes(claim.ruleId)
  const developmentTypeCovers =
    source.scope.developmentTypes === 'all' ||
    (claim.developmentType !== undefined &&
      source.scope.developmentTypes.includes(claim.developmentType))
  return (
    registryJurisdictionCovers &&
    scopedJurisdictionCovers &&
    ruleCovers &&
    developmentTypeCovers
  )
}

function push(
  blockers: EvidenceBlocker[],
  code: EvidenceBlockCode,
  sourceId: string | null,
  message: string,
): void {
  blockers.push({ code, sourceId, message })
}

/**
 * Fail-closed evidence evaluation.
 *
 * A claim is Decision Grade only when every explicitly linked source is
 * present, in scope, current, verified, clause-cited, canonically linked,
 * high-confidence and signed by a reviewer. Any uncertainty returns Research
 * Draft with machine-readable blockers.
 */
export function evaluateEvidenceGate(
  claim: RegulatoryClaim,
  options: EvidenceGateOptions,
): EvidenceGateResult {
  const blockers: EvidenceBlocker[] = []
  const registry = options.registry ?? REGULATORY_SOURCE_REGISTRY
  const maxCheckedAgeDays = options.maxCheckedAgeDays ?? 180
  const asOfDay = isoDay(options.asOfDate)

  if (!Number.isInteger(maxCheckedAgeDays) || maxCheckedAgeDays < 0) {
    throw new RangeError('maxCheckedAgeDays must be a non-negative integer')
  }

  if (!nonBlank(claim.id) || !nonBlank(claim.ruleId)) {
    push(
      blockers,
      'invalid_claim',
      null,
      'A claim must have non-empty id and ruleId values.',
    )
  }
  if (asOfDay === null) {
    push(
      blockers,
      'invalid_evaluation_date',
      null,
      `Evaluation date "${options.asOfDate}" is not a valid YYYY-MM-DD date.`,
    )
  }

  const sourceIds = Array.from(
    new Set(claim.sourceIds.map((sourceId) => sourceId.trim()).filter(nonBlank)),
  )
  if (sourceIds.length === 0) {
    push(
      blockers,
      'missing_source',
      null,
      'No regulatory source is explicitly linked to this claim.',
    )
  }

  for (const sourceId of sourceIds) {
    const source = registry.find((candidate) => candidate.id === sourceId)
    if (!source) {
      push(
        blockers,
        'missing_source',
        sourceId,
        `Linked regulatory source "${sourceId}" is absent from the registry.`,
      )
      continue
    }

    if (!nonBlank(source.authority)) {
      push(blockers, 'missing_authority', source.id, 'The issuing authority is missing.')
    }
    if (!nonBlank(source.artifactTitle)) {
      push(
        blockers,
        'missing_artifact_title',
        source.id,
        'The controlling artifact title is missing.',
      )
    }

    if (source.canonicalUrl === null || !nonBlank(source.canonicalUrl)) {
      push(
        blockers,
        'missing_canonical_url',
        source.id,
        'No official canonical URL has been verified for this source.',
      )
    } else if (!canonicalHttpUrl(source.canonicalUrl)) {
      push(
        blockers,
        'invalid_canonical_url',
        source.id,
        'The canonical URL is not a valid HTTP(S) URL.',
      )
    }

    if (source.clause === null || !nonBlank(source.clause)) {
      push(
        blockers,
        'missing_clause',
        source.id,
        'No exact supporting clause has been verified.',
      )
    }

    if (source.effectiveDate === null) {
      push(
        blockers,
        'missing_effective_date',
        source.id,
        'The source effective date is unknown.',
      )
    } else {
      const effectiveDay = isoDay(source.effectiveDate)
      if (effectiveDay === null) {
        push(
          blockers,
          'invalid_effective_date',
          source.id,
          `Effective date "${source.effectiveDate}" is not a valid YYYY-MM-DD date.`,
        )
      } else if (asOfDay !== null && effectiveDay > asOfDay) {
        push(
          blockers,
          'not_yet_effective',
          source.id,
          `The source is not effective as of ${options.asOfDate}.`,
        )
      }
    }

    if (source.checkedDate === null) {
      push(
        blockers,
        'missing_checked_date',
        source.id,
        'The source has no recorded freshness check.',
      )
    } else {
      const checkedDay = isoDay(source.checkedDate)
      if (checkedDay === null) {
        push(
          blockers,
          'invalid_checked_date',
          source.id,
          `Checked date "${source.checkedDate}" is not a valid YYYY-MM-DD date.`,
        )
      } else if (asOfDay !== null) {
        if (checkedDay > asOfDay) {
          push(
            blockers,
            'future_checked_date',
            source.id,
            `The checked date falls after the evaluation date ${options.asOfDate}.`,
          )
        } else if (asOfDay - checkedDay > maxCheckedAgeDays) {
          push(
            blockers,
            'stale_source',
            source.id,
            `The source was last checked more than ${maxCheckedAgeDays} days before ${options.asOfDate}.`,
          )
        }
      }
    }

    if (source.verificationStatus !== 'verified') {
      push(
        blockers,
        'unverified_source',
        source.id,
        `Verification status is "${source.verificationStatus}", not "verified".`,
      )
    }

    if (!sourceCoversClaim(source, claim)) {
      push(
        blockers,
        'out_of_scope',
        source.id,
        `The source scope does not cover ${claim.jurisdiction}/${claim.ruleId}${
          claim.developmentType ? `/${claim.developmentType}` : ''
        }.`,
      )
    }

    if (
      source.reviewer === null ||
      !nonBlank(source.reviewer.name) ||
      !nonBlank(source.reviewer.role) ||
      !nonBlank(source.reviewer.signedAt)
    ) {
      push(
        blockers,
        'unsigned_source',
        source.id,
        'No complete reviewer sign-off is recorded.',
      )
    } else {
      const signedDay = isoDay(source.reviewer.signedAt)
      if (signedDay === null) {
        push(
          blockers,
          'invalid_signature_date',
          source.id,
          `Signature date "${source.reviewer.signedAt}" is not a valid YYYY-MM-DD date.`,
        )
      } else if (asOfDay !== null && signedDay > asOfDay) {
        push(
          blockers,
          'future_signature_date',
          source.id,
          `Reviewer sign-off falls after the evaluation date ${options.asOfDate}.`,
        )
      }
    }

    if (source.confidence !== 'high') {
      push(
        blockers,
        'insufficient_confidence',
        source.id,
        `Source confidence is "${source.confidence}", not "high".`,
      )
    }
  }

  const decisionGradeAllowed = blockers.length === 0
  return {
    claimId: claim.id,
    status: decisionGradeAllowed ? 'Decision Grade' : 'Research Draft',
    decisionGradeAllowed,
    asOfDate: options.asOfDate,
    evaluatedSourceIds: sourceIds,
    blockers,
  }
}
