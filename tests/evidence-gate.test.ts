import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import {
  REGULATORY_SOURCE_REGISTRY,
  type RegulatorySource,
} from '../src/data/sourceRegistry'
import {
  evaluateEvidenceGate,
  type EvidenceBlockCode,
  type RegulatoryClaim,
} from '../src/engines/evidence'

const CLAIM: RegulatoryClaim = {
  id: 'gurugram-group-housing-far',
  jurisdiction: 'gurugram',
  developmentType: 'group-housing',
  ruleId: 'far',
  sourceIds: ['haryana-building-code-demo'],
}

/**
 * Reserved `.test` URL: deliberately synthetic and never presented as a real
 * authority URL. Production registry records must use verified official URLs.
 */
const VERIFIED_SOURCE: RegulatorySource = {
  id: 'verified-test-source',
  authority: 'Test authority',
  artifactTitle: 'Verified test artifact',
  canonicalUrl: 'https://regulator.example.test/verified-artifact',
  jurisdiction: ['gurugram'],
  scope: {
    jurisdictions: ['gurugram'],
    developmentTypes: ['group-housing'],
    ruleIds: ['far'],
    description: 'Synthetic in-scope source used only to exercise the evidence gate.',
  },
  clause: 'Clause 1',
  effectiveDate: '2025-01-01',
  checkedDate: '2026-07-20',
  verificationStatus: 'verified',
  reviewer: {
    name: 'Test Reviewer',
    role: 'Licensed professional reviewer',
    signedAt: '2026-07-20',
  },
  confidence: 'high',
  notes: 'Synthetic test fixture; not regulatory evidence.',
}

function codes(result: ReturnType<typeof evaluateEvidenceGate>): Set<EvidenceBlockCode> {
  return new Set(result.blockers.map((blocker) => blocker.code))
}

describe('regulatory evidence gate', () => {
  test('keeps the honest seeded registry at Research Draft', () => {
    const result = evaluateEvidenceGate(CLAIM, {
      asOfDate: '2026-07-25',
      registry: REGULATORY_SOURCE_REGISTRY,
    })

    assert.equal(result.status, 'Research Draft')
    assert.equal(result.decisionGradeAllowed, false)
    assert.deepEqual(result.evaluatedSourceIds, ['haryana-building-code-demo'])

    const blockers = codes(result)
    for (const expected of [
      'missing_canonical_url',
      'missing_clause',
      'missing_effective_date',
      'missing_checked_date',
      'unverified_source',
      'unsigned_source',
      'insufficient_confidence',
    ] satisfies EvidenceBlockCode[]) {
      assert.ok(blockers.has(expected), `expected blocker ${expected}`)
    }
  })

  test('fails closed for missing, stale, unverified, out-of-scope, and unsigned evidence', () => {
    const defectiveSource: RegulatorySource = {
      ...VERIFIED_SOURCE,
      checkedDate: '2025-01-01',
      verificationStatus: 'research-draft',
      reviewer: null,
    }
    const result = evaluateEvidenceGate(
      {
        ...CLAIM,
        jurisdiction: 'noida',
        sourceIds: ['source-not-in-registry', defectiveSource.id],
      },
      {
        asOfDate: '2026-07-25',
        maxCheckedAgeDays: 180,
        registry: [defectiveSource],
      },
    )

    assert.equal(result.status, 'Research Draft')
    assert.equal(result.decisionGradeAllowed, false)
    const blockers = codes(result)
    for (const expected of [
      'missing_source',
      'stale_source',
      'unverified_source',
      'out_of_scope',
      'unsigned_source',
    ] satisfies EvidenceBlockCode[]) {
      assert.ok(blockers.has(expected), `expected blocker ${expected}`)
    }
  })

  test('allows a complete, current, verified, in-scope source as Decision Grade', () => {
    const result = evaluateEvidenceGate(
      { ...CLAIM, sourceIds: [VERIFIED_SOURCE.id] },
      {
        asOfDate: '2026-07-25',
        maxCheckedAgeDays: 180,
        registry: [VERIFIED_SOURCE],
      },
    )

    assert.equal(result.status, 'Decision Grade')
    assert.equal(result.decisionGradeAllowed, true)
    assert.deepEqual(result.blockers, [])
    assert.deepEqual(result.evaluatedSourceIds, [VERIFIED_SOURCE.id])
  })
})
