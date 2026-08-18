# @urbanos/townhouse-demo — "Community One"

Demo workstream package per `collab/TownhouseDemoBrief.md`, built against
Sol's frozen gate `collab/townhouse-demo-acceptance-tests.md` (THD-01…18).
One fixed 50-acre imaginary site, two DEMO rulebook slices, and the real
pipeline: rulebook entries → envelope → layout → outputs. **Every value is
illustrative; every artifact is DEMO-watermarked; the stamp is locked at
"Research Draft — Not for Construction · DEMO"; actionability is type-locked
at `sanctionable-today: unknown`.**

## Clean setup

```
npm install
npm test
```

`npm test` bootstraps the pinned independent DXF verifier on first run
(project-local `.venv` with `ezdxf==1.4.4`; needs `python3` on PATH and
network on the first run only — the same footing as `npm install`). No
ambient site-packages are used.

## Commands

Generate the full package (non-interactive, deterministic, self-gating; also
atomically regenerates the one-click `preview.DEMO.html` at this package root):

```
node tools/generate-demo.mjs generate --slice a --out ../output/townhouse-demo/slice-a
node tools/generate-demo.mjs generate --slice b --out ../output/townhouse-demo/slice-b
```

Re-run the gate on a shipped package (add `--with-preview` to also verify the
one-click preview against that package) · live-swap stage diff:

```
node tools/generate-demo.mjs verify <dir> --with-preview
node tools/generate-demo.mjs diff <dirA> <dirB>
```

Acceptance harness (THD-01…18 with coverage preflight) and typecheck:

```
npm test
npm run typecheck
```

## Status (GOD-LEVEL MAP v6, ledger 065)

- **Parking is a stated requirement, not a drawn layout.** Sol's 064 showed
  the canonical bays had no access topology (66 facing away from their lane,
  103 unreachable), 594 were hidden under decor, and their dimensions were
  engine literals with no entry behind them. Route (ii) taken: no parking
  geometry is emitted; every surface reads
  `PARKING <N> ECS REQUIRED AT <rate>/HOME [<entry>] — PARKING STRATEGY NOT
  YET DEMONSTRATED`. The `parking` class and layer remain defined for the day
  a real parking standard arrives as a rulebook entry.
- Reports back to three pages each (ten-page package).
- Preview re-verified in-browser at 1280x720: 0 px overflow, three stat rows,
  zero inset bays, no "indicated on plan" text.

## Earlier status (GOD-LEVEL MAP v5, ledger 063)

- **Parking is canonical geometry**: a `parking` feature class on its own
  layer, parity-checked like any other land use. A draws 1,000 features
  (2/home under the stilt, inside the plot); B draws 339 (226 on-plot + 113
  visitor bays whose land is carved out of the court greens, so nothing is
  counted as both parking and open space). If the count ever fails to match
  the requirement, every surface says "parking strategy not yet demonstrated".
- **Preview verified in-browser at 1280x720**: 0 px horizontal overflow, aside
  scrollWidth = clientWidth = 285, six hero stats on three distinct rows.
- Presentation restraint: junction pads removed, arrival island reduced,
  promenade connected between plaza and park edge, larger club.

## Earlier status (GOD-LEVEL MAP v4, ledger 061)

- **Parking derives from the active slice**: `floor(rate)` spaces under each
  home's stilt plus shared visitor bays for the fractional remainder, so the
  drawn total equals the required total on both slices (A 1,000 = 1,000;
  B 226 + 113 shared = 339). No hard-coded per-home count anywhere.
- Bays are drawn **inside** the house mass (open ground floor); the PDF and
  browser insets show the same arrangement with a dimensioned, slice-derived
  caption.
- Preview hero metrics are three rows of two (PDF hierarchy) with a 300 px
  rail — the overflow source at 1280x720 is removed.
- Curvature: softened loop-corner fillets, arrival roundabout with planted
  island, curved park promenade, circular lawns/plaza, rounded pool. Road
  centrelines remain axis-aligned (rect canonical model).

## Earlier status (GOD-LEVEL MAP v3, ledger 056)

- Sol's 055 P0/P1/P2 blockers addressed, design-and-copy only: **two car
  spaces per home are drawn** (tandem stilt bays) and every surface tells the
  same parking story — "1000 ECS required · 2/home, indicated on plan,
  illustrative, not a measured feature"; the **one-click preview now carries
  the same poster hierarchy as the PDF** (identity, hero numbers, legend,
  typical-plot inset, single honesty footer, digests demoted to a strip);
  the visual layer landed (roof ridges, massing shadows, footways beside
  every lane, boulevard centre-line markings, softened turning heads,
  planting depth); neighbourhoods are named on the poster and listed in the
  preview.
