#!/usr/bin/env node
// Community One demo generator — the single documented demo command.
// Non-interactive, no network, no GUI, deterministic.
//
//   node tools/generate-demo.mjs generate --slice a|b --out <dir>
//   node tools/generate-demo.mjs verify <dir>
//   node tools/generate-demo.mjs diff <dirA> <dirB>
//
// `generate` writes the full package and runs the verify gate (non-zero exit
// if any artifact fails it). `verify` re-runs the gate on a directory.
// `diff` prints selected slice ids/digests and a semantic A/B diff — the
// stage command for the live rulebook-swap moment.

import { spawnSync } from 'node:child_process'
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

if (!process.env.URBANOS_TS_READY) {
  const result = spawnSync(
    process.execPath,
    ['--experimental-strip-types', '--no-warnings', process.argv[1], ...process.argv.slice(2)],
    { stdio: 'inherit', env: { ...process.env, URBANOS_TS_READY: '1' } },
  )
  process.exit(result.status ?? 1)
}

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const api = await import(join(projectRoot, 'src/index.ts'))

function usage() {
  console.error('usage: generate-demo.mjs generate --slice a|b --out <dir> | verify <dir> | diff <dirA> <dirB>')
  process.exit(2)
}

function sliceEntries(tag) {
  if (tag === 'a') return api.demoSliceA
  if (tag === 'b') return api.demoSliceB
  usage()
}

function readDir(dir) {
  return readdirSync(dir)
    .filter((name) => /\.(dxf|pdf|json)$/.test(name))
    .sort()
    .map((name) => ({ filename: name, bytes: new Uint8Array(readFileSync(join(dir, name))) }))
}

const [command, ...rest] = process.argv.slice(2)

if (command === 'generate') {
  let slice = null
  let out = null
  for (let index = 0; index < rest.length; index += 1) {
    if (rest[index] === '--slice') slice = rest[index + 1]
    if (rest[index] === '--out') out = rest[index + 1]
  }
  if (!slice || !out) usage()
  const rulebook = api.resolveDemoRulebook(sliceEntries(slice))
  const pkg = api.buildCommunityPackage(api.communityOneSite, rulebook)
  mkdirSync(out, { recursive: true })
  for (const artifact of pkg.artifacts) {
    writeFileSync(join(out, artifact.filename), artifact.bytes)
  }
  // Ledger 036: the one-click preview is regenerated on every build.
  writeFileSync(join(projectRoot, 'preview.html'), pkg.previewHtml)
  const findings = api.verifyDemoPackage(readDir(out))
  console.log(`slice:    ${rulebook.slice}`)
  console.log(`fixture:  ${pkg.fixtureDigest}`)
  console.log(`rulebook: ${pkg.rulebookDigest}`)
  console.log(`geometry: ${pkg.geometryDigest}`)
  console.log(`placed:   ${pkg.report.facts.find((f) => f.id === 'fact.placed-du').value} DU`)
  console.log(`stamp:    ${pkg.report.stamp}`)
  for (const artifact of pkg.artifacts) console.log(`wrote:    ${join(out, artifact.filename)}`)
  if (findings.length > 0) {
    for (const finding of findings) console.error(`GATE FAIL: ${finding.message} [${finding.detail}]`)
    process.exit(1)
  }
  console.log('verify:   gate passed on written files')
} else if (command === 'verify') {
  const [dir] = rest
  if (!dir) usage()
  const findings = api.verifyDemoPackage(readDir(dir))
  if (findings.length > 0) {
    for (const finding of findings) console.error(`GATE FAIL: ${finding.message} [${finding.detail}]`)
    process.exit(1)
  }
  console.log(`verify: gate passed (${readDir(dir).length} artifacts)`)
} else if (command === 'diff') {
  const [dirA, dirB] = rest
  if (!dirA || !dirB) usage()
  const load = (dir) => {
    const reportFile = readdirSync(dir).find((name) => name.endsWith('-envelope-report.json'))
    if (!reportFile) {
      console.error(`no envelope report JSON in ${dir}`)
      process.exit(1)
    }
    return JSON.parse(readFileSync(join(dir, reportFile), 'utf8'))
  }
  const a = load(dirA)
  const b = load(dirB)
  console.log(`A: slice ${a.slice}  rulebook ${a.rulebookDigest}  geometry ${a.geometryDigest}`)
  console.log(`B: slice ${b.slice}  rulebook ${b.rulebookDigest}  geometry ${b.geometryDigest}`)
  console.log('semantic diff (facts, A -> B):')
  const factsB = new Map(b.facts.map((fact) => [fact.id, fact]))
  for (const factA of a.facts) {
    const factB = factsB.get(factA.id)
    if (!factB) {
      console.log(`  ${factA.id}: ${factA.value} ${factA.unit} -> (absent)`)
      continue
    }
    if (factA.value !== factB.value) {
      console.log(`  ${factA.id}: ${factA.value} -> ${factB.value} ${factB.unit}`)
    }
  }
  const citesA = new Set(a.citations.map((row) => row.entryId))
  const citesB = new Set(b.citations.map((row) => row.entryId))
  console.log(`citations: A cites ${citesA.size} entries (${[...citesA][0]} …), B cites ${citesB.size} (${[...citesB][0]} …)`)
  const overlap = [...citesA].filter((id) => citesB.has(id))
  console.log(`citation overlap: ${overlap.length === 0 ? 'none (fully swapped)' : overlap.join(', ')}`)
} else {
  usage()
}
