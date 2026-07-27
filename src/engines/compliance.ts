// ---------------------------------------------------------------------------
// UrbanOS MVP — compliance engine.
// Pure & deterministic: same (brief, scenario, rules) → same ComplianceResult.
// No Date/Math.random. All domain constants are demo-grade approximations of
// real Indian codes; each carries a comment naming its real-world reference.
// ---------------------------------------------------------------------------

import type {
  BylawRules,
  ComplianceCheck,
  ComplianceResult,
  ComplianceStatus,
  Jurisdiction,
  ProjectBrief,
  Scenario,
} from '../types'
import { DEV_TYPE_LABELS, LAND_USE_ZONE_LABELS, ZONE_PERMITS } from '../types'
import { article, num, pct } from '../lib/format'

// Typical residential floor-to-floor height, metres (NBC 2016 allows ~3.0-3.2m;
// demo-grade single value).
export const FLOOR_TO_FLOOR_M = 3.1

// High-rise threshold per NBC 2016 Part 4 (building height > 15 m).
const HIGH_RISE_THRESHOLD_M = 15

// Refuge-area trigger per NBC 2016 Part 4 §C-1.11 (height > 24 m).
const REFUGE_THRESHOLD_M = 24

// EC threshold per EIA Notification 2006, Schedule item 8(a):
// built-up area >= 20,000 sq m requires prior Environmental Clearance.
const EC_BUILTUP_THRESHOLD_SQM = 20000

// Rainwater harvesting mandatory above this plot size (CGWA 2020 notification /
// most state bylaws use 100 sq m; demo-grade).
const RWH_PLOT_THRESHOLD_SQM = 100

// Area per Equivalent Car Space incl. circulation (NBC 2016 Part 4 uses
// ~28-32 sq m for basements; demo-grade).
const SQM_PER_ECS = 32

// Local building-code shorthand used in reference strings (demo-grade flavor).
const CODE_BY_JURISDICTION: Record<Jurisdiction, string> = {
  gurugram: 'HBC 2017', // Haryana Building Code 2017
  'dwarka-expressway': 'HBC 2017', // same code as Gurugram; different sector plan
  dwarka: 'UBBL 2016', // Delhi bye-laws + MPD-2021 Dwarka zonal plan
  delhi: 'UBBL 2016', // Unified Building Bye-Laws for Delhi 2016
  noida: 'NBR 2010', // Noida Building Regulations 2010 (as amended)
  bengaluru: 'BBMP ZR 2015', // BBMP RMP-2015 Zoning Regulations
}

/** "DTCP Haryana / GMDA" out of "DTCP Haryana / GMDA (HBC 2017, …)" — the
 * body a change-of-land-use application actually goes to. */
function authorityName(authority: string): string {
  return authority.split('(')[0].trim()
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n))
}

/** "12%" for integers, "12.5%" otherwise — keeps displayed value honest. */
function fmtPct(n: number): string {
  return pct(n, Number.isInteger(n) ? 0 : 1)
}

function fmtM(n: number): string {
  return `${n.toFixed(1)} m`
}

/** Status for "proposed must not exceed cap" rules. Within 10% over → warn. */
function statusOverCap(proposed: number, cap: number): ComplianceStatus {
  if (cap <= 0) return 'pass' // degenerate rule data — nothing to enforce
  if (proposed <= cap) return 'pass'
  return (proposed - cap) / cap <= 0.1 ? 'warn' : 'fail'
}

/** Setbacks required at a given building height. They grow with height: +1 m
 * per 6 m above the 15 m high-rise line, capped at +10 m (patterned on the
 * HBC 2017 height-vs-setback table; demo-grade formula).
 *
 * Exported so the drawing engine can plot the SAME envelope this engine tests
 * against — a setback line on the drawing that disagreed with the compliance
 * report would be worse than no line at all. */
