import assert from 'node:assert/strict'
import test from 'node:test'

import {
  validateSitePlan,
  type BlockerCode,
  type Finding,
  type SitePlanBriefDraft,
} from '../src/index.ts'
import {
  VERIFIED_EVIDENCE_ID,
  angleDeg,
  baselineDraft,
  baseParams,
  cloneDraft,
  lengthM,
  makePath,
  pathEdge,
} from './fixtures.ts'

function requireBlocked(
  draft: SitePlanBriefDraft,
  code: BlockerCode,
): Extract<ReturnType<typeof validateSitePlan>, { ok: false }> {
  const result = validateSitePlan(draft, baseParams)
  if (result.ok) {
    throw new Error(`expected ${code}, but the plan reached Ready status`)
  }
  assert.ok(
    result.blockers.some((finding) => finding.code === code),
    `expected ${code}; got ${result.blockers.map((finding) => finding.code).join(', ')}`,
  )
  return result
}

function findings(result: ReturnType<typeof validateSitePlan>): readonly Finding[] {
  return result.ok ? result.warnings : [...result.blockers, ...result.warnings]
}

function boundaryPath(draft: SitePlanBriefDraft) {
  const boundary = draft.boundary
  if (
    boundary === null
    || (boundary.route !== 'coordinates' && boundary.route !== 'imported-file')
    || boundary.outerPath === null
  ) {
    throw new Error('readiness fixture requires a coordinate boundary')
  }
  return boundary.outerPath
}

test('fixture 40: a complete draft without an explicit review request remains Research Draft', () => {
  const draft = baselineDraft()
  delete draft.drawing.requestedStamp
  requireBlocked(draft, 'E_REVIEW_REQUEST_ABSENT')
})

test('fixture 40b: blank identity and incomplete drawing profile cannot receive Ready status', () => {
  const identityDraft = baselineDraft()
  identityDraft.identity.projectName = '   '
  requireBlocked(identityDraft, 'E_IDENTITY_INCOMPLETE')

  const drawingDraft = baselineDraft()
  drawingDraft.drawing.sheetRef = null
  drawingDraft.drawing.declaredScaleDenominator = 0
  requireBlocked(drawingDraft, 'E_DRAWING_PROFILE_INCOMPLETE')
})

test('fixture 40c: access, area, and measurement ranges fail closed', () => {
  const noAccess = baselineDraft()
  noAccess.roadFrontages = []
  requireBlocked(noAccess, 'E_FRONTAGE_INCOMPLETE')

  const noArea = baselineDraft()
  noArea.statedArea = null
  requireBlocked(noArea, 'E_AREA_RECONCILIATION')

  const negativeSetback = baselineDraft()
  const firstSetback = negativeSetback.setbacks[0]
  if (firstSetback === undefined) throw new Error('baseline setback missing')
  firstSetback.distance = lengthM(-1)
  requireBlocked(negativeSetback, 'E_VALUE_OUT_OF_RANGE')

  const narrowRow = baselineDraft()
  const frontage = narrowRow.roadFrontages[0]
  if (frontage === undefined) throw new Error('baseline frontage missing')
  frontage.rowWidth = lengthM(5)
  requireBlocked(narrowRow, 'E_FRONTAGE_INCOMPLETE')
})

test('fixture 40d: evidence must be verifiable, complete, and linked', () => {
  const selfDeclared = baselineDraft()
  selfDeclared.evidence = selfDeclared.evidence.map((record) => ({
    ...record,
    claimedVerification: 'self-declared',
  }))
  requireBlocked(selfDeclared, 'E_EVIDENCE_UNVERIFIED')

  const incomplete = baselineDraft()
  incomplete.evidence = incomplete.evidence.map((record) => ({
    ...record,
    sourceDate: null,
    statedPrecision: 0,
  }))
  requireBlocked(incomplete, 'E_EVIDENCE_INCOMPLETE')

  const missingLink = baselineDraft()
  const setback = missingLink.setbacks[0]
  if (setback === undefined || setback.distance === null) {
    throw new Error('baseline setback evidence missing')
  }
  setback.distance.sourceRef = null
  requireBlocked(missingLink, 'E_EVIDENCE_INCOMPLETE')
})

test('fixture 40e: duplicate source identifiers and unsafe parameters are rejected', () => {
  const duplicatePoint = baselineDraft()
  const path = boundaryPath(duplicatePoint)
  const first = path.points[0]
  const second = path.points[1]
  if (first === undefined || second === undefined) {
    throw new Error('baseline points missing')
  }
  second.pointId = first.pointId
  requireBlocked(duplicatePoint, 'E_IDENTIFIER_DUPLICATE')

  const unsafeParams = cloneDraft(baseParams)
  unsafeParams.epsM = 0
  const result = validateSitePlan(baselineDraft(), unsafeParams)
  assert.equal(result.ok, false)
  if (result.ok) return
  assert.ok(result.blockers.some((finding) => finding.code === 'E_KERNEL_PARAMETERS_INVALID'))
})

test('fixture 41: every supplied optional geometry item must validate or block', () => {
  const nullFootprint = baselineDraft()
  nullFootprint.footprints = [{
    footprintId: 'missing-footprint',
    path: null,
    holes: [],
    origin: {
      kind: 'user-drawn',
      sourceRef: VERIFIED_EVIDENCE_ID,
    },
  }]
  requireBlocked(nullFootprint, 'E_GEOMETRY_INCOMPLETE')

  const nullRestriction = baselineDraft()
  nullRestriction.restrictions = [{
    restrictionId: 'missing-restriction',
    kindRef: 'planning-restriction',
    geometry: null,
    description: 'Declared but not drawn',
    sourceRef: VERIFIED_EVIDENCE_ID,
  }]
  requireBlocked(nullRestriction, 'E_GEOMETRY_INCOMPLETE')

  const bowTieRestriction = baselineDraft()
  bowTieRestriction.restrictions = [{
    restrictionId: 'bow-tie-restriction',
    kindRef: 'planning-restriction',
    geometry: {
      geometryType: 'polygon',
      featureId: 'bow-tie-restriction-geometry',
      path: makePath('bow-tie-restriction-path', [
        [3, 3], [7, 7], [3, 7], [7, 3],
      ]),
      holes: [],
    },
    description: 'Invalid restriction topology',
    sourceRef: VERIFIED_EVIDENCE_ID,
  }]
  requireBlocked(bowTieRestriction, 'E_RING_SELF_INTERSECTS')
})

