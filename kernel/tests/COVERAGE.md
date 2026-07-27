# Kernel acceptance coverage

This directory is the executable gate for `SitePlanBrief` v5. Tests import the
public surface at `../src/index.ts`; they do not reach into implementation
modules.

## Numbered fixtures

| Fixture | Test file | Required outcome |
|---:|---|---|
| 1 | `geometry.acceptance.test.ts` | valid axis-aligned rectangle |
| 2 | `geometry.acceptance.test.ts` | valid rotated rectangle with explicit north |
| 3 | `geometry.acceptance.test.ts` | valid irregular convex quadrilateral |
| 4 | `geometry.acceptance.test.ts` | valid concave polygon |
| 5 | `geometry.acceptance.test.ts` | preserved collinear monument |
| 6 | `geometry.acceptance.test.ts` | valid cadastral hole |
| 7 | `validation.acceptance.test.ts` | multiple road-edge frontages |
| 8 | `geometry.acceptance.test.ts` | traverse exactly at closure threshold |
| 9 | `validation.acceptance.test.ts` | area difference exactly at tolerance |
| 10 | `validation.acceptance.test.ts` | footprint exactly on setback line |
| 11 | `geometry.acceptance.test.ts` | metre/foot/gaj equivalence |
| 12 | `geometry.acceptance.test.ts` | open, unknown, and mismatched closure block |
| 13 | `geometry.acceptance.test.ts` | traverse outside closure profile blocks |
| 14 | `geometry.acceptance.test.ts` | fewer than three vertices blocks |
| 15 | `geometry.acceptance.test.ts` | zero-area collinear ring blocks |
| 16 | `geometry.acceptance.test.ts` | degenerate edge blocks |
| 17 | `geometry.acceptance.test.ts` | self-intersection blocks |
| 18 | `geometry.acceptance.test.ts` | self-touch/spike blocks |
| 19 | `geometry.acceptance.test.ts` | non-interior hole blocks |
| 20 | `geometry.acceptance.test.ts` | overlapping holes block |
| 21 | `validation.acceptance.test.ts` | area beyond tolerance blocks |
| 22 | `validation.acceptance.test.ts` | absent north basis blocks |
| 23 | `validation.acceptance.test.ts` | empty, source-less, non-adjacent, and cross-route frontage references block |
| 24 | `validation.acceptance.test.ts` | footprint vertex outside envelope blocks |
| 25 | `validation.acceptance.test.ts` | footprint edge crossing concave envelope blocks |
| 26 | `validation.acceptance.test.ts` | overlapping footprints block |
| 27 | `validation.acceptance.test.ts` | collapsed setback envelope blocks |
| 28 | `validation.acceptance.test.ts` | dimension-integrity seam detects mismatch |
| 30 | `validation.acceptance.test.ts` | unverified evidence blocks elevation |
| 31 | `validation.acceptance.test.ts` | sliver warns and blocks until acknowledged |
| 32 | `validation.acceptance.test.ts` | signed area override is recorded |
| 33 | `validation.acceptance.test.ts` | incomplete magnetic context blocks |
| 34 | `geometry.acceptance.test.ts` | ambiguous reconstruction blocks with candidates |
| 35 | `geometry.acceptance.test.ts` | closed flag passes without a repeated point |
| 36 | `validation.acceptance.test.ts` | multipolygon/void roles and containment preserved |
| 37 | `geometry.acceptance.test.ts` | non-finite values block during resolution |
| 38 | `geometry.acceptance.test.ts` | malformed angle forms block during resolution |
| 39 | `geometry.acceptance.test.ts` | ambiguous chain unit blocks without a factor |
| 40 | `readiness.acceptance.test.ts` | explicit review request, identity, drawing, access, range, evidence, identifier, and kernel-parameter gates |
| 41 | `readiness.acceptance.test.ts` | supplied optional geometry and dimension requests validate or fail closed |

That is 41 numbered fixtures, including exporter parity (29) and the final
review-readiness gates (40–41).

## Sol implementation-review extensions

The first green implementation exposed six safety cases that the original
catalogue did not distinguish. They remain under their parent fixtures and
guardrail rather than inventing new contractual fixture numbers:

- **8b:** every accepted traverse leg remains its matching canonical edge.
- **9b:** unknown stated-area precision blocks automatic reconciliation.
- **11b:** geographic coordinates are actually projected, never relabelled as
  metres.
- **11c:** confirmed imported units are evidence-linked and agree with the
  extracted path frame.
- **12b:** an open cadastral-hole path is never silently closed.
- **26b:** identical building footprints still count as overlap.
- **27b:** an inset beyond opposing boundaries collapses rather than
  resurrecting outside the plot.
- **30b:** unverified setback evidence blocks the requested review stamp.
- **32b:** an override cannot erase a missing-setback blocker.
- **33b:** magnetic north is converted to true north using the supplied
  declination.
- **36b:** a footprint coincident with a no-build void remains outside the
  developable envelope.
- **36c:** a boundary-connected exclusion is subtracted without inventing a
  closing edge.
- **40b–40e:** identity/drawing, access/area/ranges, evidence/provenance, unique
  identifiers, and safe kernel parameters are each exercised independently.
- **41b–41e:** existing-feature decisions, projection links, line-encumbrance
  buffering, strict dimension semantics, and assumed-datum acknowledgement are
  each exercised independently.
- **Guardrail 3 extension:** a valid digest attached under an arbitrary symbol
  does not substitute for the kernel's private brand.

## Runtime guardrails

`validation.acceptance.test.ts` also proves:

1. Digest determinism, complete parameter sensitivity, and `-0`/`0`
   equivalence.
2. Recursive runtime immutability of a validated plan.
3. Rejection of structured/JSON clones, arbitrary-symbol forgeries, and a
   mutated clone carrying a reattached stale brand.

## Exporter gate

Fixture 29 is active in `export.acceptance.test.ts`. DXF and PDF are generated
from one `DrawingModel`; every marked path is re-parsed from both artifacts and
compared to the parity manifest. The test also proves declared metre units,
deterministic bytes, fail-closed sheet/scale behaviour, and rejection after the
private validation brand is lost.

## Form-route gate

`form.acceptance.test.ts` proves the two user-facing boundary routes:

1. A professionally verified coordinate form reaches the strict review gate.
2. Four sides plus a diagonal expose every valid candidate and never choose one.
3. Only a source-backed assembly selection can elevate reconstructed geometry.
4. Stale assembly identifiers and false georeferencing remain blocked.
5. The reconstructed-boundary warning is written into the shared drawing model,
   DXF metadata/text, vector PDF, and parity manifest so it cannot be separated
   from the exported plan.
