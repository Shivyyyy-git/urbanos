// ---------------------------------------------------------------------------
// UrbanOS MVP — construction planning engine.
//
// planConstruction() turns a project brief + selected scenario into a phased
// execution roadmap in the typical Indian delivery sequence (RERA registration
// → plan sanction → enabling works → RCC structure → MEP/finishes → OC &
// handover), plus manpower, material take-offs and milestones.
//
// PURE & DETERMINISTIC: same (brief, scenario) → same plan. No clock reads,
// no randomness — the timeline is expressed in relative months (0-based).
//
// Duration model
// --------------
// 1. Each development type carries a base duration band calibrated to
//    RERA-era Indian timelines: house 10–14 mo; group-housing / mixed-use
//    30–48 mo (multi-tower RCC); commercial 24–36 mo; integrated township
//    (phase-1 infra + towers) 48–72 mo.
// 2. Built-up area interpolates within the band on a LOG scale between a
//    reference "small" and "large" project of the type — a 10× larger job
//    does NOT take 10× longer because slab-cycle parallelism across
//    blocks/towers dominates.
// 3. Floor count nudges the result: each floor above/below the type's
//    reference adds/removes ~0.4 months (vertical construction is serial —
//    roughly a 10–14 day slab cycle amortised), clamped to stay plausible.
// 4. Five overlapping phases are laid out as fractions of the total;
//    totalMonths equals the end of the last-finishing phase exactly.
// ---------------------------------------------------------------------------

import type {
  ConstructionPhase,
  ConstructionPlan,
  DevelopmentType,
  Jurisdiction,
  ProjectBrief,
  Scenario,
} from '../types'
import { SQFT_PER_SQM } from '../types'
import { num } from '../lib/format'

// ------------------------------- small utils -------------------------------

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v))
}

/** Indian-style quantity string: "3.2 lakh bags", "1.2 crore nos", "12,400 MT". */
function qtyIndian(n: number, unit: string): string {
  if (!Number.isFinite(n) || n <= 0) return `0 ${unit}`
  const scaled = (v: number): string =>
    v.toLocaleString('en-IN', { maximumFractionDigits: v >= 100 ? 0 : v >= 10 ? 1 : 2 })
  if (n >= 1e7) return `${scaled(n / 1e7)} crore ${unit}` // ≥ 1,00,00,000
  if (n >= 1e5) return `${scaled(n / 1e5)} lakh ${unit}` // ≥ 1,00,000
  if (n < 100) return `${n.toLocaleString('en-IN', { maximumFractionDigits: 1 })} ${unit}`
  return `${num(n)} ${unit}` // en-IN grouped integer, e.g. "12,400 MT"
}

/** Plan-sanction authority label. Engines depend on types.ts only, so this
 * tiny display map lives here instead of importing the jurisdiction data. */
const AUTHORITY: Record<Jurisdiction, string> = {
  gurugram: 'DTCP Haryana',
  'dwarka-expressway': 'DTCP Haryana',
  dwarka: 'DDA',
  delhi: 'MCD/DDA',
  noida: 'Noida Authority',
  bengaluru: 'BBMP/BDA',
}

// --------------------------- per-type calibration ---------------------------

interface TypeParams {
  /** Base duration band, months (see model notes above). */
  minMonths: number
  maxMonths: number
  /** Built-up area (sqm) mapped to minMonths / maxMonths via log interp. */
  refAreaMinSqm: number
  refAreaMaxSqm: number
  /** Reference floor count for the band; deviation adds ~0.4 mo per floor. */
  refFloors: number
  /** Clamp band for peak site manpower (house 15–30 … township 1500+). */
  peakMin: number
  peakMax: number
}

