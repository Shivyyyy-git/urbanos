#!/usr/bin/env node
// Townhouse-demo acceptance runner. Mirrors the kernel/unitplan convention:
// esbuild-bundle every tests/*.test.ts, run under node:test, with a coverage
// preflight so the THD gate list cannot silently shrink.
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
  'THD-01', 'THD-02', 'THD-03', 'THD-04', 'THD-05', 'THD-06', 'THD-07', 'THD-08',
  'THD-09', 'THD-10', 'THD-11', 'THD-12', 'THD-13', 'THD-14', 'THD-15', 'THD-16',
  'THD-17', 'THD-18',
]
const testSource = testFiles.map((file) => readFileSync(file, 'utf8')).join('\n')
const found = new Set(
  [...testSource.matchAll(/test\(\s*['"`](THD-\d+)\s*:/g)].map((match) => match[1]),
)
const missing = EXPECTED_FIXTURES.filter((fixture) => !found.has(fixture))
const unexpected = [...found].filter((fixture) => !EXPECTED_FIXTURES.includes(fixture))
if (missing.length > 0 || unexpected.length > 0) {
  console.error('Townhouse-demo coverage preflight failed.')
  console.error(`Missing gates: ${missing.join(', ') || '(none)'}`)
  console.error(`Unexpected gates: ${unexpected.join(', ') || '(none)'}`)
  process.exit(1)
}

// Independent-verifier preflight (ledger 041 blocker 1): THD-11 audits the
// shipped DXF with ezdxf, which must be pinned and project-local — never an
// ambient machine dependency. A clean checkout bootstraps .venv on first run.
const venvPython = join(projectRoot, '.venv', 'bin', 'python')
const EZDXF_PIN = 'ezdxf==1.4.4'
function verifierReady() {
  const probe = spawnSync(venvPython, ['-c', 'import ezdxf'], { stdio: 'ignore' })
  return probe.status === 0
}
if (!verifierReady()) {
  console.error(`Bootstrapping the pinned independent DXF verifier (.venv, ${EZDXF_PIN})…`)
  const venv = spawnSync('python3', ['-m', 'venv', join(projectRoot, '.venv')], { stdio: 'inherit' })
  if (venv.status === 0) {
    spawnSync(venvPython, ['-m', 'pip', 'install', '--quiet', EZDXF_PIN], { stdio: 'inherit' })
  }
  if (!verifierReady()) {
    console.error(
      'Verifier bootstrap failed. Run:\n'
        + `  python3 -m venv .venv && .venv/bin/pip install ${EZDXF_PIN}\n`
        + 'then re-run npm test. THD-11 cannot run without the pinned independent parser.',
    )
    process.exit(1)
  }
}

const workDirectory = mkdtempSync(join(tmpdir(), 'urbanos-townhouse-demo-tests-'))
try {
  const entry = testFiles.map((file) => `import ${JSON.stringify(file)}`).join('\n')
  const entryPath = join(workDirectory, 'entry.mjs')
  writeFileSync(entryPath, entry)
  const bundlePath = join(workDirectory, 'bundle.mjs')
  await build({
    entryPoints: [entryPath],
    outfile: bundlePath,
    bundle: true,
    format: 'esm',
    platform: 'node',
    target: 'node20',
    sourcemap: 'inline',
    external: ['node:*'],
    logLevel: 'silent',
  })
  const result = spawnSync(
    process.execPath,
    ['--test-reporter', 'spec', bundlePath],
    {
      cwd: projectRoot,
      stdio: 'inherit',
      env: { ...process.env, URBANOS_DEMO_ROOT: projectRoot },
    },
  )
  process.exit(result.status ?? 1)
} finally {
  rmSync(workDirectory, { recursive: true, force: true })
}
