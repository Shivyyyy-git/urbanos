import assert from 'node:assert/strict'
import test from 'node:test'

import {
  resolveSitePlan,
  validateSitePlan,
  type BlockerCode,
  type Finding,
  type SitePlanBriefDraft,
  type ValidatedSitePlan,
} from '../src/index.ts'
import {
  VERIFIED_EVIDENCE,
  angleDeg,
  areaSqm,
  baseParams,
  baselineDraft,
  draftForPath,
  lengthM,
  makePath,
  pathVertex,
} from './fixtures.ts'

const SOURCE_REF = VERIFIED_EVIDENCE.evidenceId
const GENERATED_ORIGIN = {
  kind: 'generated' as const,
  generator: { name: 'extended-acceptance-fixture', version: '1' },
}

function findings(result: ReturnType<typeof validateSitePlan>): readonly Finding[] {
  return result.ok ? result.warnings : [...result.blockers, ...result.warnings]
}

function requireBlocked(
  draft: SitePlanBriefDraft,
  code: BlockerCode,
): void {
  const result = validateSitePlan(draft, baseParams)
  assert.equal(
    result.ok,
    false,
    `expected ${code}, but validation produced a Ready plan`,
  )
  assert.ok(
    findings(result).some((finding) => finding.code === code),
    `expected ${code}; got ${findings(result).map((finding) => finding.code).join(', ') || 'none'}`,
  )
}

function requireValid(draft: SitePlanBriefDraft): ValidatedSitePlan {
  const result = validateSitePlan(draft, baseParams)
  if (!result.ok) {
    throw new Error(
      `expected Ready plan; blockers=${result.blockers.map((finding) => finding.code).join(', ')}`,
    )
  }
  return result.plan
}

function envelopeArea(plan: ValidatedSitePlan): number {
  return plan.developableEnvelope.components.reduce(
    (sum, component) =>
      sum
      + Math.abs(component.outer.signedAreaSqm)
      - component.holes.reduce(
        (holeSum, hole) => holeSum + Math.abs(hole.signedAreaSqm),
        0,
      ),
    0,
  )
}

function pointToSegmentDistance(
  point: { x: number; y: number },
  start: { x: number; y: number },
  end: { x: number; y: number },
): number {
  const dx = end.x - start.x
  const dy = end.y - start.y
  const lengthSquared = dx * dx + dy * dy
  if (lengthSquared === 0) return Math.hypot(point.x - start.x, point.y - start.y)
  const raw = ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared
  const at = Math.max(0, Math.min(1, raw))
  return Math.hypot(
    point.x - (start.x + dx * at),
    point.y - (start.y + dy * at),
  )
}

function noBuildZone(
  id: string,
  coordinates: readonly (readonly [number, number])[],
  holes: readonly {
    id: string
    coordinates: readonly (readonly [number, number])[]
  }[] = [],
): SitePlanBriefDraft['encumbrances'][number] {
  return {
    encumbranceId: id,
    kind: 'no-build-zone',
    geometry: {
      geometryType: 'polygon',
      featureId: `${id}-feature`,
      path: makePath(`${id}-outer`, coordinates),
      holes: holes.map((hole) => makePath(hole.id, hole.coordinates)),
    },
    description: `Verified exclusion ${id}`,
    sourceRef: SOURCE_REF,
  }
}

