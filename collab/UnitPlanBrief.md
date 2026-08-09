# UnitPlanBrief — Feature 2: 2BHK unit-plan module (v1 draft)

**Owner:** Fable (draft) — Sol gates acceptance
**Status:** DRAFT v1 — not ratified. Spec only, no code.
**Decision authority:** Shivam ruled 2026-08-08: "go ahead with the 2BHK first."
**Domain authority:** Mannu — all drawing-practice and rule questions route to him
(markers `M-U1`…`M-U5` below).

---

## 1. Decision record (2026-08-08)

Shivam locked Phase 1 as **simple input → 2D output**. Mannu (via WhatsApp,
2026-08-08) asked for a simple 2BHK apartment layout as the first target,
supplying:

- `reference/mannu-2026-08-08/INPUTS-UrbanOS.docx` — a 17-stage project intake
  spec (site/master-plan scale) plus a database-vs-user-input split and a
  four-layer architecture proposal. **This document is site-scale and is NOT
  the intake for this feature**; it is preserved as the spec seed for the
  site-scale workstream.
- `reference/mannu-2026-08-08/Spaze-Privy-AT4-brochure.pdf` and
  `Privy-AT4-brochure.pdf` — Spaze Privy AT4 (Sector 84, Gurgaon) brochures
  containing dimensioned 2BHK / 3BHK unit plans and the society site plan.

**Named scope tension, resolved by Shivam:** the 2BHK is *unit/architecture
scale*; the existing kernel, Feature 1, and the INPUTS doc are *site/master-plan
scale*. The 2BHK proceeds first as the pipeline trainer. The site-scale
compliance product remains the business wedge; nothing in this feature may
compromise the kernel's site-scale contract.

**AutoCAD ruling reaffirmed** (per `collab/dwg-conversion-research.md`, no
change): the kernel is the engine, DXF/PDF are the outputs, AutoCAD is a
viewer/delivery format only. No AutoCAD license, plugin, or cloud automation in
this feature. DWG remains permission/licence-gated behind the documented
round-trip gate.

## 2. What Feature 2 is

A **unit-plan module** alongside the existing site-plan kernel: validated
structured input describing one apartment unit → canonical planar geometry
(metres) → deterministic dimensioned **DXF R12 + vector PDF** from one drawing
model, following the kernel's existing discipline: fail-closed validation,
deep-frozen validated plan, digest branding, two-stamp honesty.

### v0 — parametric replica (this workstream)

Recreate the **Privy AT4 2BHK** as a *parameterized template*: walls, door and
window openings, room labels, dimension strings, balconies. Input is the room
schedule (§4) plus declared assumptions; output is a dimensioned sheet Mannu
can redline. His redlines become the acceptance fixtures for v1.

### v1 — rule-driven variants (next workstream, not this one)

Mannu's rulebook (adjacency, minimum sizes per NBC, plumbing-shaft clustering,
circulation, light/ventilation) encoded as constraints; generator proposes
layouts; kernel refuses non-compliant geometry. **Out of scope until v0 is
accepted.**

## 3. Honesty constraints specific to this feature

1. **The brochure is marketing, not survey.** Its own disclaimer says all
   plans and dimensions are "indicative". The v0 output is therefore a
   **drafting exercise from declared inputs**, not a reproduction of an
   approved drawing. Stamp: `Research Draft — Not for Construction` (the
   `Ready for Professional Review` stamp requires Mannu-verified inputs).
2. **Wall thicknesses are not derivable from the brochure.** Listed dimensions
   are clear room dimensions; the geometry cannot close without assumed wall
   thicknesses. Assumptions must be **declared parameters printed on the
   sheet** (e.g. "walls assumed 230 mm external / 115 mm internal — M-U4"),
   never silent defaults. This is the same rule that bans default setbacks in
   the site kernel.
3. **Super area cannot validate geometry.** 1465 sq ft includes common-area
   loading with an undisclosed factor. The sheet may print carpet-area math
   derived from geometry; it must not claim to reconcile with super area.
