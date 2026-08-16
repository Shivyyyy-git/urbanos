// THD-03 cold run · THD-04 byte determinism · THD-05 DEMO/stamp coverage ·
// THD-06 watermark-kill mutations. All observations are made on artifact
// bytes produced by the single documented command in a fresh directory.

import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { copyFileSync, readFileSync, renameSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { DEMO_STAMP } from '../src/index.ts'

/** The locked stamp as it sits in the cp1252-encoded DXF byte stream. */
const DEMO_STAMP_CP1252 = DEMO_STAMP.replace('—', '\x97').replace('·', '\xb7')
import {
  freshDir,
  latin1,
  listArtifacts,
  parseDxf,
  pageTextStrings,
  pdfPages,
  readArtifact,
  rewritePdfContents,
  runGenerate,
  runVerify,
  writeBytes,
} from './helpers.ts'

const ROLE_SUFFIXES = [
  '-technical-sheet.dxf',
  '-technical-sheet.pdf',
  '-presentation-map.pdf',
  '-envelope-report.pdf',
  '-envelope-report.json',
  '-parity-manifest.json',
] as const

const dirA = freshDir('cold-a')
const coldRun = runGenerate('a', dirA)

test('THD-03: cold, non-interactive full-package run', () => {
  assert.equal(coldRun.status, 0, `generator exited non-zero:\n${coldRun.stdout}`)
  const files = listArtifacts(dirA)
  assert.equal(files.length, ROLE_SUFFIXES.length, `expected ${ROLE_SUFFIXES.length} artifacts, got ${files.join(', ')}`)
  for (const suffix of ROLE_SUFFIXES) {
    const artifact = readArtifact(dirA, suffix)
    assert.ok(artifact.bytes.length > 0, `${artifact.filename} is non-empty`)
  }
  // Independent parses per type.
  const dxf = parseDxf(latin1(readArtifact(dirA, '-technical-sheet.dxf').bytes))
  assert.ok(dxf.paths.length > 10, 'DXF paths parse')
  for (const suffix of ['-technical-sheet.pdf', '-presentation-map.pdf', '-envelope-report.pdf'] as const) {
    const pages = pdfPages(latin1(readArtifact(dirA, suffix).bytes))
    assert.ok(pages.length >= 1, `${suffix} has pages`)
    for (const [index, content] of pages.entries()) {
      assert.ok(content.length > 100, `${suffix} page ${index + 1} has drawable content`)
      assert.ok(content.includes(' Tj'), `${suffix} page ${index + 1} draws text`)
    }
  }
  const report = JSON.parse(readArtifact(dirA, '-envelope-report.json').bytes.toString('utf8')) as {
    stamp: string
  }
  assert.equal(report.stamp, DEMO_STAMP)
  const manifest = JSON.parse(readArtifact(dirA, '-parity-manifest.json').bytes.toString('utf8')) as {
    roles: Record<string, string>
  }
  // The role map points inside this package only.
  const files2 = new Set(listArtifacts(dirA))
  for (const [role, filename] of Object.entries(manifest.roles)) {
    assert.ok(files2.has(filename), `role ${role} -> ${filename} exists in the package`)
    assert.ok(!filename.includes('/'), `role ${role} does not point outside the package`)
  }
})

test('THD-04: byte determinism across fresh directories', () => {
  const dir2 = freshDir('cold-a2')
  const run2 = runGenerate('a', dir2)
  assert.equal(run2.status, 0)
  const names1 = listArtifacts(dirA)
  const names2 = listArtifacts(dir2)
  assert.deepEqual(names1, names2, 'sorted relative file lists are identical')
  for (const name of names1) {
    const hash1 = createHash('sha256').update(readFileSync(join(dirA, name))).digest('hex')
    const hash2 = createHash('sha256').update(readFileSync(join(dir2, name))).digest('hex')
    assert.equal(hash1, hash2, `${name} is byte-identical across runs`)
  }
})

test('THD-05: DEMO marker and locked-stamp coverage on every artifact', () => {
  const files = listArtifacts(dirA)
  assert.ok(files.length > 0, 'THD-05 must never pass vacuously on an empty package')
  for (const filename of files) {
    const tokens = filename.split(/[^A-Za-z0-9]+/)
    assert.ok(tokens.includes('DEMO'), `${filename} basename carries an uppercase DEMO token`)
    const bytes = readFileSync(join(dirA, filename))
    if (filename.endsWith('.pdf')) {
      const pages = pdfPages(latin1(bytes))
      assert.ok(pages.length >= 1)
      pages.forEach((content, index) => {
        const where = `${filename} page ${index + 1}`
        const texts = pageTextStrings(content)
        assert.ok(texts.includes('DEMO'), `${where} draws the DEMO watermark text`)
        assert.ok(texts.includes(DEMO_STAMP), `${where} draws the exact locked stamp`)
        // Visibility: the watermark block must be large and non-white.
        const at = content.indexOf('% URBANOS_WATERMARK')
        assert.ok(at >= 0, `${where} has the watermark block`)
        const block = content.slice(at, at + 700)
        const size = /\/F2 ([\d.]+) Tf/.exec(block)
        assert.ok(size && Number(size[1]) >= 40, `${where} watermark is large (${size?.[1]} pt)`)
        const fill = /([\d.]+) ([\d.]+) ([\d.]+) rg/.exec(block)
        assert.ok(fill, `${where} watermark sets an explicit fill`)
        for (const channel of [fill![1], fill![2], fill![3]]) {
          assert.ok(Number(channel) <= 0.9, `${where} watermark is not white-on-white`)
        }
      })
    } else if (filename.endsWith('.dxf')) {
      const dxf = parseDxf(latin1(bytes))
      const values = dxf.texts.map((text) => text.value)
      assert.ok(values.includes(DEMO_STAMP), `${filename} has a visible TEXT entity with the EXACT locked stamp`)
      assert.ok(latin1(bytes).includes('$DWGCODEPAGE'), `${filename} declares its codepage`)
      const demoText = dxf.texts.find((text) => text.value.trim() === 'DEMO')
      assert.ok(demoText && demoText.heightM > 0, `${filename} has a visible DEMO TEXT entity`)
      assert.ok(latin1(bytes).includes('URBANOS_CLASSIFICATION demo-illustrative'))
    } else {
      const parsed = JSON.parse(bytes.toString('utf8')) as { classification?: string; stamp?: string }
      assert.equal(parsed.classification, 'demo-illustrative', `${filename} structured classification`)
      assert.equal(parsed.stamp, DEMO_STAMP, `${filename} structured stamp`)
    }
  }
})

function copyPackage(from: string): string {
  const to = freshDir('mutant')
  for (const name of listArtifacts(from)) copyFileSync(join(from, name), join(to, name))
  return to
}

test('THD-06: watermark-kill mutations fail the gate, naming the artifact', () => {
  // 1. Remove DEMO from one filename.
  {
    const dir = copyPackage(dirA)
    const target = listArtifacts(dir).find((name) => name.endsWith('-presentation-map.pdf'))!
    const renamed = target.replace('DEMO-', '')
    renameSync(join(dir, target), join(dir, renamed))
    const result = runVerify(dir)
    assert.notEqual(result.status, 0, 'gate must fail on a filename without DEMO')
    assert.ok(result.output.includes(renamed), 'gate names the offending artifact')
  }
  // 2. Strip the visible watermark from page 2 (not page 1) of the report PDF.
  {
    const dir = copyPackage(dirA)
    const target = readArtifact(dir, '-envelope-report.pdf')
    const mutated = rewritePdfContents(target.bytes, (content, pageIndex) =>
      pageIndex === 1
        ? content.replace('% URBANOS_WATERMARK\n', '% MUTED\n').replace('(DEMO) Tj', '() Tj')
        : content,
    )
    writeBytes(dir, target.filename, mutated)
    const result = runVerify(dir)
    assert.notEqual(result.status, 0, 'gate must fail when one page loses its watermark')
    assert.ok(result.output.includes(target.filename), 'gate names the artifact')
    assert.ok(result.output.includes('page 2'), 'gate names the page')
  }
  // 3. Delete the DXF stamp entity.
  {
    const dir = copyPackage(dirA)
    const target = readArtifact(dir, '-technical-sheet.dxf')
    const mutated = latin1(target.bytes).replace(`\n${DEMO_STAMP_CP1252}\n`, '\nMUTED\n')
    writeBytes(dir, target.filename, Buffer.from(mutated, 'latin1'))
    const result = runVerify(dir)
    assert.notEqual(result.status, 0, 'gate must fail when the DXF stamp entity is gone')
    assert.ok(result.output.includes(target.filename))
  }
  // 4. Flip the JSON classification to production.
  {
    const dir = copyPackage(dirA)
    const target = readArtifact(dir, '-envelope-report.json')
    const mutated = target.bytes
      .toString('utf8')
      .replace('"classification": "demo-illustrative"', '"classification": "production"')
    writeBytes(dir, target.filename, Buffer.from(mutated))
    const result = runVerify(dir)
    assert.notEqual(result.status, 0, 'gate must fail when JSON classification is not demo')
    assert.ok(result.output.includes(target.filename))
  }
  // Control: an untouched copy still passes.
  assert.equal(runVerify(copyPackage(dirA)).status, 0, 'untouched copy passes the gate')
})
