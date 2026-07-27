import assert from 'node:assert/strict'
import test from 'node:test'

import {
  resolveSitePlan,
  validateSitePlan,
} from '../src/index.ts'
import type {
  AngleEntry,
  BlockerCode,
  Finding,
  ReconstructedBoundary,
  SitePlanBriefDraft,
  SourcePath,
  TraverseBoundary,
  ValidatedSitePlan,
  ValidationResult,
} from '../src/index.ts'
import {
  PARAMS,
  VERIFIED_EVIDENCE,
  angleDeg,
  areaSqm,
  draftForPath,
  expectBlocker,
  expectValid,
  lengthM,
  makePath,
} from './fixtures.ts'

const EPS = PARAMS.epsM
const EVIDENCE_ID = VERIFIED_EVIDENCE.evidenceId

function validate(draft: SitePlanBriefDraft): ValidationResult {
  return validateSitePlan(draft, PARAMS)
}

function assertClose(
  actual: number,
  expected: number,
  tolerance = EPS,
  message?: string,
): void {
  assert.ok(
    Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance,
    message ?? `expected ${actual} to be within ${tolerance} of ${expected}`,
  )
}

function assertCoordinates(
  plan: ValidatedSitePlan,
  expected: readonly (readonly [number, number])[],
): void {
  const actual = plan.plotSurface.outer.vertices
  assert.equal(actual.length, expected.length)
  for (let index = 0; index < expected.length; index += 1) {
    const vertex = actual[index]
    const point = expected[index]
    if (!vertex || !point) {
      throw new Error(`missing coordinate at index ${index}`)
    }
    assertClose(vertex.x, point[0])
    assertClose(vertex.y, point[1])
  }
}

function findingWithCode(
  findings: readonly Finding[],
  code: BlockerCode,
): Finding {
  const finding = findings.find((candidate) => candidate.code === code)
  if (!finding) {
    throw new Error(`expected finding ${code}`)
  }
  return finding
}

function assertNoFinding(
  findings: readonly Finding[],
  code: BlockerCode,
): void {
  assert.equal(
    findings.some((finding) => finding.code === code),
    false,
    `did not expect finding ${code}`,
  )
}

function polygonArea(
  coordinates: readonly (readonly [number, number])[],
): number {
  let twiceArea = 0
  for (let index = 0; index < coordinates.length; index += 1) {
    const current = coordinates[index]
    const next = coordinates[(index + 1) % coordinates.length]
    if (!current || !next) {
      throw new Error(`missing polygon coordinate at index ${index}`)
    }
    twiceArea += current[0] * next[1] - next[0] * current[1]
  }
  return Math.abs(twiceArea) / 2
}

function readyDraft(
  path: SourcePath,
  area = polygonArea(path.points.map((point) => [point.axis1, point.axis2] as const)),
): SitePlanBriefDraft {
  return draftForPath(path, {
    statedArea: areaSqm(area, 0.001, EVIDENCE_ID),
  })
}

function traverseAtResidual(
  residualM: number,
  sideM: number,
): TraverseBoundary {
  const distances = [sideM, sideM, sideM, sideM - residualM]
  const bearings = [0, 90, 180, 270]
  return {
    route: 'traverse',
    startPoint: {
      geometryType: 'point',
      featureId: 'traverse-start',
      frame: {
        kind: 'planar',
        axisUnit: 'm',
        crsCode: null,
        isLocal: true,
        sourceRef: EVIDENCE_ID,
      },
      axis1: 0,
      axis2: 0,
      sourceRef: EVIDENCE_ID,
    },
    legs: distances.map((distance, index) => ({
      legId: `leg-${index}`,
      bearing: angleDeg(bearings[index] ?? 0, 'true', EVIDENCE_ID),
      distance: lengthM(distance, EVIDENCE_ID),
    })),
    closureProfileRef: 'total-station-1:10000',
    adjustment: {
      adjustedPath: makePath(
        'professionally-adjusted-traverse',
        [[0, 0], [0, sideM], [sideM, sideM], [sideM, 0]],
        { crsCode: null, isLocal: true },
      ),
      method: 'professionally supplied adjusted stations',
      professional: VERIFIED_EVIDENCE.responsibleProfessional!,
      approvedAt: '2026-07-25',
      evidenceRef: EVIDENCE_ID,
    },
  }
}

