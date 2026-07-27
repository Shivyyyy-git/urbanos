# SitePlanBrief — Contract Specification

**Owner:** Fable/Claude
**Reviewer:** Sol/Codex
**Version:** 5 — revised against Sol's route-completeness audit, ledger 013 (J1–J2)
**Status:** Draft for document-phase ratification — specification only, no code
**Written against:** `collab/acceptance-tests.md` as amended, fixtures 1–39
**Scope:** The data contract between intake and the geometry kernel. No UI, no
jurisdiction rules, no layout generation, no changes to the frozen `src/`.

> **Revision note (v5).** v4 fixed reference constructibility for the two
> *path-based* boundary routes and left the other two broken. A traverse has legs,
> not points; a reconstruction has indexed sides. Neither has a `PathId` or
> `PointId`, so on those routes a caller still could not name a single edge — which
> meant `E_SETBACK_EDGE_UNCOVERED` fired unconditionally and **fixture 8 could never
> pass**. Fixed by making draft references route-complete (§3.6). Third occurrence of
> one root cause: I keep fixing a leak on the path I am looking at instead of at the
> abstraction. §3.6 now states the invariant once, for all routes.
>
> **Revision note (v4).** Sol's executability audit found that I had broken my own
> rule. G2 established that *a draft contains no derived value of any kind* — but
> `EdgeId` **is** a derived value: an edge exists only once a ring is built, which
> happens after validation. Letting draft frontages, setbacks and dimensions
> reference `EdgeId` made them literally unconstructible by a caller, who holds only
> `PointId`s. The same error class as `canonicalM` in v1, wearing a third disguise.
> Fixed by adding source-level reference types (§3.6) so a draft references only
> what the source actually has.
>
> **Revision note (v3).** H2 was the important one: v2 tested closure by endpoint
> coincidence in all cases, which would have **rejected fixture 1** — a four-point
> rectangle with a closed flag, the simplest valid input there is. The cause was
> conflating three different claims under one word. They are now separated (§3.3).
> H1's "no unresolved type names" is treated as a hard requirement: §16 lists every
> type defined here, and nothing is referenced that is not defined.

---

## 1. Three stages, two gates

```
SitePlanBriefDraft ──resolve()──▶ ResolvedSitePlan ──validate()──▶ ValidatedSitePlan
 as-entered only        units converted, frame            topology, closure, area,
 nothing derived        established, values canonical      containment all PROVEN
 holds all fixtures     but geometry may still be          exporter-consumable
                        invalid                            (branded + digest)
```

**The resolved layer exists because invalid-but-converted geometry needs
somewhere to live** (H1). A path with a bow-tie still has real metres; we must be
able to hold it, measure it, and report *where* it crosses. Resolution can fail
on units, frames and non-finite values; validation can fail on topology, closure,
area, orientation and containment. Two gates, two distinct failure vocabularies.

**Invariant enforced by types, not discipline:** a draft contains no derived value
of any kind — no canonical metres, no computed closure, no status. Exporters
accept `ValidatedSitePlan` only and never read a draft (H4).

---

## 2. Identifiers and units

```ts
type EvidenceId = string
type ISODate    = string          // 'YYYY-MM-DD'
type PathId     = string
type PointId    = string
type VertexId   = string
type EdgeId     = string          // see §7.2 for derivation and stability
type RingId     = string
type FeatureId  = string
```

### 2.1 Length units

```ts
/** Exact, universal conversions. */
type ExactLengthUnit = 'm' | 'mm' | 'cm' | 'km' | 'ft' | 'in' | 'yd'
                     | 'chain-gunter' | 'link-gunter'

/** No single legal value — requires a declared, evidence-backed factor.
 *  karam and jarib appear in Punjab/Haryana revenue records; a source that says
 *  only "chain" or "link" without naming Gunter's lands here (fix 1, fixture 39). */
type VariableLengthUnit = 'chain-unspecified' | 'link-unspecified'
                        | 'karam' | 'jarib' | 'gaz-local'

type LengthUnitLabel = ExactLengthUnit | VariableLengthUnit
```

### 2.2 Area units

```ts
type ExactAreaUnit    = 'sqm' | 'sqft' | 'sqyd' | 'gaj' | 'acre' | 'hectare'
type VariableAreaUnit = 'bigha' | 'biswa' | 'marla' | 'kanal' | 'killa'
type AreaUnitLabel    = ExactAreaUnit | VariableAreaUnit
```

### 2.3 Exact conversions (kernel constants, never caller input)

`mm 0.001` · `cm 0.01` · `km 1000` · `in 0.0254` · `ft 0.3048` · `yd 0.9144` ·
`chain-gunter 20.1168` · `link-gunter 0.201168` (m per unit)
`sqft 0.09290304` · `sqyd = gaj 0.83612736` · `acre 4046.8564224` ·
`hectare 10000` (m² per unit).

`gaj` converts identically to `sqyd` but stays a distinct label so the drawing and
the reconciliation report can echo the owner's own word.

### 2.4 Declared factors for variable units

```ts
interface DeclaredLengthFactor { mPerUnit: number; sourceRef: EvidenceId }
interface DeclaredAreaFactor   { sqmPerUnit: number; sourceRef: EvidenceId }
```

Mandatory whenever the unit is variable. Missing either the factor or its
`sourceRef` yields `E_UNIT_FACTOR_UNDECLARED`. The kernel never infers a factor
from a unit's name — which is precisely why `chain-unspecified` exists as a
separate label from `chain-gunter` (fix 1).

> **PENDING-MANNU (M2):** factors actually in use for Sectors 99–113, and whether
> karam/jarib appear in the records we will ingest.

### 2.5 Draft entries (as-entered only)

```ts
interface LengthEntry {
  asEntered: number
  unit: LengthUnitLabel
  declaredFactor?: DeclaredLengthFactor      // required iff unit is variable
  statedPrecision?: number                   // precision the SOURCE claims
  sourceRef: EvidenceId | null
}

interface AreaEntry {
  asEntered: number
  unit: AreaUnitLabel
  declaredFactor?: DeclaredAreaFactor        // required iff unit is variable
  statedPrecision?: number
  sourceRef: EvidenceId | null
}

/** Exactly one of decimalDegrees / dms must be present. Both or neither yields
 *  E_ANGLE_FORM_INVALID (fix 3, fixture 38). */
interface AngleEntry {
  decimalDegrees?: number
  dms?: { d: number; m: number; s: number; sign: 1 | -1 }
  reference: 'true' | 'grid' | 'magnetic'
  sourceRef: EvidenceId | null
}
```

Any non-finite number anywhere in a draft yields `E_VALUE_NOT_FINITE` at
resolution, before any geometry operation runs (fix 3, fixture 37).

---

## 3. Raw source geometry

### 3.1 Coordinate frames — declared, never inferred

```ts
type CoordinateFrame =
  | { kind: 'planar'; axisUnit: ExactLengthUnit; crsCode: string | null
      isLocal: boolean; sourceRef: EvidenceId | null }
  | { kind: 'geographic'; crsCode: string
      projectionToPlanar: { targetCrsCode: string; sourceRef: EvidenceId } | null }
```

A `geographic` frame without `projectionToPlanar` yields `E_FRAME_UNPROJECTED`.
Degrees are never treated as metres. A `planar` frame whose `axisUnit` is variable
is not expressible — axis units must be exact, or the frame is undeclared
(`E_FRAME_UNDECLARED`).

### 3.2 Source points

