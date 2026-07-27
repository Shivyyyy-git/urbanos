import assert from 'node:assert/strict'
import test from 'node:test'

import {
  KernelError,
  assertExportable,
  validateSitePlan,
  verifyDimensionIntegrity,
  type BlockerCode,
  type DraftEdgeRef,
  type EvidenceId,
  type Finding,
  type KernelParameters,
  type ResolvedDimension,
  type SitePlanBriefDraft,
  type SourcePath,
  type ValidatedSitePlan,
  type ValidationDigest,
  type WarningCode,
} from '../src/index.ts'
import {
  angleDeg,
  areaSqm,
  baseParams,
  baselineDraft,
  cloneDraft,
  lengthM,
  makePath,
  pathEdge,
} from './fixtures.ts'

type Coordinate = readonly [number, number]

const GENERATED_ORIGIN = {
  kind: 'generated' as const,
  generator: { name: 'acceptance-fixture', version: '1' },
}

function describeFindings(findings: readonly Finding[]): string {
  return findings.map((finding) => finding.code).join(', ') || 'none'
}

function requireValid(
  draft: SitePlanBriefDraft,
  params: KernelParameters = baseParams,
): ValidatedSitePlan {
  const result = validateSitePlan(draft, params)
  if (!result.ok) {
    throw new Error(
      `expected a validated plan; blockers=${describeFindings(result.blockers)}, ` +
        `warnings=${describeFindings(result.warnings)}`,
    )
  }
  return result.plan
}

function requireBlocked(
  draft: SitePlanBriefDraft,
  code: BlockerCode,
  params: KernelParameters = baseParams,
): Extract<ReturnType<typeof validateSitePlan>, { ok: false }> {
  const result = validateSitePlan(draft, params)
  if (result.ok) {
    throw new Error(`expected blocker ${code}, but validation passed`)
  }
  assert.ok(
    result.blockers.some((finding) => finding.code === code),
    `expected blocker ${code}; got ${describeFindings(result.blockers)}`,
  )
  return result
}

function requireWarning(findings: readonly Finding[], code: WarningCode): void {
  assert.ok(
    findings.some((finding) => finding.code === code),
    `expected warning ${code}; got ${describeFindings(findings)}`,
  )
}

function coordinateOuterPath(draft: SitePlanBriefDraft): SourcePath {
  const boundary = draft.boundary
  if (
    boundary === null ||
    (boundary.route !== 'coordinates' && boundary.route !== 'imported-file') ||
    boundary.outerPath === null
  ) {
    throw new Error('fixture requires a path-based outer boundary')
  }
  return boundary.outerPath
}

function primaryEvidenceId(draft: SitePlanBriefDraft): EvidenceId {
  const evidence = draft.evidence.find(
    (record) => record.claimedVerification === 'professional-verified',
  )
  if (evidence === undefined) {
    throw new Error('baseline fixture must contain professionally verified evidence')
  }
  return evidence.evidenceId
}

function edgeRefs(path: SourcePath): DraftEdgeRef[] {
  const points =
    path.closure.kind === 'repeated-first-point' &&
    path.points.length > 1 &&
    path.points[0]?.axis1 === path.points.at(-1)?.axis1 &&
    path.points[0]?.axis2 === path.points.at(-1)?.axis2
      ? path.points.slice(0, -1)
      : path.points

  assert.ok(points.length >= 3, 'fixture path must contain at least three vertices')
  return points.map((point, index) => {
    const next = points[(index + 1) % points.length]
    if (next === undefined) {
      throw new Error('fixture edge is missing its next vertex')
    }
    return pathEdge(path.pathId, point.pointId, next.pointId)
  })
}

function polygonArea(coordinates: readonly Coordinate[]): number {
  let twiceSignedArea = 0
  for (let index = 0; index < coordinates.length; index += 1) {
    const current = coordinates[index]
    const next = coordinates[(index + 1) % coordinates.length]
    if (current === undefined || next === undefined) {
      throw new Error('fixture coordinate ring is incomplete')
    }
    twiceSignedArea += current[0] * next[1] - next[0] * current[1]
  }
  return Math.abs(twiceSignedArea) / 2
}

