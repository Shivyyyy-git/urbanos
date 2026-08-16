// THD-11 independent DXF audit · THD-12 measured rule conformance ·
// THD-16 request vs ceiling vs placed honesty. Geometry is measured from the
// shipped DXF with an independent parser (plus ezdxf for the audit), never
// trusted from report assertions.

import assert from 'node:assert/strict'
import { join } from 'node:path'
import { test } from 'node:test'
import {
  DEMO_STAMP,
  SQUARE_METRES_PER_ACRE,
  communityOneSite,
  demoSliceA,
  demoSliceB,
  resolveDemoRulebook,
  type CommunityEnvelopeReport,
  type DemoRuleSlot,
} from '../src/index.ts'
import {
  ezdxfAudit,
  freshDir,
  latin1,
  pageVectorPaths,
  parseDxf,
  pdfPages,
  readArtifact,
  ringArea,
  ringBounds,
  runGenerate,
  type DxfPath,
} from './helpers.ts'

const dirA = freshDir('geom-a')
const dirB = freshDir('geom-b')
const runA = runGenerate('a', dirA)
const runB = runGenerate('b', dirB)

interface WorldRect { id: string; klass: string; minX: number; minY: number; maxX: number; maxY: number; w: number; h: number; area: number }

function featureRects(paths: readonly DxfPath[]): WorldRect[] {
  return paths
    .filter((path) => path.id.startsWith('f.'))
    .map((path) => {
      const bounds = ringBounds(path.points)
      return {
        id: path.id.slice(2),
        klass: path.layer,
        ...bounds,
        area: ringArea(path.points),
      }
    })
}

function overlap(a: WorldRect, b: WorldRect, tolerance = 1e-6): boolean {
  return (
    a.maxX > b.minX + tolerance && b.maxX > a.minX + tolerance
    && a.maxY > b.minY + tolerance && b.maxY > a.minY + tolerance
  )
}

test('THD-11: independent DXF audit', () => {
  assert.equal(runA.status, 0)
  const artifact = readArtifact(dirA, '-technical-sheet.dxf')
  const audit = ezdxfAudit(join(dirA, artifact.filename))
  assert.equal(audit.errors, 0, 'ezdxf audits with zero errors')
  assert.equal(audit.version, 'AC1009', 'DXF R12')
  assert.equal(audit.insunits, 6, 'units resolve to metres')
  // The EXACT locked stamp, decoded by the fully independent parser (041 §2).
  assert.ok(
    audit.texts.includes(DEMO_STAMP),
    `ezdxf-decoded TEXT entities carry the exact locked stamp; got: ${audit.texts.filter((t) => t.includes('Research')).join(' | ')}`,
  )

  const dxf = parseDxf(latin1(artifact.bytes))
  for (const path of dxf.paths) {
    for (const [x, y] of path.points) {
      assert.ok(Number.isFinite(x) && Number.isFinite(y), `finite coordinates in ${path.id}`)
    }
  }
  const byLayer = (layer: string): DxfPath[] =>
    dxf.paths.filter((path) => path.layer === layer && path.id.startsWith('f.'))
  assert.ok(byLayer('SITE').length === 1, 'site boundary present')
  assert.ok(byLayer('ENVELOPE').length === 1, 'setback/buildable envelope present')
  assert.ok(byLayer('ROAD-PRIMARY').length === 1, 'primary road present')
  assert.ok(byLayer('ROAD-SECONDARY').length >= 1, 'secondary roads present')
  assert.ok(byLayer('PLOT').length >= 1, 'townhouse plots present')
  assert.ok(byLayer('GREEN').length >= 1, 'green polygons present')
  assert.ok(byLayer('AMENITY').length === 1, 'amenity parcel present')
  assert.ok(byLayer('CLUB').length === 1 && byLayer('POOL').length === 1, 'club and pool present')
  assert.ok(byLayer('GATE').length === 1, 'entry gate present')
})

