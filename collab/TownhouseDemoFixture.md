# TownhouseDemoFixture — Community One site + DEMO slices (v1, proposed)

**Owner:** Fable (draft) — Sol reviews alongside the acceptance tests; value
tuning is a demo-legibility call, escalated to the goal chat only if we
disagree.
**Status:** LIVE (ledger 056). Machine-authoritative copies live in
`townhouse-demo/src/data/`; this document is the human-readable mirror. If the
two ever diverge, the data files win and the divergence is a defect.
**Parent:** `collab/TownhouseDemoBrief.md` §2 (scope), §5 (acceptance).

**Claims discipline:** every number below is `demo — illustrative (no
real-world source; never verified)`. Plausible in shape, tied to no real
authority or jurisdiction. The store's `verification` enum has exactly one
member (`demo-illustrative`), so the demo package is type-incapable of
claiming a verified rule.

## 1. The site (`community-one-site.ts`)

| Field | Value |
|---|---|
| Name | Community One (`DEMO — imaginary site`) |
| Shape | Rectangle, 460 m (E-W) × 440 m (N-S) — resized per ledger 049 for the GOD-LEVEL MAP milestone |
| Area | 202,400 m² = 50.014 acres (declared exactly) |
| North | Declared bearing 0° — plan-up is true north |
| Access | One external road on the **south** edge, 30 m wide |
| Client ask | 500 townhouses — an input to the story, never a constraint; under slice A all 500 place (program-bound), under slice B only 226 do |

**Current story (50-acre fixture, ledger 049/052/054).** Under DEMO-SLICE-A
the **density ceiling** is 2,000 DU — a ceiling only, per Sol's 034 ruling,
never a geometric capacity claim — and the reference layout **places all 500
requested homes**, so the binding constraint is the client's own program, not
a rule. Swap to DEMO-SLICE-B and the same engine **places 226**, leaving a
cited shortfall of 274 against the request: the demo's negative verdict now
arrives through the swap rather than through a small site. Placement is
`min(geometric fill, density ceiling, coverage cap, requested program)`, and
the placed figure is counted from canonical geometry in the DXF and both PDFs.
No completeness search over the layout space is claimed.

> **Superseded (10-acre fixture, before ledger 049 resized the site).** The
> earlier story read: slice A ceiling 400, placed 140, shortfall 360; slice B
> ceiling 250, placed 50. Retained only as history — it is **not** a current
> description of any artifact. The paragraph above is the live one.

## 2. The two slices (14 slots each, all required, fail-closed)

Entry ids follow `DEMO-<A|B>-<SLOT>`; each entry carries authority
`DEMO AUTHORITY (illustrative)`, a one-sentence basis, and the fixed demo
source string.

| Slot | Unit | SLICE-A | SLICE-B (swap) |
|---|---|---|---|
| site-coverage-max | % | 40 | 30 |
| density-max | du/acre | 40 | 25 |
| height-max | m | 12 | 9 |
| storeys-max | storeys | 3 (G+2) | 2 (G+1) |
| setback-periphery | m | 9 | 12 |
| setback-front | m | 12 | 15 |
| road-width-primary | m | 12 | 15 |
| road-width-secondary | m | 9 | 12 |
| open-space-min | % | 15 | 25 |
| parking-ecs-per-du | ECS/DU | 2.0 | 1.5 |
| amenity-share-min | % | 5 | 8 |
| unit-plot-frontage-min | m | 6 | 8 |
| unit-plot-depth-min | m | 15 | 18 |
| row-length-max | m | 72 | 48 |

Every one of the 14 values differs between the slices (checked in the
scaffold smoke run), so the brief §5.6 rulebook-swap moment must produce a
visibly different layout and report: B is sparser (1,250 DU ceiling; 226
placed against the 500 asked), greener, wider-roaded, bigger-plotted. Acre conversion uses the physical constant
4046.8564224 m²/acre, exported as `SQUARE_METRES_PER_ACRE` — a unit
conversion, not a rule value.

## 3. Schema simplifications — RULED by Sol (ledger 034), implemented 2026-08-16

1. **No applicability predicates — REJECTED.** Implemented: every entry now
   carries an explicit predicate (`{kind: 'site-wide'}`); a `not-applicable`
   variant exists and THD-01 proves selection is predicate-driven.
2. **Single-member verification enum — REJECTED.** Implemented: entries carry
   production-shaped `verification: unverified | mannu-verified` PLUS a
   separate `classification: 'demo-illustrative'`. The classification locks
   the stamp; a forged verification value is refused at resolution
   (`E_RULE_ENTRY_NOT_DEMO`) and, even hypothetically past that, cannot
   unlock the stamp (THD-10). Entries also carry structured sources with
   honest demo sentinels and version identity/chains.
3. **Site-level percentages — CONDITIONALLY ACCEPTED** for this fixed demo:
   every percent entry's basis states the gross-site-area denominator, and
   provided areas are measured against it (THD-12).

## 4. What the scaffold already enforces (for the harness to pin)

- `REQUIRED_DEMO_SLOTS` (14) exported; a slice missing any ⇒
  `E_RULE_SLOT_MISSING` naming the slot; duplicates ⇒ `E_RULE_SLOT_DUPLICATE`;
  mixed slices ⇒ `E_RULE_SLICE_MIXED`; any non-demo verification ⇒
  `E_RULE_ENTRY_NOT_DEMO`.
- `DEMO_STAMP` and `DEMO_FILENAME_TAG` exported as the single source of the
  watermark strings; `E_DEMO_WATERMARK_MISSING` reserved for the export gate.
- Both entry points (`resolveDemoRulebook`, `buildCommunityPackage`) are
  implemented and gated: the package ships only when the verify gate passes
  on the written files and the one-click preview (THD-01…18, all green).