```ts
interface SourcePoint {
  pointId: PointId
  /** Axis values AS RECORDED, in the frame's own axisUnit. Not metres. */
  axis1: number                     // easting / longitude
  axis2: number                     // northing / latitude
  monumentId?: string
  /** Forbids the kernel from simplifying this point away when collinear. */
  preserveCollinear?: boolean
  sourceRef: EvidenceId | null
}
```

### 3.3 Closure encoding — three claims, not one (H2)

v2's defect was treating "closed" as a single fact. It is three:

| Claim | Question | Where evaluated |
|---|---|---|
| **Encoding closure** | Does the data describe a ring at all? | `ClosureEncoding`, §3.4 |
| **Coordinate closure** | For repeated-point encoding, do the endpoints coincide? | resolution, `EPS` |
| **Survey closure** | Do the *measurements* return to origin? | traverse only, §7.4 |

A four-point rectangle with a closed flag has **encoding closure** and needs no
coordinate coincidence — its last-to-first segment is real boundary geometry of
real length, not a misclosure. v2 demanded coincidence universally and so would
have failed fixture 1 and fixture 35.

```ts
type ClosureEncoding =
  /** Last coordinate repeats the first. Coincidence within EPS IS the test. */
  | { kind: 'repeated-first-point' }
  /** Source carries a closed-polyline flag, e.g. DXF LWPOLYLINE group 70 bit 1.
   *  Final→first is a real edge; no coincidence required. */
  | { kind: 'closed-flag'; flagSource: string }
  /** Source lists the closing segment explicitly as its own element. */
  | { kind: 'explicit-closing-segment' }
  /** Source describes an open path. Valid for polylines; blocks where a ring is required. */
  | { kind: 'open' }
  /** Source says nothing about closure. Never silently joined. */
  | { kind: 'unknown' }
```

Code mapping: `open` where a ring is required → `E_SOURCE_PATH_OPEN`; `unknown` →
`E_CLOSURE_ENCODING_UNKNOWN`; `repeated-first-point` with endpoints further apart
than `EPS` → `E_CLOSURE_POINT_MISMATCH`, reporting the **measured gap** so a
surveyor gets a number rather than a verdict.

### 3.4 Source path

```ts
interface SourcePath {
  pathId: PathId
  frame: CoordinateFrame
  /** Every point the source lists, in source order, verbatim. */
  points: SourcePoint[]
  closure: ClosureEncoding
}
```

No closing edge is implied by the structure. A `SourcePath` becomes a
`LinearRing` (§7.2) only after its encoding admits a ring and its geometry
validates.

### 3.5 Feature geometry — discriminated (H3.2)

```ts
interface PointDraft {
  geometryType: 'point'
  featureId: FeatureId
  frame: CoordinateFrame
  axis1: number
  axis2: number
  sourceRef: EvidenceId | null
}

interface PolylineDraft {
  geometryType: 'polyline'
  featureId: FeatureId
  path: SourcePath                  // closure.kind expected 'open'
}

interface PolygonDraft {
  geometryType: 'polygon'
  featureId: FeatureId
  path: SourcePath                  // closure.kind must admit a ring
  holes: SourcePath[]
}

type FeatureGeometryDraft = PointDraft | PolylineDraft | PolygonDraft
```

The `geometryType` discriminant makes the union discriminable, and `PolygonDraft`
now carries its own holes — which `PolylineDraft` structurally cannot, so the two
are no longer identical shapes (H3.2).

### 3.6 Draft references — route-complete (J1)

A draft can only name what the *source* contains, and what a source contains depends
on which boundary route it came from. Canonical vertices, edges and rings do not
exist until validation builds them.

**The invariant, stated once for every route:** a caller must be able to name every
boundary edge and every boundary vertex using only the identifiers their own route
gives them, *before* any canonical geometry exists.

| Route | Edges are named by | Vertices are named by |
|---|---|---|
| `coordinates`, `imported-file` | endpoint pair in a `SourcePath` | `pointId` in a `SourcePath` |
| `traverse` | `legId` — leg *i* **is** boundary edge *i* | station at a leg's start/end |
| `reconstructed` | `sideIndex` 0–3 | `vertexIndex` 0–3 |

```ts
/** An edge of a path, named by its two endpoints. UNORDERED: the kernel matches
 *  either orientation. The points must be ADJACENT in that path. */
interface SourceEdgeRef {
  pathId: PathId
  fromPointId: PointId
  toPointId: PointId
}

/** An edge, in whatever terms the active route provides. `path-edge` may name any
 *  path in the brief (boundary, footprint, encumbrance); the other two name
 *  boundary edges specifically. */
type DraftEdgeRef =
  | { kind: 'path-edge';           edge: SourceEdgeRef }
  | { kind: 'traverse-leg';        legId: string }
  | { kind: 'reconstructed-side';  sideIndex: 0 | 1 | 2 | 3 }

/** A vertex, likewise. */
type DraftVertexRef =
  | { kind: 'path-point';           pathId: PathId; pointId: PointId }
  | { kind: 'traverse-station';     legId: string; end: 'start' | 'end' }
  | { kind: 'reconstructed-corner'; vertexIndex: 0 | 1 | 2 | 3 }

/** What a draft may point at. */
type SourceGeometryRef =
  | { kind: 'vertex';       ref: DraftVertexRef }
  | { kind: 'edge';         ref: DraftEdgeRef }
  | { kind: 'boundary' }                            // the whole outer boundary
  | { kind: 'feature-path'; pathId: PathId }        // a non-boundary path

/** Findings are raised at both stages, so they may cite either form. */
type AnyGeometryRef = SourceGeometryRef | GeometryRef
```

Resolution rules, so the kernel has no discretion — every failure is
`E_REF_UNRESOLVED`:

- **`path-edge` / `path-point` / `feature-path`** — the `pathId` must exist in the
  brief. For `path-edge`, both points must exist in that path and be **adjacent**: a
  frontage or setback may name a real boundary edge, never a chord across the plot.
- **`traverse-leg` / `traverse-station`** — the brief's active boundary route must be
  `traverse`, and the `legId` must exist in `legs`.
- **`reconstructed-side` / `reconstructed-corner`** — the active route must be
  `reconstructed`, the index must be 0–3, and for a side the corresponding
  `sides[sideIndex]` must be non-null.
- **Cross-route references are rejected.** A `traverse-leg` on a coordinate boundary
  names nothing real, so it resolves to nothing rather than to a guess.

**Setback coverage (§6.2) is therefore route-relative:** every leg on a traverse,
every non-null side on a reconstruction, every path edge on a coordinate boundary.
`E_SETBACK_EDGE_UNCOVERED` is raised against that route's own edge set.

Canonical `GeometryRef` (§6.2) remains the *output* form, used by
`ResolvedDimension` and by findings raised after ring construction.

---

## 4. Boundary input routes

```ts
type BoundaryInput =
  | ImportedFileBoundary | CoordinateBoundary | TraverseBoundary | ReconstructedBoundary
```

### 4.1 Cadastral holes have exactly one home (H3.1)

v2 allowed holes in both `BoundaryInput.cadastralHolePaths` and root
`cadastralHoles`, so one void could be supplied twice and subtracted twice.

**Ruling: the root-level `SitePlanBriefDraft.cadastralHoles` is the sole
authoritative location.** A file importer *pre-fills* that array and keeps no copy
of its own. No boundary route carries hole geometry.