function measuredChecks(dir: string, slice: 'a' | 'b'): void {
  const rulebook = resolveDemoRulebook(slice === 'a' ? demoSliceA : demoSliceB)
  const rule = (slot: DemoRuleSlot): number => rulebook.bySlot[slot].value
  const dxf = parseDxf(latin1(readArtifact(dir, '-technical-sheet.dxf').bytes))
  const rects = featureRects(dxf.paths)
  const site = rects.find((rect) => rect.id === 'site-boundary')!
  const report = JSON.parse(
    readArtifact(dir, '-envelope-report.json').bytes.toString('utf8'),
  ) as CommunityEnvelopeReport
  const fact = (id: string): number => {
    const found = report.facts.find((candidate) => candidate.id === id)
    assert.ok(found, `fact ${id} exists`)
    return found!.value
  }
  const tol = 1e-6

  // Site facts match the fixture.
  assert.ok(Math.abs(site.area - communityOneSite.widthM * communityOneSite.depthM) < tol)
  assert.ok(Math.abs(site.w - communityOneSite.widthM) < tol)
  assert.ok(Math.abs(site.h - communityOneSite.depthM) < tol)

  // Setbacks: every building (plot, club) keeps the cited clearances.
  const sbP = rule('setback-periphery')
  const sbF = rule('setback-front')
  const buildings = rects.filter((rect) => rect.klass === 'PLOT' || rect.klass === 'CLUB')
  assert.ok(buildings.length > 1, 'at least one townhouse placed')
  for (const building of buildings) {
    assert.ok(building.minX >= sbP - tol && building.maxX <= site.w - sbP + tol, `${building.id} periphery setback (x)`)
    assert.ok(building.maxY <= site.h - sbP + tol, `${building.id} periphery setback (north)`)
    assert.ok(building.minY >= sbF - tol, `${building.id} front setback`)
  }

  // Road widths equal their entries.
  const spine = rects.find((rect) => rect.id === 'road-primary-spine')!
  assert.ok(Math.abs(spine.w - rule('road-width-primary')) < tol, 'primary road width')
  const secondaries = rects.filter((rect) => rect.klass === 'ROAD-SECONDARY')
  assert.ok(secondaries.length >= 1)
  for (const road of secondaries) {
    assert.ok(Math.abs(road.h - rule('road-width-secondary')) < tol, `${road.id} secondary width`)
  }

  // Plot minima and unbroken row length.
  const plots = rects.filter((rect) => rect.klass === 'PLOT')
  for (const plot of plots) {
    assert.ok(plot.w >= rule('unit-plot-frontage-min') - tol, `${plot.id} frontage`)
    assert.ok(plot.h >= rule('unit-plot-depth-min') - tol, `${plot.id} depth`)
  }
  const rows = new Map<string, WorldRect[]>()
  for (const plot of plots) {
    const key = plot.minY.toFixed(4)
    rows.set(key, [...(rows.get(key) ?? []), plot])
  }
  for (const [rowKey, rowPlots] of rows) {
    const sorted = [...rowPlots].sort((a, b) => a.minX - b.minX)
    let runLength = 0
    let previousMaxX = Number.NEGATIVE_INFINITY
    for (const plot of sorted) {
      runLength = plot.minX - previousMaxX < tol ? runLength + plot.w : plot.w
      assert.ok(runLength <= rule('row-length-max') + tol, `row ${rowKey} unbroken length ${runLength}`)
      previousMaxX = plot.maxX
    }
  }

  // Coverage, green, amenity, density — measured, gross-site denominator.
  const club = rects.find((rect) => rect.klass === 'CLUB')!
  const builtFootprint = plots.reduce((sum, plot) => sum + plot.area, 0) + club.area
  assert.ok(builtFootprint <= (rule('site-coverage-max') / 100) * site.area + tol, 'coverage cap holds')
  const greenArea = rects.filter((rect) => rect.klass === 'GREEN').reduce((sum, rect) => sum + rect.area, 0)
  assert.ok(greenArea >= (rule('open-space-min') / 100) * site.area - tol, 'open-space minimum met')
  const amenity = rects.find((rect) => rect.klass === 'AMENITY')!
  assert.ok(amenity.area >= (rule('amenity-share-min') / 100) * site.area - tol, 'amenity minimum met')
  const densityCeiling = Math.floor((site.area / SQUARE_METRES_PER_ACRE) * rule('density-max'))
  assert.ok(plots.length <= densityCeiling, 'placed count within density ceiling')

  // No double counting / incompatible overlaps.
  const compatible = new Set(['CLUB|AMENITY', 'POOL|AMENITY', 'GATE|ROAD-PRIMARY'])
  const solids = rects.filter((rect) => rect.klass !== 'SITE' && rect.klass !== 'ENVELOPE')
  for (let a = 0; a < solids.length; a += 1) {
    for (let b = a + 1; b < solids.length; b += 1) {
      if (!overlap(solids[a]!, solids[b]!)) continue
      const pair = `${solids[a]!.klass}|${solids[b]!.klass}`
      const reversed = `${solids[b]!.klass}|${solids[a]!.klass}`
      assert.ok(
        compatible.has(pair) || compatible.has(reversed),
        `incompatible overlap ${solids[a]!.id} / ${solids[b]!.id}`,
      )
    }
  }
  for (const solid of solids) {
    assert.ok(
      solid.minX >= -tol && solid.minY >= -tol && solid.maxX <= site.w + tol && solid.maxY <= site.h + tol,
      `${solid.id} inside the site`,
    )
  }

  // Parking: report fact equals placed x norm (rounded up, policy stated).
  assert.equal(
    fact('fact.parking-required'),
    Math.ceil(plots.length * rule('parking-ecs-per-du') - 1e-9),
    'required ECS equals placed DU x parking norm',
  )
  // Height/storey caps appear as cited limits and no label exceeds them.
  const labels = dxf.texts.map((text) => text.value).join('\n')
  assert.ok(labels.includes(`HEIGHT CAP ${rule('height-max').toFixed(3)} m`), 'height cap cited on sheet')
  for (const match of labels.matchAll(/G\+(\d+)/g)) {
    assert.ok(Number(match[1]) <= rule('storeys-max') - 1, `label G+${match[1]} within storey cap`)
  }
  // Placed count reconciles with the report.
  assert.equal(plots.length, fact('fact.placed-du'), 'measured placed count equals report')
}

