// ---------------------------------------------------------------------------
// UrbanOS planning engine — turns a ProjectBrief + BylawRules into three
// development concepts (Yield Max / Balanced Urban / Green Core), each with
// coherent massing, a land-use budget, a unit mix and a rectangle-tiled
// masterplan layout.
//
// PURE & DETERMINISTIC: no randomness, no clock reads. Same input → same
// output. Domain constants are demo-grade, each with a real-world reference.
// ---------------------------------------------------------------------------

import type {
  BylawRules,
  DevelopmentType,
  LandUse,
  LandUseCategory,
  LayoutModel,
  Parcel,
  Priority,
  ProjectBrief,
  Scenario,
  UnitMixEntry,
} from '../types'

// Typical floor-to-floor height for Indian residential towers. NBC 2016
// allows ~3.0–3.6 m clear; 3.1 m is the working assumption across UrbanOS.
const FLOOR_HEIGHT_M = 3.1
// Buildings above 15 m are "high-rise" under NBC 2016 Part 4 (fire & life
// safety); 4 floors × 3.1 m = 12.4 m keeps a scheme safely low-rise.
const LOW_RISE_MAX_FLOORS = 4

// ------------------------------- small utils -------------------------------

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v))
}
function clampInt(v: number, lo: number, hi: number): number {
  return clamp(Math.round(v), lo, hi)
}
/** Round to the nearest 0.5 m — all layout geometry snaps to this grid. */
function r05(v: number): number {
  return Math.round(v * 2) / 2
}
function r1(v: number): number {
  return Math.round(v * 10) / 10
}
function r2(v: number): number {
  return Math.round(v * 100) / 100
}
function safeNum(v: number | null | undefined, fallback: number): number {
  return typeof v === 'number' && isFinite(v) && v > 0 ? v : fallback
}
/** Pick by strategy index (0 = roi, 1 = balanced, 2 = green). */
function pick3<T>(si: number, a: T, b: T, c: T): T {
  return si === 0 ? a : si === 1 ? b : c
}
function strategyIndex(strategy: Priority): number {
  return strategy === 'roi' ? 0 : strategy === 'balanced' ? 1 : 2
}

// --------------------------- scenario definitions ---------------------------

const META: Record<Priority, { id: string; name: string; tagline: string }> = {
  roi: {
    id: 'yield-max',
    name: 'Yield Max',
    tagline: 'Density-led concept that maximises saleable area and revenue',
  },
  balanced: {
    id: 'balanced-urban',
    name: 'Balanced Urban',
    tagline: 'Market-standard concept balancing yield, open space and infrastructure',
  },
  green: {
    id: 'green-core',
    name: 'Green Core',
    tagline: 'Landscape-first plan wrapped around a central park',
  },
}

// ------------------------- land-use programme tables ------------------------

function commercialLandPct(devType: DevelopmentType, si: number): number {
  switch (devType) {
    case 'house':
      return 0
    case 'group-housing':
      return pick3(si, 3, 2, 2) // convenience shopping per Haryana GH norms
    case 'mixed-use':
      return pick3(si, 26, 20, 15)
    case 'commercial':
      return 0 // main use — takes the residual land share instead
    case 'township':
      return pick3(si, 8, 6, 5)
  }
}

function amenityLandPct(devType: DevelopmentType, si: number): number {
  switch (devType) {
    case 'house':
      return 0
    case 'group-housing':
      return pick3(si, 5, 6, 7)
    case 'mixed-use':
      return pick3(si, 4, 5, 6)
    case 'commercial':
      return 3
    case 'township':
      return pick3(si, 8, 10, 12) // URDPFI 2015 social-infrastructure norms
  }
}

/** Share of saleable area that is residential (the rest is commercial). */
function resSaleableShare(devType: DevelopmentType, si: number): number {
  switch (devType) {
    case 'house':
      return 1
    case 'group-housing':
      return pick3(si, 0.96, 0.98, 0.98)
    case 'mixed-use':
      return pick3(si, 0.62, 0.7, 0.76)
    case 'commercial':
      return 0
    case 'township':
      return pick3(si, 0.88, 0.9, 0.92)
  }
}

function amenityLabels(devType: DevelopmentType): string[] {
  switch (devType) {
    case 'township':
      return ['School', 'Health Centre']
    case 'group-housing':
      return ['Clubhouse', 'Community Hall']
    case 'mixed-use':
      return ['Clubhouse', 'Community Centre']
    case 'commercial':
      return ['Food Court']
    case 'house':
      return []
  }
}