function draftForTraverse(boundary: TraverseBoundary): SitePlanBriefDraft {
  const seed = readyDraft(
    makePath('seed', [[0, 0], [10, 0], [10, 10], [0, 10]]),
    100,
  )
  return {
    ...seed,
    boundary,
    statedArea: areaSqm(
      (boundary.legs[0]?.distance?.asEntered ?? 0) ** 2,
      0.001,
      EVIDENCE_ID,
    ),
    roadFrontages: [{
      frontageId: 'traverse-frontage',
      edges: [{ kind: 'traverse-leg', legId: 'leg-0' }],
      carriagewayWidth: lengthM(12, EVIDENCE_ID),
      roadName: 'Verified road',
    }],
    setbacks: boundary.legs.map((leg, index) => ({
      setbackId: `traverse-setback-${index}`,
      edges: [{ kind: 'traverse-leg', legId: leg.legId }],
      distance: lengthM(0, EVIDENCE_ID),
      basis: { citation: 'Fixture zero-setback basis', sourceRef: EVIDENCE_ID },
    })),
  }
}

function ambiguousReconstructionDraft(): SitePlanBriefDraft {
  const seed = readyDraft(
    makePath('seed-reconstruction', [[0, 0], [10, 0], [10, 10], [0, 10]]),
    100,
  )
  const boundary: ReconstructedBoundary = {
    route: 'reconstructed',
    sides: [
      lengthM(11, EVIDENCE_ID),
      lengthM(11, EVIDENCE_ID),
      lengthM(5.2, EVIDENCE_ID),
      lengthM(5.2, EVIDENCE_ID),
    ],
    diagonals: [{
      fromVertexIndex: 0,
      toVertexIndex: 2,
      length: lengthM(10, EVIDENCE_ID),
    }],
    disambiguation: null,
  }
  return {
    ...seed,
    boundary,
    statedArea: null,
    roadFrontages: [{
      frontageId: 'reconstructed-frontage',
      edges: [{ kind: 'reconstructed-side', sideIndex: 0 }],
      carriagewayWidth: lengthM(12, EVIDENCE_ID),
      roadName: 'Verified road',
    }],
    setbacks: ([0, 1, 2, 3] as const).map((sideIndex) => ({
      setbackId: `reconstructed-setback-${sideIndex}`,
      edges: [{ kind: 'reconstructed-side', sideIndex }],
      distance: lengthM(0, EVIDENCE_ID),
      basis: { citation: 'Fixture zero-setback basis', sourceRef: EVIDENCE_ID },
    })),
  }
}

test('fixture 1: an axis-aligned rectangle becomes exact canonical geometry', () => {
  const coordinates = [[0, 0], [30, 0], [30, 20], [0, 20]] as const
  const path = makePath('fixture-1', coordinates, {
    closure: { kind: 'closed-flag', flagSource: 'fixture' },
  })
  const plan = expectValid(validate(readyDraft(path, 600)))

  assertCoordinates(plan, coordinates)
  assertClose(plan.plotArea.computedSqm, 600)
  assert.equal(plan.plotSurface.outer.edges.length, 4)
  assert.deepEqual(plan.plotSurface.outer.closureBasis, {
    kind: 'closed-flag',
    flagSource: 'fixture',
  })
})

test('fixture 2: a rotated rectangle retains geometry and explicit north', () => {
  const angleRadians = Math.PI / 6
  const rotate = (x: number, y: number): readonly [number, number] => [
    x * Math.cos(angleRadians) - y * Math.sin(angleRadians),
    x * Math.sin(angleRadians) + y * Math.cos(angleRadians),
  ]
  const coordinates = [
    rotate(0, 0),
    rotate(20, 0),
    rotate(20, 10),
    rotate(0, 10),
  ]
  const path = makePath('fixture-2', coordinates)
  const draft = readyDraft(path, 200)
  draft.orientation = {
    basis: 'explicit-rotation',
    northRotation: angleDeg(31.25, 'grid', EVIDENCE_ID),
  }

  const plan = expectValid(validate(draft))
  assertCoordinates(plan, coordinates)
  assertClose(plan.orientation.northRotation.canonicalDegrees, 31.25)
  assert.equal(plan.orientation.reference, 'grid')
})

