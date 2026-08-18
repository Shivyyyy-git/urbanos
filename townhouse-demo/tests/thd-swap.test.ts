// THD-08 runtime rule-value sensitivity · THD-15 same-engine A -> B -> A swap.
// These two gates answer the principal red-team question: "how do I know
// these aren't two pre-drawn maps?"

import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import {
  buildCommunityPackage,
  communityOneSite,
  demoSliceA,
  resolveDemoRulebook,
  type CommunityEnvelopeReport,
  type DemoRuleEntry,
} from '../src/index.ts'
import {
  comparePackageGeometry,
  freshDir,
  latin1,
  listArtifacts,
  parseDxf,
  projectRoot,
  readArtifact,
  ringBounds,
  runGenerate,
} from './helpers.ts'

function supersede(
  entries: readonly DemoRuleEntry[],
  slot: DemoRuleEntry['slot'],
  value: number,
): DemoRuleEntry[] {
  const original = entries.find((entry) => entry.slot === slot)!
  const next: DemoRuleEntry = {
    ...original,
    id: `${original.id}-V2`,
    value,
    version: { id: `${original.id}-V2#v2`, supersedes: original.id },
  }
  return [...entries, next]
}

function packageBytes(pkg: ReturnType<typeof buildCommunityPackage>): Map<string, string> {
  return new Map(
    pkg.artifacts.map((artifact) => [
      artifact.filename,
      createHash('sha256').update(artifact.bytes).digest('hex'),
    ]),
  )
}

test('THD-08: a novel runtime rule value moves measured geometry', () => {
  const baseline = buildCommunityPackage(communityOneSite, resolveDemoRulebook(demoSliceA))

  // Probe 1: primary road width -> 13.7 m (present in neither stored slice).
  {
    const novel = 13.7
    const rulebook = resolveDemoRulebook(supersede(demoSliceA, 'road-width-primary', novel))
    assert.notEqual(rulebook.digest, baseline.rulebookDigest, 'digest tracks the new version')
    const pkg = buildCommunityPackage(communityOneSite, rulebook)
    assert.notEqual(pkg.geometryDigest, baseline.geometryDigest, 'geometry digest changes')
    const report = pkg.report
    const roadFact = report.facts.find((fact) => fact.id === 'fact.rule.road-width-primary')!
    assert.equal(roadFact.value, novel, 'report prints the novel value')
    assert.deepEqual([...roadFact.ruleRefs], ['DEMO-A-ROAD-WIDTH-PRIMARY-V2'], 'citation is the new version')
    assert.ok(
      report.citations.some((row) => row.entryId === 'DEMO-A-ROAD-WIDTH-PRIMARY-V2' && row.versionId.endsWith('#v2')),
      'citation snapshot carries the new version identity',
    )
    // Measure the shipped DXF: the spine must be exactly 13.7 m wide.
    const dxfArtifact = pkg.artifacts.find((artifact) => artifact.filename.endsWith('-technical-sheet.dxf'))!
    const dxf = parseDxf(latin1(Buffer.from(dxfArtifact.bytes)))
    const spine = dxf.paths.find((path) => path.id === 'f.road-primary-spine')!
    const bounds = ringBounds(spine.points)
    assert.ok(Math.abs(bounds.w - novel) < 1e-6, `spine measures ${bounds.w} m, expected ${novel}`)
  }
  // Probe 2: unit plot depth -> 16.3 m.
  {
    const novel = 16.3
    const pkg = buildCommunityPackage(
      communityOneSite,
      resolveDemoRulebook(supersede(demoSliceA, 'unit-plot-depth-min', novel)),
    )
    const dxfArtifact = pkg.artifacts.find((artifact) => artifact.filename.endsWith('-technical-sheet.dxf'))!
    const plots = parseDxf(latin1(Buffer.from(dxfArtifact.bytes))).paths.filter((path) =>
      path.id.startsWith('f.plot-'),
    )
    assert.ok(plots.length > 0)
    for (const plot of plots.slice(0, 5)) {
      assert.ok(Math.abs(ringBounds(plot.points).h - novel) < 1e-6, 'plot depth measures the novel value')
    }
    assert.notEqual(pkg.geometryDigest, baseline.geometryDigest)
  }
  // Recovery: original A reproduces its original bytes exactly.
  const again = buildCommunityPackage(communityOneSite, resolveDemoRulebook(demoSliceA))
  assert.deepEqual(packageBytes(again), packageBytes(baseline), 'original A recovers original bytes')
})

