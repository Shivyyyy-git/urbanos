// ---------------------------------------------------------------------------
// UrbanOS geometry kernel — RATIFIED CONTRACT TYPES.
//
// MECHANICALLY EXTRACTED from collab/SitePlanBrief.md v3, ratified by Sol on
// 2026-07-25 (collab/SitePlanBrief-ratification-Sol.md). Do not hand-edit: change
// the spec, get it re-ratified, then re-extract. This file contains TYPES ONLY —
// zero logic — so it cannot encode a behavioural decision the spec did not make.
//
// Regenerate: python3 tools/extract-contract.py
// ---------------------------------------------------------------------------
import type { KERNEL_BRAND } from './brand.ts'

export type EvidenceId = string
export type ISODate    = string          // 'YYYY-MM-DD'
export type PathId     = string
export type PointId    = string
export type VertexId   = string
export type EdgeId     = string          // see §7.2 for derivation and stability
export type RingId     = string
export type FeatureId  = string

/** Exact, universal conversions. */
export type ExactLengthUnit = 'm' | 'mm' | 'cm' | 'km' | 'ft' | 'in' | 'yd'
                     | 'chain-gunter' | 'link-gunter'

/** No single legal value — requires a declared, evidence-backed factor.
 *  karam and jarib appear in Punjab/Haryana revenue records; a source that says
 *  only "chain" or "link" without naming Gunter's lands here (fix 1, fixture 39). */
export type VariableLengthUnit = 'chain-unspecified' | 'link-unspecified'
                        | 'karam' | 'jarib' | 'gaz-local'

export type LengthUnitLabel = ExactLengthUnit | VariableLengthUnit

export type ExactAreaUnit    = 'sqm' | 'sqft' | 'sqyd' | 'gaj' | 'acre' | 'hectare'
export type VariableAreaUnit = 'bigha' | 'biswa' | 'marla' | 'kanal' | 'killa'
export type AreaUnitLabel    = ExactAreaUnit | VariableAreaUnit

export interface DeclaredLengthFactor { mPerUnit: number; sourceRef: EvidenceId }
export interface DeclaredAreaFactor   { sqmPerUnit: number; sourceRef: EvidenceId }

export interface LengthEntry {
  asEntered: number
  unit: LengthUnitLabel
  declaredFactor?: DeclaredLengthFactor      // required iff unit is variable
  statedPrecision?: number                   // precision the SOURCE claims
  sourceRef: EvidenceId | null
}

export interface AreaEntry {
  asEntered: number
  unit: AreaUnitLabel
  declaredFactor?: DeclaredAreaFactor        // required iff unit is variable
  statedPrecision?: number
  sourceRef: EvidenceId | null
}

/** Exactly one of decimalDegrees / dms must be present. Both or neither yields
 *  E_ANGLE_FORM_INVALID (fix 3, fixture 38). */
export interface AngleEntry {
  decimalDegrees?: number
  dms?: { d: number; m: number; s: number; sign: 1 | -1 }
  reference: 'true' | 'grid' | 'magnetic'
  sourceRef: EvidenceId | null
}

export type CoordinateFrame =
  | { kind: 'planar'; axisUnit: ExactLengthUnit; crsCode: string | null
      isLocal: boolean; sourceRef: EvidenceId | null }
  | { kind: 'geographic'; crsCode: string
      projectionToPlanar: { targetCrsCode: string; sourceRef: EvidenceId } | null }

export interface SourcePoint {
  pointId: PointId
  /** Axis values AS RECORDED, in the frame's own axisUnit. Not metres. */
  axis1: number                     // easting / longitude
  axis2: number                     // northing / latitude
  monumentId?: string
  /** Forbids the kernel from simplifying this point away when collinear. */
  preserveCollinear?: boolean
  sourceRef: EvidenceId | null
}

export type ClosureEncoding =
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

export interface SourcePath {
  pathId: PathId
  frame: CoordinateFrame
  /** Every point the source lists, in source order, verbatim. */
  points: SourcePoint[]
  closure: ClosureEncoding
}

export interface PointDraft {
  geometryType: 'point'
  featureId: FeatureId
  frame: CoordinateFrame
  axis1: number
  axis2: number
  sourceRef: EvidenceId | null
}

