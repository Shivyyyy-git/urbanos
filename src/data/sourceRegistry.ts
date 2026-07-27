import type { DevelopmentType, Jurisdiction } from '../types'

/**
 * Provenance states are deliberately stricter than the UI's compliance
 * pass/warn/fail states. Only `verified` evidence is eligible to support a
 * decision-grade claim.
 */
export type EvidenceVerificationStatus =
  | 'unverified'
  | 'research-draft'
  | 'verified'
  | 'rejected'
  | 'superseded'

export type EvidenceConfidence = 'low' | 'medium' | 'high'

export interface EvidenceReviewer {
  name: string
  role: string
  organization?: string
  /** Explicit professional sign-off date, formatted YYYY-MM-DD. */
  signedAt: string
}

export interface EvidenceScope {
  /** `all` is reserved for genuinely national sources. */
  jurisdictions: readonly Jurisdiction[] | 'all'
  developmentTypes: readonly DevelopmentType[] | 'all'
  /** Compliance-check ids, such as `far` or `fire-access`. */
  ruleIds: readonly string[] | 'all'
  description: string
}

export interface RegulatorySource {
  id: string
  authority: string
  artifactTitle: string
  /**
   * Official publisher URL only. Null is preferable to a guessed search result
   * or unofficial mirror.
   */
  canonicalUrl: string | null
  /** Issuing/applicability geography at registry level. */
  jurisdiction: readonly Jurisdiction[] | 'national'
  scope: EvidenceScope
  /** Exact supporting clause after clause-level verification. */
  clause: string | null
  /** Dates are strict YYYY-MM-DD values; unknown dates remain null. */
  effectiveDate: string | null
  checkedDate: string | null
  verificationStatus: EvidenceVerificationStatus
  reviewer: EvidenceReviewer | null
  confidence: EvidenceConfidence
  notes: string
}

/**
 * Honest seed records for the constants currently encoded in the demo.
 *
 * These are NOT production rule packs. The source artifacts and broad issuing
 * authorities are named so research can be routed correctly, while canonical
 * URLs, clauses, effective dates, review dates and signatures remain null
 * until someone verifies them from the controlling publication. Consequently
 * every seeded record is expected to fail the decision-grade evidence gate.
 */
