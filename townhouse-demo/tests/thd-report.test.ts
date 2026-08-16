// THD-07 truthful provenance · THD-09 computed inescapable stamp ·
// THD-10 upward-override kills.

import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  DEMO_STAMP,
  FIXTURE_FIELD_IDS,
  TownhouseDemoError,
  buildCommunityPackage,
  communityOneSite,
  computeDemoStamp,
  demoSliceA,
  demoSliceB,
  resolveDemoRulebook,
  type CommunityEnvelopeReport,
  type DemoRuleEntry,
} from '../src/index.ts'
import {
  freshDir,
  latin1,
  pageTextStrings,
  pdfPages,
  readArtifact,
  runGenerate,
} from './helpers.ts'

const dir = freshDir('report')
const run = runGenerate('a', dir)

function loadReport(): CommunityEnvelopeReport {
  return JSON.parse(
    readArtifact(dir, '-envelope-report.json').bytes.toString('utf8'),
  ) as CommunityEnvelopeReport
}

test('THD-07: every report planning number has truthful provenance', () => {
  assert.equal(run.status, 0)
  const report = loadReport()
  const factsById = new Map(report.facts.map((fact) => [fact.id, fact]))
  const citationIds = new Set(report.citations.map((row) => row.entryId))
  const fixtureFieldSet = new Set<string>(FIXTURE_FIELD_IDS)

  // JSON-side chain: every fact is typed and every reference resolves.
  for (const fact of report.facts) {
    assert.ok(['fixture-input', 'rule-value', 'derived'].includes(fact.kind), `${fact.id} typed`)
    for (const ref of fact.fixtureRefs) {
      assert.ok(fixtureFieldSet.has(ref), `${fact.id} cites existing fixture field ${ref}`)
    }
    for (const ref of fact.ruleRefs) {
      assert.ok(citationIds.has(ref), `${fact.id} cites selected entry ${ref}`)
      assert.ok(!ref.startsWith('DEMO-B-'), `${fact.id} must not cite the other slice`)
    }
    if (fact.kind === 'fixture-input') {
      assert.ok(fact.fixtureRefs.length > 0, `${fact.id} raw input cites the fixture`)
      assert.equal(fact.ruleRefs.length, 0, `${fact.id} raw input cites no rule entry`)
    }
    if (fact.kind === 'rule-value') {
      assert.equal(fact.ruleRefs.length, 1, `${fact.id} rule value cites exactly one entry`)
    }
    if (fact.kind === 'derived') {
      assert.ok(
        fact.fixtureRefs.length + fact.ruleRefs.length > 0,
        `${fact.id} derived fact lists its feeders`,
      )
    }
  }
  // Rule facts match the citation snapshot, including status.
  const rulebook = resolveDemoRulebook(demoSliceA)
  for (const row of report.citations) {
    const entry = rulebook.entries.find((candidate) => candidate.id === row.entryId)
    assert.ok(entry, `citation snapshot row ${row.entryId} is a selected entry`)
    assert.equal(row.value, entry!.value)
    assert.equal(row.unit, entry!.unit)
    assert.equal(row.classification, 'demo-illustrative')
    assert.equal(row.verification, 'unverified')
  }
  for (const fact of report.facts.filter((candidate) => candidate.kind === 'rule-value')) {
    const row = report.citations.find((candidate) => candidate.entryId === fact.ruleRefs[0])
    assert.ok(row && row.value === fact.value, `${fact.id} equals its cited entry value`)
  }

  // PDF side: every visible `value unit [fact.id]` line reconciles with JSON.
  const pages = pdfPages(latin1(readArtifact(dir, '-envelope-report.pdf').bytes))
  const tagged: { value: number; factId: string }[] = []
  const seenFactIds = new Set<string>()
  for (const content of pages) {
    for (const text of pageTextStrings(content)) {
      const match = /(-?[\d.]+) [A-Za-z%][\w/%-]* \[(fact\.[a-z0-9.-]+)\]/.exec(text)
      if (match) tagged.push({ value: Number(match[1]), factId: match[2]! })
      for (const idMatch of text.matchAll(/\[(fact\.[a-z0-9.-]+)\]/g)) seenFactIds.add(idMatch[1]!)
    }
  }
  assert.ok(tagged.length >= 25, `report PDF exposes tagged planning numbers (got ${tagged.length})`)
  for (const { value, factId } of tagged) {
    const fact = factsById.get(factId)
    assert.ok(fact, `printed fact id ${factId} exists in JSON`)
    assert.ok(Math.abs(fact!.value - value) <= 0.001, `${factId}: printed ${value} vs JSON ${fact!.value}`)
  }
  // Every JSON fact is visible in the PDF at least once (no hidden numbers).
  for (const fact of report.facts) {
    assert.ok(seenFactIds.has(fact.id), `${fact.id} appears in the report PDF`)
  }
  // Raw site inputs are labelled fixture inputs, not rules (site width probe).
  const siteWidth = factsById.get('fact.site-width')!
  assert.equal(siteWidth.kind, 'fixture-input')
  assert.deepEqual([...siteWidth.ruleRefs], [])
})

