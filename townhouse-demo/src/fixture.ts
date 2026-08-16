// The fixed demo site. Exactly one site exists in this workstream (brief §2);
// there is no site-shape solver and no second fixture without a ledger entry.

export interface DemoSiteFixture {
  readonly name: 'Community One'
  readonly label: 'DEMO — imaginary site'
  /** East-west extent, metres. */
  readonly widthM: number
  /** North-south extent, metres. */
  readonly depthM: number
  /** North is declared, not assumed. 0 = plan-up is true north. */
  readonly northBearingDeg: 0
  /** The single external access road (brief: road access on one side). */
  readonly accessRoad: {
    readonly edge: 'south'
    readonly widthM: number
  }
  /**
   * The client's ask in the pitch ("wants 500 townhouses"). An input to the
   * story, never a constraint or a result: the engine reports what it placed,
   * including "fewer than requested" as a first-class answer.
   */
  readonly requestedDwellingUnits: number
}

/**
 * Stable fixture-field ids used by report provenance (THD-07): a raw site
 * input cites one of these, never a rule entry.
 */
export const FIXTURE_FIELD_IDS = [
  'site.name',
  'site.widthM',
  'site.depthM',
  'site.northBearingDeg',
  'site.accessRoad.edge',
  'site.accessRoad.widthM',
  'site.requestedDwellingUnits',
] as const

export type FixtureFieldId = (typeof FIXTURE_FIELD_IDS)[number]