function greenLandPct(strategy: Priority, minGreen: number): number {
  // Yield Max deliberately lands 2 pts under the mandated minimum (soft-fail
  // material for the compliance engine); Green Core promises max(min+8, 22)%.
  if (strategy === 'roi') return clampInt(Math.max(minGreen - 2, 4), 4, 40)
  if (strategy === 'balanced') return clampInt(Math.max(minGreen + 2, 15), 15, 40)
  return clampInt(Math.max(minGreen + 8, 22), 22, 40)
}

// ------------------------------ plot geometry -------------------------------

function plotDims(brief: ProjectBrief, areaSqm: number): { plotW: number; plotD: number } {
  // Surveyed dimensions win outright: when the user has measured the plot the
  // drawing must match the survey, not a derived aspect ratio. (The wizard
  // keeps plotAreaSqm = W x D, so the area maths downstream stays consistent.)
  const wIn = safeNum(brief.plotWidthM, 0)
  const dIn = safeNum(brief.plotDepthM, 0)
  if (wIn > 0 && dIn > 0) {
    return { plotW: Math.max(4, r05(wIn)), plotD: Math.max(4, r05(dIn)) }
  }
  // Default parcel aspect ~1.4:1 (width:depth), typical of Indian plotting.
  let w = Math.sqrt(areaSqm * 1.4)
  const frontageM = brief.plotFrontageM
  if (frontageM !== undefined && isFinite(frontageM) && frontageM > 3) {
    // Respect the stated frontage but keep depth within 0.33×–4× of width so
    // the drawing stays legible even for extreme frontages.
    w = clamp(frontageM, Math.sqrt(areaSqm / 4), Math.sqrt(areaSqm * 3))
  }
  const plotW = Math.max(10, r05(w))
  const plotD = Math.max(8, r05(areaSqm / plotW))
  return { plotW, plotD }
}

// --------------------------------- massing ----------------------------------

interface Massing {
  far: number
  coveragePct: number
  floors: number
  floorsCap: number
}

/** The FAR ceiling the massing is actually allowed to chase. A declared
 * site-specific FAR (purchasable FAR, TDR, licence condition or zonal-plan
 * entry) supersedes the base bylaw table; the compliance engine still measures
 * the result against the table and flags the delta. */
function effectiveMaxFar(brief: ProjectBrief, rules: BylawRules): number {
  const tableFar = safeNum(rules.maxFar[brief.developmentType], 1.5)
  return clamp(safeNum(brief.farOverride, tableFar), 0.2, 8)
}

function resolveMassing(brief: ProjectBrief, rules: BylawRules, strategy: Priority): Massing {
  const devType = brief.developmentType
  const maxFar = effectiveMaxFar(brief, rules)
  const maxCov = clamp(safeNum(rules.maxGroundCoveragePct[devType], 40), 10, 80)

  // FAR utilisation: Yield Max 100%, Balanced ~87.5%, Green Core ~70%.
  const farFrac = strategy === 'roi' ? 1 : strategy === 'balanced' ? 0.875 : 0.7
  const targetFar = maxFar * farFrac

  // Yield Max deliberately overshoots ground coverage by +4 points (podium
  // sprawl) — intentional warn/fail material for the compliance engine.
  let cov = strategy === 'roi' ? maxCov + 4 : strategy === 'balanced' ? maxCov * 0.88 : maxCov * 0.7
  cov = clamp(cov, 8, 90)

  let floorsCap =
    rules.maxHeightM !== null && rules.maxHeightM > 0
      ? Math.max(1, Math.floor(rules.maxHeightM / FLOOR_HEIGHT_M))
      : 40 // no statutory cap: practical demo ceiling (AAI / fire NOC territory)
  // A narrow abutting road bars high-rise (>15 m) construction in ALL schemes
  // — this is life-safety, so even Yield Max respects it.
  if (safeNum(brief.roadWidthM, 9) < safeNum(rules.minRoadWidthForHighRiseM, 12)) {
    floorsCap = Math.min(floorsCap, LOW_RISE_MAX_FLOORS)
  }
  if (devType === 'house') floorsCap = Math.min(floorsCap, 4) // plotted housing ≤ G+3 (e.g. Delhi UBBL 2016)

  // maxFloors is the tallest block; average floors = FAR / coverage. The bump
  // above the average keeps Yield Max visibly the tallest concept.
  const bump = devType === 'house' ? 0 : strategy === 'roi' ? 3 : strategy === 'balanced' ? 2 : 0
  const avgFloors = targetFar / (cov / 100)
  let floors: number
  let far: number
  if (avgFloors > floorsCap) {
    floors = floorsCap
    far = floorsCap * (cov / 100) // achievable ceiling under the height cap
  } else {
    floors = clampInt(Math.ceil(avgFloors) + bump, 1, floorsCap)
    far = targetFar
  }
  return { far: r2(far), coveragePct: r1(cov), floors, floorsCap }
}

