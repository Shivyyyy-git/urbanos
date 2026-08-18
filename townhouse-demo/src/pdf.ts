// Deterministic vector PDF writer for the demo package. Adapted from the
// unit-plan writer, generalised to multiple pages, filled polygons (the
// presentation map) and text pages (the envelope report). No timestamps, no
// randomness, no compression: every byte is a function of the inputs, and the
// acceptance harness parses the uncompressed content streams directly.
//
// Every page carries the DEMO watermark block (marked `% URBANOS_WATERMARK`)
// and the visible locked stamp. The watermark is deliberately large, grey and
// rotated — never white, hidden, or zero-size.

import {
  DEMO_LAYERS,
  type DemoDrawingModel,
  type DemoDrawingPath,
  type DemoDrawingText,
  type DemoLayer,
  type DemoLayerStyle,
} from './drawing.ts'
import { fail } from './errors.ts'
import type { Point } from './geom.ts'
import type { CommunityEnvelopeReport, ReportFact } from './report.ts'

const POINTS_PER_MM = 72 / 25.4
const CAP_HEIGHT_RATIO = 0.717

export interface DemoPaperTransform {
  readonly scaleDenominator: number
  readonly pointsPerModelMetre: number
  readonly originXPoints: number
  readonly originYPoints: number
  readonly modelMinX: number
  readonly modelMinY: number
}

const WINANSI: Readonly<Record<string, number>> = {
  '—': 0x97, // — em dash
  '–': 0x96, // – en dash
  '·': 0xb7, // · middle dot
  '‘': 0x91,
  '’': 0x92,
  '“': 0x93,
  '”': 0x94,
  '…': 0x85, // …
  '°': 0xb0,
  '²': 0xb2,
}

export function encodeWinAnsi(value: string): string {
  let output = ''
  for (const character of value) {
    const code = character.codePointAt(0)!
    if (code < 0x80) output += character
    else if (WINANSI[character] !== undefined) output += String.fromCharCode(WINANSI[character]!)
    else if (code <= 0xff) output += character
    else output += '?'
  }
  return output
}

function pdfString(value: string): string {
  return encodeWinAnsi(value).replace(/[\\()]/g, (character) => `\\${character}`)
}

function number(value: number): string {
  if (!Number.isFinite(value)) {
    fail('E_GEOMETRY_PARITY', `PDF writer received a non-finite coordinate: ${String(value)}`)
  }
  const rounded = Math.abs(value) < 0.0000005 ? 0 : Math.round(value * 1_000_000) / 1_000_000
  return rounded.toFixed(6)
}

interface PdfPage {
  readonly widthMm: number
  readonly heightMm: number
  readonly content: string
}

/**
 * Document-information strings are PDFDocEncoding/UTF-16 — NOT WinAnsi. A
 * WinAnsi em dash (0x97) renders as 'Š' in viewers (ledger 041 §6), so any
 * non-ASCII metadata is emitted as UTF-16BE with BOM.
 */
function pdfInfoString(value: string): string {
  const escape = (raw: string): string => raw.replace(/[\\()]/g, (character) => `\\${character}`)
  if (/^[\x20-\x7e]*$/.test(value)) return `(${escape(value)})`
  let bytes = '\xFE\xFF'
  for (const character of value) {
    const code = character.codePointAt(0)!
    bytes += String.fromCharCode(code >> 8) + String.fromCharCode(code & 0xff)
  }
  return `(${escape(bytes)})`
}

