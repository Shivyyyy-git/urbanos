import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import { MARKETS, getMarket } from '../src/data/costs'
import { JURISDICTIONS, getRules } from '../src/data/jurisdictions'
import { checkCompliance } from '../src/engines/compliance'
import { planConstruction } from '../src/engines/construction'
import { assessFeasibility } from '../src/engines/feasibility'
import { generateScenarios } from '../src/engines/planning'
import type {
  ComplianceResult,
  ConstructionPlan,
  DevelopmentType,
  FeasibilityResult,
  Jurisdiction,
  LandUseZone,
  ProjectBrief,
  Scenario,
} from '../src/types'

const JURISDICTION_IDS: Jurisdiction[] = [
  'gurugram',
  'dwarka-expressway',
  'dwarka',
  'delhi',
  'noida',
  'bengaluru',
]

const DEVELOPMENT_TYPES: DevelopmentType[] = [
  'house',
  'group-housing',
  'mixed-use',
  'commercial',
  'township',
]

const TYPE_FIXTURES: Record<
  DevelopmentType,
  { plotAreaSqm: number; budgetCr: number; landUseZone: LandUseZone }
> = {
  house: { plotAreaSqm: 900, budgetCr: 8, landUseZone: 'residential' },
  'group-housing': {
    plotAreaSqm: 50_000,
    budgetCr: 900,
    landUseZone: 'residential',
  },
  'mixed-use': {
    plotAreaSqm: 60_000,
    budgetCr: 1_500,
    landUseZone: 'mixed-use',
  },
  commercial: {
    plotAreaSqm: 40_000,
    budgetCr: 1_000,
    landUseZone: 'commercial',
  },
  township: {
    plotAreaSqm: 400_000,
    budgetCr: 5_000,
    landUseZone: 'residential',
  },
}

const EPSILON = 1e-7

function makeBrief(jurisdiction: Jurisdiction, developmentType: DevelopmentType): ProjectBrief {
  const fixture = TYPE_FIXTURES[developmentType]
  const rules = getRules(jurisdiction)
  return {
    name: `Regression · ${jurisdiction} · ${developmentType}`,
    jurisdiction,
    developmentType,
    plotAreaSqm: fixture.plotAreaSqm,
    roadWidthM: Math.max(30, rules.minRoadWidthForHighRiseM),
    landUseZone: fixture.landUseZone,
    budgetCr: fixture.budgetCr,
    landOwned: true,
    priority: 'balanced',
  }
}

function assertFiniteNumbers(value: unknown, path = 'result'): void {
  if (typeof value === 'number') {
    assert.ok(Number.isFinite(value), `${path} must be finite; received ${String(value)}`)
    return
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertFiniteNumbers(item, `${path}[${index}]`))
    return
  }
  if (value !== null && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      assertFiniteNumbers(child, `${path}.${key}`)
    }
  }
}

function assertScenarioIntegrity(brief: ProjectBrief, scenario: Scenario): void {
  assertFiniteNumbers(scenario, `scenario.${scenario.id}`)
  assert.ok(scenario.id.length > 0)
  assert.ok(scenario.name.length > 0)
  assert.ok(scenario.tagline.length > 0)
  assert.ok(scenario.far > 0)
  assert.ok(scenario.groundCoveragePct > 0 && scenario.groundCoveragePct <= 100)
  assert.ok(Number.isInteger(scenario.maxFloors) && scenario.maxFloors >= 1)
  assert.ok(scenario.builtUpAreaSqm > 0)
  assert.ok(scenario.saleableAreaSqm > 0)
  assert.ok(scenario.saleableAreaSqm <= scenario.builtUpAreaSqm)
  assert.ok(Number.isInteger(scenario.totalUnits) && scenario.totalUnits >= 1)
  assert.ok(scenario.unitMix.length > 0)
  assert.ok(scenario.highlights.length >= 3)

  const landUsePct = scenario.landUse.reduce((sum, item) => sum + item.pct, 0)
  assert.ok(
    Math.abs(landUsePct - 100) <= EPSILON,
    `${scenario.id} land-use percentages sum to ${landUsePct}, expected 100`,
  )
  const landUseArea = scenario.landUse.reduce((sum, item) => sum + item.areaSqm, 0)
  assert.ok(
    Math.abs(landUseArea - brief.plotAreaSqm) <= scenario.landUse.length,
    `${scenario.id} rounded land-use areas sum to ${landUseArea}, expected approximately ${brief.plotAreaSqm}`,
  )
  for (const item of scenario.landUse) {
    assert.ok(item.pct > 0 && item.pct <= 100, `${scenario.id}.${item.use} has invalid share`)
    assert.ok(item.areaSqm >= 0, `${scenario.id}.${item.use} has negative area`)
    const expectedArea = (brief.plotAreaSqm * item.pct) / 100
    assert.ok(
      Math.abs(item.areaSqm - expectedArea) <= 0.51,
      `${scenario.id}.${item.use} area does not match its percentage`,
    )
  }
  const greenShare = scenario.landUse
    .filter((item) => item.use === 'green')
    .reduce((sum, item) => sum + item.pct, 0)
  assert.equal(scenario.greenPct, greenShare)

  const { plotW, plotD, parcels } = scenario.layout
  assert.ok(plotW > 0 && plotD > 0)
  assert.ok(parcels.length > 0)
  assert.equal(new Set(parcels.map((parcel) => parcel.id)).size, parcels.length)

  let parcelArea = 0
  for (const parcel of parcels) {
    assertFiniteNumbers(parcel, `scenario.${scenario.id}.layout.${parcel.id}`)
    assert.ok(parcel.w > 0 && parcel.h > 0, `${parcel.id} must have positive dimensions`)
    assert.ok(parcel.x >= -EPSILON && parcel.y >= -EPSILON, `${parcel.id} starts outside plot`)
    assert.ok(parcel.x + parcel.w <= plotW + EPSILON, `${parcel.id} exceeds plot width`)
    assert.ok(parcel.y + parcel.h <= plotD + EPSILON, `${parcel.id} exceeds plot depth`)
    parcelArea += parcel.w * parcel.h
  }
  assert.ok(
    parcelArea <= plotW * plotD + EPSILON,
    `${scenario.id} parcel area exceeds the plot envelope`,
  )

  for (let leftIndex = 0; leftIndex < parcels.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < parcels.length; rightIndex += 1) {
      const left = parcels[leftIndex]
      const right = parcels[rightIndex]
      assert.ok(left && right)
      const overlapW =
        Math.min(left.x + left.w, right.x + right.w) - Math.max(left.x, right.x)
      const overlapH =
        Math.min(left.y + left.h, right.y + right.h) - Math.max(left.y, right.y)
      assert.ok(
        overlapW <= EPSILON || overlapH <= EPSILON,
        `${scenario.id} parcels ${left.id} and ${right.id} overlap by ${overlapW} × ${overlapH} m`,
      )
    }
  }
}

