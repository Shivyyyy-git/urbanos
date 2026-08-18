// Envelope report composer. Every planning number is a typed fact with a
// stable id and full provenance: fixture inputs cite fixture-field ids, rule
// values cite selected entries, derivations cite both. The report also embeds
// a self-contained citation snapshot so the JSON stays meaningful without the
// rulebook files. Requested / density-ceiling / placed / shortfall are
// distinct facts — the requested count is never copied into a result.

import type { DemoSiteFixture, FixtureFieldId } from './fixture.ts'
import { roundM } from './geom.ts'
import type { CommunityLayout } from './layout.ts'
import {
  DEMO_STAMP,
  SQUARE_METRES_PER_ACRE,
  type DemoRuleSlot,
  type ResolvedDemoRulebook,
} from './rulebook.ts'
import {
  computeDemoActionability,
  computeDemoStamp,
  type DemoActionability,
} from './resolve.ts'
import { fail } from './errors.ts'

export type FactKind = 'fixture-input' | 'rule-value' | 'derived'

export interface ReportFact {
  /** Stable id, e.g. 'fact.site-area'. Printed beside the value in the PDF. */
  readonly id: string
  readonly kind: FactKind
  readonly name: string
  readonly value: number
  readonly unit: string
  readonly fixtureRefs: readonly FixtureFieldId[]
  /** Rule-entry ids feeding this fact (empty for pure fixture inputs). */
  readonly ruleRefs: readonly string[]
  readonly note?: string
}

export interface CitationSnapshotRow {
  readonly entryId: string
  readonly slot: DemoRuleSlot
  readonly value: number
  readonly unit: string
  readonly basis: string
  readonly authority: string
  readonly classification: 'demo-illustrative'
  readonly verification: string
  readonly sourceDocumentRef: string
  readonly versionId: string
}

export interface CommunityVerdict {
  readonly requestedDuFactId: string
  readonly densityCeilingFactId: string
  readonly placedDuFactId: string
  readonly shortfallFactId: string
  readonly bindingEntryIds: readonly string[]
  readonly bindingDescription: string
  readonly narrative: string
}

export interface CommunityEnvelopeReport {
  readonly title: string
  readonly slice: string
  /** Locked. The only reachable stamp in this package. */
  readonly stamp: string
  /** THD-18: computed once; type admits only 'unknown'. Beside the stamp,
   * never a stamp, never touching a number. */
  readonly actionability: DemoActionability
  readonly classification: 'demo-illustrative'
  readonly fixtureDigest: string
  readonly rulebookDigest: string
  readonly geometryDigest: string
  readonly facts: readonly ReportFact[]
  readonly citations: readonly CitationSnapshotRow[]
  readonly verdict: CommunityVerdict
  readonly notes: readonly string[]
}