// ------------------------------ layout: house -------------------------------

interface HouseLayoutResult {
  layout: LayoutModel
  covPct: number
  far: number
  floors: number
  roadsPct: number
  utilPct: number
}

function buildHouseLayout(
  rules: BylawRules,
  plotW: number,
  plotD: number,
  covTargetPct: number,
  farTarget: number,
  floorsCap: number,
  prefix: string,
): HouseLayoutResult {
  const area = plotW * plotD
  const parcels: Parcel[] = []
  let seq = 0
  const add = (
    x: number,
    y: number,
    w: number,
    h: number,
    use: LandUseCategory,
    label?: string,
    floors?: number,
  ): void => {
    const pw = r05(w)
    const ph = r05(h)
    if (pw < 1 || ph < 1) return
    seq += 1
    const p: Parcel = { id: `${prefix}-p${seq}`, x: r05(x), y: r05(y), w: pw, h: ph, use }
    if (label !== undefined) p.label = label
    if (floors !== undefined && floors > 0) p.floors = floors
    parcels.push(p)
  }

  // Setbacks per bylaws, clamped so tiny plots keep a buildable core.
  const f = r05(clamp(safeNum(rules.setbacks.minFrontM, 3), 1, plotD * 0.25))
  const sd = r05(clamp(safeNum(rules.setbacks.minSideM, 2), 1, plotW * 0.2))
  const rr = r05(clamp(safeNum(rules.setbacks.minRearM, 2), 1, plotD * 0.2))
  const dwW = plotW >= 14 ? 3.5 : 2.5 // driveway width (single car lane ~3 m)

  const buildableW = Math.max(4, plotW - sd - dwW)
  const buildableD = Math.max(4, plotD - f - rr)
  const fpTarget = (covTargetPct / 100) * area
  const fp = Math.max(20, Math.min(fpTarget, buildableW * buildableD * 0.92))
  let bw = Math.max(4, Math.min(buildableW, r05(Math.sqrt(fp * 1.4))))
  let bh = r05(fp / bw)
  if (bh > buildableD) {
    bh = r05(buildableD)
    bw = Math.max(4, Math.min(buildableW, r05(fp / bh)))
  }
  if (bh < 4) bh = 4

  // Recompute coverage/FAR from the drawn footprint so numbers stay coherent
  // even when setbacks shrink the buildable envelope below the target.
  const covPct = r1(clamp(((bw * bh) / area) * 100, 5, 90))
  const floors = clampInt(farTarget / (covPct / 100) + 0.25, 1, Math.max(1, floorsCap))
  const far = r2(Math.min(farTarget, floors * (covPct / 100)))

  add(0, 0, plotW - dwW, f, 'green', 'Front Lawn')
  add(plotW - dwW, 0, dwW, f + bh, 'roads', 'Drive & Car Park')
  if (sd >= 1.5) add(0, f, sd, bh, 'green', 'Side Green')
  add(sd, f, bw, bh, 'residential', `Residence (G+${floors - 1})`, floors)
  const courtW = plotW - dwW - sd - bw
  if (courtW >= 1.5) add(sd + bw, f, courtW, bh, 'green', 'Side Court')

  const ry = f + bh
  const rd = plotD - ry
  let utilArea = 0
  if (rd >= 1.5) {
    const uW = 2.5
    const uD = Math.min(4, rd)
    add(0, ry, plotW - uW, rd, 'green', 'Rear Garden')
    if (rd - uD >= 1.5) add(plotW - uW, ry, uW, rd - uD, 'green', 'Kitchen Garden')
    add(plotW - uW, plotD - uD, uW, uD, 'utilities', 'Utility / OHT') // tank, meters, waste
    utilArea = uW * uD
  }

  const driveArea = dwW * (f + bh)
  const roadsPct = clampInt((driveArea / area) * 100, 2, 15)
  const utilPct = utilArea > 0 ? Math.max(1, Math.round((utilArea / area) * 100)) : 0
  return { layout: { plotW, plotD, parcels }, covPct, far, floors, roadsPct, utilPct }
}

// ------------------------- layout: grid masterplans -------------------------

interface Cell {
  x: number
  y: number
  w: number
  h: number
}