function assertComplianceIntegrity(scenario: Scenario, result: ComplianceResult): void {
  assertFiniteNumbers(result, `compliance.${scenario.id}`)
  assert.equal(result.scenarioId, scenario.id)
  assert.ok(Number.isInteger(result.score) && result.score >= 0 && result.score <= 100)
  assert.ok(result.checks.length > 0)
  assert.equal(new Set(result.checks.map((check) => check.id)).size, result.checks.length)

  const counted = { pass: 0, warn: 0, fail: 0 }
  for (const check of result.checks) {
    assert.ok(check.category.trim().length > 0)
    assert.ok(check.rule.trim().length > 0)
    assert.ok(check.reference.trim().length > 0)
    assert.ok(check.required.trim().length > 0)
    assert.ok(check.proposed.trim().length > 0)
    assert.ok(check.status === 'pass' || check.status === 'warn' || check.status === 'fail')
    counted[check.status] += 1
    if (check.status !== 'pass') {
      assert.ok(check.remediation?.trim(), `${check.id} needs remediation for ${check.status}`)
    }
  }

  assert.deepEqual(result.summary, counted)
  assert.equal(
    result.summary.pass + result.summary.warn + result.summary.fail,
    result.checks.length,
  )
  assert.equal(
    result.score,
    Math.max(0, 100 - 6 * result.summary.warn - 18 * result.summary.fail),
  )
}

function round1(value: number): number {
  return Math.round(value * 10) / 10
}

function sumMoney(lines: Array<{ amountCr: number }>): number {
  return Math.round(lines.reduce((sum, line) => sum + line.amountCr, 0) * 100) / 100
}

function assertFeasibilityIntegrity(scenario: Scenario, result: FeasibilityResult): void {
  assertFiniteNumbers(result, `feasibility.${scenario.id}`)
  assert.equal(result.scenarioId, scenario.id)
  assert.ok(result.costs.length > 0)
  assert.ok(result.revenues.length > 0)
  assert.ok(result.totalCostCr > 0)
  assert.ok(result.totalRevenueCr >= 0)
  assert.equal(result.totalCostCr, sumMoney(result.costs))
  assert.equal(result.totalRevenueCr, sumMoney(result.revenues))
  assert.equal(result.profitCr, round1(result.totalRevenueCr - result.totalCostCr))
  assert.equal(
    result.roiPct,
    round1(((result.totalRevenueCr - result.totalCostCr) / result.totalCostCr) * 100),
  )
  assert.ok(result.paybackYears > 0)
  assert.ok(
    Number.isInteger(result.viabilityScore) &&
      result.viabilityScore >= 0 &&
      result.viabilityScore <= 100,
  )
  assert.ok(result.viabilityLabel.trim().length > 0)
  assert.ok(result.budgetFitPct >= 0 && result.budgetFitPct <= 999)
  assert.ok(result.assumptions.length > 0)
  assert.ok(result.assumptions.every((assumption) => assumption.trim().length > 0))

  assert.deepEqual(
    result.sensitivity.map((entry) => entry.label),
    [
      'Base case',
      'Construction cost +10%',
      'Sale price −10%',
      'Sale price +10%',
      '6-month delay',
    ],
  )
  const sensitivity = Object.fromEntries(
    result.sensitivity.map((entry) => [entry.label, entry.roiPct]),
  )
  assert.equal(sensitivity['Base case'], result.roiPct)
  assert.ok(sensitivity['Construction cost +10%']! <= result.roiPct)
  assert.ok(sensitivity['Sale price −10%']! <= result.roiPct)
  assert.ok(sensitivity['Sale price +10%']! >= result.roiPct)
  assert.ok(sensitivity['6-month delay']! <= result.roiPct)
}