test('THD-12: canonical geometry satisfies every active rule (A and B)', () => {
  assert.equal(runA.status, 0)
  assert.equal(runB.status, 0)
  measuredChecks(dirA, 'a')
  measuredChecks(dirB, 'b')
})

test('THD-16: 500 is intent; density cap and placed capacity are separate', () => {
  const report = JSON.parse(
    readArtifact(dirA, '-envelope-report.json').bytes.toString('utf8'),
  ) as CommunityEnvelopeReport
  const fact = (id: string) => report.facts.find((candidate) => candidate.id === id)!

  const requested = fact('fact.requested-du')
  const ceiling = fact('fact.density-ceiling')
  const placed = fact('fact.placed-du')
  const shortfall = fact('fact.shortfall-du')
  assert.equal(requested.value, 500)
  assert.equal(requested.kind, 'fixture-input')
  assert.deepEqual([...requested.fixtureRefs], ['site.requestedDwellingUnits'])
  assert.equal(ceiling.value, 400)
  assert.ok(ceiling.ruleRefs.some((ref) => ref.includes('DENSITY')), 'ceiling cites the density entry')
  assert.ok(ceiling.fixtureRefs.length > 0, 'ceiling cites site area feeders')
  assert.equal(shortfall.value, requested.value - placed.value, 'shortfall = requested - placed')
  assert.notEqual(placed.value, requested.value, 'requested count is not copied into a result')
  assert.ok(report.verdict.bindingEntryIds.length > 0, 'binding constraints are named')

  // Placed count independently counted in DXF and both PDFs.
  const dxfCount = parseDxf(latin1(readArtifact(dirA, '-technical-sheet.dxf').bytes))
    .paths.filter((path) => path.id.startsWith('f.plot-')).length
  assert.equal(dxfCount, placed.value, 'DXF plot count equals placed fact')
  for (const suffix of ['-technical-sheet.pdf', '-presentation-map.pdf'] as const) {
    const count = pdfPages(latin1(readArtifact(dirA, suffix).bytes))
      .flatMap((content) => pageVectorPaths(content))
      .filter((path) => path.id.startsWith('f.plot-')).length
    assert.equal(count, placed.value, `${suffix} plot count equals placed fact`)
  }

  // Honesty narration: reference layout, never a claimed maximum.
  assert.ok(report.verdict.narrative.includes('reference layout'), 'narrative says reference layout')
  assert.ok(!/maximum that legally fits/i.test(report.verdict.narrative))
  const placedNote = placed.note ?? ''
  assert.ok(/not a claimed maximum/i.test(placedNote), 'placed fact carries the no-completeness-claim note')
})
