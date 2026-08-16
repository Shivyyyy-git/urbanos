// Shared helpers for the THD acceptance harness. The parsers here are
// deliberately independent of the exporters: they read artifact BYTES (DXF
// group codes, PDF objects and content-stream operators) and reconstruct
// world geometry through each artifact's own declared transform.

import { spawnSync } from 'node:child_process'
import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// The runner executes from the package root; the bundle's import.meta.url
// points at a temp dir, so cwd (or the runner-provided env) is the anchor.
export const projectRoot = process.env['URBANOS_DEMO_ROOT'] ?? process.cwd()

export function freshDir(prefix: string): string {
  return mkdtempSync(join(tmpdir(), `urbanos-thd-${prefix}-`))
}

export interface GeneratedRun {
  readonly dir: string
  readonly stdout: string
  readonly status: number
}

/** Cold, non-interactive run of the single documented demo command. */
export function runGenerate(slice: 'a' | 'b', dir: string): GeneratedRun {
  const result = spawnSync(
    process.execPath,
    ['tools/generate-demo.mjs', 'generate', '--slice', slice, '--out', dir],
    {
      cwd: projectRoot,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, NODE_OPTIONS: '' },
    },
  )
  return {
    dir,
    stdout: `${result.stdout?.toString() ?? ''}${result.stderr?.toString() ?? ''}`,
    status: result.status ?? -1,
  }
}

export function runVerify(dir: string): { status: number; output: string } {
  const result = spawnSync(
    process.execPath,
    ['tools/generate-demo.mjs', 'verify', dir],
    { cwd: projectRoot, stdio: ['ignore', 'pipe', 'pipe'] },
  )
  return {
    status: result.status ?? -1,
    output: `${result.stdout?.toString() ?? ''}${result.stderr?.toString() ?? ''}`,
  }
}

export function listArtifacts(dir: string): string[] {
  return readdirSync(dir).filter((name) => /\.(dxf|pdf|json)$/.test(name)).sort()
}

export function readArtifact(dir: string, suffix: string): { filename: string; bytes: Buffer } {
  const filename = listArtifacts(dir).find((name) => name.endsWith(suffix))
  if (!filename) throw new Error(`No artifact ending "${suffix}" in ${dir}`)
  return { filename, bytes: readFileSync(join(dir, filename)) }
}

export function latin1(bytes: Buffer | Uint8Array): string {
  return Buffer.from(bytes).toString('latin1')
}

// ---------------------------------------------------------------------------
// DXF parsing (independent of src/dxf.ts)
// ---------------------------------------------------------------------------

export interface DxfPath {
  readonly id: string
  readonly layer: string
  readonly closed: boolean
  readonly points: [number, number][]
}

export interface DxfText {
  readonly id: string
  readonly layer: string
  readonly value: string
  readonly heightM: number
  readonly at: [number, number]
}

export interface ParsedDxf {
  readonly paths: DxfPath[]
  readonly texts: DxfText[]
  readonly markers: string[]
}

export function parseDxf(raw: string): ParsedDxf {
  const lines = raw.split('\n')
  const pairs: { code: number; value: string }[] = []
  for (let index = 0; index + 1 < lines.length; index += 2) {
    pairs.push({ code: Number(lines[index]!.trim()), value: lines[index + 1]! })
  }
  const paths: DxfPath[] = []
  const texts: DxfText[] = []
  const markers: string[] = []
  let pendingId = ''
  let index = 0
  while (index < pairs.length) {
    const pair = pairs[index]!
    if (pair.code === 999) {
      markers.push(pair.value)
      const pathMarker = /^URBANOS_PATH (.+)$/.exec(pair.value)
      const textMarker = /^URBANOS_TEXT (.+)$/.exec(pair.value)
      if (pathMarker) pendingId = decodeURIComponent(pathMarker[1]!)
      if (textMarker) pendingId = decodeURIComponent(textMarker[1]!)
      index += 1
      continue
    }
    if (pair.code === 0 && pair.value === 'POLYLINE') {
      const path: { id: string; layer: string; closed: boolean; points: [number, number][] } = {
        id: pendingId, layer: '', closed: false, points: [],
      }
      index += 1
      while (index < pairs.length && !(pairs[index]!.code === 0 && pairs[index]!.value === 'SEQEND')) {
        const inner = pairs[index]!
        if (inner.code === 8 && path.layer === '') path.layer = inner.value
        if (inner.code === 70) path.closed = (Number(inner.value) & 1) === 1
        if (inner.code === 0 && inner.value === 'VERTEX') {
          let x = NaN
          let y = NaN
          index += 1
          while (index < pairs.length && pairs[index]!.code !== 0) {
            if (pairs[index]!.code === 10) x = Number(pairs[index]!.value)
            if (pairs[index]!.code === 20) y = Number(pairs[index]!.value)
            index += 1
          }
          path.points.push([x, y])
          continue
        }
        index += 1
      }
      paths.push(path)
      pendingId = ''
    } else if (pair.code === 0 && pair.value === 'TEXT') {
      const text = { id: pendingId, layer: '', value: '', heightM: 0, at: [NaN, NaN] as [number, number] }
      index += 1
      while (index < pairs.length && pairs[index]!.code !== 0) {
        const inner = pairs[index]!
        if (inner.code === 8) text.layer = inner.value
        if (inner.code === 1) text.value = inner.value
        if (inner.code === 40) text.heightM = Number(inner.value)
        if (inner.code === 10) text.at[0] = Number(inner.value)
        if (inner.code === 20) text.at[1] = Number(inner.value)
        index += 1
      }
      texts.push(text)
      pendingId = ''
      continue
    }
    index += 1
  }
  return { paths, texts, markers }
}