function buildMasterplan(
  strategy: Priority,
  devType: DevelopmentType,
  plotW: number,
  plotD: number,
  maxFloors: number,
  greenPct: number,
  commPct: number,
  amenPct: number,
  utilPct: number,
  prefix: string,
): { layout: LayoutModel; roadsPct: number } {
  const area = plotW * plotD
  const parcels: Parcel[] = []
  let seq = 0
  const add = (
    x: number,
    y: number,
    w: number,
    h: number,
    use: LandUseCategory,
    label?: string,
    floors?: number,
  ): void => {
    const pw = r05(w)
    const ph = r05(h)
    if (pw < 1 || ph < 1) return
    seq += 1
    const p: Parcel = { id: `${prefix}-p${seq}`, x: r05(x), y: r05(y), w: pw, h: ph, use }
    if (label !== undefined) p.label = label
    if (floors !== undefined && floors > 0) p.floors = floors
    parcels.push(p)
  }

  // Internal road widths 7.5–9 m (IRC 86 local street standards). The grid
  // density varies by scenario so the three masterplans read differently:
  // Yield Max = tight grid, Balanced = relaxed grid, Green Core = 2×2 loop
  // around a central park.
  const roadW = strategy === 'roi' ? 7.5 : strategy === 'balanced' ? 8 : 9
  let nH: number
  let nV: number
  if (strategy === 'roi') {
    nH = clampInt(plotD / 100, 1, 3)
    nV = clampInt(plotW / 80, 1, 3)
  } else if (strategy === 'balanced') {
    nH = clampInt(plotD / 130, 1, 2)
    nV = clampInt(plotW / 110, 1, 2)
  } else {
    nH = plotD >= 80 ? 2 : 1
    nV = plotW >= 80 ? 2 : 1
  }
  const MIN_BLOCK = 12
  while (nH > 1 && (plotD - nH * roadW) / (nH + 1) < MIN_BLOCK) nH -= 1
  while (nV > 0 && (plotW - nV * roadW) / (nV + 1) < MIN_BLOCK) nV -= 1

  // Horizontal development bands separated by the spine / link roads.
  const bands: Array<{ y0: number; y1: number }> = []
  if ((plotD - nH * roadW) / (nH + 1) < MIN_BLOCK) {
    // Tiny site: one access road along the frontage, single development band.
    const aw = clamp(r05(plotD * 0.2), 3, 6)
    add(0, 0, plotW, aw, 'roads', 'Access Road')
    bands.push({ y0: aw, y1: plotD })
  } else {
    const bandD = (plotD - nH * roadW) / (nH + 1)
    let cursor = 0
    for (let i = 1; i <= nH; i += 1) {
      const ryPos = r05(i * bandD + (i - 1) * roadW)
      bands.push({ y0: cursor, y1: ryPos })
      add(0, ryPos, plotW, roadW, 'roads', i === 1 ? `Spine Road (${roadW} m)` : 'Link Road')
      cursor = ryPos + roadW
    }
    bands.push({ y0: cursor, y1: plotD })
  }

  // Vertical cross roads, aligned across bands (drawn per band so road
  // parcels never overlap each other).
  const colEdges: Array<{ x0: number; x1: number }> = []
  if (nV > 0) {
    const colW = (plotW - nV * roadW) / (nV + 1)
    let cursor = 0
    for (let j = 1; j <= nV; j += 1) {
      const rx = r05(j * colW + (j - 1) * roadW)
      colEdges.push({ x0: cursor, x1: rx })
      let bi = 0
      for (const b of bands) {
        add(rx, b.y0, roadW, b.y1 - b.y0, 'roads', j === 1 && bi === 0 ? 'Cross Road' : undefined)
        bi += 1
      }
      cursor = rx + roadW
    }
    colEdges.push({ x0: cursor, x1: plotW })
  } else {
    colEdges.push({ x0: 0, x1: plotW })
  }

  // Developable cells between the roads.
  const pool: Cell[] = []
  for (const b of bands) {
    for (const c of colEdges) {
      const w = c.x1 - c.x0
      const h = b.y1 - b.y0
      if (w >= 4 && h >= 4) pool.push({ x: c.x0, y: b.y0, w, h })
    }
  }

  const cd = (c: Cell): number => {
    const dx = c.x + c.w / 2 - plotW / 2
    const dy = c.y + c.h / 2 - plotD / 2
    return dx * dx + dy * dy
  }

  // Utilities: small strip carved out of the bottom-right cell.
  const utilNeed = (utilPct / 100) * area
  if (utilNeed > 0 && pool.length > 0) {
    pool.sort((a, b) => b.x + b.w + b.y + b.h - (a.x + a.w + a.y + a.h) || a.x - b.x)
    const cell = pool[0]
    if (cell && cell.h >= 12 && cell.w >= 8) {
      pool.shift()
      const s = clamp(r05(utilNeed / cell.w), 3, Math.min(12, cell.h - 8))
      add(cell.x, cell.y + cell.h - s, cell.w, s, 'utilities', 'Utilities / STP')
      pool.push({ x: cell.x, y: cell.y, w: cell.w, h: cell.h - s })
    }
  }

  const splitCell = (cell: Cell, needArea: number): { part: Cell; rest: Cell | null } => {
    const alongW = cell.w >= cell.h
    const span = alongW ? cell.w : cell.h
    const other = alongW ? cell.h : cell.w
    const cut = clamp(r05(needArea / other), 8, span - 8)
    if (cut < 8 || span - cut < 8) return { part: cell, rest: null }
    if (alongW) {
      return {
        part: { x: cell.x, y: cell.y, w: cut, h: cell.h },
        rest: { x: cell.x + cut, y: cell.y, w: cell.w - cut, h: cell.h },
      }
    }
    return {
      part: { x: cell.x, y: cell.y, w: cell.w, h: cut },
      rest: { x: cell.x, y: cell.y + cut, w: cell.w, h: cell.h - cut },
    }
  }

  // Greedy allocation of cells to a use until its target area is met. Always
  // leaves at least one cell for the primary use.
  const consume = (
    needArea: number,
    maxParcels: number,
    use: LandUseCategory,
    labels: string[],
    floors: number | undefined,
    sortFn: (a: Cell, b: Cell) => number,
    keepWholeFirst: boolean,
  ): void => {
    let need = needArea
    let used = 0
    while (need > area * 0.01 && used < maxParcels && pool.length > 1) {
      pool.sort(sortFn)
      const cell = pool.shift()
      if (!cell) break
      let target: Cell = cell
      const cellA = cell.w * cell.h
      const skipSplit = keepWholeFirst && used === 0
      if (!skipSplit && cellA > need * 1.4 && parcels.length < 34) {
        const { part, rest } = splitCell(cell, need)
        target = part
        if (rest) pool.push(rest)
      }
      const label = labels[Math.min(used, labels.length - 1)]
      add(target.x, target.y, target.w, target.h, use, label, floors)
      need -= target.w * target.h
      used += 1
    }
  }

  // Green: Green Core takes the central cell(s); Yield Max relegates leftover
  // rear corners; Balanced spreads pocket parks along the periphery.
  const greenSort =
    strategy === 'green'
      ? (a: Cell, b: Cell): number => cd(a) - cd(b) || a.y - b.y || a.x - b.x
      : strategy === 'roi'
        ? (a: Cell, b: Cell): number => b.y - a.y || a.w * a.h - b.w * b.h || a.x - b.x
        : (a: Cell, b: Cell): number => cd(b) - cd(a) || a.y - b.y || a.x - b.x
  const greenLabels =
    strategy === 'green'
      ? ['Central Park', 'Neighbourhood Green', 'Pocket Park']
      : ['Community Park', 'Pocket Park', 'Green Court']
  consume((greenPct / 100) * area, 3, 'green', greenLabels, undefined, greenSort, strategy === 'green')

  // Commercial blocks front the widest road edge (the abutting road, y = 0).
  if (commPct > 0) {
    const commFloors = devType === 'commercial' ? maxFloors : clampInt(maxFloors * 0.6, 1, 8)
    consume(
      (commPct / 100) * area,
      3,
      'commercial',
      ['Retail Plaza', 'Office Block', 'High-Street Retail'],
      commFloors,
      (a, b) => a.y - b.y || a.x - b.x,
      false,
    )
  }

  // Amenities (school / clubhouse) sit mid-site.
  if (amenPct > 0 && devType !== 'house') {
    consume(
      (amenPct / 100) * area,
      2,
      'amenities',
      amenityLabels(devType),
      2,
      (a, b) => cd(a) - cd(b) || a.y - b.y || a.x - b.x,
      false,
    )
  }

  // Remaining cells: the primary use — residential towers/blocks, or lettable
  // blocks for a pure-commercial scheme. Townships alternate villa clusters.
  pool.sort((a, b) => a.y - b.y || a.x - b.x)
  const commLabels = ['Anchor Retail', 'Office Block', 'Retail Plaza', 'Office Annexe']
  let i = 0
  for (const cell of pool) {
    const letter = i < 26 ? String.fromCharCode(65 + i) : String(i + 1)
    if (devType === 'commercial') {
      add(cell.x, cell.y, cell.w, cell.h, 'commercial', `${commLabels[i % 4]} ${letter}`, maxFloors)
    } else if (devType === 'township' && i % 2 === 1) {
      add(cell.x, cell.y, cell.w, cell.h, 'residential', `Villa Cluster ${letter}`, 2)
    } else {
      const kind = maxFloors >= 5 ? 'Tower' : 'Block'
      add(cell.x, cell.y, cell.w, cell.h, 'residential', `${kind} ${letter}`, maxFloors)
    }
    i += 1
  }

  let roadArea = 0
  for (const p of parcels) if (p.use === 'roads') roadArea += p.w * p.h
  const roadsPct = clampInt((roadArea / Math.max(1, area)) * 100, 4, 25)
  return { layout: { plotW, plotD, parcels }, roadsPct }
}

