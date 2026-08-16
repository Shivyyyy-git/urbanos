// THD-01, THD-02 — rulebook resolution and fixture validation (in-process).

import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  REQUIRED_DEMO_SLOTS,
  SLOT_UNITS,
  TownhouseDemoError,
  communityOneSite,
  demoSliceA,
  demoSliceB,
  resolveDemoRulebook,
  validateSiteFixture,
  type DemoRuleEntry,
  type DemoSiteFixture,
} from '../src/index.ts'

function expectCode(fn: () => unknown, code: string): TownhouseDemoError {
  try {
    fn()
  } catch (error) {
    assert.ok(error instanceof TownhouseDemoError, `expected TownhouseDemoError, got ${String(error)}`)
    assert.equal(error.code, code)
    return error
  }
  assert.fail(`expected ${code}, but no error was thrown`)
}

test('THD-01: rulebook resolution is complete, pure, and fail-closed', () => {
  for (const [label, slice] of [['A', demoSliceA], ['B', demoSliceB]] as const) {
    const resolved = resolveDemoRulebook(slice)
    assert.equal(resolved.entries.length, REQUIRED_DEMO_SLOTS.length, `slice ${label} count`)
    const slots = resolved.entries.map((entry) => entry.slot)
    assert.equal(new Set(slots).size, slots.length, `slice ${label} unique slots`)
    for (const slot of REQUIRED_DEMO_SLOTS) assert.ok(slots.includes(slot), `slice ${label} has ${slot}`)
    assert.equal(new Set(resolved.entries.map((entry) => entry.id)).size, resolved.entries.length)
    for (const entry of resolved.entries) {
      assert.equal(entry.unit, SLOT_UNITS[entry.slot], `${entry.id} unit pairing`)
      assert.ok(Number.isFinite(entry.value) && entry.value > 0, `${entry.id} usable value`)
      assert.equal(entry.classification, 'demo-illustrative')
      assert.equal(entry.verification, 'unverified')
      assert.equal(entry.applicability.kind, 'site-wide')
      assert.equal(entry.source.documentRef, 'demo — illustrative (no real-world document)')
      assert.ok(entry.version.id.length > 0, `${entry.id} version identity`)
    }
  }

  // Canonical digest: order-independent, value/version-sensitive.
  const base = resolveDemoRulebook(demoSliceA)
  const reordered = resolveDemoRulebook([...demoSliceA].reverse())
  assert.equal(base.digest, reordered.digest, 'reordering must not change the digest')
  const changedValue = demoSliceA.map((entry) =>
    entry.slot === 'height-max' ? { ...entry, value: entry.value + 1 } : entry,
  )
  assert.notEqual(resolveDemoRulebook(changedValue).digest, base.digest, 'value change must change digest')
  const changedVersion = demoSliceA.map((entry) =>
    entry.slot === 'height-max' ? { ...entry, version: { ...entry.version, id: `${entry.id}#v9` } } : entry,
  )
  assert.notEqual(resolveDemoRulebook(changedVersion).digest, base.digest, 'version change must change digest')

  // Hostile: remove each required slot in turn — 14/14 named refusals.
  for (const slot of REQUIRED_DEMO_SLOTS) {
    const error = expectCode(
      () => resolveDemoRulebook(demoSliceA.filter((entry) => entry.slot !== slot)),
      'E_RULE_SLOT_MISSING',
    )
    assert.equal(error.finding.detail, slot, `refusal must name slot ${slot}`)
  }

  // Duplicate slot.
  const first = demoSliceA[0]!
  expectCode(
    () => resolveDemoRulebook([...demoSliceA, { ...first, id: `${first.id}-COPY`, version: { id: 'x#v1', supersedes: null } }]),
    'E_RULE_SLOT_DUPLICATE',
  )
  // Mixed slices.
  expectCode(
    () => resolveDemoRulebook([...demoSliceA.slice(0, 13), demoSliceB[13]!]),
    'E_RULE_SLICE_MIXED',
  )
  // Non-demo classification / forged verification.
  expectCode(
    () => resolveDemoRulebook(demoSliceA.map((entry, index) =>
      index === 3 ? ({ ...entry, classification: 'production' } as unknown as DemoRuleEntry) : entry)),
    'E_RULE_ENTRY_NOT_DEMO',
  )
  expectCode(
    () => resolveDemoRulebook(demoSliceA.map((entry, index) =>
      index === 3 ? { ...entry, verification: 'mannu-verified' as const } : entry)),
    'E_RULE_ENTRY_NOT_DEMO',
  )
  // Malformed entries -> E_RULE_ENTRY_INVALID naming entry and field.
  const second = demoSliceA[1]!
  const invalidCases: [DemoRuleEntry[], string][] = [
    [[...demoSliceA.slice(0, 13), { ...demoSliceA[13]!, id: demoSliceA[0]!.id }], 'field "id"'],
    [demoSliceA.map((entry, index) => (index === 2 ? { ...entry, unit: 'percent' as const } : entry)), 'field "unit"'],
    [demoSliceA.map((entry, index) => (index === 2 ? { ...entry, value: Number.NaN } : entry)), 'field "value"'],
    [demoSliceA.map((entry, index) => (index === 2 ? { ...entry, value: Number.POSITIVE_INFINITY } : entry)), 'field "value"'],
    [demoSliceA.map((entry, index) => (index === 2 ? { ...entry, value: -4 } : entry)), 'field "value"'],
    [demoSliceA.map((entry) => (entry.slot === 'open-space-min' ? { ...entry, value: 140 } : entry)), 'field "value"'],
    [demoSliceA.map((entry) => (entry.slot === 'storeys-max' ? { ...entry, value: 2.5 } : entry)), 'field "value"'],
  ]
  for (const [entries, expectedDetail] of invalidCases) {
    const error = expectCode(() => resolveDemoRulebook(entries), 'E_RULE_ENTRY_INVALID')
    assert.ok(
      (error.finding.detail ?? '').includes(expectedDetail),
      `detail "${error.finding.detail}" names ${expectedDetail}`,
    )
  }
  void second

  // A non-applicable control entry changes neither the selected set nor the
  // digest — selection is predicate-driven, not array-length-driven.
  const control: DemoRuleEntry = {
    ...first,
    id: `${first.id}-CONTROL`,
    applicability: { kind: 'not-applicable', note: 'control entry for THD-01' },
    version: { id: `${first.id}-CONTROL#v1`, supersedes: null },
  }
  const withControl = resolveDemoRulebook([...demoSliceA, control])
  assert.equal(withControl.digest, base.digest, 'control entry must not change the digest')
  assert.equal(withControl.entries.length, base.entries.length)
})