/** Audit the DXF with ezdxf (third-party, not our serializer). */
export function ezdxfAudit(filePath: string): { errors: number; version: string; insunits: number } {
  const script = [
    'import json, sys',
    'import ezdxf',
    'from ezdxf import recover',
    'doc, auditor = recover.readfile(sys.argv[1])',
    'print(json.dumps({',
    '  "errors": len(auditor.errors),',
    '  "version": doc.dxfversion,',
    '  "insunits": doc.header.get("$INSUNITS", -1),',
    '}))',
  ].join('\n')
  const result = spawnSync('python3', ['-c', script, filePath], { stdio: ['ignore', 'pipe', 'pipe'] })
  if (result.status !== 0) {
    throw new Error(`ezdxf audit failed: ${result.stderr?.toString() ?? ''}`)
  }
  return JSON.parse(result.stdout.toString()) as { errors: number; version: string; insunits: number }
}

// ---------------------------------------------------------------------------
// PDF parsing (independent of src/pdf.ts)
// ---------------------------------------------------------------------------

export function pdfObjects(raw: string): Map<number, string> {
  const objects = new Map<number, string>()
  const pattern = /(\d+) 0 obj\n([\s\S]*?)\nendobj\n/g
  let match: RegExpExecArray | null
  while ((match = pattern.exec(raw)) !== null) objects.set(Number(match[1]), match[2]!)
  return objects
}

export function pdfPages(raw: string): string[] {
  const objects = pdfObjects(raw)
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

const WINANSI_REVERSE: Readonly<Record<number, string>> = {
  0x97: '—', 0x96: '–', 0xb7: '·', 0x91: '‘', 0x92: '’', 0x93: '“', 0x94: '”', 0x85: '…',
}

export function decodePdfText(value: string): string {
  let output = ''
  for (const character of value) {
    const code = character.charCodeAt(0)
    output += WINANSI_REVERSE[code] ?? character
  }
  return output.replace(/\\([\\()])/g, '$1')
}

/** All visible text strings drawn on a page, decoded. */
export function pageTextStrings(content: string): string[] {
  const strings: string[] = []
  const pattern = /\(((?:\\.|[^\\)])*)\) Tj/g
  let match: RegExpExecArray | null
  while ((match = pattern.exec(content)) !== null) strings.push(decodePdfText(match[1]!))
  return strings
}

export interface PdfVectorPath {
  readonly id: string
  readonly points: [number, number][]
  readonly closed: boolean
  readonly painted: 'stroke' | 'fill' | 'fill-stroke'
}

/** Marker-tagged vector paths from a page's content stream (paper points). */
export function pageVectorPaths(content: string): PdfVectorPath[] {
  const paths: PdfVectorPath[] = []
  const blocks = content.split('% URBANOS_PATH ')
  for (let index = 1; index < blocks.length; index += 1) {
    const block = blocks[index]!
    const id = decodeURIComponent(block.slice(0, block.indexOf('\n')))
    const points: [number, number][] = []
    let closed = false
    let painted: 'stroke' | 'fill' | 'fill-stroke' = 'stroke'
    for (const line of block.split('\n')) {
      const move = /^([\d.-]+) ([\d.-]+) m$/.exec(line)
      const draw = /^([\d.-]+) ([\d.-]+) l$/.exec(line)
      if (move) points.push([Number(move[1]), Number(move[2])])
      if (draw) points.push([Number(draw[1]), Number(draw[2])])
      if (line === 'h') closed = true
      if (line === 'B') painted = 'fill-stroke'
      if (line === 'f') painted = 'fill'
      if (line === 'Q') break
    }
    paths.push({ id, points, closed, painted })
  }
  return paths
}

