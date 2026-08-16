# Townhouse Demo — Acceptance-Test Contract

**Owner:** Sol (checker)  
**Builder:** Fable  
**Authority:** `collab/TownhouseDemoBrief.md` §5, its §§2–3 guardrails, and
the parent `collab/Stage1Spec.md` v1.1 contract  
**Status:** **FROZEN PRE-ENGINE GATE** — the current scaffold is correctly red;
no demo v0 is accepted until every test below passes  
**Baseline:** `community-one-site` + `DEMO-SLICE-A`; swap fixture:
`DEMO-SLICE-B`

This file defines observable acceptance, not Fable's internal architecture.
Screenshots, copied digests, self-reported success, and hand-edited artifacts
are not acceptance evidence.

## 1. Scaffold review and rulings

The two public entry points and stable refusal-code approach are accepted:

- `resolveDemoRulebook(entries)`;
- `buildCommunityPackage(site, rulebook)`;
- a standalone package with no imports across the frozen `src/`, `kernel/`, or
  `unitplan/` boundaries;
- 14 explicitly required demo slots, all stored as data rather than engine
  constants;
- the locked visible stamp
  **“Research Draft — Not for Construction · DEMO.”**

The three proposals in `collab/TownhouseDemoFixture.md` §3 are ruled as follows.

1. **No applicability predicates — REJECTED.** A flat demo slice is fine, but
   each entry must still carry an explicit site-wide applicability predicate in
   the engine-facing contract. Otherwise Mannu's production entries require a
   schema/code change, contradicting the brief's “data-swap, not rebuild” claim.
2. **Single-member `demo-illustrative` verification enum — REJECTED.** Keep
   demo classification separate from the Stage1Spec verification state.
   Demo entries are `demo-illustrative` **and** `unverified`; production-shaped
   verification remains `unverified | mannu-verified`. Demo classification
   itself permanently locks the DEMO stamp, even if hostile data forges a
   verification value.
3. **Site-level coverage/open-space/amenity percentages — CONDITIONALLY
   ACCEPTED for this fixed townhouse demo only.** Every entry and report fact
   must state that its denominator is gross site area; actual geometry must be
   measured against it. This does not redefine the plot-scale Stage1 slots.

The engine-facing demo entries must retain the production-shaped fields from
`Stage1Spec.md` §5: applicability, parameter/unit shape, structured source,
verification, and version identity/chain. Demo-only sentinel values may be
used honestly where a real document, page, or effective date does not exist.
No real authority/source may be invented.

The draft output surface in `src/pipeline.ts` also needs these changes before it
is frozen:

- the report must carry a fixture digest and canonical-geometry digest as well
  as the rulebook digest;
- derived facts need stable fact IDs and typed provenance references to both
  rule entries and fixture fields; `name: string` + rule-only `fedBy` is not a
  complete dependency chain;
- the JSON must contain a self-contained citation snapshot/table, not IDs that
  become meaningless when the rulebook file is absent;
- requested units, density ceiling, geometrically placed units, and shortfall
  need distinct typed facts/verdict fields;
- report JSON must also be a named `DemoArtifact` with deterministic bytes.
  Keeping only an in-memory object leaves its filename outside the package and
  makes the “DEMO in every filename” rule unenforceable;
- every shipped artifact must be tied to the same fixture, rulebook, and
  geometry digests. Those digests corroborate parity but never replace measured
  parity.

These are contract corrections, not engine implementation.

## 2. Frozen fixture facts

The acceptance fixture is the machine-authoritative data under
`townhouse-demo/src/data/`:

- site: `225 m × 180 m = 40,500 m² = 10.0078 acres`;
- declared north: plan-up / true north (`0°`);
- one external access road: south edge, declared width `24 m`;
- client request: `500` townhouses. This is intent, never a forced result;
- Slice A density ceiling:
  `floor(40,500 / 4,046.8564224 × 40) = 400 DU`;
- Slice B density ceiling:
  `floor(40,500 / 4,046.8564224 × 25) = 250 DU`.

The last two values are **density ceilings only**. Neither says how many homes
fit after geometry, coverage, setbacks, roads, open space, amenities, parking,
frontage, depth, and row-length constraints. The sentence in
`TownhouseDemoFixture.md` saying “400 legally fit” is rejected unless the final
canonical geometry actually contains 400 compliant townhouses and all other
constraints independently pass. Without a completeness/optimisation proof, the
demo must label the generated count **“placed in this reference layout,”** not
“maximum legally possible.”