const TYPE_PARAMS: Record<DevelopmentType, TypeParams> = {
  // 120 sqm cottage ≈ 10 mo; 1,000 sqm bungalow ≈ 14 mo.
  house: { minMonths: 10, maxMonths: 14, refAreaMinSqm: 120, refAreaMaxSqm: 1000, refFloors: 2, peakMin: 15, peakMax: 30 },
  // Boutique society ≈ 30 mo; 2 lakh sqm multi-tower community ≈ 48 mo.
  'group-housing': { minMonths: 30, maxMonths: 48, refAreaMinSqm: 10_000, refAreaMaxSqm: 200_000, refFloors: 14, peakMin: 120, peakMax: 2600 },
  'mixed-use': { minMonths: 30, maxMonths: 48, refAreaMinSqm: 12_000, refAreaMaxSqm: 250_000, refFloors: 12, peakMin: 120, peakMax: 2600 },
  commercial: { minMonths: 24, maxMonths: 36, refAreaMinSqm: 8_000, refAreaMaxSqm: 150_000, refFloors: 8, peakMin: 80, peakMax: 1800 },
  // Townships are phased; even 100-acre schemes deliver cycle 1 in ~6 years.
  township: { minMonths: 48, maxMonths: 72, refAreaMinSqm: 80_000, refAreaMaxSqm: 1_500_000, refFloors: 10, peakMin: 250, peakMax: 6000 },
}

// ---------------------------------- engine ----------------------------------

