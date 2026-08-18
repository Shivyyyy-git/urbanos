// Package verification gate: re-reads artifact BYTES (never the in-memory
// models) and fails closed if any artifact lacks the DEMO filename token, the
// visible watermark, or the locked stamp. Used by buildCommunityPackage, by
// the generation tool (non-zero exit), and by the THD-05/06 mutations.

import { DEMO_STAMP } from './rulebook.ts'
import { DEMO_ACTIONABILITY_REASON } from './resolve.ts'
import { DEMO_LAYERS, LAYER_BY_CLASS, type DemoLayer } from './drawing.ts'
import type { FeatureClass } from './layout.ts'
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
  checkClaimExclusivity(allText, file.filename, findings)
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
  checkClaimExclusivity(allText, file.filename, findings)
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
    readonly featureClass: FeatureClass
    readonly ring: readonly (readonly [number, number])[]
  }[]
  readonly decor: readonly {
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
      decor?: PreviewReference['decor']
    }
    const report = JSON.parse(new TextDecoder().decode(reportFile.bytes)) as {
      facts: PreviewReference['facts']
    }
    return { ...manifest, decor: manifest.decor ?? [], facts: report.facts }
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

// ---------------------------------------------------------------------------
// Rendered-semantics helpers (047): the gate must judge what a browser
// RENDERS, not which strings happen to sit in the source bytes.
// ---------------------------------------------------------------------------

/** Strip HTML comments: commented-out content is not rendered content. */
function stripHtmlComments(html: string): string {
  return html.replace(/<!--[\s\S]*?-->/g, '')
}

/** Decode CSS escape sequences the way a browser does before resolution. */
function decodeCssEscapes(value: string): string {
  return value
    .replace(/\\([0-9a-fA-F]{1,6})[ \t\n]?/g, (_match, hex: string) =>
      String.fromCodePoint(Number.parseInt(hex, 16)),
    )
    .replace(/\\([^0-9a-fA-F])/g, '$1')
}

/** Decode HTML character references (numeric + the named ones we emit). */
function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&#x([0-9a-fA-F]+);/g, (_match, hex: string) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_match, dec: string) => String.fromCodePoint(Number(dec)))
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&middot;/g, '·')
    .replace(/&times;/g, '×')
    .replace(/&amp;/g, '&')
}

/**
 * The POSITIVE allowlist (047 §1/§2): every element and every attribute the
 * generated page may contain. Anything else — including any transform, style,
 * visibility, clip, mask, or filter construct on a planning feature — fails.
 */
const ELEMENT_ATTRIBUTE_ALLOWLIST: Readonly<Record<string, readonly string[]>> = {
  meta: ['charset'],
  title: [],
  style: [],
  div: ['class'],
  h1: [],
  h2: [],
  b: [],
  br: [],
  aside: [],
  span: ['class', 'style'],
  svg: ['viewbox', 'xmlns', 'role', 'aria-label'],
  polygon: ['data-id', 'points', 'fill', 'stroke', 'stroke-width', 'stroke-dasharray'],
  polyline: ['data-id', 'points', 'fill', 'stroke', 'stroke-width', 'stroke-dasharray'],
  text: ['data-id', 'x', 'y', 'font-size', 'text-anchor', 'fill', 'font-weight', 'letter-spacing', 'opacity'],
}

/** The only inline style the page uses: the legend swatch colour chips. */
const SWATCH_STYLE = /^background:#[0-9a-f]{6};border-color:#[0-9a-f]{6}$/i

/** CSS that hides or displaces rendered content is a visibility forgery. */
const HIDING_CSS =
  /display\s*:\s*none|visibility\s*:\s*hidden|opacity\s*:\s*0(?![.\d])|font-size\s*:\s*0(?![.\d])|clip-path|(?<![-\w])clip\s*:|(?<![-\w])content\s*:|transform\s*:|position\s*:\s*(absolute|fixed)|text-indent\s*:\s*-|filter\s*:|(?<![-\w])mask/i

/**
 * Tokenise a tag's attribute chunk the way a BROWSER does (050 §1): quoted
 * (double or single), unquoted, and boolean (bare-name) attributes all become
 * tokens. A construct the browser consumes is a construct the gate judges.
 */