test('fixture 3: an irregular convex quadrilateral passes unchanged', () => {
  const coordinates = [[0, 0], [12, 1], [10, 9], [-2, 6]] as const
  const area = polygonArea(coordinates)
  const plan = expectValid(validate(readyDraft(
    makePath('fixture-3', coordinates),
    area,
  )))

  assertCoordinates(plan, coordinates)
  assertClose(plan.plotArea.computedSqm, area)
})

test('fixture 4: a concave polygon with more than four vertices is valid', () => {
  const coordinates = [
    [0, 0], [12, 0], [12, 8], [7, 8],
    [7, 3], [3, 3], [3, 8], [0, 8],
  ] as const
  const area = polygonArea(coordinates)
  const plan = expectValid(validate(readyDraft(
    makePath('fixture-4', coordinates),
    area,
  )))

  assertCoordinates(plan, coordinates)
  assert.equal(plan.plotSurface.outer.vertices.length, 8)
  assertClose(plan.plotArea.computedSqm, area)
})

test('fixture 5: a preserved collinear survey monument survives canonicalisation', () => {
  const coordinates = [[0, 0], [5, 0], [10, 0], [10, 8], [0, 8]] as const
  const path = makePath('fixture-5', coordinates, { preserveIndices: [1] })
  path.points[1] = {
    ...path.points[1]!,
    monumentId: 'MONUMENT-A',
  }

  const plan = expectValid(validate(readyDraft(path, 80)))
  const monument = plan.plotSurface.outer.vertices.find(
    (vertex) => vertex.fromPointId === 'fixture-5-p1',
  )
  if (!monument) {
    throw new Error('preserved survey monument is missing from canonical vertices')
  }
  assert.equal(monument.monumentId, 'MONUMENT-A')
  assert.equal(monument.preservedCollinear, true)
  assert.equal(plan.plotSurface.outer.vertices.length, 5)
})

test('fixture 6: an explicit interior cadastral hole is retained and subtracted', () => {
  const outer = makePath(
    'fixture-6-outer',
    [[0, 0], [20, 0], [20, 20], [0, 20]],
  )
  const hole = makePath(
    'fixture-6-hole',
    [[5, 5], [10, 5], [10, 10], [5, 10]],
  )
  const draft = draftForPath(outer, {
    statedArea: areaSqm(375, 0.001, EVIDENCE_ID),
    cadastralHoles: [{
      holeId: 'hole-1',
      path: hole,
      description: 'Surveyed exclusion',
      sourceRef: EVIDENCE_ID,
    }],
  })

  const plan = expectValid(validate(draft))
  assert.equal(plan.plotSurface.holes.length, 1)
  assert.equal(plan.plotSurface.holes[0]?.vertices.length, 4)
  assertClose(plan.plotArea.computedSqm, 375)
})

test('fixture 8: a traverse exactly at both profile gates is fully valid', () => {
  // Binary-exact values: (4 × 10001/256 - 1/64) ÷ (1/64) = 10,000.
  // This prevents floating representation noise from turning the threshold
  // fixture into an accidental just-below-threshold fixture.
  const sideM = 10_001 / 256
  const residualM = 1 / 64
  const result = validate(draftForTraverse(
    traverseAtResidual(residualM, sideM),
  ))
  const plan = expectValid(result)

  const closure = plan.closure
  if (!closure) {
    throw new Error('validated traverse must carry its closure result')
  }
  assertClose(closure.ratioDenominator ?? 0, 10_000, 1e-6)
  assertClose(closure.misclosureM, residualM, 1e-9)
  assert.equal(closure.passesRatio, true)
  assert.equal(closure.passesAbsoluteCap, true)
  assert.equal(plan.setbacks.length, 4)
})