test('fixture 05b: unequal setbacks remain enforced across a preserved collinear vertex', () => {
  const path = makePath(
    'collinear-setback-boundary',
    [[0, 0], [5, 0], [10, 0], [10, 8], [0, 8]],
    { preserveIndices: [1] },
  )
  const draft = draftForPath(path)
  const first = draft.setbacks[0]
  const second = draft.setbacks[1]
  if (first === undefined || second === undefined) {
    throw new Error('fixture 05b requires two consecutive setbacks')
  }
  first.distance = lengthM(2, SOURCE_REF)
  second.distance = lengthM(1, SOURCE_REF)

  const plan = requireValid(draft)
  const ring = plan.developableEnvelope.components[0]?.outer.vertices ?? []
  for (let index = 0; index < ring.length; index += 1) {
    const start = ring[index]
    const end = ring[(index + 1) % ring.length]
    if (start === undefined || end === undefined) continue
    const sample = {
      x: (start.x + end.x) / 2,
      y: (start.y + end.y) / 2,
    }
    if (sample.x >= 5 - baseParams.epsM) continue
    const clearance = pointToSegmentDistance(
      sample,
      { x: 0, y: 0 },
      { x: 5, y: 0 },
    )
    assert.ok(
      clearance >= 2 - baseParams.epsM,
      `envelope segment sample (${sample.x}, ${sample.y}) is only ${clearance} m from the 2 m setback edge`,
    )
  }
})

test('fixture 10b: footprint holes survive into exporter-complete geometry', () => {
  const draft = baselineDraft()
  draft.footprints = [{
    footprintId: 'courtyard-building',
    path: makePath('courtyard-building-outer', [
      [2, 2], [8, 2], [8, 7], [2, 7],
    ]),
    holes: [makePath('courtyard-building-hole', [
      [3, 3], [4, 3], [4, 4], [3, 4],
    ])],
    origin: GENERATED_ORIGIN,
  }]

  const plan = requireValid(draft)
  assert.equal(plan.footprints[0]?.polygon.holes.length, 1)
  assert.equal(
    Math.abs(plan.footprints[0]?.polygon.holes[0]?.signedAreaSqm ?? Number.NaN),
    1,
  )
})

test('fixture 10c: projection depth and clear height survive validation', () => {
  const draft = baselineDraft()
  draft.footprints = [{
    footprintId: 'projection-host',
    path: makePath('projection-host-path', [
      [2, 2], [6, 2], [6, 5], [2, 5],
    ]),
    holes: [],
    origin: GENERATED_ORIGIN,
  }]
  draft.projections = [{
    projectionId: 'canopy-with-measurements',
    kind: 'canopy',
    path: makePath('canopy-with-measurements-path', [
      [2, 2], [4, 2], [4, 3], [2, 3],
    ]),
    attachedToFootprintId: 'projection-host',
    projectionDepth: lengthM(1, SOURCE_REF),
    clearHeight: lengthM(2.4, SOURCE_REF),
  }]

  const plan = requireValid(draft)
  assert.equal(plan.projections[0]?.projectionDepth?.canonicalM, 1)
  assert.equal(plan.projections[0]?.clearHeight?.canonicalM, 2.4)
})

test('fixture 11d: geometry in a different planar CRS blocks without a performed transform', () => {
  const draft = baselineDraft()
  const restrictionPath = makePath(
    'different-crs-restriction',
    [[3, 3], [5, 3], [5, 5], [3, 5]],
    { crsCode: 'EPSG:32644' },
  )
  draft.restrictions = [{
    restrictionId: 'different-crs',
    kindRef: 'test-restriction',
    geometry: {
      geometryType: 'polygon',
      featureId: 'different-crs-feature',
      path: restrictionPath,
      holes: [],
    },
    description: 'Coordinates from a different UTM zone.',
    sourceRef: SOURCE_REF,
  }]

  requireBlocked(draft, 'E_FRAME_UNPROJECTED')
})

test('fixture 23e: a dimension cannot reference a nonexistent feature path', () => {
  const draft = baselineDraft()
  draft.dimensions = [{
    dimensionId: 'ghost-feature-dimension',
    kind: 'aligned',
    references: [{ kind: 'feature-path', pathId: 'ghost-path' }],
  }]

  requireBlocked(draft, 'E_REF_UNRESOLVED')
})

