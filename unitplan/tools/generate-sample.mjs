#!/usr/bin/env node
// Generates the canonical Privy AT4 2BHK v0 artifacts into ../output.
// Usage: npm run generate -- [issue-date]  (date must be supplied explicitly;
// the module never reads a clock, so artifacts stay reproducible.)
import { mkdirSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const issueDate = process.argv[2] ?? '2026-08-08'
if (!/^\d{4}-\d{2}-\d{2}$/.test(issueDate)) {
  console.error(`Issue date must be YYYY-MM-DD, got "${issueDate}".`)
  process.exit(1)
}

const work = mkdtempSync(join(tmpdir(), 'urbanos-unitplan-generate-'))
try {
  const bundle = join(work, 'index.mjs')
  await build({
    entryPoints: [resolve(projectRoot, 'src/index.ts')],
    bundle: true,
    platform: 'node',
    format: 'esm',
    outfile: bundle,
    logLevel: 'silent',
  })
  const api = await import(bundle)
  const brief = api.privyAt42BhkBrief(issueDate)
  const plan = api.validateUnitPlan(brief)
  const model = api.buildUnitDrawingModel(plan, brief.sheet.scaleDenominator)
  const dxf = api.unitDrawingToDxf(model)
  const pdf = api.unitDrawingToPdf(model, {
    sheet: { ref: brief.sheet.ref, widthMm: brief.sheet.widthMm, heightMm: brief.sheet.heightMm },
    frame: { leftMm: 15, rightMm: 10, topMm: 10, bottomMm: 10, titleBlockHeightMm: 62 },
    paperToleranceMm: 0.05,
  })

  const outDxf = resolve(projectRoot, '../output/dxf')
  const outPdf = resolve(projectRoot, '../output/pdf')
  mkdirSync(outDxf, { recursive: true })
  mkdirSync(outPdf, { recursive: true })
  const stem = 'urbanos-feature2-2bhk-privy-at4-v0'
  writeFileSync(join(outDxf, `${stem}.dxf`), dxf)
  writeFileSync(join(outPdf, `${stem}.pdf`), pdf.bytes)
  const manifest = {
    feature: 'Feature 2 unit-plan v0',
    issueDate,
    reviewStatus: plan.reviewStatus,
    digest: plan.digest,
    carpetAreaSqm: plan.carpetAreaSqm,
    scale: `1:${model.scaleDenominator}`,
    sheet: brief.sheet.ref,
    assumptionNotes: plan.assumptionNotes,
    source: brief.source,
    paths: model.paths.length,
    texts: model.texts.length,
  }
  writeFileSync(
    join(outDxf, `${stem}.manifest.json`),
    `${JSON.stringify(manifest, null, 2)}\n`,
  )
  console.log(`Wrote ${stem}.dxf (${dxf.length} bytes), ${stem}.pdf (${pdf.bytes.length} bytes)`)
  console.log(`Digest: ${plan.digest}`)
  console.log(`Carpet area: ${plan.carpetAreaSqm.toFixed(3)} m2`)
} finally {
  rmSync(work, { recursive: true, force: true })
}
