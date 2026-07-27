import type {
  AngleEntry,
  AreaEntry,
  BlockerCode,
  ClosureEncoding,
  CoordinateFrame,
  DraftEdgeRef,
  DraftVertexRef,
  EvidenceId,
  EvidenceRecord,
  ExactLengthUnit,
  Finding,
  KernelParameters,
  LengthEntry,
  SitePlanBriefDraft,
  SourceEdgeRef,
  SourceGeometryRef,
  SourcePath,
  SourcePoint,
  ValidatedSitePlan,
  ValidationResult,
  WarningCode,
} from '../src/index.ts'

export const VERIFIED_EVIDENCE_ID = 'evidence-professional-survey'

export const VERIFIED_EVIDENCE: EvidenceRecord = {
  evidenceId: VERIFIED_EVIDENCE_ID,
  sourceTypeRef: 'professional-boundary-survey',
  documentId: 'SURVEY-TEST-001',
  sourceDate: '2026-07-25',
  originalUnit: 'm',
  statedPrecision: 0.001,
  claimedVerification: 'professional-verified',
  responsibleProfessional: {
    name: 'Acceptance Surveyor',
    licenceNumber: 'TEST-SURVEY-001',
    discipline: 'surveyor',
    signatureRef: 'signature-test-001',
  },
  file: {
    sha256: '0000000000000000000000000000000000000000000000000000000000000000',
    storageRef: 'fixture://professional-survey',
    filename: 'professional-survey.dxf',
    bytes: 1,
    mime: 'application/dxf',
  },
}

export const baseParams: KernelParameters = {
  epsM: 0.001,
  closureProfiles: [{
    profileRef: 'total-station-1:10000',
    minRatioDenominator: 10_000,
    maxAbsoluteMisclosureM: 0.020,
    methodDescription: 'Acceptance baseline: total-station traverse at 1:10,000.',
    sourceRef: VERIFIED_EVIDENCE_ID,
  }],
  areaTolerance: {
    floorSqm: 0.25,
    fractionOfStated: 0.001,
    useSourcePrecisionHalfStep: true,
  },
  sliver: {
    maxAspectRatio: 100,
    minEdgeSeparationM: 0.10,
  },
  defaultDisplayPrecisionM: 0.001,
  paperToleranceMm: 0.25,
  kernelVersion: 'acceptance-kernel-v1',
  specRevision: 'SitePlanBrief-v5',
}

/** Upper-case alias retained for the geometry fixture catalogue. */
export const PARAMS = baseParams

export interface MakePointOptions {
  preserveCollinear?: boolean
  monumentId?: string
  sourceRef?: EvidenceId | null
}

export function makePoint(
  pointId: string,
  axis1: number,
  axis2: number,
  options: MakePointOptions = {},
): SourcePoint {
  return {
    pointId,
    axis1,
    axis2,
    ...(options.monumentId === undefined ? {} : { monumentId: options.monumentId }),
    ...(options.preserveCollinear === undefined
      ? {}
      : { preserveCollinear: options.preserveCollinear }),
    sourceRef: options.sourceRef === undefined ? VERIFIED_EVIDENCE_ID : options.sourceRef,
  }
}

export type FixtureCoordinate = readonly [number, number]

export interface MakePathOptions {
  closure?: ClosureEncoding
  axisUnit?: ExactLengthUnit
  crsCode?: string | null
  isLocal?: boolean
  frameSourceRef?: EvidenceId | null
  pointSourceRef?: EvidenceId | null
  preserveIndices?: readonly number[]
  monumentIds?: Readonly<Record<number, string>>
}