All 14 semantic slots in `REQUIRED_DEMO_SLOTS` are acceptance-required:

1. `site-coverage-max`;
2. `density-max`;
3. `height-max`;
4. `storeys-max`;
5. `setback-periphery`;
6. `setback-front`;
7. `road-width-primary`;
8. `road-width-secondary`;
9. `open-space-min`;
10. `parking-ecs-per-du`;
11. `amenity-share-min`;
12. `unit-plot-frontage-min`;
13. `unit-plot-depth-min`;
14. `row-length-max`.

The values may be tuned only through a new ledger entry. They remain
illustrative inputs, never evidence of a real jurisdiction.

## 3. Gate map

| TownhouseDemoBrief §5 criterion | Mandatory tests |
|---|---|
| 1. Fixture in, full package out, zero manual steps | THD-02, THD-03 |
| 2. Watermark on every artifact; absence fails | THD-05, THD-06 |
| 3. Numeric provenance; missing entry blocks by slot | THD-01, THD-07, THD-08 |
| 4. Research Draft + DEMO is inescapable | THD-09, THD-10 |
| 5. Independent DXF parse and cross-output geometry parity | THD-11, THD-12, THD-13, THD-14 |
| 6. Same-engine rulebook swap changes layout and report | THD-15 |
| Ledger 036. Current one-click local preview | THD-17 |
| Ledger 040. DEMO actionability is type-locked below `yes` | THD-18 |

THD-04 pins determinism. THD-16 is the pitch's “500 townhouses” honesty gate.
THD-17 freezes ledger 036's later local-preview requirement before the v0.1
repair pass. THD-18 freezes ledger 040's post-D5 demo dispatch before that
same pass.

## 4. Acceptance tests

### THD-01 — Rulebook resolution is complete, pure, and fail-closed

Resolve A and B independently. Each must contain exactly one applicable entry
for every one of the 14 slots, one slice identity, unique entry IDs, correct
slot/unit pairings, finite usable values, demo classification, unverified
status, explicit site-wide applicability, structured demo source, and version
identity. Reordering otherwise identical entries must produce the same
canonical digest; changing one value or version must change it.

Run the following hostile cases against a fresh input each time:

- remove each required slot in turn: 14/14 must throw
  `E_RULE_SLOT_MISSING`, with `finding.detail` naming that exact slot;
- duplicate a required slot: `E_RULE_SLOT_DUPLICATE`;
- mix one B entry into A: `E_RULE_SLICE_MIXED`;
- inject non-demo classification or a claimed verified demo entry:
  `E_RULE_ENTRY_NOT_DEMO`;
- duplicate an entry ID across two slots, mismatch a slot's unit, or use
  `NaN`, infinity, a negative value, a percentage outside `0…100`, or a
  non-integer storey count: a stable `E_RULE_ENTRY_INVALID` naming entry and
  field (add this code to the surface).

Every failing resolver run produces no `ResolvedDemoRulebook`. An unused or
non-applicable control entry may not change the selected resolved set or digest;
this proves selection is based on applicability rather than array length.

### THD-02 — Fixture validation refuses missing or unusable input

Before geometry, independently remove or corrupt each required site fact:
width, depth, north declaration, access edge, access-road width, and requested
unit count. Non-finite/non-positive dimensions or road width, a non-integer or
non-positive requested count, an unsupported access edge, and undeclared north
must throw `E_INPUT_MISSING` or `E_INPUT_INVALID` with the field named. No
silent north, road, area, or requested-count default is allowed.

### THD-03 — Cold, non-interactive full-package run

**Given** a clean temporary output directory, installed dependencies,
Community One, and resolved Slice A  
**when** the single documented demo command is invoked with network access
disabled and stdin closed  
**then** it exits `0`, opens no GUI, prompts for nothing, needs no manual copy or
editor step, and emits one declared artifact for every required role:

1. dimensioned technical sheet — DXF R12;
2. dimensioned technical sheet — vector PDF;
3. print-quality colored presentation map — vector PDF;
4. DEMO envelope report — PDF;
5. machine-readable DEMO envelope report — JSON.

