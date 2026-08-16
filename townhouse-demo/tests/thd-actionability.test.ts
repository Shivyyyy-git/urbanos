// THD-18 — DEMO actionability can never claim sanctionable today. One
// computed object, type-locked below 'yes', threaded to every output, immune
// to forged promotion, and inert to stamp and geometry.

import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { test } from 'node:test'
import {
  DEMO_ACTIONABILITY_REASON,
  DEMO_STAMP,
  TownhouseDemoError,
  buildCommunityPackage,
  communityOneSite,
  computeDemoActionability,
  demoSliceA,
  demoSliceB,
  resolveDemoRulebook,
  type CommunityEnvelopeReport,
} from '../src/index.ts'
import {
  freshDir,
  latin1,
  pageTextStrings,
  parseDxf,
  pdfPages,
  projectRoot,
  readArtifact,
  runGenerate,
  runVerify,
  writeBytes,
} from './helpers.ts'
import { copyFileSync } from 'node:fs'
import { join } from 'node:path'
import { listArtifacts } from './helpers.ts'

test('THD-18: DEMO actionability is computed, threaded, and locked below yes', () => {
  // 1. Compile-time lock: the @ts-expect-error fixture must make the strict
  //    typecheck PASS (i.e. constructing 'yes'/'no' is an error). Mutating the
  //    type to admit 'yes' leaves the directive unused and turns this red.
  const typecheck = spawnSync(
    './node_modules/.bin/tsc',
    ['--noEmit', '-p', '.'],
    { cwd: projectRoot, stdio: ['ignore', 'pipe', 'pipe'] },
  )
  assert.equal(
    typecheck.status,
    0,
    `typecheck with the THD-18 type-lock fixture must pass:\n${typecheck.stdout?.toString()}${typecheck.stderr?.toString()}`,
  )

  // 2. The single computation: unknown, with the imaginary/no-jurisdiction
  //    reason; refuses to run over zero or non-demo entries.
  const rulebook = resolveDemoRulebook(demoSliceA)
  const actionability = computeDemoActionability(rulebook.entries)
  assert.equal(actionability.sanctionableToday, 'unknown')
  assert.ok(/imaginary/i.test(actionability.reason) && /no jurisdiction/i.test(actionability.reason))
  assert.ok(/instrument/i.test(actionability.reason) && /sweep/i.test(actionability.reason))
  assert.throws(
    () => computeDemoActionability([]),
    (error: unknown) => error instanceof TownhouseDemoError && error.code === 'E_STAMP_UNREACHABLE',
  )

  // 3. Forged promotion through request/config/runtime input is recomputed
  //    to unknown; the public contract has no writable actionability field.
  const hostileSite = {
    ...communityOneSite,
    actionability: { sanctionableToday: 'yes', reason: 'forged' },
  } as unknown as typeof communityOneSite
  const hostileRulebook = {
    ...rulebook,
    actionability: { sanctionableToday: 'yes', reason: 'forged' },
  } as unknown as typeof rulebook
  const pkg = buildCommunityPackage(hostileSite, hostileRulebook)
  assert.equal(pkg.report.actionability.sanctionableToday, 'unknown')
  assert.equal(pkg.report.actionability.reason, DEMO_ACTIONABILITY_REASON)

  // 4. Threaded to every output form, from the one computed object.
  for (const slice of ['a', 'b'] as const) {
    const dir = freshDir(`act-${slice}`)
    assert.equal(runGenerate(slice, dir).status, 0)
    const report = JSON.parse(
      readArtifact(dir, '-envelope-report.json').bytes.toString('utf8'),
    ) as CommunityEnvelopeReport
    assert.equal(report.actionability.sanctionableToday, 'unknown', `slice ${slice} JSON`)
    assert.equal(report.actionability.reason, DEMO_ACTIONABILITY_REASON)
    const manifest = JSON.parse(
      readArtifact(dir, '-parity-manifest.json').bytes.toString('utf8'),
    ) as { actionability?: { sanctionableToday?: string } }
    assert.equal(manifest.actionability?.sanctionableToday, 'unknown', `slice ${slice} manifest`)
    // Visible in the report PDF with its reason.
    const reportTexts = pdfPages(latin1(readArtifact(dir, '-envelope-report.pdf').bytes))
      .flatMap((content) => pageTextStrings(content))
      .join('\n')
    assert.ok(/Sanctionable today: unknown/.test(reportTexts), `slice ${slice} report PDF line`)
    assert.ok(/imaginary site/.test(reportTexts), `slice ${slice} report PDF reason`)
    // Summarised in both drawing title blocks (PDF text + DXF text).
    for (const suffix of ['-technical-sheet.pdf', '-presentation-map.pdf'] as const) {
      const texts = pdfPages(latin1(readArtifact(dir, suffix).bytes))
        .flatMap((content) => pageTextStrings(content))
        .join('\n')
      assert.ok(/SANCTIONABLE TODAY: UNKNOWN/.test(texts), `slice ${slice} ${suffix} title line`)
    }
    const dxfTexts = parseDxf(latin1(readArtifact(dir, '-technical-sheet.dxf').bytes))
      .texts.map((text) => text.value)
      .join('\n')
    assert.ok(/SANCTIONABLE TODAY: UNKNOWN/.test(dxfTexts), `slice ${slice} DXF title line`)

    // 5. Inert: stamp locked, and actionability appears in no numeric fact.
    assert.equal(report.stamp, DEMO_STAMP)
    assert.ok(report.facts.every((fact) => !/sanctionable/i.test(fact.id)))

    // No invented instruments, sweeps, or Gurgaon claims anywhere.
    assert.ok(!/gurgaon|dtcp|hsvp|high court/i.test(reportTexts), `slice ${slice} invents no real claims`)
  }

  // 6. A package whose JSON claims 'yes' is killed by the gate, named.
  {
    const dir = freshDir('act-forge')
    assert.equal(runGenerate('a', dir).status, 0)
    const forgedDir = freshDir('act-forge-copy')
    for (const name of listArtifacts(dir)) copyFileSync(join(dir, name), join(forgedDir, name))
    const target = readArtifact(forgedDir, '-envelope-report.json')
    writeBytes(
      forgedDir,
      target.filename,
      Buffer.from(
        target.bytes.toString('utf8').replace('"sanctionableToday": "unknown"', '"sanctionableToday": "yes"'),
      ),
    )
    const result = runVerify(forgedDir)
    assert.notEqual(result.status, 0, 'gate must refuse a sanctionable-today: yes claim')
    assert.ok(result.output.includes(target.filename))
    assert.ok(/sanctionable/i.test(result.output))
  }
})