4. **No fabricated dimensions.** Every dimension string derives from canonical
   geometry, per the existing kernel invariant (fixture 28 class).

## 4. v0 fixture source — Privy AT4 2BHK room schedule

Read from the brochure unit plan (super area 1465.0 sq ft; brochure states
1 m = 3.2808 ft). Feet-inches as printed; conversion to canonical metres is
kernel work with declared unit factors.

| Room | Printed size |
|---|---|
| Master Bedroom | 12'0" × 13'4" |
| Toilet (master) | 6'6" × 7'8" |
| Toilet 2 | 7'6" × 6'0" |
| Bedroom 2 | 10'9" × 11'6" |
| Study | 7'0" × 10'9" |
| Drawing/Dining | 19'0" × 13'4" |
| Entrance Lobby | 7'3" × 5'2" |
| Kitchen | 11'0" × 7'5" |
| Balconies ×3 (master BR, living, BR-2) | 6'0" wide |

Adjacency as drawn: entrance lobby → drawing/dining (kitchen adjacent to
lobby/dining); master bedroom off living with attached toilet + balcony;
bedroom 2 with adjacent toilet 2 and balcony; study off living. To be traced
precisely during template construction and confirmed against the brochure page.

## 5. Proposed input surface (for Sol's review — not ratified)

`UnitPlanBriefDraft`, mirroring the site kernel's draft philosophy (every field
explicit, no derived values, fail-closed resolution):

- unit identity: name, unit type label (free text — no typology enum yet)
- room list: id, label, clear width/depth as `LengthValue` (source-unit
  preserving), optional notes
- adjacency/topology declarations: which rooms connect, door positions as
  edge references (exact reference shape is Sol's call — the site kernel's
  route-relative reference lesson from ledger 013/014 applies here)
- openings: doors (width, swing), windows (width) — positions by edge + offset
- declared assumptions: wall thicknesses, slab line conventions — each with an
  `assumption` provenance record that renders on the sheet
- sheet request: paper size, scale, dimension style (defaults from M-U1)

Resolution/validation must reject: non-closing room graphs, overlapping rooms,
doors on non-shared edges, unstated wall thickness, dimension requests to
non-existent geometry.

## 6. Non-goals for v0

- No ML/generative layout ("teach it from brochures/videos" is rejected as a
  method; brochures are templates and test fixtures, not training data)
- No automatic layout solving (that is v1, gated on the M-U2 rulebook)
- No AutoCAD integration, no DWG output
- No bye-law/NBC compliance checking (v1; needs M-U2)
- No site-plan interaction (unit cluster placement on site is a later feature)
- No change to the site kernel's public contract or its 113-test suite

## 7. PENDING-MANNU register

| # | Question | Blocks |
|---|---|---|
| M-U1 | Drawing standard for an acceptable unit plan: layer names, dimension style, lettering, north arrow, title block content, scale notation — what would make a professional NOT reject the sheet on sight | v0 sheet composition |
| M-U2 | The rulebook: adjacency rules, NBC/bye-law minimum room sizes, shaft/plumbing clustering, circulation minimums he would use to judge a layout | v1 only |
| M-U3 | 2–3 more brochures with dimensioned unit plans (ideally with cluster plans) for the template library | v1 breadth; v0 proceeds without |
| M-U4 | Standard wall thickness conventions for Gurgaon group housing (assumed 230/115 mm until answered) | v0 assumption values |
| M-U5 | Redline pass on the v0 output — his corrections become v1 acceptance fixtures | v0 acceptance |

## 8. Process (per protocol)

1. Sol reviews this brief and drafts `collab/unit-plan-acceptance-tests.md`
   (red harness spec: fixtures for resolution failures, geometry invariants,
   dimension integrity, export parity — reusing the DG-1 parity machinery).
2. Mutual review; ratification entry in the ledger.
3. Only then: implementation, tests-first, same mutation-verification bar as
   Feature 1.
