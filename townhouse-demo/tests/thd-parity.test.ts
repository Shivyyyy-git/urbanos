// THD-13 technical/presentation/DXF parity · THD-14 presentation-only tamper.
// The oracle measures vector paths; digests never count as evidence.

import assert from 'node:assert/strict'
import { copyFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import {
  comparePackageGeometry,
  freshDir,
  latin1,
  listArtifacts,
  readArtifact,
  rewritePdfContents,
  runGenerate,
  writeBytes,
} from './helpers.ts'

const dir = freshDir('parity')
const run = runGenerate('a', dir)

test('THD-13: technical and presentation geometry are the same plan', () => {
  assert.equal(run.status, 0)
  const findings = comparePackageGeometry(dir)
  assert.deepEqual(findings, [], `parity findings:\n${findings.join('\n')}`)
})

function copyPackage(from: string): string {
  const to = freshDir('parity-mutant')
  for (const name of listArtifacts(from)) copyFileSync(join(from, name), join(to, name))
  return to
}

test('THD-14: presentation-only tamper is detected and named', () => {
  // Mutation 1: move one townhouse block ~2 m east in the presentation PDF
  // only; printed digests untouched.
  {
    const mutantDir = copyPackage(dir)
    const target = readArtifact(mutantDir, '-presentation-map.pdf')
    const shifted = rewritePdfContents(target.bytes, (content) => {
      const blocks = content.split('% URBANOS_PATH ')
      const index = blocks.findIndex((block) => block.startsWith('f.plot-w-00-00'))
      assert.ok(index > 0, 'plot block found in presentation PDF')
      blocks[index] = blocks[index]!.replace(
        /^([\d.-]+) ([\d.-]+) (m|l)$/gm,
        (_match, x: string, y: string, op: string) => `${(Number(x) + 8).toFixed(6)} ${y} ${op}`,
      )
      return blocks.join('% URBANOS_PATH ')
    })
    writeBytes(mutantDir, target.filename, shifted)
    const findings = comparePackageGeometry(mutantDir)
    assert.ok(findings.length > 0, 'tampered block must be detected')
    assert.ok(
      findings.some((finding) => finding.includes('plot-w-00-00') && finding.includes('presentation')),
      `findings name the moved feature: ${findings.join(' | ')}`,
    )
  }
  // Mutation 2: delete one road segment from the presentation PDF only.
  {
    const mutantDir = copyPackage(dir)
    const target = readArtifact(mutantDir, '-presentation-map.pdf')
    const removed = rewritePdfContents(target.bytes, (content) => {
      const blocks = content.split('% URBANOS_PATH ')
      const index = blocks.findIndex((block) => block.startsWith('f.road-secondary-w-1'))
      assert.ok(index > 0, 'road block found in presentation PDF')
      // Drop the path operators, keep the trailing chunk after the block's Q.
      const block = blocks[index]!
      const qEnd = block.indexOf('\nQ\n')
      blocks[index] = `${block.slice(0, block.indexOf('\n') + 1)}${block.slice(qEnd + 3)}`
      return blocks.join('% URBANOS_PATH ')
    })
    writeBytes(mutantDir, target.filename, removed)
    const findings = comparePackageGeometry(mutantDir)
    assert.ok(
      findings.some((finding) => finding.includes('road-secondary-w-1') && finding.includes('missing')),
      `findings name the deleted road: ${findings.join(' | ')}`,
    )
  }
})
