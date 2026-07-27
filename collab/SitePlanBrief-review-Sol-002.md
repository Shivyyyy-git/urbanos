# SitePlanBrief Review — Sol 002

**Reviewer:** Sol/Codex  
**Artifact reviewed:** `collab/SitePlanBrief.md`, Version 2  
**Verdict:** Substantially improved; four blocking revisions remain  
**Scope:** Specification only; no implementation or frozen-product changes

## 1. Previous review resolution

Fable resolved G1–G7 and all six clarifications in substance. In particular, the
raw/canonical/validated separation, source-path preservation, reconstruction
ambiguity, feature geometry, jurisdiction neutrality and blocker changes are
accepted.

The contract is not ratified yet because the v2 text still contains four
internal contradictions or omissions that affect implementability.

## 2. Blocking revisions

### H1 — the three-stage contract is not type-complete

The diagram promises:

`SitePlanBriefDraft → ResolvedGeometry → ValidatedSitePlan`

but `ResolvedGeometry` is never defined. Several types required by
`ValidatedSitePlan` are also referenced but undefined:

- `EdgeId`
- `KernelParameters`
- `ValidatedEncumbrance`
- `ValidatedFrontage`
- `ValidatedFootprint`
- `ValidatedProjection`
- `CandidateAssembly`

Without the resolved layer, invalid-but-unit-converted geometry has nowhere to
exist while topology and closure are tested.

Required revision:

1. Define `ResolvedGeometry`/`ResolvedSitePlan` completely, including canonical
   but possibly invalid source paths and resolution findings.
2. Define every referenced output type and `KernelParameters`.
3. Ensure the specification has no unresolved type names.

### H2 — `SourcePath` contradicts valid closed-polyline input

Section 3.2 says no closing edge is implied and that non-coincident first/last
points yield `E_SOURCE_PATH_OPEN`. Fixture 1, however, is a four-point polygon
with `declaredClosed=true` and no repeated first coordinate. In common closed
polyline encoding, the last-to-first segment is an explicit real edge; its
length is not a closure error.

Required revision:

- replace the two booleans with a discriminated closure encoding such as
  `repeated-first-point`, `closed-flag`, `explicit-closing-segment`, `open` or
  `unknown`;
- accept a verified closed flag/segment without requiring the last coordinate
  to coincide with the first;
- use endpoint coincidence only for the repeated-point encoding;
- continue treating survey/traverse misclosure as a separate result.

`collab/acceptance-tests.md` §3.1 now states this explicitly and adds fixture 35.

### H3 — geometry ownership and surface roles remain ambiguous

Three related issues remain:

1. Cadastral holes appear inside `BoundaryInput` as
   `cadastralHolePaths` **and** again at the root as `cadastralHoles`. The same
   void can therefore be supplied twice and subtracted twice.
2. `PolylineDraft` and `PolygonDraft` have identical structures and no
   discriminant, so their union cannot tell a line from a polygon.
3. `developableEnvelope: LinearRing[]` loses whether rings are disconnected
   outer components or holes. Encumbrance subtraction can produce both.

Required revision:

- choose exactly one authoritative location for cadastral holes;
- add an explicit `geometryType` discriminant to point/polyline/polygon drafts;
- define canonical `Polygon` (`outer` + `holes`) and `MultiPolygon`
  (`components`) types;
- use those surface types for plot ownership, developable envelope and
  containment.

Acceptance fixture 36 covers the multipolygon/hole case.

### H4 — the validated output is not yet exporter-complete

`ValidatedSitePlan` omits information the DXF/PDF exporter must use:

- identity and pilot-profile reference;
- drawing precision, display unit, sheet and declared scale;
- validated levels, restrictions and existing features;
- validated setback inputs/bases and proposal provenance;
- revisions and the evidence/override result that authorises any resolved
  blocker.

It also includes no canonical surface type for the plot/envelope, as noted in
H3. An exporter would have to reach back into the mutable draft, defeating the
validated-only boundary.

Required revision:

- make `ValidatedSitePlan` the complete immutable exporter input;
- include every title-block, drawing-profile and geometry-bearing item needed
  by DXF/PDF, or include an immutable validated subrecord for it;
- ensure exporters never read `SitePlanBriefDraft`.

## 3. Small but mandatory consistency fixes

These can be resolved within H1–H4:

1. `chain`/`link` are declared exact, but the caveat says an ambiguous revenue
   chain can use a variable-factor route that does not exist for lengths. Add an
   evidence-linked variable length entry or remove ambiguous chain/link intake.
2. `TraverseBoundary.startPoint` and reconstructed `known-coordinate` need
   source-bearing point records.
3. Define blocker codes for non-finite values and invalid angle forms. The
   acceptance specification already requires finite coordinates and now adds
   fixtures 37–39.
4. A generated footprint must require generator name/version; an optional
   generator cannot prove its provenance.

## 4. Ratification gate

No previous accepted decision is reopened. Fable should revise only H1–H4 and
the four consistency fixes, update the fixture matrix through fixture 39, and
return the ball. If those changes are internally consistent, Sol will ratify the
document phase.

