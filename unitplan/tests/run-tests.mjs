#!/usr/bin/env node
// Unit-plan acceptance runner. Mirrors the kernel convention: esbuild-bundle
// every tests/*.test.ts, run under node:test, with a coverage preflight so
// the fixture list cannot silently shrink.
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const testsRoot = resolve(projectRoot, 'tests')

const testFiles = readdirSync(testsRoot)
  .filter((name) => name.endsWith('.test.ts'))
  .map((name) => join(testsRoot, name))
  .sort()
if (testFiles.length === 0) {
  console.error('No tests/*.test.ts files found.')
  process.exit(1)
}

const EXPECTED_FIXTURES = [
  'UP-1', 'UP-2', 'UP-3', 'UP-4', 'UP-5', 'UP-6', 'UP-7', 'UP-8', 'UP-9',
  'UP-10', 'UP-11', 'UP-12', 'UP-13', 'UP-14',
]
const testSource = testFiles.map((file) => readFileSync(file, 'utf8')).join('\n')
const found = new Set(
  [...testSource.matchAll(/test\(\s*['"`](UP-\d+)\s*:/g)].map((match) => match[1]),
)
const missing = EXPECTED_FIXTURES.filter((fixture) => !found.has(fixture))
const unexpected = [...found].filter((fixture) => !EXPECTED_FIXTURES.includes(fixture))
if (missing.length > 0 || unexpected.length > 0) {
  console.error('Unit-plan coverage preflight failed.')
  console.error(`Missing fixtures: ${missing.join(', ') || '(none)'}`)
  console.error(`Unexpected fixtures: ${unexpected.join(', ') || '(none)'}`)
  process.exit(1)
}

const workDirectory = mkdtempSync(join(tmpdir(), 'urbanos-unitplan-tests-'))
try {
  const entry = testFiles
    .map((file) => `import ${JSON.stringify(file)}`)
    .join('\n')
  const entryPath = join(workDirectory, 'entry.mjs')
  writeFileSync(entryPath, entry)
  const bundlePath = join(workDirectory, 'bundle.mjs')
  await build({
    entryPoints: [entryPath],
    bundle: true,
    platform: 'node',
    format: 'esm',
    outfile: bundlePath,
    sourcemap: 'inline',
    logLevel: 'silent',
  })
  const result = spawnSync(
    process.execPath,
    ['--test', '--enable-source-maps', bundlePath],
    { stdio: 'inherit' },
  )
  process.exit(result.status ?? 1)
} finally {
  rmSync(workDirectory, { recursive: true, force: true })
}