```ts
interface ImportedFileBoundary {
  route: 'imported-file'
  file: EvidenceId
  extractedFrom: { layerName?: string; entityHandle?: string } | null
  units: UnitDetection
  outerPath: SourcePath | null
  /** Holes found in the file are written to the root cadastralHoles array at
   *  import time, each tagged with this importJobId for traceability. */
  importJobId: string | null
}

/** Units are never assumed from a CAD file. */
interface UnitDetection {
  insunitsRaw: number | null        // includes 0 = unitless
  interpretedAs: ExactLengthUnit | null
  confirmedBy: EvidenceId | null    // an explicit human confirmation
  state: 'confirmed' | 'ambiguous' | 'absent'
}

interface CoordinateBoundary {
  route: 'coordinates'
  outerPath: SourcePath | null
}

interface TraverseBoundary {
  route: 'traverse'
  /** Source-bearing start record (fix 2). */
  startPoint: PointDraft | null
  legs: TraverseLeg[]
  closureProfileRef: string | null  // e.g. 'total-station-1:10000'
  /** Required before a non-zero but profile-passing misclosure can become
   *  canonical construction geometry. The kernel never chooses an adjustment
   *  method or alters observations on its own. */
  adjustment: TraverseAdjustmentApproval | null
}

interface TraverseLeg {
  legId: string
  bearing: AngleEntry | null
  distance: LengthEntry | null
}

interface TraverseAdjustmentApproval {
  /** Professionally adjusted, explicitly closed station path. */
  adjustedPath: SourcePath
  /** Named exactly as stated by the approving professional; PENDING-MANNU M3. */
  method: string
  professional: ProfessionalRecord
  approvedAt: ISODate
  evidenceRef: EvidenceId
}
```

### 4.2 Reconstruction from sides and diagonals

Sol's G4 concern is confirmed by counterexample. Four ordered sides plus one
diagonal admit **four** simple quadrilaterals with **two distinct areas**, because
both triangles may sit on the *same* side of the diagonal, nesting into a valid
concave dart:

| sides a,b,c,d | diagonal | simple assemblies | areas |
|---|---|---|---|
| 11, 11, 5.2, 5.2 | 10 | 4 | **41.85 m²** (concave) vs **56.13 m²** (convex) |
| 16, 16, 7.7, 7.7 | 15 | 4 | 92.92 vs 119.08 m² |
| 21, 21, 10.2, 10.2 | 20 | 4 | 164.56 vs 204.76 m² |

Not reflections, so a handedness flag cannot separate them — the first pair
differs by **34% in area**.

```ts
interface ReconstructedBoundary {
  route: 'reconstructed'
  /** Ordered sides V0→V1→V2→V3→V0. Quadrilateral only. */
  sides: [LengthEntry | null, LengthEntry | null, LengthEntry | null, LengthEntry | null]
  diagonals: DiagonalEntry[]                 // ≥1; two removes most ambiguity
  disambiguation: DisambiguationEvidence | null
}

interface DiagonalEntry {
  fromVertexIndex: 0 | 1 | 2 | 3
  toVertexIndex: 0 | 1 | 2 | 3
  length: LengthEntry
}

type DisambiguationEvidence =
  | { kind: 'second-diagonal'; diagonal: DiagonalEntry }
  | { kind: 'interior-angle'; atVertexIndex: 0 | 1 | 2 | 3; angle: AngleEntry }
  | { kind: 'known-coordinate'; vertexIndex: 0 | 1 | 2 | 3; point: PointDraft }  // fix 2
  | { kind: 'bearing-of-side'; sideIndex: 0 | 1 | 2 | 3; bearing: AngleEntry }
  | { kind: 'verified-sketch'; sourceRef: EvidenceId; chosenAssemblyId: string }
```

The kernel enumerates and retains all candidates with their differing areas
(`CandidateAssembly`, §7.5). Unresolved → `E_RECONSTRUCTION_AMBIGUOUS`, a blocker.
Even once resolved, the ring is labelled reconstructed (`W_RECONSTRUCTED_GEOMETRY`).

---

## 5. Orientation

```ts
type OrientationInput =
  | { basis: 'georeferenced-crs'; crs: CoordinateFrame }   // planar, isLocal === false
  | { basis: 'explicit-rotation'; northRotation: AngleEntry; magnetic?: MagneticContext }
  | { basis: 'absent' }

interface MagneticContext {
  observationDate: ISODate | null
  declination: AngleEntry | null
  modelOrSource: string | null       // e.g. 'IGRF-14'
}
```

A local frame cannot satisfy orientation: `'georeferenced-crs'` requires
`isLocal === false`. Local frame with no explicit rotation → `E_NORTH_ABSENT`.
Incomplete magnetic context → `E_MAGNETIC_CONTEXT_INCOMPLETE` (blocker), because
an undated magnetic bearing cannot be reduced to true north at all.

---

## 6. Draft site content

```ts
interface RoadFrontageDraft {
  frontageId: string
  /** MUST resolve to ≥1 real boundary edge. Empty is representable and blocks.
   *  No cardinal or top/bottom/left/right option exists anywhere in this contract. */
  edges: DraftEdgeRef[]
  carriagewayWidth: LengthEntry | null
  rowWidth?: LengthEntry
  roadName?: string
  roadClassRef?: string              // PENDING-MANNU (M6)
}

/** A void in the OWNERSHIP boundary — land not owned. Subtracts from plot area.
 *  Sole authoritative location for holes (§4.1). */
interface CadastralHoleDraft {
  holeId: string
  path: SourcePath
  description?: string
  importJobId?: string
  sourceRef: EvidenceId | null
}

/** A burden ON owned land. Counts toward area; constrains the envelope. */
interface EncumbranceDraft {
  encumbranceId: string
  kind: 'easement' | 'right-of-way' | 'no-build-zone' | 'service-corridor'
      | 'water-body-buffer' | 'other'
  geometry: FeatureGeometryDraft | null
  clearance?: LengthEntry            // applied around point/line encumbrances
  description: string
  sourceRef: EvidenceId | null
}

interface RestrictionDraft {
  restrictionId: string
  kindRef: string                    // PENDING-MANNU (M7)
  geometry: FeatureGeometryDraft | null
  description: string
  sourceRef: EvidenceId | null
}

interface LevelReadingDraft {
  readingId: string
  location: PointDraft               // source-bearing (fix 2 / clarification 5)
  elevation: LengthEntry | null
  datum: 'MSL' | 'local-benchmark' | 'assumed' | null
  benchmark?: { description: string; location: PointDraft; sourceRef: EvidenceId | null }
}

interface ExistingFeatureDraft {
  featureId: FeatureId
  kindRef: string                    // PENDING-MANNU (M7)
  geometry: FeatureGeometryDraft | null
  toBeRetained: boolean | null
  sourceRef: EvidenceId | null
}

interface EdgeSetbackInput {
  setbackId: string
  edges: DraftEdgeRef[]
  distance: LengthEntry | null
  basis: { citation: string; sourceRef: EvidenceId | null } | null
}
```

**Setback resolution, fixed here so the kernel has no discretion:** where several
inputs cover one edge the **maximum** applicable distance governs — never the
minimum, never an average. Every boundary edge must be covered by ≥1 input, or
`E_SETBACK_EDGE_UNCOVERED`. Zero is never assumed.

### 6.1 Proposal

```ts
/** 'generated' REQUIRES generator identity — an optional generator cannot prove
 *  provenance (fix 4). */
type FootprintOrigin =
  | { kind: 'user-drawn'; sourceRef: EvidenceId | null }
  | { kind: 'surveyed-existing'; sourceRef: EvidenceId }
  | { kind: 'generated'; generator: { name: string; version: string } }

interface FootprintDraft {
  footprintId: string
  path: SourcePath | null
  holes: SourcePath[]
  label?: string
  storeysAboveGround?: number
  origin: FootprintOrigin
}

interface ProjectionDraft {
  projectionId: string
  kind: 'balcony' | 'chajja' | 'canopy' | 'porch' | 'ramp' | 'basement'
      | 'staircase' | 'other'
  path: SourcePath | null
  attachedToFootprintId: string | null
  projectionDepth?: LengthEntry
  clearHeight?: LengthEntry
}
```