export interface PolylineDraft {
  geometryType: 'polyline'
  featureId: FeatureId
  path: SourcePath                  // closure.kind expected 'open'
}

export interface PolygonDraft {
  geometryType: 'polygon'
  featureId: FeatureId
  path: SourcePath                  // closure.kind must admit a ring
  holes: SourcePath[]
}

export type FeatureGeometryDraft = PointDraft | PolylineDraft | PolygonDraft

/** An edge of a path, named by its two endpoints. UNORDERED: the kernel matches
 *  either orientation. The points must be ADJACENT in that path. */
export interface SourceEdgeRef {
  pathId: PathId
  fromPointId: PointId
  toPointId: PointId
}

/** An edge, in whatever terms the active route provides. `path-edge` may name any
 *  path in the brief (boundary, footprint, encumbrance); the other two name
 *  boundary edges specifically. */
export type DraftEdgeRef =
  | { kind: 'path-edge';           edge: SourceEdgeRef }
  | { kind: 'traverse-leg';        legId: string }
  | { kind: 'reconstructed-side';  sideIndex: 0 | 1 | 2 | 3 }

/** A vertex, likewise. */
export type DraftVertexRef =
  | { kind: 'path-point';           pathId: PathId; pointId: PointId }
  | { kind: 'traverse-station';     legId: string; end: 'start' | 'end' }
  | { kind: 'reconstructed-corner'; vertexIndex: 0 | 1 | 2 | 3 }

/** What a draft may point at. */
export type SourceGeometryRef =
  | { kind: 'vertex';       ref: DraftVertexRef }
  | { kind: 'edge';         ref: DraftEdgeRef }
  | { kind: 'boundary' }                            // the whole outer boundary
  | { kind: 'feature-path'; pathId: PathId }        // a non-boundary path

/** Findings are raised at both stages, so they may cite either form. */
export type AnyGeometryRef = SourceGeometryRef | GeometryRef

export type BoundaryInput =
  | ImportedFileBoundary | CoordinateBoundary | TraverseBoundary | ReconstructedBoundary

