// Package verification gate: re-reads artifact BYTES (never the in-memory
// models) and fails closed if any artifact lacks the DEMO filename token, the
// visible watermark, or the locked stamp. Used by buildCommunityPackage, by
// the generation tool (non-zero exit), and by the THD-05/06 mutations.

import { DEMO_STAMP, DEMO_STAMP_ASCII } from './rulebook.ts'
import { encodeWinAnsi } from './pdf.ts'

export interface VerifyFinding {
  readonly message: string
  /** artifact filename, plus the page for PDFs. */
  readonly detail: string
}

interface NamedBytes {
  readonly filename: string
  readonly bytes: Uint8Array
}

function latin1(bytes: Uint8Array): string {
  let output = ''
  const chunk = 0x8000
  for (let index = 0; index < bytes.length; index += chunk) {
    output += String.fromCharCode(...bytes.subarray(index, index + chunk))
  }
  return output
}

/** Extract every page's content stream from one of our uncompressed PDFs. */
export function pdfPageContents(raw: string): string[] {
  const objects = new Map<number, string>()
  const objectPattern = /(\d+) 0 obj\n([\s\S]*?)\nendobj\n/g
  let match: RegExpExecArray | null
  while ((match = objectPattern.exec(raw)) !== null) {
    objects.set(Number(match[1]), match[2]!)
  }
  const pages: string[] = []
  for (const body of objects.values()) {
    if (!body.includes('/Type /Page') || body.includes('/Type /Pages')) continue
    const contentsRef = /\/Contents (\d+) 0 R/.exec(body)
    if (!contentsRef) continue
    const contentObject = objects.get(Number(contentsRef[1]))
    if (contentObject === undefined) continue
    const stream = /stream\n([\s\S]*?)\nendstream/.exec(contentObject)
    pages.push(stream ? stream[1]! : '')
  }
  return pages
}

function escapedStamp(): string {
  return encodeWinAnsi(DEMO_STAMP).replace(/[\\()]/g, (character) => `\\${character}`)
}

function checkPdf(file: NamedBytes, findings: VerifyFinding[]): void {
  const raw = latin1(file.bytes)
  const pages = pdfPageContents(raw)
  if (pages.length === 0) {
    findings.push({ message: 'PDF has no parseable pages.', detail: file.filename })
    return
  }
  const stamp = escapedStamp()
  pages.forEach((content, index) => {
    const where = `${file.filename} page ${index + 1}`
    const watermarkAt = content.indexOf('% URBANOS_WATERMARK')
    if (watermarkAt < 0) {
      findings.push({ message: 'Page lacks the DEMO watermark block.', detail: where })
      return
    }
    const block = content.slice(watermarkAt, watermarkAt + 700)
    const sizeMatch = /\/F2 ([\d.]+) Tf/.exec(block)
    const fillMatch = /([\d.]+) ([\d.]+) ([\d.]+) rg/.exec(block)
    if (!block.includes('(DEMO) Tj')) {
      findings.push({ message: 'Watermark block does not draw the DEMO text.', detail: where })
    }
    if (!sizeMatch || Number(sizeMatch[1]) < 40) {
      findings.push({ message: 'DEMO watermark is missing or too small to be visible.', detail: where })
    }
    if (
      !fillMatch
      || Number(fillMatch[1]) > 0.9
      || Number(fillMatch[2]) > 0.9
      || Number(fillMatch[3]) > 0.9
    ) {
      findings.push({ message: 'DEMO watermark fill is white-on-white or missing.', detail: where })
    }
    if (!content.includes(`(${stamp}) Tj`)) {
      findings.push({ message: 'Page lacks the visible locked stamp.', detail: where })
    }
  })
}

function checkDxf(file: NamedBytes, findings: VerifyFinding[]): void {
  const raw = latin1(file.bytes)
  const lines = raw.split('\n')
  // Visible TEXT entities: group code 1 carries the string value.
  const textValues: string[] = []
  for (let index = 0; index < lines.length - 1; index += 1) {
    if (lines[index]!.trim() === '1') textValues.push(lines[index + 1]!)
  }
  if (!textValues.some((value) => value === DEMO_STAMP_ASCII)) {
    findings.push({
      message: 'DXF lacks a visible TEXT entity carrying the (ASCII-folded) locked stamp.',
      detail: file.filename,
    })
  }
  if (!textValues.some((value) => value.trim() === 'DEMO')) {
    findings.push({ message: 'DXF lacks a visible DEMO watermark TEXT entity.', detail: file.filename })
  }
  if (!raw.includes('URBANOS_CLASSIFICATION demo-illustrative')) {
    findings.push({ message: 'DXF lacks the structured demo classification.', detail: file.filename })
  }
}

function checkJson(file: NamedBytes, findings: VerifyFinding[]): void {
  let parsed: { classification?: unknown; stamp?: unknown }
  try {
    parsed = JSON.parse(new TextDecoder().decode(file.bytes)) as typeof parsed
  } catch {
    findings.push({ message: 'JSON artifact does not parse.', detail: file.filename })
    return
  }
  if (parsed.classification !== 'demo-illustrative') {
    findings.push({
      message: 'JSON artifact lacks structured demo classification (or claims production).',
      detail: file.filename,
    })
  }
  if (parsed.stamp !== DEMO_STAMP) {
    findings.push({ message: 'JSON artifact lacks the locked stamp.', detail: file.filename })
  }
}

export function verifyDemoPackage(files: readonly NamedBytes[]): VerifyFinding[] {
  const findings: VerifyFinding[] = []
  if (files.length === 0) {
    return [{ message: 'No artifacts supplied to the verify gate.', detail: '(package)' }]
  }
  for (const file of files) {
    const tokens = file.filename.split(/[^A-Za-z0-9]+/)
    if (!tokens.includes('DEMO')) {
      findings.push({
        message: 'Artifact basename lacks an uppercase DEMO token.',
        detail: file.filename,
      })
    }
    if (file.bytes.length === 0) {
      findings.push({ message: 'Artifact is empty.', detail: file.filename })
      continue
    }
    if (file.filename.endsWith('.pdf')) checkPdf(file, findings)
    else if (file.filename.endsWith('.dxf')) checkDxf(file, findings)
    else if (file.filename.endsWith('.json')) checkJson(file, findings)
    else findings.push({ message: 'Unknown artifact type.', detail: file.filename })
  }
  return findings
}