test('fixture 8b: every adjusted traverse change is explicitly disclosed', () => {
  const sideM = 10_001 / 256
  const residualM = 1 / 64
  const boundary = traverseAtResidual(residualM, sideM)
  const plan = expectValid(validate(draftForTraverse(boundary)))

  assert.equal(plan.plotSurface.outer.edges.length, boundary.legs.length)
  const closure = plan.closure
  if (closure?.adjustment.kind !== 'professionally-adjusted') {
    throw new Error('fixture 8b requires a recorded professional adjustment')
  }
  let observedMaximum = 0
  for (let index = 0; index < boundary.legs.length; index += 1) {
    const measured = boundary.legs[index]?.distance?.asEntered
    const canonical = plan.plotSurface.outer.edges[index]?.lengthM
    if (measured === undefined || canonical === undefined) {
      throw new Error(`fixture 8b is missing traverse leg ${index}`)
    }
    observedMaximum = Math.max(
      observedMaximum,
      Math.abs(canonical - measured),
    )
  }
  assertClose(
    closure.adjustment.maxEdgeLengthChangeM,
    observedMaximum,
    1e-9,
  )
  assertClose(observedMaximum, residualM, 1e-9)
  assert.equal(
    closure.adjustment.professional.licenceNumber,
    VERIFIED_EVIDENCE.responsibleProfessional?.licenceNumber,
  )
})

test('fixture 8c: a profile-passing misclosure still needs professional adjustment', () => {
  const boundary = traverseAtResidual(1 / 64, 10_001 / 256)
  boundary.adjustment = null
  expectBlocker(
    validate(draftForTraverse(boundary)),
    'E_TRAVERSE_ADJUSTMENT_UNAPPROVED',
  )
})

test('fixture 8d: a truly closed traverse needs no adjustment', () => {
  const boundary = traverseAtResidual(0, 10)
  boundary.adjustment = null
  const plan = expectValid(validate(draftForTraverse(boundary)))
  assert.deepEqual(plan.closure?.adjustment, { kind: 'none' })
})

test('fixture 11: metre, foot and gaj inputs resolve to identical canonical truth', () => {
  const metresCoordinates = [[0, 0], [12, 0], [12, 8], [0, 8]] as const
  const feetCoordinates = metresCoordinates.map(
    ([x, y]) => [x / 0.3048, y / 0.3048] as const,
  )
  const metricDraft = draftForPath(
    makePath('fixture-11-m', metresCoordinates, { axisUnit: 'm' }),
    { statedArea: areaSqm(96, 0.001, EVIDENCE_ID) },
  )
  const imperialDraft = draftForPath(
    makePath('fixture-11-ft', feetCoordinates, { axisUnit: 'ft' }),
    {
      statedArea: {
        asEntered: 96 / 0.83612736,
        unit: 'gaj',
        statedPrecision: 0.000001,
        sourceRef: EVIDENCE_ID,
      },
    },
  )

  const metric = expectValid(validate(metricDraft))
  const imperial = expectValid(validate(imperialDraft))
  assertCoordinates(metric, metresCoordinates)
  assertCoordinates(imperial, metresCoordinates)
  assertClose(metric.plotArea.computedSqm, imperial.plotArea.computedSqm)
  assertClose(metric.plotArea.statedSqm ?? Number.NaN, 96, 1e-9)
  assertClose(imperial.plotArea.statedSqm ?? Number.NaN, 96, 1e-9)
})

test('fixture 11b: naming a target CRS does not treat geographic degrees as metres', () => {
  const path = makePath(
    'fixture-11-geographic',
    [[77, 28], [77.001, 28], [77.001, 28.001], [77, 28.001]],
  )
  path.frame = {
    kind: 'geographic',
    crsCode: 'EPSG:4326',
    projectionToPlanar: {
      targetCrsCode: 'EPSG:32643',
      sourceRef: EVIDENCE_ID,
    },
  }

  const resolved = resolveSitePlan(
    draftForPath(path, { statedArea: null }),
    PARAMS,
  )
  findingWithCode(resolved.findings, 'E_FRAME_UNPROJECTED')
  assert.equal(resolved.outerPath, null)
})