export function makePath(
  pathId: string,
  coordinates: readonly FixtureCoordinate[],
  options: MakePathOptions = {},
): SourcePath {
  const preserveIndices = new Set(options.preserveIndices ?? [])
  const frame: CoordinateFrame = {
    kind: 'planar',
    axisUnit: options.axisUnit ?? 'm',
    crsCode: options.crsCode === undefined ? 'EPSG:32643' : options.crsCode,
    isLocal: options.isLocal ?? false,
    sourceRef: options.frameSourceRef === undefined
      ? VERIFIED_EVIDENCE_ID
      : options.frameSourceRef,
  }

  return {
    pathId,
    frame,
    points: coordinates.map(([axis1, axis2], index) => makePoint(
      `${pathId}-p${index}`,
      axis1,
      axis2,
      {
        ...(preserveIndices.has(index) ? { preserveCollinear: true } : {}),
        ...(options.monumentIds?.[index] === undefined
          ? {}
          : { monumentId: options.monumentIds[index] }),
        sourceRef: options.pointSourceRef === undefined
          ? VERIFIED_EVIDENCE_ID
          : options.pointSourceRef,
      },
    )),
    closure: options.closure ?? {
      kind: 'closed-flag',
      flagSource: 'acceptance-fixture',
    },
  }
}

/** Descriptive alias used by tests that emphasize the source representation. */
export const pathFromCoordinates = makePath

export function sourceEdge(
  pathId: string,
  fromPointId: string,
  toPointId: string,
): SourceEdgeRef {
  return { pathId, fromPointId, toPointId }
}

export function pathEdge(
  pathId: string,
  fromPointId: string,
  toPointId: string,
): DraftEdgeRef {
  return { kind: 'path-edge', edge: sourceEdge(pathId, fromPointId, toPointId) }
}

export function traverseEdge(legId: string): DraftEdgeRef {
  return { kind: 'traverse-leg', legId }
}

export function reconstructedEdge(sideIndex: 0 | 1 | 2 | 3): DraftEdgeRef {
  return { kind: 'reconstructed-side', sideIndex }
}

export function pathVertex(pathId: string, pointId: string): DraftVertexRef {
  return { kind: 'path-point', pathId, pointId }
}

export function traverseVertex(
  legId: string,
  end: 'start' | 'end',
): DraftVertexRef {
  return { kind: 'traverse-station', legId, end }
}

export function reconstructedVertex(vertexIndex: 0 | 1 | 2 | 3): DraftVertexRef {
  return { kind: 'reconstructed-corner', vertexIndex }
}

export function edgeReference(ref: DraftEdgeRef): SourceGeometryRef {
  return { kind: 'edge', ref }
}

export function vertexReference(ref: DraftVertexRef): SourceGeometryRef {
  return { kind: 'vertex', ref }
}

export function lengthM(
  asEntered: number,
  sourceRef: EvidenceId | null = VERIFIED_EVIDENCE_ID,
): LengthEntry {
  return { asEntered, unit: 'm', sourceRef }
}

export const metres = lengthM

export function areaSqm(
  asEntered: number,
  statedPrecision?: number,
  sourceRef?: EvidenceId | null,
): AreaEntry
export function areaSqm(
  asEntered: number,
  sourceRef?: EvidenceId | null,
  statedPrecision?: number,
): AreaEntry
export function areaSqm(
  asEntered: number,
  second?: number | EvidenceId | null,
  third?: number | EvidenceId | null,
): AreaEntry {
  const precision = typeof second === 'number'
    ? second
    : typeof third === 'number'
      ? third
      : undefined
  const sourceRef = typeof second === 'number'
    ? (third === undefined ? VERIFIED_EVIDENCE_ID : third as EvidenceId | null)
    : (second === undefined ? VERIFIED_EVIDENCE_ID : second)

  return {
    asEntered,
    unit: 'sqm',
    ...(precision === undefined ? {} : { statedPrecision: precision }),
    sourceRef,
  }
}

export function angleDeg(
  decimalDegrees: number,
  reference: AngleEntry['reference'] = 'true',
  sourceRef: EvidenceId | null = VERIFIED_EVIDENCE_ID,
): AngleEntry {
  return { decimalDegrees, reference, sourceRef }
}

export const degrees = angleDeg

export type DeepPartial<T> =
  T extends (...args: never[]) => unknown ? T
    : T extends readonly (infer U)[] ? DeepPartial<U>[]
      : T extends object ? { [K in keyof T]?: DeepPartial<T[K]> }
        : T

