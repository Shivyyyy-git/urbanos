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
}

export const A2_SHEET: DemoSheetProfile = {
  ref: 'A2', widthMm: 594, heightMm: 420, marginMm: 12, titleBlockHeightMm: 60,
}

export function drawingTransform(
  model: DemoDrawingModel,
  profile: DemoSheetProfile,
): DemoPaperTransform {
  const availableWidthMm = profile.widthMm - 2 * profile.marginMm
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
  let cursorY = titleTop - pad - titleSize - 5.5 * POINTS_PER_MM
  for (const line of model.titleLines) {
    ops.push(`1 0 0 1 ${number(border + pad)} ${number(cursorY)} Tm`, `(${pdfString(line)}) Tj`)
    cursorY -= 4.2 * POINTS_PER_MM
  }
  // Both stamps sit in the title-block band (bottom-left and bottom-right),
  // clear of the drawing area and the top-right legend (ledger 041 §5).
  ops.push(
    `/F2 ${number(stampSize)} Tf`,
    `1 0 0 1 ${number(border + pad)} ${number(border + pad)} Tm`,
    `(${pdfString(model.stamp)}) Tj`,
    `1 0 0 1 ${number(border + innerW - pad - 110 * POINTS_PER_MM)} ${number(border + pad)} Tm`,
    `(${pdfString(model.stamp)}) Tj`,
    'ET',
    'Q',
  )
  return ops
}

function legendOps(model: DemoDrawingModel, profile: DemoSheetProfile): string[] {
  if (model.legend.length === 0) return []
  const swatchW = 8 * POINTS_PER_MM
  const swatchH = 4.2 * POINTS_PER_MM
  const rowH = 6.4 * POINTS_PER_MM
  const x = (profile.widthMm - profile.marginMm - 74) * POINTS_PER_MM
  let y = (profile.heightMm - profile.marginMm - 14) * POINTS_PER_MM
  const fontSize = (2.4 * POINTS_PER_MM) / CAP_HEIGHT_RATIO
  const ops = ['% URBANOS_LEGEND', 'q']
  const boxH = rowH * model.legend.length + 8 * POINTS_PER_MM
  ops.push(
    '1 1 1 rg', '0.2 0.2 0.2 RG', `${number(0.3 * POINTS_PER_MM)} w`,
    `${number(x - 4 * POINTS_PER_MM)} ${number(y - boxH + rowH)} ${number(70 * POINTS_PER_MM)} ${number(boxH)} re B`,
  )
  ops.push(
    '0.04 0.04 0.04 rg', 'BT', `/F2 ${number(fontSize)} Tf`,
    `1 0 0 1 ${number(x)} ${number(y)} Tm`, '(LEGEND) Tj', 'ET',
  )
  y -= rowH
  for (const item of model.legend) {
    const style = layerStyle(item.layer)
    const fill = style.fill ?? style.stroke
    ops.push(
      `${number(fill[0])} ${number(fill[1])} ${number(fill[2])} rg`,
      `${number(style.stroke[0])} ${number(style.stroke[1])} ${number(style.stroke[2])} RG`,
      `${number(x)} ${number(y - swatchH * 0.2)} ${number(swatchW)} ${number(swatchH)} re B`,
      '0.04 0.04 0.04 rg', 'BT', `/F1 ${number(fontSize)} Tf`,
      `1 0 0 1 ${number(x + swatchW + 3 * POINTS_PER_MM)} ${number(y)} Tm`,
      `(${pdfString(item.label)}) Tj`, 'ET',
    )
    y -= rowH
  }
  ops.push('Q')
  return ops
}

export function communityDrawingToPdf(model: DemoDrawingModel): Uint8Array {
  const profile = A2_SHEET
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
  // Watermark last (cannot be occluded) but moderate and translucent so it
  // never dominates or hides planning geometry (ledger 041 §5).
  ops.push(...watermarkOps(profile.widthMm, profile.heightMm, model.stamp, 34))
  ops.push(...legendOps(model, profile))
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
  open()
  bold('DERIVED ENVELOPE (EVERY NUMBER CITES ITS FEEDERS)')
  for (const fact of report.facts.filter((candidate) => candidate.kind === 'derived')) {
    open()
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
  for (const line of wrap(`binding: ${report.verdict.bindingDescription} (${report.verdict.bindingEntryIds.join(', ')})`, 96)) {
    plain(line)
  }
  for (const line of wrap(report.verdict.narrative, 96)) plain(line)
  plain('')
  open()
  bold('CITATION SNAPSHOT (SELF-CONTAINED — VALID WITHOUT THE RULEBOOK FILES)')
  for (const citation of report.citations) {
    open()
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
  const lineSpacingMm = 3.9
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
