// ---------------------------------------------------------------------------
// Deterministic one-page vector PDF writer for unit plans. Adapted from the
// site kernel's writer (kernel/src/pdf.ts). One declared 1:N transform; the
// writer never rescales — a sheet that does not fit fails E_EXPORT_PARITY.
// ---------------------------------------------------------------------------
import { UnitPlanError } from './errors.ts'
import {
  UNIT_LAYERS,
  type UnitDrawingModel,
  type UnitDrawingPath,
  type UnitDrawingText,
  type UnitLayer,
  type UnitLayerStyle,
} from './drawing.ts'
import type { Point } from './geom.ts'
import { asciiFold } from './dxf.ts'

const POINTS_PER_MM = 72 / 25.4
const CAP_HEIGHT_RATIO = 0.717

export interface UnitSheetProfile {
  sheet: { ref: string; widthMm: number; heightMm: number }
  frame: {
    leftMm: number
    rightMm: number
    topMm: number
    bottomMm: number
    titleBlockHeightMm: number
  }
  paperToleranceMm: number
}

export interface UnitPaperTransform {
  scaleDenominator: number
  pointsPerModelMetre: number
  originXPoints: number
  originYPoints: number
  modelMinX: number
  modelMinY: number
  drawingWidthMm: number
  drawingHeightMm: number
}

export interface UnitPdfArtifact {
  bytes: Uint8Array
  transform: UnitPaperTransform
}

function parityError(message: string, observed?: string, required?: string): never {
  throw new UnitPlanError({
    code: 'E_EXPORT_PARITY',
    message,
    ...(observed === undefined ? {} : { observed }),
    ...(required === undefined ? {} : { required }),
  })
}

function number(value: number): string {
  if (!Number.isFinite(value)) {
    parityError('PDF writer received a non-finite coordinate.', String(value), 'finite number')
  }
  const rounded = Math.abs(value) < 0.0000005 ? 0 : Math.round(value * 1_000_000) / 1_000_000
  return rounded.toFixed(6)
}

function pdfString(value: string): string {
  return value.replace(/[\\()]/g, (character) => `\\${character}`)
}

function validateProfile(model: UnitDrawingModel, profile: UnitSheetProfile): UnitPaperTransform {
  const availableWidthMm = profile.sheet.widthMm - profile.frame.leftMm - profile.frame.rightMm
  const availableHeightMm = profile.sheet.heightMm
    - profile.frame.topMm
    - profile.frame.bottomMm
    - profile.frame.titleBlockHeightMm
  if (!(availableWidthMm > 0) || !(availableHeightMm > 0)) {
    parityError('Sheet frame leaves no positive drawing area.')
  }
  const modelWidthM = model.bounds.maxX - model.bounds.minX
  const modelHeightM = model.bounds.maxY - model.bounds.minY
  const drawingWidthMm = (modelWidthM * 1000) / model.scaleDenominator
  const drawingHeightMm = (modelHeightM * 1000) / model.scaleDenominator
  if (
    drawingWidthMm > availableWidthMm + profile.paperToleranceMm
    || drawingHeightMm > availableHeightMm + profile.paperToleranceMm
  ) {
    parityError(
      `${model.projectName || 'Drawing'} does not fit ${profile.sheet.ref} at the declared `
        + `1:${model.scaleDenominator} scale. The exporter did not rescale it.`,
      `${drawingWidthMm.toFixed(3)} mm x ${drawingHeightMm.toFixed(3)} mm`,
      `<= ${availableWidthMm.toFixed(3)} mm x ${availableHeightMm.toFixed(3)} mm`,
    )
  }
  const left = profile.frame.leftMm + (availableWidthMm - drawingWidthMm) / 2
  const bottom = profile.frame.bottomMm
    + profile.frame.titleBlockHeightMm
    + (availableHeightMm - drawingHeightMm) / 2
  const pointsPerModelMetre = (1000 / model.scaleDenominator) * POINTS_PER_MM
  return {
    scaleDenominator: model.scaleDenominator,
    pointsPerModelMetre,
    originXPoints: left * POINTS_PER_MM,
    originYPoints: bottom * POINTS_PER_MM,
    modelMinX: model.bounds.minX,
    modelMinY: model.bounds.minY,
    drawingWidthMm,
    drawingHeightMm,
  }
}

function rgb(layer: UnitLayerStyle): string {
  return `${number(layer.rgb[0])} ${number(layer.rgb[1])} ${number(layer.rgb[2])}`
}

