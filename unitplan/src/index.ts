// ---------------------------------------------------------------------------
// UrbanOS unit-plan module (Feature 2) — public surface.
// ---------------------------------------------------------------------------
export type * from './brief.ts'
export { UnitPlanError, type UnitPlanErrorCode, type UnitPlanFinding } from './errors.ts'
export { fi, toMetres, formatFeetInches, formatSize, METRES_PER_FOOT, type FeetInches } from './units.ts'
export { sha256 } from './hash.ts'
export {
  buildPrivyAt42BhkLayout,
  PRIVY_AT4_2BHK_ROOM_IDS,
  type PlacedRoom,
  type TemplateLayout,
} from './template.ts'
export {
  validateUnitPlan,
  auditLayoutGeometry,
  type LayoutSpaces,
  type ValidatedUnitPlan,
  type PlacedDoor,
  type PlacedWindow,
} from './validate.ts'
export { buildUnitDrawingModel, UNIT_LAYERS } from './drawing.ts'
export type * from './drawing.ts'
export { unitDrawingToDxf, asciiFold } from './dxf.ts'
export {
  unitDrawingToPdf,
  type UnitSheetProfile,
  type UnitPdfArtifact,
  type UnitPaperTransform,
} from './pdf.ts'
export { privyAt42BhkBrief } from './privy-at4.ts'
