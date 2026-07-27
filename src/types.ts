// ---------------------------------------------------------------------------
// UrbanOS MVP — shared domain contracts.
// Every engine, data module, and UI component depends on THIS file only.
// Engines never import components; components never import engines directly
// (App.tsx wires them together).
// ---------------------------------------------------------------------------

export type DevelopmentType =
  | 'house'
  | 'group-housing'
  | 'mixed-use'
  | 'commercial'
  | 'township'

export type Jurisdiction =
  | 'gurugram'
  | 'dwarka-expressway'
  | 'dwarka'
  | 'delhi'
  | 'noida'
  | 'bengaluru'

/** What the user wants the AI to optimize for. */
export type Priority = 'roi' | 'balanced' | 'green'

/** Master-plan land-use zone the plot sits in. This is the zoning designation
 * on the statutory plan (MPD / Gurugram-Manesar Master Plan), NOT what the
 * developer intends to build — the two are compared by the compliance engine. */
export type LandUseZone =
  | 'residential'
  | 'commercial'
  | 'mixed-use'
  | 'institutional'
  | 'industrial'
  | 'recreational'
  | 'agricultural'

/** A GPS pin dropped on the site. */
export interface GeoPoint {
  lat: number
  lng: number
}

export interface ProjectBrief {
  name: string
  developmentType: DevelopmentType
  jurisdiction: Jurisdiction
  /** Plot area in square metres (UI may collect acres and convert). */
  plotAreaSqm: number
  /** Width of the widest abutting road, metres. Drives high-rise/fire rules. */
  roadWidthM: number
  /** Optional plot frontage in metres; layout derives aspect ratio if absent.
   * Ignored when plotWidthM/plotDepthM are both supplied. */
  plotFrontageM?: number
  /** Explicit plot dimensions in metres. When BOTH are present they define the
   * envelope exactly and area is taken as their product; otherwise the layout
   * derives an envelope from plotAreaSqm (+ frontage, if given). */
  plotWidthM?: number
  plotDepthM?: number
  /** Master-plan zone of the plot. Drives use-permissibility checks. */
  landUseZone: LandUseZone
  /** Site-specific / sanctioned FAR from the master plan, licence or zonal
   * plan, when the user knows it. Supersedes the bylaw table for massing;
   * compliance still measures it against the table and flags the delta. */
  farOverride?: number
  /** GPS pin for the site — recorded on the brief, drawing title block and
   * report. Not used for any geometry (no basemap in V1). */
  location?: GeoPoint
  /** Total budget in ₹ crore. */
  budgetCr: number
  /** True (default) = land already owned ("I own 20 acres" framing); false =
   * evaluating a purchase, so feasibility adds a land-acquisition cost line. */
  landOwned?: boolean
  priority: Priority
  /** Optional target dwelling units (or population proxy for townships). */
  targetUnits?: number
  notes?: string
}

// --------------------------- Planning / scenarios ---------------------------

export type LandUseCategory =
  | 'residential'
  | 'commercial'
  | 'green'
  | 'roads'
  | 'amenities'
  | 'utilities'

export interface LandUse {
  use: LandUseCategory
  pct: number // share of plot area, 0-100
  areaSqm: number
}

/** One rectangle in the generated masterplan. Coordinates in metres,
 * origin top-left of plot, x→east (width), y→south (depth). */
export interface Parcel {
  id: string
  x: number
  y: number
  w: number
  h: number
  use: LandUseCategory
  label?: string
  /** >0 marks a built structure (tower/block); viewer renders emphasis + floor count. */
  floors?: number
}

export interface LayoutModel {
  /** Plot envelope in metres. */
  plotW: number
  plotD: number
  parcels: Parcel[]
}

export interface UnitMixEntry {
  type: string // e.g. "2 BHK", "3 BHK", "Retail unit", "Villa plot"
  count: number
  avgSizeSqm: number
}

export interface Scenario {
  id: string
  /** Short display name, e.g. "Yield Max", "Balanced Urban", "Green Core". */
  name: string
  tagline: string
  strategy: Priority
  /** Proposed Floor Area Ratio actually used by this concept. */
  far: number
  groundCoveragePct: number
  maxFloors: number
  landUse: LandUse[]
  builtUpAreaSqm: number
  /** Sellable/leasable area (typically ~80-90% of built-up). */
  saleableAreaSqm: number
  greenPct: number
  totalUnits: number
  unitMix: UnitMixEntry[]
  layout: LayoutModel
  /** 3-5 short selling points shown on the scenario card. */
  highlights: string[]
}

// ------------------------------- Compliance --------------------------------

export type ComplianceStatus = 'pass' | 'warn' | 'fail'

export interface ComplianceCheck {
  id: string
  category: string // e.g. "Density", "Setbacks", "Fire & Life Safety"
  rule: string // human-readable rule name, e.g. "Maximum permissible FAR"
  reference: string // e.g. "HBC 2017 §6.2", "NBC 2016 Part 4"
  required: string // e.g. "≤ 1.75"
  proposed: string // e.g. "1.60"
  status: ComplianceStatus
  remediation?: string // shown for warn/fail
}

