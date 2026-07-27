// ---------------------------------------------------------------------------
// UrbanOS MVP — feasibility engine.
// Pure + deterministic: same (brief, scenario, market) → same FeasibilityResult.
// All money figures in ₹ crore (1 Cr = 1e7 ₹). Demo-grade domain values are
// commented with their real-world reference. No Date/random/global state.
// ---------------------------------------------------------------------------

import type {
  DevelopmentType,
  FeasibilityResult,
  MarketData,
  MoneyLine,
  ProjectBrief,
  Scenario,
} from '../types'
import { SQFT_PER_SQM, SQM_PER_ACRE } from '../types'
import { formatCr, months, num, pct, sqft } from '../lib/format'

const CR = 1e7 // ₹ per crore

// Marketing & sales: 3–4% of gross revenue is the standard NCR developer norm
// (brokerage + launch spends); demo value 3.5%.
const MARKETING_PCT_OF_REVENUE = 0.035

// Construction finance: ~9% p.a. is a typical 2026 developer borrowing rate
// (RBI repo ~5.5% + NBFC/bank spread for real-estate construction loans).
const FINANCE_RATE_PA = 0.09
// Debt-funded share of hard costs (typical 60:40 debt:equity structure).
const DEBT_SHARE_OF_HARD_COSTS = 0.6

// Contingency: 5% of hard costs (CPWD works-manual style provision, demo-grade).
const CONTINGENCY_PCT_OF_HARD = 0.05

// Infrastructure & services (internal roads, STP/WTP, power, fire mains) as a
// share of construction cost. Townships carry the heaviest external-infra
// backbone; standalone houses the lightest. Range per spec: 8–14%.
const INFRA_PCT_BY_TYPE: Record<DevelopmentType, number> = {
  house: 0.08,
  'group-housing': 0.1,
  commercial: 0.1,
  'mixed-use': 0.11,
  township: 0.14,
}

// Market-depth score (0–20) — fixed per development type. Rationale: mid-income
// group housing has the deepest buyer pool in NCR/Bengaluru (fastest absorption
// in 2024-25 residential market reports); commercial lease-up is cyclical and
// slower; townships absorb over many phased years. Demo-grade heuristic.
const MARKET_DEPTH_PTS: Record<DevelopmentType, number> = {
  'group-housing': 18,
  house: 16,
  'mixed-use': 14,
  commercial: 11,
  township: 10,
}

/** Replace NaN/Infinity with 0 so no degenerate input can poison the output. */
function fin(n: number): number {
  return Number.isFinite(n) ? n : 0
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, fin(n)))
}

function round1(n: number): number {
  return Math.round(fin(n) * 10) / 10
}

/** Cr amounts kept to 2 decimals so lines sum cleanly in the UI. */
function cr2(n: number): number {
  return Math.max(0, Math.round(fin(n) * 100) / 100)
}

/**
 * Construction period in months, derived from built-up area.
 * Simple linear ramp: 24-month floor (small builds) + 1 month per 5,000 sqm,
 * capped at 60 months for the largest townships. Deterministic by design.
 */
function constructionMonths(builtUpSqm: number): number {
  return Math.round(clamp(24 + Math.max(0, builtUpSqm) / 5000, 24, 60))
}

/** Residential vs commercial share of sellable area, normalised to sum 1. */
function saleShares(scenario: Scenario, type: DevelopmentType): { resi: number; comm: number } {
  const resiPct = scenario.landUse
    .filter((l) => l.use === 'residential')
    .reduce((s, l) => s + Math.max(0, l.pct), 0)
  const commPct = scenario.landUse
    .filter((l) => l.use === 'commercial')
    .reduce((s, l) => s + Math.max(0, l.pct), 0)
  const total = resiPct + commPct
  if (total <= 0) {
    // Degenerate land-use table: fall back on the development type itself.
    return type === 'commercial' ? { resi: 0, comm: 1 } : { resi: 1, comm: 0 }
  }
  return { resi: resiPct / total, comm: commPct / total }
}

