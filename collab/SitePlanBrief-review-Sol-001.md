# SitePlanBrief Review — Sol 001

**Reviewer:** Sol/Codex  
**Artifact reviewed:** `collab/SitePlanBrief.md`, draft dated 25 July 2026  
**Verdict:** Changes required before ratification  
**Scope:** Specification review only; no code or frozen-product changes

## 1. Rulings requested by Fable

### Fixtures 28 and 29 — approved

- **28** is correctly reclassified as a kernel-internal invariant test. A draft
  must not contain user-authored dimension text/value. Tests must prove both
  that the input type cannot carry an override and that generated dimension
  values always equal their referenced geometry.
- **29** is correctly reclassified as an exporter-level parity suite over one
  validated plan. It remains mandatory for DXF, PDF and later DWG.

The exit criterion is therefore not “all fixtures are brief inputs”; it is “all
fixtures are represented at the correct validation layer.”

### R1 — closure profiles approved

Agreed. Closure is judged under an explicit, evidence-linked instrument/method
profile. Until Mannu identifies the pilot survey methods, the only profile is
`total-station-1:10000` with minimum 1:10,000 and maximum 20 mm absolute
misclosure. No tape/chain profile is invented. Absence of a supported profile
blocks elevation beyond Research Draft.

### R2 — source-precision area tolerance approved

Agreed. Final tolerance is:

`max(0.25 m², 0.10% of stated area, half the source precision step)`

The precision step is converted from the original unit. Unknown precision
blocks automatic reconciliation rather than receiving a guessed rounding band.

### R3 — collinearity clarification approved

Confirmed. The ring as a whole must enclose positive area. Individual collinear
vertices are valid and preserved, especially surveyed monuments.

`collab/acceptance-tests.md` has been amended for all four rulings.

## 2. Strong decisions accepted

The following contract decisions are accepted:

1. Draft and validated data are separate.
2. Exporters consume validated data only.
3. No `for-construction` status exists inside the application.
4. Dimension text/value cannot be authored in the draft.
5. Edge references replace assumed top/bottom/left/right road positions.
6. Boundary area is measured, never rescaled to match a deed.
7. Topological closure and survey/traverse closure remain separate facts.
8. PENDING-MANNU decisions are isolated from the geometry algorithms.

## 3. Blocking changes required

### G1 — define a genuinely opaque validated result

`ValidatedSitePlan` is described but not specified. TypeScript is structurally
typed, so “no public constructor” alone does not make forgery a compile-time
impossibility.

Required revision:

- define `ValidationResult` as a discriminated success/failure result;
- define the complete canonical contents of `ValidatedSitePlan`;
- brand it with a kernel-private `unique symbol`;
- expose only the kernel validation factory and an exporter runtime guard;
- state explicitly that the type barrier prevents ordinary misuse but is not a
  security boundary against unsafe casts.

Exporters must fail if the kernel-owned brand/version/validation digest is
absent or stale.

### G2 — input facts and computed facts must be different types

The draft currently accepts caller-supplied `canonicalM`, `canonicalSqm`,
`canonicalDegrees`, `computedClosure` and `status`. These can disagree with the
raw source or become stale after a draft edit.

Required revision:

- draft measures contain only as-entered value, unit, stated precision and
  evidence;
- canonical values exist only in validated/computed types;
- `computedClosure` is returned by validation, never stored as draft input;
- remove `status` from `SitePlanBriefDraft`; validation returns findings;
- no caller-writable derived value is trusted.

### G3 — an open source path is not representable correctly

`RingDraft` says the last edge always joins the last vertex to the first, even
when `finalVertexRepeated=false`. That silently closes the exact invalid input
fixture the contract is meant to preserve. A boolean cannot retain the actual
endpoint gap.

Required revision:

- introduce a raw ordered path/polyline input that retains every source point
  and its declared closed/open state;
- create a canonical `LinearRing` only after closure passes;
- derive the closing edge only in the validated ring;
- use `E_SOURCE_PATH_OPEN` for source paths that do not close;
- retain the measured final-to-first gap in validation findings.

Coordinate input must also declare its raw axis units. Geographic coordinates
cannot be labelled canonical metres without an explicit verified transform to a
planar working frame.

### G4 — side-plus-diagonal ambiguity is larger than a mirror choice

Four ordered side lengths plus one diagonal can admit different assemblies
(including convex/concave placement) as well as reflected versions.
`handedness: cw | ccw` is therefore insufficient.

Required revision:

- require enough extra evidence to select one exact assembly: a second
  diagonal, bearing/angle, coordinate, or verified sketch;
- retain all candidate solutions until that evidence resolves one;
- unresolved assembly or reflection is blocker
  `E_RECONSTRUCTION_AMBIGUOUS`, not a warning.

### G5 — site features require point, line and polygon geometry

HT lines, drains, service corridors, walls and utilities cannot all be modelled
as rings. Existing features allow only a point or ring, and restrictions only a
ring.

Required revision:

- define evidence-bearing `PointDraft`, `PolylineDraft` and `PolygonDraft`;
- use the appropriate geometry union for restrictions and existing features;
- distinguish cadastral holes inside the ownership boundary from separate
  easements/no-build exclusions so the same hole is not stored twice.

### G6 — preserve jurisdiction neutrality and original units

The geometry contract must not hard-code `authority: 'DTCP-Haryana'`. Authority
belongs to an external pilot/profile reference until Mannu confirms it.

Required revision:

- replace the fixed authority union with a nullable external authority/profile
  identifier;
- make draft drawing precision, sheet and scale nullable or profile-driven;
- add `gaj` as an as-entered area-unit label even though its conversion equals
  square yard;
- give every regionally variable conversion factor its own evidence reference;
- either define exact meanings for `link` and `chain` or treat their conversion
  as evidence-linked rather than universal;
- add the mentioned `biswa` unit or remove it from the prose.

### G7 — status codes and professional records need tightening

Required rulings:

- fixtures 33 and 34 are blockers, not warnings:
  `E_MAGNETIC_CONTEXT_INCOMPLETE` and
  `E_RECONSTRUCTION_AMBIGUOUS`;
- define the complete `BlockerCode` and `WarningCode` unions in the contract;
- retain `W_SLIVER_REVIEW`, but block Ready-for-Review until it is explicitly
  acknowledged;
- make `ProfessionalOverride.professional` non-nullable;
- verification labels in a draft are claims to validate, never trusted facts.

All other code names in the §12 matrix are provisionally ratified. The source
open-path code changes from `E_RING_NOT_CLOSED` to `E_SOURCE_PATH_OPEN`; a
canonical validated ring is always closed.

## 4. Non-blocking clarifications for the revision

1. Define whether vertex order is preserved or canonicalised, and how edge IDs
   remain stable when winding reverses.
2. Add provenance for a footprint's origin: user-specified, surveyed or
   generated, including generator/version when applicable.
3. A local CRS cannot satisfy north orientation by itself; it still needs an
   explicit verified rotation.
4. Clarify how overlapping setback inputs on one edge resolve. The safe default
   is the maximum applicable distance; missing edge coverage blocks.
5. Use a source-bearing point type for level-reading locations and benchmarks.
6. Make revision timestamps and warning acknowledgements evidence-linked rather
   than arbitrary strings.

## 5. Ratification gate

The contract is not yet ratified. Fable should revise the contract against G1–G7,
record how each item was resolved, and return the ball to Sol. No implementation
starts before the revised contract and acceptance specification agree.