function tokenizeAttributes(chunk: string): [string, string][] {
  const attributes: [string, string][] = []
  const tokenPattern = /([^\s"'=\/>]+)(?:\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]*)))?/g
  let token: RegExpExecArray | null
  while ((token = tokenPattern.exec(chunk)) !== null) {
    const name = token[1]!.toLowerCase()
    if (name === '/' || name.length === 0) continue
    attributes.push([name, token[3] ?? token[4] ?? token[5] ?? ''])
  }
  return attributes
}

function checkElementAllowlist(visibleHtml: string, findings: VerifyFinding[]): void {
  const tagPattern = /<([a-zA-Z][\w-]*)((?:"[^"]*"|'[^']*'|[^"'>])*)>/g
  let tagMatch: RegExpExecArray | null
  while ((tagMatch = tagPattern.exec(visibleHtml)) !== null) {
    const element = tagMatch[1]!.toLowerCase()
    const allowedAttributes = ELEMENT_ATTRIBUTE_ALLOWLIST[element]
    if (allowedAttributes === undefined) {
      findings.push({
        message: `Preview contains element <${element}>, which is outside the positive allowlist.`,
        detail: `${PREVIEW_NAME}: element <${element}>`,
      })
      continue
    }
    const attributes = tokenizeAttributes(tagMatch[2] ?? '')
    const dataId = attributes.find(([name]) => name === 'data-id')?.[1]
    const where = dataId ? `${PREVIEW_NAME}: ${dataId}` : PREVIEW_NAME
    for (const [attribute, value] of attributes) {
      if (!allowedAttributes.includes(attribute)) {
        findings.push({
          message: `Preview element <${element}${dataId ? ` data-id="${dataId}"` : ''}> carries attribute "${attribute}", outside the positive allowlist — no transform/style/visibility construct may alter rendered geometry.`,
          detail: `${where}: <${element} ${attribute}> render/geometry construct`,
        })
      } else if (element === 'span' && attribute === 'style' && !SWATCH_STYLE.test(value.trim())) {
        findings.push({
          message: 'Preview swatch style deviates from the fixed colour-chip form.',
          detail: `${PREVIEW_NAME}: <span style> render construct`,
        })
      } else if (element === 'text' && attribute === 'opacity' && !(Number(value) >= 0.2)) {
        findings.push({
          message: `Preview text opacity ${value} renders as invisible; visibility is rendered visibility.`,
          detail: `${where}: <text opacity> visibility construct`,
        })
      }
    }
  }
}

function svgHex(rgb: readonly [number, number, number]): string {
  return `#${rgb.map((channel) => Math.round(channel * 255).toString(16).padStart(2, '0')).join('')}`
}

function layerFor(name: DemoLayer) {
  return DEMO_LAYERS.find((candidate) => candidate.name === name)!
}

/** The exact annotation vocabulary the generator emits into the preview SVG. */
const EXPECTED_ANNO_PATH_IDS = ['anno.north-arrow', 'anno.scalebar-0', 'anno.scalebar-1'] as const
const EXPECTED_TEXT_IDS = [
  'anno.north-label', 'anno.label-club', 'anno.label-pool', 'anno.label-green-west',
  'anno.label-gate', 'anno.scalebar-t0', 'anno.scalebar-t50', 'anno.scalebar-t100',
] as const

/**
 * Expected-tree validation (050 §2): allowed vocabulary is not an allowed
 * tree. Every rendered SVG node must fill a known generated role with known
 * multiplicity — every path bound to a canonical feature or a named
 * annotation, exactly one anonymous DEMO watermark text, and planning
 * features painted in their class palette. An extra node made only of
 * allowed tags fails by existing.
 */
function checkSvgTree(
  html: string,
  reference: PreviewReference,
  findings: VerifyFinding[],
): void {
  const pathIds: string[] = []
  const pathTag = /<(polygon|polyline)((?:"[^"]*"|'[^']*'|[^"'>])*)>/g
  let tag: RegExpExecArray | null
  while ((tag = pathTag.exec(html)) !== null) {
    const attributes = new Map(tokenizeAttributes(tag[2] ?? ''))
    const dataId = attributes.get('data-id')
    if (dataId === undefined) {
      findings.push({
        message: `Preview SVG contains an anonymous rendered <${tag[1]}> bound to no canonical feature or annotation — an unbound node can overlay the plan.`,
        detail: `${PREVIEW_NAME}: anonymous <${tag[1]}> render node`,
      })
      continue
    }
    pathIds.push(dataId)
    if (dataId.startsWith('f.')) {
      const feature = reference.features.find((candidate) => `f.${candidate.id}` === dataId)
      if (!feature) continue // reported as an extra feature elsewhere
      const style = layerFor(LAYER_BY_CLASS[feature.featureClass])
      const expectedFill = style.fill ? svgHex(style.fill) : 'none'
      const expectedStroke = svgHex(style.stroke)
      if (attributes.get('fill') !== expectedFill || attributes.get('stroke') !== expectedStroke) {
        findings.push({
          message: `Preview SVG feature ${dataId} is painted outside its class palette (fill=${attributes.get('fill')}, stroke=${attributes.get('stroke')}).`,
          detail: `${PREVIEW_NAME}: ${feature.id} palette`,
        })
      }
    } else if (dataId.startsWith('deco.')) {
      if (!reference.decor.some((tree) => `deco.${tree.id}` === dataId)) {
        findings.push({
          message: `Preview SVG decor "${dataId}" is not listed in this package's manifest.`,
          detail: `${PREVIEW_NAME}: ${dataId}`,
        })
      }
    } else if (!(EXPECTED_ANNO_PATH_IDS as readonly string[]).includes(dataId)) {
      findings.push({
        message: `Preview SVG path "${dataId}" is outside the generated annotation vocabulary.`,
        detail: `${PREVIEW_NAME}: ${dataId}`,
      })
    }
  }
  // Decor multiplicity: every manifest tree exactly once (checked below with
  // the shared multiplicity pass via pathIds).
  for (const tree of reference.decor) {
    if (!pathIds.includes(`deco.${tree.id}`)) {
      findings.push({
        message: `Preview SVG lacks manifest decor "deco.${tree.id}".`,
        detail: `${PREVIEW_NAME}: deco.${tree.id}`,
      })
    }
  }
  // Multiplicity: no duplicate path roles; every expected annotation exactly once.
  const seen = new Set<string>()
  for (const id of pathIds) {
    if (seen.has(id)) {
      findings.push({
        message: `Preview SVG path role "${id}" appears more than once.`,
        detail: `${PREVIEW_NAME}: ${id} multiplicity`,
      })
    }
    seen.add(id)
  }
  for (const id of EXPECTED_ANNO_PATH_IDS) {
    if (!seen.has(id)) {
      findings.push({ message: `Preview SVG lacks generated annotation "${id}".`, detail: `${PREVIEW_NAME}: ${id}` })
    }
  }
  // Texts: the eight named labels exactly once each, plus exactly one
  // anonymous text whose rendered content is the DEMO watermark.
  const textIds: string[] = []
  let anonymousTexts = 0
  const textTag = /<text((?:"[^"]*"|'[^']*'|[^"'>])*)>([^<]*)<\/text>/g
  while ((tag = textTag.exec(html)) !== null) {
    const attributes = new Map(tokenizeAttributes(tag[1] ?? ''))
    const dataId = attributes.get('data-id')
    if (dataId === undefined) {
      anonymousTexts += 1
      if (tag[2]!.trim() !== 'DEMO') {
        findings.push({
          message: `Preview SVG contains an anonymous text node "${tag[2]!.slice(0, 40)}" that is not the DEMO watermark.`,
          detail: `${PREVIEW_NAME}: anonymous <text> render node`,
        })
      }
      continue
    }
    textIds.push(dataId)
    if (!(EXPECTED_TEXT_IDS as readonly string[]).includes(dataId)) {
      findings.push({
        message: `Preview SVG text "${dataId}" is outside the generated label vocabulary.`,
        detail: `${PREVIEW_NAME}: ${dataId}`,
      })
    }
  }
  if (anonymousTexts !== 1) {
    findings.push({
      message: `Preview SVG must contain exactly one anonymous DEMO watermark text; found ${anonymousTexts}.`,
      detail: `${PREVIEW_NAME}: watermark multiplicity`,
    })
  }
  const textSeen = new Set<string>()
  for (const id of textIds) {
    if (textSeen.has(id)) {
      findings.push({ message: `Preview SVG text role "${id}" appears more than once.`, detail: `${PREVIEW_NAME}: ${id} multiplicity` })
    }
    textSeen.add(id)
  }
  for (const id of EXPECTED_TEXT_IDS) {
    if (!textSeen.has(id)) {
      findings.push({ message: `Preview SVG lacks generated label "${id}".`, detail: `${PREVIEW_NAME}: ${id}` })
    }
  }
}

/**
 * Semantic stylesheet gate (050 §3): a POSITIVE property allowlist — the
 * exact properties the generator emits — with numeric value judgement where
 * a value can hide content. `opacity:0.0` fails because `opacity` is not a
 * generated property at all; spellings are never consulted.
 */
const CSS_PROPERTY_ALLOWLIST = new Set([
  'background', 'box-shadow', 'margin', 'margin-top', 'margin-bottom', 'padding', 'padding-top',
  'font-family', 'font-size', 'color', 'display', 'justify-content', 'letter-spacing', 'border',
  'border-top', 'border-color', 'font-weight', 'width', 'max-width', 'height', 'gap',
  'align-items', 'flex', 'word-break', 'font-style',
])
const CSS_DISPLAY_VALUES = new Set(['flex', 'inline-block', 'block'])

function checkStylesheetSemantics(css: string, findings: VerifyFinding[]): void {
  const cleaned = decodeCssEscapes(css).replace(/\/\*[\s\S]*?\*\//g, '')
  for (const block of cleaned.split('}')) {
    const body = block.includes('{') ? block.slice(block.indexOf('{') + 1) : ''
    for (const declaration of body.split(';')) {
      const colon = declaration.indexOf(':')
      if (colon < 0) continue
      const property = declaration.slice(0, colon).trim().toLowerCase()
      const value = declaration.slice(colon + 1).trim().toLowerCase()
      if (property.length === 0) continue
      if (!CSS_PROPERTY_ALLOWLIST.has(property)) {
        findings.push({
          message: `Preview stylesheet uses property "${property}", outside the generated property allowlist — visibility (opacity/display/clip/transform/…) may not be altered by any spelling.`,
          detail: `${PREVIEW_NAME}: stylesheet property "${property}" visibility construct`,
        })
        continue
      }
      if (property === 'display' && !CSS_DISPLAY_VALUES.has(value)) {
        findings.push({
          message: `Preview stylesheet computes display:${value}, which can hide rendered content.`,
          detail: `${PREVIEW_NAME}: stylesheet display visibility construct`,
        })
      }
      if (property === 'font-size') {
        const pixels = /^(\d+(?:\.\d+)?)px$/.exec(value)
        if (!pixels || Number(pixels[1]) < 6) {
          findings.push({
            message: `Preview stylesheet computes font-size ${value}; below-legibility or non-pixel sizes are refused.`,
            detail: `${PREVIEW_NAME}: stylesheet font-size visibility construct`,
          })
        }
      }
    }
  }
}

/**
 * Actionability exclusivity (050 §4): the computed truthful claim must be the
 * ONLY visible sanctionability claim. A second visible "yes"/"no" promotion
 * fails even though the truthful node survives beside it.
 */
function checkClaimExclusivity(
  visibleText: string,
  surface: string,
  findings: VerifyFinding[],
): void {
  const claims = visibleText.match(/sanctionable\s+today\s*:/gi) ?? []
  if (claims.length !== 1) {
    findings.push({
      message: `Surface shows ${claims.length} visible "sanctionable today:" claims; the computed claim must be exclusive (exactly one).`,
      detail: `${surface}: sanctionable-today claim exclusivity`,
    })
  }
  if (/sanctionable[\s-]*today\s*:?\s*(yes|no)\b/i.test(visibleText)) {
    findings.push({
      message: 'Surface visibly promotes sanctionable-today beyond "unknown" — a DEMO output can never claim yes or no.',
      detail: `${surface}: visible sanctionable-today promotion`,
    })
  }
  if (/\bsanctioned\b/i.test(visibleText)) {
    findings.push({
      message: 'Surface visibly claims a sanctioned status; no such claim is computable for a DEMO slice.',
      detail: `${surface}: visible sanction claim`,
    })
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
  // Every content check runs on the RENDERED surface: comments are stripped
  // first, so a truthful string hidden in a comment can never stand in for a
  // forged visible one (047 §3), and fetch/allowlist scans additionally run
  // on browser-decoded (entity/CSS-escape) forms (047 §1).
  const html = stripHtmlComments(new TextDecoder().decode(previewBytes))
  const reference = packageReference(files)
  if (!reference) {
    return [{ message: 'Package lacks the manifest/report needed to verify the preview.', detail: PREVIEW_NAME }]
  }
  // Filename token (the alias name itself carries the DEMO token).
  if (!PREVIEW_NAME.split(/[^A-Za-z0-9]+/).includes('DEMO')) {
    findings.push({ message: 'Preview basename lacks the DEMO token.', detail: PREVIEW_NAME })
  }
  // Self-containment: the fetch-capable scan runs on the rendered text AND
  // on its browser-decoded forms — a CSS-escaped `u\72l(...)` decodes to a
  // real url() fetch and must fail exactly like the literal spelling.
  const fetchCapable =
    /<\s*(script|link|img|iframe|frame|embed|object|video|audio|source|track|use|base|form|input|applet)\b|\b(src|href|srcset|xlink:href|data|poster|action|formaction)\s*=|url\s*\(|@import|expression\s*\(|http-equiv/i
  const decodedForms = [
    html,
    decodeHtmlEntities(html),
    decodeCssEscapes(html),
    decodeCssEscapes(decodeHtmlEntities(html)),
  ]
  for (const form of decodedForms) {
    const fetchMatch = fetchCapable.exec(form)
    if (fetchMatch) {
      findings.push({
        message: `Preview is not self-contained: fetch-capable construct "${fetchMatch[0]}" found after browser decoding (allowlist is inline text + inline SVG only).`,
        detail: `${PREVIEW_NAME}: external dependency`,
      })
      break
    }
  }
  // Positive element/attribute allowlist over the COMPLETE browser token
  // surface (kills transform/style/visibility constructs on rendered
  // features, quoted or not).
  checkElementAllowlist(html, findings)
  // Expected generated tree: roles, multiplicity, and class palette — an
  // extra node made only of allowed tags fails by existing.
  checkSvgTree(html, reference, findings)
  // Stylesheet judged semantically: positive property allowlist + numeric
  // value judgement, plus the legacy hiding-construct scan as a belt.
  for (const styleMatch of html.matchAll(/<style>([\s\S]*?)<\/style>/gi)) {
    checkStylesheetSemantics(styleMatch[1]!, findings)
    const hiding = HIDING_CSS.exec(decodeCssEscapes(styleMatch[1]!))
    if (hiding) {
      findings.push({
        message: `Preview stylesheet contains a hiding/displacing construct "${hiding[0]}".`,
        detail: `${PREVIEW_NAME}: stylesheet visibility construct`,
      })
    }
  }
  // The computed actionability claim must be exclusive in the rendered text.
  const visibleText = normalizeText(
    decodeHtmlEntities(
      html.replace(/<style>[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' '),
    ),
  )
  checkClaimExclusivity(visibleText, PREVIEW_NAME, findings)
  if (!html.includes(DEMO_STAMP)) {
    findings.push({ message: 'Preview lacks the exact locked stamp.', detail: `${PREVIEW_NAME}: stamp` })
  }
  if (!/>DEMO<\/text>/.test(html)) {
    findings.push({ message: 'Preview lacks the visible DEMO watermark.', detail: `${PREVIEW_NAME}: watermark` })
  }
  if (!html.includes('demo-illustrative')) {
    findings.push({ message: 'Preview lacks the demo classification.', detail: `${PREVIEW_NAME}: classification` })
  }
  // THD-18 visibility (047 §3): the reason is verified in its EXACT rendered
  // node — the .note element directly following the actionability line — and
  // must equal the one computed object verbatim. Raw-source presence
  // elsewhere (comments, metadata) does not count.
  const reasonNode =
    /Sanctionable today:<\/b> unknown<\/div>\s*<div class="note">([^<]*)<\/div>/.exec(html)
  if (!/Sanctionable today:<\/b> unknown/.test(html)) {
    findings.push({
      message: 'Preview lacks the computed actionability line (sanctionable-today: unknown).',
      detail: `${PREVIEW_NAME}: actionability`,
    })
  }
  if (!reasonNode || decodeHtmlEntities(reasonNode[1]!).trim() !== DEMO_ACTIONABILITY_REASON) {
    findings.push({
      message:
        'Preview visible actionability reason node does not equal the computed object verbatim (hidden/comment/metadata substitutes do not count).',
      detail: `${PREVIEW_NAME}: visible actionability reason`,
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
  // Measured inline-SVG parity against the package's canonical rings, read
  // from the rendered (comment-stripped) surface.
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
