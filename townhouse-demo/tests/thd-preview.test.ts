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
  // 3. Changed verdict number.
  {
    writeFileSync(PREVIEW, previewA2.toString('utf8').replace('</b> 140 DU<', '</b> 400 DU<'))
    const result = verifyWithPreview(dirA2)
    assert.notEqual(result.status, 0, 'tampered verdict number fails')
    assert.ok(result.output.includes('fact.placed-du'), 'names the tampered field')
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
  // 6. One inline planning feature moved.
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
  // Restored: green again.
  assert.equal(verifyWithPreview(dirA2).status, 0, 'gate green after restoration')
})
