#!/usr/bin/env node

import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const testsRoot = resolve(projectRoot, 'tests')

function discoverTests(directory) {
  return readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const path = join(directory, entry.name)
      if (entry.isDirectory()) return discoverTests(path)
      return entry.isFile() && entry.name.endsWith('.test.ts') ? [path] : []
    })
    .sort()
}

const testFiles = discoverTests(testsRoot)
if (testFiles.length === 0) {
  console.error('No tests/*.test.ts files found.')
  process.exit(1)
}

const testSource = testFiles.map((file) => readFileSync(file, 'utf8')).join('\n')
const fixtureNumbers = new Set(
  [...testSource.matchAll(/test\(\s*['"`]fixture\s+0?(\d+)[a-z]?\s*:/gi)]
    .map((match) => Number(match[1])),
)
const expectedFixtureNumbers = [
  ...Array.from({ length: 41 }, (_, index) => index + 1),
]
const missingFixtures = expectedFixtureNumbers.filter(
  (fixture) => !fixtureNumbers.has(fixture),
)
const unexpectedFixtures = [...fixtureNumbers]
  .filter((fixture) => !expectedFixtureNumbers.includes(fixture))
  .sort((left, right) => left - right)
const guardrailNumbers = new Set(
  [...testSource.matchAll(/test\(\s*['"`]guardrail\s+(\d+)\s*:/gi)]
    .map((match) => Number(match[1])),
)

if (
  fixtureNumbers.size !== expectedFixtureNumbers.length
  || missingFixtures.length > 0
  || unexpectedFixtures.length > 0
  || guardrailNumbers.size !== 3
  || ![1, 2, 3].every((guardrail) => guardrailNumbers.has(guardrail))
) {
  console.error('Acceptance coverage preflight failed.')
  console.error(`Missing fixtures: ${missingFixtures.join(', ') || '(none)'}`)
  console.error(`Unexpected fixtures: ${unexpectedFixtures.join(', ') || '(none)'}`)
  console.error(`Guardrails found: ${[...guardrailNumbers].sort().join(', ') || '(none)'}`)
  process.exit(1)
}

console.log('Coverage preflight: all 41 numbered fixtures + 3 guardrails; DG-1 active.')

const buildRoot = mkdtempSync(join(tmpdir(), 'urbanos-kernel-tests-'))
const compiledTests = []

try {
  for (const [index, testFile] of testFiles.entries()) {
    const relativeName = relative(testsRoot, testFile).replaceAll(/[^a-zA-Z0-9_.-]/g, '-')
    const outputFile = join(
      buildRoot,
      `${String(index + 1).padStart(3, '0')}-${basename(relativeName, '.ts')}.mjs`,
    )

    mkdirSync(dirname(outputFile), { recursive: true })
    await build({
      absWorkingDir: projectRoot,
      entryPoints: [testFile],
      outfile: outputFile,
      bundle: true,
      platform: 'node',
      format: 'esm',
      target: `node${process.versions.node.split('.')[0]}`,
      sourcemap: 'inline',
      logLevel: 'warning',
    })
    compiledTests.push(outputFile)
  }

  console.log(`Running ${testFiles.length} TypeScript test file(s):`)
  for (const testFile of testFiles) {
    console.log(`  - ${relative(projectRoot, testFile)}`)
  }

  const result = spawnSync(
    process.execPath,
    ['--test', '--test-concurrency=1', ...compiledTests],
    {
      cwd: projectRoot,
      env: { ...process.env, NODE_ENV: 'test' },
      stdio: 'inherit',
    },
  )

  if (result.error) throw result.error
  process.exitCode = result.status ?? 1
} finally {
  rmSync(buildRoot, { recursive: true, force: true })
}