export function cloneDraft<T>(value: T): T {
  const clone = (globalThis as unknown as {
    structuredClone<U>(input: U): U
  }).structuredClone
  return clone(value)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const DISCRIMINANTS = ['route', 'basis', 'geometryType', 'kind'] as const

export function deepMerge<T>(base: T, patch: DeepPartial<T>): T {
  if (Array.isArray(base) || Array.isArray(patch)) return cloneDraft(patch as T)
  if (!isRecord(base) || !isRecord(patch)) return cloneDraft(patch as T)

  for (const discriminator of DISCRIMINANTS) {
    if (
      discriminator in patch
      && discriminator in base
      && patch[discriminator] !== base[discriminator]
    ) {
      return cloneDraft(patch as T)
    }
  }

  const merged: Record<string, unknown> = { ...cloneDraft(base) }
  for (const [key, patchValue] of Object.entries(patch)) {
    if (patchValue === undefined) continue
    const baseValue = merged[key]
    merged[key] = isRecord(baseValue) && isRecord(patchValue)
      ? deepMerge(baseValue, patchValue)
      : cloneDraft(patchValue)
  }
  return merged as T
}

const LENGTH_TO_METRES: Readonly<Record<ExactLengthUnit, number>> = {
  m: 1,
  mm: 0.001,
  cm: 0.01,
  km: 1_000,
  ft: 0.3048,
  in: 0.0254,
  yd: 0.9144,
  'chain-gunter': 20.1168,
  'link-gunter': 0.201168,
}

function pathAreaSqm(path: SourcePath): number {
  if (path.points.length < 3) return 0
  let twiceArea = 0
  for (let index = 0; index < path.points.length; index += 1) {
    const current = path.points[index]
    const next = path.points[(index + 1) % path.points.length]
    if (current === undefined || next === undefined) continue
    twiceArea += current.axis1 * next.axis2 - next.axis1 * current.axis2
  }
  const factor = path.frame.kind === 'planar'
    ? LENGTH_TO_METRES[path.frame.axisUnit]
    : Number.NaN
  return Math.abs(twiceArea / 2) * factor * factor
}

function pathBoundaryEdges(path: SourcePath): DraftEdgeRef[] {
  const points = path.points
  if (points.length < 2) return []

  const repeatedEndpoint = path.closure.kind === 'repeated-first-point'
  const edgeCount = path.closure.kind === 'open' || path.closure.kind === 'unknown'
    ? points.length - 1
    : repeatedEndpoint
      ? points.length - 1
      : points.length

  const edges: DraftEdgeRef[] = []
  for (let index = 0; index < edgeCount; index += 1) {
    const from = points[index]
    const to = points[(index + 1) % points.length]
    if (from !== undefined && to !== undefined) {
      edges.push(pathEdge(path.pathId, from.pointId, to.pointId))
    }
  }
  return edges
}

export const BASE_BOUNDARY_PATH = makePath('boundary', [
  [0, 0],
  [20, 0],
  [20, 10],
  [0, 10],
])

function completeDraftForPath(path: SourcePath): SitePlanBriefDraft {
  const edges = pathBoundaryEdges(path)
  return {
    schemaVersion: '3.0.0-draft',
    briefId: 'acceptance-baseline',
    identity: {
      projectName: 'UrbanOS acceptance plot',
      pilotProfileRef: 'acceptance-neutral',
      identifiers: [{
        key: 'fixture',
        value: 'baseline',
        sourceRef: VERIFIED_EVIDENCE_ID,
      }],
    },
    boundary: { route: 'coordinates', outerPath: cloneDraft(path) },
    statedArea: areaSqm(pathAreaSqm(path), VERIFIED_EVIDENCE_ID, 0.001),
    orientation: {
      basis: 'explicit-rotation',
      northRotation: angleDeg(0, 'true'),
    },
    roadFrontages: [{
      frontageId: 'frontage-0',
      edges: edges.length === 0 ? [] : [cloneDraft(edges[0] as DraftEdgeRef)],
      carriagewayWidth: lengthM(12),
      roadName: 'Acceptance Road',
      roadClassRef: 'acceptance-road',
    }],
    cadastralHoles: [],
    encumbrances: [],
    restrictions: [],
    levels: [],
    existingFeatures: [],
    setbacks: edges.map((edge, index) => ({
      setbackId: `setback-${index}`,
      edges: [edge],
      distance: lengthM(1),
      basis: {
        citation: 'Acceptance fixture setback',
        sourceRef: VERIFIED_EVIDENCE_ID,
      },
    })),
    footprints: [],
    projections: [],
    dimensions: [],
    drawing: {
      displayPrecisionM: 0.001,
      displayUnit: 'm',
      sheetRef: 'A1',
      declaredScaleDenominator: 100,
      requestedStamp: 'ready-for-professional-review',
    },
    evidence: [cloneDraft(VERIFIED_EVIDENCE)],
    overrides: [],
    revisions: [{
      revisionId: 'revision-0',
      index: 0,
      issuedAt: '2026-07-25',
      issuedBy: cloneDraft(VERIFIED_EVIDENCE.responsibleProfessional!),
      evidenceRef: VERIFIED_EVIDENCE_ID,
      changeNote: 'Acceptance fixture issued.',
    }],
    acknowledgedWarnings: [],
  }
}

export function draftForPath(
  path: SourcePath,
  patch: DeepPartial<SitePlanBriefDraft> = {},
): SitePlanBriefDraft {
  const merged = deepMerge<SitePlanBriefDraft>(completeDraftForPath(path), patch)
  if (!Object.prototype.hasOwnProperty.call(patch, 'statedArea')) {
    const holesArea = merged.cadastralHoles.reduce(
      (sum, hole) => sum + pathAreaSqm(hole.path),
      0,
    )
    merged.statedArea = areaSqm(
      pathAreaSqm(path) - holesArea,
      VERIFIED_EVIDENCE_ID,
      0.001,
    )
  }
  return merged
}

export function baselineDraft(
  patch: DeepPartial<SitePlanBriefDraft> = {},
): SitePlanBriefDraft {
  return draftForPath(BASE_BOUNDARY_PATH, patch)
}

/** Concise alias retained for the geometry fixture catalogue. */
export const baseDraft = baselineDraft

function findingsFor(result: ValidationResult): readonly Finding[] {
  return result.ok ? result.warnings : [...result.blockers, ...result.warnings]
}

function findingSummary(findings: readonly Finding[]): string {
  return findings.length === 0
    ? '(none)'
    : findings.map((finding) => `${finding.code}: ${finding.message}`).join('\n')
}

export function expectValid(result: ValidationResult): ValidatedSitePlan {
  if (!result.ok) {
    throw new Error(
      `Expected a validated plan, received:\n${findingSummary(findingsFor(result))}`,
    )
  }
  return result.plan
}

export function expectBlocker(
  result: ValidationResult,
  code: BlockerCode,
): Finding {
  if (result.ok) {
    throw new Error(`Expected blocker ${code}, but validation passed.`)
  }
  const finding = result.blockers.find((candidate) => candidate.code === code)
  if (finding === undefined) {
    throw new Error(
      `Expected blocker ${code}, received:\n${findingSummary(result.blockers)}`,
    )
  }
  return finding
}

export function expectNoBlocker(result: ValidationResult, code: BlockerCode): void {
  if (result.ok) return
  if (result.blockers.some((finding) => finding.code === code)) {
    throw new Error(
      `Did not expect blocker ${code}, received:\n${findingSummary(result.blockers)}`,
    )
  }
}

export function expectWarning(
  result: ValidationResult,
  code: WarningCode,
): Finding {
  const finding = result.warnings.find((candidate) => candidate.code === code)
  if (finding === undefined) {
    throw new Error(
      `Expected warning ${code}, received:\n${findingSummary(result.warnings)}`,
    )
  }
  return finding
}
