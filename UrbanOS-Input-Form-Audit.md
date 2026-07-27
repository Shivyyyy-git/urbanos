# UrbanOS — Input Form Audit

**Goal:** one perfect pipeline — input form → construction-usable 2D site plan (DXF/PDF).
**Prepared by:** Fable (Claude) · **Reviewed with:** Sol · **Date:** 25 July 2026
**Scores today:** input form **4/10** · drawing output **3/10** for construction use.
**Status:** audit only — no code changed. Blocked on four questions for Shivam (end of document).

---

## Part 1 — What the input form needs to become better

### 1.1 The core problem

The current form is a **finance/feasibility intake**, not a **drawing intake**. Of its 14 fields, only 5 affect the drawing at all (plot area, width/depth, development type, jurisdiction, sanctioned FAR). Three *required* fields — budget, land ownership, optimisation priority — have zero effect on geometry, yet the form will not let you generate a drawing without a budget. A construction drawing should never be gated behind a budget figure.

### 1.2 What each current field actually does

| Field | Required? | Effect on the drawing |
|---|---|---|
| Project name | Yes | Title block text and filename only |
| Jurisdiction (6 options) | Yes | Picks the bylaw table: setback distances, FAR/coverage caps, parking rate |
| Master-plan land use | Yes | Permissibility check + title block text. Does **not** constrain the layout |
| Development type | Yes | Picks the layout generator branch and density caps |
| Plot area (acres/sq m) | Yes | Sole geometry source when no dimensions given — a rectangle is **invented** at a 1.4:1 ratio |
| Plot width / depth (m) | Optional | Both given → exact rectangle. One given → other side derived from area |
| Abutting road width (m) | Yes | High-rise permission and fire check only. The road is **never drawn** |
| Sanctioned FAR / FSI | Optional | Raises the massing ceiling; noted in title block |
| GPS pin | Optional | Title-block text only — no geometric effect |
| Budget (₹ crore) | Yes | **Nothing** — feasibility only, yet it gates the drawing |
| Land ownership | Yes | **Nothing** — feasibility cost line only |
| Optimisation priority | Yes | Changes the *drawing* based on a marketing preference (ROI/balanced/green), not a site fact |
| Target units | Optional | Unit-mix table only, not the drawing |
| Notes | Optional | Stored; no effect |

### 1.3 What is missing entirely

A drawing a contractor can set out from starts with a **survey**, and the form cannot describe one.

**Boundary geometry (most critical).**
- All four (or more) side lengths **plus at least one diagonal**, or corner coordinates/bearings from a survey. Today the plot is always assumed to be a perfect rectangle — many real Dwarka/Gurugram plots are not.
- North angle / plot orientation. Today north is hardcoded as "up," so the north arrow is decorative.
- Which edge(s) face a road, with the road width per edge. Today road position is not even asked.
- Local units: **square yards / gaj**, the standard in NCR land dealings. Today only acres and sq m exist.

**Plot identity (what makes the drawing *this* plot).**
- Sector / pocket / plot number, khasra number, scheme or licence number. Today "project name" is free text.

**Site context (what surrounds and sits on the land).**
- What adjoins each boundary (road, neighbouring plot, park, drain).
- Existing features: structures, trees, poles, wells, HT lines, drains.
- Levels: at least a benchmark and general plot level.
- Easements / right-of-way restrictions.

**Drawing intent (what the output must be).**
- Purpose: site plan vs authority-submission drawing vs construction setting-out drawing — each has different dimensioning standards.
- Whether the building footprint is user-specified or generated.
- Required output formats (DWG / DXF / PDF).

### 1.4 The standard to aim at

The form is "perfect" when it captures everything found on an accepted Dwarka (DDA) or Gurugram (DTCP) site plan and nothing else: verified plot geometry in, faithful drawing out — with no field the drawing does not use, and no drawing element that did not come from a field. Codex/Sol is verifying the official DDA/DTCP requirements; this list merges with that research to form the agreed specification.

---

## Part 2 — Hidden assumptions in the current map generator

Each of these is invisible to the user and each one, on its own, makes the output unsafe to build from.

1. **The plot is a perfect axis-aligned rectangle.** No irregular shapes, no bearings, no corner coordinates. If your plot is not rectangular, the drawing is of a different plot.

2. **North always points up.** Hardcoded. The north arrow does not reflect the real orientation of the land.

3. **The road is always on one assumed edge — and is never drawn.** The generator treats the top edge as the frontage internally. The user cannot say which side the road is on, and no road appears in the output.

4. **Setbacks are drawn but not enforced.** The most serious defect. Buildings are placed at 0 m from the boundary while the rule-screening reports setbacks as passing — because the screening reports a fabricated value (110% of requirement) instead of measuring the actual geometry. Measured across test cases: required 9 m front / 6 m side / 6 m rear; actual building line **0.0 m on all sides**; screen says "pass."

5. **The layout depends on a marketing choice, not the site.** The same plot produces three different drawings depending on ROI/balanced/green preference. Internal road widths (7.5–8 m) are derived from plot size, not from any standard or any input.

6. **All geometry snaps to 0.5 m and labels round further.** Acceptable for a concept sketch; unacceptable for setting out.

7. **Building height is floors × 3.1 m, flat.** No plinth, stilt, or basement input exists anywhere.

8. **The site is assumed empty and flat.** No existing structures, trees, services, levels, or benchmarks — nothing a contractor actually pegs from.

9. **What IS trustworthy:** the file container. The DXF/PDF writers are structurally valid, deterministic, true to scale, and honestly labelled (verified by parsing and measuring the files). The problem is not the files — it is the geometry inside them.

---

## Part 3 — Agreed division of work (Fable ↔ Sol/Codex)

- **Fable (Claude):** form experience and integration — survey-grade boundary entry (sides + diagonal, orientation, road edges, gaj/sq yd), geometry pipeline, DXF/PDF writers.
- **Sol/Codex:** official DDA/DTCP requirements, the input-to-drawing standard, CAD/MCP workflow research, geometric validation tests, acceptance checklist. Fail-closed gating stays: unverified input is labelled, never assumed.
- **Contract first:** one shared `SitePlanBrief` specification agreed by both before any code is written. Each reviews the other's work.
- **Sequencing:** Sol's geometric invariant tests (no building inside setback, boundary closes, dimensions sum) are written **before** Fable refactors the layout engine, so the fix is built to the tests.

---

## Part 4 — Four questions blocking the work (for Shivam)

1. **Which area first** — Dwarka Sub-City (DDA), Dwarka Expressway/Gurugram (DTCP), or both?
2. **Which drawing** — site plan, authority-submission drawing, or construction setting-out drawing?
3. **What documents already exist** for a typical plot you'd input — survey report, sale deed dimensions, sanctioned plan, anything with measured boundaries? One real example (even a photo) sets the standard.
4. **Which output formats are required** — DWG, DXF, PDF, or all three? (True DWG needs a conversion step outside the browser; this answer decides the architecture.)

*Until these are answered, both agents build nothing.*