/** Blended construction rate, ₹/sqft of built-up. */
function constructionRate(market: MarketData, type: DevelopmentType, shares: { resi: number; comm: number }): number {
  if (type === 'mixed-use') {
    // Blend multi-storey residential (group-housing) and commercial shell rates
    // by the scenario's residential/commercial land-use split.
    const blended =
      shares.resi * market.constructionCostPerSqft['group-housing'] +
      shares.comm * market.constructionCostPerSqft.commercial
    return blended > 0 ? blended : market.constructionCostPerSqft['mixed-use']
  }
  return market.constructionCostPerSqft[type]
}

interface Shift {
  constructionMult: number
  priceMult: number
  extraFinanceMonths: number
}

interface CoreNumbers {
  costs: MoneyLine[]
  totalCostCr: number
  revenues: MoneyLine[]
  totalRevenueCr: number
  profitCr: number
  roiPct: number
  buildMonths: number
  infraPct: number
  buildRate: number
  resiRate: number
  commRate: number
}

/** One full pass of the cost/revenue model under a what-if shift. */
function compute(
  brief: ProjectBrief,
  scenario: Scenario,
  market: MarketData,
  shift: Shift,
  buildMonthsOverride?: number,
): CoreNumbers {
  const type = brief.developmentType
  const acresVal = Math.max(0, brief.plotAreaSqm) / SQM_PER_ACRE
  const builtUpSqft = Math.max(0, scenario.builtUpAreaSqm) * SQFT_PER_SQM
  const saleableSqft = Math.max(0, scenario.saleableAreaSqm) * SQFT_PER_SQM
  const shares = saleShares(scenario, type)

  // ----- Revenue (needed first: marketing is a % of revenue) -----
  // Residential share priced at its own asset class — mixed-use apartments sell
  // at the group-housing rate, not the blended "mixed-use" figure; commercial
  // share always at the commercial rate. 'house' = notional completed value.
  const resiRateKey = type === 'mixed-use' ? 'group-housing' : type === 'commercial' ? 'commercial' : type
  const resiRate = market.salePricePerSqft[resiRateKey] * shift.priceMult
  const commRate = market.salePricePerSqft.commercial * shift.priceMult
  const resiSqm = Math.max(0, scenario.saleableAreaSqm) * shares.resi
  const commSqm = Math.max(0, scenario.saleableAreaSqm) * shares.comm
  const resiSqft = saleableSqft * shares.resi
  const commSqft = saleableSqft * shares.comm
  const resiRevenueCr = cr2((resiSqft * resiRate) / CR)
  const commRevenueCr = cr2((commSqft * commRate) / CR)

  const revenues: MoneyLine[] = []
  if (type === 'house') {
    // Owner-built house: no sales programme; still valued for the report.
    revenues.push({ label: 'Estimated completed value', amountCr: cr2(resiRevenueCr + commRevenueCr) })
  } else {
    if (resiSqft > 0) {
      revenues.push({ label: `Residential sales — ${sqft(resiSqm)}`, amountCr: resiRevenueCr })
    }
    if (commSqft > 0) {
      revenues.push({ label: `Commercial sales / lease value — ${sqft(commSqm)}`, amountCr: commRevenueCr })
    }
    if (revenues.length === 0) {
      revenues.push({ label: 'Sales revenue', amountCr: 0 })
    }
  }
  const totalRevenueCr = cr2(revenues.reduce((s, r) => s + r.amountCr, 0))

  // ----- Costs -----
  // Land acquisition only when the brief is evaluating a purchase; owned land
  // (the PRD's "I own 20 acres" framing, the default) excludes it and the ROI
  // reads as development margin on owned land. Land is treated as equity-funded
  // — excluded from the finance-cost (debt) base below.
  const landOwned = brief.landOwned !== false
  const landAcqCr = landOwned ? 0 : cr2(acresVal * Math.max(0, market.landPricePerAcreCr))

  const landDevCr = cr2(acresVal * Math.max(0, market.landDevCostPerAcreCr))

  const buildRate = constructionRate(market, type, shares) * shift.constructionMult
  const constructionCr = cr2((builtUpSqft * buildRate) / CR)

  const infraPct = INFRA_PCT_BY_TYPE[type]
  const infraCr = cr2(constructionCr * infraPct)

  const approvalsCr = cr2(constructionCr * Math.max(0, market.approvalCostPctOfConstruction))

  const marketingCr = type === 'house' ? 0 : cr2(totalRevenueCr * MARKETING_PCT_OF_REVENUE)

  // Hard costs = land development + construction + infrastructure.
  const hardCostsCr = landDevCr + constructionCr + infraCr

  // Prefer the construction engine's programme length (passed by the wirer) so
  // the Feasibility and Construction views never quote different durations.
  const buildMonths = buildMonthsOverride ?? constructionMonths(scenario.builtUpAreaSqm)
  // Interest on the debt-funded 60% of hard costs, for half the build period
  // (average drawn balance approximation of an S-curve drawdown). A delay
  // shift extends the interest-bearing period.
  const financeYears = (buildMonths + Math.max(0, shift.extraFinanceMonths)) / 12
  const financeCr = cr2(hardCostsCr * DEBT_SHARE_OF_HARD_COSTS * FINANCE_RATE_PA * financeYears * 0.5)

  const contingencyCr = cr2(hardCostsCr * CONTINGENCY_PCT_OF_HARD)

  const costs: MoneyLine[] = [
    ...(landOwned ? [] : [{ label: 'Land acquisition', amountCr: landAcqCr }]),
    { label: 'Land development & site works', amountCr: landDevCr },
    { label: 'Construction', amountCr: constructionCr },
    { label: 'Infrastructure & services', amountCr: infraCr },
    { label: 'Approvals, fees & consultants', amountCr: approvalsCr },
    { label: 'Marketing & sales', amountCr: marketingCr },
    { label: 'Finance cost', amountCr: financeCr },
    { label: 'Contingency', amountCr: contingencyCr },
  ]
  const totalCostCr = cr2(costs.reduce((s, c) => s + c.amountCr, 0))

  const profitCr = round1(totalRevenueCr - totalCostCr)
  const roiPct = totalCostCr > 0.001 ? round1(((totalRevenueCr - totalCostCr) / totalCostCr) * 100) : 0

  return {
    costs,
    totalCostCr,
    revenues,
    totalRevenueCr,
    profitCr: fin(profitCr),
    roiPct: fin(roiPct),
    buildMonths,
    infraPct,
    buildRate,
    resiRate,
    commRate,
  }
}