- Slice A: 500 of 500 placed, 35.4% green. Slice B: 226 placed, 274
  shortfall.

## Earlier status (GOD-LEVEL MAP v2, ledger 054)

- Sol's v0.4 verifier repair is **accepted and closed** (ledger 053 Part 1);
  the correctness surface is frozen and untouched by this pass.
- Design repair against 053's seven ranked blockers: no residual voids (every
  unused square metre is a mews link, pocket park, or landscaped court);
  cul-de-sac hierarchy (boulevard → quarter loops → quiet lanes → turning
  heads); composed amenity heart (forecourt, club, pool deck, great lawns,
  play court, promenade); brochure rendering (house masses, front gardens,
  stilt-parking bays, planting clusters, paper); parking told on the sheet
  plus a typical-plot inset; poster composition with project identity, hero
  numbers, integrated legend and one honesty footer.
- Slice A: 500 of 500 placed (program-bound). Slice B: 226 placed, 274
  shortfall — the swap now carries the negative verdict.

## Earlier status (v0.4 + GOD-LEVEL MAP v1, ledger 052)

- 050's rendered-semantics blockers root-repaired (complete browser token
  surface; expected generated tree with palette; positive CSS property
  allowlist; exclusive sanctionability claim on every surface); Sol's cases
  12–15 green as frozen.
- GOD-LEVEL MAP v1 (ledger 049): Community One resized to 460×440 m (50.01
  acres); boulevard with tree-lined median, perimeter green ring, central
  park with club+pool centerpiece, four quarters with alternating row
  orientation and premium-first fill. Slice A places all 500 requested
  (program-bound, measured); slice B places 226 with a cited shortfall.
  Sheets on A1 at 1:1000 with gate-verified tree decor.

## Earlier status (v0.3, ledger 048)

- 18/18 THD gates green including Sol's frozen rendered-semantics cases
  (047): the preview gate judges what a browser renders, not source bytes —
  browser-decoded fetch scanning, a positive element/attribute allowlist
  (no transform/style/visibility construct on rendered features),
  comment-stripped content checks, and exact-rendered-node verification of
  the actionability reason. Drills 9–11 in the mutation log show each bypass
  red when reintroduced.

## Earlier status (v0.2, ledger 046)

- 18/18 THD gates green from the documented clean setup; all eight §5
  mutations killed and reverted (`collab/townhouse-demo-v0-mutation-log.md`).
- Ledger 045 blockers repaired, with Sol's independent bypass mutants baked
  into THD-17/18 as permanent hostile cases: preview self-containment is an
  allowlist-level offline gate (any fetch-capable construct fails, relative
  or remote); preview and cross-artifact parity are vertex-for-vertex ring
  comparisons (count, order, position, degeneracy — never bounding boxes);
  the full computed actionability object (status + verbatim reason) is gated
  on every surface; the watermark sits over the east green polygon crossing
  no annotation or club/pool geometry; reports fit three balanced pages with
  no orphaned headings.
- Earlier repairs standing: pinned bootstrapped verifier; EXACT locked stamp
  round-trips through the DXF (cp1252 + `$DWGCODEPAGE ANSI_1252`, ezdxf
  verified); translucent watermark (ExtGState 0.34); UTF-16BE PDF metadata.
- Numbers in this historical section refer to the **superseded 10-acre
  fixture** (before ledger 049 resized the site): slice A 500/400/140/360,
  slice B 500/250/50/450. They describe no current artifact.

## House rules

1. **Ownership:** `src/` + `tools/` are Fable's. `tests/` implements Sol's
   frozen contract; Sol owns acceptance and may rewrite or extend the harness
   — a Fable-authored test is never the last word on Fable's code.
2. **Isolation:** standalone package; zero imports across `../kernel`,
   `../unitplan`, or the frozen prototype `../src`, in either direction.
   (DXF/PDF/sha256 writers are adapted copies, per the unitplan precedent.)
3. **No values in engine code.** Rule values live only in `src/data/` entries;
   the fixed site in `src/data/community-one-site.ts`. A needed value with no
   entry ⇒ named refusal. Layout *strategy* dimensions derive from rule
   values, so runtime rule changes move measured geometry (THD-08).
4. **Determinism:** no timestamps, no randomness, no compression; same
   fixture + rulebook digest ⇒ byte-identical artifacts (THD-04/15/17).

## Known deviations (recorded for Sol, ledger 042)

- THD-03 "every page renders": the harness proves structural parse + text ops
  per page; raster inspection (page 1 via sips) is manual — full render
  inspection stays in Sol's §6 pass. No raster toolchain was added.
- The automated watermark-visibility check tests size and fill colour, not
  occlusion (mutation-log finding); occlusion is prevented by paint order and
  judged in the §6 visual pass.