export function planConstruction(brief: ProjectBrief, scenario: Scenario): ConstructionPlan {
  const devType = brief.developmentType
  const p = TYPE_PARAMS[devType]
  const isHouse = devType === 'house'
  const isTownship = devType === 'township'
  const authority = AUTHORITY[brief.jurisdiction]

  // -- Guard degenerate inputs (200 sqm house through 100-acre township):
  //    zero/NaN built-up falls back to half the plot (min 100 sqm); floors ≥ 1.
  const plotSqm = Number.isFinite(brief.plotAreaSqm) ? brief.plotAreaSqm : 0
  const builtUpSqm =
    Number.isFinite(scenario.builtUpAreaSqm) && scenario.builtUpAreaSqm > 0
      ? scenario.builtUpAreaSqm
      : Math.max(100, plotSqm * 0.5)
  const floors =
    Number.isFinite(scenario.maxFloors) && scenario.maxFloors >= 1
      ? Math.min(Math.round(scenario.maxFloors), 150)
      : 1
  const sqft = builtUpSqm * SQFT_PER_SQM

  // -- Total duration: log-interpolate area within the type band, adjust for
  //    floors, clamp to a plausible envelope around the band.
  const areaT = clamp(
    (Math.log(clamp(builtUpSqm, 100, 1e9)) - Math.log(p.refAreaMinSqm)) /
      (Math.log(p.refAreaMaxSqm) - Math.log(p.refAreaMinSqm)),
    0,
    1,
  )
  const areaBase = p.minMonths + areaT * (p.maxMonths - p.minMonths)
  const floorAdj = clamp((floors - p.refFloors) * 0.4, -4, 10) // ~0.4 mo per extra floor
  const T = clamp(Math.round(areaBase + floorAdj), Math.max(8, p.minMonths - 2), p.maxMonths + 10)

  // -- Phase scheduling (overlapping, like a real bar-chart programme):
  //    approvals start day one; enabling/site works mobilise ~60% into the
  //    approvals run (under temporary permissions); structure follows once the
  //    first work-front corridor is ready; MEP & finishes trail the frame by
  //    ~45% of its run; external development closes the programme at T.
  const p1Dur = clamp(Math.round(T * 0.18), 2, 8)
  const p2Start = Math.max(1, Math.round(p1Dur * 0.6))
  // Townships carry far heavier internal infrastructure (trunk roads/services).
  const p2Dur = Math.max(2, Math.round(T * (isTownship ? 0.32 : 0.28)))
  const p3Start = p2Start + Math.max(1, Math.round(p2Dur * 0.25))
  const p3Dur = Math.max(3, Math.round(T * 0.5))
  const p4Start = p3Start + Math.max(1, Math.round(p3Dur * 0.45))
  const p4End = T - Math.max(1, Math.round(T * 0.06)) // finishes wrap just before close-out
  const p4Dur = Math.max(2, p4End - p4Start)
  const p5Dur = clamp(Math.round(T * 0.15), 2, 9)
  let p5Start = T - p5Dur // last phase ends exactly at T
  if (p5Start <= p4Start) p5Start = Math.min(T - 1, p4Start + 1) // compressed-schedule guard

  // -- Manpower: peak site strength scales sub-linearly with built-up area
  //    (~150 workers per lakh sqft at unit scale; exponent 0.6 reflects work
  //    phasing on large sites), clamped to the type band → a 200 sqm house
  //    peaks at 15–30 hands, a 100-acre township crests past 1,500.
  const peak = clamp(Math.round(150 * Math.pow(sqft / 100_000, 0.6)), p.peakMin, p.peakMax)
  const peakP1 = Math.max(3, Math.round(peak * 0.06))
  const peakP2 = Math.max(6, Math.round(peak * 0.35))
  const peakP3 = peak // structure is the manpower crest
  const peakP4 = Math.max(8, Math.round(peak * 0.8))
  const peakP5 = Math.max(4, Math.round(peak * 0.25))

  // -- Foundation system by height (IS 1904 / common Indian geotech practice):
  //    shallow footings low-rise, raft mid-rise, piles high-rise.
  const foundation =
    floors >= 15 ? 'piling & pile caps (high-rise)' : floors >= 5 ? 'raft foundation' : 'isolated & strip footings'
  // Environmental clearance applies at ≥ 20,000 sqm built-up (EIA 2006 norms).
  const needsEC = builtUpSqm >= 20_000

  const phases: ConstructionPhase[] = [
    {
      name: 'Approvals & Mobilization',
      startMonth: 0,
      durationMonths: p1Dur,
      activities: [
        ...(isHouse
          ? [`Building plan sanction (${authority})`, 'Soil investigation & structural design']
          : [
              'RERA registration & escrow account setup (RERA Act 2016)',
              `Building plan sanction (${authority})`,
              needsEC ? 'Environmental clearance & NOCs (fire, AAI, pollution)' : 'Fire & utility NOCs',
            ]),
        'Site office, stores & labour camp mobilization',
        'Contractor finalisation & mobilization advance',
      ].slice(0, 5),
      manpowerPeak: peakP1,
    },
    {
      name: 'Site Development & Infrastructure',
      startMonth: p2Start,
      durationMonths: p2Dur,
      activities: [
        'Site clearing, grading & survey benchmarks',
        ...(isHouse
          ? ['Boundary wall & plot drainage', 'Temporary power & water connections']
          : [
              'Internal roads & utility-corridor earthwork',
              'Storm-water drainage & sewer network',
              'Water lines, substation & DG-yard enabling works',
            ]),
        ...(isTownship ? ['Sector-level trunk infrastructure'] : []),
      ].slice(0, 5),
      manpowerPeak: peakP2,
    },
    {
      name: 'Structure',
      startMonth: p3Start,
      durationMonths: p3Dur,
      activities: [
        `Excavation & ${foundation}`,
        isHouse
          ? 'RCC frame — plinth to roof slab (IS 456:2000)'
          : 'RCC frame — cores, columns & slab cycles (IS 456:2000)',
        'Blockwork & masonry trailing the frame',
        floors >= 4 ? 'Stair & lift cores, OH tanks & waterproofing' : 'Roof slab, parapet & waterproofing',
      ].slice(0, 5),
      manpowerPeak: peakP3,
    },
    {
      name: 'MEP & Finishes',
      startMonth: p4Start,
      durationMonths: p4Dur,
      activities: [
        ...(isHouse
          ? ['Electrical conduiting & plumbing first fix', 'Internal plaster, flooring & tiling']
          : [
              'MEP first fix — electrical, plumbing risers, fire mains (NBC 2016 Part 4)',
              'Façade, glazing & external plaster',
              'Flooring, doors-windows & internal finishes',
            ]),
        isHouse
          ? 'Doors, windows, painting & fixtures'
          : 'Lifts, DG sets, STP & fire systems — testing & commissioning',
      ].slice(0, 5),
      manpowerPeak: peakP4,
    },
    {
      name: 'External Development & Handover',
      startMonth: p5Start,
      durationMonths: T - p5Start, // last-finishing phase defines totalMonths
      activities: [
        'Landscaping, external lighting & signage',
        isHouse
          ? `Completion certificate application (${authority})`
          : 'Occupancy certificate (OC) application & authority inspections',
        'Snagging, deep cleaning & unit handover',
        ...(isTownship ? ['Trunk-infrastructure handover to O&M / RWA'] : []),
      ].slice(0, 5),
      manpowerPeak: peakP5,
    },
  ]

  // Contract invariant: totalMonths = end of the last-finishing phase.
  const totalMonths = phases.reduce((m, ph) => Math.max(m, ph.startMonth + ph.durationMonths), 0)

  // -- Manpower roster at structural peak. Fractions follow common Indian site
  //    ratios (≈1 supervisor per 20 workers, ≈1 engineer per 30; safety staff
  //    per BOCW Act 1996 norms); trade counts sum to roughly the phase-3 peak.
  const manpower: { role: string; count: number }[] = [
    { role: 'Project manager', count: Math.max(1, Math.round(peak / 250)) },
    { role: 'Site engineers', count: Math.max(1, Math.round(peak * 0.035)) },
    { role: 'Supervisors / foremen', count: Math.max(1, Math.round(peak * 0.055)) },
    { role: 'Skilled workers (bar benders, masons, carpenters)', count: Math.max(4, Math.round(peak * 0.44)) },
    { role: 'MEP technicians', count: Math.max(1, Math.round(peak * 0.12)) },
    { role: 'Unskilled labour', count: Math.max(3, Math.round(peak * 0.3)) },
    { role: 'Safety officers', count: Math.max(1, Math.round(peak / 200)) }, // BOCW Act 1996
    { role: 'Store & QA/QC staff', count: Math.max(1, Math.round(peak * 0.02)) },
  ]

  // -- Material take-off per sqft of built-up area using standard Indian
  //    estimator thumb rules (RCC-frame construction, demo-grade):
  const materials: { name: string; qty: string }[] = [
    // Cement: ~0.4 bags (50 kg) per sqft — CPWD thumb rule.
    { name: 'Cement (OPC/PPC, 50 kg bags)', qty: qtyIndian(sqft * 0.4, 'bags') },
    // Reinforcement steel: ~3.5 kg TMT per sqft → tonnes.
    { name: 'TMT steel (Fe 500D)', qty: qtyIndian((sqft * 3.5) / 1000, 'MT') },
    // Structural concrete: ~0.045 m³ RMC per sqft (frame + PCC).
    { name: 'Ready-mix concrete', qty: qtyIndian(sqft * 0.045, 'm³') },
    // Walling: ~8 modular bricks per sqft (fly-ash brick thumb rule; AAC block
    // counts would be ~8-10x lower by unit).
    { name: 'Fly-ash bricks (modular)', qty: qtyIndian(sqft * 8, 'nos') },
    // Fine aggregate: ~1.8 cft sand per sqft ≈ 0.051 m³/sqft.
    { name: 'Sand (river / M-sand)', qty: qtyIndian(sqft * 1.8 * 0.0283, 'm³') },
    // Coarse aggregate: ~1.35 cft per sqft ≈ 0.038 m³/sqft.
    { name: 'Coarse aggregate (20 mm)', qty: qtyIndian(sqft * 1.35 * 0.0283, 'm³') },
  ]

  // -- Milestones tied to phase geometry, forced into a strictly increasing
  //    chain clamped to programme end so labels stay ordered even on a
  //    compressed 10-month house schedule.
  const ocMonth = p5Start + Math.max(1, Math.round((totalMonths - p5Start) * 0.6))
  const rawMilestones: { month: number; label: string }[] = [
    ...(isHouse ? [] : [{ month: Math.round(p1Dur * 0.5), label: 'RERA registration obtained' }]),
    { month: p1Dur, label: 'Building plans sanctioned' },
    { month: p3Start, label: 'Groundbreaking — excavation begins' },
    { month: p3Start + Math.max(1, Math.round(p3Dur * 0.22)), label: 'Plinth level completed' },
    { month: p3Start + p3Dur, label: 'Structure topped out' },
    { month: ocMonth, label: isHouse ? 'Completion certificate received' : 'Occupancy certificate received' },
    { month: ocMonth + 1, label: isHouse ? 'Handover & possession' : 'Unit handover begins' },
  ]
  const milestones: { month: number; label: string }[] = []
  let prev = 0
  for (const m of rawMilestones) {
    const month = Math.min(totalMonths, Math.max(prev + 1, m.month))
    milestones.push({ month, label: m.label })
    prev = month
  }

  return {
    scenarioId: scenario.id,
    totalMonths,
    phases,
    manpower,
    materials,
    milestones,
  }
}