function assertConstructionIntegrity(scenario: Scenario, plan: ConstructionPlan): void {
  assertFiniteNumbers(plan, `construction.${scenario.id}`)
  assert.equal(plan.scenarioId, scenario.id)
  assert.ok(Number.isInteger(plan.totalMonths) && plan.totalMonths > 0)
  assert.equal(plan.phases.length, 5)
  assert.equal(new Set(plan.phases.map((phase) => phase.name)).size, plan.phases.length)
  assert.equal(plan.phases[0]?.startMonth, 0)

  let latestEnd = 0
  let previousStart = -1
  for (const phase of plan.phases) {
    assert.ok(Number.isInteger(phase.startMonth) && phase.startMonth >= 0)
    assert.ok(Number.isInteger(phase.durationMonths) && phase.durationMonths > 0)
    assert.ok(phase.startMonth > previousStart, `${phase.name} must start after prior phase`)
    assert.ok(phase.startMonth + phase.durationMonths <= plan.totalMonths)
    assert.ok(phase.activities.length > 0)
    assert.ok(phase.activities.every((activity) => activity.trim().length > 0))
    assert.ok(Number.isInteger(phase.manpowerPeak) && phase.manpowerPeak > 0)
    latestEnd = Math.max(latestEnd, phase.startMonth + phase.durationMonths)
    previousStart = phase.startMonth
  }
  assert.equal(plan.totalMonths, latestEnd)
  const finalPhase = plan.phases.at(-1)
  assert.ok(finalPhase)
  assert.equal(finalPhase.startMonth + finalPhase.durationMonths, plan.totalMonths)

  assert.ok(plan.manpower.length > 0)
  for (const item of plan.manpower) {
    assert.ok(item.role.trim().length > 0)
    assert.ok(Number.isInteger(item.count) && item.count > 0)
  }
  assert.ok(plan.materials.length > 0)
  for (const item of plan.materials) {
    assert.ok(item.name.trim().length > 0)
    assert.ok(item.qty.trim().length > 0)
    assert.doesNotMatch(item.qty, /^0(?:[.,]0+)?\s/)
  }

  assert.ok(plan.milestones.length > 0)
  let previousMilestone = 0
  for (const milestone of plan.milestones) {
    assert.ok(Number.isInteger(milestone.month))
    assert.ok(milestone.month > previousMilestone)
    assert.ok(milestone.month <= plan.totalMonths)
    assert.ok(milestone.label.trim().length > 0)
    previousMilestone = milestone.month
  }
}

describe('UrbanOS deterministic engine matrix', () => {
  test('fixtures cover exactly 6 jurisdictions × 5 development types', () => {
    assert.deepEqual(
      JURISDICTIONS.map((rules) => rules.id).sort(),
      [...JURISDICTION_IDS].sort(),
    )
    assert.deepEqual(
      MARKETS.map((market) => market.jurisdiction).sort(),
      [...JURISDICTION_IDS].sort(),
    )
    assert.equal(DEVELOPMENT_TYPES.length, 5)
    assert.equal(JURISDICTION_IDS.length * DEVELOPMENT_TYPES.length * 3, 90)
  })

  for (const jurisdiction of JURISDICTION_IDS) {
    for (const developmentType of DEVELOPMENT_TYPES) {
      test(`${jurisdiction} · ${developmentType} · all three scenarios`, () => {
        const brief = makeBrief(jurisdiction, developmentType)
        const rules = getRules(jurisdiction)
        const market = getMarket(jurisdiction)
        const scenarios = generateScenarios(brief, rules)

        assert.deepEqual(scenarios, generateScenarios(brief, rules))
        assert.equal(scenarios.length, 3)
        assert.deepEqual(
          [...scenarios.map((scenario) => scenario.strategy)].sort(),
          ['balanced', 'green', 'roi'],
        )
        assert.equal(new Set(scenarios.map((scenario) => scenario.id)).size, 3)

        for (const scenario of scenarios) {
          assertScenarioIntegrity(brief, scenario)

          const compliance = checkCompliance(brief, scenario, rules)
          assert.deepEqual(compliance, checkCompliance(brief, scenario, rules))
          assertComplianceIntegrity(scenario, compliance)

          const construction = planConstruction(brief, scenario)
          assert.deepEqual(construction, planConstruction(brief, scenario))
          assertConstructionIntegrity(scenario, construction)

          const feasibility = assessFeasibility(
            brief,
            scenario,
            market,
            construction.totalMonths,
          )
          assert.deepEqual(
            feasibility,
            assessFeasibility(brief, scenario, market, construction.totalMonths),
          )
          assertFeasibilityIntegrity(scenario, feasibility)
        }
      })
    }
  }
})
