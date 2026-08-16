import {
  DEMO_AUTHORITY,
  SLOT_UNITS,
  type DemoRuleEntry,
  type DemoRuleSlot,
} from '../rulebook.ts'

// DEMO-SLICE-A — the primary demo slice. Every value is illustrative:
// plausible in shape (inspired by public Indian plotted-development practice)
// but tied to no real authority, document, or jurisdiction. Values may be
// tuned only through a new ledger entry; the engine must never contain them.
//
// Production-shaped per Sol's ruling (ledger 034): explicit site-wide
// applicability, structured source with honest demo sentinels, verification
// 'unverified' (Stage1Spec-shaped) kept separate from the demo classification
// that locks the stamp, and version identity.

function entry(slot: DemoRuleSlot, value: number, basis: string): DemoRuleEntry {
  const id = `DEMO-A-${slot.toUpperCase()}`
  return {
    id,
    authority: DEMO_AUTHORITY,
    slice: 'DEMO-SLICE-A',
    slot,
    applicability: { kind: 'site-wide' },
    value,
    unit: SLOT_UNITS[slot],
    basis,
    source: {
      documentRef: 'demo — illustrative (no real-world document)',
      page: null,
      issuedDate: null,
      collectedDate: '2026-08-16',
      collectedBy: 'Fable (demo author)',
    },
    classification: 'demo-illustrative',
    verification: 'unverified',
    version: { id: `${id}#v1`, supersedes: null },
  }
}

export const demoSliceA: readonly DemoRuleEntry[] = [
  entry('site-coverage-max', 40,
    'Built footprint may cover at most 40% of gross site area (denominator: gross site area).'),
  entry('density-max', 40,
    'At most 40 dwelling units per acre of gross site area.'),
  entry('height-max', 12,
    'No structure exceeds 12 m above finished ground level.'),
  entry('storeys-max', 3,
    'Townhouses of at most three storeys (G+2).'),
  entry('setback-periphery', 9,
    'A 9 m setback from every site boundary that does not face the access road.'),
  entry('setback-front', 12,
    'A 12 m setback from the boundary facing the external access road.'),
  entry('road-width-primary', 12,
    'The internal spine road is 12 m wide, right-of-way.'),
  entry('road-width-secondary', 9,
    'Internal secondary/row roads are 9 m wide, right-of-way.'),
  entry('open-space-min', 15,
    'At least 15% of gross site area is green/open space (denominator: gross site area).'),
  entry('parking-ecs-per-du', 2,
    'Two equivalent car spaces per dwelling unit.'),
  entry('amenity-share-min', 5,
    'At least 5% of gross site area is the community amenity parcel, club + pool (denominator: gross site area).'),
  entry('unit-plot-frontage-min', 6,
    'Each townhouse plot has at least 6 m of road frontage.'),
  entry('unit-plot-depth-min', 15,
    'Each townhouse plot is at least 15 m deep.'),
  entry('row-length-max', 72,
    'One unbroken townhouse row is at most 72 m long.'),
]