Any parity manifest/sidecar is an additional artifact subject to every filename,
watermark, parse, and determinism gate. Every file must be non-empty and parse
independently; every PDF page must render. The role map must not point outside
the package or reuse an earlier run's file.

### THD-04 — Byte determinism

Run THD-03 twice into fresh directories with identical fixture, rulebook
digest, engine version, and dependencies. Sorted relative file lists and the
SHA-256 of every corresponding file must be identical. Generation time, random
IDs, absolute paths, locale, object iteration, and PDF metadata may not alter
bytes. Run `A → B → A` in THD-15 to catch stateful determinism failures.

### THD-05 — DEMO marker and locked-stamp coverage

Recursively enumerate every generated file; do not trust a manifest that can
omit its own failure.

- Every basename contains a distinct uppercase `DEMO` token.
- Every page of every PDF has a visible `DEMO` watermark and the visible exact
  stamp **“Research Draft — Not for Construction · DEMO.”**
- The DXF has visible `TEXT`/`MTEXT` carrying DEMO and the exact stamp in the
  plotted model/title area; a header variable or filename alone does not count.
- JSON and every manifest/sidecar carry structured demo classification and the
  locked stamp as well as the filename token.

Text extraction and rendered-page inspection are both required. Hidden,
zero-size, clipped, metadata-only, or white-on-white text fails.

### THD-06 — Watermark-kill mutations fail

Starting from a passing package, apply these mutations independently:

1. remove `DEMO` from one filename;
2. remove the visible watermark from one PDF page, not necessarily page one;
3. delete the DXF DEMO/stamp entity;
4. remove the JSON demo classification or change it to production.

The package/build gate must fail non-zero and name the artifact and, for PDF,
the page. Checking that *some* file or *some* page says DEMO is not sufficient.

### THD-07 — Every report planning number has truthful provenance

Independently parse the report JSON and visible numeric facts in the report
PDF. A **planning number** is a numeric site, rule, program, envelope, capacity,
area, length, count, height, parking, or percentage fact. Page numbers, dates,
schema versions, and hashes are document metadata.

For every planning number:

1. visible value/unit reconcile with one stable JSON fact ID;
2. the fact is typed as fixture input, rule value, or derivation;
3. raw inputs cite existing fixture-field IDs;
4. rule values cite an existing selected-slice entry;
5. derived values cite all relevant fixture fields and every rule entry that
   feeds their formula;
6. the self-contained citation snapshot matches the selected rule entry,
   including illustrative/unverified status;
7. no citation points to the other slice, an unknown ID, or a code constant.

`TownhouseDemoBrief.md` §5.3 is read with its parent Stage1Spec: raw site inputs
truthfully cite the fixture; rule-controlled and derived results cite demo
entries. Falsely labelling the site's `225 m` as a legal rule would not satisfy
provenance. Metadata exclusions must use a narrow explicit allow-list.

### THD-08 — Runtime rule-value sensitivity kills hard-coding

At test runtime clone A, issue a new entry version, and change exactly one
binding spatial value to a novel value not present in either stored slice. The
primary probe is `road-width-primary`; repeat once with a setback or unit-plot
dimension. Do not edit engine source or select B.

The rerun must cite the new entry/version, print the new value, measure the
corresponding output geometry at that value within tolerance, and change the
rulebook and geometry digests. Re-running original A must recover its original
bytes. This prevents a Slice-A/Slice-B branch or pre-drawn map from impersonating
a data-driven engine.

### THD-09 — Baseline DEMO stamp is computed and inescapable

With A and B, structured and visible stamps must equal the locked exact string.
No output-status field or stamp region may say “Prepared for Professional
Review,” “approved,” “compliant,” or “verified.” Explanatory disclaimers may
discuss those words only if they cannot be mistaken for output status.

The stamp must be computed once from demo classification and verification, then
fed to every exporter. Independently typed exporter strings are a drift risk and
fail the surface review.

### THD-10 — Upward-override mutations are killed

Run three hostile variants:

1. all but one cited entry claims verified;
2. every entry is forged verified but remains DEMO-classified;
3. a caller attempts to supply “Prepared for Professional Review” through
   request/config input.