test('fixture 11c: imported-file units must be confirmed and agree with the path frame', () => {
  const path = makePath(
    'fixture-11-imported-units',
    [[0, 0], [20, 0], [20, 10], [0, 10]],
    { axisUnit: 'm' },
  )
  const draft = readyDraft(path, 200)
  draft.boundary = {
    route: 'imported-file',
    file: EVIDENCE_ID,
    extractedFrom: null,
    units: {
      insunitsRaw: 2,
      interpretedAs: 'ft',
      confirmedBy: null,
      state: 'confirmed',
    },
    outerPath: path,
    importJobId: 'fixture-11-import',
  }

  const resolved = resolveSitePlan(draft, PARAMS)
  findingWithCode(resolved.findings, 'E_UNIT_AMBIGUOUS')
  assert.equal(resolved.outerPath, null)
})

test('fixture 12: closure is never inferred for an open, unknown, or mismatched path', async (t) => {
  await t.test('open path', () => {
    const path = makePath('fixture-12-open', [[0, 0], [10, 0], [10, 10], [0, 10]], {
      closure: { kind: 'open' },
    })
    expectBlocker(validate(readyDraft(path, 100)), 'E_SOURCE_PATH_OPEN')
  })

  await t.test('unknown closure', () => {
    const path = makePath('fixture-12-unknown', [[0, 0], [10, 0], [10, 10], [0, 10]], {
      closure: { kind: 'unknown' },
    })
    expectBlocker(validate(readyDraft(path, 100)), 'E_CLOSURE_ENCODING_UNKNOWN')
  })

  await t.test('repeated endpoint beyond EPS', () => {
    const path = makePath(
      'fixture-12-gap',
      [[0, 0], [10, 0], [10, 10], [0, 10], [EPS * 2, 0]],
      { closure: { kind: 'repeated-first-point' } },
    )
    const finding = expectBlocker(
      validate(readyDraft(path, 100)),
      'E_CLOSURE_POINT_MISMATCH',
    )
    assert.ok(finding.observed, 'the measured endpoint gap must be reported')
  })
})

test('fixture 13: a traverse fails either a worse ratio or the absolute cap', async (t) => {
  await t.test('ratio below 1:10,000', () => {
    const result = validate(draftForTraverse(traverseAtResidual(0.005, 10)))
    expectBlocker(result, 'E_TRAVERSE_MISCLOSURE')
  })

  await t.test('misclosure above 20 mm despite a passing ratio', () => {
    const result = validate(draftForTraverse(traverseAtResidual(0.03, 100)))
    expectBlocker(result, 'E_TRAVERSE_MISCLOSURE')
  })
})

test('fixture 14: fewer than three distinct vertices blocks ring creation', () => {
  const path = makePath('fixture-14', [[0, 0], [10, 0]], {
    closure: { kind: 'closed-flag', flagSource: 'fixture' },
  })
  expectBlocker(validate(draftForPath(path, { statedArea: null })), 'E_RING_TOO_FEW_VERTICES')
})

test('fixture 15: an entirely collinear ring has zero area', () => {
  const path = makePath('fixture-15', [[0, 0], [5, 0], [10, 0], [15, 0]])
  expectBlocker(validate(draftForPath(path, { statedArea: null })), 'E_RING_ZERO_AREA')
})

test('fixture 16: a consecutive duplicate creates a degenerate edge', () => {
  const path = makePath('fixture-16', [[0, 0], [10, 0], [10, 0], [10, 10], [0, 10]])
  expectBlocker(
    validate(draftForPath(path, { statedArea: null })),
    'E_RING_DEGENERATE_EDGE',
  )
})

test('fixture 17: a bow-tie boundary is rejected as self-intersecting', () => {
  const path = makePath('fixture-17', [[0, 0], [10, 10], [0, 10], [10, 0]])
  expectBlocker(
    validate(draftForPath(path, { statedArea: null })),
    'E_RING_SELF_INTERSECTS',
  )
})