/**
 * Recover the paper->world transform for one of our drawing PDFs from two
 * known reference world points and their painted counterparts is deliberately
 * NOT done — instead the tests derive the transform from the declared scale
 * and the site-boundary path, then check every other feature against it.
 */
export interface AffineScaleTransform {
  readonly pointsPerMetre: number
  readonly originX: number
  readonly originY: number
}

export function transformFromSiteBoundary(
  paths: readonly PdfVectorPath[],
  siteWidthM: number,
  siteDepthM: number,
): AffineScaleTransform {
  const site = paths.find((path) => path.id === 'f.site-boundary')
  if (!site || site.points.length < 4) throw new Error('site boundary path missing from PDF')
  const xs = site.points.map((point) => point[0])
  const ys = site.points.map((point) => point[1])
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const scaleX = (maxX - minX) / siteWidthM
  const scaleY = (maxY - minY) / siteDepthM
  if (Math.abs(scaleX - scaleY) > 1e-6) {
    throw new Error(`anisotropic PDF scale: ${scaleX} vs ${scaleY}`)
  }
  return { pointsPerMetre: scaleX, originX: minX, originY: minY }
}

export function toWorld(point: [number, number], transform: AffineScaleTransform): [number, number] {
  return [
    (point[0] - transform.originX) / transform.pointsPerMetre,
    (point[1] - transform.originY) / transform.pointsPerMetre,
  ]
}

// ---------------------------------------------------------------------------
// Geometry helpers for measured checks
// ---------------------------------------------------------------------------

export interface WorldFeature {
  readonly id: string
  readonly points: [number, number][]
}

export function ringBounds(points: readonly [number, number][]): {
  minX: number; minY: number; maxX: number; maxY: number; w: number; h: number
} {
  const xs = points.map((point) => point[0])
  const ys = points.map((point) => point[1])
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  return { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY }
}

export function ringArea(points: readonly [number, number][]): number {
  let sum = 0
  for (let index = 0; index < points.length; index += 1) {
    const [x1, y1] = points[index]!
    const [x2, y2] = points[(index + 1) % points.length]!
    sum += x1 * y2 - x2 * y1
  }
  return Math.abs(sum) / 2
}

/** Rebuild a PDF file after transforming its content streams (for mutations). */
export function rewritePdfContents(
  bytes: Buffer,
  transformContent: (content: string, pageIndex: number) => string,
): Buffer {
  const raw = latin1(bytes)
  const objectPattern = /(\d+) 0 obj\n([\s\S]*?)\nendobj\n/g
  interface ParsedObject { id: number; body: string }
  const objects: ParsedObject[] = []
  let match: RegExpExecArray | null
  while ((match = objectPattern.exec(raw)) !== null) {
    objects.push({ id: Number(match[1]), body: match[2]! })
  }
  const header = raw.slice(0, raw.indexOf('1 0 obj\n'))
  const trailerMatch = /trailer\n([\s\S]*?)\nstartxref\n/.exec(raw)
  if (!trailerMatch) throw new Error('no trailer')
  let contentIndex = 0
  const rebuilt = objects.map((object) => {
    const stream = /^<< \/Length \d+ >>\nstream\n([\s\S]*?)\nendstream$/.exec(object.body)
    if (!stream) return object
    const next = transformContent(stream[1]!, contentIndex)
    contentIndex += 1
    return { id: object.id, body: `<< /Length ${next.length} >>\nstream\n${next}\nendstream` }
  })
  let pdf = header
  const offsets: number[] = []
  for (const object of rebuilt) {
    offsets.push(pdf.length)
    pdf += `${object.id} 0 obj\n${object.body}\nendobj\n`
  }
  const xrefOffset = pdf.length
  pdf += `xref\n0 ${rebuilt.length + 1}\n0000000000 65535 f \n`
  for (const offset of offsets) pdf += `${String(offset).padStart(10, '0')} 00000 n \n`
  pdf += `trailer\n${trailerMatch[1]!}\nstartxref\n${xrefOffset}\n%%EOF\n`
  return Buffer.from(pdf, 'latin1')
}

