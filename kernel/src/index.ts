// ---------------------------------------------------------------------------
// UrbanOS geometry kernel — public surface.
//
// Implemented against Sol's acceptance harness (38 fixtures + 3 guardrails).
// KERNEL_BRAND is deliberately NOT re-exported here (see brand.ts).
// ---------------------------------------------------------------------------

export type * from './contract.ts'
export { KernelError } from './errors.ts'
export { sha256 } from './hash.ts'
export { DEFAULT_KERNEL_PARAMETERS } from './params.ts'
export { resolveSitePlan } from './resolve.ts'
export { validateSitePlan, assertExportable, verifyDimensionIntegrity } from './validate.ts'
export { buildDrawingModel, DRAWING_LAYERS } from './drawing.ts'
export { drawingToDxf, asciiFold } from './dxf.ts'
export { drawingToPdf } from './pdf.ts'
export { exportSitePlan } from './export.ts'
export type * from './drawing.ts'
export type * from './pdf.ts'
export type * from './export.ts'