### 6.2 Dimensions — enforcement by omission

```ts
interface DimensionRequest {
  dimensionId: string
  kind: 'aligned' | 'linear' | 'chain' | 'area' | 'angle'
  /** Source-level (§3.6): a caller cannot name a canonical edge. */
  references: SourceGeometryRef[]
  witnessPoints?: { axis1: number; axis2: number; frame: CoordinateFrame }[]
  offset?: number                    // placement only; cannot affect the value
  // NO text, value or override field exists.
}

type GeometryRef =
  | { kind: 'vertex'; id: VertexId }
  | { kind: 'edge';   id: EdgeId }
  | { kind: 'ring';   id: RingId }
```

A caller cannot express a dimension whose text disagrees with its geometry.
Fixture 28 is a kernel-internal invariant test per Sol's ruling.

---

## 7. Kernel types

### 7.1 Kernel parameters (H1)

```ts
interface ClosureProfile {
  profileRef: string                 // 'total-station-1:10000'
  minRatioDenominator: number        // 10000
  maxAbsoluteMisclosureM: number     // 0.020
  methodDescription: string
  sourceRef: EvidenceId | null
}

interface KernelParameters {
  epsM: number                       // 0.001
  closureProfiles: ClosureProfile[]
  areaTolerance: {
    floorSqm: number                 // 0.25
    fractionOfStated: number         // 0.001
    useSourcePrecisionHalfStep: boolean   // true (R2)
  }
  sliver: { maxAspectRatio: number; minEdgeSeparationM: number }   // 100, 0.10
  defaultDisplayPrecisionM: number   // 0.001
  paperToleranceMm: number           // 0.25
  kernelVersion: string
  specRevision: string
}
```

### 7.2 Canonical values and geometry

```ts
interface LengthValue { canonicalM: number;        from: LengthEntry }
interface AreaValue   { canonicalSqm: number;      from: AreaEntry }
interface AngleValue  { canonicalDegrees: number;  from: AngleEntry }

interface CanonicalVertex {
  vertexId: VertexId
  x: number; y: number               // canonical metres, planar working frame
  fromPointId: PointId
  monumentId?: string
  preservedCollinear: boolean
}

interface CanonicalEdge {
  edgeId: EdgeId
  fromVertexId: VertexId
  toVertexId: VertexId
  lengthM: number
}

/** Only constructible after encoding, closure and validity pass. Always closed. */
interface LinearRing {
  ringId: RingId
  vertices: CanonicalVertex[]
  edges: CanonicalEdge[]
  signedAreaSqm: number
  /** Source winding PRESERVED, recorded not normalised. */
  sourceWinding: 'cw' | 'ccw'
  /** How this ring's closure was established (§3.3). */
  closureBasis: ClosureEncoding
}
```

**Edge ID stability:** `edgeId` is derived from the **source point index** at ring
creation and never reassigned. Vertex order is preserved verbatim; winding is
recorded rather than normalised. A frontage or setback reference therefore
survives any downstream reordering, and a reversed winding cannot silently move a
setback from one edge to another.

### 7.3 Canonical surfaces (H3.3)

```ts
interface Polygon {
  polygonId: string
  outer: LinearRing
  holes: LinearRing[]
}

interface MultiPolygon {
  components: Polygon[]
}
```

`LinearRing[]` cannot say whether a ring is a disconnected component or a void.
Subtracting encumbrances from an envelope can produce **both** — several buildable
components, one of which contains an inner void. Containment is therefore defined
as: inside some component's `outer` **and** outside every hole of that component.
A footprint sitting inside a void fails (fixture 36).

### 7.4 Result records

```ts
interface TraverseClosureResult {
  perimeterM: number
  misclosureM: number
  ratioDenominator: number | null    // null = perfect closure
  profileRef: string
  passesRatio: boolean
  passesAbsoluteCap: boolean
  adjustment:
    | { kind: 'none' }
    | { kind: 'professionally-adjusted'; method: string
        professional: ProfessionalRecord; approvedAt: ISODate
        evidenceRef: EvidenceId; maxEdgeLengthChangeM: number }
}

interface AreaReconciliationResult {
  computedSqm: number
  statedSqm: number | null
  differenceSqm: number | null
  /** max(floorSqm, fractionOfStated × stated, half the source precision step) — R2. */
  toleranceSqm: number | null
  toleranceBasis: 'floor' | 'percentage' | 'source-precision' | 'unknown-blocked'
  passes: boolean | null
}

interface CandidateAssembly {
  assemblyId: string
  vertices: { x: number; y: number }[]
  areaSqm: number
  shape: 'convex' | 'concave'
  isSimple: boolean
}
```

### 7.5 The resolved layer (H1)

```ts
interface ResolvedPoint {
  pointId: PointId
  x: number; y: number               // canonical metres, planar working frame
  fromSourcePointId: PointId
  monumentId?: string
  preserveCollinear: boolean
}

/** Canonical metres, but topology NOT yet proven. */
interface ResolvedPath {
  pathId: PathId
  points: ResolvedPoint[]
  closure: ClosureEncoding
  /** Present for 'repeated-first-point' encoding: the measured endpoint gap. */
  endpointGapM: number | null
}

interface ResolvedSitePlan {
  briefId: string
  workingFrame: { crsCode: string | null; isLocal: boolean }
  outerPath: ResolvedPath | null
  cadastralHolePaths: ResolvedPath[]
  encumbrancePaths: { encumbranceId: string; geometry: ResolvedFeatureGeometry | null
                      clearance: LengthValue | null }[]
  restrictionPaths: { restrictionId: string; geometry: ResolvedFeatureGeometry | null }[]
  featurePaths: { featureId: FeatureId; geometry: ResolvedFeatureGeometry | null }[]
  footprintPaths: { footprintId: string; path: ResolvedPath | null
                    holes: ResolvedPath[]; origin: FootprintOrigin }[]
  projectionPaths: { projectionId: string; path: ResolvedPath | null
                     projectionDepth: LengthValue | null
                     clearHeight: LengthValue | null }[]
  /** Still source-level: canonical edges are built by validate(), not resolve(). */
  setbacks: { setbackId: string; edges: DraftEdgeRef[]; distance: LengthValue | null
              basis: EdgeSetbackInput['basis'] }[]
  frontages: { frontageId: string; edges: DraftEdgeRef[]
               carriagewayWidth: LengthValue | null; rowWidth: LengthValue | null }[]
  levels: { readingId: string; x: number; y: number; elevation: LengthValue | null
            datum: LevelReadingDraft['datum'] }[]
  statedArea: AreaValue | null
  northRotation: AngleValue | null
  candidateAssemblies: CandidateAssembly[]
  /** Unit, frame and finiteness failures surface here, before any topology test. */
  findings: Finding[]
}

type ResolvedFeatureGeometry =
  | { geometryType: 'point';    x: number; y: number }
  | { geometryType: 'polyline'; path: ResolvedPath }
  | { geometryType: 'polygon';  path: ResolvedPath; holes: ResolvedPath[] }
```

### 7.6 The validated output — exporter-complete (H4)

