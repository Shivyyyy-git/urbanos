import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import test from 'node:test'

import {
  KernelError,
  exportSitePlan,
  sha256,
  validateSitePlan,
  type DrawingPoint,
  type ExportParityManifest,
  type PdfExportProfile,
  type SitePlanBriefDraft,
  type SitePlanExport,
  type ValidatedSitePlan,
} from '../src/index.ts'
import {
  VERIFIED_EVIDENCE_ID,
  baseParams,
  baselineDraft,
  lengthM,
  makePath,
  pathEdge,
} from './fixtures.ts'

const A1_PROFILE: PdfExportProfile = {
  sheet: { ref: 'A1', widthMm: 841, heightMm: 594 },
  frame: {
    leftMm: 12,
    rightMm: 12,
    topMm: 12,
    bottomMm: 12,
    titleBlockHeightMm: 48,
  },
  paperToleranceMm: baseParams.paperToleranceMm,
}

const A3_PROFILE: PdfExportProfile = {
  ...A1_PROFILE,
  sheet: { ref: 'A3', widthMm: 420, heightMm: 297 },
}

const A4_PROFILE: PdfExportProfile = {
  ...A1_PROFILE,
  sheet: { ref: 'A4', widthMm: 297, heightMm: 210 },
  frame: {
    leftMm: 12,
    rightMm: 12,
    topMm: 12,
    bottomMm: 12,
    titleBlockHeightMm: 42,
  },
}

function requireValid(draft: SitePlanBriefDraft): ValidatedSitePlan {
  const result = validateSitePlan(draft, baseParams)
  if (!result.ok) {
    throw new Error(
      `Expected exporter fixture to validate; blockers=${result.blockers
        .map((finding) => finding.code)
        .join(', ')}`,
    )
  }
  return result.plan
}

function exporterFixture(): SitePlanBriefDraft {
  const draft = baselineDraft()
  const boundary = draft.boundary
  if (
    boundary === null
    || (boundary.route !== 'coordinates' && boundary.route !== 'imported-file')
    || boundary.outerPath === null
  ) {
    throw new Error('Exporter fixture requires a coordinate boundary.')
  }
  const frame = boundary.outerPath.frame
  const first = boundary.outerPath.points[0]
  const second = boundary.outerPath.points[1]
  if (first === undefined || second === undefined) {
    throw new Error('Exporter fixture requires a boundary edge.')
  }

  draft.identity.projectName = 'UrbanOS canonical export acceptance'
  draft.drawing.sheetRef = 'A1'
  draft.drawing.declaredScaleDenominator = 100
  draft.footprints = [{
    footprintId: 'building-a',
    path: makePath('building-a-path', [[3, 3], [8, 3], [8, 7], [3, 7]]),
    holes: [],
    label: 'PROPOSED BUILDING',
    storeysAboveGround: 2,
    origin: {
      kind: 'generated',
      generator: { name: 'export-acceptance', version: '1' },
    },
  }]
  draft.projections = [{
    projectionId: 'canopy-a',
    kind: 'canopy',
    path: makePath('canopy-a-path', [[8, 4], [8.6, 4], [8.6, 6], [8, 6]]),
    attachedToFootprintId: 'building-a',
    projectionDepth: lengthM(0.6),
    clearHeight: lengthM(2.4),
  }]
  draft.encumbrances = [{
    encumbranceId: 'service-strip',
    kind: 'service-corridor',
    geometry: {
      geometryType: 'polygon',
      featureId: 'service-strip-geometry',
      path: makePath('service-strip-path', [[15, 2], [16, 2], [16, 5], [15, 5]]),
      holes: [],
    },
    description: 'Verified service corridor.',
    sourceRef: VERIFIED_EVIDENCE_ID,
  }]
  draft.restrictions = [{
    restrictionId: 'tree-protection',
    kindRef: 'verified-protection-zone',
    geometry: {
      geometryType: 'polygon',
      featureId: 'tree-protection-geometry',
      path: makePath('tree-protection-path', [[10, 6], [12, 6], [12, 8], [10, 8]]),
      holes: [],
    },
    description: 'Verified restriction.',
    sourceRef: VERIFIED_EVIDENCE_ID,
  }]
  draft.existingFeatures = [{
    featureId: 'existing-wall',
    kindRef: 'wall',
    geometry: {
      geometryType: 'polyline',
      featureId: 'existing-wall',
      path: makePath('existing-wall-path', [[2, 8], [6, 8]], {
        closure: { kind: 'open' },
      }),
    },
    toBeRetained: true,
    sourceRef: VERIFIED_EVIDENCE_ID,
  }]
  draft.levels = [{
    readingId: 'level-1',
    location: {
      geometryType: 'point',
      featureId: 'level-1-point',
      frame,
      axis1: 4,
      axis2: 4,
      sourceRef: VERIFIED_EVIDENCE_ID,
    },
    elevation: lengthM(100.125),
    datum: 'MSL',
    benchmark: {
      description: 'Verified benchmark.',
      location: {
        geometryType: 'point',
        featureId: 'benchmark-point',
        frame,
        axis1: 0,
        axis2: 0,
        sourceRef: VERIFIED_EVIDENCE_ID,
      },
      sourceRef: VERIFIED_EVIDENCE_ID,
    },
  }]
  draft.dimensions = [{
    dimensionId: 'boundary-edge-check',
    kind: 'aligned',
    references: [{
      kind: 'edge',
      ref: pathEdge(boundary.outerPath.pathId, first.pointId, second.pointId),
    }],
  }]
  return draft
}

