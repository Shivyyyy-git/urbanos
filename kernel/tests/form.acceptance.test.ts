import assert from 'node:assert/strict'
import test from 'node:test'

import {
  DEFAULT_KERNEL_PARAMETERS,
  buildDrawingModel,
  exportSitePlan,
  validateSitePlan,
  type PdfExportProfile,
} from '../src/index.ts'
import {
  DEMO_FORM,
  RECONSTRUCTED_DEMO_FORM,
  boundaryEdgeCount,
  buildDraft,
  sectionReadiness,
  type FeatureOneFormState,
} from '../../feature1/src/formModel.ts'

function clone(form: FeatureOneFormState): FeatureOneFormState {
  return structuredClone(form)
}

const A3_LANDSCAPE: PdfExportProfile = {
  sheet: { ref: 'A3-L', widthMm: 420, heightMm: 297 },
  frame: {
    leftMm: 12,
    rightMm: 12,
    topMm: 12,
    bottomMm: 12,
    titleBlockHeightMm: 48,
  },
  paperToleranceMm: DEFAULT_KERNEL_PARAMETERS.paperToleranceMm,
}

test('Feature 1 coordinate route reaches the strict review gate', () => {
  const built = buildDraft(clone(DEMO_FORM))
  assert.notEqual(built.draft, null, built.errors.join('\n'))
  const result = validateSitePlan(built.draft!, DEFAULT_KERNEL_PARAMETERS)

  assert.equal(result.ok, true)
  assert.equal(buildDrawingModel(result.plan).boundaryProvenanceNote, null)
  assert.equal(boundaryEdgeCount(DEMO_FORM), 4)
  assert.equal(
    sectionReadiness(DEMO_FORM, built.errors, result.warnings)
      .every((section) => section.complete),
    true,
  )
})

test('Feature 1 deed route exposes every candidate and refuses to guess', () => {
  const form = clone(RECONSTRUCTED_DEMO_FORM)
  form.reconstructionAssemblyId = ''
  form.secondaryDiagonal = ''
  form.acknowledgedWarnings = []

  const built = buildDraft(form)
  assert.notEqual(built.draft, null, built.errors.join('\n'))
  assert.equal(built.draft!.boundary?.route, 'reconstructed')
  assert.equal(boundaryEdgeCount(form), 4)

  const boundary = built.draft!.boundary
  assert.ok(boundary?.route === 'reconstructed')
  assert.equal(boundary.sides.length, 4)
  assert.equal(boundary.diagonals.length, 1)
  assert.equal(boundary.disambiguation, null)
  assert.ok(
    built.draft!.setbacks.every(
      (setback) => setback.edges[0]?.kind === 'reconstructed-side',
    ),
  )

  const result = validateSitePlan(built.draft!, DEFAULT_KERNEL_PARAMETERS)
  assert.equal(result.ok, false)
  if (result.ok) return
  assert.ok(result.blockers.some((finding) => finding.code === 'E_RECONSTRUCTION_AMBIGUOUS'))
  assert.ok((result.resolved?.candidateAssemblies.length ?? 0) >= 2)
})

test('Feature 1 deed route becomes review-ready only after sourced assembly selection', () => {
  const form = clone(RECONSTRUCTED_DEMO_FORM)
  const built = buildDraft(form)
  assert.notEqual(built.draft, null, built.errors.join('\n'))

  const boundary = built.draft!.boundary
  assert.ok(boundary?.route === 'reconstructed')
  assert.equal(boundary.disambiguation?.kind, 'verified-sketch')
  assert.equal(boundary.disambiguation?.kind === 'verified-sketch'
    ? boundary.disambiguation.chosenAssemblyId
    : null, 'assembly-ud')

  const result = validateSitePlan(built.draft!, DEFAULT_KERNEL_PARAMETERS)
  assert.equal(
    result.ok,
    true,
    result.ok ? '' : result.blockers.map((finding) => `${finding.code}: ${finding.message}`).join('\n'),
  )
  if (!result.ok) return
  assert.ok(Math.abs(result.plan.plotArea.computedSqm - 200) <= 0.001)
  const model = buildDrawingModel(result.plan)
  const note = 'RECONSTRUCTED FROM SIDES/DIAGONAL - VERIFY SOURCE BEFORE SETTING OUT'
  assert.equal(model.boundaryProvenanceNote, note)
  assert.ok(model.texts.some((text) => text.id === 'boundary-provenance' && text.text === note))

  const artifact = exportSitePlan(result.plan, {
    expectedKernelVersion: DEFAULT_KERNEL_PARAMETERS.kernelVersion,
    profile: A3_LANDSCAPE,
  })
  assert.match(artifact.dxf, new RegExp(`URBANOS_BOUNDARY_PROVENANCE ${note}`))
  assert.match(new TextDecoder('latin1').decode(artifact.pdf), new RegExp(note))
  assert.equal(artifact.manifest.boundaryProvenanceNote, note)
  assert.equal(
    sectionReadiness(form, built.errors, result.warnings)
      .every((section) => section.complete),
    true,
  )
})

test('Feature 1 deed route rejects a stale or nonexistent assembly identifier', () => {
  const form = clone(RECONSTRUCTED_DEMO_FORM)
  form.reconstructionAssemblyId = 'assembly-does-not-exist'

  const built = buildDraft(form)
  assert.notEqual(built.draft, null, built.errors.join('\n'))
  const result = validateSitePlan(built.draft!, DEFAULT_KERNEL_PARAMETERS)

  assert.equal(result.ok, false)
  if (result.ok) return
  assert.ok(result.blockers.some((finding) => finding.code === 'E_RECONSTRUCTION_AMBIGUOUS'))
})

test('Feature 1 deed route cannot pretend reconstructed lengths are georeferenced coordinates', () => {
  const form = clone(RECONSTRUCTED_DEMO_FORM)
  form.isLocalFrame = false
  form.crsCode = 'EPSG:32643'

  const built = buildDraft(form)
  assert.equal(built.draft, null)
  assert.ok(
    built.errors.some((message) => message.includes('georeferencing requires surveyed corner coordinates')),
  )
})