// ------------------------------ unit programme ------------------------------

function buildUnits(
  brief: ProjectBrief,
  strategy: Priority,
  rules: BylawRules,
  builtUpSqm: number,
  saleableSqm: number,
  floors: number,
): { totalUnits: number; unitMix: UnitMixEntry[] } {
  const devType = brief.developmentType
  const si = strategyIndex(strategy)

  if (devType === 'house') {
    // Single dwelling: the mix describes the home itself (floors/bedrooms).
    const bedrooms = clampInt(builtUpSqm / 75, 2, 6) // ~75 sqm built-up per bedroom incl. common areas
    const mix: UnitMixEntry[] = [
      {
        type: `Dwelling floors (G+${floors - 1})`,
        count: floors,
        avgSizeSqm: Math.max(20, Math.round(builtUpSqm / Math.max(1, floors))),
      },
      { type: 'Bedrooms', count: bedrooms, avgSizeSqm: 16 },
      { type: 'Covered car spaces', count: clampInt(builtUpSqm / 160, 1, 4), avgSizeSqm: 28 },
    ]
    return { totalUnits: 1, unitMix: mix }
  }

  const resShare = resSaleableShare(devType, si)
  const resSaleable = saleableSqm * resShare
  const commSaleable = saleableSqm - resSaleable
  const mix: UnitMixEntry[] = []
  let total = 0

  // Township: villa plots absorb part of the residential programme.
  let aptArea = resSaleable
  if (devType === 'township' && resSaleable > 0) {
    const villaShare = pick3(si, 0.1, 0.18, 0.28)
    const villaCount = Math.floor((resSaleable * villaShare) / 180) // ~180 sqm villa on a ~200 sqm plot
    if (villaCount > 0) {
      mix.push({ type: 'Villa plot', count: villaCount, avgSizeSqm: 200 })
      total += villaCount
      aptArea -= villaCount * 180
    }
  }

  if (aptArea > 80 && devType !== 'commercial') {
    // Market-standard saleable sizes: 2 BHK 90–120 sqm, 3 BHK 120–160 sqm.
    // Yield Max skews small and 2 BHK-heavy; Green Core skews large.
    let s2 = pick3(si, 95, 105, 115)
    let s3 = pick3(si, 135, 145, 160)
    const share2 = pick3(si, 0.65, 0.55, 0.45)
    if (brief.targetUnits !== undefined && brief.targetUnits > 0) {
      // Nudge unit sizes (within the 90–160 sqm band) toward the target count.
      const baseAvg = share2 * s2 + (1 - share2) * s3
      const desired = aptArea / brief.targetUnits
      const scale = clamp(desired / baseAvg, 0.75, 1.3)
      s2 = clampInt(s2 * scale, 90, 118)
      s3 = clampInt(s3 * scale, 120, 160)
    }
    let n2 = Math.floor((aptArea * share2) / s2)
    const n3 = Math.floor((aptArea * (1 - share2)) / s3)
    if (n2 + n3 === 0) n2 = 1
    if (devType === 'group-housing' && rules.ewsPctRequired > 0) {
      // e.g. Haryana group-housing policy reserves ~15% of units for EWS
      // (~30 sqm each); carved out of the 2 BHK programme.
      const e = clamp(rules.ewsPctRequired, 0, 30) / 100
      const ews = Math.max(1, Math.round(((n2 + n3) * e) / (1 - e)))
      n2 = Math.max(1, n2 - Math.round((ews * 30) / s2))
      mix.push({ type: 'EWS unit', count: ews, avgSizeSqm: 30 })
      total += ews
    }
    mix.push({ type: '2 BHK', count: n2, avgSizeSqm: s2 })
    if (n3 > 0) mix.push({ type: '3 BHK', count: n3, avgSizeSqm: s3 })
    total += n2 + n3
  }

  if (commSaleable > 40 || devType === 'commercial') {
    const commArea = devType === 'commercial' ? saleableSqm : commSaleable
    if (devType === 'commercial') {
      const nRetail = Math.max(1, Math.floor((commArea * 0.4) / 55)) // high-street unit ~55 sqm
      const nOffice = Math.floor((commArea * 0.6) / 140) // office suite ~140 sqm
      mix.push({ type: 'Retail unit', count: nRetail, avgSizeSqm: 55 })
      if (nOffice > 0) mix.push({ type: 'Office unit', count: nOffice, avgSizeSqm: 140 })
      total += nRetail + nOffice
    } else if (devType === 'mixed-use') {
      const nRetail = Math.floor((commArea * 0.7) / 55)
      const nOffice = Math.floor((commArea * 0.3) / 140)
      if (nRetail > 0) {
        mix.push({ type: 'Retail unit', count: nRetail, avgSizeSqm: 55 })
        total += nRetail
      }
      if (nOffice > 0) {
        mix.push({ type: 'Office unit', count: nOffice, avgSizeSqm: 140 })
        total += nOffice
      }
    } else {
      const nRetail = Math.floor(commArea / 55)
      if (nRetail > 0) {
        mix.push({ type: 'Retail unit', count: nRetail, avgSizeSqm: 55 })
        total += nRetail
      }
    }
  }

  if (mix.length === 0) {
    // Degenerate (very small plot): a single unit sized to the plot.
    mix.push({
      type: devType === 'commercial' ? 'Retail unit' : '2 BHK',
      count: 1,
      avgSizeSqm: clampInt(saleableSqm, 30, 160),
    })
    total = 1
  }
  return { totalUnits: total, unitMix: mix }
}