function expectKernelError(
  callback: () => unknown,
  code: 'E_EXPORT_PARITY' | 'E_EXPORT_DIGEST_INVALID',
): KernelError {
  let caught: unknown
  try {
    callback()
  } catch (error) {
    caught = error
  }
  assert.ok(caught instanceof KernelError, `Expected KernelError ${code}.`)
  assert.equal(caught.code, code)
  return caught
}

interface DxfPath {
  closed: boolean
  points: DrawingPoint[]
}

function dxfPairs(dxf: string): { code: number; value: string }[] {
  const lines = dxf.replaceAll('\r\n', '\n').split('\n')
  const pairs: { code: number; value: string }[] = []
  for (let index = 0; index + 1 < lines.length; index += 2) {
    pairs.push({
      code: Number(lines[index]?.trim()),
      value: lines[index + 1]?.trim() ?? '',
    })
  }
  return pairs
}

function parseDxfPaths(dxf: string): Map<string, DxfPath> {
  const pairs = dxfPairs(dxf)
  const output = new Map<string, DxfPath>()
  let pendingId: string | null = null
  let index = 0
  while (index < pairs.length) {
    const pair = pairs[index]
    if (
      pair?.code === 999
      && pair.value.startsWith('URBANOS_PATH ')
    ) {
      pendingId = decodeURIComponent(pair.value.slice('URBANOS_PATH '.length))
      index += 1
      continue
    }
    if (pair?.code !== 0 || pair.value !== 'POLYLINE') {
      index += 1
      continue
    }
    if (pendingId === null) {
      throw new Error('DXF POLYLINE has no URBANOS_PATH marker.')
    }
    const id = pendingId
    pendingId = null
    let closed = false
    const points: DrawingPoint[] = []
    index += 1
    while (index < pairs.length) {
      const current = pairs[index]
      if (current?.code === 0 && current.value === 'SEQEND') {
        index += 1
        break
      }
      if (current?.code === 70 && points.length === 0) {
        closed = (Number(current.value) & 1) === 1
        index += 1
        continue
      }
      if (current?.code !== 0 || current.value !== 'VERTEX') {
        index += 1
        continue
      }
      index += 1
      let x: number | null = null
      let y: number | null = null
      while (index < pairs.length && pairs[index]?.code !== 0) {
        const vertexPair = pairs[index]
        if (vertexPair?.code === 10) x = Number(vertexPair.value)
        if (vertexPair?.code === 20) y = Number(vertexPair.value)
        index += 1
      }
      if (x === null || y === null) {
        throw new Error(`DXF path ${id} contains a vertex without X/Y.`)
      }
      points.push([x, y])
    }
    output.set(id, { closed, points })
  }
  return output
}