export function buildEnvelopeReport(
  site: DemoSiteFixture,
  rulebook: ResolvedDemoRulebook,
  layout: CommunityLayout,
  fixtureDigest: string,
): CommunityEnvelopeReport {
  const stamp = computeDemoStamp(rulebook.entries)
  if (stamp !== DEMO_STAMP) {
    fail(
      'E_STAMP_UNREACHABLE',
      `Computed stamp "${stamp}" is not the locked demo stamp; a demo package may never ship it.`,
    )
  }
  const m = layout.measures
  const id = (slot: DemoRuleSlot): string => rulebook.bySlot[slot].id
  const val = (slot: DemoRuleSlot): number => rulebook.bySlot[slot].value

  const fixtureFact = (
    factId: string,
    name: string,
    value: number,
    unit: string,
    refs: readonly FixtureFieldId[],
    note?: string,
  ): ReportFact => ({
    id: factId, kind: 'fixture-input', name, value: roundM(value), unit,
    fixtureRefs: refs, ruleRefs: [], ...(note === undefined ? {} : { note }),
  })
  const ruleFact = (slot: DemoRuleSlot, name: string): ReportFact => ({
    id: `fact.rule.${slot}`, kind: 'rule-value', name, value: val(slot),
    unit: rulebook.bySlot[slot].unit, fixtureRefs: [], ruleRefs: [id(slot)],
  })
  const derivedFact = (
    factId: string,
    name: string,
    value: number,
    unit: string,
    fixtureRefs: readonly FixtureFieldId[],
    ruleRefs: readonly string[],
    note?: string,
  ): ReportFact => ({
    id: factId, kind: 'derived', name, value: roundM(value), unit,
    fixtureRefs, ruleRefs, ...(note === undefined ? {} : { note }),
  })

  const layoutGoverningRefs = [
    id('setback-periphery'), id('setback-front'), id('road-width-primary'),
    id('road-width-secondary'), id('open-space-min'), id('amenity-share-min'),
    id('unit-plot-frontage-min'), id('unit-plot-depth-min'), id('row-length-max'),
    id('site-coverage-max'), id('density-max'),
  ]

  const facts: readonly ReportFact[] = [
    fixtureFact('fact.site-width', 'Site width (E-W)', site.widthM, 'm', ['site.widthM']),
    fixtureFact('fact.site-depth', 'Site depth (N-S)', site.depthM, 'm', ['site.depthM']),
    fixtureFact('fact.north-bearing', 'Declared north bearing', site.northBearingDeg, 'deg', ['site.northBearingDeg']),
    fixtureFact('fact.access-road-width', 'External access road width (south)', site.accessRoad.widthM, 'm', ['site.accessRoad.widthM']),
    fixtureFact('fact.requested-du', 'Requested dwelling units (client intent)', site.requestedDwellingUnits, 'DU', ['site.requestedDwellingUnits'], 'Intent only — never a result.'),
    derivedFact('fact.site-area', 'Gross site area', m.siteAreaSqm, 'sqm', ['site.widthM', 'site.depthM'], [], 'width x depth'),
    derivedFact('fact.site-area-acres', 'Gross site area', m.siteAreaAcres, 'acre', ['site.widthM', 'site.depthM'], [], `site area / ${SQUARE_METRES_PER_ACRE} sqm-per-acre (physical constant)`),
    ruleFact('site-coverage-max', 'Max ground coverage (of gross site area)'),
    ruleFact('density-max', 'Max density'),
    ruleFact('height-max', 'Max height'),
    ruleFact('storeys-max', 'Max storeys'),
    ruleFact('setback-periphery', 'Periphery setback'),
    ruleFact('setback-front', 'Front (access-road) setback'),
    ruleFact('road-width-primary', 'Primary internal road width'),
    ruleFact('road-width-secondary', 'Secondary internal road width'),
    ruleFact('open-space-min', 'Min open space (of gross site area)'),
    ruleFact('parking-ecs-per-du', 'Parking norm'),
    ruleFact('amenity-share-min', 'Min amenity share (of gross site area)'),
    ruleFact('unit-plot-frontage-min', 'Min townhouse plot frontage'),
    ruleFact('unit-plot-depth-min', 'Min townhouse plot depth'),
    ruleFact('row-length-max', 'Max unbroken row length'),
    derivedFact('fact.envelope-width', 'Buildable envelope width', m.envelope.w, 'm',
      ['site.widthM'], [id('setback-periphery')]),
    derivedFact('fact.envelope-depth', 'Buildable envelope depth', m.envelope.h, 'm',
      ['site.depthM'], [id('setback-front'), id('setback-periphery')]),
    derivedFact('fact.coverage-cap-area', 'Ground-coverage cap', m.coverageCapSqm, 'sqm',
      ['site.widthM', 'site.depthM'], [id('site-coverage-max')], 'coverage % x gross site area'),
    derivedFact('fact.density-ceiling', 'Density ceiling', m.densityCeilingDu, 'DU',
      ['site.widthM', 'site.depthM'], [id('density-max')],
      'floor(site acres x density). A ceiling only — NOT a geometric capacity.'),
    derivedFact('fact.placed-du', 'Townhouses placed in this reference layout', m.placedDu, 'DU',
      ['site.widthM', 'site.depthM'], layoutGoverningRefs,
      'Counted from canonical geometry. Not a claimed maximum: no completeness search over the layout space was performed.'),
    derivedFact('fact.shortfall-du', 'Shortfall against request', m.shortfallDu, 'DU',
      ['site.requestedDwellingUnits', 'site.widthM', 'site.depthM'], layoutGoverningRefs,
      'requested - placed'),
    derivedFact('fact.built-footprint', 'Built footprint (plots + club)', m.builtFootprintSqm, 'sqm',
      ['site.widthM', 'site.depthM'],
      [id('unit-plot-frontage-min'), id('unit-plot-depth-min'), id('amenity-share-min'), ...layoutGoverningRefs],
      'Conservative demo convention: each townhouse plot counted fully as footprint.'),
    derivedFact('fact.green-required', 'Green/open space required', m.greenRequiredSqm, 'sqm',
      ['site.widthM', 'site.depthM'], [id('open-space-min')]),
    derivedFact('fact.green-provided', 'Green/open space provided (measured)', m.greenAreaSqm, 'sqm',
      ['site.widthM', 'site.depthM'], [id('open-space-min'), id('setback-periphery'), id('setback-front'), id('road-width-primary')]),
    derivedFact('fact.amenity-required', 'Amenity parcel required', m.amenityRequiredSqm, 'sqm',
      ['site.widthM', 'site.depthM'], [id('amenity-share-min')]),
    derivedFact('fact.amenity-provided', 'Amenity parcel provided (measured)', m.amenityAreaSqm, 'sqm',
      ['site.widthM', 'site.depthM'], [id('amenity-share-min'), id('unit-plot-depth-min')]),
    derivedFact('fact.parking-required', 'Required parking', m.requiredParkingEcs, 'ECS',
      ['site.widthM', 'site.depthM'], [id('parking-ecs-per-du'), ...layoutGoverningRefs],
      m.parkingDrawn
        ? `placed DU x parking norm, rounded up. Every space exists as a measured PARKING feature in the canonical geometry: `
          + `${m.onPlotEcsPerHome} under each home's stilt (inside its plot)`
          + `${m.sharedEcsDrawn > 0 ? ` plus ${m.sharedEcsDrawn} shared visitor bays on land carved out of the court landscape, so no square metre counts as both parking and open space` : ''}.`
        : 'placed DU x parking norm, rounded up. Parking strategy not yet demonstrated: no canonical parking geometry is drawn.'),
  ]

  const citations: readonly CitationSnapshotRow[] = rulebook.entries.map((entry) => ({
    entryId: entry.id,
    slot: entry.slot,
    value: entry.value,
    unit: entry.unit,
    basis: entry.basis,
    authority: entry.authority,
    classification: entry.classification,
    verification: entry.verification,
    sourceDocumentRef: entry.source.documentRef,
    versionId: entry.version.id,
  }))

  const verdict: CommunityVerdict = {
    requestedDuFactId: 'fact.requested-du',
    densityCeilingFactId: 'fact.density-ceiling',
    placedDuFactId: 'fact.placed-du',
    shortfallFactId: 'fact.shortfall-du',
    bindingEntryIds: m.bindingEntryIds,
    bindingDescription: m.bindingDescription,
    narrative:
      `The client asked for ${site.requestedDwellingUnits} townhouses. Under the ${rulebook.slice} entries, `
      + `the density ceiling is ${m.densityCeilingDu} DU and ${m.placedDu} townhouses are placed in this `
      + `reference layout (shortfall ${m.shortfallDu}). The placed count is what this layout achieves; it is `
      + `not a claimed legal capacity, because no completeness search over the permitted layout space was performed. `
      + `All values are illustrative demo entries — this is not a statement about any real jurisdiction.`,
  }

  return {
    title: `${site.name} — DEMO envelope report`,
    slice: rulebook.slice,
    stamp,
    actionability: computeDemoActionability(rulebook.entries),
    classification: 'demo-illustrative',
    fixtureDigest,
    rulebookDigest: rulebook.digest,
    geometryDigest: layout.geometryDigest,
    facts,
    citations,
    verdict,
    notes: [
      'DEMO: every value is illustrative and unverified; no real authority, document, or jurisdiction is represented.',
      'Percent rules use gross site area as denominator, stated per entry; provided areas are measured from canonical geometry.',
      'The requested unit count is client intent and is never copied into any result field.',
      'Height and storey caps are cited envelope limits; no elevations are drawn, and no drawing label exceeds them.',
    ],
  }
}