// -------------------------------- highlights --------------------------------

function buildHighlights(
  strategy: Priority,
  devType: DevelopmentType,
  far: number,
  maxFar: number,
  cov: number,
  maxCov: number,
  greenPct: number,
  minGreen: number,
  floors: number,
  totalUnits: number,
  builtUp: number,
  hasCommercial: boolean,
): string[] {
  const heightM = Math.round(floors * FLOOR_HEIGHT_M)
  const capPct = Math.round((far / Math.max(0.1, maxFar)) * 100)
  if (strategy === 'roi') {
    const out = [
      `FAR ${far.toFixed(2)} of ${maxFar.toFixed(2)} permissible — yield maximised`,
      `${floors}-storey massing (~${heightM} m), tallest of the three concepts`,
      `Ground coverage ${Math.round(cov)}% vs ${Math.round(maxCov)}% cap — deliberate stretch, expect flags`,
    ]
    if (hasCommercial) out.push('Commercial share stepped up for rental yield')
    out.push(
      devType === 'house'
        ? `Built-up ${builtUp} sqm across ${floors} floors`
        : `${totalUnits} units at 88% saleable efficiency`,
    )
    return out
  }
  if (strategy === 'balanced') {
    return [
      `FAR ${far.toFixed(2)} (~${capPct}% of cap) keeps approval headroom`,
      'Within the current demo limits for coverage, height, setbacks and green space',
      `${greenPct}% landscaped open space with pocket parks`,
      devType === 'house'
        ? `Family home of ${builtUp} sqm with garden on three sides`
        : devType === 'commercial'
          ? `Retail + office programme, ${totalUnits} lettable units`
          : `Market-standard 2/3 BHK mix, ${totalUnits} units`,
    ]
  }
  return [
    `${greenPct}% green space vs ${Math.round(minGreen)}% mandated — park-first plan`,
    `Low-rise ${floors} floors (~${heightM} m) for daylight and cross-ventilation`,
    `FAR ${far.toFixed(2)} (~${capPct}% of cap) eases load on roads and services`,
    devType === 'house'
      ? 'Compact footprint frees the plot for landscape'
      : 'Looped internal road wrapping a central green',
  ]
}

