# Townhouse Demo v0 — mutation evidence log

**Author:** Fable, 2026-08-16 · required by `collab/townhouse-demo-acceptance-tests.md` §5.
**Method:** each mutation applied to `townhouse-demo/src` (engine/data, never tests), full
`npm test` run recorded, mutation reverted, green rerun recorded. Behavioural
evidence, not code screenshots. Baseline before and after every mutation:
**16/16 THD gates green, typecheck clean** (`tsc --noEmit` strict).

| # | Mutation (contract §5) | What was changed | Red result (recorded) | Contract requires |
|---|---|---|---|---|
| 1 | Suppress one artifact/page DEMO marker | `reportToPdf` stopped emitting the watermark block on every report page; the package gate's PDF-watermark check was simultaneously neutered so the harness (not the in-engine gate) had to catch it | **fail 2 / pass 14: THD-05, THD-06** | THD-05/06 ✓ |
| 2 | Remove one applicable required entry | `row-length-max` entry deleted from `data/demo-slice-a.ts` | **fail 14 / pass 2: THD-01 red** (E_RULE_SLOT_MISSING refusal) plus a cascade — with resolution refused, every slice-A-dependent gate has no package to accept, which is fail-closed behaving as designed | THD-01 ✓ |
| 3 | Stamp predicate `any-unverified` → `all-unverified` | `computeDemoStamp`: `entries.some(...)` → `entries.every(...)` | **fail 1 / pass 15: THD-10 only** (surgical) | THD-10 ✓ |
| 4 | Tamper one presentation-only geometry feature | `communityDrawingToPdf` shifted `f.plot-w-00-00` +2 m east on the presentation render only; canonical model, DXF, technical PDF, digests untouched | **fail 2 / pass 14: THD-13, THD-15** (parity oracle names the feature) | THD-13/14 ✓ |
| 5 | Replace runtime primary-road width with a fixed number | `layout.ts`: `const Wp = rule('road-width-primary')` → `const Wp = 12` | **fail 3 / pass 13: THD-08, THD-15, THD-12** (novel 13.7 m probe not honoured; B's spine measured 12 ≠ its 15 m entry) | THD-08/15 ✓ |
| 6 | Copy density ceiling into placed-capacity result | `report.ts`: placed-DU fact given `densityCeilingDu` instead of `placedDu` | **fail 2 / pass 14: THD-12, THD-16** (independent plot counts 140 ≠ reported 400) | THD-12/16 ✓ |

All six mutants killed; every revert confirmed by a full green rerun. After the
final revert: `grep -rn "MUTATION-" src/` returns nothing, `tsc --noEmit` clean,
16/16 green.

**Honest finding from the mutation run:** under mutation 2, THD-05 passed
*vacuously* (generation refused, so there were zero artifacts to scan; THD-03
carried the failure). THD-05 now asserts a non-empty package before scanning,
so it can never green on nothing. Recorded here because a vacuous pass is the
reviewer's version of a silent default.

**Also fixed during the run (visual, pre-handoff):** the page-level DEMO
watermark was originally painted *before* the filled site plan, so the
presentation map occluded it — structurally present, visually hidden, exactly
the failure THD-05's "hidden" clause is about. Watermark ops now paint after
the geometry on drawing sheets. Caught by rendered-page inspection, not by the
structural check; flagged for Sol's visual pass as a known limitation of the
automated visibility test (it checks size and fill colour, not occlusion).