export function writeBytes(dir: string, filename: string, bytes: Buffer | Uint8Array): void {
  writeFileSync(join(dir, filename), bytes)
}

// ---------------------------------------------------------------------------
// Cross-artifact parity oracle (THD-13/14/15): measures vector paths in the
// DXF and both PDFs against the manifest's canonical rings. Digests are never
// used as evidence — every feature is measured.
// ---------------------------------------------------------------------------

export interface ManifestFeature {
  readonly id: string
  readonly featureClass: string
  readonly ring: [number, number][]
}

export interface ParityManifest {
  readonly features: ManifestFeature[]
  readonly roles: Record<string, string>
}

export function loadManifest(dir: string): ParityManifest {
  return JSON.parse(
    readArtifact(dir, '-parity-manifest.json').bytes.toString('utf8'),
  ) as ParityManifest
}

const DXF_TOLERANCE_M = 0.001
const PDF_TOLERANCE_M = 0.2 // 0.25 mm on paper at 1:750 = 0.1875 m + float slack

function compareRings(
  artifact: string,
  feature: ManifestFeature,
  measured: [number, number][] | undefined,
  toleranceM: number,
  findings: string[],
): void {
  if (!measured || measured.length === 0) {
    findings.push(`${artifact}: feature ${feature.id} (${feature.featureClass}) is missing`)
    return
  }
  const expected = ringBounds(feature.ring)
  const actual = ringBounds(measured)
  for (const key of ['minX', 'minY', 'maxX', 'maxY'] as const) {
    if (Math.abs(expected[key] - actual[key]) > toleranceM) {
      findings.push(
        `${artifact}: feature ${feature.id} (${feature.featureClass}) ${key} off by `
          + `${Math.abs(expected[key] - actual[key]).toFixed(4)} m`,
      )
      return
    }
  }
  if (measured.length !== feature.ring.length) {
    findings.push(`${artifact}: feature ${feature.id} vertex count ${measured.length} != ${feature.ring.length}`)
  }
}

export function comparePackageGeometry(dir: string): string[] {
  const findings: string[] = []
  const manifest = loadManifest(dir)
  const manifestIds = new Set(manifest.features.map((feature) => feature.id))

  // DXF: world metres directly.
  const dxf = parseDxf(latin1(readArtifact(dir, '-technical-sheet.dxf').bytes))
  const dxfFeatures = new Map(
    dxf.paths.filter((path) => path.id.startsWith('f.')).map((path) => [path.id.slice(2), path.points]),
  )
  for (const id of dxfFeatures.keys()) {
    if (!manifestIds.has(id)) findings.push(`dxf: extra feature ${id}`)
  }
  for (const feature of manifest.features) {
    compareRings('dxf', feature, dxfFeatures.get(feature.id), DXF_TOLERANCE_M, findings)
  }

  // Both PDFs: paper points -> world metres via each file's site boundary.
  for (const suffix of ['-technical-sheet.pdf', '-presentation-map.pdf'] as const) {
    const artifactName = suffix.slice(1)
    const pages = pdfPages(latin1(readArtifact(dir, suffix).bytes))
    const vectors = pages.flatMap((content) => pageVectorPaths(content))
    const site = manifest.features.find((feature) => feature.id === 'site-boundary')!
    const siteBounds = ringBounds(site.ring)
    let transform: AffineScaleTransform
    try {
      transform = transformFromSiteBoundary(
        vectors.filter((path) => path.id.startsWith('f.')),
        siteBounds.w,
        siteBounds.h,
      )
    } catch (error) {
      findings.push(`${artifactName}: ${(error as Error).message}`)
      continue
    }
    const pdfFeatures = new Map<string, [number, number][]>()
    for (const path of vectors) {
      if (!path.id.startsWith('f.')) continue
      pdfFeatures.set(
        path.id.slice(2),
        path.points.map((point) => {
          const world = toWorld(point, transform)
          return [world[0] + siteBounds.minX, world[1] + siteBounds.minY] as [number, number]
        }),
      )
    }
    for (const id of pdfFeatures.keys()) {
      if (!manifestIds.has(id)) findings.push(`${artifactName}: extra feature ${id}`)
    }
    for (const feature of manifest.features) {
      compareRings(artifactName, feature, pdfFeatures.get(feature.id), PDF_TOLERANCE_M, findings)
    }
  }
  return findings
}