Variants 1 and 2 must fail rulebook resolution or remain locked at Research
Draft + DEMO; neither may reach an upward stamp. The public request contract has
no writable status/stamp field. Mutating the stamp predicate from “any cited
entry unverified” to “all cited entries unverified” must turn this group red.

### THD-11 — Independent DXF audit

Open the shipped DXF with `ezdxf` or an equivalently independent parser, never
the project serializer. Assert DXF R12 opens and audits with zero errors, units
resolve to metres, all coordinates are finite, and these spatial classes are
non-empty:

- site boundary and setback/buildable envelope;
- primary and secondary internal roads;
- townhouse plots/blocks/rows;
- green/open-space polygons;
- club/amenity parcel and pool;
- entry/gate.

If parking is drawn, it is also a parity-checked class. The visible DEMO/stamp
entities must exist. Parser warnings fail unless Sol records a bounded exception
in a later ledger entry.

### THD-12 — Canonical geometry satisfies every active rule

Measure geometry rather than trusting report assertions:

- site area equals `40,500 m²` and the road/north declarations match fixture
  facts;
- front and periphery setbacks meet their selected entries;
- primary and secondary road widths equal their selected entries;
- each townhouse plot meets frontage/depth minima and each unbroken row stays
  within `row-length-max`;
- aggregate building footprint stays within gross-site coverage;
- green/open area and amenity parcel independently meet their gross-site shares
  without double counting;
- placed DU count does not exceed the density ceiling;
- required ECS equals placed DU × the selected parking norm, with rounding
  policy stated; if parking geometry is shown, its count reconciles;
- height/storey limits appear as cited envelope limits and no drawing label
  exceeds them;
- all planning polygons are valid, inside the allowed site/envelope, and do not
  overlap incompatible land-use classes.

Both slices must place at least one townhouse and still produce the full package.
Any unsatisfied rule requires an honest cited negative verdict; it may not be
hidden by omitting the fact or feature.

### THD-13 — Technical and presentation geometry are the same plan

Independently extract world geometry from the DXF, technical vector PDF, and
presentation vector PDF. Apply each declared scale/origin transform and compare
by stable feature ID/class:

- site/envelope;
- every road edge/surface;
- every townhouse plot/block/row;
- every green/open polygon;
- amenity parcel, club/pool, and entry/gate;
- any parking geometry shown.

No missing, extra, shifted, rotated, or differently sized planning feature is
allowed. DXF/canonical coordinates must agree within `0.001 m`; vector PDF
geometry must agree after inverse scaling within `0.25 mm` on paper. Counts,
areas, and lengths must reconcile too.

A lossless feature sidecar is allowed to expose PDF feature IDs, but actual
vector paths must still be measured. Matching digests, unit counts, or visual
similarity alone are not proof.

### THD-14 — Presentation-only tamper is detected

After a passing run, alter only the presentation PDF: move one townhouse block
beyond tolerance and, in a separate mutation, delete one road segment. Leave
all printed digests untouched. THD-13 must fail and name the affected
feature/class. This proves the checker reads geometry instead of trusting shared
metadata.

### THD-15 — Same-engine rulebook swap works and is isolated

In one clean session run `A → B → A` using the same executable, site, program,
and export path logic. Only the rulebook input changes.

For B:

1. the full package still ships with DEMO/Research Draft status;
2. report and artifacts pin B's digest and cite only B entries;
3. density ceiling is `250`, not A's `400`;
4. at least one additional report fact changes in the direction of its rule;
5. measured geometry changes where different setbacks, road widths, plot
   dimensions, open-space share, and row limit govern it;
6. THD-12 and THD-13 remain green.

The two A packages must be byte-identical. Changing source, selecting a second
layout template, loading stored output, or post-processing the first map fails.
The handoff must include a non-interactive stage command that prints selected
slice IDs/digests and a semantic A/B diff; two prepared folders are not a live
swap proof.

### THD-16 — “500” is intent; density cap and placed capacity are separate

The report must expose distinct facts for:

- requested DU = `500`, cited to fixture intent;
- selected-slice density ceiling (`400` for A; `250` for B), cited to site area,
  acre conversion, and density entry;
- townhouse count actually placed in canonical geometry;
- final shortfall against the request and the binding constraints found.

Independently count townhouse features in DXF and both PDFs. All counts must
equal the report's placed count. Acceptance does not depend on placing 500 or
400. If fewer fit, say so. If 400 fit in A, all 400 must exist and pass THD-12.
Requested count may never be copied into a result field.