test('fixture 18: a ring that returns along a spike is rejected as self-touching', () => {
  const path = makePath(
    'fixture-18',
    [[0, 0], [8, 0], [8, 8], [4, 4], [8, 8], [0, 8]],
  )
  expectBlocker(
    validate(draftForPath(path, { statedArea: null })),
    'E_RING_SELF_TOUCHES',
  )
})

test('fixture 19: a hole outside, touching, or crossing the exterior is never interior', async (t) => {
  const outer = makePath('fixture-19-outer', [[0, 0], [20, 0], [20, 20], [0, 20]])
  const cases = [
    {
      name: 'outside',
      coordinates: [[21, 2], [24, 2], [24, 5], [21, 5]] as const,
    },
    {
      name: 'touching',
      coordinates: [[0, 2], [4, 2], [4, 6], [0, 6]] as const,
    },
    {
      name: 'crossing',
      coordinates: [[-2, 2], [4, 2], [4, 6], [-2, 6]] as const,
    },
  ]

  for (const fixture of cases) {
    await t.test(fixture.name, () => {
      const hole = makePath(`fixture-19-${fixture.name}`, fixture.coordinates)
      const draft = draftForPath(outer, {
        statedArea: null,
        cadastralHoles: [{
          holeId: `hole-${fixture.name}`,
          path: hole,
          sourceRef: EVIDENCE_ID,
        }],
      })
      expectBlocker(validate(draft), 'E_HOLE_NOT_INTERIOR')
    })
  }
})

test('fixture 20: two interior holes may neither touch nor overlap', async (t) => {
  const outer = makePath('fixture-20-outer', [[0, 0], [30, 0], [30, 20], [0, 20]])
  const first = makePath('fixture-20-first', [[5, 5], [12, 5], [12, 12], [5, 12]])
  const cases = [
    {
      name: 'overlap',
      second: [[10, 8], [17, 8], [17, 15], [10, 15]] as const,
    },
    {
      name: 'touch',
      second: [[12, 5], [17, 5], [17, 10], [12, 10]] as const,
    },
  ]

  for (const fixture of cases) {
    await t.test(fixture.name, () => {
      const second = makePath(`fixture-20-${fixture.name}`, fixture.second)
      const draft = draftForPath(outer, {
        statedArea: null,
        cadastralHoles: [
          { holeId: 'hole-a', path: first, sourceRef: EVIDENCE_ID },
          { holeId: 'hole-b', path: second, sourceRef: EVIDENCE_ID },
        ],
      })
      expectBlocker(validate(draft), 'E_HOLE_OVERLAP')
    })
  }
})

test('fixture 34: unresolved side-plus-diagonal reconstruction retains all candidates', () => {
  const result = validate(ambiguousReconstructionDraft())
  expectBlocker(result, 'E_RECONSTRUCTION_AMBIGUOUS')
  if (result.ok || !result.resolved) {
    throw new Error('ambiguous reconstruction must return its resolved candidates')
  }
  assert.ok(
    result.resolved.candidateAssemblies.length >= 4,
    'the four simple candidate assemblies must remain inspectable',
  )
  const distinctAreas = new Set(
    result.resolved.candidateAssemblies.map((candidate) => candidate.areaSqm.toFixed(2)),
  )
  assert.ok(distinctAreas.size >= 2, 'ambiguity must expose both distinct areas')
})

test('fixture 35: a four-point closed flag creates the closing edge without endpoint coincidence', () => {
  const path = makePath(
    'fixture-35',
    [[0, 0], [14, 0], [14, 9], [0, 9]],
    { closure: { kind: 'closed-flag', flagSource: 'DXF group 70 bit 1' } },
  )
  const plan = expectValid(validate(readyDraft(path, 126)))

  assert.equal(plan.plotSurface.outer.vertices.length, 4)
  assert.equal(plan.plotSurface.outer.edges.length, 4)
  assert.deepEqual(plan.plotSurface.outer.closureBasis, path.closure)
})

