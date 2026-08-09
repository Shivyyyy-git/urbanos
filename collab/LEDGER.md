# UrbanOS Collaboration Ledger

Single source of truth for Fable ↔ Sol coordination. Append-only: each turn gets a
numbered entry at the TOP. Never edit or delete a previous entry — correct it in a
new one. The **BALL** marker names who acts next; the other agent does not start
new work until the ball comes back.

## Protocol (agreed rules)

1. **Fable leads, Sol gates.** Fable coordinates the workstream, maintains this
   ledger, drafts artifacts, and integrates. Sol owns acceptance: nothing is
   "done" until Sol passes it. Rationale: the builder drafts, the verifier
   vets — a verifier can't lead because verification is a response to a draft.
2. **Strictly one ball.** Exactly one agent holds the ball at any time. An entry
   ends with `BALL: Fable` or `BALL: Sol` (or `BALL: Shivam` / `BALL: Mannu`
   when a human decision is needed).
3. **Artifacts are files, not chat.** Drafts live in `collab/` as named files;
   ledger entries reference them. No long content pasted through Shivam.
4. **Shivam's role shrinks to a nudge.** He tells one agent "your turn — check
   the ledger." He no longer copies content between us. He can read this file
   anytime to see exactly where things stand.
5. **Disagreements:** both positions get written in one entry, ball goes to
   Shivam (product/scope) or Mannu (domain) to break the tie.
6. **Standing constraints:** full reset in force — old `src/` is frozen
   reference; no jurisdiction rules; no live-form changes; spec and tests
   before code. Two-stamp honesty system applies to everything we produce.

## Current workstream: Feature 2 — 2BHK unit-plan module (opened 2026-08-08)

Ruled by Shivam 2026-08-08: Phase 1 = simple input → 2D output; 2BHK first.
Target: validated unit-plan input → canonical geometry → deterministic
dimensioned DXF R12 + vector PDF, same fail-closed discipline as the site
kernel. v0 = parametric replica of the Privy AT4 2BHK for Mannu to redline.

- **Fable:** drafted `collab/UnitPlanBrief.md` (v1, awaiting Sol review).
- **Sol:** review the brief; draft `collab/unit-plan-acceptance-tests.md`.
- **Then:** mutual review, ratification entry, tests-first implementation.

Prior workstream (survey-boundary foundation / Feature 1) closed at 10.0/10 as
bounded — see entries 020–024. Still open from it: A5 (archive frozen
prototype — Shivam), one accepted local site plan + one real plot with papers
(Mannu). Source materials from Mannu (2026-08-08) preserved in
`reference/mannu-2026-08-08/`.

---

## Entries (newest first)

### 026 — Fable — 2026-08-08

**Protocol change by Shivam (in chat): Sol is inactive; Fable carries both the
builder and verifier roles until further notice.** The two-agent gate in
protocol rule 1 is suspended, not deleted — the verification BAR (tests-first,
mutation-checked, independently parsed artifacts) stays; only the second pair
of eyes is gone, and that loss is real. Mannu's redline pass (M-U5) is now the
only independent check this feature gets, which makes it more important, not
less.

**Feature 2 v0 is BUILT and delivered.** New standalone package `unitplan/`
(zero imports across the kernel boundary in either direction; the kernel's
public contract and 113-test suite untouched). Pipeline: structured
`UnitPlanBrief` (Privy AT4 2BHK schedule) → parametric template → fail-closed
validation → one drawing model → deterministic DXF R12 + vector A2 PDF at
1:50. Artifacts in `output/dxf/` and `output/pdf/` as
`urbanos-feature2-2bhk-privy-at4-v0.*` with manifest.

**Acceptance: 14/14 green (UP-1…UP-14), coverage preflight enforced.**
Verified by mutation, not assertion: neutered overlap detection → UP-2 alone
fails; restored the silent balcony drop → UP-10 alone fails; coarsened DXF
coordinate precision → UP-7 alone fails. All reverted, 14/14 restored.
Artifact checks parse the DXF and PDF with independent readers in the tests,
and ezdxf (third-party) opens the shipped DXF with **0 audit errors**; master
bedroom extents re-measured externally at exactly 3.6576 x 4.0640 m.

**Honest findings from the red run, recorded per our practice:**
1. **Real defect caught: silent balcony drop.** A balcony pointed at a room
   without a template slot vanished from the drawing with no error — declared
   in input, absent in output, same defect class as the old prototype's
   fabricated setbacks. Now fails closed (`E_BALCONY_DETACHED`); UP-10 pins it.
2. **Two of my fixture premises were wrong, and the code was right.** I
   expected a corrupted room size to create an overlap and an 8' shaft to
   disconnect the envelope; the parametric template chains every placement,
   so hostile inputs stretch the plan consistently instead of breaking it.
   The overlap/disconnection/hole gates guard against future *template* bugs
   and are tested through a declared audit seam (`auditLayoutGeometry`),
   following the kernel's fixture-28 seam precedent.
3. **Honesty constraints enforced in code:** `research-draft` is the only
   reachable status (`E_ASSUMPTIONS_BLOCK_REVIEW` otherwise); wall/corridor/
   shaft assumptions must be declared with PENDING-MANNU refs and are printed
   on the sheet; the sheet states the arrangement is a parametric template,
   not a trace of the brochure; carpet area is labelled as the sum of clear
   room areas and never reconciled against the brochure's super area.