test('fixture 41b: existing-feature decisions and projection references cannot be omitted', () => {
  const undecidedFeature = baselineDraft()
  const frame = boundaryPath(undecidedFeature).frame
  undecidedFeature.existingFeatures = [{
    featureId: 'existing-tree',
    kindRef: 'tree',
    geometry: {
      geometryType: 'point',
      featureId: 'existing-tree',
      frame,
      axis1: 4,
      axis2: 4,
      sourceRef: VERIFIED_EVIDENCE_ID,
    },
    toBeRetained: null,
    sourceRef: VERIFIED_EVIDENCE_ID,
  }]
  requireBlocked(undecidedFeature, 'E_GEOMETRY_INCOMPLETE')

  const unattachedProjection = baselineDraft()
  unattachedProjection.projections = [{
    projectionId: 'orphan-canopy',
    kind: 'canopy',
    path: makePath('orphan-canopy-path', [
      [2, 2], [4, 2], [4, 3], [2, 3],
    ]),
    attachedToFootprintId: null,
    projectionDepth: lengthM(1),
  }]
  requireBlocked(unattachedProjection, 'E_REF_UNRESOLVED')
})

test('fixture 41c: point/line encumbrances cannot bypass an unimplemented clearance buffer', () => {
  const draft = baselineDraft()
  draft.encumbrances = [{
    encumbranceId: 'utility-centreline',
    kind: 'service-corridor',
    geometry: {
      geometryType: 'polyline',
      featureId: 'utility-centreline',
      path: makePath(
        'utility-centreline-path',
        [[3, 3], [8, 3]],
        { closure: { kind: 'open' } },
      ),
    },
    clearance: lengthM(1),
    description: 'Centreline needs a real buffer before subtraction',
    sourceRef: VERIFIED_EVIDENCE_ID,
  }]
  requireBlocked(draft, 'E_GEOMETRY_INCOMPLETE')
})

test('fixture 41d: dimension requests are geometry-derived or rejected, never zero-filled', () => {
  const invalid = baselineDraft()
  invalid.dimensions = [{
    dimensionId: 'invalid-angle',
    kind: 'angle',
    references: [{ kind: 'boundary' }],
  }]
  requireBlocked(invalid, 'E_DIMENSION_REQUEST_INVALID')

  const valid = baselineDraft()
  const path = boundaryPath(valid)
  const p0 = path.points[0]
  const p1 = path.points[1]
  const p2 = path.points[2]
  if (p0 === undefined || p1 === undefined || p2 === undefined) {
    throw new Error('baseline boundary needs three points')
  }
  const edge0 = pathEdge(path.pathId, p0.pointId, p1.pointId)
  const edge1 = pathEdge(path.pathId, p1.pointId, p2.pointId)
  valid.dimensions = [
    {
      dimensionId: 'aligned-edge',
      kind: 'aligned',
      references: [{ kind: 'edge', ref: edge0 }],
    },
    {
      dimensionId: 'two-edge-chain',
      kind: 'chain',
      references: [
        { kind: 'edge', ref: edge0 },
        { kind: 'edge', ref: edge1 },
      ],
    },
    {
      dimensionId: 'corner-angle',
      kind: 'angle',
      references: [
        { kind: 'edge', ref: edge0 },
        { kind: 'edge', ref: edge1 },
      ],
    },
    {
      dimensionId: 'plot-area',
      kind: 'area',
      references: [{ kind: 'boundary' }],
    },
  ]
  const result = validateSitePlan(valid, baseParams)
  assert.equal(result.ok, true, findings(result).map((finding) => finding.code).join(', '))
  if (!result.ok) return
  assert.deepEqual(
    result.plan.dimensions.map((dimension) => dimension.rawValue),
    [20, 30, 90, 200],
  )
})

test('fixture 41e: an assumed level datum is visible and requires acknowledgement', () => {
  const draft = baselineDraft()
  const frame = boundaryPath(draft).frame
  draft.levels = [{
    readingId: 'assumed-level',
    location: {
      geometryType: 'point',
      featureId: 'assumed-level-location',
      frame,
      axis1: 4,
      axis2: 4,
      sourceRef: VERIFIED_EVIDENCE_ID,
    },
    elevation: lengthM(100),
    datum: 'assumed',
  }]
  const blocked = requireBlocked(draft, 'E_WARNING_UNACKNOWLEDGED')
  assert.ok(blocked.warnings.some((warning) => warning.code === 'W_ASSUMED_DATUM'))

  draft.acknowledgedWarnings = [{
    code: 'W_ASSUMED_DATUM',
    acknowledgedBy: {
      name: 'Acceptance Surveyor',
      licenceNumber: 'TEST-SURVEY-001',
      discipline: 'surveyor',
    },
    at: '2026-07-26',
    evidenceRef: VERIFIED_EVIDENCE_ID,
  }]
  const accepted = validateSitePlan(draft, baseParams)
  assert.equal(accepted.ok, true, findings(accepted).map((finding) => finding.code).join(', '))
})