function transformPoint(point: Point, transform: UnitPaperTransform): Point {
  return [
    transform.originXPoints + (point[0] - transform.modelMinX) * transform.pointsPerModelMetre,
    transform.originYPoints + (point[1] - transform.modelMinY) * transform.pointsPerModelMetre,
  ]
}

function pathOps(
  path: UnitDrawingPath,
  layer: UnitLayerStyle,
  transform: UnitPaperTransform,
): string[] {
  if (path.points.length < 2) return []
  const output = [
    `% URBANOS_PATH ${encodeURIComponent(path.id)}`,
    'q',
    `${number(Math.max(layer.lineWeightMm * POINTS_PER_MM, 0.24))} w`,
    `${rgb(layer)} RG`,
  ]
  if (layer.dashed) {
    output.push(`[${number(3 * POINTS_PER_MM)} ${number(1.8 * POINTS_PER_MM)}] 0 d`)
  }
  const first = transformPoint(path.points[0]!, transform)
  output.push(`${number(first[0])} ${number(first[1])} m`)
  for (let index = 1; index < path.points.length; index += 1) {
    const point = transformPoint(path.points[index]!, transform)
    output.push(`${number(point[0])} ${number(point[1])} l`)
  }
  if (path.closed) output.push('h')
  output.push('S', 'Q')
  return output
}

function textOps(
  text: UnitDrawingText,
  layer: UnitLayerStyle,
  transform: UnitPaperTransform,
): string[] {
  const label = asciiFold(text.text)
  if (label.length === 0) return []
  const at = transformPoint(text.at, transform)
  const fontSizePt = (text.heightMm * POINTS_PER_MM) / CAP_HEIGHT_RATIO
  const estimatedWidthPt = label.length * fontSizePt * 0.52
  const alignOffset = text.align === 'left'
    ? 0
    : text.align === 'center'
      ? -estimatedWidthPt / 2
      : -estimatedWidthPt
  const radians = (text.rotationDegrees * Math.PI) / 180
  const cos = Math.cos(radians)
  const sin = Math.sin(radians)
  return [
    `% URBANOS_TEXT ${encodeURIComponent(text.id)}`,
    'q',
    `${rgb(layer)} rg`,
    'BT',
    `${text.bold ? '/F2' : '/F1'} ${number(fontSizePt)} Tf`,
    `${number(cos)} ${number(sin)} ${number(-sin)} ${number(cos)} `
      + `${number(at[0] + alignOffset * cos)} ${number(at[1] + alignOffset * sin)} Tm`,
    `(${pdfString(label)}) Tj`,
    'ET',
    'Q',
  ]
}