```ts
/** The BRAND SYMBOL is kernel-private: not re-exported from index.ts, so no
 *  caller can name the key and forge a plan literal. The digest RECORD below is
 *  deliberately public — it is provenance a reviewer must be able to read. */
declare const KERNEL_BRAND: unique symbol

interface ValidationDigest {
  digest: string                     // hash over canonical geometry + params + version
  kernelVersion: string
  validatedAt: string
  specRevision: string
}

interface ValidatedIdentity {
  projectName: string
  pilotProfileRef: string | null
  identifiers: readonly { key: string; value: string; sourceRef: EvidenceId | null }[]
}

interface ValidatedDrawingProfile {
  displayPrecisionM: number
  displayUnit: ExactLengthUnit
  sheetRef: string | null
  declaredScaleDenominator: number | null
}

interface ValidatedFrontage {
  frontageId: string
  edges: readonly CanonicalEdge[]
  /** LengthValue, not a bare number: the drawing may need to letter a width in
   *  the unit the source used (e.g. 60'-0" from a deed in feet) — M4. */
  carriagewayWidth: LengthValue
  rowWidth: LengthValue | null
  roadName: string | null
  roadClassRef: string | null
  sourceRefs: readonly EvidenceId[]
}

interface ValidatedEncumbrance {
  encumbranceId: string
  kind: EncumbranceDraft['kind']
  surface: MultiPolygon              // point/line encumbrances buffered by clearance
  clearance: LengthValue | null
  description: string
  sourceRef: EvidenceId | null
}

interface ValidatedRestriction {
  restrictionId: string
  kindRef: string
  geometry: ValidatedFeatureGeometry | null
  description: string
  sourceRef: EvidenceId | null
}

interface ValidatedFeature {
  featureId: FeatureId
  kindRef: string
  geometry: ValidatedFeatureGeometry
  toBeRetained: boolean | null
  sourceRef: EvidenceId | null
}

type ValidatedFeatureGeometry =
  | { geometryType: 'point';    x: number; y: number }
  | { geometryType: 'polyline'; vertices: readonly CanonicalVertex[] }
  | { geometryType: 'polygon';  polygon: Polygon }

interface ValidatedLevel {
  readingId: string
  x: number; y: number
  elevation: LengthValue
  datum: 'MSL' | 'local-benchmark' | 'assumed'
  benchmarkDescription: string | null
}

interface ValidatedSetback {
  setbackId: string
  edgeIds: readonly EdgeId[]
  distance: LengthValue
  /** Recorded so the title block / notes can cite it. */
  basis: { citation: string; sourceRef: EvidenceId | null } | null
  /** True when this setback won a max() contest against overlapping inputs. */
  governsByMaximum: boolean
}

interface ValidatedFootprint {
  footprintId: string
  polygon: Polygon
  label: string | null
  storeysAboveGround: number | null
  origin: FootprintOrigin
}

interface ValidatedProjection {
  projectionId: string
  polygon: Polygon
  kind: ProjectionDraft['kind']
  attachedToFootprintId: string | null
  projectionDepth: LengthValue | null
  clearHeight: LengthValue | null
}

interface ResolvedDimension {
  dimensionId: string
  kind: DimensionRequest['kind']
  rawValue: number                   // computed from references
  displayValue: string               // rawValue under displayPrecisionM
  references: readonly GeometryRef[]
}

interface AppliedOverride {
  overrideId: string
  targetBlockerCode: BlockerCode
  professional: ProfessionalRecord
  signedAt: ISODate
  evidenceRef: EvidenceId
  reason: string
}

/** The COMPLETE, immutable exporter input. Exporters never read a draft. */
interface ValidatedSitePlan {
  readonly [KERNEL_BRAND]: ValidationDigest

  readonly identity: ValidatedIdentity
  readonly drawing: ValidatedDrawingProfile

  /** Ownership surface: outer boundary minus cadastral holes. */
  readonly plotSurface: Polygon
  readonly developableEnvelope: MultiPolygon

  readonly frontages: readonly ValidatedFrontage[]
  readonly encumbrances: readonly ValidatedEncumbrance[]
  readonly restrictions: readonly ValidatedRestriction[]
  readonly existingFeatures: readonly ValidatedFeature[]
  readonly levels: readonly ValidatedLevel[]
  readonly setbacks: readonly ValidatedSetback[]
  readonly footprints: readonly ValidatedFootprint[]
  readonly projections: readonly ValidatedProjection[]
  readonly dimensions: readonly ResolvedDimension[]

  readonly orientation: { northRotation: AngleValue; reference: 'true' | 'grid' }
  readonly plotArea: AreaReconciliationResult
  readonly closure: TraverseClosureResult | null

  readonly provenance: readonly EvidenceRecord[]
  readonly appliedOverrides: readonly AppliedOverride[]
  readonly revisions: readonly Revision[]
  readonly acknowledgedWarnings: readonly AcknowledgedWarning[]
  readonly stamp: 'ready-for-professional-review'
}

type ValidationResult =
  | { ok: true;  plan: ValidatedSitePlan; warnings: Finding[] }
  | { ok: false; stamp: 'research-draft'; blockers: Finding[]; warnings: Finding[]
      resolved?: ResolvedSitePlan }

declare function resolveSitePlan(
  draft: SitePlanBriefDraft, params: KernelParameters,
): ResolvedSitePlan

declare function validateSitePlan(
  draft: SitePlanBriefDraft, params: KernelParameters,
): ValidationResult

declare function assertExportable(
  plan: ValidatedSitePlan, expectedKernelVersion: string,
): void
```

### 7.7 Coded errors (I4)

`assertExportable` throws rather than returning, because a guard that can be
ignored is not a guard. But a thrown `Error` carries no stable code to assert
against, so tests could only check *that* it threw, not *why*. A public error class
carries the ratified code:

```ts
/** Thrown for any contract-defined failure. `code` is the ratified stable code. */
declare class KernelError extends Error {
  readonly code: BlockerCode
  readonly finding: Finding
  constructor(finding: Finding)
}
```

`assertExportable` throws `KernelError` with `code: 'E_EXPORT_DIGEST_INVALID'` when
the brand is absent, the digest does not recompute over the payload it accompanies,
or `kernelVersion` mismatches. `resolveSitePlan` and `validateSitePlan` do **not**
throw for contract failures — they return findings, because a draft being invalid is
an expected outcome, not an exceptional one.

### 7.8 Test seam for internal invariants (I2)

Fixture 28 (`E_DIMENSION_MISMATCH`) is unreachable through the public API by
design: §6.2 removes the field that could carry a wrong value, so the failure can
only originate inside the kernel. Testing it therefore requires a seam, and the
honest way to provide one is to declare it in the contract rather than let the
harness deep-import a private module:

```ts
/** Verifies every resolved dimension equals its referenced geometry within EPS.
 *  Exposed so the acceptance harness can corrupt a ResolvedDimension and prove the
 *  invariant catches it. NOT a stable public API: it exists for the harness, and
 *  the acceptance suite is the only sanctioned caller. */
declare function verifyDimensionIntegrity(
  dimensions: readonly ResolvedDimension[],
  plan: ValidatedSitePlan,
  params: KernelParameters,
): Finding[]
```

This is the one place where a test may observe kernel internals, and it is bounded
to a single invariant with a single signature.

**Honest limits of the barrier.** The `unique symbol` brand makes accidental
misuse a compile-time error — no caller can assemble a `ValidatedSitePlan`
literal, and exporter signatures accept nothing else. It is **not a security
boundary**: a deliberate `as unknown as ValidatedSitePlan`, or a
`structuredClone` that drops the symbol, defeats it. `assertExportable` therefore
performs a **runtime** check that the brand is present, the digest recomputes over
the geometry it accompanies, and `kernelVersion` matches. Stale or absent →
`E_EXPORT_DIGEST_INVALID`. Type barrier for ergonomics; digest for truth.

