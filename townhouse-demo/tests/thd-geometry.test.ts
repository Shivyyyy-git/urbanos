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

function contains(outer: WorldRect, inner: WorldRect, tolerance = 1e-6): boolean {
  return (
    inner.minX >= outer.minX - tolerance && inner.maxX <= outer.maxX + tolerance
    && inner.minY >= outer.minY - tolerance && inner.maxY <= outer.maxY + tolerance
  )
}

function pointRectDistance(x: number, y: number, rect: WorldRect): number {
  return Math.hypot(
    Math.max(rect.minX - x, 0, x - rect.maxX),
    Math.max(rect.minY - y, 0, y - rect.maxY),
  )
}

function rectDistance(a: WorldRect, b: WorldRect): number {
  return Math.hypot(
    Math.max(a.minX - b.maxX, b.minX - a.maxX, 0),
    Math.max(a.minY - b.maxY, b.minY - a.maxY, 0),
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
  assert.ok(byLayer('ROAD-PRIMARY').length >= 1, 'primary road (boulevard carriageways) present')
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

  // Road widths equal their entries (roads run either axis; the narrow
  // dimension is the right-of-way width).
  const spine = rects.find((rect) => rect.id === 'road-primary-spine')!
  assert.ok(Math.abs(spine.w - rule('road-width-primary')) < tol, 'primary carriageway width')
  const secondaries = rects.filter((rect) => rect.klass === 'ROAD-SECONDARY')
  assert.ok(secondaries.length >= 1)
  for (const road of secondaries) {
    assert.ok(
      Math.abs(Math.min(road.w, road.h) - rule('road-width-secondary')) < tol,
      `${road.id} secondary width`,
    )
  }

  // Plot minima (rows run either orientation: the short side is the
  // frontage, the long side the depth) and unbroken row length in both axes.
  const plots = rects.filter((rect) => rect.klass === 'PLOT')
  for (const plot of plots) {
    assert.ok(Math.min(plot.w, plot.h) >= rule('unit-plot-frontage-min') - tol, `${plot.id} frontage`)
    assert.ok(Math.max(plot.w, plot.h) >= rule('unit-plot-depth-min') - tol, `${plot.id} depth`)
  }
  const checkRuns = (axis: 'x' | 'y'): void => {
    const groups = new Map<string, WorldRect[]>()
    for (const plot of plots) {
      const key = axis === 'x' ? `${plot.minY.toFixed(4)}:${plot.h.toFixed(4)}` : `${plot.minX.toFixed(4)}:${plot.w.toFixed(4)}`
      groups.set(key, [...(groups.get(key) ?? []), plot])
    }
    for (const [groupKey, groupPlots] of groups) {
      const sorted = [...groupPlots].sort((a, b) => (axis === 'x' ? a.minX - b.minX : a.minY - b.minY))
      let runLength = 0
      let previousEnd = Number.NEGATIVE_INFINITY
      for (const plot of sorted) {
        const start = axis === 'x' ? plot.minX : plot.minY
        const size = axis === 'x' ? plot.w : plot.h
        runLength = start - previousEnd < tol ? runLength + size : size
        assert.ok(runLength <= rule('row-length-max') + tol, `run ${axis}/${groupKey} unbroken length ${runLength}`)
        previousEnd = axis === 'x' ? plot.maxX : plot.maxY
      }
    }
  }
  checkRuns('x')
  checkRuns('y')

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
  const compatible = new Set([
    'CLUB|AMENITY',
    'POOL|AMENITY',
    'GATE|ROAD-PRIMARY',
    // A stilt bay is physically inside its townhouse plot. Parking is still
    // incompatible with green/open space and every other unlisted land use.
    'PARKING|PLOT',
  ])
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
  // If a client-facing surface says the bays are indicated on plan, those
  // bays must be canonical/parity-checked planning features. Painting the
  // right number of PAVING decor rectangles over measured GREEN is not proof
  // and evades the incompatible-overlap oracle above.
  const requiredParking = Math.ceil(plots.length * rule('parking-ecs-per-du') - 1e-9)
  const labels = dxf.texts.map((text) => text.value).join('\n')
  assert.equal(
    fact('fact.parking-required'),
    requiredParking,
    'required ECS equals placed DU x parking norm',
  )
  const parking = rects.filter((rect) => rect.klass === 'PARKING')
  if (/PARKING[^\n]*INDICATED ON PLAN/i.test(labels)) {
    assert.equal(
      parking.length,
      requiredParking,
      'every bay claimed as indicated on plan is a canonical PARKING feature',
    )
  } else {
    assert.match(
      labels,
      /PARKING STRATEGY (?:IS )?NOT YET DEMONSTRATED/i,
      'without canonical parking geometry, the sheet says the requirement is not demonstrated',
    )
    assert.equal(parking.length, 0, 'no partial canonical parking claim')
  }

  // A counted rectangle must be usable as parking, not merely fit somewhere
  // on the site. The front-most on-plot bay must lie toward the nearest road
  // across the plot frontage; visitor bays must physically abut a canonical
  // road (or be served by one modelled as such), with no invented tolerance.
  const accessFailures: string[] = []
  const accessRoads = rects.filter((rect) => rect.klass === 'ROAD-PRIMARY' || rect.klass === 'ROAD-SECONDARY')
  const onPlotParking = new Set<string>()
  for (const plot of plots) {
    const ownBays = parking.filter((bay) => contains(plot, bay, tol))
    for (const bay of ownBays) onPlotParking.add(bay.id)
    if (ownBays.length === 0) continue
    const portrait = plot.h >= plot.w
    const centreX = (plot.minX + plot.maxX) / 2
    const centreY = (plot.minY + plot.maxY) / 2
    const frontageRoads = accessRoads.filter((road) => (
      portrait
        ? road.w >= road.h && road.minX - tol <= centreX && road.maxX + tol >= centreX
        : road.h >= road.w && road.minY - tol <= centreY && road.maxY + tol >= centreY
    ))
    const nearest = frontageRoads.sort(
      (a, b) => pointRectDistance(centreX, centreY, a) - pointRectDistance(centreX, centreY, b),
    )[0]
    if (!nearest) {
      accessFailures.push(`${plot.id}: no frontage road`)
      continue
    }
    const plotCentreDistance = pointRectDistance(centreX, centreY, nearest)
    const frontBayExists = ownBays.some((bay) => pointRectDistance(
      (bay.minX + bay.maxX) / 2,
      (bay.minY + bay.maxY) / 2,
      nearest,
    ) < plotCentreDistance - tol)
    if (!frontBayExists) accessFailures.push(`${plot.id}: bays face away from ${nearest.id}`)
  }
  for (const bay of parking.filter((candidate) => !onPlotParking.has(candidate.id))) {
    if (!accessRoads.some((road) => rectDistance(bay, road) <= tol)) {
      accessFailures.push(`${bay.id}: no canonical road/access aisle`)
    }
  }
  assert.equal(
    accessFailures.length,
    0,
    `${accessFailures.length} claimed parking access failures: ${accessFailures.slice(0, 8).join(', ')}`,
  )
  assert.doesNotMatch(
    labels,
    /MEASURED PARKING FEATURES[^\n]*NOT A MEASURED FEATURE/i,
    'one title line cannot call the same parking geometry both measured and not measured',
  )
  // Height/storey caps appear as cited limits and no label exceeds them.
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
  const failures: string[] = []
  for (const [dir, slice] of [[dirA, 'a'], [dirB, 'b']] as const) {
    try {
      measuredChecks(dir, slice)
    } catch (error) {
      failures.push(`${slice.toUpperCase()}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
  assert.equal(failures.length, 0, `slice rule failures:\n${failures.join('\n')}`)
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
  assert.equal(ceiling.value, 2000)
  assert.ok(ceiling.ruleRefs.some((ref) => ref.includes('DENSITY')), 'ceiling cites the density entry')
  assert.ok(ceiling.fixtureRefs.length > 0, 'ceiling cites site area feeders')
  assert.equal(shortfall.value, requested.value - placed.value, 'shortfall = requested - placed')
  // The placed count is COUNTED from canonical geometry (verified against the
  // DXF below), never copied from the request — under the 049 fixture the
  // program cap makes them numerically equal, and the count is the evidence.
  assert.ok(placed.kind === 'derived', 'placed is a derived (counted) fact')
  assert.ok(
    report.verdict.bindingEntryIds.length > 0 || report.verdict.bindingDescription.includes('Client program'),
    'binding constraints are named (entries, or the client program when fully placed)',
  )

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