function sheetFurniture(model: UnitDrawingModel, profile: UnitSheetProfile): string[] {
  const { sheet, frame } = profile
  const widthPt = sheet.widthMm * POINTS_PER_MM
  const heightPt = sheet.heightMm * POINTS_PER_MM
  const borderX = frame.leftMm * POINTS_PER_MM
  const borderY = frame.bottomMm * POINTS_PER_MM
  const borderWidth = (sheet.widthMm - frame.leftMm - frame.rightMm) * POINTS_PER_MM
  const borderHeight = (sheet.heightMm - frame.topMm - frame.bottomMm) * POINTS_PER_MM
  const titleHeight = frame.titleBlockHeightMm * POINTS_PER_MM
  const titleTop = borderY + titleHeight
  const titleLeft = borderX
  const pad = 3 * POINTS_PER_MM
  const statusSize = (3.0 * POINTS_PER_MM) / CAP_HEIGHT_RATIO
  const titleSize = (4.0 * POINTS_PER_MM) / CAP_HEIGHT_RATIO
  const bodySize = (2.3 * POINTS_PER_MM) / CAP_HEIGHT_RATIO
  const project = asciiFold(`${model.projectName} - ${model.unitLabel}`)
  const carpet = `CARPET AREA (SUM OF CLEAR ROOM AREAS): ${model.carpetAreaSqm.toFixed(3)} m2`
  const scale = `SCALE 1:${model.scaleDenominator} ON ${profile.sheet.ref}  |  UNITS: METRES  |  DATE: ${asciiFold(model.issueDate)}`
  const digest = `GEOMETRY DIGEST SHA-256: ${model.digest.slice(0, 32)}...`
  const lines: string[] = [
    carpet,
    scale,
    asciiFold(`SOURCE: ${model.sourceNote}`),
    ...model.assumptionNotes.map((note) => asciiFold(note)),
    'LAYOUT ARRANGEMENT IS AN URBANOS PARAMETRIC TEMPLATE (v0) - NOT A TRACE OF THE SOURCE PLAN',
    'OPENINGS ARE SYMBOLIC IN v0; ORIENTATION ASSUMED (NORTH = SHEET TOP)',
    digest,
  ]
  const ops = [
    '% URBANOS_SHEET_FURNITURE',
    'q',
    `${number(0.35 * POINTS_PER_MM)} w`,
    '0.08 0.08 0.08 RG',
    `${number(borderX)} ${number(borderY)} ${number(borderWidth)} ${number(borderHeight)} re S`,
    `${number(titleLeft)} ${number(titleTop)} m`,
    `${number(titleLeft + borderWidth)} ${number(titleTop)} l`,
    'S',
    'Q',
    'q',
    '0.04 0.04 0.04 rg',
    'BT',
    `/F2 ${number(titleSize)} Tf`,
    `1 0 0 1 ${number(titleLeft + pad)} ${number(titleTop - pad - titleSize)} Tm`,
    `(${pdfString(project)}) Tj`,
    `/F1 ${number(bodySize)} Tf`,
  ]
  let cursorY = titleTop - pad - titleSize - 7 * POINTS_PER_MM
  for (const line of lines) {
    ops.push(
      `1 0 0 1 ${number(titleLeft + pad)} ${number(cursorY)} Tm`,
      `(${pdfString(line)}) Tj`,
    )
    cursorY -= 4.6 * POINTS_PER_MM
  }
  ops.push(
    `/F2 ${number(statusSize)} Tf`,
    `1 0 0 1 ${number(titleLeft + pad)} ${number(borderY + pad)} Tm`,
    `(${pdfString(model.reviewStatus)}) Tj`,
    `1 0 0 1 ${number(titleLeft + borderWidth - pad - 90 * POINTS_PER_MM)} ${number(borderY + pad)} Tm`,
    `(${pdfString(model.reviewStatus)}) Tj`,
    'ET',
    'Q',
    `% URBANOS_MEDIABOX ${number(widthPt)} ${number(heightPt)}`,
  )
  return ops
}

function buildPdf(
  model: UnitDrawingModel,
  profile: UnitSheetProfile,
  content: string,
): Uint8Array {
  const widthPt = profile.sheet.widthMm * POINTS_PER_MM
  const heightPt = profile.sheet.heightMm * POINTS_PER_MM
  const title = asciiFold(`${model.projectName} - ${model.unitLabel}`)
  const subject = asciiFold(
    [model.reviewStatus, `1:${model.scaleDenominator}`, profile.sheet.ref].join('; '),
  )
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${number(widthPt)} ${number(heightPt)}] `
      + '/Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
    `<< /Title (${pdfString(title)}) /Subject (${pdfString(subject)}) `
      + '/Creator (UrbanOS) /Producer (UrbanOS unit-plan exporter) >>',
  ]
  let pdf = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n'
  const offsets: number[] = []
  for (let index = 0; index < objects.length; index += 1) {
    offsets.push(pdf.length)
    pdf += `${index + 1} 0 obj\n${objects[index]}\nendobj\n`
  }
  const xrefOffset = pdf.length
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  for (const offset of offsets) {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`
  }
  pdf += (
    `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info 7 0 R >>\n`
    + `startxref\n${xrefOffset}\n%%EOF\n`
  )
  const bytes = new Uint8Array(pdf.length)
  for (let index = 0; index < pdf.length; index += 1) {
    bytes[index] = pdf.charCodeAt(index) & 0xff
  }
  return bytes
}

export function unitDrawingToPdf(
  model: UnitDrawingModel,
  profile: UnitSheetProfile,
): UnitPdfArtifact {
  const transform = validateProfile(model, profile)
  const byLayer = new Map<UnitLayer, UnitLayerStyle>(
    UNIT_LAYERS.map((layer) => [layer.name, layer]),
  )
  const operations: string[] = []
  operations.push(...sheetFurniture(model, profile))
  for (const path of model.paths) {
    const layer = byLayer.get(path.layer)
    if (layer === undefined) parityError(`Unknown drawing layer "${path.layer}".`)
    operations.push(...pathOps(path, layer, transform))
  }
  for (const text of model.texts) {
    const layer = byLayer.get(text.layer)
    if (layer === undefined) parityError(`Unknown drawing layer "${text.layer}".`)
    operations.push(...textOps(text, layer, transform))
  }
  const content = operations.join('\n')
  return { bytes: buildPdf(model, profile, content), transform }
}