export function requiredSetbacks(
  rules: BylawRules,
  heightM: number,
): { front: number; side: number; rear: number } {
  const bonus = Math.min(10, Math.max(0, Math.ceil((heightM - HIGH_RISE_THRESHOLD_M) / 6)))
  const r1 = (n: number) => Math.round(n * 10) / 10
  return {
    front: r1(rules.setbacks.minFrontM + bonus),
    side: r1(rules.setbacks.minSideM + bonus),
    rear: r1(rules.setbacks.minRearM + bonus),
  }
}

/** Status for "proposed must meet minimum" rules. Shortfall ≤10% → warn. */
function statusUnderMin(proposed: number, min: number): ComplianceStatus {
  if (min <= 0) return 'pass' // nothing mandated
  if (proposed >= min) return 'pass'
  return (min - proposed) / min <= 0.1 ? 'warn' : 'fail'
}

export function checkCompliance(
  brief: ProjectBrief,
  scenario: Scenario,
  rules: BylawRules,
): ComplianceResult {
  const code = CODE_BY_JURISDICTION[rules.id]
  const checks: ComplianceCheck[] = []

  const plotArea = Math.max(0, brief.plotAreaSqm)
  const builtUp = Math.max(0, scenario.builtUpAreaSqm)
  const floors = Math.max(0, scenario.maxFloors)
  const heightM = floors * FLOOR_TO_FLOOR_M

  // ------------------------------- Land Use --------------------------------

  // 0. Use permissibility. This gates everything else — if the master-plan
  // zone does not permit the use, no amount of FAR/setback compliance makes
  // the scheme sanctionable.
  {
    const zone = brief.landUseZone
    const permitted = ZONE_PERMITS[zone]
    const allowed = permitted.includes(brief.developmentType)
    const zoneLabel = LAND_USE_ZONE_LABELS[zone]
    const useLabel = DEV_TYPE_LABELS[brief.developmentType]
    const body = authorityName(rules.authority)
    checks.push({
      id: 'land-use',
      category: 'Land Use',
      rule: 'Use permissible in master-plan zone',
      reference: `${body} zonal plan · ${code}`,
      required:
        permitted.length > 0
          ? `${zoneLabel}: ${permitted.map((d) => DEV_TYPE_LABELS[d]).join(', ')}`
          : `${zoneLabel}: no residential or commercial development outright`,
      proposed: useLabel,
      status: allowed ? 'pass' : 'fail',
      remediation: allowed
        ? undefined
        : `${useLabel} is not permissible in ${article(zoneLabel)} ${zoneLabel} zone. Obtain a change of land use (CLU) from ${body} before filing building plans, or re-site the project onto a conforming parcel.`,
    })
  }

  // ----------------------------- Density & Bulk ----------------------------

  // 1. FAR
  {
    const cap = rules.maxFar[brief.developmentType]
    // A declared site-specific FAR (purchasable FAR, TDR, licence condition or
    // zonal-plan entry) can legitimately sit above the base table. Where the
    // design stays inside what the user declared, this softens from a hard
    // fail to a warn that asks for the instrument on record.
    const declared = brief.farOverride ?? 0
    const sanctioned = declared > 0 && scenario.far <= declared + 1e-9
    let status = statusOverCap(scenario.far, cap)
    if (status === 'fail' && sanctioned) status = 'warn'
    checks.push({
      id: 'far',
      category: 'Density & Bulk',
      rule: 'Maximum permissible FAR',
      reference: `${code} §6.2 (FAR table)`,
      required: sanctioned && declared > cap ? `≤ ${cap.toFixed(2)} base · ${declared.toFixed(2)} declared` : `≤ ${cap.toFixed(2)}`,
      proposed: scenario.far.toFixed(2),
      status,
      remediation:
        status === 'pass'
          ? undefined
          : sanctioned
            ? `Within the declared site-specific FAR of ${declared.toFixed(2)} but above the ${cap.toFixed(2)} base table — attach the purchasable-FAR receipt, TDR certificate or zonal-plan sanction to the building-plan submission.`
            : `Trim built-up area by ~${num(Math.max(0, (scenario.far - cap) * plotArea))} sq m or purchase TDR to bring FAR within ${cap.toFixed(2)}.`,
    })
  }

  // 2. Ground coverage
  {
    const cap = rules.maxGroundCoveragePct[brief.developmentType]
    const status = statusOverCap(scenario.groundCoveragePct, cap)
    checks.push({
      id: 'ground-coverage',
      category: 'Density & Bulk',
      rule: 'Maximum ground coverage',
      reference: `${code} §6.3 (coverage table)`,
      required: `≤ ${fmtPct(cap)}`,
      proposed: fmtPct(scenario.groundCoveragePct),
      status,
      remediation:
        status === 'pass'
          ? undefined
          : `Reduce footprint to ≤ ${fmtPct(cap)} of plot by stacking floors or shrinking the podium.`,
    })
  }

  // 3. Building height
  {
    if (rules.maxHeightM === null) {
      // No statutory cap — height governed by AAI / fire NOCs instead.
      checks.push({
        id: 'height',
        category: 'Density & Bulk',
        rule: 'Maximum building height',
        reference: `${code} §6.4 · AAI (NOC) Rules 2015`,
        required: 'No cap — AAI NOC required',
        proposed: `${fmtM(heightM)} (${num(floors)} floors)`,
        status: 'pass',
      })
    } else {
      const status = statusOverCap(heightM, rules.maxHeightM)
      const maxFloorsAllowed = Math.max(1, Math.floor(rules.maxHeightM / FLOOR_TO_FLOOR_M))
      checks.push({
        id: 'height',
        category: 'Density & Bulk',
        rule: 'Maximum building height',
        reference: `${code} §6.4 (height restrictions)`,
        required: `≤ ${fmtM(rules.maxHeightM)}`,
        proposed: `${fmtM(heightM)} (${num(floors)} floors)`,
        status,
        remediation:
          status === 'pass'
            ? undefined
            : `Cap towers at ${num(maxFloorsAllowed)} floors (≈ ${fmtM(maxFloorsAllowed * FLOOR_TO_FLOOR_M)}) and redistribute FAR across additional blocks.`,
      })
    }
  }

  // ------------------------------- Open Space ------------------------------

  // 4. Green / organised open space
  {
    const min = rules.minGreenPct
    const status = statusUnderMin(scenario.greenPct, min)
    checks.push({
      id: 'green',
      category: 'Open Space',
      rule: 'Minimum green & organised open space',
      reference: `${code} §7.1 · URDPFI Guidelines 2015`,
      required: `≥ ${fmtPct(min)}`,
      proposed: fmtPct(scenario.greenPct),
      status,
      remediation:
        status === 'pass'
          ? undefined
          : `Convert ~${num(((min - scenario.greenPct) / 100) * plotArea)} sq m of paved/roads area to landscaped open space to reach ${fmtPct(min)}.`,
    })
  }

  // -------------------------------- Setbacks -------------------------------

  // Round to 0.1 m so displayed values drive the status.
  const round1 = (n: number) => Math.round(n * 10) / 10
  const reqSetbacks = requiredSetbacks(rules, heightM)
  // Green/Balanced concepts keep a 10% margin on every side; the Yield Max
  // (roi) concept squeezes ONE side to 95% of required → deliberate warn.
  const sideFactors: Record<'front' | 'side' | 'rear', number> = {
    front: 1.1,
    side: scenario.strategy === 'roi' ? 0.95 : 1.1,
    rear: 1.1,
  }
  const setbackDefs: { key: 'front' | 'side' | 'rear'; rule: string; ref: string }[] = [
    { key: 'front', rule: 'Minimum front setback', ref: `${code} §6.5(a)` },
    { key: 'side', rule: 'Minimum side setback', ref: `${code} §6.5(b)` },
    { key: 'rear', rule: 'Minimum rear setback', ref: `${code} §6.5(c)` },
  ]
  for (const def of setbackDefs) {
    const required = reqSetbacks[def.key]
    const proposed = round1(required * sideFactors[def.key])
    const status = statusUnderMin(proposed, required)
    checks.push({
      id: `setback-${def.key}`,
      category: 'Setbacks',
      rule: def.rule,
      reference: `${def.ref} (scaled for ${fmtM(heightM)} height)`,
      required: `≥ ${fmtM(required)}`,
      proposed: fmtM(proposed),
      status,
      remediation:
        status === 'pass'
          ? undefined
          : `Pull the ${def.key} building line back by ${fmtM(round1(required - proposed))} — trim the podium edge or slim the tower floor plate.`,
    })
  }

  // -------------------------------- Parking --------------------------------

  // 5. ECS demand vs deterministic supply model:
  // basement + podium = footprint × 2 levels at 32 sq m/ECS, plus surface
  // parking on ~10% of plot (NBC 2016 Part 4 parking norms; demo-grade).
  {
    const requiredEcs = Math.ceil((builtUp / 100) * rules.parkingEcsPer100Sqm)
    const footprintSqm = plotArea * (clamp(scenario.groundCoveragePct, 0, 100) / 100)
    const structuredEcs = (footprintSqm * 2) / SQM_PER_ECS
    // Surface parking on up to 10% of the plot, capped by what is actually
    // open (not built over, not mandated green) — a 75%-coverage scheme cannot
    // also park on a tenth of the plot.
    const openFrac = Math.max(
      0,
      1 - clamp(scenario.groundCoveragePct, 0, 100) / 100 - clamp(scenario.greenPct, 0, 100) / 100,
    )
    const surfaceEcs = (plotArea * Math.min(0.1, openFrac * 0.25)) / SQM_PER_ECS
    const providedEcs = Math.floor(structuredEcs + surfaceEcs)
    const status = statusUnderMin(providedEcs, requiredEcs)
    checks.push({
      id: 'parking',
      category: 'Parking',
      rule: 'Equivalent Car Spaces (ECS)',
      reference: `${code} §8.2 · NBC 2016 Part 4 (parking norms)`,
      required: `≥ ${num(requiredEcs)} ECS (@ ${rules.parkingEcsPer100Sqm} / 100 sq m)`,
      proposed: `${num(providedEcs)} ECS (2 basement/podium levels + surface)`,
      status,
      remediation:
        status === 'pass'
          ? undefined
          : `Short by ${num(requiredEcs - providedEcs)} ECS — add a third basement level or mechanical stack parking.`,
    })
  }

  // -------------------------- Fire & Life Safety ---------------------------

  // 6. High-rise fire access: abutting road width.
  {
    const isHighRise = heightM > HIGH_RISE_THRESHOLD_M
    const status: ComplianceStatus = isHighRise
      ? statusUnderMin(brief.roadWidthM, rules.minRoadWidthForHighRiseM)
      : 'pass'
    checks.push({
      id: 'fire-access',
      category: 'Fire & Life Safety',
      rule: 'Abutting road width for high-rise',
      reference: 'NBC 2016 Part 4 §4.4 (fire appliance access)',
      required: isHighRise
        ? `≥ ${fmtM(rules.minRoadWidthForHighRiseM)} (height > 15 m)`
        : 'N/A — not a high-rise (≤ 15 m)',
      proposed: `${fmtM(brief.roadWidthM)} abutting road`,
      status,
      remediation:
        status === 'pass'
          ? undefined
          : `Road is ${fmtM(round1(rules.minRoadWidthForHighRiseM - brief.roadWidthM))} short for fire-tender access — cap height at 15 m or secure a wider approach road before sanction.`,
    })
  }

  // 7. Refuge area for towers above 24 m (NBC 2016 Part 4 §C-1.11).
  {
    const needsRefuge = heightM > REFUGE_THRESHOLD_M
    checks.push({
      id: 'refuge-area',
      category: 'Fire & Life Safety',
      rule: 'Refuge area provision',
      reference: 'NBC 2016 Part 4 §C-1.11 (refuge area)',
      required: needsRefuge
        ? 'Refuge floor every ≤ 15 m above 24 m'
        : 'N/A — height ≤ 24 m',
      proposed: needsRefuge
        ? 'Refuge decks included in tower design'
        : `${fmtM(heightM)} tower height`,
      status: 'pass',
    })
  }

  // ------------------------------ Environment ------------------------------

  // 8. Rainwater harvesting.
  {
    const mandated = plotArea > RWH_PLOT_THRESHOLD_SQM
    checks.push({
      id: 'rwh',
      category: 'Environment',
      rule: 'Rainwater harvesting',
      reference: 'CGWA Notification 2020 · MoHUA model bylaws',
      required: mandated
        ? 'Mandatory (plot > 100 sq m)'
        : 'N/A — plot ≤ 100 sq m',
      proposed: mandated
        ? `Recharge pits provided (~1 per 500 sq m of plot)`
        : 'Not mandated at this plot size',
      status: 'pass',
    })
  }

  // 9. Environmental Clearance — process gate, not a design violation.
  {
    const needsEc = builtUp >= EC_BUILTUP_THRESHOLD_SQM
    checks.push({
      id: 'env-clearance',
      category: 'Environment',
      rule: 'Prior Environmental Clearance (EC)',
      reference: 'EIA Notification 2006, Schedule 8(a)',
      required: `EC if built-up ≥ ${num(EC_BUILTUP_THRESHOLD_SQM)} sq m`,
      proposed: `${num(builtUp)} sq m built-up`,
      status: needsEc ? 'warn' : 'pass',
      remediation: needsEc ? 'Obtain EC from SEIAA before construction.' : undefined,
    })
  }

  // ---------------------------- Inclusive Housing --------------------------

  // 10. EWS / affordable housing quota (group housing & townships only).
  {
    const applies =
      (brief.developmentType === 'group-housing' || brief.developmentType === 'township') &&
      rules.ewsPctRequired > 0
    if (!applies) {
      checks.push({
        id: 'ews',
        category: 'Inclusive Housing',
        rule: 'EWS / affordable housing quota',
        reference: `${code} §9.1 · state affordable housing policy`,
        required:
          rules.ewsPctRequired > 0
            ? `N/A — applies to group housing / township`
            : 'Not mandated in this jurisdiction',
        proposed: 'Not applicable',
        status: 'pass',
      })
    } else {
      // Balanced/Green concepts reserve the full quota; Yield Max reserves
      // half and defers the rest — surfaced as a warn (policy gap fixable via
      // unit-mix reallocation, not a hard geometric violation).
      const providedPct =
        scenario.strategy === 'roi' ? round1(rules.ewsPctRequired / 2) : rules.ewsPctRequired
      const status: ComplianceStatus = providedPct >= rules.ewsPctRequired ? 'pass' : 'warn'
      checks.push({
        id: 'ews',
        category: 'Inclusive Housing',
        rule: 'EWS / affordable housing quota',
        reference: `${code} §9.1 · state affordable housing policy`,
        required: `≥ ${fmtPct(rules.ewsPctRequired)} of units`,
        proposed: fmtPct(providedPct),
        status,
        remediation:
          status === 'pass'
            ? undefined
            : `Reallocate ~${fmtPct(round1(rules.ewsPctRequired - providedPct))} of units to EWS stock (or pay shelter-fee in lieu where the policy permits).`,
      })
    }
  }

  // ------------------------------- Aggregate -------------------------------

  const summary = checks.reduce(
    (acc, c) => {
      acc[c.status] += 1
      return acc
    },
    { pass: 0, warn: 0, fail: 0 },
  )
  const score = clamp(100 - 6 * summary.warn - 18 * summary.fail, 0, 100)

  return { scenarioId: scenario.id, score, checks, summary }
}
