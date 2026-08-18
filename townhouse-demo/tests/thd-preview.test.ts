// THD-17 — the one-click preview.DEMO.html is current, self-contained, and
// fail-closed. The preview alias lives at the package root and is atomically
// replaced by every successful generate run.

import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { DEMO_STAMP } from '../src/index.ts'
import {
  freshDir,
  loadManifest,
  projectRoot,
  readArtifact,
  ringBounds,
  runGenerate,
} from './helpers.ts'

const PREVIEW = join(projectRoot, 'preview.DEMO.html')
const UNTAGGED = join(projectRoot, 'preview.html')

function sha(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex')
}

function verifyWithPreview(dir: string, previewPath?: string): { status: number; output: string } {
  const args = ['tools/generate-demo.mjs', 'verify', dir, '--with-preview']
  if (previewPath) args.push(previewPath)
  const result = spawnSync(process.execPath, args, {
    cwd: projectRoot,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  return {
    status: result.status ?? -1,
    output: `${result.stdout?.toString() ?? ''}${result.stderr?.toString() ?? ''}`,
  }
}

test('THD-17: one-click preview is current, self-contained, and fail-closed', () => {
  const dirA1 = freshDir('prev-a1')
  const dirB = freshDir('prev-b')
  const dirA2 = freshDir('prev-a2')

  // A -> B -> A: the alias is atomically replaced each run and byte-stable.
  assert.equal(runGenerate('a', dirA1).status, 0)
  assert.ok(existsSync(PREVIEW), 'preview.DEMO.html exists after generate')
  assert.ok(!existsSync(UNTAGGED), 'the superseded untagged preview.html does not remain')
  const previewA1 = readFileSync(PREVIEW)
  assert.equal(runGenerate('b', dirB).status, 0)
  const previewB = readFileSync(PREVIEW)
  assert.notEqual(sha(previewB), sha(previewA1), 'B preview differs from A')
  assert.equal(runGenerate('a', dirA2).status, 0)
  const previewA2 = readFileSync(PREVIEW)
  assert.equal(sha(previewA2), sha(previewA1), 'the two A previews are byte-identical')

  // Self-containment and content checks on the A page.
  const html = previewA1.toString('utf8')
  assert.ok(!/<script|<link\b/i.test(html), 'no scripts or external stylesheets')
  assert.ok(!/(src|href)\s*=\s*["']?(https?:)?\/\//i.test(html), 'no network references')
  assert.ok(html.includes(DEMO_STAMP), 'exact locked stamp present')
  assert.ok(/>DEMO<\/text>/.test(html), 'visible DEMO watermark present')
  assert.ok(html.includes('demo-illustrative'), 'classification present')
  assert.ok(/Sanctionable today:<\/b> unknown/.test(html), 'actionability line present')

  const reportA = JSON.parse(readArtifact(dirA1, '-envelope-report.json').bytes.toString('utf8')) as {
    fixtureDigest: string
    rulebookDigest: string
    geometryDigest: string
    slice: string
    facts: { id: string; value: number }[]
  }
  for (const digest of [reportA.fixtureDigest, reportA.rulebookDigest, reportA.geometryDigest]) {
    assert.ok(html.includes(digest), 'preview pins the run digests')
  }
  assert.ok(html.includes(reportA.slice), 'preview names the slice')
  for (const factId of ['fact.requested-du', 'fact.density-ceiling', 'fact.placed-du', 'fact.shortfall-du']) {
    const fact = reportA.facts.find((candidate) => candidate.id === factId)!
    assert.ok(html.includes(`</b> ${fact.value} DU<`), `${factId} value visible in preview`)
  }

  // Independent inline-SVG parity against the manifest's canonical rings.
  const manifest = loadManifest(dirA1)
  const svgFeatures = new Map<string, [number, number][]>()
  for (const match of html.matchAll(/<polygon data-id="f\.([^"]+)" points="([^"]+)"/g)) {
    svgFeatures.set(
      match[1]!,
      match[2]!.split(' ').map((pair) => {
        const [x, y] = pair.split(',')
        return [Number(x), Number(y)] as [number, number]
      }),
    )
  }
  const site = manifest.features.find((feature) => feature.id === 'site-boundary')!
  const siteWorld = ringBounds(site.ring)
  const sitePixel = ringBounds(svgFeatures.get('site-boundary')!)
  const scale = (sitePixel.maxX - sitePixel.minX) / siteWorld.w
  for (const feature of manifest.features) {
    const pixels = svgFeatures.get(feature.id)
    assert.ok(pixels && pixels.length >= 3, `preview SVG has ${feature.id}`)
    const expected = ringBounds(feature.ring)
    const actual = ringBounds(pixels!)
    const measuredMinX = siteWorld.minX + (actual.minX - sitePixel.minX) / scale
    const measuredMinY = siteWorld.minY + (sitePixel.maxY - actual.maxY) / scale
    assert.ok(Math.abs(measuredMinX - expected.minX) < 0.05, `${feature.id} x parity`)
    assert.ok(Math.abs(measuredMinY - expected.minY) < 0.05, `${feature.id} y parity`)
    assert.ok(Math.abs(actual.w / scale - expected.w) < 0.1, `${feature.id} width parity`)
    assert.ok(Math.abs(actual.h / scale - expected.h) < 0.1, `${feature.id} height parity`)
  }

  // Rendered visibility is part of parity. A canonical bay that exists in the
  // SVG but is painted wholly beneath a later opaque decor polygon is not
  // "indicated on plan" to a human viewer (THD-17 / Sol 064).
  type PaintedPolygon = {
    order: number
    id: string
    bounds: ReturnType<typeof ringBounds>
    opaqueFill: boolean
  }
  const paintedPolygons: PaintedPolygon[] = []
  let polygonOrder = 0
  for (const match of html.matchAll(/<polygon\b[^>]*>/g)) {
    const tag = match[0]
    const id = tag.match(/\bdata-id="([^"]+)"/)?.[1]
    const points = tag.match(/\bpoints="([^"]+)"/)?.[1]
    const fill = tag.match(/\bfill="([^"]+)"/)?.[1]
    const opacity = Number(tag.match(/\bopacity="([^"]+)"/)?.[1] ?? '1')
    const fillOpacity = Number(tag.match(/\bfill-opacity="([^"]+)"/)?.[1] ?? '1')
    if (id && points) {
      paintedPolygons.push({
        order: polygonOrder,
        id,
        bounds: ringBounds(points.split(' ').map((pair) => pair.split(',').map(Number) as [number, number])),
        opaqueFill: Boolean(fill && fill.toLowerCase() !== 'none' && opacity >= 0.999 && fillOpacity >= 0.999),
      })
    }
    polygonOrder += 1
  }
  const fullyHiddenParking = paintedPolygons
    .filter((polygon) => polygon.id.startsWith('f.parking-'))
    .filter((bay) => paintedPolygons.some((cover) => (
      cover.order > bay.order
      && cover.id.startsWith('deco.')
      && cover.opaqueFill
      && cover.bounds.minX <= bay.bounds.minX
      && cover.bounds.minY <= bay.bounds.minY
      && cover.bounds.maxX >= bay.bounds.maxX
      && cover.bounds.maxY >= bay.bounds.maxY
    )))
    .map((polygon) => polygon.id)
  assert.equal(
    fullyHiddenParking.length,
    0,
    `${fullyHiddenParking.length} canonical parking bays hidden under later opaque decor: ${fullyHiddenParking.slice(0, 8).join(', ')}`,
  )

  // Gate: green baseline, then the required kill mutations.
  assert.equal(verifyWithPreview(dirA2).status, 0, 'gate green with current preview')

  // 1. Stale: B's preview beside A's package.
  writeFileSync(PREVIEW, previewB)
  {
    const result = verifyWithPreview(dirA2)
    assert.notEqual(result.status, 0, 'stale (B) preview beside A package fails')
    assert.ok(result.output.includes('preview.DEMO.html'), 'names the preview')
    assert.ok(/Digest|stale/i.test(result.output), 'names the stale field')
  }
  writeFileSync(PREVIEW, previewA2)

  // 2. Missing preview.
  {
    const result = verifyWithPreview(dirA2, join(projectRoot, 'no-such-preview.DEMO.html'))
    assert.notEqual(result.status, 0, 'missing preview fails')
    assert.ok(result.output.includes('preview.DEMO.html'))
  }
  // 3. Changed verdict number (the density ceiling: its value is unique on
  //    the page, so the tamper hits exactly one rendered fact).
  {
    const ceiling = reportA.facts.find((candidate) => candidate.id === 'fact.density-ceiling')!.value
    writeFileSync(
      PREVIEW,
      previewA2.toString('utf8').replace(`</b> ${ceiling} DU<`, `</b> ${ceiling + 7} DU<`),
    )
    const result = verifyWithPreview(dirA2)
    assert.notEqual(result.status, 0, 'tampered verdict number fails')
    assert.ok(result.output.includes('fact.density-ceiling'), 'names the tampered field')
    writeFileSync(PREVIEW, previewA2)
  }
  // 4. Removed watermark.
  {
    writeFileSync(PREVIEW, previewA2.toString('utf8').replace('>DEMO</text>', '></text>'))
    const result = verifyWithPreview(dirA2)
    assert.notEqual(result.status, 0, 'removed watermark fails')
    assert.ok(result.output.includes('watermark'))
    writeFileSync(PREVIEW, previewA2)
  }
  // 5. External dependency added.
  {
    writeFileSync(
      PREVIEW,
      previewA2.toString('utf8').replace('</div>\n', '</div>\n<script src="https://example.com/x.js"></script>\n'),
    )
    const result = verifyWithPreview(dirA2)
    assert.notEqual(result.status, 0, 'external dependency fails')
    assert.ok(result.output.includes('external dependency'))
    writeFileSync(PREVIEW, previewA2)
  }
  // 6. Sol's 045 §1 bypass: a RELATIVE asset is exactly as disqualifying as
  //    a remote one — the allowlist gate must refuse any fetch-capable
  //    construct, not just http(s)-shaped references.
  {
    writeFileSync(
      PREVIEW,
      previewA2.toString('utf8').replace('<div class="sheet">', '<img src="missing-local-asset.png">\n<div class="sheet">'),
    )
    const result = verifyWithPreview(dirA2)
    assert.notEqual(result.status, 0, 'relative local asset must fail the offline allowlist')
    assert.ok(result.output.includes('preview.DEMO.html'))
    assert.ok(/self-contained|fetch-capable/i.test(result.output))
    writeFileSync(PREVIEW, previewA2)
  }
  // 7. Sol's 045 §2 bypass: deform a ring while PRESERVING its bounding box
  //    (duplicate the second vertex onto the first — every rect extreme
  //    appears twice, so min/max extents are unchanged). Vertex-level parity
  //    must still catch it.
  {
    const tampered = previewA2.toString('utf8').replace(
      /<polygon data-id="f\.pool" points="([^"]+)"/,
      (_match, points: string) => {
        const vertices = points.split(' ')
        vertices[1] = vertices[0]!
        return `<polygon data-id="f.pool" points="${vertices.join(' ')}"`
      },
    )
    writeFileSync(PREVIEW, tampered)
    const result = verifyWithPreview(dirA2)
    assert.notEqual(result.status, 0, 'same-bounding-box deformation must fail ring parity')
    assert.ok(result.output.includes('pool'), 'names the deformed feature')
    assert.ok(/vertex|degenerate/i.test(result.output), 'reports the vertex-level evidence')
    writeFileSync(PREVIEW, previewA2)
  }
  // 8. One inline planning feature moved.
  {
    const tampered = previewA2.toString('utf8').replace(
      /<polygon data-id="f\.pool" points="([^"]+)"/,
      (_match, points: string) => {
        const shifted = points
          .split(' ')
          .map((pair) => {
            const [x, y] = pair.split(',')
            return `${(Number(x) + 40).toFixed(2)},${y}`
          })
          .join(' ')
        return `<polygon data-id="f.pool" points="${shifted}"`
      },
    )
    writeFileSync(PREVIEW, tampered)
    const result = verifyWithPreview(dirA2)
    assert.notEqual(result.status, 0, 'moved inline feature fails')
    assert.ok(result.output.includes('f.pool') || result.output.includes('pool'), 'names the feature')
    writeFileSync(PREVIEW, previewA2)
  }
  const adjacentBypasses: string[] = []
  // 9. Sol's v0.2 adjacent bypass: CSS escapes are decoded by the browser
  //    before resource resolution. `u\\72l(...)` is a real `url(...)` fetch,
  //    so a raw-string pattern ban is not an offline allowlist.
  {
    const tampered = previewA2.toString('utf8').replace(
      'body { background:#e9e7df;',
      'body { background:#e9e7df; background-image:u\\72l("missing-local-background.png");',
    )
    writeFileSync(PREVIEW, tampered)
    const result = verifyWithPreview(dirA2)
    if (result.status === 0) adjacentBypasses.push('CSS-escaped external asset')
    else assert.ok(/self-contained|fetch-capable|external dependency/i.test(result.output))
    writeFileSync(PREVIEW, previewA2)
  }
  // 10. Sol's v0.2 rendered-geometry bypass: unchanged raw points do not
  //     prove visual parity when an SVG transform moves the rendered feature.
  {
    const tampered = previewA2.toString('utf8').replace(
      /(<polygon data-id="f\.pool" points="[^"]+")/,
      '$1 transform="translate(40 0)"',
    )
    writeFileSync(PREVIEW, tampered)
    const result = verifyWithPreview(dirA2)
    if (result.status === 0) adjacentBypasses.push('rendered SVG transform')
    else {
      assert.ok(result.output.includes('pool'), 'names the transformed feature')
      assert.ok(/transform|render|geometry|vertex/i.test(result.output), 'names rendered-geometry evidence')
    }
    writeFileSync(PREVIEW, previewA2)
  }
  // 11. THD-18 visibility is rendered visibility, not raw-source presence.
  //     A truthful reason hidden in a comment cannot excuse a forged visible
  //     line, even though both strings exist in the HTML bytes.
  {
    const html = previewA2.toString('utf8')
    const reasonMatch = html.match(/<div class="note">(DEMO — imaginary site representing no jurisdiction:[^<]+)<\/div>/)
    assert.ok(reasonMatch, 'locates the generated visible actionability reason')
    const tampered = html.replace(
      reasonMatch[0],
      `<div class="note">FORGED — fully sanctioned today.</div><!-- ${reasonMatch[1]} -->`,
    )
    writeFileSync(PREVIEW, tampered)
    const result = verifyWithPreview(dirA2)
    if (result.status === 0) adjacentBypasses.push('comment-only truthful actionability reason')
    else assert.ok(/actionability|reason|visible/i.test(result.output), 'names the visible claim surface')
    writeFileSync(PREVIEW, previewA2)
  }
  // 12. A positive attribute allowlist must consume every attribute token the
  //     browser consumes. HTML permits unquoted values; ignoring them lets a
  //     rendered SVG transform move canonical geometry without being judged.
  {
    const tampered = previewA2.toString('utf8').replace(
      /(<polygon data-id="f\.pool" points="[^"]+")/,
      '$1 transform=translate(40,0)',
    )
    writeFileSync(PREVIEW, tampered)
    const result = verifyWithPreview(dirA2)
    if (result.status === 0) adjacentBypasses.push('unquoted rendered SVG transform')
    else {
      assert.ok(result.output.includes('pool'), 'names the unquoted transformed feature')
      assert.ok(/transform|attribute|render|geometry/i.test(result.output), 'names the render construct')
    }
    writeFileSync(PREVIEW, previewA2)
  }
  // 13. An allowed vocabulary is not an allowed tree. A new, unbound polygon
  //     painted last can cover the entire map while every canonical feature
  //     and coordinate remains untouched underneath it.
  {
    const tampered = previewA2.toString('utf8').replace(
      '</svg>',
      '<polygon points="0,0 1078,0 1078,908 0,908" fill="#ffffff" stroke="#ffffff" stroke-width="1"/>\n</svg>',
    )
    writeFileSync(PREVIEW, tampered)
    const result = verifyWithPreview(dirA2)
    if (result.status === 0) adjacentBypasses.push('allowed full-map overlay polygon')
    else assert.ok(/polygon|feature|geometry|render|allowlist/i.test(result.output), 'names the extra rendered node')
    writeFileSync(PREVIEW, previewA2)
  }
  // 14. CSS numeric spellings are semantic. `0.0` computes to the same fully
  //     transparent value as `0`; a denylist for one literal spelling does not
  //     prove that the required reason is human-visible.
  {
    const tampered = previewA2.toString('utf8').replace(
      '</style>',
      '  .note { opacity:0.0; }\n</style>',
    )
    writeFileSync(PREVIEW, tampered)
    const result = verifyWithPreview(dirA2)
    if (result.status === 0) adjacentBypasses.push('computed-transparent actionability reason')
    else assert.ok(/opacity|visibility|actionability|reason|render/i.test(result.output), 'names the hidden claim surface')
    writeFileSync(PREVIEW, previewA2)
  }
  // 15. The computed truthful node must be exclusive, not merely present.
  //     Keeping `unknown` while adding a second visible `yes` claim is still a
  //     browser-visible promotion and must fail THD-18.
  {
    const tampered = previewA2.toString('utf8').replace(
      '<div><b>Classification:</b> demo-illustrative</div>',
      '<div>Sanctionable today: yes — fully sanctioned.</div>\n        <div><b>Classification:</b> demo-illustrative</div>',
    )
    writeFileSync(PREVIEW, tampered)
    const result = verifyWithPreview(dirA2)
    if (result.status === 0) adjacentBypasses.push('additional visible sanctionable-today yes claim')
    else assert.ok(/sanctionable|actionability|claim|visible/i.test(result.output), 'names the contradictory claim')
    writeFileSync(PREVIEW, previewA2)
  }
  assert.deepEqual(
    adjacentBypasses,
    [],
    `preview gate accepted rendered-semantics bypasses: ${adjacentBypasses.join(', ')}`,
  )
  // Restored: green again.
  assert.equal(verifyWithPreview(dirA2).status, 0, 'gate green after restoration')
})