test('fixture 23f: a path-point reference must name the path that owns the point', () => {
  const draft = baselineDraft()
  const boundary = draft.boundary
  if (
    boundary === null
    || (boundary.route !== 'coordinates' && boundary.route !== 'imported-file')
    || boundary.outerPath === null
  ) {
    throw new Error('fixture 23f requires a path boundary')
  }
  const first = boundary.outerPath.points[0]
  const second = boundary.outerPath.points[1]
  if (first === undefined || second === undefined) {
    throw new Error('fixture 23f requires two boundary points')
  }
  draft.dimensions = [{
    dimensionId: 'wrong-owner-path-dimension',
    kind: 'aligned',
    references: [
      {
        kind: 'vertex',
        ref: pathVertex('ghost-path', first.pointId),
      },
      {
        kind: 'vertex',
        ref: pathVertex(boundary.outerPath.pathId, second.pointId),
      },
    ],
  }]

  requireBlocked(draft, 'E_REF_UNRESOLVED')
})

test('fixture 30c: unverified restriction geometry blocks the requested review stamp', () => {
  const draft = baselineDraft()
  const evidenceId = 'unverified-restriction-evidence'
  draft.evidence.push({
    evidenceId,
    sourceTypeRef: 'unverified-restriction',
    sourceDate: null,
    claimedVerification: 'unverified',
  })
  draft.restrictions = [{
    restrictionId: 'unverified-restriction',
    kindRef: 'test-restriction',
    geometry: {
      geometryType: 'polygon',
      featureId: 'unverified-restriction-feature',
      path: makePath(
        'unverified-restriction-path',
        [[3, 3], [5, 3], [5, 5], [3, 5]],
        { pointSourceRef: evidenceId, frameSourceRef: evidenceId },
      ),
      holes: [],
    },
    description: 'Restriction copied from an unverified note.',
    sourceRef: evidenceId,
  }]

  requireBlocked(draft, 'E_EVIDENCE_UNVERIFIED')
})

test('fixture 30d: professional verification requires an identified professional', () => {
  const draft = baselineDraft()
  draft.evidence = draft.evidence.map((record) => {
    const { responsibleProfessional: _removed, ...withoutProfessional } = record
    return withoutProfessional
  })

  requireBlocked(draft, 'E_EVIDENCE_UNVERIFIED')
})

test('fixture 33c: magnetic reduction requires a named model or source', () => {
  const draft = baselineDraft()
  draft.orientation = {
    basis: 'explicit-rotation',
    northRotation: angleDeg(10, 'magnetic', SOURCE_REF),
    magnetic: {
      observationDate: '2026-07-25',
      declination: angleDeg(2, 'true', SOURCE_REF),
      modelOrSource: null,
    },
  }

  requireBlocked(draft, 'E_MAGNETIC_CONTEXT_INCOMPLETE')
})

test('fixture 36d: an exclusion identical to the envelope consumes it completely', () => {
  const draft = baselineDraft()
  draft.encumbrances = [noBuildZone('whole-envelope', [
    [1, 1], [19, 1], [19, 9], [1, 9],
  ])]

  requireBlocked(draft, 'E_ENVELOPE_COLLAPSED')
})

test('fixture 36e: an exclusion crossing both envelope sides produces two exact components', () => {
  const draft = baselineDraft()
  draft.encumbrances = [noBuildZone('crossing-strip', [
    [0, 3], [20, 3], [20, 5], [0, 5],
  ])]

  const plan = requireValid(draft)
  assert.equal(plan.developableEnvelope.components.length, 2)
  assert.equal(envelopeArea(plan), 108)
})

test('fixture 36f: duplicate exclusions are unioned rather than subtracted twice', () => {
  const draft = baselineDraft()
  const coordinates = [
    [3, 3], [7, 3], [7, 7], [3, 7],
  ] as const
  draft.encumbrances = [
    noBuildZone('duplicate-a', coordinates),
    noBuildZone('duplicate-b', coordinates),
  ]

  const plan = requireValid(draft)
  assert.equal(envelopeArea(plan), 128)
  assert.equal(
    plan.developableEnvelope.components.reduce(
      (count, component) => count + component.holes.length,
      0,
    ),
    1,
  )
})

