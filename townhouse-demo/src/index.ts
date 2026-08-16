// ---------------------------------------------------------------------------
// UrbanOS townhouse demo "Community One" — public surface.
// Tests import this file only, never an internal module (kernel discipline).
// ---------------------------------------------------------------------------
export {
  TownhouseDemoError,
  type TownhouseDemoErrorCode,
  type TownhouseDemoFinding,
} from './errors.ts'
export {
  DEMO_AUTHORITY,
  DEMO_FILENAME_TAG,
  DEMO_STAMP,
  REQUIRED_DEMO_SLOTS,
  SLOT_UNITS,
  SQUARE_METRES_PER_ACRE,
  type DemoApplicability,
  type DemoRuleEntry,
  type DemoRuleSlot,
  type DemoRuleSource,
  type DemoRuleUnit,
  type DemoRuleVersion,
  type DemoVerification,
  type ResolvedDemoRulebook,
} from './rulebook.ts'
export { FIXTURE_FIELD_IDS, type DemoSiteFixture, type FixtureFieldId } from './fixture.ts'
export {
  DEMO_ACTIONABILITY_REASON,
  computeDemoActionability,
  computeDemoStamp,
  resolveDemoRulebook,
  type DemoActionability,
} from './resolve.ts'
export {
  buildCommunityLayout,
  validateSiteFixture,
  featureRing,
  type CommunityFeature,
  type CommunityLayout,
  type CommunityMeasures,
  type FeatureClass,
} from './layout.ts'
export {
  buildEnvelopeReport,
  type CitationSnapshotRow,
  type CommunityEnvelopeReport,
  type CommunityVerdict,
  type FactKind,
  type ReportFact,
} from './report.ts'
export {
  DEMO_LAYERS,
  LAYER_BY_CLASS,
  buildDrawingModels,
  type DemoDrawingModel,
  type DemoDrawingPath,
  type DemoDrawingText,
  type DemoLayer,
  type DemoLayerStyle,
} from './drawing.ts'
export { communityDrawingToDxf, dxfBytes, dxfText } from './dxf.ts'
export {
  A2_SHEET,
  communityDrawingToPdf,
  drawingTransform,
  encodeWinAnsi,
  reportToPdf,
  type DemoPaperTransform,
  type DemoSheetProfile,
} from './pdf.ts'
export {
  buildCommunityPackage,
  computeFixtureDigest,
  type CommunityPackage,
  type DemoArtifact,
  type DemoArtifactRole,
} from './package.ts'
export {
  decodeCp1252,
  pdfPageContents,
  verifyDemoPackage,
  verifyDemoPreview,
  type VerifyFinding,
} from './verify.ts'
export { buildPreviewHtml, communityDrawingToSvg } from './svg.ts'
export { sha256 } from './hash.ts'
export { rectRing, roundM, type Point, type Rect } from './geom.ts'
export { communityOneSite } from './data/community-one-site.ts'
export { demoSliceA } from './data/demo-slice-a.ts'
export { demoSliceB } from './data/demo-slice-b.ts'