interface PdfPath {
  pointsPt: DrawingPoint[]
  closed: boolean
}

function parsePdfPaths(pdf: Uint8Array): Map<string, PdfPath> {
  const source = new TextDecoder('latin1').decode(pdf)
  const output = new Map<string, PdfPath>()
  const marker = /% URBANOS_PATH ([^\r\n]+)/g
  let match: RegExpExecArray | null
  while ((match = marker.exec(source)) !== null) {
    const encoded = match[1]
    if (encoded === undefined) continue
    const end = source.indexOf('\nS\nQ', match.index)
    if (end < 0) throw new Error(`PDF path ${encoded} has no stroke terminator.`)
    const block = source.slice(match.index, end)
    const pointsPt: DrawingPoint[] = []
    const operator = /(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?) ([ml])(?:\r?\n|$)/g
    let coordinate: RegExpExecArray | null
    while ((coordinate = operator.exec(block)) !== null) {
      pointsPt.push([Number(coordinate[1]), Number(coordinate[2])])
    }
    output.set(decodeURIComponent(encoded), {
      pointsPt,
      closed: /(?:^|\n)h(?:\n|$)/.test(block),
    })
  }
  return output
}

function assertPointNear(
  actual: DrawingPoint,
  expected: DrawingPoint,
  tolerance: number,
  message: string,
): void {
  assert.ok(
    Math.abs(actual[0] - expected[0]) <= tolerance
      && Math.abs(actual[1] - expected[1]) <= tolerance,
    `${message}: actual=${actual.join(',')} expected=${expected.join(',')} tolerance=${tolerance}`,
  )
}

function expectedPaperPoint(
  point: DrawingPoint,
  manifest: ExportParityManifest,
): DrawingPoint {
  const transform = manifest.paperTransform
  return [
    transform.originXPoints
      + (point[0] - transform.modelMinX) * transform.pointsPerModelMetre,
    transform.originYPoints
      + (point[1] - transform.modelMinY) * transform.pointsPerModelMetre,
  ]
}

function assertParity(artifact: SitePlanExport): void {
  const dxfPaths = parseDxfPaths(artifact.dxf)
  const pdfPaths = parsePdfPaths(artifact.pdf)
  assert.equal(dxfPaths.size, artifact.manifest.paths.length)
  assert.equal(pdfPaths.size, artifact.manifest.paths.length)

  const paperTolerancePt = artifact.manifest.paperToleranceMm * (72 / 25.4)
  for (const expected of artifact.manifest.paths) {
    const dxf = dxfPaths.get(expected.id)
    const pdf = pdfPaths.get(expected.id)
    assert.ok(dxf !== undefined, `DXF is missing ${expected.id}.`)
    assert.ok(pdf !== undefined, `PDF is missing ${expected.id}.`)
    assert.equal(dxf.closed, expected.closed, `${expected.id} DXF closure mismatch.`)
    assert.equal(pdf.closed, expected.closed, `${expected.id} PDF closure mismatch.`)
    assert.equal(dxf.points.length, expected.pointsM.length, `${expected.id} DXF vertex count.`)
    assert.equal(pdf.pointsPt.length, expected.pointsM.length, `${expected.id} PDF vertex count.`)

    for (let index = 0; index < expected.pointsM.length; index += 1) {
      const expectedModel = expected.pointsM[index]
      const dxfPoint = dxf.points[index]
      const pdfPoint = pdf.pointsPt[index]
      if (expectedModel === undefined || dxfPoint === undefined || pdfPoint === undefined) {
        throw new Error(`${expected.id} has an incomplete path.`)
      }
      assertPointNear(
        dxfPoint,
        expectedModel,
        baseParams.epsM,
        `${expected.id} DXF model-space parity`,
      )
      assertPointNear(
        pdfPoint,
        expectedPaperPoint(expectedModel, artifact.manifest),
        paperTolerancePt,
        `${expected.id} PDF paper-space parity`,
      )
    }
  }
}