function multiPolygonArea(
  surface: ValidatedSitePlan['developableEnvelope'],
): number {
  return surface.components.reduce(
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

function replaceBoundary(
  draft: SitePlanBriefDraft,
  pathId: string,
  coordinates: readonly Coordinate[],
  setbackM: number,
): SourcePath {
  const sourceRef = primaryEvidenceId(draft)
  const path = makePath(pathId, coordinates)
  const edges = edgeRefs(path)
  const firstEdge = edges[0]
  if (firstEdge === undefined) {
    throw new Error('fixture path did not produce an edge')
  }

  draft.boundary = { route: 'coordinates', outerPath: path }
  draft.statedArea = areaSqm(polygonArea(coordinates), sourceRef, 0.001)
  draft.roadFrontages = [
    {
      frontageId: `${pathId}-frontage`,
      edges: [firstEdge],
      carriagewayWidth: lengthM(12, sourceRef),
      roadName: 'Verified road',
    },
  ]
  draft.setbacks = [
    {
      setbackId: `${pathId}-setback`,
      edges,
      distance: lengthM(setbackM, sourceRef),
      basis: { citation: 'Acceptance fixture', sourceRef },
    },
  ]
  draft.cadastralHoles = []
  draft.encumbrances = []
  draft.footprints = []
  return path
}

function validationSymbol(plan: ValidatedSitePlan): symbol {
  const symbols = Reflect.ownKeys(plan).filter(
    (key): key is symbol => typeof key === 'symbol',
  )
  assert.equal(symbols.length, 1, 'validated plan must carry exactly one private brand')
  const symbol = symbols[0]
  if (symbol === undefined) {
    throw new Error('validated plan is missing its private brand')
  }
  return symbol
}

function validationDigest(plan: ValidatedSitePlan): ValidationDigest {
  const symbol = validationSymbol(plan)
  const record = Reflect.get(plan, symbol) as ValidationDigest
  assert.equal(typeof record.digest, 'string')
  assert.ok(record.digest.length > 0)
  return record
}

function assertDigestFailure(
  plan: ValidatedSitePlan,
  expectedVersion: string,
  context = 'tampered validated plan',
): void {
  assert.throws(
    () => assertExportable(plan, expectedVersion),
    (error: unknown) => {
      if (!(error instanceof KernelError)) {
        return false
      }
      assert.equal(error.code, 'E_EXPORT_DIGEST_INVALID')
      assert.equal(error.finding.code, 'E_EXPORT_DIGEST_INVALID')
      return true
    },
    `${context} must fail the export digest gate`,
  )
}

function changedScalar(value: unknown): unknown {
  if (value === null || value === undefined) {
    return '__digest_probe__'
  }
  if (typeof value === 'string') {
    return `${value}#digest-probe`
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value + 0.125 : 0
  }
  if (typeof value === 'boolean') {
    return !value
  }
  return '__digest_probe__'
}

/** Mutates one descendant while retaining the branch's overall container shape. */
function mutateOnePayloadLeaf(value: unknown): boolean {
  if (Array.isArray(value)) {
    if (value.length === 0) {
      value.push('__digest_probe__')
      return true
    }
    const first = value[0]
    if (first !== null && typeof first === 'object' && mutateOnePayloadLeaf(first)) {
      return true
    }
    value[0] = changedScalar(first)
    return true
  }

  if (value !== null && typeof value === 'object') {
    const record = value as Record<string, unknown>
    for (const key of Object.keys(record)) {
      const child = record[key]
      if (child !== null && typeof child === 'object') {
        if (mutateOnePayloadLeaf(child)) {
          return true
        }
      } else {
        record[key] = changedScalar(child)
        return true
      }
    }
    record.__digestProbe__ = true
    return true
  }

  return false
}

function mutateTopLevelBranch(plan: Record<string, unknown>, key: string): void {
  const branch = plan[key]
  if (branch !== null && typeof branch === 'object' && mutateOnePayloadLeaf(branch)) {
    return
  }
  plan[key] = changedScalar(branch)
}

function assertDeepFrozen(value: unknown, seen = new Set<object>()): void {
  if (value === null || typeof value !== 'object' || seen.has(value)) {
    return
  }
  seen.add(value)
  assert.equal(Object.isFrozen(value), true, 'every validated-plan object must be frozen')
  for (const key of Reflect.ownKeys(value)) {
    assertDeepFrozen(Reflect.get(value, key), seen)
  }
}

test('fixture 07: multiple declared road edges resolve to distinct frontages', () => {
  const draft = baselineDraft()
  const path = coordinateOuterPath(draft)
  const edges = edgeRefs(path)
  const sourceRef = primaryEvidenceId(draft)
  const firstEdge = edges[0]
  const secondEdge = edges[1]
  if (firstEdge === undefined || secondEdge === undefined) {
    throw new Error('fixture 07 requires two boundary edges')
  }

  draft.roadFrontages = [
    {
      frontageId: 'road-a',
      edges: [firstEdge],
      carriagewayWidth: lengthM(18, sourceRef),
      roadName: 'Road A',
    },
    {
      frontageId: 'road-b',
      edges: [secondEdge],
      carriagewayWidth: lengthM(12, sourceRef),
      roadName: 'Road B',
    },
  ]

  const plan = requireValid(draft)
  assert.deepEqual(
    plan.frontages.map((frontage) => frontage.frontageId),
    ['road-a', 'road-b'],
  )
  assert.ok(plan.frontages.every((frontage) => frontage.edges.length > 0))
})

test('fixture 09: area difference exactly at the reconciliation tolerance passes', () => {
  const draft = baselineDraft()
  draft.statedArea = areaSqm(200.25, primaryEvidenceId(draft), 0.1)

  const plan = requireValid(draft)
  assert.equal(plan.plotArea.passes, true)
  assert.ok(Math.abs((plan.plotArea.differenceSqm ?? Number.NaN) - 0.25) < 1e-9)
  assert.ok(Math.abs((plan.plotArea.toleranceSqm ?? Number.NaN) - 0.25) < 1e-9)
})

test('fixture 09b: unknown stated-area precision blocks automatic reconciliation', () => {
  const draft = baselineDraft()
  if (draft.statedArea === null) {
    throw new Error('fixture 09b requires a stated area')
  }
  delete draft.statedArea.statedPrecision

  requireBlocked(draft, 'E_AREA_PRECISION_UNKNOWN')
})

test('fixture 10: a footprint exactly on the setback line is accepted', () => {
  const draft = baselineDraft()
  draft.footprints = [
    {
      footprintId: 'on-setback-line',
      path: makePath('on-setback-line-path', [
        [1, 2],
        [6, 2],
        [6, 8],
        [1, 8],
      ]),
      holes: [],
      label: 'Building A',
      origin: GENERATED_ORIGIN,
    },
  ]

  const plan = requireValid(draft)
  assert.equal(plan.footprints.length, 1)
  assert.equal(
    Math.min(...plan.footprints[0]!.polygon.outer.vertices.map((vertex) => vertex.x)),
    1,
  )
})

test('fixture 21: area mismatch just above the tolerance blocks', () => {
  const draft = baselineDraft()
  draft.statedArea = areaSqm(200.251, primaryEvidenceId(draft), 0.1)
  requireBlocked(draft, 'E_AREA_RECONCILIATION')
})

test('fixture 22: an absent north basis blocks elevation', () => {
  const draft = baselineDraft()
  draft.orientation = { basis: 'absent' }
  requireBlocked(draft, 'E_NORTH_ABSENT')
})

test('fixture 23a: frontage without a boundary edge blocks', () => {
  const draft = baselineDraft()
  draft.roadFrontages[0] = {
    frontageId: 'missing-edge',
    edges: [],
    carriagewayWidth: lengthM(12, primaryEvidenceId(draft)),
  }
  requireBlocked(draft, 'E_FRONTAGE_INCOMPLETE')
})

test('fixture 23b: frontage width without a source blocks', () => {
  const draft = baselineDraft()
  const frontage = draft.roadFrontages[0]
  if (frontage === undefined) {
    throw new Error('fixture 23b requires a baseline frontage')
  }
  frontage.carriagewayWidth = lengthM(12, null)
  requireBlocked(draft, 'E_FRONTAGE_INCOMPLETE')
})

test('fixture 23c: a non-adjacent point pair is not a boundary-edge reference', () => {
  const draft = baselineDraft()
  const path = coordinateOuterPath(draft)
  const first = path.points[0]
  const opposite = path.points[2]
  if (first === undefined || opposite === undefined) {
    throw new Error('fixture 23c requires opposite boundary vertices')
  }
  draft.roadFrontages[0] = {
    frontageId: 'boundary-chord-is-not-an-edge',
    edges: [pathEdge(path.pathId, first.pointId, opposite.pointId)],
    carriagewayWidth: lengthM(12, primaryEvidenceId(draft)),
  }
  requireBlocked(draft, 'E_REF_UNRESOLVED')
})

test('fixture 23d: a reference from the wrong boundary route is unresolved', () => {
  const draft = baselineDraft()
  draft.roadFrontages[0] = {
    frontageId: 'cross-route-reference',
    edges: [{ kind: 'traverse-leg', legId: 'leg-0' }],
    carriagewayWidth: lengthM(12, primaryEvidenceId(draft)),
  }
  requireBlocked(draft, 'E_REF_UNRESOLVED')
})

test('fixture 24: a footprint vertex outside the setback envelope blocks', () => {
  const draft = baselineDraft()
  draft.footprints = [
    {
      footprintId: 'outside-by-vertex',
      path: makePath('outside-by-vertex-path', [
        [0.5, 2],
        [6, 2],
        [6, 8],
        [0.5, 8],
      ]),
      holes: [],
      origin: GENERATED_ORIGIN,
    },
  ]
  requireBlocked(draft, 'E_FOOTPRINT_OUTSIDE_ENVELOPE')
})

test('fixture 25: segments crossing a concave envelope block even when all vertices are inside', () => {
  const draft = baselineDraft()
  replaceBoundary(
    draft,
    'concave-outer',
    [
      [0, 0],
      [30, 0],
      [30, 30],
      [20, 30],
      [20, 10],
      [10, 10],
      [10, 30],
      [0, 30],
    ],
    1,
  )
  draft.footprints = [
    {
      footprintId: 'crosses-concavity',
      path: makePath('crosses-concavity-path', [
        [5, 25],
        [25, 25],
        [15, 5],
      ]),
      holes: [],
      origin: GENERATED_ORIGIN,
    },
  ]
  requireBlocked(draft, 'E_FOOTPRINT_EDGE_CROSSES_ENVELOPE')
})

test('fixture 26: overlapping building footprints block', () => {
  const draft = baselineDraft()
  draft.footprints = [
    {
      footprintId: 'building-a',
      path: makePath('building-a-path', [
        [2, 2],
        [8, 2],
        [8, 6],
        [2, 6],
      ]),
      holes: [],
      origin: GENERATED_ORIGIN,
    },
    {
      footprintId: 'building-b',
      path: makePath('building-b-path', [
        [6, 4],
        [12, 4],
        [12, 8],
        [6, 8],
      ]),
      holes: [],
      origin: GENERATED_ORIGIN,
    },
  ]
  requireBlocked(draft, 'E_FOOTPRINT_OVERLAP')
})

test('fixture 26b: identical building footprints still overlap', () => {
  const draft = baselineDraft()
  const coordinates = [
    [2, 2],
    [8, 2],
    [8, 6],
    [2, 6],
  ] as const
  draft.footprints = [
    {
      footprintId: 'identical-building-a',
      path: makePath('identical-building-a-path', coordinates),
      holes: [],
      origin: GENERATED_ORIGIN,
    },
    {
      footprintId: 'identical-building-b',
      path: makePath('identical-building-b-path', coordinates),
      holes: [],
      origin: GENERATED_ORIGIN,
    },
  ]

  requireBlocked(draft, 'E_FOOTPRINT_OVERLAP')
})

test('fixture 27: setbacks that consume the plot block with a collapsed envelope', () => {
  const draft = baselineDraft()
  const sourceRef = primaryEvidenceId(draft)
  for (const setback of draft.setbacks) {
    setback.distance = lengthM(6, sourceRef)
  }
  requireBlocked(draft, 'E_ENVELOPE_COLLAPSED')
})

test('fixture 27b: an inset beyond opposing boundaries cannot resurrect outside the plot', () => {
  const draft = baselineDraft()
  replaceBoundary(
    draft,
    'over-inset-square',
    [
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10],
    ],
    6,
  )

  requireBlocked(draft, 'E_ENVELOPE_COLLAPSED')
})

test('fixture 28: the dimension integrity seam rejects a generated value that differs from geometry', () => {
  const draft = baselineDraft()
  const edge = edgeRefs(coordinateOuterPath(draft))[0]
  if (edge === undefined) {
    throw new Error('fixture 28 requires a boundary edge')
  }
  draft.dimensions = [
    {
      dimensionId: 'boundary-edge-dimension',
      kind: 'aligned',
      references: [{ kind: 'edge', ref: edge }],
    },
  ]

  const plan = requireValid(draft)
  const firstDimension = plan.dimensions[0]
  if (firstDimension === undefined) {
    throw new Error('fixture 28 requires one generated dimension')
  }
  const corrupted: ResolvedDimension[] = plan.dimensions.map((dimension, index) =>
    index === 0
      ? { ...dimension, rawValue: dimension.rawValue + baseParams.epsM * 2 }
      : { ...dimension },
  )

  const findings = verifyDimensionIntegrity(corrupted, plan, baseParams)
  assert.ok(
    findings.some((finding) => finding.code === 'E_DIMENSION_MISMATCH'),
    `expected E_DIMENSION_MISMATCH; got ${describeFindings(findings)}`,
  )
})

test('fixture 30: unverified mandatory geometry evidence cannot receive the requested review stamp', () => {
  const draft = baselineDraft()
  draft.drawing.requestedStamp = 'ready-for-professional-review'
  draft.evidence = draft.evidence.map((record) => ({
    ...record,
    claimedVerification: 'unverified',
  }))
  requireBlocked(draft, 'E_EVIDENCE_UNVERIFIED')
})

test('fixture 30b: unverified setback evidence blocks the requested review stamp', () => {
  const draft = baselineDraft()
  const unverifiedEvidenceId = 'evidence-unverified-setback'
  draft.evidence.push({
    evidenceId: unverifiedEvidenceId,
    sourceTypeRef: 'unverified-setback-entry',
    sourceDate: null,
    claimedVerification: 'unverified',
  })
  const firstSetback = draft.setbacks[0]
  if (firstSetback === undefined) {
    throw new Error('fixture 30b requires a baseline setback')
  }
  firstSetback.distance = lengthM(1, unverifiedEvidenceId)

  requireBlocked(draft, 'E_EVIDENCE_UNVERIFIED')
})

test('fixture 31: a valid sliver warns and blocks until that warning is acknowledged', () => {
  const draft = baselineDraft()
  replaceBoundary(
    draft,
    'sliver-outer',
    [
      [0, 0],
      [200, 0],
      [200, 1],
      [0, 1],
    ],
    0.1,
  )

  const initial = requireBlocked(draft, 'E_WARNING_UNACKNOWLEDGED')
  requireWarning(initial.warnings, 'W_SLIVER_REVIEW')

  draft.acknowledgedWarnings.push({
    code: 'W_SLIVER_REVIEW',
    acknowledgedBy: { userId: 'acceptance-reviewer' },
    at: '2026-07-25',
    evidenceRef: primaryEvidenceId(draft),
  })
  const plan = requireValid(draft)
  assert.ok(
    plan.acknowledgedWarnings.some(
      (acknowledgement) => acknowledgement.code === 'W_SLIVER_REVIEW',
    ),
  )
})

test('fixture 32: a signed professional override records and resolves a deed-area conflict', () => {
  const draft = baselineDraft()
  const sourceRef = primaryEvidenceId(draft)
  draft.statedArea = areaSqm(210, sourceRef, 0.1)
  draft.overrides.push({
    overrideId: 'area-conflict-override',
    targetBlockerCode: 'E_AREA_RECONCILIATION',
    reason: 'Professional accepted the surveyed coordinate area over the deed figure.',
    professional: {
      name: 'Acceptance Surveyor',
      licenceNumber: 'TEST-001',
      discipline: 'surveyor',
    },
    signedAt: '2026-07-25',
    evidenceRef: sourceRef,
  })

  const plan = requireValid(draft)
  assert.equal(plan.plotArea.passes, false)
  assert.ok(
    plan.appliedOverrides.some(
      (override) =>
        override.overrideId === 'area-conflict-override' &&
        override.targetBlockerCode === 'E_AREA_RECONCILIATION',
    ),
  )
})

test('fixture 32b: a professional override cannot invent a missing setback', () => {
  const draft = baselineDraft()
  const sourceRef = primaryEvidenceId(draft)
  const removed = draft.setbacks.pop()
  if (removed === undefined) {
    throw new Error('fixture 32b requires baseline setbacks')
  }
  draft.overrides.push({
    overrideId: 'missing-setback-override',
    targetBlockerCode: 'E_SETBACK_EDGE_UNCOVERED',
    reason: 'A signature cannot supply geometry that the source never stated.',
    professional: {
      name: 'Acceptance Surveyor',
      licenceNumber: 'TEST-001',
      discipline: 'surveyor',
    },
    signedAt: '2026-07-25',
    evidenceRef: sourceRef,
  })

  requireBlocked(draft, 'E_SETBACK_EDGE_UNCOVERED')
})

for (const magneticFixture of [
  {
    name: 'missing observation date',
    magnetic: {
      observationDate: null,
      declination: angleDeg(0.25, 'true'),
      modelOrSource: 'IGRF fixture',
    },
  },
  {
    name: 'missing declination and source context',
    magnetic: {
      observationDate: '2026-07-25',
      declination: null,
      modelOrSource: null,
    },
  },
] as const) {
  test(`fixture 33: magnetic north with ${magneticFixture.name} blocks`, () => {
    const draft = baselineDraft()
    const sourceRef = primaryEvidenceId(draft)
    draft.orientation = {
      basis: 'explicit-rotation',
      northRotation: angleDeg(12, 'magnetic', sourceRef),
      magnetic: magneticFixture.magnetic,
    }
    requireBlocked(draft, 'E_MAGNETIC_CONTEXT_INCOMPLETE')
  })
}

test('fixture 33b: magnetic north is reduced to true north using its declination', () => {
  const draft = baselineDraft()
  const sourceRef = primaryEvidenceId(draft)
  draft.orientation = {
    basis: 'explicit-rotation',
    northRotation: angleDeg(10, 'magnetic', sourceRef),
    magnetic: {
      observationDate: '2026-07-25',
      declination: angleDeg(2, 'true', sourceRef),
      modelOrSource: 'IGRF acceptance fixture',
    },
  }

  const plan = requireValid(draft)
  assert.equal(plan.orientation.reference, 'true')
  assert.ok(
    Math.abs(plan.orientation.northRotation.canonicalDegrees - 12) < 1e-12,
    `expected true-north rotation 12°, got ${plan.orientation.northRotation.canonicalDegrees}°`,
  )
  assert.equal(plan.orientation.northRotation.from.reference, 'true')
})

test('fixture 36: subtraction preserves multipolygon components and an inner void', () => {
  const draft = baselineDraft()
  const sourceRef = primaryEvidenceId(draft)
  draft.encumbrances = [
    {
      encumbranceId: 'full-height-divider',
      kind: 'no-build-zone',
      geometry: {
        geometryType: 'polygon',
        featureId: 'full-height-divider-feature',
        path: makePath('full-height-divider-path', [
          [9, 0],
          [11, 0],
          [11, 10],
          [9, 10],
        ]),
        holes: [],
      },
      description: 'A verified no-build strip that divides the envelope.',
      sourceRef,
    },
    {
      encumbranceId: 'inner-island',
      kind: 'no-build-zone',
      geometry: {
        geometryType: 'polygon',
        featureId: 'inner-island-feature',
        path: makePath('inner-island-path', [
          [3, 3],
          [5, 3],
          [5, 5],
          [3, 5],
        ]),
        holes: [],
      },
      description: 'A verified no-build island inside the left component.',
      sourceRef,
    },
  ]

  const plan = requireValid(draft)
  assert.equal(plan.developableEnvelope.components.length, 2)
  assert.equal(
    plan.developableEnvelope.components.reduce(
      (count, component) => count + component.holes.length,
      0,
    ),
    1,
  )

  const footprintInVoid = cloneDraft(draft)
  footprintInVoid.footprints = [
    {
      footprintId: 'inside-inner-void',
      path: makePath('inside-inner-void-path', [
        [3.25, 3.25],
        [4.75, 3.25],
        [4.75, 4.75],
        [3.25, 4.75],
      ]),
      holes: [],
      origin: GENERATED_ORIGIN,
    },
  ]
  requireBlocked(footprintInVoid, 'E_FOOTPRINT_IN_VOID')
})

test('fixture 36b: a footprint coincident with a no-build void remains outside the envelope', () => {
  const draft = baselineDraft()
  const sourceRef = primaryEvidenceId(draft)
  const voidCoordinates = [
    [3, 3],
    [5, 3],
    [5, 5],
    [3, 5],
  ] as const
  draft.encumbrances = [{
    encumbranceId: 'coincident-void',
    kind: 'no-build-zone',
    geometry: {
      geometryType: 'polygon',
      featureId: 'coincident-void-feature',
      path: makePath('coincident-void-path', voidCoordinates),
      holes: [],
    },
    description: 'Verified no-build void.',
    sourceRef,
  }]
  draft.footprints = [{
    footprintId: 'coincident-footprint',
    path: makePath('coincident-footprint-path', voidCoordinates),
    holes: [],
    origin: GENERATED_ORIGIN,
  }]

  requireBlocked(draft, 'E_FOOTPRINT_IN_VOID')
})

test('fixture 36c: a boundary-connected exclusion is subtracted without an invented closing edge', () => {
  const draft = baselineDraft()
  const sourceRef = primaryEvidenceId(draft)
  draft.encumbrances = [{
    encumbranceId: 'boundary-connected-exclusion',
    kind: 'no-build-zone',
    geometry: {
      geometryType: 'polygon',
      featureId: 'boundary-connected-exclusion-feature',
      path: makePath('boundary-connected-exclusion-path', [
        [1, 2],
        [5, 2],
        [5, 6],
        [1, 6],
      ]),
      holes: [],
    },
    description: 'A 16 m² exclusion connected to the 144 m² setback envelope.',
    sourceRef,
  }]

  const plan = requireValid(draft)
  const actualArea = multiPolygonArea(plan.developableEnvelope)
  assert.ok(
    Math.abs(actualArea - 128) < 1e-9,
    `expected a 128 m² developable envelope, got ${actualArea} m²`,
  )
})

test('fixture 12b: an open cadastral-hole path is not silently closed', () => {
  const draft = baselineDraft()
  const sourceRef = primaryEvidenceId(draft)
  draft.cadastralHoles = [{
    holeId: 'open-ownership-void',
    path: makePath(
      'open-ownership-void-path',
      [
        [5, 3],
        [7, 3],
        [7, 5],
        [5, 5],
      ],
      { closure: { kind: 'open' } },
    ),
    sourceRef,
  }]
  draft.statedArea = areaSqm(196, sourceRef, 0.001)

  requireBlocked(draft, 'E_SOURCE_PATH_OPEN')
})

test('guardrail 1: digest is deterministic, normalises -0, and covers payload plus parameters', () => {
  const negativeZeroDraft = baselineDraft()
  const negativeZeroPoint = coordinateOuterPath(negativeZeroDraft).points[0]
  if (negativeZeroPoint === undefined) {
    throw new Error('digest fixture requires a first boundary point')
  }
  negativeZeroPoint.axis1 = -0
  assert.equal(Object.is(negativeZeroPoint.axis1, -0), true)

  const positiveZeroDraft = cloneDraft(negativeZeroDraft)
  const positiveZeroPoint = coordinateOuterPath(positiveZeroDraft).points[0]
  if (positiveZeroPoint === undefined) {
    throw new Error('digest fixture clone requires a first boundary point')
  }
  positiveZeroPoint.axis1 = 0

  const first = requireValid(negativeZeroDraft)
  const repeated = requireValid(negativeZeroDraft)
  const positiveZero = requireValid(positiveZeroDraft)
  const digest = validationDigest(first).digest
  assert.equal(validationDigest(repeated).digest, digest)
  assert.equal(validationDigest(positiveZero).digest, digest)

  const changedPayloadDraft = baselineDraft()
  changedPayloadDraft.identity.projectName = `${changedPayloadDraft.identity.projectName} revised`
  assert.notEqual(validationDigest(requireValid(changedPayloadDraft)).digest, digest)

  const changedParams: KernelParameters = {
    ...baseParams,
    paperToleranceMm: baseParams.paperToleranceMm + 0.01,
  }
  assert.notEqual(
    validationDigest(requireValid(baselineDraft(), changedParams)).digest,
    digest,
  )
})

test('guardrail 2: the complete validated exporter payload is deeply frozen', () => {
  const plan = requireValid(baselineDraft())
  assertDeepFrozen(plan)

  const originalProjectName = plan.identity.projectName
  assert.throws(() => {
    ;(plan.identity as { projectName: string }).projectName = 'tampered'
  }, TypeError)
  assert.equal(plan.identity.projectName, originalProjectName)

  const firstVertex = plan.plotSurface.outer.vertices[0]
  if (firstVertex === undefined) {
    throw new Error('deep-freeze fixture requires a boundary vertex')
  }
  const originalX = firstVertex.x
  assert.throws(() => {
    ;(firstVertex as { x: number }).x = 999
  }, TypeError)
  assert.equal(firstVertex.x, originalX)

  assert.throws(() => {
    ;(plan.frontages as unknown as unknown[]).push({})
  }, TypeError)
})

test('guardrail 3: clones, serialised plans, stale rebrands, and version mismatches are rejected', () => {
  const plan = requireValid(baselineDraft())
  assert.doesNotThrow(() => assertExportable(plan, baseParams.kernelVersion))

  const cloned = cloneDraft(plan) as ValidatedSitePlan
  assert.equal(
    Reflect.ownKeys(cloned).some((key) => typeof key === 'symbol'),
    false,
  )
  assertDigestFailure(cloned, baseParams.kernelVersion)

  const serialised = JSON.parse(JSON.stringify(plan)) as ValidatedSitePlan
  assertDigestFailure(serialised, baseParams.kernelVersion)

  const brandKey = validationSymbol(plan)
  const staleDigest = validationDigest(plan)

  const forgedBrand = cloneDraft(plan) as ValidatedSitePlan
  Object.defineProperty(forgedBrand, Symbol('not-the-private-kernel-brand'), {
    value: staleDigest,
    enumerable: false,
    configurable: false,
    writable: false,
  })
  assertDigestFailure(
    forgedBrand,
    baseParams.kernelVersion,
    'a matching digest attached under an arbitrary symbol',
  )

  const changedGeometry = cloneDraft(plan) as unknown as {
    plotSurface: { outer: { vertices: { x: number }[] } }
  }
  const changedVertex = changedGeometry.plotSurface.outer.vertices[0]
  if (changedVertex === undefined) {
    throw new Error('digest geometry probe requires a boundary vertex')
  }
  changedVertex.x += 0.125
  Object.defineProperty(changedGeometry, brandKey, {
    value: staleDigest,
    enumerable: false,
    configurable: false,
    writable: false,
  })
  assertDigestFailure(
    changedGeometry as unknown as ValidatedSitePlan,
    baseParams.kernelVersion,
    'stale brand after mutating a canonical boundary coordinate',
  )

  const payloadBranches = Object.keys(plan)
  assert.ok(payloadBranches.length > 0)
  for (const branch of payloadBranches) {
    const staleRebrand = cloneDraft(plan) as unknown as Record<string, unknown>
    mutateTopLevelBranch(staleRebrand, branch)
    Object.defineProperty(staleRebrand, brandKey, {
      value: staleDigest,
      enumerable: false,
      configurable: false,
      writable: false,
    })
    assertDigestFailure(
      staleRebrand as unknown as ValidatedSitePlan,
      baseParams.kernelVersion,
      `stale brand after mutating top-level payload branch "${branch}"`,
    )
  }

  assertDigestFailure(plan, `${baseParams.kernelVersion}-wrong`)
})
