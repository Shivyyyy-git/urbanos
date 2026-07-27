#!/usr/bin/env node

import { mkdirSync, mkdtempSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, join, relative, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { build } from 'esbuild'

const projectRoot = resolve(import.meta.dirname, '..')
const testsRoot = resolve(projectRoot, 'tests')

function discoverTests(directory) {
  return readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const path = join(directory, entry.name)
      return entry.isDirectory()
        ? discoverTests(path)
        : entry.isFile() && entry.name.endsWith('.test.ts')
          ? [path]
          : []
    })
    .sort()
}

const testFiles = discoverTests(testsRoot)
if (testFiles.length === 0) {
  console.error('No tests/*.test.ts files found.')
  process.exit(1)
}

const buildRoot = mkdtempSync(join(tmpdir(), 'urbanos-tests-'))
const compiledTests = []

try {
  for (const [index, testFile] of testFiles.entries()) {
    const relativeName = relative(testsRoot, testFile).replaceAll(/[^a-zA-Z0-9_.-]/g, '-')
    const outputFile = join(
      buildRoot,
      `${String(index + 1).padStart(3, '0')}-${basename(relativeName, '.ts')}.mjs`,
    )
    mkdirSync(resolve(outputFile, '..'), { recursive: true })
    await build({
      absWorkingDir: projectRoot,
      entryPoints: [testFile],
      outfile: outputFile,
      bundle: true,
      platform: 'node',
      format: 'esm',
      target: `node${process.versions.node.split('.')[0]}`,
      packages: 'external',
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