test('fixture 36g: a self-intersecting exclusion blocks instead of disappearing', () => {
  const draft = baselineDraft()
  draft.encumbrances = [noBuildZone('bow-tie-exclusion', [
    [3, 3], [7, 7], [3, 7], [7, 3],
  ])]

  requireBlocked(draft, 'E_RING_SELF_INTERSECTS')
})

test('fixture 36h: a hole in an exclusion remains a buildable island', () => {
  const draft = baselineDraft()
  draft.encumbrances = [noBuildZone(
    'annular-exclusion',
    [[3, 2], [9, 2], [9, 8], [3, 8]],
    [{
      id: 'annular-exclusion-hole',
      coordinates: [[5, 4], [7, 4], [7, 6], [5, 6]],
    }],
  )]
  draft.footprints = [{
    footprintId: 'building-in-exclusion-hole',
    path: makePath('building-in-exclusion-hole-path', [
      [5.2, 4.2], [6.8, 4.2], [6.8, 5.8], [5.2, 5.8],
    ]),
    holes: [],
    origin: GENERATED_ORIGIN,
  }]

  const plan = requireValid(draft)
  assert.equal(plan.footprints.length, 1)
  assert.equal(envelopeArea(plan), 112)
})

test('fixture 37b: non-finite source precision blocks during resolution', () => {
  const draft = baselineDraft()
  draft.statedArea = areaSqm(200, SOURCE_REF, Number.NaN)

  requireBlocked(draft, 'E_VALUE_NOT_FINITE')
})

test('fixture 37c: non-finite traverse start coordinates block during resolution', () => {
  const draft = baselineDraft()
  draft.boundary = {
    route: 'traverse',
    startPoint: {
      geometryType: 'point',
      featureId: 'non-finite-start',
      frame: {
        kind: 'planar',
        axisUnit: 'm',
        crsCode: null,
        isLocal: true,
        sourceRef: SOURCE_REF,
      },
      axis1: Number.NaN,
      axis2: 0,
      sourceRef: SOURCE_REF,
    },
    legs: [
      { legId: 'north', bearing: angleDeg(0), distance: lengthM(10) },
      { legId: 'east', bearing: angleDeg(90), distance: lengthM(10) },
      { legId: 'south', bearing: angleDeg(180), distance: lengthM(10) },
      { legId: 'west', bearing: angleDeg(270), distance: lengthM(10) },
    ],
    closureProfileRef: 'total-station-1:10000',
    adjustment: null,
  }

  const resolved = resolveSitePlan(draft, baseParams)
  assert.ok(
    resolved.findings.some((finding) => finding.code === 'E_VALUE_NOT_FINITE'),
    `expected E_VALUE_NOT_FINITE; got ${resolved.findings.map((finding) => finding.code).join(', ') || 'none'}`,
  )
  assert.equal(resolved.outerPath, null)
})

test('fixture 37d: finite inputs whose conversion overflows cannot enter geometry', () => {
  const draft = baselineDraft()
  const firstSetback = draft.setbacks[0]
  if (firstSetback === undefined) {
    throw new Error('fixture 37d requires a baseline setback')
  }
  firstSetback.distance = {
    asEntered: Number.MAX_VALUE,
    unit: 'km',
    sourceRef: SOURCE_REF,
  }

  const resolved = resolveSitePlan(draft, baseParams)
  assert.ok(
    resolved.findings.some((finding) => finding.code === 'E_VALUE_NOT_FINITE'),
    `expected E_VALUE_NOT_FINITE; got ${resolved.findings.map((finding) => finding.code).join(', ') || 'none'}`,
  )
  assert.equal(resolved.setbacks[0]?.distance, null)
})