test('THD-02: fixture validation refuses missing or unusable input', () => {
  validateSiteFixture(communityOneSite) // baseline sanity

  const cases: [string, (site: Record<string, unknown>) => void, string, string][] = [
    ['missing width', (site) => { delete site['widthM'] }, 'E_INPUT_MISSING', 'site.widthM'],
    ['missing depth', (site) => { delete site['depthM'] }, 'E_INPUT_MISSING', 'site.depthM'],
    ['missing north', (site) => { delete site['northBearingDeg'] }, 'E_INPUT_MISSING', 'site.northBearingDeg'],
    ['missing access road', (site) => { delete site['accessRoad'] }, 'E_INPUT_MISSING', 'site.accessRoad'],
    ['missing requested count', (site) => { delete site['requestedDwellingUnits'] }, 'E_INPUT_MISSING', 'site.requestedDwellingUnits'],
    ['non-finite width', (site) => { site['widthM'] = Number.NaN }, 'E_INPUT_INVALID', 'site.widthM'],
    ['non-positive depth', (site) => { site['depthM'] = 0 }, 'E_INPUT_INVALID', 'site.depthM'],
    ['undeclared north value', (site) => { site['northBearingDeg'] = 90 }, 'E_INPUT_INVALID', 'site.northBearingDeg'],
    ['unsupported access edge', (site) => { site['accessRoad'] = { edge: 'north', widthM: 24 } }, 'E_INPUT_INVALID', 'site.accessRoad.edge'],
    ['missing access width', (site) => { site['accessRoad'] = { edge: 'south' } }, 'E_INPUT_MISSING', 'site.accessRoad.widthM'],
    ['non-positive road width', (site) => { site['accessRoad'] = { edge: 'south', widthM: 0 } }, 'E_INPUT_INVALID', 'site.accessRoad.widthM'],
    ['non-integer requested count', (site) => { site['requestedDwellingUnits'] = 2.5 }, 'E_INPUT_INVALID', 'site.requestedDwellingUnits'],
    ['non-positive requested count', (site) => { site['requestedDwellingUnits'] = 0 }, 'E_INPUT_INVALID', 'site.requestedDwellingUnits'],
  ]
  for (const [label, corrupt, code, field] of cases) {
    const site = JSON.parse(JSON.stringify(communityOneSite)) as Record<string, unknown>
    corrupt(site)
    try {
      validateSiteFixture(site as unknown as DemoSiteFixture)
      assert.fail(`${label}: expected refusal`)
    } catch (error) {
      assert.ok(error instanceof TownhouseDemoError, `${label}: typed error`)
      assert.equal(error.code, code, `${label}: code`)
      assert.equal(error.finding.detail, field, `${label}: names the field`)
    }
  }
})