Unless the engine proves it searched the full permitted layout space, narration
must say “placed in this reference layout” rather than “maximum that legally
fits.” This is the demo's primary numerical honesty gate.

### THD-17 — One-click preview is current, self-contained, and fail-closed

Run the documented generator in the sequence `A → B → A`. Every successful
run must atomically replace exactly `townhouse-demo/preview.DEMO.html` with a
self-contained page generated from that run's canonical presentation model.
Per ledger 040, its basename is subject to the same distinct uppercase `DEMO`
token rule as every other artifact. The superseded untagged `preview.html`
must not remain as a second, potentially stale page.

After each run, independently parse the HTML and its inline SVG. Assert that:

1. it needs no network, server, build process, external stylesheet, script,
   image, font, or copied asset after generation;
2. slice identity, fixture/rulebook/geometry digests, requested DU, density
   ceiling, placed DU, shortfall, classification, and the exact locked stamp
   equal the report JSON from the same run;
3. a prominent visible `DEMO` watermark and exact locked stamp exist, without
   hiding planning geometry, labels, or the legend;
4. every planning feature ID and inline SVG path/ring agrees with the same
   canonical/parity geometry used by the shipped presentation PDF; a matching
   digest alone is not proof;
5. the B page differs from A in the measured rule-driven geometry and facts,
   while the two A pages are byte-identical; and
6. the page meets or beats `collab/PresentationMapTarget.html` on the ruled
   flat-cartographic elements: unit patterning, legend, scale bar, north arrow,
   DEMO watermark, and non-colliding stamp treatment.

Preview verification must be part of the generator's post-write gate and also
callable non-interactively for a shipped package. Deleting the preview,
substituting B's preview beside A's package, changing one verdict number or
digest, removing the watermark/stamp, adding an external dependency, or moving
one inline planning feature must fail non-zero and name `preview.DEMO.html`
plus the stale/tampered field or feature. A generator that merely overwrites a
bad page without ever detecting it has not implemented this mutation gate.

Rendered semantics are the evidence boundary, not raw source text. The gate
must therefore also kill: (a) an external resource expressed through CSS
escapes that the browser decodes to `url(...)`; (b) an SVG/CSS transform that
moves a feature while leaving its raw `points` unchanged; and (c) a planning
feature hidden or visually replaced while its canonical coordinates remain in
the DOM. A regex that recognises only literal fetch syntax, or a coordinate
comparison that ignores the rendered transform/style surface, is fail-open.

A claimed positive allowlist must consume the same complete start-tag token
surface as the browser, including quoted, unquoted, and boolean attributes; an
attribute parser that silently ignores a legal browser token is fail-open. It
must also validate the generated tree, roles, multiplicity, and ordering—not
only whether each individual element/attribute name belongs to an allowed
vocabulary. An extra allowed SVG polygon that is not bound one-to-one to an
expected feature/annotation and paints over the plan must fail. Stylesheet
evidence is semantic too: equivalent numeric spellings such as `opacity:0.0`
must not bypass visibility checks that reject `opacity:0`.

### THD-18 — DEMO actionability can never claim sanctionable today

Every report form (JSON, visible report PDF, title blocks where status is
summarised, parity sidecars, and `preview.DEMO.html`) must carry one computed
actionability object/line. For a `demo-illustrative` slice its only truthful
value is `sanctionable-today: unknown`, with a visible reason stating that the
slice is imaginary, represents no jurisdiction, has no real source instruments
or restraint sweep, and cannot support a sanctionability claim.

This is a type lock, not a default string:

1. the public DEMO input/output types must exclude `yes` at compile time; a
   compile-only fixture attempting to construct DEMO actionability with `yes`
   must fail typecheck;
2. forged input, a cast/unchecked JSON object, exporter configuration, or a
   caller-supplied status may not promote the value; it must be refused with a
   stable named error before artifacts exist or be recomputed to `unknown`;
3. every exporter consumes the same computed object; independently typed
   actionability strings fail surface review;
4. A and B remain `unknown` and cite no invented real authority, instrument,
   sweep date, restraint, or Gurgaon actionability claim; and
5. actionability never changes the locked Research Draft + DEMO stamp or any
   envelope/geometry number.

