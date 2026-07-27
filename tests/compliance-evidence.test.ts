import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import type { RegulatorySource } from '../src/data/sourceRegistry'
import { assessComplianceEvidence } from '../src/engines/complianceEvidence'

const VERIFIED_SOURCE: RegulatorySource = {
  id: 'verified-far-test-source',
  authority: 'Test authority',
  artifactTitle: 'Verified FAR test artifact',
  canonicalUrl: 'https://regulator.example.test/far',
  jurisdiction: ['gurugram'],
  scope: {
    jurisdictions: ['gurugram'],
    developmentTypes: ['group-housing'],
    ruleIds: ['far'],
    description: 'Synthetic test-only evidence.',
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

describe('compliance evidence assessment', () => {
  test('blocks the seeded demo registry at Research Draft', () => {
    const result = assessComplianceEvidence({
      jurisdiction: 'gurugram',
      developmentType: 'group-housing',
      ruleIds: ['far', 'land-use'],
      asOfDate: '2026-07-25',
    })

    assert.equal(result.status, 'Research Draft')
    assert.equal(result.decisionGradeAllowed, false)
    assert.equal(result.totalClaims, 2)
    assert.equal(result.decisionGradeClaims, 0)
    assert.ok(result.blockers.some((blocker) => blocker.code === 'unverified_source'))
    assert.ok(result.blockers.some((blocker) => blocker.code === 'missing_source'))
  })

  test('allows a complete verified rule set as Decision Grade', () => {
    const result = assessComplianceEvidence({
      jurisdiction: 'gurugram',
      developmentType: 'group-housing',
      ruleIds: ['far'],
      asOfDate: '2026-07-25',
      registry: [VERIFIED_SOURCE],
    })

    assert.equal(result.status, 'Decision Grade')
    assert.equal(result.decisionGradeAllowed, true)
    assert.equal(result.decisionGradeClaims, 1)
    assert.equal(result.researchDraftClaims, 0)
    assert.deepEqual(result.blockers, [])
  })
})
