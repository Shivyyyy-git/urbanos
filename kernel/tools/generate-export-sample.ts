import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

import {
  exportSitePlan,
  validateSitePlan,
  type PdfExportProfile,
} from '../src/index.ts'
import {
  VERIFIED_EVIDENCE_ID,
  baseParams,
  baselineDraft,
  lengthM,
  makePath,
  pathEdge,
} from '../tests/fixtures.ts'

const draft = baselineDraft()
const boundary = draft.boundary
if (
  boundary === null
  || (boundary.route !== 'coordinates' && boundary.route !== 'imported-file')
  || boundary.outerPath === null
) {
  throw new Error('Sample requires a coordinate boundary.')
}
const first = boundary.outerPath.points[0]
const second = boundary.outerPath.points[1]
if (first === undefined || second === undefined) {
  throw new Error('Sample requires a boundary edge.')
}

draft.identity.projectName = 'UrbanOS Feature 1 - Canonical Site Plan'
draft.drawing.sheetRef = 'A3'
draft.drawing.declaredScaleDenominator = 100
draft.footprints = [{
  footprintId: 'proposed-building',
  path: makePath('proposed-building-path', [[3, 3], [9, 3], [9, 7], [3, 7]]),
  holes: [
    makePath('proposed-building-courtyard', [[5, 4], [6, 4], [6, 5], [5, 5]]),
  ],
  label: 'PROPOSED BUILDING',
  storeysAboveGround: 2,
  origin: {
    kind: 'generated',
    generator: { name: 'urbanos-kernel-sample', version: '1' },
  },
}]
draft.projections = [{
  projectionId: 'entrance-canopy',
  kind: 'canopy',
  path: makePath('entrance-canopy-path', [[9, 4], [9.8, 4], [9.8, 6], [9, 6]]),
  attachedToFootprintId: 'proposed-building',
  projectionDepth: lengthM(0.8),
  clearHeight: lengthM(2.4),
}]
draft.encumbrances = [{
  encumbranceId: 'service-corridor',
  kind: 'service-corridor',
  geometry: {
    geometryType: 'polygon',
    featureId: 'service-corridor-geometry',
    path: makePath('service-corridor-path', [[15, 2], [16, 2], [16, 6], [15, 6]]),
    holes: [],
  },
  description: 'Verified service corridor.',
  sourceRef: VERIFIED_EVIDENCE_ID,
}]
draft.existingFeatures = [{
  featureId: 'existing-wall',
  kindRef: 'wall',
  geometry: {
    geometryType: 'polyline',
    featureId: 'existing-wall',
    path: makePath('existing-wall-path', [[2, 8], [7, 8]], {
      closure: { kind: 'open' },
    }),
  },
  toBeRetained: true,
  sourceRef: VERIFIED_EVIDENCE_ID,
}]
draft.dimensions = [{
  dimensionId: 'verified-front-edge',
  kind: 'aligned',
  references: [{
    kind: 'edge',
    ref: pathEdge(boundary.outerPath.pathId, first.pointId, second.pointId),
  }],
}]

const result = validateSitePlan(draft, baseParams)
if (!result.ok) {
  throw new Error(
    `Sample failed validation: ${result.blockers.map((finding) => finding.code).join(', ')}`,
  )
}

const profile: PdfExportProfile = {
  sheet: { ref: 'A3', widthMm: 420, heightMm: 297 },
  frame: {
    leftMm: 12,
    rightMm: 12,
    topMm: 12,
    bottomMm: 12,
    titleBlockHeightMm: 48,
  },
  paperToleranceMm: baseParams.paperToleranceMm,
}
const artifact = exportSitePlan(result.plan, {
  expectedKernelVersion: baseParams.kernelVersion,
  profile,
})

const workspaceArgument = process.argv[2]
if (workspaceArgument === undefined) {
  throw new Error('Pass the UrbanOS workspace path as the first argument.')
}
const workspace = resolve(workspaceArgument)
const pdfDirectory = resolve(workspace, 'output/pdf')
const dxfDirectory = resolve(workspace, 'output/dxf')
mkdirSync(pdfDirectory, { recursive: true })
mkdirSync(dxfDirectory, { recursive: true })
writeFileSync(resolve(pdfDirectory, 'urbanos-feature-1-canonical-sample.pdf'), artifact.pdf)
writeFileSync(resolve(dxfDirectory, 'urbanos-feature-1-canonical-sample.dxf'), artifact.dxf, 'ascii')
writeFileSync(
  resolve(dxfDirectory, 'urbanos-feature-1-canonical-sample.manifest.json'),
  `${JSON.stringify(artifact.manifest, null, 2)}\n`,
  'utf8',
)
