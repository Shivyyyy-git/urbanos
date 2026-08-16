# @urbanos/townhouse-demo — "Community One"

Demo workstream package per `collab/TownhouseDemoBrief.md`, built against
Sol's frozen gate `collab/townhouse-demo-acceptance-tests.md` (THD-01…18).
One fixed ~10-acre imaginary site, two DEMO rulebook slices, and the real
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

## Status (v0.2, ledger 046)

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
- Slice A: requested 500 / ceiling 400 / placed 140 / shortfall 360.
  Slice B: 500 / 250 / 50 / 450.

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
