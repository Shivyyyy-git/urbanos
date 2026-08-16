# Townhouse Demo — mutation evidence log

**Author:** Fable · required by `collab/townhouse-demo-acceptance-tests.md` §5.
**Method:** each mutation applied to `townhouse-demo/src` or `tools/` (engine/
data/tooling, never tests), full `npm test` run recorded, mutation reverted,
green rerun recorded. Behavioural evidence, not code screenshots.

## v0.2 run — 2026-08-16, all eight §5 rows re-run against the HARDENED gates

Sol's 045 review found three fail-open bypasses; the gates were hardened and
**Sol's exact independent mutants are now permanent hostile cases inside
THD-17/THD-18** (they run on every green build, not only in mutation drills):

- 045 §1 — `<img src="missing-local-asset.png">` (relative asset): killed by
  the new allowlist-level offline gate (any fetch-capable element/attribute/
  `url()`/`@import` fails, remote or relative).
- 045 §2 — pool ring deformed with its bounding box preserved (vertex 1
  duplicated onto vertex 0): killed by vertex-for-vertex ring parity (count,
  order, position, degeneracy) in both the preview gate and the THD-13
  cross-artifact oracle — bounding boxes are no longer accepted as evidence
  anywhere.
- 045 §3 — `actionability.reason` forged to "FORGED — fully sanctioned
  today." with the status token left `unknown`, in report JSON + manifest:
  killed by full-object gating (status AND verbatim reason) on JSON, every
  PDF, the DXF, and the preview; the drawing title blocks now carry the full
  computed reason, not a shortening.

Engine-mutation rows, re-run after the hardening (baseline before and after
each: 18/18 green, typecheck clean, `grep MUTATION` empty, packages + preview
regenerated and gate-verified):

| # | Mutation | Red result | Required |
|---|---|---|---|
| 1 | suppress report-page DEMO marker + neuter gate's PDF watermark check | **fail 2: THD-05, THD-06** | THD-05/06 ✓ |
| 2 | remove `row-length-max` from slice-A data | **fail 17: THD-01 red** + fail-closed cascade (only THD-02 survives) | THD-01 ✓ |
| 3 | stamp `any-unverified` → `all-unverified` | **fail 1: THD-10 only** | THD-10 ✓ |
| 4 | presentation-only drift of `f.plot-w-00-00` | **fail 2: THD-13, THD-15** | THD-13/14 ✓ |
| 5 | `Wp = 12` hard-coded | **fail 3: THD-08, THD-12, THD-15** | THD-08/15 ✓ |
| 6 | density ceiling copied into placed fact | **fail 3: THD-12, THD-16, THD-17** | THD-12/16 ✓ |
| 7 | preview neither regenerated nor gated | **fail 1: THD-17 only** | THD-17 ✓ |
| 8a | `DemoActionability` type admits `'yes'` | **fail 1: THD-18 only** | THD-18 ✓ |
| 8b | runtime predicate emits `'yes'` (cast) | **fail 16: THD-18** + cascade (gate refuses to ship any `yes` artifact) | THD-18 ✓ |
| 8c | report honors caller-injected actionability | **fail 1: THD-18 only** | THD-18 ✓ |

## v0.1 run — 2026-08-16, against THD-01…THD-18

Baseline before and after every mutation: **18/18 THD gates green**, strict
typecheck clean, `grep -rn "MUTATION" src/ tools/` empty after the final
revert, both packages + `preview.DEMO.html` regenerated and gate-verified.

| # | Mutation (contract §5) | What was changed | Red result | Required |
|---|---|---|---|---|
| 1 | Suppress one artifact/page DEMO marker | `reportToPdf` watermark block removed on all report pages; gate's PDF watermark check simultaneously neutered so the harness had to catch it | **fail 2: THD-05, THD-06** | THD-05/06 ✓ |
| 2 | Remove one applicable required entry | `row-length-max` deleted from `data/demo-slice-a.ts` | **fail 17: THD-01 red** (named `E_RULE_SLOT_MISSING`) + full fail-closed cascade; only THD-02 (fixture-only) survives — THD-05's vacuous-pass hole from the v0 run stays closed | THD-01 ✓ |
| 3 | Stamp predicate `any-unverified` → `all-unverified` | `computeDemoStamp` `some` → `every` | **fail 1: THD-10 only** (surgical) | THD-10 ✓ |
| 4 | Tamper one presentation-only geometry feature | presentation render draws `f.plot-w-00-00` shifted +2 m; canonical model/DXF/technical PDF untouched | **fail 3: THD-13, THD-15, THD-16** (parity names the feature; THD-16's independently *measured* plot count also catches the duplicate) | THD-13/14 ✓ |
| 5 | Replace runtime primary-road width with a fixed number | `layout.ts` `Wp = 12` constant | **fail 3: THD-08, THD-15, THD-12** (novel 13.7 m probe not honoured; B's spine measures 12 ≠ its 15 m entry) | THD-08/15 ✓ |
| 6 | Copy density ceiling into placed-capacity result | placed-DU fact given `densityCeilingDu` | **fail 3: THD-12, THD-16, THD-17** (counts measured everywhere disagree) | THD-12/16 ✓ |
| 7 | Ship a missing/stale/undetected preview | generator stops replacing `preview.DEMO.html` and stops gating it | **fail 1: THD-17 only** (surgical: stale-bytes and stale-digest assertions) | THD-17 ✓ |
| 8a | DEMO type admits `yes` | `DemoActionability.sanctionableToday: 'unknown' \| 'yes'` | **fail 1: THD-18 only** (the compile-only fixture's expect-error directives go unused → typecheck red inside THD-18) | THD-18 ✓ |
| 8b | Runtime predicate emits `yes` | `computeDemoActionability` returns `yes` via cast | **fail 16: THD-18 red** + near-total cascade — the package gate refuses to ship any artifact claiming `yes`, so every generate exits non-zero (fail-closed as designed) | THD-18 ✓ |
| 8c | Injection through the public request surface honored | report composer accepts caller-supplied `site.actionability` | **fail 1: THD-18 only** (surgical: forged-promotion probe) | THD-18 ✓ |

All mutants killed; every revert confirmed by a full green rerun.

## v0 run — 2026-08-16, against THD-01…THD-16 (historical)

Recorded before ledger 041's rejection; kept for the record.

| # | Mutation | Red result |
|---|---|---|
| 1 | watermark suppressed + gate neutered | THD-05, THD-06 |
| 2 | required entry removed | THD-01 + cascade (THD-05 passed vacuously — hole found and closed: THD-05 now asserts a non-empty package) |
| 3 | stamp any→all | THD-10 only |
| 4 | presentation-only drift | THD-13, THD-15 |
| 5 | hard-coded road width | THD-08, THD-12, THD-15 |
| 6 | ceiling copied into placed | THD-12, THD-16 |

**Honest findings retained from v0:** the vacuous-pass hole above, and the
page watermark originally painted *under* the filled map (occluded — fixed by
painting on top; in v0.1 the watermark is additionally translucent via
ExtGState alpha 0.34 and moderate in size, per 041 §5, so it neither hides nor
dominates the plan). The automated visibility check still tests size and fill
colour, not occlusion — rendered-page inspection stays in Sol's §6 pass.