test('THD-09: baseline DEMO stamp is computed and inescapable', () => {
  for (const slice of [demoSliceA, demoSliceB]) {
    const rulebook = resolveDemoRulebook(slice)
    const pkg = buildCommunityPackage(communityOneSite, rulebook)
    assert.equal(pkg.report.stamp, DEMO_STAMP)
    assert.equal(computeDemoStamp(rulebook.entries), DEMO_STAMP, 'single stamp computation feeds outputs')
  }
  // No output status may read as an upward stamp. 'unverified' is allowed;
  // the standalone word 'verified' (incl. mannu-verified) is not.
  const upward = /prepared for professional review|approved|compliant|(?<![a-z-])verified/i
  const pages = [
    ...pdfPages(latin1(readArtifact(dir, '-envelope-report.pdf').bytes)),
    ...pdfPages(latin1(readArtifact(dir, '-technical-sheet.pdf').bytes)),
    ...pdfPages(latin1(readArtifact(dir, '-presentation-map.pdf').bytes)),
  ]
  for (const content of pages) {
    for (const text of pageTextStrings(content)) {
      assert.ok(!upward.test(text.replace(/unverified/gi, '')), `no upward status text: "${text}"`)
    }
  }
  const reportRaw = readArtifact(dir, '-envelope-report.json').bytes.toString('utf8')
  assert.ok(!/Prepared for Professional Review/.test(reportRaw))
})

test('THD-10: upward-override attempts are killed', () => {
  // 1. All but one cited entry claims verified -> resolution refuses.
  assert.throws(
    () => resolveDemoRulebook(demoSliceA.map((entry, index) =>
      index === 0 ? entry : { ...entry, verification: 'mannu-verified' as const })),
    (error: unknown) => error instanceof TownhouseDemoError && error.code === 'E_RULE_ENTRY_NOT_DEMO',
  )
  // 2. Every entry forged verified but still DEMO-classified -> refused too;
  //    and even if such entries reached the stamp computation, demo
  //    classification alone locks the DEMO stamp.
  assert.throws(
    () => resolveDemoRulebook(demoSliceA.map((entry) => ({ ...entry, verification: 'mannu-verified' as const }))),
    (error: unknown) => error instanceof TownhouseDemoError && error.code === 'E_RULE_ENTRY_NOT_DEMO',
  )
  const forged = demoSliceA.map((entry) => ({ ...entry, verification: 'mannu-verified' as const }))
  assert.equal(computeDemoStamp(forged), DEMO_STAMP, 'demo classification outranks forged verification')

  // Stamp predicate itself: with non-demo entries, ANY unverified citation
  // forces Research Draft. (This is the mutation target: any -> all must
  // flip this assertion.)
  const production = (verification: 'unverified' | 'mannu-verified'): Pick<DemoRuleEntry, 'classification' | 'verification'> =>
    ({ classification: 'production' as unknown as DemoRuleEntry['classification'], verification })
  const mixed = [production('mannu-verified'), production('mannu-verified'), production('unverified')]
  assert.equal(
    computeDemoStamp(mixed),
    'Research Draft — Not for Construction',
    'one unverified citation among verified ones must force Research Draft',
  )

  // 3. A caller cannot supply a stamp through request/config input.
  const rulebook = resolveDemoRulebook(demoSliceA)
  const hostileSite = {
    ...communityOneSite,
    stamp: 'Prepared for Professional Review',
    status: 'approved',
  } as unknown as typeof communityOneSite
  const hostileRulebook = {
    ...rulebook,
    stamp: 'Prepared for Professional Review',
  } as unknown as typeof rulebook
  const pkg = buildCommunityPackage(hostileSite, hostileRulebook)
  assert.equal(pkg.report.stamp, DEMO_STAMP, 'no writable stamp field exists')
  for (const artifact of pkg.artifacts) {
    if (artifact.filename.endsWith('.json')) {
      const parsed = JSON.parse(Buffer.from(artifact.bytes).toString('utf8')) as { stamp?: string }
      assert.equal(parsed.stamp, DEMO_STAMP)
    }
  }
})
