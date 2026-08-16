// Package verification gate: re-reads artifact BYTES (never the in-memory
// models) and fails closed if any artifact lacks the DEMO filename token, the
// visible watermark, or the locked stamp. Used by buildCommunityPackage, by
// the generation tool (non-zero exit), and by the THD-05/06 mutations.

import { DEMO_STAMP } from './rulebook.ts'
import { DEMO_ACTIONABILITY_REASON } from './resolve.ts'
import { encodeWinAnsi } from './pdf.ts'

/** Collapse whitespace so wrapped text can be compared to the trusted object. */
function normalizeText(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

/** cp1252 -> string for the bytes our DXF/PDF writers use beyond latin1. */
const CP1252_REVERSE: Readonly<Record<number, string>> = {
  0x97: '—', 0x96: '–', 0x91: '‘', 0x92: '’', 0x93: '“', 0x94: '”', 0x85: '…',
}

export function decodeCp1252(value: string): string {
  let output = ''
  for (const character of value) {
    output += CP1252_REVERSE[character.charCodeAt(0)] ?? character
  }
  return output
}

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
  // THD-18 across every PDF surface (041 §3): the visible text must carry the
  // FULL computed actionability — status and verbatim reason — not just the
  // enum token. Wrapping is normalised away before comparison.
  const allText = normalizeText(
    pages
      .map((content) => {
        const strings: string[] = []
        const pattern = /\(((?:\\.|[^\\)])*)\) Tj/g
        let textMatch: RegExpExecArray | null
        while ((textMatch = pattern.exec(content)) !== null) {
          strings.push(decodeCp1252(textMatch[1]!.replace(/\\([\\()])/g, '$1')))
        }
        return strings.join(' ')
      })
      .join(' '),
  )
  if (!/sanctionable today: unknown/i.test(allText)) {
    findings.push({
      message: 'PDF lacks the visible actionability status (sanctionable-today: unknown).',
      detail: `${file.filename}: actionability`,
    })
  }
  if (!allText.includes(normalizeText(DEMO_ACTIONABILITY_REASON))) {
    findings.push({
      message: 'PDF does not carry the full computed actionability reason verbatim.',
      detail: `${file.filename}: actionability reason`,
    })
  }
}