---

## 8. Evidence, findings, codes

```ts
interface ProfessionalRecord {
  name: string
  licenceNumber: string
  discipline: 'surveyor' | 'architect' | 'structural-engineer' | 'town-planner' | 'other'
  signatureRef?: string
}

type Actor = ProfessionalRecord | { userId: string }

interface EvidenceRecord {
  evidenceId: EvidenceId
  sourceTypeRef: string              // PENDING-MANNU (M1)
  documentId?: string
  sourceDate: ISODate | null
  originalUnit?: LengthUnitLabel | AreaUnitLabel
  statedPrecision?: number
  /** A CLAIM to validate, never a trusted fact. */
  claimedVerification: 'unverified' | 'self-declared' | 'document-attached'
                     | 'professional-verified'
  responsibleProfessional?: ProfessionalRecord
  file?: { sha256: string; storageRef: string; filename: string; bytes: number; mime: string }
}

interface ProfessionalOverride {
  overrideId: string
  targetBlockerCode: BlockerCode
  reason: string
  professional: ProfessionalRecord   // non-nullable
  signedAt: ISODate
  evidenceRef: EvidenceId
}

interface Revision {
  revisionId: string
  index: number
  issuedAt: ISODate
  issuedBy: Actor
  evidenceRef: EvidenceId | null
  changeNote: string
  supersedesRevisionId?: string
}

interface AcknowledgedWarning {
  code: WarningCode
  acknowledgedBy: Actor
  at: ISODate
  evidenceRef: EvidenceId | null
  note?: string
}

interface Finding {
  code: BlockerCode | WarningCode
  message: string
  refs?: AnyGeometryRef[]
  observed?: string
  required?: string
}
```

### 8.1 Complete code unions

```ts
type BlockerCode =
  // values, units, frames  (resolution stage)
  | 'E_VALUE_NOT_FINITE' | 'E_ANGLE_FORM_INVALID'
  | 'E_UNIT_FACTOR_UNDECLARED' | 'E_UNIT_AMBIGUOUS'
  | 'E_FRAME_UNDECLARED' | 'E_FRAME_UNPROJECTED'
  // closure encoding
  | 'E_SOURCE_PATH_OPEN' | 'E_CLOSURE_ENCODING_UNKNOWN' | 'E_CLOSURE_POINT_MISMATCH'
  // ring topology
  | 'E_RING_TOO_FEW_VERTICES' | 'E_RING_ZERO_AREA' | 'E_RING_DEGENERATE_EDGE'
  | 'E_RING_SELF_INTERSECTS' | 'E_RING_SELF_TOUCHES'
  // holes
  | 'E_HOLE_NOT_INTERIOR' | 'E_HOLE_OVERLAP'
  // traverse & reconstruction
  | 'E_TRAVERSE_MISCLOSURE' | 'E_TRAVERSE_ADJUSTMENT_UNAPPROVED'
  | 'E_CLOSURE_PROFILE_UNKNOWN' | 'E_RECONSTRUCTION_AMBIGUOUS'
  // area
  | 'E_AREA_RECONCILIATION' | 'E_AREA_PRECISION_UNKNOWN'
  // orientation
  | 'E_NORTH_ABSENT' | 'E_MAGNETIC_CONTEXT_INCOMPLETE'
  // frontage, setback, envelope
  | 'E_FRONTAGE_INCOMPLETE' | 'E_SETBACK_EDGE_UNCOVERED' | 'E_ENVELOPE_COLLAPSED'
  // proposal containment
  | 'E_FOOTPRINT_OUTSIDE_ENVELOPE' | 'E_FOOTPRINT_EDGE_CROSSES_ENVELOPE'
  | 'E_FOOTPRINT_IN_VOID' | 'E_FOOTPRINT_OVERLAP'
  // references, evidence, export
  | 'E_REF_UNRESOLVED' | 'E_EVIDENCE_UNVERIFIED' | 'E_DIMENSION_MISMATCH'
  | 'E_EXPORT_PARITY' | 'E_EXPORT_DIGEST_INVALID'
  // review gate
  | 'E_WARNING_UNACKNOWLEDGED'

type WarningCode =
  | 'W_SLIVER_REVIEW' | 'W_RECONSTRUCTED_GEOMETRY' | 'W_LOCAL_FRAME_ONLY'
  | 'W_ASSUMED_DATUM' | 'W_AREA_NEAR_TOLERANCE' | 'W_EVIDENCE_STALE'
```

Any unacknowledged warning raises `E_WARNING_UNACKNOWLEDGED` and blocks elevation.

---

## 9. Root draft type

```ts
interface IdentityDraft {
  projectName: string | null
  /** External pilot/profile reference. NO jurisdiction is hard-coded. */
  pilotProfileRef: string | null
  identifiers: { key: string; value: string; sourceRef: EvidenceId | null }[]
}

interface DrawingProfileDraft {
  displayPrecisionM: number | null
  displayUnit: ExactLengthUnit | null
  sheetRef: string | null
  declaredScaleDenominator: number | null
  requestedStamp?: 'ready-for-professional-review'
}

interface SitePlanBriefDraft {
  schemaVersion: '3.0.0-draft'
  briefId: string

  identity: IdentityDraft
  boundary: BoundaryInput | null
  statedArea: AreaEntry | null
  orientation: OrientationInput

  roadFrontages: RoadFrontageDraft[]
  /** Sole authoritative location for ownership voids (§4.1). */
  cadastralHoles: CadastralHoleDraft[]
  encumbrances: EncumbranceDraft[]
  restrictions: RestrictionDraft[]
  levels: LevelReadingDraft[]
  existingFeatures: ExistingFeatureDraft[]

  setbacks: EdgeSetbackInput[]
  footprints: FootprintDraft[]
  projections: ProjectionDraft[]
  dimensions: DimensionRequest[]

  drawing: DrawingProfileDraft
  evidence: EvidenceRecord[]
  overrides: ProfessionalOverride[]
  revisions: Revision[]
  acknowledgedWarnings: AcknowledgedWarning[]

  // NO status field. Validation returns findings.
}
```

---

## 10. Resolution of Sol 002

