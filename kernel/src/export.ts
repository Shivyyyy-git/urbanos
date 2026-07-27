// ---------------------------------------------------------------------------
// Canonical export coordinator.
//
// One branded ValidatedSitePlan -> one DrawingModel -> DXF + PDF + parity
// manifest. No exporter can read the draft or regenerate geometry.
// ---------------------------------------------------------------------------
import { KERNEL_BRAND } from './brand.ts'
import type { ValidatedSitePlan, ValidationDigest } from './contract.ts'
import {
  buildDrawingModel,
  type DrawingLayer,
  type DrawingModel,
  type DrawingPoint,
} from './drawing.ts'
import { drawingToDxf } from './dxf.ts'
import { KernelError } from './errors.ts'
import {
  drawingToPdf,
  type PaperTransform,
  type PdfExportProfile,
} from './pdf.ts'
import { assertExportable } from './validate.ts'

export interface ExportRequest {
  expectedKernelVersion: string
  profile: PdfExportProfile
}

export interface ParityManifestPath {
  id: string
  layer: DrawingLayer
  closed: boolean
  critical: boolean
  pointsM: readonly DrawingPoint[]
  sourceIds: readonly string[]
}

export interface ExportParityManifest {
  schemaVersion: 'urbanos-export-parity-v1'
  coordinateUnit: 'm'
  declaredScaleDenominator: number
  sheet: PdfExportProfile['sheet']
  frame: PdfExportProfile['frame']
  paperToleranceMm: number
  paperTransform: PaperTransform
  reviewStatus: DrawingModel['reviewStatus']
  boundaryProvenanceNote: string | null
  validation: {
    digest: string
    kernelVersion: string
    specRevision: string
  }
  paths: readonly ParityManifestPath[]
}

export interface SitePlanExport {
  dxf: string
  pdf: Uint8Array
  manifest: ExportParityManifest
}

function validationDigest(plan: ValidatedSitePlan): ValidationDigest {
  return Reflect.get(plan, KERNEL_BRAND) as ValidationDigest
}

export function exportSitePlan(
  plan: ValidatedSitePlan,
  request: ExportRequest,
): SitePlanExport {
  assertExportable(plan, request.expectedKernelVersion)
  if (plan.drawing.sheetRef === null || plan.drawing.sheetRef !== request.profile.sheet.ref) {
    throw new KernelError({
      code: 'E_EXPORT_PARITY',
      message:
        'The explicit sheet definition does not match the sheet reference validated with the plan.',
      observed: `plan=${String(plan.drawing.sheetRef)}, export=${request.profile.sheet.ref}`,
      required: 'matching non-null sheetRef',
    })
  }

  const model = buildDrawingModel(plan)
  const dxf = drawingToDxf(model)
  const pdfArtifact = drawingToPdf(model, request.profile)
  const digest = validationDigest(plan)

  return {
    dxf,
    pdf: pdfArtifact.bytes,
    manifest: {
      schemaVersion: 'urbanos-export-parity-v1',
      coordinateUnit: 'm',
      declaredScaleDenominator: model.scaleDenominator,
      sheet: { ...request.profile.sheet },
      frame: { ...request.profile.frame },
      paperToleranceMm: request.profile.paperToleranceMm,
      paperTransform: { ...pdfArtifact.transform },
      reviewStatus: model.reviewStatus,
      boundaryProvenanceNote: model.boundaryProvenanceNote,
      validation: {
        digest: digest.digest,
        kernelVersion: digest.kernelVersion,
        specRevision: digest.specRevision,
      },
      paths: model.paths.map((path) => ({
        id: path.id,
        layer: path.layer,
        closed: path.closed,
        critical: path.critical,
        pointsM: path.points.map((point): DrawingPoint => [point[0], point[1]]),
        sourceIds: [...path.sourceIds],
      })),
    },
  }
}