test('THD-15: same-engine rulebook swap A -> B -> A, isolated and measured', () => {
  const dirA1 = freshDir('swap-a1')
  const dirB = freshDir('swap-b')
  const dirA2 = freshDir('swap-a2')
  assert.equal(runGenerate('a', dirA1).status, 0)
  assert.equal(runGenerate('b', dirB).status, 0)
  assert.equal(runGenerate('a', dirA2).status, 0)

  // The two A packages are byte-identical (stateless engine).
  const namesA1 = listArtifacts(dirA1)
  assert.deepEqual(namesA1, listArtifacts(dirA2))
  for (const name of namesA1) {
    assert.equal(
      createHash('sha256').update(readFileSync(join(dirA1, name))).digest('hex'),
      createHash('sha256').update(readFileSync(join(dirA2, name))).digest('hex'),
      `${name} byte-identical across the A -> B -> A cycle`,
    )
  }

  const reportA = JSON.parse(readArtifact(dirA1, '-envelope-report.json').bytes.toString('utf8')) as CommunityEnvelopeReport
  const reportB = JSON.parse(readArtifact(dirB, '-envelope-report.json').bytes.toString('utf8')) as CommunityEnvelopeReport
  const factOf = (report: CommunityEnvelopeReport, id: string): number =>
    report.facts.find((fact) => fact.id === id)!.value

  // B ships the full package, DEMO-stamped, citing only B entries.
  assert.equal(listArtifacts(dirB).length, namesA1.length)
  assert.notEqual(reportB.rulebookDigest, reportA.rulebookDigest)
  for (const row of reportB.citations) assert.ok(row.entryId.startsWith('DEMO-B-'))
  for (const fact of reportB.facts) {
    for (const ref of fact.ruleRefs) assert.ok(ref.startsWith('DEMO-B-'), `${fact.id} cites B only`)
  }
  assert.equal(factOf(reportB, 'fact.density-ceiling'), 1250)
  assert.equal(factOf(reportA, 'fact.density-ceiling'), 2000)

  // Facts change in the direction of their rules.
  assert.ok(factOf(reportB, 'fact.green-provided') > factOf(reportA, 'fact.green-provided'), 'more open space under B')
  assert.ok(factOf(reportB, 'fact.placed-du') < factOf(reportA, 'fact.placed-du'), 'fewer, larger plots under B')

  // Measured geometry follows the governing entries.
  const spineWidth = (dir: string): number => {
    const dxf = parseDxf(latin1(readArtifact(dir, '-technical-sheet.dxf').bytes))
    return ringBounds(dxf.paths.find((path) => path.id === 'f.road-primary-spine')!.points).w
  }
  assert.ok(Math.abs(spineWidth(dirA1) - 12) < 1e-6)
  assert.ok(Math.abs(spineWidth(dirB) - 15) < 1e-6)
  const plotDepth = (dir: string): number => {
    const dxf = parseDxf(latin1(readArtifact(dir, '-technical-sheet.dxf').bytes))
    const plot = dxf.paths.find((path) => path.id.startsWith('f.plot-'))!
    const bounds = ringBounds(plot.points)
    return Math.max(bounds.w, bounds.h)
  }
  assert.ok(Math.abs(plotDepth(dirA1) - 15) < 1e-6)
  assert.ok(Math.abs(plotDepth(dirB) - 18) < 1e-6)

  // B stays internally consistent (parity oracle green on the swapped slice).
  assert.deepEqual(comparePackageGeometry(dirB), [])

  // Live stage command: prints slice ids, digests and a semantic diff.
  const diff = spawnSync(
    process.execPath,
    ['tools/generate-demo.mjs', 'diff', dirA1, dirB],
    { cwd: projectRoot, stdio: ['ignore', 'pipe', 'pipe'] },
  )
  assert.equal(diff.status, 0)
  const output = diff.stdout.toString()
  assert.ok(output.includes('DEMO-SLICE-A') && output.includes('DEMO-SLICE-B'))
  assert.ok(output.includes(reportA.rulebookDigest) && output.includes(reportB.rulebookDigest))
  assert.ok(output.includes('fact.placed-du'), 'semantic diff includes the placed-count change')
})
