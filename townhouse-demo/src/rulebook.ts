// DEMO rulebook slice — the only place demo rule values may live.
// The engine must never contain a jurisdiction value; every number it prints
// traces to a DemoRuleEntry id.
//
// Revised per Sol's rulings (ledger 034 / acceptance contract §1):
// entries are production-shaped — explicit applicability predicate, structured
// source, Stage1Spec-shaped verification (`unverified | mannu-verified`) kept
// SEPARATE from demo classification, and version identity/chain. Demo
// classification itself locks the stamp; a forged verification value cannot
// unlock it (and is rejected at resolution as E_RULE_ENTRY_NOT_DEMO anyway).

/** The one stamp any demo artifact can carry. Locked; no upgrade path exists. */
export const DEMO_STAMP = 'Research Draft — Not for Construction · DEMO'

/** Must appear as an uppercase token in every artifact basename. */
export const DEMO_FILENAME_TAG = 'DEMO'

export const DEMO_AUTHORITY = 'DEMO AUTHORITY (illustrative)'

/** Physical constant, not a rule value (same standing as METRES_PER_FOOT). */
export const SQUARE_METRES_PER_ACRE = 4046.8564224

export type DemoRuleUnit =
  | 'percent'
  | 'metre'
  | 'du-per-acre'
  | 'storeys'
  | 'ecs-per-du'

export type DemoRuleSlot =
  | 'site-coverage-max' // % of gross site area (denominator stated per entry)
  | 'density-max' // dwelling units per acre of gross site area
  | 'height-max' // metres
  | 'storeys-max' // count (G+n => n+1)
  | 'setback-periphery' // metres, all non-road boundaries
  | 'setback-front' // metres, the access-road boundary
  | 'road-width-primary' // metres, internal spine
  | 'road-width-secondary' // metres, internal loops/rows
  | 'open-space-min' // % of gross site area, green/open
  | 'parking-ecs-per-du' // equivalent car spaces per dwelling unit
  | 'amenity-share-min' // % of gross site area, club + pool parcel
  | 'unit-plot-frontage-min' // metres, per townhouse plot
  | 'unit-plot-depth-min' // metres, per townhouse plot
  | 'row-length-max' // metres, one unbroken townhouse row

export const REQUIRED_DEMO_SLOTS: readonly DemoRuleSlot[] = [
  'site-coverage-max',
  'density-max',
  'height-max',
  'storeys-max',
  'setback-periphery',
  'setback-front',
  'road-width-primary',
  'road-width-secondary',
  'open-space-min',
  'parking-ecs-per-du',
  'amenity-share-min',
  'unit-plot-frontage-min',
  'unit-plot-depth-min',
  'row-length-max',
]

export const SLOT_UNITS: Readonly<Record<DemoRuleSlot, DemoRuleUnit>> = {
  'site-coverage-max': 'percent',
  'density-max': 'du-per-acre',
  'height-max': 'metre',
  'storeys-max': 'storeys',
  'setback-periphery': 'metre',
  'setback-front': 'metre',
  'road-width-primary': 'metre',
  'road-width-secondary': 'metre',
  'open-space-min': 'percent',
  'parking-ecs-per-du': 'ecs-per-du',
  'amenity-share-min': 'percent',
  'unit-plot-frontage-min': 'metre',
  'unit-plot-depth-min': 'metre',
  'row-length-max': 'metre',
}

/**
 * Production-shaped applicability. The demo slice is flat, so the honest demo
 * predicate is 'site-wide'; 'not-applicable' exists so tests can prove that
 * selection is predicate-driven (a non-applicable control entry must not
 * change the selected set or its digest).
 */
export type DemoApplicability =
  | { readonly kind: 'site-wide' }
  | { readonly kind: 'not-applicable'; readonly note: string }

/**
 * Structured, production-shaped source. Demo sentinels are honest: no real
 * document, page, or issue date exists, so those fields say so instead of
 * inventing one. No real authority may ever appear here.
 */
export interface DemoRuleSource {
  readonly documentRef: 'demo — illustrative (no real-world document)'
  readonly page: null
  readonly issuedDate: null
  readonly collectedDate: string // when the demo slice was authored
  readonly collectedBy: string
}

/** Stage1Spec-shaped verification — kept separate from demo classification. */
export type DemoVerification = 'unverified' | 'mannu-verified'

export interface DemoRuleVersion {
  readonly id: string
  /** Entry id this version supersedes, or null for a root version. */
  readonly supersedes: string | null
}

export interface DemoRuleEntry {
  /** Unique, cited verbatim in reports, e.g. 'DEMO-A-SITE-COVERAGE-MAX'. */
  readonly id: string
  readonly authority: typeof DEMO_AUTHORITY
  /** e.g. 'DEMO-SLICE-A'. One resolved rulebook = one slice, no mixing. */
  readonly slice: string
  readonly slot: DemoRuleSlot
  readonly applicability: DemoApplicability
  readonly value: number
  readonly unit: DemoRuleUnit
  /** One human sentence: what the number means, incl. the denominator for %. */
  readonly basis: string
  readonly source: DemoRuleSource
  /**
   * Demo classification — SEPARATE from verification. 'demo-illustrative'
   * permanently locks the DEMO stamp. This store accepts no other value.
   */
  readonly classification: 'demo-illustrative'
  readonly verification: DemoVerification
  readonly version: DemoRuleVersion
}

/**
 * A slice that passed completeness + purity checks, with a pinned digest.
 * Produced only by resolveDemoRulebook.
 */
export interface ResolvedDemoRulebook {
  readonly slice: string
  /** Selected entries: applicable, un-superseded, one per required slot. */
  readonly entries: readonly DemoRuleEntry[]
  /** sha-256 over the canonical serialisation of the selected entries. */
  readonly digest: string
  /** Selected entry per slot, for engine lookup. */
  readonly bySlot: Readonly<Record<DemoRuleSlot, DemoRuleEntry>>
}
