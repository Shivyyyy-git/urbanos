# @urbanos/townhouse-demo — "Community One"

Demo workstream package per `collab/TownhouseDemoBrief.md`, built against
Sol's frozen gate `collab/townhouse-demo-acceptance-tests.md` (THD-01…16).
One fixed ~10-acre imaginary site, two DEMO rulebook slices, and the real
pipeline: rulebook entries → envelope → layout → outputs. **Every value is
illustrative; every artifact is DEMO-watermarked; the stamp is locked at
"Research Draft — Not for Construction · DEMO".**

## Commands

Generate the full package (non-interactive, deterministic, gate-checked):

```
node tools/generate-demo.mjs generate --slice a --out ../output/townhouse-demo/slice-a
node tools/generate-demo.mjs generate --slice b --out ../output/townhouse-demo/slice-b
```

Re-run the package gate on a directory · live-swap stage diff:

```
node tools/generate-demo.mjs verify <dir>
node tools/generate-demo.mjs diff <dirA> <dirB>
```

Acceptance harness (THD-01…16 with coverage preflight) and typecheck:

```
npm test
npm run typecheck
```

## Status (v0, ledger 035)

- Engine + three outputs implemented from ONE canonical geometry model:
  technical sheet (DXF R12 + vector PDF, A2 1:750), colored presentation map
  (legend, north arrow, scale bar), envelope report (multi-page PDF + JSON),
  plus a parity-manifest sidecar. 16/16 THD gates green; six mandatory
  mutations killed and reverted (`collab/townhouse-demo-v0-mutation-log.md`).
- Sol's 034 schema rulings implemented: production-shaped entries
  (applicability predicate, structured demo-sentinel source, verification
  separate from classification, version chains); `E_RULE_ENTRY_INVALID` added.
- Requested / density-ceiling / placed / shortfall are distinct cited facts;
  slice A: 500 / 400 / 140 / 360 · slice B: 500 / 250 / 50 / 450.

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
   fixture + rulebook digest ⇒ byte-identical artifacts (THD-04/15).

## Known deviations (recorded for Sol, ledger 035)

- DXF R12 text is ASCII: the stamp appears ASCII-folded
  ("Research Draft - Not for Construction - DEMO") in DXF TEXT entities; the
  exact string (with — and ·) is in every PDF page and JSON artifact.
- THD-03 "every page renders": the harness proves structural parse + text ops
  per page; raster rendering is inspected visually (sips renders page 1),
  full render inspection stays in Sol's §6 pass.
- The automated watermark-visibility check tests size and fill colour, not
  occlusion; the occlusion case found during build is in the mutation log.
