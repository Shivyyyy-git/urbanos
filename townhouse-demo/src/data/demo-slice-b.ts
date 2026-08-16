import {
  DEMO_AUTHORITY,
  SLOT_UNITS,
  type DemoRuleEntry,
  type DemoRuleSlot,
} from '../rulebook.ts'

// DEMO-SLICE-B — the swap slice for the pitch's live moment (brief §5.6).
// Same slots as DEMO-SLICE-A, deliberately different values on every slot, so
// pointing the same engine at this slice must visibly change the layout and
// the report: lower density, deeper setbacks, wider roads, more open space,
// bigger plots. Same claims discipline and production shape as slice A.

function entry(slot: DemoRuleSlot, value: number, basis: string): DemoRuleEntry {
  const id = `DEMO-B-${slot.toUpperCase()}`
  return {
    id,
    authority: DEMO_AUTHORITY,
    slice: 'DEMO-SLICE-B',
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

export const demoSliceB: readonly DemoRuleEntry[] = [
  entry('site-coverage-max', 30,
    'Built footprint may cover at most 30% of gross site area (denominator: gross site area).'),
  entry('density-max', 25,
    'At most 25 dwelling units per acre of gross site area.'),
  entry('height-max', 9,
    'No structure exceeds 9 m above finished ground level.'),
  entry('storeys-max', 2,
    'Townhouses of at most two storeys (G+1).'),
  entry('setback-periphery', 12,
    'A 12 m setback from every site boundary that does not face the access road.'),
  entry('setback-front', 15,
    'A 15 m setback from the boundary facing the external access road.'),
  entry('road-width-primary', 15,
    'The internal spine road is 15 m wide, right-of-way.'),
  entry('road-width-secondary', 12,
    'Internal secondary/row roads are 12 m wide, right-of-way.'),
  entry('open-space-min', 25,
    'At least 25% of gross site area is green/open space (denominator: gross site area).'),
  entry('parking-ecs-per-du', 1.5,
    'One and a half equivalent car spaces per dwelling unit.'),
  entry('amenity-share-min', 8,
    'At least 8% of gross site area is the community amenity parcel, club + pool (denominator: gross site area).'),
  entry('unit-plot-frontage-min', 8,
    'Each townhouse plot has at least 8 m of road frontage.'),
  entry('unit-plot-depth-min', 18,
    'Each townhouse plot is at least 18 m deep.'),
  entry('row-length-max', 48,
    'One unbroken townhouse row is at most 48 m long.'),
]
