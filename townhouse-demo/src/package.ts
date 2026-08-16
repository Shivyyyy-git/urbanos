// buildCommunityPackage: fixture + resolved slice in, full DEMO package out,
// zero manual steps. Deterministic: same fixture + same rulebook digest =>
// byte-identical artifacts. The request contract has no stamp/status field —
// the stamp is computed (resolve.ts) and locked.

import { buildDrawingModels } from './drawing.ts'
import { communityDrawingToDxf, dxfBytes } from './dxf.ts'
import { fail } from './errors.ts'
import type { DemoSiteFixture } from './fixture.ts'
import { rectRing } from './geom.ts'
import { sha256 } from './hash.ts'
import { buildCommunityLayout, type CommunityLayout } from './layout.ts'
import { communityDrawingToPdf, reportToPdf } from './pdf.ts'
import { buildEnvelopeReport, type CommunityEnvelopeReport } from './report.ts'
import type { ResolvedDemoRulebook } from './rulebook.ts'
import { buildPreviewHtml } from './svg.ts'
import { verifyDemoPackage } from './verify.ts'

export interface DemoArtifact {
  /** Contains an uppercase DEMO token (enforced by the verify gate). */
  readonly filename: string
  readonly bytes: Uint8Array
}

export type DemoArtifactRole =
  | 'technical-sheet-dxf'
  | 'technical-sheet-pdf'
  | 'presentation-map-pdf'
  | 'envelope-report-pdf'
  | 'envelope-report-json'
  | 'parity-manifest-json'

export interface CommunityPackage {
  readonly artifacts: readonly DemoArtifact[]
  readonly roles: Readonly<Record<DemoArtifactRole, string>>
  readonly report: CommunityEnvelopeReport
  readonly layout: CommunityLayout
  readonly fixtureDigest: string
  readonly rulebookDigest: string
  readonly geometryDigest: string
  /**
   * Self-contained one-click preview page (ledger 036) rendered from the same
   * presentation model as the PDF. The generate tool writes it to
   * `townhouse-demo/preview.DEMO.html` on every build.
   */
  readonly previewHtml: string
}

export function computeFixtureDigest(site: DemoSiteFixture): string {
  return sha256(
    JSON.stringify({
      name: site.name,
      label: site.label,
      widthM: site.widthM,
      depthM: site.depthM,
      northBearingDeg: site.northBearingDeg,
      accessRoad: { edge: site.accessRoad.edge, widthM: site.accessRoad.widthM },
      requestedDwellingUnits: site.requestedDwellingUnits,
    }),
  )
}

function textBytes(text: string): Uint8Array {
  return new TextEncoder().encode(text)
}

export function buildCommunityPackage(
  site: DemoSiteFixture,
  rulebook: ResolvedDemoRulebook,
): CommunityPackage {
  const fixtureDigest = computeFixtureDigest(site)
  const layout = buildCommunityLayout(site, rulebook)
  const report = buildEnvelopeReport(site, rulebook, layout, fixtureDigest)
  const models = buildDrawingModels(site, rulebook, layout, report)

  const sliceTag = rulebook.slice.replace(/^DEMO-/, '').toLowerCase()
  const base = `community-one-DEMO-${sliceTag}`
  const roles: Record<DemoArtifactRole, string> = {
    'technical-sheet-dxf': `${base}-technical-sheet.dxf`,
    'technical-sheet-pdf': `${base}-technical-sheet.pdf`,
    'presentation-map-pdf': `${base}-presentation-map.pdf`,
    'envelope-report-pdf': `${base}-envelope-report.pdf`,
    'envelope-report-json': `${base}-envelope-report.json`,
    'parity-manifest-json': `${base}-parity-manifest.json`,
  }

  const manifest = {
    kind: 'parity-manifest',
    classification: 'demo-illustrative',
    stamp: report.stamp,
    actionability: report.actionability,
    slice: rulebook.slice,
    fixtureDigest,
    rulebookDigest: rulebook.digest,
    geometryDigest: layout.geometryDigest,
    roles,
    features: layout.features.map((feature) => ({
      id: feature.id,
      featureClass: feature.featureClass,
      ring: rectRing(feature.rect),
    })),
    note:
      'Digests corroborate parity but never replace it: the acceptance oracle measures vector paths in every artifact independently.',
  }

  const artifacts: readonly DemoArtifact[] = [
    { filename: roles['technical-sheet-dxf'], bytes: dxfBytes(communityDrawingToDxf(models.technical)) },
    { filename: roles['technical-sheet-pdf'], bytes: communityDrawingToPdf(models.technical) },
    { filename: roles['presentation-map-pdf'], bytes: communityDrawingToPdf(models.presentation) },
    { filename: roles['envelope-report-pdf'], bytes: reportToPdf(report) },
    { filename: roles['envelope-report-json'], bytes: textBytes(`${JSON.stringify(report, null, 2)}\n`) },
    { filename: roles['parity-manifest-json'], bytes: textBytes(`${JSON.stringify(manifest, null, 2)}\n`) },
  ]

  // The package never ships unverified: the same gate the build tool runs on
  // disk is applied to the in-memory artifacts, fail-closed.
  const findings = verifyDemoPackage(artifacts)
  if (findings.length > 0) {
    const first = findings[0]!
    fail('E_DEMO_WATERMARK_MISSING', first.message, first.detail)
  }

  return {
    artifacts,
    roles,
    report,
    layout,
    fixtureDigest,
    rulebookDigest: rulebook.digest,
    geometryDigest: layout.geometryDigest,
    previewHtml: buildPreviewHtml(report, models.presentation),
  }
}