function buildPdf(pages: readonly PdfPage[], title: string, subject: string): Uint8Array {
  const objects: string[] = []
  const pageObjectIds: number[] = []
  const objectCount = 2 + pages.length * 2 + 4
  const fontRegularId = objectCount - 3
  const fontBoldId = objectCount - 2
  const extGStateId = objectCount - 1
  const infoId = objectCount

  objects.push('<< /Type /Catalog /Pages 2 0 R >>')
  for (let index = 0; index < pages.length; index += 1) {
    pageObjectIds.push(3 + index * 2)
  }
  objects.push(
    `<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pages.length} >>`,
  )
  pages.forEach((page, index) => {
    const pageId = pageObjectIds[index]!
    const widthPt = page.widthMm * POINTS_PER_MM
    const heightPt = page.heightMm * POINTS_PER_MM
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${number(widthPt)} ${number(heightPt)}] `
        + `/Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R >> `
        + `/ExtGState << /GS0 ${extGStateId} 0 R >> >> /Contents ${pageId + 1} 0 R >>`,
    )
    objects.push(`<< /Length ${page.content.length} >>\nstream\n${page.content}\nendstream`)
  })
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>')
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>')
  objects.push('<< /Type /ExtGState /ca 0.34 /CA 0.34 >>')
  objects.push(
    `<< /Title ${pdfInfoString(title)} /Subject ${pdfInfoString(subject)} `
      + '/Creator (UrbanOS) /Producer (UrbanOS townhouse-demo exporter) >>',
  )

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
    `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info ${infoId} 0 R >>\n`
    + `startxref\n${xrefOffset}\n%%EOF\n`
  )
  const bytes = new Uint8Array(pdf.length)
  for (let index = 0; index < pdf.length; index += 1) {
    bytes[index] = pdf.charCodeAt(index) & 0xff
  }
  return bytes
}

function watermarkOps(widthMm: number, heightMm: number, stamp: string, fontMm: number): string[] {
  const cx = (widthMm / 2) * POINTS_PER_MM
  const cy = (heightMm / 2) * POINTS_PER_MM
  const size = (fontMm * POINTS_PER_MM) / CAP_HEIGHT_RATIO
  const cos = Math.cos(Math.PI / 6)
  const sin = Math.sin(Math.PI / 6)
  const estimatedWidth = 4 * size * 0.6
  return [
    '% URBANOS_WATERMARK',
    'q',
    '/GS0 gs',
    '0.42 0.42 0.42 rg',
    'BT',
    `/F2 ${number(size)} Tf`,
    `${number(cos)} ${number(sin)} ${number(-sin)} ${number(cos)} `
      + `${number(cx - (estimatedWidth / 2) * cos)} ${number(cy - (estimatedWidth / 2) * sin)} Tm`,
    '(DEMO) Tj',
    'ET',
    'Q',
    '% URBANOS_WATERMARK_STAMP',
    'q',
    '0.45 0.45 0.45 rg',
    'BT',
    `/F2 ${number((2.6 * POINTS_PER_MM) / CAP_HEIGHT_RATIO)} Tf`,
    `1 0 0 1 ${number(6 * POINTS_PER_MM)} ${number((heightMm - 6) * POINTS_PER_MM)} Tm`,
    `(${pdfString(stamp)}) Tj`,
    'ET',
    'Q',
  ]
}

/**
 * Positioned drawing-sheet watermark: horizontal DEMO centred at a chosen
 * point (the east green polygon), plus the small top-left stamp line. Same
 * marker structure as watermarkOps so the gate's visibility checks apply.
 */
function watermarkAtOps(
  centreX: number,
  centreY: number,
  capHeightPt: number,
  stamp: string,
  pageHeightMm: number,
): string[] {
  const size = capHeightPt / CAP_HEIGHT_RATIO
  const estimatedWidth = 4 * size * 0.6
  return [
    '% URBANOS_WATERMARK',
    'q',
    '/GS0 gs',
    '0.42 0.42 0.42 rg',
    'BT',
    `/F2 ${number(size)} Tf`,
    `1 0 0 1 ${number(centreX - estimatedWidth / 2)} ${number(centreY - capHeightPt / 2)} Tm`,
    '(DEMO) Tj',
    'ET',
    'Q',
    '% URBANOS_WATERMARK_STAMP',
    'q',
    '0.45 0.45 0.45 rg',
    'BT',
    `/F2 ${number((2.6 * POINTS_PER_MM) / CAP_HEIGHT_RATIO)} Tf`,
    `1 0 0 1 ${number(6 * POINTS_PER_MM)} ${number((pageHeightMm - 6) * POINTS_PER_MM)} Tm`,
    `(${pdfString(stamp)}) Tj`,
    'ET',
    'Q',
  ]
}

function layerStyle(layer: DemoLayer): DemoLayerStyle {
  const style = DEMO_LAYERS.find((candidate) => candidate.name === layer)
  if (!style) fail('E_GEOMETRY_PARITY', `Unknown drawing layer "${layer}".`)
  return style
}

function transformPoint(point: Point, transform: DemoPaperTransform): Point {
  return [
    transform.originXPoints + (point[0] - transform.modelMinX) * transform.pointsPerModelMetre,
    transform.originYPoints + (point[1] - transform.modelMinY) * transform.pointsPerModelMetre,
  ]
}

function pathOps(
  path: DemoDrawingPath,
  transform: DemoPaperTransform,
  filled: boolean,
): string[] {
  if (path.points.length < 2) return []
  const style = layerStyle(path.layer)
  const useFill = filled && style.fill !== null && path.closed
  const ops = [
    `% URBANOS_PATH ${encodeURIComponent(path.id)}`,
    'q',
    `${number(Math.max(style.lineWeightMm * POINTS_PER_MM, 0.24))} w`,
    `${number(style.stroke[0])} ${number(style.stroke[1])} ${number(style.stroke[2])} RG`,
  ]
  if (useFill) {
    ops.push(`${number(style.fill![0])} ${number(style.fill![1])} ${number(style.fill![2])} rg`)
  }
  if (style.dashed) {
    ops.push(`[${number(3 * POINTS_PER_MM)} ${number(1.8 * POINTS_PER_MM)}] 0 d`)
  }
  const first = transformPoint(path.points[0]!, transform)
  ops.push(`${number(first[0])} ${number(first[1])} m`)
  for (let index = 1; index < path.points.length; index += 1) {
    const point = transformPoint(path.points[index]!, transform)
    ops.push(`${number(point[0])} ${number(point[1])} l`)
  }
  if (path.closed) ops.push('h')
  ops.push(useFill ? 'B' : 'S', 'Q')
  return ops
}

function textOps(text: DemoDrawingText, transform: DemoPaperTransform): string[] {
  const label = text.text
  if (label.length === 0) return []
  const style = layerStyle(text.layer)
  const at = transformPoint(text.at, transform)
  const fontSizePt = (text.heightMm * POINTS_PER_MM) / CAP_HEIGHT_RATIO
  const estimatedWidthPt = encodeWinAnsi(label).length * fontSizePt * 0.52
  const alignOffset = text.align === 'left' ? 0 : text.align === 'center' ? -estimatedWidthPt / 2 : -estimatedWidthPt
  const radians = (text.rotationDegrees * Math.PI) / 180
  const cos = Math.cos(radians)
  const sin = Math.sin(radians)
  return [
    `% URBANOS_TEXT ${encodeURIComponent(text.id)}`,
    'q',
    `${number(style.stroke[0])} ${number(style.stroke[1])} ${number(style.stroke[2])} rg`,
    'BT',
    `${text.bold ? '/F2' : '/F1'} ${number(fontSizePt)} Tf`,
    `${number(cos)} ${number(sin)} ${number(-sin)} ${number(cos)} `
      + `${number(at[0] + alignOffset * cos)} ${number(at[1] + alignOffset * sin)} Tm`,
    `(${pdfString(label)}) Tj`,
    'ET',
    'Q',
  ]
}

export interface DemoSheetProfile {
  readonly ref: string
  readonly widthMm: number
  readonly heightMm: number
  readonly marginMm: number
  readonly titleBlockHeightMm: number
  /** Reserved right-hand poster column (presentation sheet only). */
  readonly rightPanelMm?: number
}

export const A2_SHEET: DemoSheetProfile = {
  ref: 'A1', widthMm: 841, heightMm: 594, marginMm: 14, titleBlockHeightMm: 62,
}

export function drawingTransform(
  model: DemoDrawingModel,
  profile: DemoSheetProfile,
): DemoPaperTransform {
  const availableWidthMm = profile.widthMm - 2 * profile.marginMm - (profile.rightPanelMm ?? 0)
  const availableHeightMm = profile.heightMm - 2 * profile.marginMm - profile.titleBlockHeightMm
  const modelWidthM = model.bounds.maxX - model.bounds.minX
  const modelHeightM = model.bounds.maxY - model.bounds.minY
  const drawingWidthMm = (modelWidthM * 1000) / model.scaleDenominator
  const drawingHeightMm = (modelHeightM * 1000) / model.scaleDenominator
  if (drawingWidthMm > availableWidthMm + 0.25 || drawingHeightMm > availableHeightMm + 0.25) {
    fail(
      'E_GEOMETRY_PARITY',
      `${model.title} does not fit ${profile.ref} at 1:${model.scaleDenominator}; the exporter does not rescale.`,
      `${drawingWidthMm.toFixed(1)} x ${drawingHeightMm.toFixed(1)} mm > ${availableWidthMm.toFixed(1)} x ${availableHeightMm.toFixed(1)} mm`,
    )
  }
  const left = profile.marginMm + (availableWidthMm - drawingWidthMm) / 2
  const bottom = profile.marginMm + profile.titleBlockHeightMm + (availableHeightMm - drawingHeightMm) / 2
  return {
    scaleDenominator: model.scaleDenominator,
    pointsPerModelMetre: (1000 / model.scaleDenominator) * POINTS_PER_MM,
    originXPoints: left * POINTS_PER_MM,
    originYPoints: bottom * POINTS_PER_MM,
    modelMinX: model.bounds.minX,
    modelMinY: model.bounds.minY,
  }
}

function sheetFurniture(model: DemoDrawingModel, profile: DemoSheetProfile): string[] {
  const border = profile.marginMm * POINTS_PER_MM
  const widthPt = profile.widthMm * POINTS_PER_MM
  const heightPt = profile.heightMm * POINTS_PER_MM
  const innerW = widthPt - 2 * border
  const innerH = heightPt - 2 * border
  const titleTop = border + profile.titleBlockHeightMm * POINTS_PER_MM
  const pad = 4 * POINTS_PER_MM
  const titleSize = (4.2 * POINTS_PER_MM) / CAP_HEIGHT_RATIO
  const bodySize = (2.2 * POINTS_PER_MM) / CAP_HEIGHT_RATIO
  const stampSize = (3.0 * POINTS_PER_MM) / CAP_HEIGHT_RATIO
  const ops = [
    // Explicit paper: a poster must not rely on the viewer's backdrop.
    '% URBANOS_PAPER',
    'q',
    '0.988 0.984 0.972 rg',
    `0 0 ${number(widthPt)} ${number(heightPt)} re f`,
    'Q',
    '% URBANOS_SHEET_FURNITURE',
    'q',
    `${number(0.35 * POINTS_PER_MM)} w`,
    '0.08 0.08 0.08 RG',
    `${number(border)} ${number(border)} ${number(innerW)} ${number(innerH)} re S`,
    `${number(border)} ${number(titleTop)} m`,
    `${number(border + innerW)} ${number(titleTop)} l`,
    'S',
    'Q',
    'q',
    '0.04 0.04 0.04 rg',
    'BT',
    `/F2 ${number(titleSize)} Tf`,
    `1 0 0 1 ${number(border + pad)} ${number(titleTop - pad - titleSize)} Tm`,
    `(${pdfString(model.title)}) Tj`,
    `/F1 ${number(bodySize)} Tf`,
  ]
  const bodyLeading = model.kind === 'presentation' ? 4.6 : 4.2
  let cursorY = titleTop - pad - titleSize - 5.5 * POINTS_PER_MM
  for (const line of model.titleLines) {
    ops.push(`1 0 0 1 ${number(border + pad)} ${number(cursorY)} Tm`, `(${pdfString(line)}) Tj`)
    cursorY -= bodyLeading * POINTS_PER_MM
  }
  // Both stamps sit in the title-block band (bottom-left and bottom-right),
  // clear of the drawing area and the top-right legend (ledger 041 §5).
  ops.push(
    `/F2 ${number(stampSize)} Tf`,
    `1 0 0 1 ${number(border + pad)} ${number(border + pad)} Tm`,
    `(${pdfString(model.stamp)}) Tj`,
    `1 0 0 1 ${number(border + innerW - pad - 110 * POINTS_PER_MM)} ${number(border + pad)} Tm`,
    `(${pdfString(model.stamp)}) Tj`,
  )
  if (model.kind === 'presentation') {
    // One disciplined honesty line beside the stamp, not a competing block.
    ops.push(
      `/F1 ${number(bodySize)} Tf`,
      `1 0 0 1 ${number(border + pad + 118 * POINTS_PER_MM)} ${number(border + pad)} Tm`,
      `(${pdfString(model.footerLine)}) Tj`,
    )
  }
  ops.push('ET', 'Q')
  return ops
}

/**
 * Poster side panel (ledger 053 P1-6): project identity, hero numbers, the
 * legend, and ONE honesty line — the reader meets the project before the
 * provenance. Full provenance stays on the technical sheet and the report.
 */
function wrapPlain(text: string, width: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    if (current.length + word.length + 1 > width && current.length > 0) {
      lines.push(current)
      current = word
    } else current = current.length === 0 ? word : `${current} ${word}`
  }
  if (current.length > 0) lines.push(current)
  return lines
}

function posterPanelOps(model: DemoDrawingModel, profile: DemoSheetProfile): string[] {
  const panelW = profile.rightPanelMm ?? 0
  if (panelW <= 0) return []
  const left = (profile.widthMm - profile.marginMm - panelW + 6) * POINTS_PER_MM
  const width = (panelW - 12) * POINTS_PER_MM
  const top = (profile.heightMm - profile.marginMm - 12) * POINTS_PER_MM
  const mm = (value: number): number => value * POINTS_PER_MM
  const size = (heightMm: number): number => (heightMm * POINTS_PER_MM) / CAP_HEIGHT_RATIO
  const ops = ['% URBANOS_POSTER_PANEL', 'q']
  let y = top

  const line = (text: string, heightMm: number, bold: boolean, gapMm: number, grey = 0.08): void => {
    ops.push(
      `${number(grey)} ${number(grey)} ${number(grey)} rg`,
      'BT',
      `${bold ? '/F2' : '/F1'} ${number(size(heightMm))} Tf`,
      `1 0 0 1 ${number(left)} ${number(y)} Tm`,
      `(${pdfString(text)}) Tj`,
      'ET',
    )
    y -= mm(gapMm)
  }

  line('COMMUNITY ONE', 9, true, 11)
  line('TOWNHOUSE MASTERPLAN — DEMO', 3.2, false, 8)
  ops.push(
    '0.62 0.35 0.18 RG', `${number(mm(0.8))} w`,
    `${number(left)} ${number(y + mm(3))} m ${number(left + width)} ${number(y + mm(3))} l S`,
  )
  y -= mm(6)

  // Hero numbers, two per row.
  for (let index = 0; index < model.stats.length; index += 2) {
    const pair = model.stats.slice(index, index + 2)
    pair.forEach((stat, column) => {
      const x = left + column * (width / 2)
      ops.push(
        '0.42 0.4 0.36 rg', 'BT', `/F1 ${number(size(2.4))} Tf`,
        `1 0 0 1 ${number(x)} ${number(y)} Tm`, `(${pdfString(stat.label)}) Tj`, 'ET',
        '0.11 0.1 0.09 rg', 'BT', `/F2 ${number(size(5.4))} Tf`,
        `1 0 0 1 ${number(x)} ${number(y - mm(7))} Tm`, `(${pdfString(stat.value)}) Tj`, 'ET',
      )
    })
    y -= mm(15)
  }

  y -= mm(2)
  ops.push(
    '0.75 0.73 0.68 RG', `${number(mm(0.3))} w`,
    `${number(left)} ${number(y + mm(4))} m ${number(left + width)} ${number(y + mm(4))} l S`,
  )
  line('LEGEND', 3.4, true, 8)
  const swatchW = mm(9)
  const swatchH = mm(4.4)
  for (const item of model.legend) {
    const style = layerStyle(item.layer)
    const fill = style.fill ?? style.stroke
    ops.push(
      `${number(fill[0])} ${number(fill[1])} ${number(fill[2])} rg`,
      `${number(style.stroke[0])} ${number(style.stroke[1])} ${number(style.stroke[2])} RG`,
      `${number(mm(0.25))} w`,
      `${number(left)} ${number(y - swatchH * 0.25)} ${number(swatchW)} ${number(swatchH)} re B`,
      '0.1 0.1 0.1 rg', 'BT', `/F1 ${number(size(2.8))} Tf`,
      `1 0 0 1 ${number(left + swatchW + mm(4))} ${number(y)} Tm`,
      `(${pdfString(item.label)}) Tj`, 'ET',
    )
    y -= mm(6.6)
  }

  // Typical-plot inset: the SAME arrangement the plan draws — bays under the
  // house mass, dimensioned, with a caption derived from the active slice
  // (ledger 058 P0-2: the claim and the depiction must be one thing).
  y -= mm(4)
  line('TYPICAL TOWNHOUSE PLOT', 3.4, true, 7)
  const insetW = mm(34)
  const insetH = mm(50)
  const insetY = y - insetH
  const houseH = insetH * 0.72
  ops.push(
    // plot
    '0.9 0.81 0.62 rg', '0.55 0.42 0.24 RG', `${number(mm(0.3))} w`,
    `${number(left)} ${number(insetY)} ${number(insetW)} ${number(insetH)} re B`,
    // front garden to the lane
    '0.53 0.72 0.36 rg', '0.29 0.47 0.22 RG',
    `${number(left + mm(2))} ${number(insetY + mm(2))} ${number(insetW - mm(4))} ${number(insetH - houseH - mm(4))} re B`,
    // house mass
    '0.76 0.55 0.36 rg', '0.45 0.31 0.19 RG',
    `${number(left + mm(2))} ${number(insetY + insetH - houseH - mm(2))} ${number(insetW - mm(4))} ${number(houseH)} re B`,
  )
  // Stilt bays INSIDE the house outline (open ground floor).
  const bays = model.stiltBaysPerHome
  const bayBoxH = bays > 0 ? Math.min(mm(13), (houseH - mm(6)) / bays) : 0
  for (let bay = 0; bay < bays; bay += 1) {
    ops.push(
      '0.86 0.84 0.79 rg', '0.62 0.6 0.56 RG',
      `${number(left + mm(6))} ${number(insetY + insetH - houseH + mm(2) + bay * (bayBoxH + mm(1.5)))} `
        + `${number(insetW - mm(12))} ${number(bayBoxH)} re B`,
    )
  }
  ops.push(
    '0.1 0.1 0.1 rg', 'BT', `/F1 ${number(size(2.5))} Tf`,
    `1 0 0 1 ${number(left + insetW + mm(5))} ${number(insetY + insetH - mm(5))} Tm`,
    '(HOUSE \(G+n\)) Tj', 'ET',
    'BT', `/F2 ${number(size(2.7))} Tf`,
    `1 0 0 1 ${number(left + insetW + mm(5))} ${number(insetY + insetH - mm(13))} Tm`,
    `(${pdfString(bays > 0 ? `${bays} CAR SPACE${bays === 1 ? '' : 'S'} UNDER STILT` : 'NO ON-PLOT BAY DRAWN')}) Tj`, 'ET',
    'BT', `/F1 ${number(size(2.5))} Tf`,
    `1 0 0 1 ${number(left + insetW + mm(5))} ${number(insetY + mm(6))} Tm`,
    '(FRONT GARDEN TO LANE) Tj', 'ET',
  )
  y = insetY - mm(6)
  for (const captionLine of wrapPlain(model.insetCaption, 46)) {
    ops.push(
      '0.35 0.33 0.3 rg', 'BT', `/F1 ${number(size(2.5))} Tf`,
      `1 0 0 1 ${number(left)} ${number(y)} Tm`, `(${pdfString(captionLine)}) Tj`, 'ET',
    )
    y -= mm(4)
  }
  ops.push('Q')
  return ops
}

export function communityDrawingToPdf(model: DemoDrawingModel): Uint8Array {
  const profile: DemoSheetProfile = model.kind === 'presentation'
    ? { ...A2_SHEET, titleBlockHeightMm: 50, rightPanelMm: 210 }
    : A2_SHEET
  const transform = drawingTransform(model, profile)
  const filled = model.kind === 'presentation'
  const ops: string[] = []
  ops.push(...sheetFurniture(model, profile))
  for (const path of model.paths) ops.push(...pathOps(path, transform, filled))
  for (const text of model.texts) {
    // The model-space DEMO watermark text serves the DXF; PDF pages already
    // carry the page-level watermark block, so skip the duplicate here.
    if (text.id === 'anno.watermark-demo') continue
    ops.push(...textOps(text, transform))
  }
  // Watermark last (cannot be occluded), translucent, and positioned over
  // the east green polygon so it crosses no annotation, label, or club/pool
  // geometry (ledger 045 §4). Falls back to the page centre only if the
  // green feature is somehow absent.
  const greenEast = model.paths.find((path) => path.id === 'f.green-west')
  if (greenEast) {
    const xs = greenEast.points.map((point) => point[0])
    const ys = greenEast.points.map((point) => point[1])
    const centre = transformPoint(
      [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2],
      transform,
    )
    const bandHeightPt = (Math.max(...ys) - Math.min(...ys)) * transform.pointsPerModelMetre
    const capHeightPt = Math.min(Math.max(bandHeightPt * 0.55, 46), 80)
    ops.push(...watermarkAtOps(centre[0], centre[1], capHeightPt, model.stamp, profile.heightMm))
  } else {
    ops.push(...watermarkOps(profile.widthMm, profile.heightMm, model.stamp, 30))
  }
  // Neighbourhood naming, drawn in paper space over the plan.
  for (const label of model.placeLabels) {
    const at = transformPoint(label.at, transform)
    const fontSize = (3.6 * POINTS_PER_MM) / CAP_HEIGHT_RATIO
    const halfWidth = (label.text.length * fontSize * 0.52) / 2
    ops.push(
      '% URBANOS_PLACE_LABEL',
      'q',
      '0.16 0.15 0.13 rg',
      'BT',
      `/F2 ${number(fontSize)} Tf`,
      `1 0 0 1 ${number(at[0] - halfWidth)} ${number(at[1])} Tm`,
      `(${pdfString(label.text)}) Tj`,
      'ET',
      'Q',
    )
  }
  ops.push(...posterPanelOps(model, profile))
  return buildPdf(
    [{ widthMm: profile.widthMm, heightMm: profile.heightMm, content: ops.join('\n') }],
    model.title,
    `${model.stamp}; 1:${model.scaleDenominator}; ${profile.ref}`,
  )
}

// --- Envelope report PDF ----------------------------------------------------

const A4 = { widthMm: 210, heightMm: 297, marginMm: 15 }

function wrap(text: string, width: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    if (current.length + word.length + 1 > width && current.length > 0) {
      lines.push(current)
      current = word
    } else {
      current = current.length === 0 ? word : `${current} ${word}`
    }
  }
  if (current.length > 0) lines.push(current)
  return lines
}

function factValue(fact: ReportFact): string {
  return Number.isInteger(fact.value) ? String(fact.value) : fact.value.toFixed(3)
}

interface ReportLine {
  readonly text: string
  readonly bold: boolean
}

/**
 * The report body as atomic blocks: a block never splits across pages, so a
 * citation basis cannot orphan mid-sentence onto the next page (041 §6).
 */
function reportBlocks(report: CommunityEnvelopeReport): ReportLine[][] {
  const blocks: ReportLine[][] = []
  let lines: ReportLine[] = []
  const open = (): void => { lines = []; blocks.push(lines) }
  const plain = (text: string): void => { lines.push({ text, bold: false }) }
  const bold = (text: string): void => { lines.push({ text, bold: true }) }
  open()

  bold(report.title)
  plain(`Slice: ${report.slice}   Classification: ${report.classification}`)
  plain(`Stamp: ${report.stamp}`)
  plain(`Sanctionable today: ${report.actionability.sanctionableToday} (status beside the stamp, not a stamp)`)
  for (const line of wrap(`reason: ${report.actionability.reason}`, 96)) plain(`    ${line}`)
  plain('')
  open()
  bold('PINNED DIGESTS (SHA-256)')
  plain(`fixture:  ${report.fixtureDigest}`)
  plain(`rulebook: ${report.rulebookDigest}`)
  plain(`geometry: ${report.geometryDigest}`)
  plain('')
  open()
  bold('DECLARED FIXTURE INPUTS')
  for (const fact of report.facts.filter((candidate) => candidate.kind === 'fixture-input')) {
    plain(`${fact.name}: ${factValue(fact)} ${fact.unit} [${fact.id}] <- ${fact.fixtureRefs.join(', ')}`)
    if (fact.note) for (const line of wrap(`note: ${fact.note}`, 96)) plain(`    ${line}`)
  }
  plain('')
  open()
  bold('PERMITTED VALUES (DEMO RULE ENTRIES)')
  for (const fact of report.facts.filter((candidate) => candidate.kind === 'rule-value')) {
    plain(`${fact.name}: ${factValue(fact)} ${fact.unit} [${fact.id}] cites ${fact.ruleRefs.join(', ')}`)
  }
  plain('')
  // Section headings ride in the same block as their first row so a heading
  // can never orphan at a page bottom (045 §4).
  let firstDerived = true
  for (const fact of report.facts.filter((candidate) => candidate.kind === 'derived')) {
    open()
    if (firstDerived) {
      bold('DERIVED ENVELOPE (EVERY NUMBER CITES ITS FEEDERS)')
      firstDerived = false
    }
    plain(`${fact.name}: ${factValue(fact)} ${fact.unit} [${fact.id}]`)
    plain(`    from fixture: ${fact.fixtureRefs.join(', ') || '(none)'}`)
    for (const line of wrap(`cites: ${fact.ruleRefs.join(', ') || '(none — fixture-only derivation)'}`, 92)) {
      plain(`    ${line}`)
    }
    if (fact.note) for (const line of wrap(`note: ${fact.note}`, 92)) plain(`    ${line}`)
  }
  open()
  plain('')
  bold('VERDICT — REQUEST vs CEILING vs PLACED')
  plain(`requested [${report.verdict.requestedDuFactId}]  ceiling [${report.verdict.densityCeilingFactId}]`)
  plain(`placed [${report.verdict.placedDuFactId}]  shortfall [${report.verdict.shortfallFactId}]`)
  const bindingCitation = report.verdict.bindingEntryIds.length > 0
    ? ` (${report.verdict.bindingEntryIds.join(', ')})`
    : ' (no rule entry binds: the requested program is satisfied in full)'
  for (const line of wrap(`binding: ${report.verdict.bindingDescription}${bindingCitation}`, 96)) {
    plain(line)
  }
  for (const line of wrap(report.verdict.narrative, 96)) plain(line)
  plain('')
  let firstCitation = true
  for (const citation of report.citations) {
    open()
    if (firstCitation) {
      bold('CITATION SNAPSHOT (SELF-CONTAINED — VALID WITHOUT THE RULEBOOK FILES)')
      firstCitation = false
    }
    plain(`${citation.entryId}  slot=${citation.slot}  value=${citation.value} ${citation.unit}  version=${citation.versionId}`)
    plain(`    ${citation.classification} / ${citation.verification}  authority: ${citation.authority}`)
    for (const line of wrap(`source: ${citation.sourceDocumentRef}. basis: ${citation.basis}`, 92)) {
      plain(`    ${line}`)
    }
  }
  open()
  plain('')
  bold('NOTES')
  for (const note of report.notes) for (const line of wrap(note, 98)) plain(line)
  return blocks.filter((block) => block.length > 0)
}

export function reportToPdf(report: CommunityEnvelopeReport): Uint8Array {
  const blocks = reportBlocks(report)
  const bodyTop = A4.heightMm - A4.marginMm - 14
  const bodyBottom = A4.marginMm + 12
  const lineSpacingMm = 3.7
  const perPage = Math.floor((bodyTop - bodyBottom) / lineSpacingMm)
  // Block-atomic pagination: a block (one citation row, one derived fact)
  // never splits across a page boundary (041 §6). A lone section header is
  // pulled to the next page together with its first block.
  const chunks: ReportLine[][] = []
  let current: ReportLine[] = []
  for (const block of blocks) {
    if (current.length > 0 && current.length + block.length > perPage) {
      chunks.push(current)
      current = []
    }
    current.push(...block.slice(0, perPage))
  }
  if (current.length > 0) chunks.push(current)
  const fontSize = (2.15 * POINTS_PER_MM) / CAP_HEIGHT_RATIO
  const stampSize = (2.6 * POINTS_PER_MM) / CAP_HEIGHT_RATIO
  const pages: PdfPage[] = chunks.map((chunk, pageIndex) => {
    const ops: string[] = []
    ops.push(
      '% URBANOS_PAPER',
      'q',
      '1 1 1 rg',
      `0 0 ${number(A4.widthMm * POINTS_PER_MM)} ${number(A4.heightMm * POINTS_PER_MM)} re f`,
      'Q',
    )
    ops.push(...watermarkOps(A4.widthMm, A4.heightMm, report.stamp, 28))
    ops.push('% URBANOS_REPORT_BODY', 'q', '0.05 0.05 0.05 rg', 'BT')
    let y = bodyTop * POINTS_PER_MM
    for (const line of chunk) {
      ops.push(
        `${line.bold ? '/F2' : '/F1'} ${number(fontSize)} Tf`,
        `1 0 0 1 ${number(A4.marginMm * POINTS_PER_MM)} ${number(y)} Tm`,
        `(${pdfString(line.text)}) Tj`,
      )
      y -= lineSpacingMm * POINTS_PER_MM
    }
    ops.push('ET', 'Q')
    ops.push(
      '% URBANOS_REPORT_FOOTER',
      'q', '0.05 0.05 0.05 rg', 'BT',
      `/F2 ${number(stampSize)} Tf`,
      `1 0 0 1 ${number(A4.marginMm * POINTS_PER_MM)} ${number((A4.marginMm - 4) * POINTS_PER_MM)} Tm`,
      `(${pdfString(report.stamp)}) Tj`,
      `/F1 ${number(stampSize)} Tf`,
      `1 0 0 1 ${number((A4.widthMm - A4.marginMm - 22) * POINTS_PER_MM)} ${number((A4.marginMm - 4) * POINTS_PER_MM)} Tm`,
      `(page ${pageIndex + 1}/${chunks.length}) Tj`,
      'ET', 'Q',
    )
    return { widthMm: A4.widthMm, heightMm: A4.heightMm, content: ops.join('\n') }
  })
  return buildPdf(pages, report.title, `${report.stamp}; ${report.slice}`)
}