export interface ComplianceResult {
  scenarioId: string
  /** 0-100 aggregate score. */
  score: number
  checks: ComplianceCheck[]
  summary: { pass: number; warn: number; fail: number }
}

// ------------------------------- Feasibility -------------------------------

export interface MoneyLine {
  label: string
  amountCr: number // ₹ crore
}

export interface FeasibilityResult {
  scenarioId: string
  costs: MoneyLine[]
  totalCostCr: number
  revenues: MoneyLine[]
  totalRevenueCr: number
  profitCr: number
  roiPct: number
  /** Qualifies what ROI is measured against (e.g. owned-land margin). */
  roiBasisNote?: string
  paybackYears: number
  /** 0-100 composite viability score. */
  viabilityScore: number
  viabilityLabel: string // e.g. "Highly viable", "Viable with caveats"
  /** totalCost as % of user budget (100 = exactly on budget). */
  budgetFitPct: number
  /** ROI under simple what-if shifts, e.g. "Construction cost +10%". */
  sensitivity: { label: string; roiPct: number }[]
  assumptions: string[]
}

// ------------------------------ Construction -------------------------------

export interface ConstructionPhase {
  name: string
  startMonth: number // 0-based
  durationMonths: number
  activities: string[]
  manpowerPeak: number
}

export interface ConstructionPlan {
  scenarioId: string
  totalMonths: number
  phases: ConstructionPhase[]
  manpower: { role: string; count: number }[]
  materials: { name: string; qty: string }[]
  milestones: { month: number; label: string }[]
}

// ------------------------- Jurisdiction rule data --------------------------

export interface BylawRules {
  id: Jurisdiction
  name: string // display name, e.g. "Gurugram"
  state: string
  authority: string // e.g. "DTCP Haryana / GMDA"
  /** Max permissible FAR by development type. */
  maxFar: Record<DevelopmentType, number>
  maxGroundCoveragePct: Record<DevelopmentType, number>
  /** Max building height in metres; null = no cap (subject to AAI/fire NOC). */
  maxHeightM: number | null
  minGreenPct: number
  setbacks: { minFrontM: number; minSideM: number; minRearM: number }
  /** Equivalent Car Spaces required per 100 sqm built-up. */
  parkingEcsPer100Sqm: number
  /** Minimum abutting road width to permit high-rise (>15m) construction. */
  minRoadWidthForHighRiseM: number
  /** EWS/affordable housing % required for group housing. */
  ewsPctRequired: number
  notes: string[]
}

export interface MarketData {
  jurisdiction: Jurisdiction
  /** ₹ per sq ft of built-up area, by development type. */
  constructionCostPerSqft: Record<DevelopmentType, number>
  /** ₹ per sq ft of saleable area, by development type. */
  salePricePerSqft: Record<DevelopmentType, number>
  landDevCostPerAcreCr: number
  /** ₹ crore per acre to BUY land (demo benchmark; applied when
   * brief.landOwned is false). */
  landPricePerAcreCr: number
  /** Approvals, fees & soft costs as fraction of construction cost (0-1). */
  approvalCostPctOfConstruction: number
  /** Annual price appreciation assumption, % (used in notes/sensitivity). */
  priceGrowthPct: number
}

// ------------------------------ Wiring types -------------------------------

/** Everything the workspace needs for one scenario, computed once. */
export interface ScenarioResult {
  scenario: Scenario
  compliance: ComplianceResult
  feasibility: FeasibilityResult
  construction: ConstructionPlan
}

export const DEV_TYPE_LABELS: Record<DevelopmentType, string> = {
  house: 'Independent House',
  'group-housing': 'Group Housing',
  'mixed-use': 'Mixed-Use',
  commercial: 'Commercial',
  township: 'Township',
}

export const LAND_USE_LABELS: Record<LandUseCategory, string> = {
  residential: 'Residential',
  commercial: 'Commercial',
  green: 'Green & Open Space',
  roads: 'Roads & Circulation',
  amenities: 'Social Amenities',
  utilities: 'Utilities & Services',
}

export const LAND_USE_ZONE_LABELS: Record<LandUseZone, string> = {
  residential: 'Residential',
  commercial: 'Commercial',
  'mixed-use': 'Mixed-Use',
  institutional: 'Institutional / Public & Semi-Public',
  industrial: 'Industrial',
  recreational: 'Recreational / Green',
  agricultural: 'Agricultural',
}

/** Development types permitted OUTRIGHT in each master-plan zone. Anything
 * absent needs a change of land use (CLU) from the planning authority before
 * a building plan can be sanctioned — the compliance engine fails on this. */
export const ZONE_PERMITS: Record<LandUseZone, DevelopmentType[]> = {
  residential: ['house', 'group-housing', 'township'],
  commercial: ['commercial', 'mixed-use'],
  'mixed-use': ['house', 'group-housing', 'mixed-use', 'commercial'],
  institutional: [],
  industrial: [],
  recreational: [],
  agricultural: [],
}

export const SQM_PER_ACRE = 4046.86
export const SQFT_PER_SQM = 10.7639