Mutate the DEMO type to admit `yes`, change the runtime predicate to emit it,
and inject `yes` through the public request/config surface. Each mutation must
turn THD-18 red. This demo-only lock does not replace Stage1Spec v1.2's
production `yes | no | unknown` actionability axis.

“Visible reason” means rendered, human-visible text. Keeping the truthful
reason only in a comment, hidden node, metadata, clipped/off-page text, or
otherwise non-visible carrier while showing a forged/shortened reason must turn
THD-18 red. Raw byte presence is not actionability parity.

The truthful actionability surface is exclusive as well as required. Exactly
one visible computed status line and its one visible reason may make a
sanctionability claim. Adding a second visible `sanctionable-today: yes` or
equivalent promotion must fail even when the required `unknown` node remains
untouched elsewhere on the page.

## 5. Required mutation evidence

Fable's v0.1 handoff is incomplete without logs showing these mutants were
killed and then reverted:

| Mutation | Test(s) that must turn red |
|---|---|
| suppress one artifact/page DEMO marker | THD-05/06 |
| remove one applicable required entry | THD-01 |
| replace stamp `any-unverified` with `all-unverified` | THD-10 |
| tamper with one presentation-only geometry feature | THD-13/14 |
| replace runtime primary-road width with a fixed number | THD-08/15 |
| copy density ceiling into placed-capacity result | THD-12/16 |
| ship a missing, stale, externally dependent, or geometry-tampered preview | THD-17 |
| admit or emit `sanctionable-today: yes` for a DEMO slice | THD-18 |

Mutation evidence is behavioural: record the expected red result, restore the
implementation, and show the green rerun. Code screenshots are not evidence.

## 6. Visual and claims review after automated green

Sol will render every shipped page and inspect delivery-scale legibility,
clipping, dimension collisions, false legend/color mapping, hidden watermarks,
and technical/presentation consistency. The presentation must use green for
actual green/open polygons and blue for the actual pool/water polygon; decorative
color may not misclassify geometry.

The narration must say, in substance:

> The values and both slices are illustrative. The rulebook, citation, refusal,
> geometry, and swap pipeline are real. Real Gurgaon claims wait for
> Mannu-verified entries.

It must not claim current Gurgaon compliance, approval, a general-site solver,
or that the density ceiling equals geometrically feasible capacity.

## 7. VC red-team questions

| Question that breaks a weak demo | Evidence required for the answer |
|---|---|
| “Both slices are fake. How do I know these aren't two pre-drawn maps?” | THD-08 and THD-15: novel runtime value, same executable, measured geometry change, A→B→A isolation |
| “You say 400 fit. Where are the 400 after roads, parking, green space, and amenities?” | THD-12/16: density ceiling separated from independently counted placed geometry |
| “What happens when one circular or rule is missing?” | THD-01: 14-slot deletion matrix, named refusal, no resolved rulebook/package |
| “How do I know the beautiful map is the technical plan?” | THD-11 and THD-13/14: independent parsers and a tamper-killing parity oracle |
| “Can an operator remove DEMO or click ‘approved’?” | THD-05/06 and THD-09/10: package-wide watermark and no upward path |
| “Can an allowed white polygon cover the plan, or an extra sentence claim approval, while the verifier still passes?” | THD-17/18: exact rendered tree/visibility and one exclusive computed actionability surface |
| “Can this do my irregular Gurgaon parcel today?” | Honest answer: no. v0 is one fixed imaginary rectangle on illustrative slices. |

The first question is the principal mechanism breaker. The second is the
principal numerical breaker. A dropdown plus a changed picture, or a density
calculation without geometry, does not survive either.

## 8. Handoff and verdict rule

Fable's v0 ledger handoff must provide:

1. revised public surface and fixture paths;
2. one clean generation command and one test command;
3. generated package paths;
4. green test log with THD IDs;
5. all eight mutation red/restore logs;
6. known deviations, if any.

Fable then hands the single ball to Sol. Sol reruns from clean outputs,
independently parses and renders the artifacts, repeats the mutations, and
red-teams the stage script. **All THD-01…THD-18 plus visual/claims review must
pass.** “Pass with caveats” is not a pass. Any proposed relaxation or product
claim beyond this contract goes to Shivam's goal chat through the ledger.
