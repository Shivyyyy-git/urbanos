# TownhouseDemoBrief — "Community One" (v1)

**Owner:** Fable (draft) — Shivam ruled the demo direction 2026-08-16 (goal chat).
**Status:** Brief for the demo workstream. Demo values only; nothing here is a real rule.
**Parent:** `collab/BusinessThesis.md` v1.1 (Stage 1, shown at customer-#2 scale) · `collab/Stage1Spec.md` (the engine contract this demo must not violate).

## 1. Purpose

One artifact with two jobs:

1. **The VC/demo story:** a client "wants 500 townhouses on ~10 acres." UrbanOS shows the Base live — a beautiful 2D community map (roads, townhouse rows, green areas, club/pool) plus the compliance list and envelope numbers. Then the punchline: *"these rules are illustrative — the engine is real; our planner is collecting the real Gurgaon rulebook from government offices now."* Same engine, swap the rulebook: the plug-and-play claim, proven on stage.
2. **The engine skeleton:** the demo runs on the real pipeline (rulebook store → envelope → layout → outputs), so when Mannu's data lands, the demo becomes product by data-swap, not rebuild.

The paying wedge remains the plot-scale builder (thesis, unchanged). The demo is townhouse-scale because that is what impresses; the engine is shared across scales.

## 2. Scope — fixed, small, beautiful

- **One imaginary site:** ~10-acre rectangle (exact dimensions declared in the fixture), road access on one side, north declared. No general site-shape solver.
- **One program:** townhouse community — internal roads, rows of identical townhouse plots/blocks, green/open areas, one club + pool parcel, entry gate. Unit *interiors* excluded (Stage 5).
- **One DEMO rulebook slice** — `DEMO-SLICE (illustrative)`: coverage %, density/DU cap, height, setbacks, internal road widths, open-space %, parking, amenity share. Values may be inspired by public documents but are all marked `demo — illustrative`, never `verified`. The stamp engine therefore locks every output at **"Research Draft — Not for Construction · DEMO."**
- **Outputs, from one canonical geometry model:**
  1. Technical sheet — dimensioned DXF R12 + vector PDF (kernel discipline).
  2. **Presentation map** — colored 2D plan (green = green, water = blue, roads, legend, north arrow, scale bar), print-quality.
  3. Envelope report — the Stage1Spec report shape, DEMO-watermarked, with the citation column pointing at demo entries (the *mechanism* of citation is demonstrated even though values are demo).

## 3. Guardrails (non-negotiable)

1. **DEMO watermark on every page and every file name.** Claims discipline applies fully — illustrative numbers are never presented as real.
2. **Real pipeline only.** No hand-drawn map, no hard-coded numbers in the engine; everything flows from the demo rulebook entries. If a value is needed and has no entry, the engine refuses — same as production.
3. **Deterministic:** same fixture + same demo rulebook digest ⇒ byte-identical outputs.
4. **Timeboxed.** Demo v0 = the fixed fixture end-to-end. Beauty-polish rounds are separate, capped, and never touch the engine.

## 4. Non-goals

General land shapes · unit interiors · real rule values · financial/pricing content · 3D · DWG · any claim of compliance with an actual jurisdiction.

## 5. Acceptance (checker gates via ledger)

1. Fixture in, full package out, zero manual steps.
2. Watermark present on every artifact (mutation test: absence fails the build).
3. Every number in the report traces to a demo rulebook entry id; removing an entry blocks the run naming the slot.
4. Stamp is locked at Research Draft + DEMO; no path to "Prepared for Professional Review" while any cited entry is unverified.
5. DXF parses 0-error in an independent parser; presentation map and technical sheet are provably the same geometry (parity check).
6. The rulebook-swap moment works: pointing the same engine at a second (still-demo) slice changes the layout and the report accordingly — this is the pitch's live moment, so it is a test.

## 6. Process

Built in the "UrbanOS — Townhouse Demo" workstream chat. OpenAI verifier agent (checker seat, ledger protocol) writes acceptance tests against §5 before code, reviews after, red-teams the demo script ("which question breaks this in a meeting?"). Decisions escalate to the goal chat. GitHub repos supplied by Shivam get a license + quality pass before anything is reused; findings recorded in the research memo.