export function assessFeasibility(
  brief: ProjectBrief,
  scenario: Scenario,
  market: MarketData,
  buildMonthsHint?: number,
): FeasibilityResult {
  const BASE: Shift = { constructionMult: 1, priceMult: 1, extraFinanceMonths: 0 }
  const base = compute(brief, scenario, market, BASE, buildMonthsHint)

  const profitCr = round1(base.totalRevenueCr - base.totalCostCr)
  const roiPct = base.roiPct

  // Payback ≈ construction period + 1–2 yrs of sales/collections tail:
  // strong ROI clears inventory faster.
  const constructionYears = base.buildMonths / 12
  const tailYears = roiPct >= 25 ? 1 : roiPct >= 12 ? 1.5 : 2
  const paybackYears = round1(constructionYears + tailYears)

  const budgetFitPct =
    brief.budgetCr > 0 ? clamp(round1((base.totalCostCr / brief.budgetCr) * 100), 0, 999) : 0

  // ----- Viability score (0–100 composite) -----
  // ROI component (0–40): full marks at ROI ≥ 25%, linear below, floor 0.
  const roiPts = clamp((roiPct / 25) * 40, 0, 40)
  // Budget-fit component (0–30): full marks at/under budget; lose 0.6 pt per
  // % over budget (0 pts at ~150% of budget).
  const budgetPts =
    brief.budgetCr > 0 ? (budgetFitPct <= 100 ? 30 : clamp(30 - (budgetFitPct - 100) * 0.6, 0, 30)) : 15
  // Market depth (0–20): fixed per development type (see MARKET_DEPTH_PTS).
  const depthPts = MARKET_DEPTH_PTS[brief.developmentType]
  // Absorption sanity (0–10): a ₹2,000+ Cr sell-side programme in one location
  // outruns plausible annual absorption in a single Indian metro micro-market;
  // full marks up to ₹400 Cr, linear taper to 0 at ₹2,000 Cr.
  const absorptionPts =
    base.totalRevenueCr <= 400 ? 10 : clamp((10 * (2000 - base.totalRevenueCr)) / 1600, 0, 10)

  const viabilityScore = Math.round(clamp(roiPts + budgetPts + depthPts + absorptionPts, 0, 100))
  const viabilityLabel =
    viabilityScore >= 75
      ? 'Highly viable'
      : viabilityScore >= 55
        ? 'Viable'
        : viabilityScore >= 40
          ? 'Viable with caveats'
          : 'High risk'

  // ----- Sensitivity: full recompute per shift so knock-on effects
  // (marketing % of revenue, finance on hard costs) flow through. -----
  const sensitivity = [
    { label: 'Base case', shift: BASE },
    { label: 'Construction cost +10%', shift: { ...BASE, constructionMult: 1.1 } },
    { label: 'Sale price −10%', shift: { ...BASE, priceMult: 0.9 } },
    { label: 'Sale price +10%', shift: { ...BASE, priceMult: 1.1 } },
    { label: '6-month delay', shift: { ...BASE, extraFinanceMonths: 6 } },
  ].map(({ label, shift }) => ({
    label,
    roiPct: compute(brief, scenario, market, shift, buildMonthsHint).roiPct,
  }))

  const assumptions: string[] = [
    brief.landOwned !== false
      ? 'Land assumed already owned — acquisition cost excluded; ROI is the development margin on owned land'
      : `Land acquisition at ${formatCr(market.landPricePerAcreCr)} per acre (city-average demo benchmark; equity-funded, excluded from the finance-cost base)`,
    `Construction cost ₹${num(base.buildRate)}/sq ft of built-up${brief.developmentType === 'mixed-use' ? ' (blended residential/commercial by land-use split)' : ''}`,
    `Sale price: residential ₹${num(base.resiRate)}/sq ft, commercial ₹${num(base.commRate)}/sq ft of saleable area`,
    `Land development & site works ${formatCr(market.landDevCostPerAcreCr)} per acre`,
    `Infrastructure & services at ${pct(base.infraPct * 100)} of construction cost`,
    `Approvals, fees & consultants at ${pct(market.approvalCostPctOfConstruction * 100, 1)} of construction cost`,
    `Marketing & sales at ${pct(MARKETING_PCT_OF_REVENUE * 100, 1)} of gross revenue${brief.developmentType === 'house' ? ' (waived for self-use house)' : ''}`,
    `Finance at ${pct(FINANCE_RATE_PA * 100)} p.a. on ${pct(DEBT_SHARE_OF_HARD_COSTS * 100)} of hard costs for half the ${months(base.buildMonths)} build period`,
    `Contingency at ${pct(CONTINGENCY_PCT_OF_HARD * 100)} of hard costs`,
    `Price growth of ${pct(market.priceGrowthPct, 1)} p.a. not compounded into base revenue (conservative)`,
  ]

  return {
    scenarioId: scenario.id,
    costs: base.costs,
    totalCostCr: base.totalCostCr,
    revenues: base.revenues,
    totalRevenueCr: base.totalRevenueCr,
    profitCr: fin(profitCr),
    roiPct: fin(roiPct),
    roiBasisNote: brief.landOwned !== false ? 'Development margin (owned land)' : 'On total cost incl. land',
    paybackYears: fin(paybackYears),
    viabilityScore,
    viabilityLabel,
    budgetFitPct: fin(budgetFitPct),
    sensitivity,
    assumptions,
  }
}