| Item | Resolution | Where |
|---|---|---|
| **H1** type-complete | `ResolvedSitePlan`, `ResolvedPath`, `ResolvedPoint`, `ResolvedFeatureGeometry`, `KernelParameters`, `ClosureProfile`, `EdgeId`, `CanonicalEdge`, `ValidatedFrontage`, `ValidatedEncumbrance`, `ValidatedRestriction`, `ValidatedFeature`, `ValidatedFeatureGeometry`, `ValidatedLevel`, `ValidatedSetback`, `ValidatedFootprint`, `ValidatedProjection`, `CandidateAssembly`, `AppliedOverride`, `Actor`, `IdentityDraft`, `DrawingProfileDraft` all defined. §16 is the full inventory; no name is referenced undefined. | §7, §16 |
| **H2** closure encoding | `ClosureEncoding` discriminated union replaces two booleans; three distinct closure claims separated in a table; closed-flag and explicit-closing-segment accepted **without** endpoint coincidence; coincidence tested only for repeated-point encoding; three specific codes | §3.3–3.4 |
| **H3** ownership & surfaces | (1) root `cadastralHoles` is the sole home; importer pre-fills and keeps no copy. (2) `geometryType` discriminant added; `PolygonDraft` carries holes so it is no longer structurally identical to `PolylineDraft`. (3) `Polygon`/`MultiPolygon` defined and used for `plotSurface`, `developableEnvelope` and containment; footprint-in-void fails with `E_FOOTPRINT_IN_VOID` | §3.5, §4.1, §7.3 |
| **H4** exporter-complete | `ValidatedSitePlan` now carries identity, drawing profile, plotSurface, envelope, frontages, encumbrances, restrictions, features, levels, setbacks (with bases), footprints (with origin), projections, dimensions, orientation, area, closure, provenance, applied overrides, revisions, acknowledgements. Exporters never read a draft. | §7.6 |
| **fix 1** chain/link | `chain-gunter`/`link-gunter` exact; `chain-unspecified`/`link-unspecified`/`karam`/`jarib`/`gaz-local` are `VariableLengthUnit` requiring `DeclaredLengthFactor` with its own `sourceRef` | §2.1, §2.4 |
| **fix 2** source-bearing points | `TraverseBoundary.startPoint: PointDraft`; `known-coordinate` disambiguation carries `PointDraft` | §4.1, §4.2 |
| **fix 3** invalid values | `E_VALUE_NOT_FINITE`, `E_ANGLE_FORM_INVALID`; both evaluated at resolution before any geometry operation | §2.5, §8.1 |
| **fix 4** generated provenance | `FootprintOrigin` discriminated; `'generated'` requires `generator: { name, version }` | §6.1 |

---

## 10.1 Resolution of Sol's executability audit (ledger 011)

| Item | Resolution | Where |
|---|---|---|
| **I1** draft reference IDs not constructible | Root cause: `EdgeId` is a *derived* value, so admitting it into a draft violated G2. Added `SourceEdgeRef` / `SourceGeometryRef` / `AnyGeometryRef`; draft frontages, setbacks and dimensions now reference endpoint pairs and paths. Non-existent or non-adjacent points → `E_REF_UNRESOLVED`. `ResolvedSitePlan` also stays source-level, since edges are built by `validate()`, not `resolve()`. Preferred option (a); no derivation rule is exposed to callers. | §3.6, §6, §7.5 |
| **I2** fixture 28 has no seam | `verifyDimensionIntegrity(dimensions, plan, params): Finding[]` declared in the contract as a bounded, sanctioned test seam — better than permitting deep imports, because it is explicit, reviewable and limited to one invariant. | §7.8 |
| **I3** fixture 29 outside this package | Phase scope amended to **37 fixtures + 3 guardrails** (1–28, 30–39). Fixture 29 becomes a named mandatory exporter-phase gate, not a `todo`. Kernel phase must not claim 39/39. | §11.1 |
| **I4** export-gate failure underspecified | Public `KernelError` class carrying `code: BlockerCode` and the `Finding`. `assertExportable` throws it with `E_EXPORT_DIGEST_INVALID`; `resolve`/`validate` still return findings rather than throwing, since an invalid draft is expected, not exceptional. | §7.7 |
| non-blocking | `ValidationDigest` is intentionally public (it is provenance a reviewer must read); only the brand *symbol* is private. Comment rewritten so the two are no longer conflated. | §7.6 |

---

## 10.2 Resolution of Sol's route-completeness audit (ledger 013)

| Item | Resolution | Where |
|---|---|---|
| **J1** draft edge refs cover only path-based routes | Root cause: I fixed the leak on the route I was looking at rather than at the abstraction — third occurrence of one mistake. `DraftEdgeRef` and `DraftVertexRef` now cover all three source routes (`path-edge`/`path-point`, `traverse-leg`/`traverse-station`, `reconstructed-side`/`reconstructed-corner`), used by frontages, setbacks, dimensions and `ResolvedSitePlan`. Cross-route references rejected with `E_REF_UNRESOLVED`. Setback coverage is stated as route-relative so fixture 8 can pass. §3.6 states the invariant once, for every route, rather than per-route. | §3.6, §6, §7.5 |
| **J2** in-scope fixture count | Confirmed by arithmetic: 1–28 is 28 and 30–39 is 10, so **38**, not 37. Corrected in this document and `kernel/README.md`. Nothing dropped to make the count fit. | §11.1 |

Note: Sol flagged edges; the identical hole existed for **vertex** references
(`source-point` also required a `PathId`), so dimensions to a traverse station were
equally unconstructible. Fixed in the same pass rather than waiting for a fourth
round on the same root cause.

---

## 11. Fixture coverage matrix (fixtures 1–39)

| # | Fixture | Represented by | Expected outcome |
|---|---|---|---|
| 1 | Axis-aligned rectangle | `coordinates`, 4 pts, `closure: closed-flag` | PASS |
| 2 | Rotated rect + explicit north | + `explicit-rotation` | PASS |
| 3 | Irregular convex quad | `coordinates` | PASS |
| 4 | Concave >4 vertices | `coordinates` | PASS |
| 5 | Preserved collinear monument | `SourcePoint.preserveCollinear=true` | PASS, vertex retained |
| 6 | One inner exclusion | `cadastralHoles[0]` | PASS |
| 7 | Multiple road edges | `roadFrontages[].edges: DraftEdgeRef[]`, >1 frontage | PASS |
| 8 | Traverse at closure threshold | `traverse` + `closureProfileRef`; setbacks via `traverse-leg` refs | PASS |
| 9 | Area difference at threshold | `statedArea` + `statedPrecision` | PASS |
| 10 | Footprint on setback line | `footprints` + `setbacks[].edges` | PASS |
| 11 | Unit-equivalent m/ft/gaj | `unit` on entries | PASS, identical canonical |
| 12 | Open / over-tolerance closure | `closure: open` \| `unknown` \| repeated-point mismatch | `E_SOURCE_PATH_OPEN` / `E_CLOSURE_ENCODING_UNKNOWN` / `E_CLOSURE_POINT_MISMATCH` + gap |
| 13 | Traverse worse than profile | `traverse` | `E_TRAVERSE_MISCLOSURE` |
| 14 | Fewer than 3 distinct vertices | `points.length < 3` | `E_RING_TOO_FEW_VERTICES` |
| 15 | All-collinear | collinear points, zero area | `E_RING_ZERO_AREA` |
| 16 | Duplicate point / zero-length edge | consecutive equal points | `E_RING_DEGENERATE_EDGE` |
| 17 | Bow-tie | crossing edges | `E_RING_SELF_INTERSECTS` |
| 18 | Self-touch / spike | touching non-adjacent edges | `E_RING_SELF_TOUCHES` |
| 19 | Hole outside/touching exterior | `cadastralHoles[]` | `E_HOLE_NOT_INTERIOR` |
| 20 | Two holes overlapping | two `cadastralHoles` | `E_HOLE_OVERLAP` |
| 21 | Area mismatch above tolerance | `statedArea` | `E_AREA_RECONCILIATION` |
| 22 | Missing north basis | `basis='absent'` or local frame | `E_NORTH_ABSENT` |
| 23 | Frontage w/o edge or width source | `edges=[]` / `sourceRef=null` | `E_FRONTAGE_INCOMPLETE` |
| 24 | Footprint vertex outside envelope | `footprints[]` | `E_FOOTPRINT_OUTSIDE_ENVELOPE` |
| 25 | Segment crossing concave envelope | concave outer + spanning footprint | `E_FOOTPRINT_EDGE_CROSSES_ENVELOPE` |
| 26 | Two overlapping footprints | two `footprints` | `E_FOOTPRINT_OVERLAP` |
| 27 | Setback leaves no envelope | large `setbacks.distance` | `E_ENVELOPE_COLLAPSED` |
| 28 | Dimension text ≠ geometry | `verifyDimensionIntegrity` seam (§7.8) | `E_DIMENSION_MISMATCH` |
| 29 | DXF/PDF parity | *deferred to the exporter phase — see §11.1* | `E_EXPORT_PARITY` |
| 30 | Unverified source requesting elevation | `requestedStamp` + `claimedVerification='unverified'` | `E_EVIDENCE_UNVERIFIED` |
| 31 | Narrow valid sliver | `coordinates`, high aspect | `W_SLIVER_REVIEW`, blocks until acknowledged |
| 32 | Deed conflict resolved by override | `overrides[0]` → `appliedOverrides` | PASS with recorded override |
| 33 | Magnetic north, no observation date | `magnetic.observationDate=null` | `E_MAGNETIC_CONTEXT_INCOMPLETE` |
| 34 | Reconstruction ambiguous | `disambiguation=null`; setbacks via `reconstructed-side` refs | `E_RECONSTRUCTION_AMBIGUOUS` + candidates |
| **35** | 4-pt polygon, closed flag, no repeated first point | `closure: { kind: 'closed-flag' }` | **PASS** — coincidence not required |
| **36** | Subtraction → multiple components + inner void; footprint in void | `MultiPolygon` envelope; `Polygon.holes` | roles preserved; `E_FOOTPRINT_IN_VOID` |
| **37** | Non-finite coordinate or measurement | any `number` field = NaN/±∞ | `E_VALUE_NOT_FINITE` at resolution |
| **38** | Angle with both/neither form, or non-finite | `AngleEntry` | `E_ANGLE_FORM_INVALID` |
| **39** | Ambiguous/non-Gunter chain or link | `unit='chain-unspecified'`, no `declaredFactor` | `E_UNIT_FACTOR_UNDECLARED` |

