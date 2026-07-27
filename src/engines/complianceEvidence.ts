import type { DevelopmentType, Jurisdiction } from '../types'
import {
  REGULATORY_SOURCE_REGISTRY,
  type RegulatorySource,
} from '../data/sourceRegistry'
import {
  evaluateEvidenceGate,
  type EvidenceBlocker,
  type EvidenceGateResult,
} from './evidence'

export interface ComplianceEvidenceAssessment {
  status: 'Decision Grade' | 'Research Draft'
  decisionGradeAllowed: boolean
  asOfDate: string
  totalClaims: number
  decisionGradeClaims: number
  researchDraftClaims: number
  linkedSourceCount: number
  claims: readonly EvidenceGateResult[]
  blockers: readonly EvidenceBlocker[]
}

export interface ComplianceEvidenceInput {
  jurisdiction: Jurisdiction
  developmentType: DevelopmentType
  ruleIds: readonly string[]
  asOfDate: string
  registry?: readonly RegulatorySource[]
  maxCheckedAgeDays?: number
}

function scopeIncludes<T>(scope: readonly T[] | 'all', value: T): boolean {
  return scope === 'all' || scope.includes(value)
}

function sourceApplies(
  source: RegulatorySource,
  jurisdiction: Jurisdiction,
  developmentType: DevelopmentType,
  ruleId: string,
): boolean {
  const registryJurisdiction =
    source.jurisdiction === 'national' || source.jurisdiction.includes(jurisdiction)
  return (
    registryJurisdiction &&
    scopeIncludes(source.scope.jurisdictions, jurisdiction) &&
    scopeIncludes(source.scope.developmentTypes, developmentType) &&
    scopeIncludes(source.scope.ruleIds, ruleId)
  )
}

/**
 * Evaluate every compliance-engine rule against the structured evidence
 * registry. A single unsupported or unverified rule keeps the whole screening
 * result at Research Draft.
 */
export function assessComplianceEvidence({
  jurisdiction,
  developmentType,
  ruleIds,
  asOfDate,
  registry = REGULATORY_SOURCE_REGISTRY,
  maxCheckedAgeDays,
}: ComplianceEvidenceInput): ComplianceEvidenceAssessment {
  const uniqueRuleIds = Array.from(new Set(ruleIds.map((id) => id.trim()).filter(Boolean)))
  const claims = uniqueRuleIds.map((ruleId) => {
    const sourceIds = registry
      .filter((source) => sourceApplies(source, jurisdiction, developmentType, ruleId))
      .map((source) => source.id)
    return evaluateEvidenceGate(
      {
        id: `${jurisdiction}-${developmentType}-${ruleId}`,
        jurisdiction,
        developmentType,
        ruleId,
        sourceIds,
      },
      {
        asOfDate,
        registry,
        ...(maxCheckedAgeDays === undefined ? {} : { maxCheckedAgeDays }),
      },
    )
  })

  const blockersByKey = new Map<string, EvidenceBlocker>()
  for (const claim of claims) {
    for (const blocker of claim.blockers) {
      const key = `${blocker.code}:${blocker.sourceId ?? 'none'}`
      if (!blockersByKey.has(key)) blockersByKey.set(key, blocker)
    }
  }

  const linkedSourceCount = new Set(claims.flatMap((claim) => claim.evaluatedSourceIds)).size
  const decisionGradeClaims = claims.filter((claim) => claim.decisionGradeAllowed).length
  const decisionGradeAllowed = claims.length > 0 && decisionGradeClaims === claims.length

  return {
    status: decisionGradeAllowed ? 'Decision Grade' : 'Research Draft',
    decisionGradeAllowed,
    asOfDate,
    totalClaims: claims.length,
    decisionGradeClaims,
    researchDraftClaims: claims.length - decisionGradeClaims,
    linkedSourceCount,
    claims,
    blockers: Array.from(blockersByKey.values()),
  }
}