test('fixture 37: non-finite coordinates and measurements fail during resolution', async (t) => {
  for (const value of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
    await t.test(`coordinate ${String(value)}`, () => {
      const path = makePath(
        `fixture-37-coordinate-${String(value)}`,
        [[0, 0], [value, 0], [10, 10], [0, 10]],
      )
      const resolved = resolveSitePlan(
        draftForPath(path, { statedArea: null }),
        PARAMS,
      )
      findingWithCode(resolved.findings, 'E_VALUE_NOT_FINITE')
      assert.equal(resolved.outerPath, null)
    })
  }

  await t.test('measurement Infinity', () => {
    const path = makePath('fixture-37-measurement', [[0, 0], [10, 0], [10, 10], [0, 10]])
    const draft = draftForPath(path, {
      statedArea: {
        asEntered: Number.POSITIVE_INFINITY,
        unit: 'sqm',
        statedPrecision: 0.001,
        sourceRef: EVIDENCE_ID,
      },
    })
    const resolved = resolveSitePlan(draft, PARAMS)
    findingWithCode(resolved.findings, 'E_VALUE_NOT_FINITE')
    assert.equal(resolved.statedArea, null)
  })
})

test('fixture 38: malformed or non-finite angle forms block resolution', async (t) => {
  const invalidAngles: readonly { name: string; angle: AngleEntry }[] = [
    {
      name: 'both decimal and DMS',
      angle: {
        decimalDegrees: 12,
        dms: { d: 12, m: 0, s: 0, sign: 1 },
        reference: 'true',
        sourceRef: EVIDENCE_ID,
      },
    },
    {
      name: 'neither decimal nor DMS',
      angle: { reference: 'true', sourceRef: EVIDENCE_ID },
    },
    {
      name: 'non-finite decimal',
      angle: {
        decimalDegrees: Number.NaN,
        reference: 'true',
        sourceRef: EVIDENCE_ID,
      },
    },
  ]

  for (const fixture of invalidAngles) {
    await t.test(fixture.name, () => {
      const path = makePath(
        `fixture-38-${fixture.name}`,
        [[0, 0], [10, 0], [10, 10], [0, 10]],
      )
      const draft = readyDraft(path, 100)
      draft.orientation = {
        basis: 'explicit-rotation',
        northRotation: fixture.angle,
      }
      const resolved = resolveSitePlan(draft, PARAMS)
      findingWithCode(resolved.findings, 'E_ANGLE_FORM_INVALID')
      assert.equal(resolved.northRotation, null)
    })
  }
})

test('fixture 39: an unspecified chain requires an evidence-linked conversion factor', () => {
  const path = makePath('fixture-39', [[0, 0], [20, 0], [20, 10], [0, 10]])
  const missingFactor = readyDraft(path, 200)
  missingFactor.setbacks = missingFactor.setbacks.map((setback, index) => (
    index === 0
      ? {
          ...setback,
          distance: {
            asEntered: 1,
            unit: 'chain-unspecified',
            sourceRef: EVIDENCE_ID,
          },
        }
      : setback
  ))
  const unresolved = resolveSitePlan(missingFactor, PARAMS)
  findingWithCode(unresolved.findings, 'E_UNIT_FACTOR_UNDECLARED')
  assert.equal(unresolved.setbacks[0]?.distance, null)

  const declaredFactor = readyDraft(
    makePath('fixture-39-declared', [[0, 0], [20, 0], [20, 10], [0, 10]]),
    200,
  )
  declaredFactor.setbacks = declaredFactor.setbacks.map((setback, index) => (
    index === 0
      ? {
          ...setback,
          distance: {
            asEntered: 1,
            unit: 'chain-unspecified',
            declaredFactor: {
              mPerUnit: 20.1168,
              sourceRef: EVIDENCE_ID,
            },
            sourceRef: EVIDENCE_ID,
          },
        }
      : setback
  ))
  const resolved = resolveSitePlan(declaredFactor, PARAMS)
  assertNoFinding(resolved.findings, 'E_UNIT_FACTOR_UNDECLARED')
  assertClose(resolved.setbacks[0]?.distance?.canonicalM ?? Number.NaN, 20.1168, 1e-9)
})