// ----------------------------- scenario assembly ----------------------------

function mkLandUse(areaSqm: number, parts: Array<[LandUseCategory, number]>): LandUse[] {
  const out: LandUse[] = []
  for (const [use, pctVal] of parts) {
    if (pctVal > 0) out.push({ use, pct: pctVal, areaSqm: Math.round((pctVal / 100) * areaSqm) })
  }
  return out
}

function buildScenario(strategy: Priority, brief: ProjectBrief, rules: BylawRules): Scenario {
  const devType = brief.developmentType
  const areaSqm = Math.max(100, safeNum(brief.plotAreaSqm, 1000))
  const si = strategyIndex(strategy)
  const meta = META[strategy]
  const { plotW, plotD } = plotDims(brief, areaSqm)
  const m = resolveMassing(brief, rules, strategy)
  const maxFar = effectiveMaxFar(brief, rules)
  const maxCov = clamp(safeNum(rules.maxGroundCoveragePct[devType], 40), 10, 80)
  const minGreen = clamp(safeNum(rules.minGreenPct, 12), 5, 35)

  let far = m.far
  let cov = m.coveragePct
  let floors = m.floors
  let layout: LayoutModel
  let landUse: LandUse[]
  let greenPct: number

  if (devType === 'house') {
    const h = buildHouseLayout(rules, plotW, plotD, m.coveragePct, m.far, m.floorsCap, meta.id)
    far = h.far
    cov = h.covPct
    floors = h.floors
    layout = h.layout
    let res = clampInt(h.covPct, 10, 80)
    let green = 100 - res - h.roadsPct - h.utilPct
    if (green < 5) {
      res += green - 5
      green = 5
    }
    landUse = mkLandUse(areaSqm, [
      ['residential', res],
      ['green', green],
      ['roads', h.roadsPct],
      ['utilities', h.utilPct],
    ])
    greenPct = green
  } else {
    const greenT = greenLandPct(strategy, minGreen)
    let commLand = commercialLandPct(devType, si)
    let amenL = amenityLandPct(devType, si)
    const utilL = 3
    const grid = buildMasterplan(
      strategy,
      devType,
      plotW,
      plotD,
      floors,
      greenT,
      commLand,
      amenL,
      utilL,
      meta.id,
    )
    layout = grid.layout
    let residual = 100 - grid.roadsPct - greenT - commLand - amenL - utilL
    if (devType === 'commercial') {
      commLand += Math.max(0, residual)
      residual = 0
    } else if (residual < 12) {
      // Keep a workable residential share on constrained sites.
      const fromComm = Math.min(commLand, 12 - residual)
      commLand -= fromComm
      residual += fromComm
      if (residual < 12) {
        const fromAmen = Math.min(Math.max(0, amenL - 2), 12 - residual)
        amenL -= fromAmen
        residual += fromAmen
      }
    }
    landUse = mkLandUse(areaSqm, [
      ['residential', devType === 'commercial' ? 0 : residual],
      ['commercial', commLand],
      ['green', greenT],
      ['roads', grid.roadsPct],
      ['amenities', amenL],
      ['utilities', utilL],
    ])
    greenPct = greenT
  }

  const builtUpAreaSqm = Math.round(far * areaSqm)
  // Saleable = built-up minus loading; aggressive schemes push loading harder
  // (RERA-era loading ~12–18% in NCR).
  const eff = pick3(si, 0.88, 0.85, 0.82)
  const saleableAreaSqm = Math.round(builtUpAreaSqm * eff)
  const { totalUnits, unitMix } = buildUnits(brief, strategy, rules, builtUpAreaSqm, saleableAreaSqm, floors)
  const hasCommercial = landUse.some((l) => l.use === 'commercial' && l.pct > 0)
  const highlights = buildHighlights(
    strategy,
    devType,
    far,
    maxFar,
    cov,
    maxCov,
    greenPct,
    minGreen,
    floors,
    totalUnits,
    builtUpAreaSqm,
    hasCommercial,
  )

  return {
    id: meta.id,
    name: meta.name,
    tagline: meta.tagline,
    strategy,
    far,
    groundCoveragePct: cov,
    maxFloors: floors,
    landUse,
    builtUpAreaSqm,
    saleableAreaSqm,
    greenPct,
    totalUnits,
    unitMix,
    layout,
    highlights,
  }
}

// --------------------------------- entry point ------------------------------

export function generateScenarios(brief: ProjectBrief, rules: BylawRules): Scenario[] {
  const all: Scenario[] = [
    buildScenario('roi', brief, rules),
    buildScenario('balanced', brief, rules),
    buildScenario('green', brief, rules),
  ]
  // The scenario matching the user's stated priority leads the list; the rest
  // keep their canonical Yield → Balanced → Green order.
  const first = all.filter((s) => s.strategy === brief.priority)
  const rest = all.filter((s) => s.strategy !== brief.priority)
  return [...first, ...rest]
}