export interface ImportedFileBoundary {
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
export interface UnitDetection {
  insunitsRaw: number | null        // includes 0 = unitless
  interpretedAs: ExactLengthUnit | null
  confirmedBy: EvidenceId | null    // an explicit human confirmation
  state: 'confirmed' | 'ambiguous' | 'absent'
}

export interface CoordinateBoundary {
  route: 'coordinates'
  outerPath: SourcePath | null
}

export interface TraverseBoundary {
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

export interface TraverseLeg {
  legId: string
  bearing: AngleEntry | null
  distance: LengthEntry | null
}

export interface TraverseAdjustmentApproval {
  /** Professionally adjusted, explicitly closed station path. */
  adjustedPath: SourcePath
  /** Named exactly as stated by the approving professional; PENDING-MANNU M3. */
  method: string
  professional: ProfessionalRecord
  approvedAt: ISODate
  evidenceRef: EvidenceId
}

export interface ReconstructedBoundary {
  route: 'reconstructed'
  /** Ordered sides V0→V1→V2→V3→V0. Quadrilateral only. */
  sides: [LengthEntry | null, LengthEntry | null, LengthEntry | null, LengthEntry | null]
  diagonals: DiagonalEntry[]                 // ≥1; two removes most ambiguity
  disambiguation: DisambiguationEvidence | null
}

export interface DiagonalEntry {
  fromVertexIndex: 0 | 1 | 2 | 3
  toVertexIndex: 0 | 1 | 2 | 3
  length: LengthEntry
}

export type DisambiguationEvidence =
  | { kind: 'second-diagonal'; diagonal: DiagonalEntry }
  | { kind: 'interior-angle'; atVertexIndex: 0 | 1 | 2 | 3; angle: AngleEntry }
  | { kind: 'known-coordinate'; vertexIndex: 0 | 1 | 2 | 3; point: PointDraft }  // fix 2
  | { kind: 'bearing-of-side'; sideIndex: 0 | 1 | 2 | 3; bearing: AngleEntry }
  | { kind: 'verified-sketch'; sourceRef: EvidenceId; chosenAssemblyId: string }

export type OrientationInput =
  | { basis: 'georeferenced-crs'; crs: CoordinateFrame }   // planar, isLocal === false
  | { basis: 'explicit-rotation'; northRotation: AngleEntry; magnetic?: MagneticContext }
  | { basis: 'absent' }

export interface MagneticContext {
  observationDate: ISODate | null
  declination: AngleEntry | null
  modelOrSource: string | null       // e.g. 'IGRF-14'
}

export interface RoadFrontageDraft {
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
export interface CadastralHoleDraft {
  holeId: string
  path: SourcePath
  description?: string
  importJobId?: string
  sourceRef: EvidenceId | null
}

/** A burden ON owned land. Counts toward area; constrains the envelope. */
export interface EncumbranceDraft {
  encumbranceId: string
  kind: 'easement' | 'right-of-way' | 'no-build-zone' | 'service-corridor'
      | 'water-body-buffer' | 'other'
  geometry: FeatureGeometryDraft | null
  clearance?: LengthEntry            // applied around point/line encumbrances
  description: string
  sourceRef: EvidenceId | null
}

export interface RestrictionDraft {
  restrictionId: string
  kindRef: string                    // PENDING-MANNU (M7)
  geometry: FeatureGeometryDraft | null
  description: string
  sourceRef: EvidenceId | null
}

export interface LevelReadingDraft {
  readingId: string
  location: PointDraft               // source-bearing (fix 2 / clarification 5)
  elevation: LengthEntry | null
  datum: 'MSL' | 'local-benchmark' | 'assumed' | null
  benchmark?: { description: string; location: PointDraft; sourceRef: EvidenceId | null }
}

export interface ExistingFeatureDraft {
  featureId: FeatureId
  kindRef: string                    // PENDING-MANNU (M7)
  geometry: FeatureGeometryDraft | null
  toBeRetained: boolean | null
  sourceRef: EvidenceId | null
}

export interface EdgeSetbackInput {
  setbackId: string
  edges: DraftEdgeRef[]
  distance: LengthEntry | null
  basis: { citation: string; sourceRef: EvidenceId | null } | null
}

/** 'generated' REQUIRES generator identity — an optional generator cannot prove
 *  provenance (fix 4). */
export type FootprintOrigin =
  | { kind: 'user-drawn'; sourceRef: EvidenceId | null }
  | { kind: 'surveyed-existing'; sourceRef: EvidenceId }
  | { kind: 'generated'; generator: { name: string; version: string } }

export interface FootprintDraft {
  footprintId: string
  path: SourcePath | null
  holes: SourcePath[]
  label?: string
  storeysAboveGround?: number
  origin: FootprintOrigin
}

export interface ProjectionDraft {
  projectionId: string
  kind: 'balcony' | 'chajja' | 'canopy' | 'porch' | 'ramp' | 'basement'
      | 'staircase' | 'other'
  path: SourcePath | null
  attachedToFootprintId: string | null
  projectionDepth?: LengthEntry
  clearHeight?: LengthEntry
}

export interface DimensionRequest {
  dimensionId: string
  kind: 'aligned' | 'linear' | 'chain' | 'area' | 'angle'
  /** Source-level (§3.6): a caller cannot name a canonical edge. */
  references: SourceGeometryRef[]
  witnessPoints?: { axis1: number; axis2: number; frame: CoordinateFrame }[]
  offset?: number                    // placement only; cannot affect the value
  // NO text, value or override field exists.
}

export type GeometryRef =
  | { kind: 'vertex'; id: VertexId }
  | { kind: 'edge';   id: EdgeId }
  | { kind: 'ring';   id: RingId }

export interface ClosureProfile {
  profileRef: string                 // 'total-station-1:10000'
  minRatioDenominator: number        // 10000
  maxAbsoluteMisclosureM: number     // 0.020
  methodDescription: string
  sourceRef: EvidenceId | null
}

export interface KernelParameters {
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

export interface LengthValue { canonicalM: number;        from: LengthEntry }
export interface AreaValue   { canonicalSqm: number;      from: AreaEntry }
export interface AngleValue  { canonicalDegrees: number;  from: AngleEntry }

export interface CanonicalVertex {
  vertexId: VertexId
  x: number; y: number               // canonical metres, planar working frame
  fromPointId: PointId
  monumentId?: string
  preservedCollinear: boolean
}

export interface CanonicalEdge {
  edgeId: EdgeId
  fromVertexId: VertexId
  toVertexId: VertexId
  lengthM: number
}

/** Only constructible after encoding, closure and validity pass. Always closed. */
export interface LinearRing {
  ringId: RingId
  vertices: CanonicalVertex[]
  edges: CanonicalEdge[]
  signedAreaSqm: number
  /** Source winding PRESERVED, recorded not normalised. */
  sourceWinding: 'cw' | 'ccw'
  /** How this ring's closure was established (§3.3). */
  closureBasis: ClosureEncoding
}

export interface Polygon {
  polygonId: string
  outer: LinearRing
  holes: LinearRing[]
}

export interface MultiPolygon {
  components: Polygon[]
}

export interface TraverseClosureResult {
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

export interface AreaReconciliationResult {
  computedSqm: number
  statedSqm: number | null
  differenceSqm: number | null
  /** max(floorSqm, fractionOfStated × stated, half the source precision step) — R2. */
  toleranceSqm: number | null
  toleranceBasis: 'floor' | 'percentage' | 'source-precision' | 'unknown-blocked'
  passes: boolean | null
}

export interface CandidateAssembly {
  assemblyId: string
  vertices: { x: number; y: number }[]
  areaSqm: number
  shape: 'convex' | 'concave'
  isSimple: boolean
}

export interface ResolvedPoint {
  pointId: PointId
  x: number; y: number               // canonical metres, planar working frame
  fromSourcePointId: PointId
  monumentId?: string
  preserveCollinear: boolean
}

/** Canonical metres, but topology NOT yet proven. */
export interface ResolvedPath {
  pathId: PathId
  points: ResolvedPoint[]
  closure: ClosureEncoding
  /** Present for 'repeated-first-point' encoding: the measured endpoint gap. */
  endpointGapM: number | null
}

export interface ResolvedSitePlan {
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

export type ResolvedFeatureGeometry =
  | { geometryType: 'point';    x: number; y: number }
  | { geometryType: 'polyline'; path: ResolvedPath }
  | { geometryType: 'polygon';  path: ResolvedPath; holes: ResolvedPath[] }

/** The BRAND SYMBOL is kernel-private: not re-exported from index.ts, so no
 *  caller can name the key and forge a plan literal. The digest RECORD below is
 *  deliberately public — it is provenance a reviewer must be able to read. */

export interface ValidationDigest {
  digest: string                     // hash over canonical geometry + params + version
  kernelVersion: string
  validatedAt: string
  specRevision: string
}

export interface ValidatedIdentity {
  projectName: string
  pilotProfileRef: string | null
  identifiers: readonly { key: string; value: string; sourceRef: EvidenceId | null }[]
}

export interface ValidatedDrawingProfile {
  displayPrecisionM: number
  displayUnit: ExactLengthUnit
  sheetRef: string | null
  declaredScaleDenominator: number | null
}

export interface ValidatedFrontage {
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

export interface ValidatedEncumbrance {
  encumbranceId: string
  kind: EncumbranceDraft['kind']
  surface: MultiPolygon              // point/line encumbrances buffered by clearance
  clearance: LengthValue | null
  description: string
  sourceRef: EvidenceId | null
}

export interface ValidatedRestriction {
  restrictionId: string
  kindRef: string
  geometry: ValidatedFeatureGeometry | null
  description: string
  sourceRef: EvidenceId | null
}

export interface ValidatedFeature {
  featureId: FeatureId
  kindRef: string
  geometry: ValidatedFeatureGeometry
  toBeRetained: boolean | null
  sourceRef: EvidenceId | null
}

export type ValidatedFeatureGeometry =
  | { geometryType: 'point';    x: number; y: number }
  | { geometryType: 'polyline'; vertices: readonly CanonicalVertex[] }
  | { geometryType: 'polygon';  polygon: Polygon }

export interface ValidatedLevel {
  readingId: string
  x: number; y: number
  elevation: LengthValue
  datum: 'MSL' | 'local-benchmark' | 'assumed'
  benchmarkDescription: string | null
}

export interface ValidatedSetback {
  setbackId: string
  edgeIds: readonly EdgeId[]
  distance: LengthValue
  /** Recorded so the title block / notes can cite it. */
  basis: { citation: string; sourceRef: EvidenceId | null } | null
  /** True when this setback won a max() contest against overlapping inputs. */
  governsByMaximum: boolean
}

export interface ValidatedFootprint {
  footprintId: string
  polygon: Polygon
  label: string | null
  storeysAboveGround: number | null
  origin: FootprintOrigin
}

export interface ValidatedProjection {
  projectionId: string
  polygon: Polygon
  kind: ProjectionDraft['kind']
  attachedToFootprintId: string | null
  projectionDepth: LengthValue | null
  clearHeight: LengthValue | null
}

export interface ResolvedDimension {
  dimensionId: string
  kind: DimensionRequest['kind']
  rawValue: number                   // computed from references
  displayValue: string               // rawValue under displayPrecisionM
  references: readonly GeometryRef[]
}

export interface AppliedOverride {
  overrideId: string
  targetBlockerCode: BlockerCode
  professional: ProfessionalRecord
  signedAt: ISODate
  evidenceRef: EvidenceId
  reason: string
}

/** The COMPLETE, immutable exporter input. Exporters never read a draft. */
export interface ValidatedSitePlan {
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

export type ValidationResult =
  | { ok: true;  plan: ValidatedSitePlan; warnings: Finding[] }
  | { ok: false; stamp: 'research-draft'; blockers: Finding[]; warnings: Finding[]
      resolved?: ResolvedSitePlan }




/** Thrown for any contract-defined failure. `code` is the ratified stable code. */

/** Verifies every resolved dimension equals its referenced geometry within EPS.
 *  Exposed so the acceptance harness can corrupt a ResolvedDimension and prove the
 *  invariant catches it. NOT a stable public API: it exists for the harness, and
 *  the acceptance suite is the only sanctioned caller. */

export interface ProfessionalRecord {
  name: string
  licenceNumber: string
  discipline: 'surveyor' | 'architect' | 'structural-engineer' | 'town-planner' | 'other'
  signatureRef?: string
}

export type Actor = ProfessionalRecord | { userId: string }

export interface EvidenceRecord {
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

export interface ProfessionalOverride {
  overrideId: string
  targetBlockerCode: BlockerCode
  reason: string
  professional: ProfessionalRecord   // non-nullable
  signedAt: ISODate
  evidenceRef: EvidenceId
}

export interface Revision {
  revisionId: string
  index: number
  issuedAt: ISODate
  issuedBy: Actor
  evidenceRef: EvidenceId | null
  changeNote: string
  supersedesRevisionId?: string
}

export interface AcknowledgedWarning {
  code: WarningCode
  acknowledgedBy: Actor
  at: ISODate
  evidenceRef: EvidenceId | null
  note?: string
}

export interface Finding {
  code: BlockerCode | WarningCode
  message: string
  refs?: AnyGeometryRef[]
  observed?: string
  required?: string
}

export type BlockerCode =
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
  | 'E_WARNING_UNACKNOWLEDGED' | 'E_REVIEW_REQUEST_ABSENT'
  | 'E_IDENTITY_INCOMPLETE' | 'E_DRAWING_PROFILE_INCOMPLETE'
  | 'E_EVIDENCE_INCOMPLETE' | 'E_GEOMETRY_INCOMPLETE'
  | 'E_DIMENSION_REQUEST_INVALID' | 'E_VALUE_OUT_OF_RANGE'
  | 'E_IDENTIFIER_DUPLICATE' | 'E_KERNEL_PARAMETERS_INVALID'

export type WarningCode =
  | 'W_SLIVER_REVIEW' | 'W_RECONSTRUCTED_GEOMETRY' | 'W_LOCAL_FRAME_ONLY'
  | 'W_ASSUMED_DATUM' | 'W_AREA_NEAR_TOLERANCE' | 'W_EVIDENCE_STALE'

export interface IdentityDraft {
  projectName: string | null
  /** External pilot/profile reference. NO jurisdiction is hard-coded. */
  pilotProfileRef: string | null
  identifiers: { key: string; value: string; sourceRef: EvidenceId | null }[]
}

export interface DrawingProfileDraft {
  displayPrecisionM: number | null
  displayUnit: ExactLengthUnit | null
  sheetRef: string | null
  declaredScaleDenominator: number | null
  requestedStamp?: 'ready-for-professional-review'
}

export interface SitePlanBriefDraft {
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