### 11.1 Phase scope, and the one deferral (I3)

**38** of the 39 fixtures are executable **in the kernel phase**: 1–28 (28) and
30–39 (10), plus Sol's three guardrails. Only one is deferred:

- **28** is executable now, through the `verifyDimensionIntegrity` seam (§7.8).
- **29 is genuinely deferred.** It needs a DXF *and* a PDF artifact to diff, and no
  exporter exists — defining an exporter seam now would be speculative design ahead
  of M4 (drawing conventions), which is exactly the guessing this contract exists to
  prevent.

Sol's point that a passing `todo` would be false coverage is accepted. Fixture 29 is
therefore recorded as a **named, mandatory exporter-phase gate**, not a skipped
test: the exporter phase cannot be declared complete without it, and the kernel
phase must not report 39/39 coverage. Kernel-phase coverage is **38 fixtures + 3
guardrails** (my v4 said 37 — an arithmetic error Sol caught; nothing was dropped to
make it fit), stated in `kernel/README.md` §7.

---

## 12. PENDING-MANNU register

| # | Open item | Blocks | Lands in |
|---|---|---|---|
| M1 | Documents owners hold; which satisfy the verification gate | elevation | `sourceTypeRef` vocabulary + gate policy |
| M2 | Local length/area units and legal factors (incl. karam, jarib, bigha) | unit conversion | `DeclaredLengthFactor` / `DeclaredAreaFactor` defaults |
| M3 | Survey instrument/method classes in actual use | closure thresholds | `ClosureProfile` registry |
| M4 | Accepted site-plan conventions (title block, dim style, precision, sheet, scale) | drawing profile only | `ValidatedDrawingProfile` defaults |
| M5 | Mandatory plot identifiers for DTCP submission | identity completeness | `IdentityDraft.identifiers` required set |
| M6 | Road class vocabulary; whether ROW ≠ carriageway matters | frontage completeness | `roadClassRef` |
| M7 | Restriction / existing-feature vocabularies | warnings only | `kindRef` |
| M8 | Which blockers a professional may override, with what signature | override policy | override policy table |
| M9 | Whether survey files may leave our servers | DWG route only | `dwg-conversion-research.md` |

None of M1–M9 touches §3, §4.2, §7.2, §7.3 or §6.2.

---

## 13. Exit-criteria status

| Sol §12 criterion | State |
|---|---|
| 1. Thresholds agreed or objected | Done (v1 §14); R1–R3 approved and folded in |
| 2. Every fixture representable without invented values | Done — 1–39 at correct layers (§11) |
| 3. One deterministic result + stable code per test | Done — full unions (§8.1) + matrix (§11) |
| 4. PENDING-MANNU isolated from geometry | Done (§12) |
| 5. Implementation begins only after both docs agree | Awaiting Sol ratification |

---

## 16. Type inventory (H1 completeness check)

Every type defined in this document. Nothing referenced is undefined.

**Aliases:** `EvidenceId` `ISODate` `PathId` `PointId` `VertexId` `EdgeId`
`RingId` `FeatureId`

**Units:** `ExactLengthUnit` `VariableLengthUnit` `LengthUnitLabel`
`ExactAreaUnit` `VariableAreaUnit` `AreaUnitLabel` `DeclaredLengthFactor`
`DeclaredAreaFactor`

**Draft entries:** `LengthEntry` `AreaEntry` `AngleEntry`

**Raw geometry:** `CoordinateFrame` `SourcePoint` `ClosureEncoding` `SourcePath`
`PointDraft` `PolylineDraft` `PolygonDraft` `FeatureGeometryDraft`
`SourceEdgeRef` `DraftEdgeRef` `DraftVertexRef` `SourceGeometryRef` `AnyGeometryRef`

**Boundary routes:** `BoundaryInput` `ImportedFileBoundary` `UnitDetection`
`CoordinateBoundary` `TraverseBoundary` `TraverseLeg` `ReconstructedBoundary`
`DiagonalEntry` `DisambiguationEvidence`

**Orientation:** `OrientationInput` `MagneticContext`

**Draft content:** `RoadFrontageDraft` `CadastralHoleDraft` `EncumbranceDraft`
`RestrictionDraft` `LevelReadingDraft` `ExistingFeatureDraft` `EdgeSetbackInput`
`FootprintOrigin` `FootprintDraft` `ProjectionDraft` `DimensionRequest`
`GeometryRef` `IdentityDraft` `DrawingProfileDraft` `SitePlanBriefDraft`

**Kernel params:** `ClosureProfile` `KernelParameters`

**Canonical:** `LengthValue` `AreaValue` `AngleValue` `CanonicalVertex`
`CanonicalEdge` `LinearRing` `Polygon` `MultiPolygon`

**Results:** `TraverseClosureResult` `AreaReconciliationResult` `CandidateAssembly`

**Resolved layer:** `ResolvedPoint` `ResolvedPath` `ResolvedFeatureGeometry`
`ResolvedSitePlan`

**Validated layer:** `ValidationDigest` `ValidatedIdentity`
`ValidatedDrawingProfile` `ValidatedFrontage` `ValidatedEncumbrance`
`ValidatedRestriction` `ValidatedFeature` `ValidatedFeatureGeometry`
`ValidatedLevel` `ValidatedSetback` `ValidatedFootprint` `ValidatedProjection`
`ResolvedDimension` `AppliedOverride` `ValidatedSitePlan` `ValidationResult`

**Evidence & findings:** `ProfessionalRecord` `Actor` `EvidenceRecord`
`ProfessionalOverride` `Revision` `AcknowledgedWarning` `Finding` `BlockerCode`
`WarningCode`

**Functions:** `resolveSitePlan` `validateSitePlan` `assertExportable`
`verifyDimensionIntegrity`
**Classes:** `KernelError`
**Symbol:** `KERNEL_BRAND`