export const REGULATORY_SOURCE_REGISTRY = [
  {
    id: 'haryana-building-code-demo',
    authority: 'Department of Town and Country Planning, Haryana',
    artifactTitle: 'Haryana Building Code, 2017',
    canonicalUrl: null,
    jurisdiction: ['gurugram', 'dwarka-expressway'],
    scope: {
      jurisdictions: ['gurugram', 'dwarka-expressway'],
      developmentTypes: 'all',
      ruleIds: [
        'far',
        'ground-coverage',
        'height',
        'green',
        'setback-front',
        'setback-side',
        'setback-rear',
        'parking',
        'ews',
      ],
      description:
        'Research lead for the flattened Haryana values currently encoded in the demo jurisdiction table.',
    },
    clause: null,
    effectiveDate: null,
    checkedDate: null,
    verificationStatus: 'research-draft',
    reviewer: null,
    confidence: 'low',
    notes:
      'No clause-level or amendment verification has been completed. Do not use this record for a sanction, acquisition, or investment decision.',
  },
  {
    id: 'delhi-ubbl-demo',
    authority: 'Delhi Development Authority / Municipal Corporation of Delhi',
    artifactTitle: 'Unified Building Bye-Laws for Delhi, 2016',
    canonicalUrl: null,
    jurisdiction: ['dwarka', 'delhi'],
    scope: {
      jurisdictions: ['dwarka', 'delhi'],
      developmentTypes: 'all',
      ruleIds: [
        'far',
        'ground-coverage',
        'height',
        'green',
        'setback-front',
        'setback-side',
        'setback-rear',
        'parking',
        'ews',
      ],
      description:
        'Research lead for the flattened Delhi and Dwarka Sub-City values currently encoded in the demo jurisdiction table.',
    },
    clause: null,
    effectiveDate: null,
    checkedDate: null,
    verificationStatus: 'research-draft',
    reviewer: null,
    confidence: 'low',
    notes:
      'Master-plan, zonal-plan, airport-height and subsequent-amendment interactions remain unverified.',
  },
  {
    id: 'noida-building-regulations-demo',
    authority: 'Noida Authority',
    artifactTitle: 'Noida Building Regulations, 2010, as amended',
    canonicalUrl: null,
    jurisdiction: ['noida'],
    scope: {
      jurisdictions: ['noida'],
      developmentTypes: 'all',
      ruleIds: [
        'far',
        'ground-coverage',
        'height',
        'green',
        'setback-front',
        'setback-side',
        'setback-rear',
        'parking',
        'ews',
      ],
      description:
        'Research lead for the flattened Noida values currently encoded in the demo jurisdiction table.',
    },
    clause: null,
    effectiveDate: null,
    checkedDate: null,
    verificationStatus: 'unverified',
    reviewer: null,
    confidence: 'low',
    notes:
      'The controlling amendment set and board resolutions have not been assembled or reviewed.',
  },
  {
    id: 'bengaluru-zoning-regulations-demo',
    authority: 'Bruhat Bengaluru Mahanagara Palike / Bangalore Development Authority',
    artifactTitle: 'Revised Master Plan 2015 Zoning Regulations',
    canonicalUrl: null,
    jurisdiction: ['bengaluru'],
    scope: {
      jurisdictions: ['bengaluru'],
      developmentTypes: 'all',
      ruleIds: [
        'far',
        'ground-coverage',
        'height',
        'green',
        'setback-front',
        'setback-side',
        'setback-rear',
        'parking',
        'ews',
      ],
      description:
        'Research lead for the flattened Bengaluru values currently encoded in the demo jurisdiction table.',
    },
    clause: null,
    effectiveDate: null,
    checkedDate: null,
    verificationStatus: 'unverified',
    reviewer: null,
    confidence: 'low',
    notes:
      'Road-width slabs, overlays, airport constraints and later instruments have not been verified.',
  },
  {
    id: 'national-building-code-fire-demo',
    authority: 'Bureau of Indian Standards',
    artifactTitle: 'National Building Code of India 2016, Part 4: Fire and Life Safety',
    canonicalUrl: null,
    jurisdiction: 'national',
    scope: {
      jurisdictions: 'all',
      developmentTypes: 'all',
      ruleIds: ['fire-access', 'refuge-area', 'parking'],
      description:
        'Research lead for the national fire, refuge-area and parking heuristics currently encoded in the demo.',
    },
    clause: null,
    effectiveDate: null,
    checkedDate: null,
    verificationStatus: 'unverified',
    reviewer: null,
    confidence: 'low',
    notes:
      'BIS licensing and clause-level professional review are required before any production use.',
  },
  {
    id: 'eia-notification-environment-demo',
    authority: 'Ministry of Environment, Forest and Climate Change',
    artifactTitle: 'Environmental Impact Assessment Notification, 2006, as amended',
    canonicalUrl: null,
    jurisdiction: 'national',
    scope: {
      jurisdictions: 'all',
      developmentTypes: 'all',
      ruleIds: ['env-clearance'],
      description:
        'Research lead for the environmental-clearance threshold currently encoded in the demo.',
    },
    clause: null,
    effectiveDate: null,
    checkedDate: null,
    verificationStatus: 'unverified',
    reviewer: null,
    confidence: 'low',
    notes:
      'Current amendments, exemptions, category treatment and state process requirements have not been verified.',
  },
] as const satisfies readonly RegulatorySource[]

export function findRegulatorySource(id: string): RegulatorySource | undefined {
  return REGULATORY_SOURCE_REGISTRY.find((source) => source.id === id)
}