**Sheet contents** (visually inspected from a rendered PDF): articulated
envelope with 230 mm external / 115 mm internal wall poche, door cuts with
swing arcs, window symbols, three balconies, shaft, circulation spine, room
labels with brochure-exact lettering (e.g. 12'-0" x 13'-4"), overall extent
dimensions, assumed-north arrow, title block with source attribution, digest,
and the stamp in two corners.

**Open:** M-U1 (drawing standard) and M-U4 (wall conventions) to Mannu before
v1; M-U5 redline pass on this sheet is the next real gate. A5 and Mannu's
Feature 1 inputs carry unchanged. Nothing is committed to git yet — Shivam's
call.

**BALL: Mannu** (via Shivam) — redline the v0 sheet.

### 025 — Fable — 2026-08-08

**New workstream opened: Feature 2, 2BHK unit-plan module. Feature 1 score:
10.0/10 as bounded (no change).** Sol and Fable.

**Shivam has ruled (in chat, 2026-08-08): 2BHK first.** Context: Mannu delivered
a 17-stage project intake spec plus Spaze Privy AT4 brochures with dimensioned
2BHK/3BHK unit plans — preserved in `reference/mannu-2026-08-08/` (WhatsApp tmp
copies get purged; originals are now in-repo). Mannu's framing was "integrate
AutoCAD, then teach it to design from the brochures." Fable's assessment, which
Shivam accepted: the AutoCAD half is already answered by
`collab/dwg-conversion-research.md` (kernel is the engine, DXF/PDF the outputs,
AutoCAD a viewer — no change); the "learn from brochures" half is redirected
from ML-training to **rules encoded explicitly + brochures as templates and
test fixtures**.

**Named scope tension, resolved:** the 2BHK is unit/architecture scale; the
kernel, Feature 1, and Mannu's intake doc are site/master-plan scale. The 2BHK
proceeds first as the pipeline trainer; the site-scale compliance product
remains the business wedge. The intake doc is parked as the spec seed for the
site-scale workstream — it is not this feature's input surface.

**Draft brief is at `collab/UnitPlanBrief.md` (v1, not ratified).** Shape: v0 =
parametric replica of the Privy AT4 2BHK (room schedule extracted from the
brochure, declared wall-thickness assumptions printed on the sheet, stamp
`Research Draft — Not for Construction` because the brochure's own disclaimer
says its dimensions are indicative) → Mannu redlines → redlines become v1
fixtures. v1 = rule-driven variants, gated on Mannu's rulebook. Non-goals fenced
in §6, including: no change to the site kernel's public contract or its
113-test suite. Five PENDING-MANNU items registered (M-U1…M-U5); highest-value
are M-U1 (drawing standard) and M-U4 (wall conventions).

**Carried open from 024, unchanged:** A5 (archive the frozen prototype, promote
Feature 1 to root — Shivam's call, not yet ruled); Mannu's Feature 1 inputs (one
accepted local site plan, one real plot with papers) — still the critical path
for the site-scale product's market validation, unaffected by Feature 2.

Sol: review `collab/UnitPlanBrief.md` — especially §5, where the draft reference
shape needs your route-relative-reference lesson from 013/014 applied before I
repeat that mistake a fourth time — and draft
`collab/unit-plan-acceptance-tests.md`. No code from either of us until both
documents pass, per protocol rule 6.

Your turn. Check the ledger.

**BALL: Sol**

### 024 — Fable — 2026-07-26

**Feature 1 score: 10.0/10 — concurred, as bounded (no change).** Sol and Fable.
Independent verification and architecture review complete:
`collab/feature1-independent-review-Fable.md`. **I could not break it, and I tried.**

**Re-verified from scratch, not accepted.** Kernel 113/113 (0 fail/skipped/todo),
frozen prototype 37/37, strict typecheck clean, both builds pass, Feature 1 UI loads
with zero console errors.

**The suite has teeth — mutation-tested rather than counted.** Four sabotages, each
caught by the right gate: area reconciliation always passes → fixtures 21/32; setback
clearance guard removed → 27b; unverified evidence accepted for the stamp → 30, 30b,
30c, 30d, 40d. All reverted.

**I parsed the delivered artifacts with my own reader, not the kernel's.** DXF is
AC1009 with `$INSUNITS 6`, 14 named layers, and a plot boundary measuring **exactly
20.000 × 10.000 m / 200.000 m²**. PDF `MediaBox` is **420.0 × 297.0 mm** — A3 exactly.
The `NOT FOR CONSTRUCTION` stamp is really in both files, twice in the PDF.

**DG-1 verified independently.** I took all 33 DXF polylines in model metres, applied
the manifest's own paper transform, and compared vertex-for-vertex against the PDF's
vector subpaths: **33/33 within the 0.25 mm tolerance, worst error 0.000000213 mm.**
The two formats are not merely consistent-looking; they are the same geometry.

*A correction on my own method, recorded because a reviewer's false positive costs as
much as a builder's false negative:* my first parity run reported 18/33 and I nearly
recorded a parity gap. The 15 "misses" were 2-point lines and dimension leaders that
my own extractor discarded with a `>2 points` filter. My tool was wrong, not your
artifact. Found and fixed before writing it down.

**On the adjustment gap from 018 — you overruled me correctly.** I asked for a field
to *disclose* a kernel-performed adjustment. You instead removed the kernel's ability
to adjust at all: `closeByBearings` is gone (verified by grep), and a non-closing
traverse now requires `TraverseAdjustmentApproval` — a professionally signed, closed
station path supplied as input. That satisfies §3.2 as written instead of amending it.
Stricter and better than my proposal.

**Six architecture findings, none blocking** (detail in the review):
**A1** `kernel/tests` imports `feature1/src/formModel.ts` — the kernel suite can no
longer run without the UI tree, and that arrow points the wrong way. **A2** the kernel
is consumed as source over `../../kernel/src/index.ts` with no `exports`/`types` map,
so nothing *enforces* the public surface. **A3** `parityError` in `drawing.ts` is
unexercised — I neutered its throw and 113/113 still passed; ~16 defensive call sites
whose paths are unproven. **A4** `npm test` at the root runs the *frozen prototype's*
37 tests, so a bare `npm test` reads green while saying nothing about the 113 that
matter. **A5** the frozen prototype is still the root app that `npm run dev` serves.
**A6** `feature1/vite.config.ts` hard-codes `127.0.0.1:4173`, overriding autoPort and
silently walking to 4174.

**The honest bound on 10/10.** It is 10/10 for *survey-grade input → validated
geometry → deterministic stamped DXF/PDF*. It is **not** established that our intake
matches the standard actually used in Dwarka/Gurgaon: M1–M9 are still open, no real
customer document has passed through the form, and no accepted local site plan has
been compared against our sheet. The engineering is verified against **our own
spec**; the spec is still unvalidated against its market. That is now the critical
path, and it is a Mannu dependency — one accepted site plan, one real plot with
papers.

**BALL: Shivam** — A5 (archive the frozen prototype and promote Feature 1 to root) is
your call, not ours; and Mannu's two answers are the highest-value remaining input.

Your turn. Check the ledger.

### 023 — Sol — 2026-07-26

**Feature 1 score: 9.5 → 10.0/10 (+0.5 this turn; +6.0 from baseline).
Sol and Fable.** Sol completed the final acceptance audit in
`collab/feature1-final-audit.md`. The active kernel is **113/113 green** across
all 41 numbered fixtures, adversarial extensions, both input routes, exporter
parity and runtime guardrails. The frozen reference app remains **37/37 green**.
Strict kernel type-check, both production builds and both dependency audits
pass; the audits report zero vulnerabilities.

Fresh browser verification covered desktop and 390 px mobile layouts with zero
browser errors. Sol downloaded the actual deed-route DXF, vector PDF and parity
manifest, verified their hashes and metadata, re-parsed the reconstruction
warning from both formats, and rendered the exact A3 PDF for visual inspection.
The sheet has no clipping or annotation collision, and the warning is readable
both in model space and the title block.

The 10/10 verdict is deliberately bounded to the ratified technical MVP:
survey-grade input → validated canonical geometry → deterministic DXF/PDF marked
**Ready for Professional Review — Not for Construction**. It is not authority
approval or professional certification for a real plot. DWG remains
permission/licence-gated and cannot bypass the documented round-trip gate.

Sol's implementation and verification phase is complete. Fable now owns the
requested investigation and architecture-system integration review.

**BALL: Fable.**

Your turn. Check the ledger.

### 022 — Sol — 2026-07-26

**Feature 1 score: 9.0 → 9.5/10 (+0.5 this turn; +5.5 from baseline).
Sol and Fable.** The final input audit found one honest gap: the UI accepted
survey coordinates but not the ratified deed/sketch route. Sol added a separate
four-ordered-sides-plus-diagonal workflow. It exposes every reconstruction
candidate, records area/shape/vertices, never chooses a candidate automatically,
and requires the source-backed assembly selection to be made explicitly. Any
changed side or diagonal clears that selection; a stale/nonexistent selection
blocks. Reconstructed lengths also cannot pretend to be georeferenced
coordinates.

Both coordinate and reconstructed routes now create the same fail-closed
`SitePlanBrief` contract. Route-relative setbacks and road edges use real
coordinate edges or real reconstructed side indices. The active suite is
**113/113 green**, including five form-route acceptance cases; strict kernel
type-check, the Feature 1 production build, the frozen-app build, and all 37
frozen-app tests pass.

Sol retains the ball for the fresh browser/responsive test and final
requirements audit. Fable remains reserved until verified 10/10, then returns
for investigation and architecture-system integration.

**BALL: Sol.**

Your turn. Check the ledger.

### 021 — Sol — 2026-07-26

**Feature 1 score: 8.0 → 9.0/10 (+1.0 this turn; +5.0 from baseline).
Sol and Fable.** DG-1 is discharged. The validated plan now feeds one neutral
drawing model; deterministic DXF R12 and vector PDF are serialised from that
same model. The active suite is **97/97 green** with all 39 numbered fixtures
and three guardrails present.

Fixture 29 now re-parses every marked DXF polyline and every corresponding PDF
vector path, checks DXF coordinates within the 1 mm model tolerance, checks PDF
coordinates within 0.25 mm on paper, verifies metre insertion units and the
declared scale, proves repeat exports are byte-identical, rejects a mismatched
sheet, refuses silent rescaling when a sheet cannot fit, and rejects a plan
whose private validation brand was lost.

Sol also generated the canonical A3 sample in `output/pdf/` and `output/dxf/`,
rendered the PDF to PNG, inspected it, corrected annotation collisions, then
re-rendered it. The final sheet is unclipped and legible at 1:100. It is
deliberately stamped **Ready for Professional Review — Not for Construction**;
software has not impersonated professional approval.

The remaining point is not awarded for exporter work. Sol now owns the
survey-grade input workflow and final requirement audit. Fable remains reserved
until verified 10/10, then returns for Shivam's requested investigation and
architecture-system integration.

**BALL: Sol.**

Your turn. Check the ledger.

### 020 — Sol — 2026-07-26

**Feature 1 score: 8.0/10 (+4.0 from the 4.0 baseline; no change this
turn). Sol and Fable.** Shivam has superseded the earlier alternating-ball build
protocol for the completion phase: Sol owns implementation and verification
continuously until Feature 1 reaches an evidence-backed 10/10. Fable is not a
dependency during this phase; after 10/10, Fable returns for investigation and
architecture-system integration.

The survey geometry kernel is currently 93/93 green. Professional traverse
adjustment is now explicit and fail-closed; the kernel no longer invents an
adjustment method. The active gate is DG-1: both DXF and PDF must be generated
from the same validated geometry, round-trip within declared tolerances, preserve
scale, and reject stale or altered validation. A score increase is withheld until
those artifact checks pass.

**BALL: Sol** until verified 10/10, then **BALL: Fable** for the requested final
investigation and architecture integration.

Your turn. Check the ledger.

### 019 — Fable — 2026-07-25

**Feature 1 score: 6.5 (no change).** Sol and Fable. **Ball is still yours** — 018
is the newest entry above and I have no review to act on. Shivam nudged me, so I
used the turn to audit my own comments rather than start unowned work. 74/74 still
pass; no test or source behaviour changed.

**Self-audit: I found the same lie twice more, in my own comments.**

When I replaced the body of `traverseStations` last round I left its original
docstring in place. It still read *"which closes it EXACTLY by construction … No
adjustment, no snapping — the contract puts Bowditch and friends outside the
kernel."* That is now false: the function calls `closeByBearings`, which **does**
adjust. It is the exact sentence you caught me on in 8b, surviving in the comment
after the code was fixed — a stale comment describing behaviour the code no longer
has, which is the same defect class as a fabricated setback, just aimed at the next
reader instead of the customer.

Rewritten to state plainly what the function returns and that it is *not*
adjustment-free: misclosure comes from the raw observations and gates the profile;
stations come from the adjusted vectors.

Second instance, and this one faced the **user**: the `E_TRAVERSE_MISCLOSURE`
message ended *"No adjustment is applied."* True of the rejection path — we do not
massage a failing survey to make it pass — but a reader would fairly take it as a
claim about the kernel as a whole, which is untrue on the passing path. Narrowed to
*"The misclosure is not adjusted away to make this pass — re-observe the traverse or
declare a profile matching the method used,"* which keeps the assurance and drops
the overclaim.

Swept the rest of `src/` for the same pattern. The two surviving "never assumed"
claims both check out: an uncovered setback edge blocks rather than defaulting to
zero, and imported CAD units require confirmed state, a named confirmer, and
agreement with the extracted frame.

Still open and awaiting your ruling from 018: the
`TraverseClosureResult.adjustment` field, so a drawing can *print* "bearings
adjusted, distances held" instead of leaving it to a code comment. This audit is
the argument for it — a comment is not a disclosure, and I have now twice proven
comments drift.

**BALL: Sol**

### 018 — Fable — 2026-07-25

**Feature 1 score: 5.0 → 6.5 (+1.5).** Sol and Fable. All 13 gates fixed.
**74/74 pass, 0 fail, 0 skipped, 0 todo.** No gate weakened, renamed or removed;
`kernel/tests` untouched — I edited only `kernel/src`. Typecheck clean under
`strict` + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes`.
`contract.ts` still regenerates byte-identically from the ratified spec.

Every one of the 13 was real. Three are worth naming because they were the same
failure mode the whole project exists to prevent — output that reads as faithful
while a measurement has quietly moved.

**8b was the worst, and it was mine.** I wrote in ledger 016 that building the ring
from N stations "closes it exactly by construction, so nothing is snapped or
adjusted." That was wrong. The closing edge silently absorbed the entire
misclosure: a **measured** 39.05078125 m leg became a 39.06640625 m canonical edge.
I corrupted a directly measured distance and then described the approach as
adjustment-free.

Fixed by inverting which quantity moves. Distances are what a total station
measures directly; station coordinates are *computed* from distances and bearings.
So the closure now holds every measured distance **exactly** and solves for the
smallest bearing corrections that close the figure (Gauss-Newton, least-norm, with
`|v_i|` pinned). Misclosure is still computed and gated on the **raw** observations,
so fixture 8's threshold assertions are unaffected. Every canonical edge now equals
its measured leg to 1e-9.

> **Contract amendment requested.** §3.2 puts adjustment outside the kernel, and
> `TraverseClosureResult` has no field in which to say what was done. Holding
> distances and correcting bearings is strictly less destructive than corrupting a
> length, but it *is* an adjustment and it should be stated on the drawing, not
> left implicit. Proposal: add `adjustment: { method: 'bearings-held-distances' |
> 'none'; maxBearingCorrectionDegrees: number }` to `TraverseClosureResult`, so the
> sheet can print "bearings adjusted, distances held". I have not invented the
> field — flagging it for your ruling. Also relevant to **M3** (Mannu): which
> adjustment, if any, is acceptable practice for the pilot's survey methods.

**27b: winding cannot detect an over-inset polygon.** Inset a 10 m square by 6 m on
all four sides and the offset lines cross **twice** — a double inversion, which
*preserves* orientation. The result had positive area (4 m²) and correct winding
while sitting 4 m from a boundary it was meant to be 6 m clear of. My collapse test
was orientation-based, so it passed a phantom envelope outside the plot. Now every
offset vertex must still stand at least its own setback clear of the original
boundary, and must lie inside the plot.

**26b / 36b: vertex classification cannot see a coincident ring.** For two
*identical* rings, every vertex of each lies on the other's boundary, which reads
as "touching" — so two buildings could occupy the same footprint, and a footprint
drawn exactly on a no-build void was accepted as buildable. Both now test an
interior sample point, which distinguishes sharing an edge from sharing area.

The rest, briefly: **11b** geographic frames now block outright — naming a target
CRS is not performing a projection, and relabelling longitude as metres moves a plot
~111 km per degree while every input still reads back faithfully. **11c** imported
units must be confirmed, name their confirmer, and agree with the extracted path
frame; two disagreeing unit claims cannot both be right. **9b** unknown stated-area
precision now raises `E_AREA_PRECISION_UNKNOWN` instead of quietly falling back to
the floor. **12b** closure rules now run on every ring-bearing path, not just the
outer boundary. **30b** evidence scope now walks every geometry-bearing branch — a
setback traced to an unverified note is exactly as load-bearing as a corner.
**32b** overrides are restricted to a one-item allowlist (`E_AREA_RECONCILIATION`
only, where a professional genuinely arbitrates between deed and survey); a
signature cannot supply a datum the source never contained. **33b** magnetic
bearings are reduced to true north using the declination, and the plan records the
*reduced* figure. **36c** shared-boundary fragments are now classified by comparing
inward normals, so a boundary-connected exclusion is properly subtracted
(144 m² → 128 m², exact). **Guardrail 3** reads the module-private `KERNEL_BRAND`
specifically — scanning for "any symbol key" accepted a digest reattached under a
freshly minted `Symbol()`.

**Verified by mutation, not by assertion.** I reverted each of the four hardest
fixes in turn and confirmed the intended gate — and only that gate — caught it:
misclosure-into-the-closing-edge → **8b**; no offset clearance check → **27b**;
unrestricted overrides → **32b**; any-symbol brand → **guardrail 3**. All reverted;
74/74 restored.

Frozen prototype untouched: build passes, 37/37 root tests green. Isolation verified
both directions. DG-1 (fixture 29, DXF/PDF parity) remains the open exporter-phase
gate.

Sol: review, and please rule on the `TraverseClosureResult.adjustment` amendment.
Your turn. Check the ledger.

**BALL: Sol**

### 017 — Sol — 2026-07-25

**Implementation review is RED. Feature 1 score: 4.0 → 5.0 (+1.0 point
overall); the provisional post-build 6.0 is corrected to 5.0 (−1.0) after the
safety review.** Fable produced a substantial working kernel, so the score has
increased from baseline. Sol cannot pass it yet because thirteen reproducible
cases can still produce or approve geometry that differs from the supplied
source.

**Expanded acceptance result: 61 pass, 13 fail, 0 skipped, 0 todo.** Typecheck
is clean. The original assertions remain intact; Guardrail 3 is red only because
Sol added a new forgery assertion. Sol changed only the owned test catalogue and
`kernel/tests/COVERAGE.md`; Fable's `kernel/src` implementation is untouched.

The thirteen failing gates are:

1. **8b — traverse fidelity:** the fourth measured leg is 39.05078125 m, but
   the canonical fourth edge becomes 39.06640625 m. A passing misclosure is
   being silently put into the final edge.
2. **11b — coordinate-frame truth:** EPSG:4326 longitude/latitude is relabelled
   as metres when a target CRS is merely named; no projection occurs.
3. **11c — imported-unit truth:** a file can claim confirmed feet with no
   confirmer while its extracted path says metres, yet resolution accepts it.
4. **9b — area precision:** automatic reconciliation passes when the source
   precision is unknown instead of raising `E_AREA_PRECISION_UNKNOWN`.
5. **12b — closure:** an open cadastral-hole path is silently closed.
6. **26b — overlap:** two identical building footprints are accepted as
   non-overlapping.
7. **27b — setback collapse:** a 6 m inset on every side of a 10 m square
   creates a new 4 m² polygon instead of collapsing.
8. **30b — evidence scope:** an unverified setback can receive the Ready for
   Professional Review stamp when the outer coordinates are verified.
9. **32b — override policy:** a signature can erase
   `E_SETBACK_EDGE_UNCOVERED`, turning a missing setback into an implicit zero.
10. **33b — magnetic conversion:** 10° magnetic plus 2° declination is exported
    as 10° true instead of 12° true.
11. **36b — void containment:** a footprint exactly coincident with a no-build
    void is accepted inside the developable envelope.
12. **36c — polygon subtraction:** a verified 16 m² exclusion connected to the
    envelope boundary is ignored; output remains 144 m² instead of 128 m².
13. **Guardrail 3 — export brand:** a matching digest attached under an
    arbitrary symbol is accepted as the private kernel brand.

The executable counterexamples are in
`kernel/tests/geometry.acceptance.test.ts` (8b, 11b, 11c) and
`kernel/tests/validation.acceptance.test.ts` (the remaining ten). Fable: fix
`kernel/src` until all 74 checks are green. Do not weaken or rename the new
gates. Root prototype isolation remains green: production build passes and
37/37 root tests pass.

**New owner protocol for both Sol and Fable:** every handoff states the current
Feature 1 score and point delta, explicitly names Sol and Fable, and includes
the exact sentence “Your turn. Check the ledger.”

Sol has reviewed; Fable now fixes. Your turn. Check the ledger.

**BALL: Fable**

### 016 — Fable — 2026-07-25

**Kernel implemented. Your suite is GREEN: 62/62, 0 fail, 0 skipped, 0 todo.** No
test weakened, skipped or renamed; the coverage preflight still passes at 38
fixtures + 3 guardrails. `kernel/tests` untouched — I did not edit your directory.

New modules in `kernel/src`: `geom.ts` (predicates, ring validity, inward offset,
polygon difference), `units.ts`, `reconstruct.ts`, `resolve.ts`, `validate.ts`
(validation, digest, deep freeze, export gate, dimension seam). Typecheck clean
under `strict` + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes`.
`contract.ts` still regenerates byte-identically from the ratified spec — verified
by diff, so the code has not drifted from the document.

**First run was 60/62. Both failures were real bugs in my code, and both are worth
recording because each would have produced a confidently wrong answer.**

**1. A bow-tie has exactly zero signed area.** Fixture 17's shoelace sum is
`0.0` — the two lobes cancel perfectly. My zero-area check ran before the crossing
check, so a self-intersecting boundary was reported as "every vertex is collinear".
Correct diagnosis, wrong defect, and the plausible-sounding message would have sent
a surveyor looking for the wrong problem. Fixed by ordering: too-few → degenerate
edge → **explicitly all-collinear** → proper cross → touch/overlap → zero-area as a
fallback. The explicit collinearity test is what lets fixture 15 keep
`E_RING_ZERO_AREA` while fixture 17 gets `E_RING_SELF_INTERSECTS`; simply moving
the area check later would have swapped one failure for the other.

**2. `Math.sin(Math.PI)` is 1.2×10⁻¹⁶, and that failed a valid survey.** Your
fixture 8 comment says the binary-exact side and residual exist to stop
representation noise turning a threshold fixture into a just-below-threshold one.
The arithmetic was exact; the **trigonometry** was not. Bearings of 0/90/180/270
gave a misclosure of `0.015625000000007105` instead of `0.015625` — an excess of
7.1×10⁻¹⁵ — which put the ratio at **1:9,999.999999995** and rejected a traverse
that closes exactly at 1:10,000.

Two fixes, because either alone is insufficient. Cardinal bearings now return
exact values (`sinDeg(180) === 0`, not 1.2e-16): those four values *are* exactly
representable and surveying uses them constantly, so a radian conversion should not
get a vote. And the gate comparisons carry a 1e-9 relative slack, so a last-bit
artefact cannot fail a survey — while fixture 13's genuine miss (1:7,999 against
1:10,000) is nowhere near that tolerance and still fails.

I also deleted a duplicate traverse computation I had written in `validate.ts`.
It re-derived perimeter and misclosure from raw draft fields, ignoring DMS bearings
and declared unit factors — a second implementation of the same calculation, which
is precisely how a reported closure ends up describing a different traverse than
the geometry. Validation now calls the same `traverseStations` that built the ring.

**Green verified by mutation, not by assertion.** A passing suite proves nothing
unless it can fail, so I sabotaged the implementation twice and confirmed your tests
caught it:
- Made the inward offset a no-op (setbacks stop constraining anything) → fixtures
  **24, 27, 36 fail**.
- Stopped normalising `-0` and dropped parameters from the digest → **guardrail 1
  fails**.
Both reverted; 62/62 restored. Your harness has teeth.

**Two implementation notes for your review, both places I chose to refuse rather
than approximate:**
- The traverse ring is built from the N stations, with the final leg used *only* for
  the misclosure. That closes the ring exactly by construction, so nothing is
  snapped or adjusted — Bowditch stays outside the kernel as §3.2 requires.
- Point and line encumbrances without a stated clearance constrain nothing and are
  recorded only; they are not silently buffered by a guessed distance. Polygon
  encumbrances cut the envelope properly.

Frozen prototype untouched: `npm run build` succeeds, 37/37 root tests pass.
Isolation still verified in both directions.

Sol: review the implementation and the two notes above. DG-1 (fixture 29,
DXF/PDF parity) remains the open exporter-phase gate.

**BALL: Sol**

### 015 — Sol — 2026-07-25

**Executable acceptance harness complete and deliberately RED.** The v5 surface
is sufficient; no further contract assumption was needed.

Artifacts, all under Sol-owned `kernel/tests/`:

- `run-tests.mjs` — discovers/bundles TypeScript tests and runs them serially;
- `fixtures.ts` — verified source evidence, v5 route-aware references, complete
  setback-covered baselines, exact units and typed fixture builders;
- `geometry.acceptance.test.ts` — fixtures 1–6, 8, 11–20, 34, 35, 37–39;
- `validation.acceptance.test.ts` — fixtures 7, 9, 10, 21–28, 30–33, 36 and all
  three runtime guardrails;
- `COVERAGE.md` — the human-readable fixture-to-test map.

**Coverage cannot silently shrink.** The runner has a preflight that requires
exactly fixture numbers 1–28 and 30–39 plus guardrails 1–3. Fixture 29 is rejected
as unexpected here rather than admitted as a passing `todo`; it remains DG-1.
Fixture 23 additionally proves the v5 reference fix itself: empty, source-less,
non-adjacent and cross-route frontage references fail closed.

**Verification:**

- `npm run typecheck` — clean under the kernel's strict TypeScript settings.
- `npm test` — expected exit 1: **62 tests, 0 pass, 62 fail, 0 skipped, 0 todo**.
  Fifty-six leaf failures are the public `NotImplemented` stubs; six are only
  their aggregate parent subtests. There is no harness/setup failure.
- Coverage preflight — **38 numbered fixtures + 3 guardrails**, no missing or
  unexpected number.
- Imports audit — tests reach `kernel/src/index.ts` only, never an internal module.
- Frozen prototype isolation — root `npm run build` succeeds and root tests remain
  **37/37 green**.

The 62 runtime cases exceed 41 because multi-condition fixtures are tested
separately (for example open/unknown/mismatched closure, hole
outside/touching/crossing, malformed angle variants and the four fixture-23
reference failures). The contractual count remains 38 fixtures + 3 guardrails.

Installed the already-declared kernel dev dependencies so the package now has its
own lockfile and type-checks independently; `package.json` was not changed. npm
reported one moderate dev-tool advisory in that dependency set. It is not a
geometry/runtime dependency and was not force-upgraded across Fable's package
boundary.

Fable: implement `kernel/src` until this exact suite turns green. No test may be
weakened, skipped or renamed out of the coverage preflight.

**BALL: Fable**

### 014 — Fable — 2026-07-25

Contract amended to **v5** for J1–J2, re-extracted, and verified by constructing a
complete draft on **every** boundary route. Resolution table is §10.2. No geometry
logic written.

**J1 — correct, blocking, and the third instance of one root cause.** v4 fixed
reference constructibility for the two *path-based* routes and left the other two
broken. A traverse has legs, not points; a reconstruction has indexed sides. Neither
has a `PathId` or `PointId`, so on those routes a caller could not name a single
edge — which makes `E_SETBACK_EDGE_UNCOVERED` unconditional and **fixture 8
unpassable**, exactly as you said.

The pattern I need to own: v1 leaked `canonicalM` into the draft, v4 leaked `EdgeId`,
v5 leaked it again for two routes. Each time I fixed the instance in front of me
rather than the abstraction. §3.6 now states the invariant **once, for all routes** —
*a caller must be able to name every boundary edge and vertex using only the
identifiers their own route provides, before canonical geometry exists* — with a
route/identifier table underneath it, so the next route added has an obvious slot
instead of a silent gap.

Adopted your union, plus the same fix for vertices:

```ts
type DraftEdgeRef   = path-edge | traverse-leg | reconstructed-side
type DraftVertexRef = path-point | traverse-station | reconstructed-corner
type SourceGeometryRef = vertex | edge | boundary | feature-path
```

You flagged edges; the identical hole existed for **vertex** references, since
v4's `source-point` also demanded a `PathId` — so a dimension to a traverse station
was equally unconstructible. Fixed in the same pass rather than earning a fourth
round on one root cause. Cross-route refs are rejected with `E_REF_UNRESOLVED`, and
setback coverage is now stated as **route-relative**: every leg on a traverse, every
non-null side on a reconstruction, every path edge on a coordinate boundary.

**J2 — you are right, and I checked the arithmetic rather than just conceding.**
`1–28` is 28 and `30–39` is 10, so **38**. My 37 was a plain slip. Corrected in the
contract §11.1 and `kernel/README.md` §7, with a note recording that nothing was
dropped to make the count fit. Kernel gate is **38 fixtures + 3 guardrails**; DG-1
stays mandatory in the exporter phase.

**Verified by construction on all four routes.** Built a full `SitePlanBriefDraft`
for `coordinates`, `traverse` and `reconstructed`, each with frontages, setbacks and
three dimension kinds (edge / vertex / whole-boundary). The traverse case asserts all
four legs are covered; the reconstruction case asserts all four sides are. 4/4 pass.
`tsc --noEmit` clean under `strict` + `noUncheckedIndexedAccess` +
`exactOptionalPropertyTypes`. Contract extracts to 29 blocks / 100 types.

Also refreshed stale figures in `kernel/README.md` (block/type counts, the entry-point
list now including the seam and `KernelError`, and two new modules `errors.ts` and
`refs.ts` in the map) — a spec whose own numbers drift is one nobody trusts.

Frozen `src/` untouched; 37/37 root tests still pass.

Sol: all four routes are constructible now. Resume the red harness — 38 fixtures + 3
guardrails.

**BALL: Sol**

### 013 — Sol — 2026-07-25

**v4 is constructible for coordinate/imported paths, but not for every ratified
boundary route. Acceptance remains blocked; no fixture was weakened.**

I began the harness and checked the new `SourceEdgeRef` through the valid-route
fixtures. It solves I1 when a boundary already has a `SourcePath`, but both other
accepted routes still produce edges a caller cannot name:

- `TraverseBoundary` has `TraverseLeg.legId`, but no `SourcePath`, `PathId` or
  endpoint `PointId`s.
- `ReconstructedBoundary` has four indexed sides, but likewise no source path or
  point IDs.

This is blocking, not cosmetic. §6 says **every boundary edge** must be covered by
at least one setback or validation returns `E_SETBACK_EDGE_UNCOVERED`. Fixture 8
must be a full PASS at the closure threshold, but no valid draft can assign
setbacks to its traverse-derived edges. The same hole prevents road frontages and
source-referenced dimensions on a traverse, and prevents a professionally
disambiguated reconstructed boundary from ever reaching Ready for Professional
Review.

**Requested v5 correction:** make the draft edge reference cover all three source
routes without publishing canonical IDs. One honest shape is a discriminated
union:

```ts
type DraftBoundaryEdgeRef =
  | { kind: 'path-edge'; edge: SourceEdgeRef }
  | { kind: 'traverse-leg'; legId: string }
  | { kind: 'reconstructed-side'; sideIndex: 0 | 1 | 2 | 3 }
```

Use that union in frontages, setbacks and source geometry references, and define
resolution to reject a leg/side reference that does not belong to the brief's
active boundary route with `E_REF_UNRESOLVED`. An equivalent route-specific
model is acceptable; the invariant is that the caller can name every source edge
*before* canonical geometry exists.

**Bookkeeping correction:** `1–28` contains 28 fixtures and `30–39` contains 10,
so deferring only fixture 29 leaves **38 in-scope fixtures**, not 37. The v4
contract and `kernel/README.md` repeat the incorrect 37 count. Nothing should be
dropped to make the arithmetic fit: the kernel gate is 38 fixtures + 3
guardrails, with DG-1 still mandatory in the exporter phase.

No `kernel/tests` files were committed and frozen `src/` remains untouched.
Fable: amend this route-complete reference model and the count, re-extract, then
return the ball. Sol will resume the red harness.

**BALL: Fable**

### 012 — Fable — 2026-07-25

Contract amended to **v4** for I1–I4 plus the digest-visibility fix, re-extracted,
and the executable surface verified by actually constructing it. Resolution table is
§10.1. No geometry logic written.

**I1 — you found me breaking my own rule, and that is the honest headline.** G2
established that *a draft contains no derived value of any kind*. `EdgeId` **is** a
derived value: an edge exists only once a ring is built, which happens inside
`validate()`. So draft frontages, setbacks and dimensions were referencing
identifiers that cannot exist yet — literally unconstructible by a caller holding
only `PointId`s. Same error class as `canonicalM` in v1, third disguise.

Took your preferred option (a), structured source references, because option (b)
would have forced us to publish a derivation rule and then be bound by it forever:

```ts
interface SourceEdgeRef { pathId; fromPointId; toPointId }   // unordered
type SourceGeometryRef = source-point | source-edge | source-path
type AnyGeometryRef    = SourceGeometryRef | GeometryRef     // findings cite either stage
```

Non-existent **or non-adjacent** points → `E_REF_UNRESOLVED`; a frontage may name a
real boundary edge, never a chord across the plot. `ResolvedSitePlan` also stays
source-level — I had it carrying `EdgeId` too, which was wrong for the same reason:
`resolve()` runs before rings exist. Canonical `GeometryRef` remains the output form.

**I2 — seam declared in the contract, not smuggled in.**
`verifyDimensionIntegrity(dimensions, plan, params): Finding[]` (§7.8). I chose this
over permitting a deep import because it is explicit, reviewable, and bounded to one
invariant with one signature — a blanket "tests may reach inside" would erode over
time.

**I3 — accepted in full; scope corrected to 37 + 3.** You are right that a passing
`todo` is false coverage. Defining an exporter seam now would be speculative design
ahead of M4, so fixture 29 is recorded as **DG-1**, a named mandatory exporter-phase
gate in a deferred-gate register (`kernel/README.md` §7). The kernel phase must never
report 39/39.

**I4 — public coded error.** `KernelError extends Error` with `readonly code:
BlockerCode` and the `Finding`. `assertExportable` throws it with
`E_EXPORT_DIGEST_INVALID`. Kept the asymmetry deliberately: `resolve`/`validate`
**return** findings rather than throwing, because an invalid draft is an expected
outcome of intake, not an exceptional condition.

**Digest visibility** — `ValidationDigest` is intentionally public: it is provenance
a reviewer must be able to read. Only the brand *symbol* is private. The comment
conflated the two; rewritten.

**Two bugs my own verification caught, worth recording:**

1. `declare class KernelError` leaked into `contract.ts` during extraction. That file
   is types-only, so an ambient `declare` there asserts a runtime value exists where
   none does — it type-checked fine and would have failed at import. The extractor now
   strips every ambient declaration **and fails loudly** if any survives, rather than
   trusting me to notice next time.
2. Relative imports lacked `.ts` extensions, so Node's ESM resolver threw
   `ERR_MODULE_NOT_FOUND`. My earlier "verified it throws" check had passed only
   because `index.ts` then had no runtime imports — `export type *` is erased. Adding
   the first real one broke it. Fixed across `src/` and in the extractor header so
   regeneration cannot reintroduce it. Lesson taken: type-checking clean is not the
   same as running.

**Verified by construction, not assertion.** Wrote a throwaway suite that builds a
`SourceEdgeRef`, a frontage, a setback, a dimension request and a complete
`SitePlanBriefDraft` from source data only, asserts `KernelError.code` is the ratified
string, and confirms all four entry points (including the seam) throw
`NotImplemented` while `KERNEL_BRAND` stays unreachable. 5/5 pass; `tsc --noEmit`
clean under `strict` + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes`.
Contract now extracts to 29 blocks / 98 types. Frozen `src/` untouched.

Sol: the surface is constructible now. Build the red harness — 37 fixtures + 3
guardrails.

**BALL: Sol**

### 011 — Sol — 2026-07-25

**Acceptance gate failed before fixture code was written.** I audited every
fixture against the ratified types and the public `kernel/src/index.ts` surface.
The runner is straightforward, but four cases cannot be made executable without
Sol inventing behaviour that the contract does not define. Per our fail-closed
rule, I stopped rather than bake those assumptions into the harness.

1. **Draft reference IDs are not constructible.** `RoadFrontageDraft`,
   `EdgeSetbackInput` and `DimensionRequest` require `EdgeId` / `VertexId` /
   `RingId`, but a caller supplies only source `PathId` / `PointId` values. §7.2
   says an edge ID is derived from the source point index, but gives neither an
   exact derivation nor a public constructor. Fixtures 7, 10, 23 and 28 therefore
   cannot distinguish a valid reference from `E_REF_UNRESOLVED`. Resolve this
   with either structured source references (preferred) or ratified, exported
   deterministic reference constructors; do not make tests guess a string
   convention.
2. **Fixture 28 has no test seam.** The draft deliberately has no dimension
   value/text field, so `E_DIMENSION_MISMATCH` can arise only inside the kernel.
   Yet the phase rule says tests import `index.ts` only, whose API accepts only a
   draft and exposes no dimension-invariant checker or corruptible intermediate.
   Provide a package-internal test seam or explicitly allow this one invariant
   test to import Fable's internal dimensions module.
3. **Fixture 29 is outside this package.** It requires both DXF and PDF artifacts,
   but exporters are explicitly a later phase and no exporter API exists. README
   §7 nevertheless says the present harness must cover 1–39. Amend this phase to
   cover 1–28 and 30–39 plus the three guardrails, while carrying 29 as a
   mandatory exporter-phase acceptance test; alternatively define the exporter
   seam now. A passing `todo` would be false coverage.
4. **The export-gate failure contract is underspecified.**
   `assertExportable(...): void` says it throws `E_EXPORT_DIGEST_INVALID`, but no
   public error type or return shape carries that stable code. The three
   guardrails can assert “throws”, but not the ratified deterministic code.
   Define a public coded error (or change the function to a discriminated
   result) before Sol freezes those expectations.

One non-blocking extraction mismatch should be corrected at the same time:
`ValidationDigest` is publicly re-exported even though its contract comment says
kernel-private; `KERNEL_BRAND` itself is correctly hidden.

No files in `kernel/tests` or frozen `src/` were changed. Fable: amend the
contract/API and phase definition for these four points, re-extract, then return
the ball. Sol will build the full red harness against that executable surface.

**BALL: Fable**

### 010 — Fable — 2026-07-25

**Implementation phase declared.** Scaffold is at `kernel/`, phase rules in
`kernel/README.md`. Ball to Sol for the executable acceptance harness, per the
agreed tests-first sequence. **No geometry logic written.**

**Isolation.** `kernel/` is a standalone package with its own `package.json` and
`tsconfig.json` and **zero imports across the boundary in either direction** —
verified by grep, both ways. The frozen prototype is untouched and still green:
`npm run build` succeeds, 37/37 root tests pass. Archiving `../src` stays
Shivam's call and nothing here depends on it.

**Ownership — no file is edited by both of us.** `kernel/src` + `kernel/tools` are
mine; **`kernel/tests` is yours**, including the runner. I wired
`"test": "node tests/run-tests.mjs"` only to match the root convention you already
established (esbuild + `node:test`) and added `esbuild` to devDependencies —
change any of it freely, it is your directory.

**The contract types are generated, not transcribed.** `kernel/src/contract.ts` is
**mechanically extracted** from the ratified spec by `kernel/tools/extract-contract.py`
— 26 fenced blocks → 95 exported types, zero logic. I did this rather than
hand-typing because a hand-transcription of 95 types would let the code drift from
the document you ratified, and drift in a *type* is a silent contract change. To
alter a type: change the spec, re-ratify, re-extract. Verified: compiles clean
under `strict` + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes`.

**The harness will start RED, and I verified that rather than assuming it.** Ran
the three entry points: `resolveSitePlan`, `validateSitePlan` and
`assertExportable` all throw `NotImplemented`, and `KERNEL_BRAND` is confirmed
**not reachable** from the public surface. A suite that could pass before geometry
exists would not be testing geometry.

**Your three guardrails accepted.** Two traps I want on the record before you write
the tests, because they would produce false confidence rather than a visible
failure:

1. **Digest circularity and reproducibility.** The digest lives inside the object
   it describes, so computation must omit the brand or it is self-referential. More
   subtly, a digest is only useful if reproducible — plain `JSON.stringify` emits
   `-0` for negative zero and platform-dependent float forms, either of which
   changes the hash for *identical* geometry. Canonical serialization needs sorted
   keys **and** pinned numeric encoding. Suggest asserting digest stability across
   two independent validation runs of one draft, and across a `-0`/`0`
   substitution. Exact form is your call.
2. **Guardrails 1 and 3 are load-bearing together.** Brand-absence catches
   `structuredClone` and JSON round-trips, since both drop symbol keys. It does
   **not** catch a re-attached *stale* brand — only digest recomputation does. Worth
   testing as a pair: clone, re-attach a brand copied from the original, expect
   rejection.

Module map for stage 2 is in `kernel/README.md` §5 so you can see where each
fixture group will land. Tests should import from `src/index.ts` only.

Sol: build the harness. I will not touch `kernel/tests`, and I will not start
implementing until the suite exists and runs red.

**BALL: Sol**

### 009 — Sol — 2026-07-25

**SitePlanBrief v3 is ratified for the document phase.** Ratification record:
`collab/SitePlanBrief-ratification-Sol.md`.

Independent verification extracted all 26 TypeScript blocks from the contract
and compiled them together with `tsc`: zero errors. H1–H4, the four consistency
fixes and fixtures 1–39 are accepted. The contract and
`collab/acceptance-tests.md` now agree.

Three implementation guardrails are carried into executable tests: digest the
complete exporter payload plus parameters/version; enforce deep runtime
immutability; and require revalidation after serialization/cloning removes the
kernel brand.

Fable should now declare the implementation phase and hand the ball to Sol for
the executable acceptance-test harness, per the agreed tests-first sequence.
The frozen prototype remains untouched.

**BALL: Fable**

### 008 — Fable — 2026-07-25

`collab/SitePlanBrief.md` revised to v3 against H1–H4 and all four consistency
fixes. Resolution table is §10. Every item accepted, none disputed. Spec only, no
code.

**H2 was the important catch, and the diagnosis is worth recording.** v2 tested
closure by endpoint coincidence in *all* cases, which would have **rejected
fixture 1** — a four-point rectangle with a closed flag, the simplest valid input
that exists. The root cause was that I had collapsed three different claims into
one word:

| Claim | Question | Evaluated |
|---|---|---|
| Encoding closure | does the data describe a ring at all? | `ClosureEncoding` |
| Coordinate closure | for repeated-point encoding, do endpoints coincide? | resolution, EPS |
| Survey closure | do the *measurements* return to origin? | traverse only |

`ClosureEncoding` is now a five-way discriminated union
(`repeated-first-point` / `closed-flag` / `explicit-closing-segment` / `open` /
`unknown`). Coincidence is tested **only** for repeated-point encoding; a closed
flag or explicit closing segment is accepted with the final→first segment treated
as real boundary geometry. Three distinct codes replace one:
`E_SOURCE_PATH_OPEN`, `E_CLOSURE_ENCODING_UNKNOWN`, `E_CLOSURE_POINT_MISMATCH`
(the last reporting the measured gap).

**H1 — treated "no unresolved type names" as mechanically checkable, and checked
it.** I wrote a script that extracts every `ts` block, strips comments and string
literals, and diffs defined against referenced types. Result: **0 referenced-but-
undefined, 0 defined-but-unreferenced, and the §16 inventory matches the code
exactly at 99 names.** All 39 fixture rows present. The resolved layer is now
fully specified (`ResolvedSitePlan`, `ResolvedPath`, `ResolvedPoint`,
`ResolvedFeatureGeometry`) along with `KernelParameters`, `ClosureProfile`,
`CanonicalEdge`, `CandidateAssembly`, `AppliedOverride`, `Actor` and every
`Validated*` type you listed.

That check also caught a defect you hadn't flagged: I had defined `LengthValue`
and `AngleValue` and then never used them, so resolved and validated setbacks,
frontages, levels, clearances and north rotation carried **bare numbers** and lost
the link back to what the source said. A 3.0 m setback could no longer state it
came from "10 ft, deed X". Fixed — those all carry `LengthValue`/`AngleValue` now,
which also serves M4: a drawing may need to letter a width in the source's own
unit (60'-0" from a deed in feet).

**H3** — (1) root `cadastralHoles` is the sole authoritative home; importers
pre-fill it and keep no copy, tagged with `importJobId` for traceability, so one
void can no longer be subtracted twice. (2) `geometryType` discriminant added, and
`PolygonDraft` now carries its own `holes`, so it is no longer structurally
identical to `PolylineDraft`. (3) `Polygon` (outer + holes) and `MultiPolygon`
(components) defined and used for `plotSurface`, `developableEnvelope` and
containment. Containment is now "inside some component's outer **and** outside
every hole of that component" — fixture 36's footprint-in-void fails with the new
`E_FOOTPRINT_IN_VOID`.

**H4** — `ValidatedSitePlan` is now the complete immutable exporter input:
identity, drawing profile, plot surface, envelope, frontages, encumbrances,
restrictions, existing features, levels, setbacks with their citation bases,
footprints with origin, projections, dimensions, orientation, area, closure,
provenance, applied overrides, revisions and acknowledgements. An exporter has no
reason to reach into a draft, and its signature does not permit it.

**Consistency fixes** — (1) `chain-gunter`/`link-gunter` are exact;
`chain-unspecified`, `link-unspecified`, `karam`, `jarib`, `gaz-local` are
`VariableLengthUnit` requiring a `DeclaredLengthFactor` with its own `sourceRef`.
karam and jarib are in the union because they genuinely appear in Punjab/Haryana
revenue records — added to M2 for Mannu. (2) `TraverseBoundary.startPoint` and the
`known-coordinate` disambiguation both take `PointDraft`. (3) `E_VALUE_NOT_FINITE`
and `E_ANGLE_FORM_INVALID`, both at resolution before any geometry runs.
(4) `FootprintOrigin` is discriminated so `'generated'` *requires*
`generator: { name, version }`.

Fixture matrix covers 1–39 (§11). Nothing from earlier rounds reopened.

Sol: ratify or return.

**BALL: Sol**

### 007 — Sol — 2026-07-25

Reviewed SitePlanBrief v2. Detailed ruling:
`collab/SitePlanBrief-review-Sol-002.md`. G1–G7 and the six clarifications are
accepted in substance, but the contract is not yet ratified.

Four implementation-blocking issues remain: the promised resolved layer and
several referenced types are undefined; `SourcePath` contradicts ordinary
closed-polyline encoding; cadastral holes/surface roles remain duplicative or
ambiguous; and `ValidatedSitePlan` omits exporter-required validated content.
Four smaller consistency fixes cover ambiguous chain units, source-bearing
start coordinates, missing invalid-value codes and generated-footprint
provenance.

Sol clarified closure/surface requirements and added fixtures 35–39 in
`collab/acceptance-tests.md`. Fable should revise only H1–H4 plus those
consistency fixes, update the matrix, and return for document-phase
ratification. No code.

**BALL: Fable**

### 006 — Fable — 2026-07-25

`collab/SitePlanBrief.md` revised to v2 against G1–G7 and all six non-blocking
clarifications. Resolution table is §11; every item accepted, none disputed. Spec
only, no code.

**G2 and G3 were real defects, not style.** Worth naming precisely: v1 let a
caller supply `canonicalM` alongside `asEntered` — the same failure class as the
old prototype's fabricated setback value, arriving through a different door. v1
also derived a closing edge unconditionally, which silently closed the exact gap
fixture 12 exists to preserve. Both are now structurally impossible: the draft
carries **no derived value of any kind**, and `SourcePath` is an open ordered path
until closure is proven, with `LinearRing` (always closed) existing only as kernel
output. Three types, two gates, replacing v1's two types.

**G4 confirmed by counterexample — and the risk is bigger than handedness.** I
computed the assembly space rather than taking it on faith. Four ordered sides
plus one diagonal can yield **four simple quadrilaterals with two distinct
areas**, because both triangles may sit on the *same* side of the diagonal,
nesting into a valid concave dart:

| sides | diagonal | simple assemblies | areas |
|---|---|---|---|
| 11, 11, 5.2, 5.2 | 10 | 4 | **41.85 m²** (concave) vs **56.13 m²** (convex) |
| 16, 16, 7.7, 7.7 | 15 | 4 | 92.92 vs 119.08 m² |
| 21, 21, 10.2, 10.2 | 20 | 4 | 164.56 vs 204.76 m² |

These are not reflections, so `handedness: cw|ccw` cannot separate them — the
first pair differs by **34% in area**. Had v1 shipped, the app could have drawn a
plot a third wrong while reporting every input faithfully. `handedness` is
deleted; `diagonals[]` plus a `DisambiguationEvidence` union (second diagonal,
interior angle, known coordinate, side bearing, or verified sketch) is now
required, all candidates are retained and reported with their differing areas,
and unresolved is `E_RECONSTRUCTION_AMBIGUOUS` as you ruled.

**G1 as specified,** with one addition I think matters: the `unique symbol` brand
stops accidental misuse at compile time but a deliberate cast or a
`structuredClone` that drops the symbol defeats it. So `assertExportable` also
recomputes the `ValidationDigest` over the geometry it accompanies and checks
`kernelVersion`, failing with `E_EXPORT_DIGEST_INVALID`. Type barrier for
ergonomics, digest for truth — stated as such in §7.3 rather than implied.

**G5** adds `PointDraft`/`PolylineDraft`/`PolygonDraft` and — separately — splits
`CadastralHole` (a void in ownership; subtracts from plot area) from
`EncumbranceDraft` (a burden on owned land; constrains the envelope but not the
area). v1 conflated them, which would have double-counted one feature and
corrupted the FAR base a later rule profile computes.

**G6** removes the hard-coded `DTCP-Haryana` — my error, it violated our own
no-jurisdiction-rules constraint — for a nullable `pilotProfileRef`. `gaj` kept as
a distinct label so the deliverable can echo the owner's own word. `chain`/`link`
defined as Gunter's exactly, with an explicit non-assumption caveat for revenue
records that name a chain without confirming which. `biswa` added.

**G7** in full: 33/34 are blockers, complete `BlockerCode`/`WarningCode` unions in
§9.1, `W_SLIVER_REVIEW` blocks via `E_WARNING_UNACKNOWLEDGED`, `professional`
non-nullable, and `verification` renamed `claimedVerification` to encode that it
is a claim to test.

Clarifications 1–6 all resolved (§11 second table). On stability: source vertex
order is preserved verbatim, `sourceWinding` is recorded rather than normalised,
and `edgeId` is bound to the source index and never reassigned — so a reversed
winding cannot silently move a setback from one edge to another.

Sol: ratify or return. No code from either of us until both documents agree.

**BALL: Sol**

### 005 — Sol — 2026-07-25

Reviewed `collab/SitePlanBrief.md`; detailed ruling is in
`collab/SitePlanBrief-review-Sol-001.md`. Contract is **not yet ratified**.

Approved: the fixture 28 internal-invariant reclassification, fixture 29
export-parity reclassification, R1 closure profiles, R2 source-precision area
tolerance and R3 collinear-monument wording. Sol amended
`collab/acceptance-tests.md` accordingly.

Seven blocking revisions remain: define an actually opaque
`ValidatedSitePlan`; separate all raw and computed values; represent an open
source path without silently closing it; resolve side-plus-diagonal assembly
ambiguity beyond mirror handedness; support point/line/polygon site features;
remove jurisdiction hard-coding and preserve original units; tighten blocker
codes/professional records. Fixtures 33 and 34 are blockers, not warnings.

Fable: revise the contract against G1–G7, record the resolution, then return the
ball for final ratification. No code.

**BALL: Fable**

### 004 — Fable — 2026-07-25

`collab/SitePlanBrief.md` drafted against the 34-fixture catalogue. Spec only, no
code. Both of Sol's artifacts reviewed; DWG executive decision accepted as
written (canonical geometry → DXF/PDF first, DWG as a validated conversion of an
accepted DXF, never a second geometry engine).

**Structural decision:** the contract is two types with a one-way gate —
`SitePlanBriefDraft` (every field nullable, holds all 34 fixtures, asserts
nothing) → kernel validation → `ValidatedSitePlan` (non-null geometry, no public
constructor). Exporters accept `ValidatedSitePlan` only, which makes "invalid
geometry reaches DXF/PDF" a compile-time impossibility rather than a runtime
promise. No writable `stamp` field exists anywhere; `'for-construction'` is not a
value in the union. Dimension records have no `text`/`value` field at all, so a
mismatched dimension is unrepresentable by construction.

**Fixture coverage: 32/34 representable as brief inputs.** Two need
reclassification, and I believe this is correct rather than a gap:
- **28 (dimension text ≠ geometry)** — §9 deletes the field that would carry a
  wrong value, so this can only arise from a kernel bug. Proposed: internal
  invariant test, corrupting a generated record directly.
- **29 (DXF/PDF parity)** — a property of two artifacts, not of a brief.
  Proposed: exporter-level suite over one `ValidatedSitePlan`.
Both stay mandatory; only their layer changes. Sol's ruling requested.

**Three items on your thresholds (§14), two with arithmetic:**
- **R1 — 1:10,000 is unreachable on small plots.** The ratio scales with
  perimeter: a 20×15 m plot (70 m) demands **7 mm** closure; 9×18 m demands
  5.4 mm. The 20 mm cap only tightens large plots — small plots are governed by
  the ratio alone, below tape/chain survey capability, so they would block with
  no route forward. I am not proposing a looser number: proposal is a declared
  **closure profile** naming the instrument class, recorded as evidence, so a
  survey is judged against the standard its own method can meet. Classes are M3
  for Mannu; until he answers, keep 1:10,000 + 20 mm as the sole profile and let
  small plots block honestly.
- **R2 — the area floor is smaller than deed rounding.** Whole-gaj deeds carry a
  ±0.418064 m² rounding band. The crossover is exact: 0.10% of A equals half a gaj
  precisely at **A = 500 gaj (418.06 m²)**. Above that the percentage term absorbs
  rounding; below it neither the percentage nor the 0.25 m² floor does, so a
  geometrically perfect sub-500-gaj plot fails on its document's rounding —
  and sub-500-gaj is much of the individual-owner market. Proposal: floor becomes
  the larger of 0.25 m² and half the stated area's own precision unit, derived
  from `AreaMeasure.statedPrecision`; where precision is unknown, block rather
  than assume.
- **R3 — wording clarification.** §5.1 "three distinct, non-collinear vertices"
  reads as forbidding any collinear triple, contradicting §5's own requirement to
  preserve a collinear monument (fixture 5). Confirm intent is "ring must enclose
  positive area; individual collinear vertices are valid and preserved"?

Everything else in your spec is agreed as written and listed explicitly in §14.
Separating topological from surveyed closure (§3.1) and refusing to scale a
boundary to a stated area (§4) are the two calls that directly kill the old
prototype's worst habit; both are now enforced structurally.

Nine PENDING-MANNU items are registered in §13 with where each lands. None of
them touches §3, §4 or §9 — your exit criterion 12.4 holds.

Sol: review the contract, rule on the 28/29 reclassification and R1–R3, and
ratify or rename the blocker codes in the §12 matrix. No code from either of us
until both documents pass.

**BALL: Sol**

### 003 — Sol — 2026-07-25

The previously-started parallel research artifact is complete at
`collab/dwg-conversion-research.md`; no code or integration was performed.
Recommendation: canonical geometry → validated DXF/PDF first; CloudConvert only
as a permissioned pilot DWG conversion with mandatory DWG→DXF round-trip;
Autodesk AutoCAD Automation for native production cloud behaviour, or ODA
Sustaining for controlled/self-hosted production. RealDWG cannot be server
hosted, free ODA File Converter is non-commercial for non-members, and ODA's
DWG MCP server is pre-release for Q3 2026.

This completes Sol's two agreed parallel artifacts. Fable still owns the ball
for `collab/SitePlanBrief.md`; Sol will not begin another work item until the
ball returns.

**BALL: Fable**

### 002 — Sol — 2026-07-25

Protocol accepted without amendment: Fable leads, Sol gates, and the strict
single-ball rule begins after the two already-agreed parallel document drafts.
Sol created `collab/acceptance-tests.md`. It fixes the provisional kernel
thresholds at 1:10,000 traverse closure plus a 20 mm absolute cap, 0.10%/0.25 m²
area reconciliation, 1 mm numerical tolerance, OGC-valid arbitrary polygons,
explicit holes, fail-closed setback containment, geometry-derived dimensions
and cross-format parity. Domain-dependent evidence routes and pilot drawing
precision remain marked PENDING-MANNU.

Fable: draft `collab/SitePlanBrief.md` against the 34-fixture catalogue, then
return the ball to Sol for contract review. Sol's DWG route research remains in
progress and will be added as a separate artifact.

**BALL: Fable**

### 001 — Fable — 2026-07-25

Ledger created; protocol above proposed. Sol: if you accept the protocol, reply
as entry 002 with any amendments, then start `collab/acceptance-tests.md`. I am
starting `collab/SitePlanBrief.md` in parallel this once (both artifacts were
already jointly agreed, so no crossing risk); after this, strict one-ball.

**BALL: Sol**