function checkDxf(file: NamedBytes, findings: VerifyFinding[]): void {
  const raw = latin1(file.bytes)
  const lines = raw.split('\n')
  // Visible TEXT entities: group code 1 carries the string value, decoded
  // per the file's declared ANSI_1252 codepage.
  const textValues: string[] = []
  for (let index = 0; index < lines.length - 1; index += 1) {
    if (lines[index]!.trim() === '1') textValues.push(decodeCp1252(lines[index + 1]!))
  }
  if (!raw.includes('$DWGCODEPAGE')) {
    findings.push({ message: 'DXF does not declare its codepage.', detail: file.filename })
  }
  if (!textValues.some((value) => value === DEMO_STAMP)) {
    findings.push({
      message: 'DXF lacks a visible TEXT entity carrying the exact locked stamp.',
      detail: file.filename,
    })
  }
  if (!textValues.some((value) => value.trim() === 'DEMO')) {
    findings.push({ message: 'DXF lacks a visible DEMO watermark TEXT entity.', detail: file.filename })
  }
  if (!raw.includes('URBANOS_CLASSIFICATION demo-illustrative')) {
    findings.push({ message: 'DXF lacks the structured demo classification.', detail: file.filename })
  }
  const allText = normalizeText(textValues.join(' '))
  if (!/sanctionable today: unknown/i.test(allText)) {
    findings.push({
      message: 'DXF lacks the visible actionability status (sanctionable-today: unknown).',
      detail: `${file.filename}: actionability`,
    })
  }
  if (!allText.includes(normalizeText(DEMO_ACTIONABILITY_REASON))) {
    findings.push({
      message: 'DXF does not carry the full computed actionability reason verbatim.',
      detail: `${file.filename}: actionability reason`,
    })
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
  // The FULL computed object is gated, not just the enum token (041 §3): a
  // forged reason with an untouched status is exactly as disqualifying.
  const actionability = (parsed as {
    actionability?: { sanctionableToday?: unknown; reason?: unknown }
  }).actionability
  if (!actionability || actionability.sanctionableToday !== 'unknown') {
    findings.push({
      message:
        'JSON artifact lacks the computed DEMO actionability (sanctionable-today must be "unknown"; a DEMO slice can never claim yes).',
      detail: `${file.filename}: actionability`,
    })
  } else if (actionability.reason !== DEMO_ACTIONABILITY_REASON) {
    findings.push({
      message:
        'JSON actionability reason does not equal the one trusted computed object; a forged reason with an untouched status is refused.',
      detail: `${file.filename}: actionability reason`,
    })
  }
}

// ---------------------------------------------------------------------------
// Preview gate (THD-17): townhouse-demo/preview.DEMO.html must be current
// (digests + verdict facts match THIS package), self-contained, watermarked,
// stamped, and its inline SVG must measure against the package's canonical
// rings. Called by the generator's post-write gate and by
// `verify <dir> --with-preview`.
// ---------------------------------------------------------------------------

const PREVIEW_NAME = 'preview.DEMO.html'

interface PreviewReference {
  readonly fixtureDigest: string
  readonly rulebookDigest: string
  readonly geometryDigest: string
  readonly slice: string
  readonly facts: readonly { readonly id: string; readonly value: number }[]
  readonly features: readonly {
    readonly id: string
    readonly ring: readonly (readonly [number, number])[]
  }[]
}

function packageReference(files: readonly NamedBytes[]): PreviewReference | null {
  const manifestFile = files.find((file) => file.filename.endsWith('-parity-manifest.json'))
  const reportFile = files.find((file) => file.filename.endsWith('-envelope-report.json'))
  if (!manifestFile || !reportFile) return null
  try {
    const manifest = JSON.parse(new TextDecoder().decode(manifestFile.bytes)) as {
      fixtureDigest: string
      rulebookDigest: string
      geometryDigest: string
      slice: string
      features: PreviewReference['features']
    }
    const report = JSON.parse(new TextDecoder().decode(reportFile.bytes)) as {
      facts: PreviewReference['facts']
    }
    return { ...manifest, facts: report.facts }
  } catch {
    return null
  }
}

function ringBoundsOf(points: readonly (readonly [number, number])[]): {
  minX: number
  minY: number
  maxX: number
  maxY: number
} {
  const xs = points.map((point) => point[0])
  const ys = points.map((point) => point[1])
  return {
    minX: Math.min(...xs),
    minY: Math.min(...ys),
    maxX: Math.max(...xs),
    maxY: Math.max(...ys),
  }
}

export function verifyDemoPreview(
  previewBytes: Uint8Array | null,
  files: readonly NamedBytes[],
): VerifyFinding[] {
  const findings: VerifyFinding[] = []
  if (previewBytes === null || previewBytes.length === 0) {
    return [{ message: 'One-click preview is missing or empty.', detail: PREVIEW_NAME }]
  }
  const html = new TextDecoder().decode(previewBytes)
  const reference = packageReference(files)
  if (!reference) {
    return [{ message: 'Package lacks the manifest/report needed to verify the preview.', detail: PREVIEW_NAME }]
  }
  // Filename token (the alias name itself carries the DEMO token).
  if (!PREVIEW_NAME.split(/[^A-Za-z0-9]+/).includes('DEMO')) {
    findings.push({ message: 'Preview basename lacks the DEMO token.', detail: PREVIEW_NAME })
  }
  // Self-containment as an ALLOWLIST-level offline gate (041 §1): the page
  // is inline text + inline SVG only. ANY fetch-capable construct — element
  // (script/link/img/iframe/…), attribute (src/href/srcset/xlink:href), CSS
  // url()/@import, or meta refresh — fails, whether its target is remote,
  // relative, or missing. A relative `src` is exactly as disqualifying as an
  // https one: the page may not reference anything outside itself.
  const fetchCapable =
    /<\s*(script|link|img|iframe|frame|embed|object|video|audio|source|track|use|base|form|input|applet)\b|\b(src|href|srcset|xlink:href|data|poster|action|formaction)\s*=|url\s*\(|@import|http-equiv/i
  const fetchMatch = fetchCapable.exec(html)
  if (fetchMatch) {
    findings.push({
      message: `Preview is not self-contained: fetch-capable construct "${fetchMatch[0]}" found (allowlist is inline text + inline SVG only).`,
      detail: `${PREVIEW_NAME}: external dependency`,
    })
  }
  if (!html.includes(DEMO_STAMP)) {
    findings.push({ message: 'Preview lacks the exact locked stamp.', detail: `${PREVIEW_NAME}: stamp` })
  }
  if (!/>DEMO<\/text>/.test(html)) {
    findings.push({ message: 'Preview lacks the visible DEMO watermark.', detail: `${PREVIEW_NAME}: watermark` })
  }
  if (!html.includes('demo-illustrative')) {
    findings.push({ message: 'Preview lacks the demo classification.', detail: `${PREVIEW_NAME}: classification` })
  }
  if (!/Sanctionable today:<\/b> unknown/.test(html)) {
    findings.push({
      message: 'Preview lacks the computed actionability line (sanctionable-today: unknown).',
      detail: `${PREVIEW_NAME}: actionability`,
    })
  }
  if (!normalizeText(html).includes(normalizeText(DEMO_ACTIONABILITY_REASON))) {
    findings.push({
      message: 'Preview does not carry the full computed actionability reason verbatim.',
      detail: `${PREVIEW_NAME}: actionability reason`,
    })
  }
  // Currency: pinned digests and slice must equal THIS package's.
  for (const [field, value] of [
    ['fixtureDigest', reference.fixtureDigest],
    ['rulebookDigest', reference.rulebookDigest],
    ['geometryDigest', reference.geometryDigest],
    ['slice', reference.slice],
  ] as const) {
    if (!html.includes(value)) {
      findings.push({
        message: `Preview is stale: its ${field} does not match this package.`,
        detail: `${PREVIEW_NAME}: ${field}`,
      })
    }
  }
  // Verdict facts must match the report JSON of this package.
  for (const factId of ['fact.requested-du', 'fact.density-ceiling', 'fact.placed-du', 'fact.shortfall-du']) {
    const fact = reference.facts.find((candidate) => candidate.id === factId)
    if (!fact) {
      findings.push({ message: `Package report lacks ${factId}.`, detail: `${PREVIEW_NAME}: ${factId}` })
      continue
    }
    if (!html.includes(`</b> ${fact.value} DU<`)) {
      findings.push({
        message: `Preview verdict number for ${factId} does not match the report (${fact.value}).`,
        detail: `${PREVIEW_NAME}: ${factId}`,
      })
    }
  }
  // Measured inline-SVG parity against the package's canonical rings.
  const svgFeatures = new Map<string, [number, number][]>()
  const polygonPattern = /<polygon data-id="f\.([^"]+)" points="([^"]+)"/g
  let match: RegExpExecArray | null
  while ((match = polygonPattern.exec(html)) !== null) {
    svgFeatures.set(
      match[1]!,
      match[2]!.split(' ').map((pair) => {
        const [x, y] = pair.split(',')
        return [Number(x), Number(y)] as [number, number]
      }),
    )
  }
  const site = reference.features.find((feature) => feature.id === 'site-boundary')
  const sitePx = svgFeatures.get('site-boundary')
  if (!site || !sitePx) {
    findings.push({ message: 'Preview SVG lacks the site boundary.', detail: `${PREVIEW_NAME}: site-boundary` })
    return findings
  }
  const siteWorld = ringBoundsOf(site.ring)
  const sitePixel = ringBoundsOf(sitePx)
  const scale = (sitePixel.maxX - sitePixel.minX) / (siteWorld.maxX - siteWorld.minX)
  // RING parity, not bounding-box parity (041 §2): the transformed canonical
  // coordinate sequence is compared vertex-for-vertex — count, order, and
  // position — and the drawn ring must be non-degenerate. A deformation that
  // preserves min/max extents still fails.
  const tolerancePx = 0.05 * scale
  for (const feature of reference.features) {
    const pixels = svgFeatures.get(feature.id)
    if (!pixels || pixels.length === 0) {
      findings.push({
        message: `Preview SVG is missing planning feature ${feature.id}.`,
        detail: `${PREVIEW_NAME}: ${feature.id}`,
      })
      continue
    }
    const expectedPixels = feature.ring.map(([worldX, worldY]) => [
      sitePixel.minX + (worldX - siteWorld.minX) * scale,
      sitePixel.maxY - (worldY - siteWorld.minY) * scale,
    ] as const)
    if (pixels.length !== expectedPixels.length) {
      findings.push({
        message: `Preview SVG feature ${feature.id} has ${pixels.length} vertices; the canonical ring has ${expectedPixels.length}.`,
        detail: `${PREVIEW_NAME}: ${feature.id}`,
      })
      continue
    }
    let broken = false
    for (let index = 0; index < pixels.length && !broken; index += 1) {
      const [pixelX, pixelY] = pixels[index]!
      const [expectedX, expectedY] = expectedPixels[index]!
      const distance = Math.hypot(pixelX - expectedX, pixelY - expectedY)
      if (distance > tolerancePx) {
        findings.push({
          message: `Preview SVG feature ${feature.id} vertex ${index} is displaced by ${(distance / scale).toFixed(3)} m.`,
          detail: `${PREVIEW_NAME}: ${feature.id}`,
        })
        broken = true
      }
    }
    for (let index = 0; index < pixels.length && !broken; index += 1) {
      const current = pixels[index]!
      const next = pixels[(index + 1) % pixels.length]!
      if (Math.hypot(current[0] - next[0], current[1] - next[1]) < 1e-9) {
        findings.push({
          message: `Preview SVG feature ${feature.id} has a degenerate (duplicated) vertex at ${index}.`,
          detail: `${PREVIEW_NAME}: ${feature.id}`,
        })
        broken = true
      }
    }
  }
  for (const id of svgFeatures.keys()) {
    if (!reference.features.some((feature) => feature.id === id)) {
      findings.push({ message: `Preview SVG has an extra planning feature ${id}.`, detail: `${PREVIEW_NAME}: ${id}` })
    }
  }
  return findings
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