test('fixture 29: DXF and PDF round-trip one canonical drawing at declared units and scale', () => {
  const plan = requireValid(exporterFixture())
  const first = exportSitePlan(plan, {
    expectedKernelVersion: baseParams.kernelVersion,
    profile: A1_PROFILE,
  })
  const second = exportSitePlan(plan, {
    expectedKernelVersion: baseParams.kernelVersion,
    profile: A1_PROFILE,
  })

  assert.equal(first.dxf, second.dxf, 'DXF bytes must be deterministic for one plan.')
  assert.deepEqual(first.pdf, second.pdf, 'PDF bytes must be deterministic for one plan.')
  assert.deepEqual(first.manifest, second.manifest, 'Parity manifests must be deterministic.')
  assert.match(first.dxf, /\$INSUNITS\n70\n6\n/)
  assert.match(first.dxf, /URBANOS_COORDINATE_UNIT metre/)
  assert.match(first.dxf, /URBANOS_DECLARED_SCALE 1:100\.000000/)
  assert.ok(first.pdf.length > 1_000)
  assert.equal(first.manifest.coordinateUnit, 'm')
  assert.equal(first.manifest.declaredScaleDenominator, 100)
  assert.ok(first.manifest.paths.some((path) => path.layer === 'PLOT-BOUNDARY'))
  assert.ok(first.manifest.paths.some((path) => path.layer === 'DEVELOPABLE-ENVELOPE'))
  assert.ok(first.manifest.paths.some((path) => path.layer === 'ROAD-FRONTAGE'))
  assert.ok(first.manifest.paths.some((path) => path.layer === 'ENCUMBRANCE'))
  assert.ok(first.manifest.paths.some((path) => path.layer === 'RESTRICTION'))
  assert.ok(first.manifest.paths.some((path) => path.layer === 'EXISTING-FEATURE'))
  assert.ok(first.manifest.paths.some((path) => path.layer === 'FOOTPRINT'))
  assert.ok(first.manifest.paths.some((path) => path.layer === 'PROJECTION'))
  assert.ok(first.manifest.paths.some((path) => path.layer === 'LEVEL'))
  assert.ok(first.manifest.paths.some((path) => path.layer === 'DIMENSION'))
  assert.ok(first.manifest.paths.some((path) => path.layer === 'NORTH'))
  assert.doesNotMatch(first.dxf, /(?:NaN|Infinity)/)
  assert.doesNotMatch(new TextDecoder('latin1').decode(first.pdf), /(?:NaN|Infinity)/)
  assertParity(first)
})

test('fixture 29b: exporter rejects a sheet definition that differs from the validated sheet', () => {
  const plan = requireValid(exporterFixture())
  expectKernelError(
    () => exportSitePlan(plan, {
      expectedKernelVersion: baseParams.kernelVersion,
      profile: A3_PROFILE,
    }),
    'E_EXPORT_PARITY',
  )
})

test('fixture 29c: exporter refuses to silently rescale a drawing that does not fit', () => {
  const draft = exporterFixture()
  draft.drawing.sheetRef = 'A4'
  draft.drawing.declaredScaleDenominator = 50
  const plan = requireValid(draft)
  const error = expectKernelError(
    () => exportSitePlan(plan, {
      expectedKernelVersion: baseParams.kernelVersion,
      profile: A4_PROFILE,
    }),
    'E_EXPORT_PARITY',
  )
  assert.match(error.message, /did not rescale/i)
})

test('fixture 29d: exporter rejects a clone whose private validation brand was lost', () => {
  const plan = requireValid(exporterFixture())
  const clone = structuredClone(plan) as ValidatedSitePlan
  expectKernelError(
    () => exportSitePlan(clone, {
      expectedKernelVersion: baseParams.kernelVersion,
      profile: A1_PROFILE,
    }),
    'E_EXPORT_DIGEST_INVALID',
  )
})

test('browser-safe SHA-256 matches FIPS vectors and Node for Unicode input', () => {
  assert.equal(
    sha256(''),
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  )
  assert.equal(
    sha256('abc'),
    'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
  )
  const unicode = 'UrbanOS survey सत्य 2D'
  assert.equal(
    sha256(unicode),
    createHash('sha256').update(unicode, 'utf8').digest('hex'),
  )
})
