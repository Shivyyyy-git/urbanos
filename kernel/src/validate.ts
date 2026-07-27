// ---------------------------------------------------------------------------
// Stage 2 — validation, digest and the export gate (contract §7.6–7.8).
//
// Nothing here weakens an input to make it pass. Every failure is reported with
// its ratified code and the observed value, so a surveyor gets a number to act on
// rather than a verdict.
// ---------------------------------------------------------------------------
import type {
  AcknowledgedWarning,
  AppliedOverride,
  AreaReconciliationResult,
  BlockerCode,
  CanonicalEdge,
  CanonicalVertex,
  ClosureEncoding,
  DraftEdgeRef,
  EvidenceId,
  Finding,
  GeometryRef,
  KernelParameters,
  LengthValue,
  LinearRing,
  Polygon,
  MultiPolygon,
  ResolvedDimension,
  ResolvedPath,
  ResolvedSitePlan,
  SitePlanBriefDraft,
  TraverseClosureResult,
  ValidatedEncumbrance,
  ValidatedFeature,
  ValidatedFootprint,
  ValidatedFrontage,
  ValidatedLevel,
  ValidatedProjection,
  ValidatedRestriction,
  ValidatedSetback,
  ValidatedSitePlan,
  ValidationDigest,
  ValidationResult,
  WarningCode,
} from './contract.ts'
import { KERNEL_BRAND } from './brand.ts'
import { KernelError } from './errors.ts'
import { sha256 } from './hash.ts'
import { finding, resolveAngle, sourcePrecisionHalfStepSqm } from './units.ts'
import { resolveSitePlan, traverseStations } from './resolve.ts'
import {
  area,
  checkRing,
  containRingInShapes,
  dist,
  offsetRingInward,
  relateRings,
  ringsOverlap,
  signedArea,
  sliverMetrics,
  subtractPolygons,
  type PolygonShape,
  type Pt,
} from './geom.ts'

const RESOLUTION_BLOCKERS = new Set<string>([
  'E_VALUE_NOT_FINITE', 'E_ANGLE_FORM_INVALID', 'E_UNIT_FACTOR_UNDECLARED',
  'E_UNIT_AMBIGUOUS', 'E_FRAME_UNDECLARED', 'E_FRAME_UNPROJECTED',
])

function isWarning(code: string): boolean {
  return code.startsWith('W_')
}

// ------------------------------ canonical build ------------------------------

interface BuiltRing {
  ring: LinearRing
  pts: Pt[]
}

function buildRing(
  ringId: string,
  points: readonly { pointId: string; x: number; y: number; monumentId?: string; preserveCollinear: boolean }[],
  closureBasis: ClosureEncoding,
): BuiltRing {
  const vertices: CanonicalVertex[] = points.map((p, i) => ({
    vertexId: `${ringId}#v${i}`,
    x: p.x,
    y: p.y,
    fromPointId: p.pointId,
    ...(p.monumentId === undefined ? {} : { monumentId: p.monumentId }),
    preservedCollinear: p.preserveCollinear,
  }))
  const edges: CanonicalEdge[] = vertices.map((v, i) => {
    const next = vertices[(i + 1) % vertices.length]
    return {
      edgeId: `${ringId}#e${i}`,
      fromVertexId: v.vertexId,
      toVertexId: next?.vertexId ?? v.vertexId,
      lengthM: next === undefined ? 0 : dist({ x: v.x, y: v.y }, { x: next.x, y: next.y }),
    }
  })
  const pts = vertices.map((v) => ({ x: v.x, y: v.y }))
  return {
    ring: {
      ringId,
      vertices,
      edges,
      signedAreaSqm: signedArea(pts),
      sourceWinding: signedArea(pts) > 0 ? 'ccw' : 'cw',
      closureBasis,
    },
    pts,
  }
}

/** Strip a repeated final point once coordinate closure has been proven. */
function ringPointsFromPath(path: ResolvedPath, eps: number): typeof path.points {
  if (path.closure.kind !== 'repeated-first-point') return path.points
  if (path.points.length < 2) return path.points
  const first = path.points[0]
  const last = path.points[path.points.length - 1]
  if (first === undefined || last === undefined) return path.points
  return dist({ x: first.x, y: first.y }, { x: last.x, y: last.y }) <= eps
    ? path.points.slice(0, -1)
    : path.points
}

function closureFindings(path: ResolvedPath, eps: number): Finding[] {
  const kind = path.closure.kind
  if (kind === 'open') {
    return [finding(
      'E_SOURCE_PATH_OPEN',
      `Path ${path.pathId} is declared open, so it does not describe a ring. It is never silently joined.`,
      { observed: 'open', required: 'a closed encoding' },
    )]
  }
  if (kind === 'unknown') {
    return [finding(
      'E_CLOSURE_ENCODING_UNKNOWN',
      `Path ${path.pathId} carries no closure information. Closure is a claim to be tested, not assumed.`,
      { observed: 'unknown', required: 'an explicit closure encoding' },
    )]
  }
  if (kind === 'repeated-first-point' && path.endpointGapM !== null && path.endpointGapM > eps) {
    return [finding(
      'E_CLOSURE_POINT_MISMATCH',
      `Path ${path.pathId} repeats its first point as the last, but the endpoints are ` +
        `${path.endpointGapM.toFixed(6)} m apart — beyond the ${eps} m tolerance. The gap is reported rather than closed.`,
      { observed: `${path.endpointGapM.toFixed(6)} m`, required: `<= ${eps} m` },
    )]
  }
  return []
}

const RING_DEFECT_CODES: Record<string, BlockerCode> = {
  'too-few-vertices': 'E_RING_TOO_FEW_VERTICES',
  'degenerate-edge': 'E_RING_DEGENERATE_EDGE',
  'zero-area': 'E_RING_ZERO_AREA',
  'self-intersects': 'E_RING_SELF_INTERSECTS',
  'self-touches': 'E_RING_SELF_TOUCHES',
}

const RING_DEFECT_MESSAGES: Record<string, string> = {
  'too-few-vertices': 'fewer than three distinct vertices, so it encloses nothing',
  'degenerate-edge': 'a zero-length edge from a repeated consecutive point',
  'zero-area': 'zero enclosed area — every vertex is collinear',
  'self-intersects': 'edges that properly cross (a bow-tie)',
  'self-touches': 'edges that touch or double back along each other (a spike)',
}

function validatedPolygonShape(
  outer: ResolvedPath,
  holes: readonly ResolvedPath[],
  label: string,
  eps: number,
  blockers: Finding[],
): PolygonShape | null {
  const before = blockers.length
  const outerClosure = closureFindings(outer, eps)
  blockers.push(...outerClosure)
  const outerPoints = ringPointsFromPath(outer, eps).map((point) => ({
    x: point.x,
    y: point.y,
  }))
  if (outerClosure.length === 0) {
    const check = checkRing(outerPoints, eps)
    if (check.defect !== null) {
      blockers.push(finding(
        RING_DEFECT_CODES[check.defect] ?? 'E_RING_ZERO_AREA',
        `${label} has ${RING_DEFECT_MESSAGES[check.defect] ?? 'an invalid topology'}.`,
      ))
    }
  }

  const holePoints: Pt[][] = []
  for (let index = 0; index < holes.length; index += 1) {
    const hole = holes[index]
    if (hole === undefined) continue
    const holeClosure = closureFindings(hole, eps)
    blockers.push(...holeClosure)
    const points = ringPointsFromPath(hole, eps).map((point) => ({
      x: point.x,
      y: point.y,
    }))
    if (holeClosure.length > 0) continue
    const check = checkRing(points, eps)
    if (check.defect !== null) {
      blockers.push(finding(
        RING_DEFECT_CODES[check.defect] ?? 'E_RING_ZERO_AREA',
        `${label} hole ${index} has ${RING_DEFECT_MESSAGES[check.defect] ?? 'an invalid topology'}.`,
      ))
      continue
    }
    const relation = relateRings(points, outerPoints, eps)
    if (relation !== 'strictly-inside') {
      blockers.push(finding(
        'E_HOLE_NOT_INTERIOR',
        `${label} hole ${index} is ${relation}, not strictly inside its outer ring.`,
        { observed: relation, required: 'strictly-inside' },
      ))
      continue
    }
    holePoints.push(points)
  }

  for (let i = 0; i < holePoints.length; i += 1) {
    for (let j = i + 1; j < holePoints.length; j += 1) {
      const first = holePoints[i]
      const second = holePoints[j]
      if (first === undefined || second === undefined) continue
      const relation = relateRings(first, second, eps)
      if (relation !== 'disjoint') {
        blockers.push(finding(
          'E_HOLE_OVERLAP',
          `${label} holes ${i} and ${j} are ${relation}; holes may neither touch nor overlap.`,
          { observed: relation, required: 'disjoint' },
        ))
      }
    }
  }

  return blockers.length === before
    ? { outer: outerPoints, holes: holePoints }
    : null
}

// --------------------------------- digest -----------------------------------

function canonicalJson(value: unknown): string {
  if (value === null) return 'null'
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return `"@nonfinite:${String(value)}"`
    // Normalise negative zero: -0 and 0 are the same coordinate, so they must
    // not produce different digests.
    return JSON.stringify(value === 0 ? 0 : value)
  }
  if (typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value)
  if (typeof value === 'undefined') return '"@undefined"'
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>
    const keys = Object.keys(record).sort()
    return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalJson(record[k])}`).join(',')}}`
  }
  return JSON.stringify(String(value))
}

/** Over every enumerable own property, so adding or altering ANY top-level
 *  branch changes the hash. The symbol-keyed brand is excluded by construction,
 *  which also avoids the digest describing itself. */
function payloadHash(payload: object): string {
  return sha256(canonicalJson(payload))
}

function paramsHash(params: KernelParameters): string {
  return sha256(canonicalJson(params))
}

// -------------------------------- deep freeze --------------------------------

function deepFreeze<T>(value: T, seen = new Set<unknown>()): T {
  if (value === null || typeof value !== 'object') return value
  if (seen.has(value)) return value
  seen.add(value)
  for (const key of Reflect.ownKeys(value)) {
    deepFreeze(Reflect.get(value, key), seen)
  }
  return Object.freeze(value)
}

// --------------------------- ready-state preflight ---------------------------

function validIsoDate(value: string | null): boolean {
  if (value === null || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  if (year === undefined || month === undefined || day === undefined) return false
  const parsed = new Date(Date.UTC(year, month - 1, day))
  return parsed.getUTCFullYear() === year
    && parsed.getUTCMonth() === month - 1
    && parsed.getUTCDate() === day
}

function kernelParameterFindings(params: KernelParameters): Finding[] {
  const invalid: string[] = []
  const positive = (value: number, label: string): void => {
    if (!Number.isFinite(value) || value <= 0) invalid.push(`${label}=${String(value)}`)
  }
  positive(params.epsM, 'epsM')
  positive(params.areaTolerance.floorSqm, 'areaTolerance.floorSqm')
  positive(params.areaTolerance.fractionOfStated, 'areaTolerance.fractionOfStated')
  positive(params.sliver.maxAspectRatio, 'sliver.maxAspectRatio')
  positive(params.sliver.minEdgeSeparationM, 'sliver.minEdgeSeparationM')
  positive(params.defaultDisplayPrecisionM, 'defaultDisplayPrecisionM')
  positive(params.paperToleranceMm, 'paperToleranceMm')
  if (params.kernelVersion.trim() === '') invalid.push('kernelVersion is blank')
  if (params.specRevision.trim() === '') invalid.push('specRevision is blank')

  const profileIds = new Set<string>()
  for (const profile of params.closureProfiles) {
    if (profile.profileRef.trim() === '' || profileIds.has(profile.profileRef)) {
      invalid.push(`closure profile id=${JSON.stringify(profile.profileRef)}`)
    }
    profileIds.add(profile.profileRef)
    positive(profile.minRatioDenominator, `${profile.profileRef}.minRatioDenominator`)
    positive(profile.maxAbsoluteMisclosureM, `${profile.profileRef}.maxAbsoluteMisclosureM`)
    if (profile.methodDescription.trim() === '') {
      invalid.push(`${profile.profileRef}.methodDescription is blank`)
    }
    if (profile.sourceRef === null || profile.sourceRef.trim() === '') {
      invalid.push(`${profile.profileRef}.sourceRef is absent`)
    }
  }

  return invalid.length === 0
    ? []
    : [finding(
        'E_KERNEL_PARAMETERS_INVALID',
        `Kernel parameters are unsafe or incomplete: ${invalid.join(', ')}. Validation stops rather than running geometry under an invalid tolerance or profile.`,
        { observed: invalid.join(', '), required: 'finite positive tolerances and uniquely sourced profiles' },
      )]
}

function duplicateIdentifierFindings(draft: SitePlanBriefDraft): Finding[] {
  const findings: Finding[] = []
  const check = (label: string, values: readonly string[]): void => {
    const seen = new Set<string>()
    for (const value of values) {
      if (value.trim() === '' || seen.has(value)) {
        findings.push(finding(
          'E_IDENTIFIER_DUPLICATE',
          `${label} identifier ${JSON.stringify(value)} is blank or duplicated. References cannot be resolved safely unless identifiers are non-empty and unique.`,
          { observed: JSON.stringify(value), required: `unique non-empty ${label} identifier` },
        ))
      }
      seen.add(value)
    }
  }

  check('evidence', draft.evidence.map((item) => item.evidenceId))
  check('frontage', draft.roadFrontages.map((item) => item.frontageId))
  check('setback', draft.setbacks.map((item) => item.setbackId))
  check('cadastral hole', draft.cadastralHoles.map((item) => item.holeId))
  check('encumbrance', draft.encumbrances.map((item) => item.encumbranceId))
  check('restriction', draft.restrictions.map((item) => item.restrictionId))
  check('existing feature', draft.existingFeatures.map((item) => item.featureId))
  check('level', draft.levels.map((item) => item.readingId))
  check('footprint', draft.footprints.map((item) => item.footprintId))
  check('projection', draft.projections.map((item) => item.projectionId))
  check('dimension', draft.dimensions.map((item) => item.dimensionId))
  check('revision', draft.revisions.map((item) => item.revisionId))

  const paths: { pathId: string; pointIds: string[] }[] = []
  const walk = (value: unknown): void => {
    if (value === null || typeof value !== 'object') return
    if (Array.isArray(value)) {
      for (const item of value) walk(item)
      return
    }
    const record = value as Record<string, unknown>
    if (
      typeof record['pathId'] === 'string'
      && Array.isArray(record['points'])
    ) {
      const pointIds = record['points'].flatMap((point) => {
        if (point === null || typeof point !== 'object') return []
        const pointId = (point as Record<string, unknown>)['pointId']
        return typeof pointId === 'string' ? [pointId] : []
      })
      paths.push({ pathId: record['pathId'], pointIds })
    }
    for (const child of Object.values(record)) walk(child)
  }
  walk(draft.boundary)
  walk(draft.cadastralHoles)
  walk(draft.encumbrances)
  walk(draft.restrictions)
  walk(draft.existingFeatures)
  walk(draft.footprints)
  walk(draft.projections)
  check('path', paths.map((path) => path.pathId))
  for (const path of paths) check(`point in path ${path.pathId}`, path.pointIds)
  return findings
}

function missingProvenancePaths(draft: SitePlanBriefDraft): string[] {
  const missing: string[] = []
  const walk = (value: unknown, path: string): void => {
    if (value === null || typeof value !== 'object') return
    if (Array.isArray(value)) {
      value.forEach((item, index) => walk(item, `${path}[${index}]`))
      return
    }
    const record = value as Record<string, unknown>
    for (const [key, child] of Object.entries(record)) {
      const childPath = `${path}.${key}`
      if (
        (key === 'sourceRef' || key === 'evidenceRef')
        && (child === null || (typeof child === 'string' && child.trim() === ''))
      ) {
        missing.push(childPath)
      }
      walk(child, childPath)
    }
  }
  for (const [label, branch] of [
    ['identity.identifiers', draft.identity.identifiers],
    ['boundary', draft.boundary],
    ['statedArea', draft.statedArea],
    ['cadastralHoles', draft.cadastralHoles],
    ['encumbrances', draft.encumbrances],
    ['restrictions', draft.restrictions],
    ['existingFeatures', draft.existingFeatures],
    ['setbacks', draft.setbacks],
    ['roadFrontages', draft.roadFrontages],
    ['levels', draft.levels],
    ['footprints', draft.footprints],
    ['projections', draft.projections],
    ['orientation', draft.orientation],
    ['revisions', draft.revisions],
  ] as const) {
    walk(branch, label)
  }
  return missing
}

// ------------------------------ edge references ------------------------------

interface EdgeIndex {
  /** Resolve a draft edge reference to canonical edge indices, or null. */
  resolve(ref: DraftEdgeRef): number | null
  count: number
}

function makeEdgeIndex(
  draft: SitePlanBriefDraft,
  ringPointIds: readonly string[],
): EdgeIndex {
  const route = draft.boundary?.route ?? null
  const n = ringPointIds.length
  const pathId = route === 'coordinates' || route === 'imported-file'
    ? (draft.boundary as { outerPath: { pathId: string } | null } | null)?.outerPath?.pathId ?? null
    : null
  const legIds = route === 'traverse'
    ? (draft.boundary as { legs: readonly { legId: string }[] }).legs.map((l) => l.legId)
    : []

  return {
    count: n,
    resolve(ref: DraftEdgeRef): number | null {
      if (ref.kind === 'path-edge') {
        if (route !== 'coordinates' && route !== 'imported-file') return null
        if (pathId !== null && ref.edge.pathId !== pathId) return null
        const i = ringPointIds.indexOf(ref.edge.fromPointId)
        const j = ringPointIds.indexOf(ref.edge.toPointId)
        if (i < 0 || j < 0) return null
        if ((i + 1) % n === j) return i
        if ((j + 1) % n === i) return j
        return null // present but not adjacent: a chord is not a boundary edge
      }
      if (ref.kind === 'traverse-leg') {
        if (route !== 'traverse') return null
        const idx = legIds.indexOf(ref.legId)
        return idx >= 0 && idx < n ? idx : null
      }
      if (route !== 'reconstructed') return null
      return ref.sideIndex < n ? ref.sideIndex : null
    },
  }
}

// -------------------------------- validation ---------------------------------

export function validateSitePlan(
  draft: SitePlanBriefDraft,
  params: KernelParameters,
): ValidationResult {
  const unsafeParameters = kernelParameterFindings(params)
  if (unsafeParameters.length > 0) {
    return {
      ok: false,
      stamp: 'research-draft',
      blockers: unsafeParameters,
      warnings: [],
    }
  }
  const eps = params.epsM
  const resolved = resolveSitePlan(draft, params)
  const blockers: Finding[] = []
  const warnings: Finding[] = []

  blockers.push(...duplicateIdentifierFindings(draft))

  for (const f of resolved.findings) {
    if (isWarning(f.code)) warnings.push(f)
    else if (RESOLUTION_BLOCKERS.has(f.code) || f.code === 'E_RECONSTRUCTION_AMBIGUOUS') blockers.push(f)
    else blockers.push(f)
  }

  const fail = (): ValidationResult => ({
    ok: false, stamp: 'research-draft', blockers: applyOverrides(draft, blockers).remaining,
    warnings, resolved,
  })

  const outer = resolved.outerPath
  if (outer === null) {
    if (blockers.length === 0) {
      blockers.push(finding(
        'E_SOURCE_PATH_OPEN',
        'No outer boundary could be resolved from the supplied route.',
        { required: 'a resolvable outer boundary' },
      ))
    }
    return fail()
  }

  blockers.push(...closureFindings(outer, eps))
  if (blockers.some((b) => !isWarning(b.code))) {
    const after = applyOverrides(draft, blockers)
    if (after.remaining.length > 0) return fail()
  }

  const ringPoints = ringPointsFromPath(outer, eps)
  const outerBuilt = buildRing('plot-outer', ringPoints, outer.closure)
  const outerCheck = checkRing(outerBuilt.pts, eps)
  if (outerCheck.defect !== null) {
    const code = RING_DEFECT_CODES[outerCheck.defect]
    blockers.push(finding(
      code ?? 'E_RING_ZERO_AREA',
      `The outer boundary has ${RING_DEFECT_MESSAGES[outerCheck.defect] ?? 'an invalid topology'}.`,
      { observed: outerCheck.at === undefined ? undefined : `edge indices ${outerCheck.at.join(', ')}` } as Partial<Finding>,
    ))
    return fail()
  }

  // -------------------------- traverse closure gate --------------------------
  let closure: TraverseClosureResult | null = null
  if (draft.boundary?.route === 'traverse') {
    const boundary = draft.boundary
    const profileRef = boundary.closureProfileRef
    const profile = params.closureProfiles.find((p) => p.profileRef === profileRef)
    if (profile === undefined) {
      blockers.push(finding(
        'E_CLOSURE_PROFILE_UNKNOWN',
        `Traverse declares closure profile "${String(profileRef)}", which is not registered. ` +
          `A traverse is judged against the standard its own method can meet, never a guessed one.`,
        { observed: String(profileRef) },
      ))
      return fail()
    }
    // Same function that built the ring, so the reported closure can never
    // describe a different traverse than the geometry does.
    const {
      perimeterM,
      misclosureM,
      rawLegLengthsM,
    } = traverseStations(boundary)
    const ratioDenominator = misclosureM === 0 ? null : perimeterM / misclosureM
    // Relative slack on the gate comparisons: a threshold fixture must not be
    // failed by a last-bit artefact, while a genuine miss (1:7,999 against
    // 1:10,000) is nowhere near this tolerance.
    const REL = 1e-9
    const passesRatio = ratioDenominator === null
      || ratioDenominator >= profile.minRatioDenominator * (1 - REL)
    const passesAbsoluteCap = misclosureM <= profile.maxAbsoluteMisclosureM * (1 + REL)
    if (!passesRatio || !passesAbsoluteCap) {
      blockers.push(finding(
        'E_TRAVERSE_MISCLOSURE',
        `Traverse misclosure is ${misclosureM.toFixed(6)} m over a ${perimeterM.toFixed(3)} m perimeter ` +
          `(1:${ratioDenominator === null ? '∞' : Math.round(ratioDenominator)}). Profile ` +
          `"${profile.profileRef}" requires at least 1:${profile.minRatioDenominator} and at most ` +
          `${profile.maxAbsoluteMisclosureM} m. The misclosure is not adjusted away to make this pass — ` +
          `re-observe the traverse or declare a profile matching the method used.`,
        {
          observed: `1:${ratioDenominator === null ? '∞' : Math.round(ratioDenominator)}, ${misclosureM.toFixed(6)} m`,
          required: `>= 1:${profile.minRatioDenominator} and <= ${profile.maxAbsoluteMisclosureM} m`,
        },
      ))
      return fail()
    }

    const approval = boundary.adjustment
    const needsAdjustment = misclosureM > Math.max(1e-12, eps * 1e-9)
    let adjustmentResult: TraverseClosureResult['adjustment'] = { kind: 'none' }
    if (approval === null) {
      if (needsAdjustment) {
        blockers.push(finding(
          'E_TRAVERSE_ADJUSTMENT_UNAPPROVED',
          `The raw traverse passes profile "${profile.profileRef}" but still misses closure by ` +
            `${misclosureM.toFixed(6)} m. A tolerance says the observations are usable; it does not choose ` +
            `how construction coordinates are adjusted. Supply a professionally approved adjusted station path.`,
          {
            observed: `${misclosureM.toFixed(6)} m unadjusted`,
            required: 'TraverseAdjustmentApproval',
          },
        ))
        return fail()
      }
    } else {
      const evidence = draft.evidence.find(
        (record) => record.evidenceId === approval.evidenceRef,
      )
      const professional = approval.professional
      const approvalInvalid =
        approval.method.trim().length === 0
        || professional.name.trim().length === 0
        || professional.licenceNumber.trim().length === 0
        || evidence?.claimedVerification !== 'professional-verified'
        || evidence.responsibleProfessional?.licenceNumber !== professional.licenceNumber
        || outerBuilt.ring.edges.length !== rawLegLengthsM.length
      if (approvalInvalid) {
        blockers.push(finding(
          'E_TRAVERSE_ADJUSTMENT_UNAPPROVED',
          `The adjusted traverse is missing a named method, matching licensed professional evidence, ` +
            `or one adjusted edge per observed leg. The kernel never approves its own adjustment.`,
          {
            observed:
              `method=${JSON.stringify(approval.method)}, adjustedEdges=${outerBuilt.ring.edges.length}, ` +
              `observedLegs=${rawLegLengthsM.length}`,
            required: 'named method + matching professional evidence + one edge per leg',
          },
        ))
        return fail()
      }
      let maxEdgeLengthChangeM = 0
      for (let index = 0; index < rawLegLengthsM.length; index += 1) {
        const rawLength = rawLegLengthsM[index]
        const adjustedLength = outerBuilt.ring.edges[index]?.lengthM
        if (rawLength === undefined || adjustedLength === undefined) continue
        maxEdgeLengthChangeM = Math.max(
          maxEdgeLengthChangeM,
          Math.abs(adjustedLength - rawLength),
        )
      }
      adjustmentResult = {
        kind: 'professionally-adjusted',
        method: approval.method,
        professional,
        approvedAt: approval.approvedAt,
        evidenceRef: approval.evidenceRef,
        maxEdgeLengthChangeM,
      }
    }
    closure = {
      perimeterM,
      misclosureM,
      ratioDenominator,
      profileRef: profile.profileRef,
      passesRatio,
      passesAbsoluteCap,
      adjustment: adjustmentResult,
    }
  }

  // -------------------------------- holes ------------------------------------
  const holeRings: BuiltRing[] = []
  for (let i = 0; i < resolved.cadastralHolePaths.length; i += 1) {
    const hp = resolved.cadastralHolePaths[i]
    if (hp === undefined) continue
    // The same closure rules apply to a hole as to the outer boundary: an open
    // path does not describe a ring, and a void that gets silently closed
    // subtracts land the source never enclosed.
    const holeClosure = closureFindings(hp, eps)
    if (holeClosure.length > 0) {
      blockers.push(...holeClosure)
      continue
    }
    const built = buildRing(`plot-hole-${i}`, ringPointsFromPath(hp, eps), hp.closure)
    const check = checkRing(built.pts, eps)
    if (check.defect !== null) {
      blockers.push(finding(
        RING_DEFECT_CODES[check.defect] ?? 'E_RING_ZERO_AREA',
        `Cadastral hole ${hp.pathId} has ${RING_DEFECT_MESSAGES[check.defect] ?? 'an invalid topology'}.`,
      ))
      continue
    }
    const rel = relateRings(built.pts, outerBuilt.pts, eps)
    if (rel !== 'strictly-inside') {
      blockers.push(finding(
        'E_HOLE_NOT_INTERIOR',
        `Cadastral hole ${hp.pathId} is ${rel === 'touching' ? 'touching' : rel === 'crossing' ? 'crossing' : 'outside'} ` +
          `the outer boundary. A void in the ownership must lie strictly inside it.`,
        { observed: rel, required: 'strictly-inside' },
      ))
      continue
    }
    holeRings.push(built)
  }
  for (let i = 0; i < holeRings.length; i += 1) {
    for (let j = i + 1; j < holeRings.length; j += 1) {
      const a = holeRings[i]
      const b = holeRings[j]
      if (a === undefined || b === undefined) continue
      const rel = relateRings(a.pts, b.pts, eps)
      if (rel !== 'disjoint') {
        blockers.push(finding(
          'E_HOLE_OVERLAP',
          `Cadastral holes ${a.ring.ringId} and ${b.ring.ringId} are ${rel}. Interior voids may neither touch nor overlap.`,
          { observed: rel, required: 'disjoint' },
        ))
      }
    }
  }

  // --------------------------------- area ------------------------------------
  const computedSqm = area(outerBuilt.pts) - holeRings.reduce((s, h) => s + area(h.pts), 0)
  const statedSqm = resolved.statedArea?.canonicalSqm ?? null
  let plotArea: AreaReconciliationResult
  if (statedSqm === null) {
    blockers.push(finding(
      'E_AREA_RECONCILIATION',
      'No positive stated plot area could be resolved. Ready status requires the source area and the coordinate-computed area to be compared; neither value is invented.',
      { observed: 'stated area absent', required: 'positive sourced stated area' },
    ))
    plotArea = {
      computedSqm, statedSqm: null, differenceSqm: null, toleranceSqm: null,
      toleranceBasis: 'unknown-blocked', passes: null,
    }
  } else if (statedSqm <= 0) {
    blockers.push(finding(
      'E_VALUE_OUT_OF_RANGE',
      `Stated plot area resolves to ${statedSqm} m². A plot area must be positive.`,
      { observed: `${statedSqm} m²`, required: '> 0 m²' },
    ))
    plotArea = {
      computedSqm,
      statedSqm,
      differenceSqm: Math.abs(computedSqm - statedSqm),
      toleranceSqm: null,
      toleranceBasis: 'unknown-blocked',
      passes: false,
    }
  } else {
    const halfStep = params.areaTolerance.useSourcePrecisionHalfStep
      ? sourcePrecisionHalfStepSqm(draft.statedArea)
      : null
    if (
      params.areaTolerance.useSourcePrecisionHalfStep
      && (halfStep === null || halfStep <= 0)
    ) {
      // Without the source's own precision we cannot know how much of a
      // difference is the document's rounding versus our geometry being wrong.
      // Guessing here is what would let a real mismatch pass as rounding.
      blockers.push(finding(
        'E_AREA_PRECISION_UNKNOWN',
        `The stated area gives no precision, so its legitimate rounding band is unknown and reconciliation ` +
          `cannot be decided automatically. State the precision the source claims, or record a professional override.`,
        {
          observed: halfStep === null ? 'statedPrecision absent' : `non-positive half-step ${halfStep}`,
          required: 'positive statedPrecision',
        },
      ))
      plotArea = {
        computedSqm, statedSqm, differenceSqm: Math.abs(computedSqm - statedSqm),
        toleranceSqm: null, toleranceBasis: 'unknown-blocked', passes: null,
      }
    } else {
    const pct = statedSqm * params.areaTolerance.fractionOfStated
    const candidates: [number, AreaReconciliationResult['toleranceBasis']][] = [
      [params.areaTolerance.floorSqm, 'floor'],
      [pct, 'percentage'],
    ]
    if (halfStep !== null) candidates.push([halfStep, 'source-precision'])
    let best = candidates[0] as [number, AreaReconciliationResult['toleranceBasis']]
    for (const c of candidates) if (c[0] > best[0]) best = c
    const differenceSqm = Math.abs(computedSqm - statedSqm)
    const passes = differenceSqm <= best[0] + 1e-9
    plotArea = {
      computedSqm, statedSqm, differenceSqm,
      toleranceSqm: best[0], toleranceBasis: best[1], passes,
    }
    if (!passes) {
      blockers.push(finding(
        'E_AREA_RECONCILIATION',
        `Computed area ${computedSqm.toFixed(4)} m² differs from the stated ${statedSqm.toFixed(4)} m² by ` +
          `${differenceSqm.toFixed(4)} m², beyond the ${best[0].toFixed(4)} m² tolerance (${best[1]}). ` +
          `The boundary is never rescaled to match a deed.`,
        {
          observed: `${differenceSqm.toFixed(4)} m²`,
          required: `<= ${best[0].toFixed(4)} m²`,
        },
      ))
    }
    }
  }

  // ------------------------------ orientation --------------------------------
  let northDegrees: number | null = null
  let northReference: 'true' | 'grid' = 'true'
  let reducedNorth: { canonicalDegrees: number; from: { decimalDegrees: number; reference: 'true'; sourceRef: EvidenceId | null } } | null = null
  const orientation = draft.orientation
  if (orientation.basis === 'absent') {
    blockers.push(finding(
      'E_NORTH_ABSENT',
      'No north basis was supplied. The north arrow is omitted rather than guessed, and elevation is blocked.',
      { required: 'a georeferenced CRS or an explicit rotation' },
    ))
  } else if (orientation.basis === 'georeferenced-crs') {
    if (orientation.crs.kind !== 'planar' || orientation.crs.isLocal) {
      blockers.push(finding(
        'E_NORTH_ABSENT',
        'A local coordinate frame carries no north. An explicit rotation with a declared reference is required.',
        { observed: 'local frame', required: 'georeferenced CRS or explicit rotation' },
      ))
    } else {
      northDegrees = 0
      northReference = 'grid'
    }
  } else {
    const rotation = resolved.northRotation
    const magnetic = orientation.magnetic
    if (orientation.northRotation.reference === 'magnetic') {
      if (
        magnetic === undefined
        || magnetic.observationDate === null
        || magnetic.declination === null
        || magnetic.modelOrSource === null
      ) {
        blockers.push(finding(
          'E_MAGNETIC_CONTEXT_INCOMPLETE',
          'A magnetic bearing needs both an observation date and a declination before it can be reduced to true north. ' +
            'Without them it cannot be converted at all.',
          {
            observed: magnetic === undefined
              ? 'no magnetic context'
              : `date=${String(magnetic.observationDate)}, declination=${magnetic.declination === null ? 'null' : 'present'}, model=${String(magnetic.modelOrSource)}`,
            required: 'observationDate, declination, and modelOrSource',
          },
        ))
      } else if (rotation !== null) {
        const dec = resolveAngle(magnetic.declination, 'Magnetic declination')
        blockers.push(...dec.findings)
        if (dec.value !== null) {
          northDegrees = rotation.canonicalDegrees + dec.value.canonicalDegrees
          northReference = 'true'
          // Record the REDUCED bearing, not the raw magnetic one: a drawing
          // labelled "true north" must carry the true figure. The observation and
          // its declination stay on the draft, so the reduction is retraceable.
          reducedNorth = {
            canonicalDegrees: northDegrees,
            from: {
              decimalDegrees: northDegrees,
              reference: 'true',
              sourceRef: orientation.northRotation.sourceRef,
            },
          }
        }
      }
    } else if (rotation !== null) {
      northDegrees = rotation.canonicalDegrees
      northReference = orientation.northRotation.reference === 'grid' ? 'grid' : 'true'
    }
  }

  // --------------------------- references & frontages ------------------------
  const ringPointIds = outerBuilt.ring.vertices.map((v) => v.fromPointId)
  const edgeIndex = makeEdgeIndex(draft, ringPointIds)
  const edges = outerBuilt.ring.edges

  const resolveEdges = (refs: readonly DraftEdgeRef[], label: string): number[] | null => {
    const out: number[] = []
    for (const ref of refs) {
      const idx = edgeIndex.resolve(ref)
      if (idx === null) {
        blockers.push(finding(
          'E_REF_UNRESOLVED',
          `${label} names an edge that does not exist on this boundary: ${describeRef(ref)}. ` +
            `A reference from another route, an unknown identifier, or a non-adjacent point pair resolves to nothing rather than to a guess.`,
          { observed: describeRef(ref) },
        ))
        return null
      }
      out.push(idx)
    }
    return out
  }

  const frontages: ValidatedFrontage[] = []
  if (draft.roadFrontages.length === 0) {
    blockers.push(finding(
      'E_FRONTAGE_INCOMPLETE',
      'No boundary edge is identified as a road frontage or means of access. The kernel never chooses a “front” edge from screen position.',
      { observed: '0 road frontages', required: 'at least one explicitly referenced, sourced road frontage' },
    ))
  }
  for (let i = 0; i < draft.roadFrontages.length; i += 1) {
    const f = draft.roadFrontages[i]
    const rf = resolved.frontages[i]
    if (f === undefined || rf === undefined) continue
    if (f.edges.length === 0) {
      blockers.push(finding(
        'E_FRONTAGE_INCOMPLETE',
        `Frontage ${f.frontageId} names no boundary edge. There is no cardinal or "top edge" fallback.`,
        { observed: '0 edges', required: '>= 1 boundary edge' },
      ))
      continue
    }
    const idxs = resolveEdges(f.edges, `Frontage ${f.frontageId}`)
    const width = rf.carriagewayWidth
    if (
      width === null
      || width.from.sourceRef === null
      || width.canonicalM <= 0
      || !Number.isFinite(width.canonicalM)
    ) {
      blockers.push(finding(
        'E_FRONTAGE_INCOMPLETE',
        `Frontage ${f.frontageId} has no positive sourced carriageway width. A width without provenance, or a zero/negative width, is not a usable road measurement.`,
        {
          observed: width === null
            ? 'absent'
            : `width=${width.canonicalM}, sourceRef=${String(width.from.sourceRef)}`,
          required: 'positive width with sourceRef',
        },
      ))
      continue
    }
    if ((f.roadName ?? '').trim() === '') {
      blockers.push(finding(
        'E_FRONTAGE_INCOMPLETE',
        `Frontage ${f.frontageId} has no road or street name. The drawing cannot identify its means of access.`,
        { observed: 'blank roadName', required: 'named road/street/access' },
      ))
      continue
    }
    const rowWidth = rf.rowWidth
    if (
      rowWidth !== null
      && (
        rowWidth.from.sourceRef === null
        || rowWidth.canonicalM <= 0
        || rowWidth.canonicalM + eps < width.canonicalM
      )
    ) {
      blockers.push(finding(
        'E_FRONTAGE_INCOMPLETE',
        `Frontage ${f.frontageId} has an invalid right-of-way width. When supplied, it must be sourced, positive, and not narrower than the carriageway.`,
        {
          observed: `ROW=${rowWidth.canonicalM} m, carriageway=${width.canonicalM} m, sourceRef=${String(rowWidth.from.sourceRef)}`,
          required: 'sourced ROW >= carriageway width',
        },
      ))
      continue
    }
    if (idxs === null) continue
    frontages.push({
      frontageId: f.frontageId,
      edges: idxs.map((k) => edges[k]).filter((e): e is CanonicalEdge => e !== undefined),
      carriagewayWidth: width,
      rowWidth,
      roadName: f.roadName ?? null,
      roadClassRef: f.roadClassRef ?? null,
      sourceRefs: [width.from.sourceRef],
    })
  }

  // ------------------------------- setbacks ---------------------------------
  const perEdge = new Array<number | null>(edges.length).fill(null)
  const validatedSetbacks: ValidatedSetback[] = []
  for (let i = 0; i < draft.setbacks.length; i += 1) {
    const s = draft.setbacks[i]
    const rs = resolved.setbacks[i]
    if (s === undefined || rs === undefined) continue
    const idxs = resolveEdges(s.edges, `Setback ${s.setbackId}`)
    if (idxs === null) continue
    const d = rs.distance
    if (d === null) continue
    if (!Number.isFinite(d.canonicalM) || d.canonicalM < 0) {
      blockers.push(finding(
        'E_VALUE_OUT_OF_RANGE',
        `Setback ${s.setbackId} resolves to ${d.canonicalM} m. A setback may be zero only when stated explicitly; it may never be negative.`,
        { observed: `${d.canonicalM} m`, required: '>= 0 m' },
      ))
      continue
    }
    if (
      d.from.sourceRef === null
      || s.basis === null
      || s.basis.sourceRef === null
      || s.basis.citation.trim() === ''
    ) {
      blockers.push(finding(
        'E_EVIDENCE_INCOMPLETE',
        `Setback ${s.setbackId} is not fully sourced. Both the measured/authoritative distance and its rule or schedule citation are required.`,
        {
          observed:
            `distanceSource=${String(d.from.sourceRef)}, basisSource=${String(s.basis?.sourceRef)}, citation=${JSON.stringify(s.basis?.citation ?? '')}`,
          required: 'distance sourceRef + basis sourceRef + non-empty citation',
        },
      ))
      continue
    }
    let governs = false
    for (const k of idxs) {
      const current = perEdge[k] ?? null
      if (current === null || d.canonicalM > current) {
        perEdge[k] = d.canonicalM
        governs = true
      }
    }
    validatedSetbacks.push({
      setbackId: s.setbackId,
      edgeIds: idxs.map((k) => edges[k]?.edgeId).filter((x): x is string => x !== undefined),
      distance: d,
      basis: s.basis,
      governsByMaximum: governs,
    })
  }

  const uncovered = perEdge.flatMap((v, i) => (v === null ? [i] : []))
  if (uncovered.length > 0) {
    blockers.push(finding(
      'E_SETBACK_EDGE_UNCOVERED',
      `Boundary edge(s) ${uncovered.join(', ')} carry no setback input. A default of zero is never assumed.`,
      { observed: `${uncovered.length} uncovered`, required: 'every edge covered' },
    ))
  }

  if (blockers.length > 0) {
    const after = applyOverrides(draft, blockers)
    if (after.remaining.length > 0) return fail()
  }

  // ------------------------------- envelope ---------------------------------
  const envelopeRing = offsetRingInward(
    outerBuilt.pts,
    perEdge.map((v) => v ?? 0),
    eps,
  )
  if (envelopeRing === null) {
    blockers.push(finding(
      'E_ENVELOPE_COLLAPSED',
      'The required setbacks leave no developable envelope. The setback is never reduced to make a building fit.',
      { required: 'a non-empty developable envelope' },
    ))
    return fail()
  }

  const cutterBlockerStart = blockers.length
  const cutters: PolygonShape[] = []
  for (const e of resolved.encumbrancePaths) {
    const g = e.geometry
    if (
      e.clearance !== null
      && (
        !Number.isFinite(e.clearance.canonicalM)
        || e.clearance.canonicalM < 0
        || e.clearance.from.sourceRef === null
      )
    ) {
      blockers.push(finding(
        'E_VALUE_OUT_OF_RANGE',
        `Encumbrance ${e.encumbranceId} has an invalid clearance. When supplied, clearance must be sourced and non-negative.`,
        {
          observed: `${e.clearance.canonicalM} m, sourceRef=${String(e.clearance.from.sourceRef)}`,
          required: 'sourced clearance >= 0 m',
        },
      ))
      continue
    }
    if (g === null) {
      blockers.push(finding(
        'E_GEOMETRY_INCOMPLETE',
        `Encumbrance ${e.encumbranceId} has no resolvable geometry. A declared site constraint is never omitted from the developable envelope silently.`,
        { observed: 'null geometry', required: 'validated polygon geometry' },
      ))
      continue
    }
    if (g.geometryType === 'polygon') {
      const shape = validatedPolygonShape(
        g.path,
        g.holes,
        `Encumbrance ${e.encumbranceId}`,
        eps,
        blockers,
      )
      if (shape !== null) cutters.push(shape)
    } else {
      blockers.push(finding(
        'E_GEOMETRY_INCOMPLETE',
        `Encumbrance ${e.encumbranceId} is a ${g.geometryType}. Point/line clearance buffering is not implemented in this kernel, so the constraint cannot be treated as a harmless annotation.`,
        {
          observed: g.geometryType,
          required: 'explicit polygon exclusion until evidence-backed buffering is implemented',
        },
      ))
    }
  }
  if (blockers.length > cutterBlockerStart) return fail()
  const shapes: PolygonShape[] = subtractPolygons(envelopeRing, cutters, eps)
  if (shapes.length === 0) {
    blockers.push(finding(
      'E_ENVELOPE_COLLAPSED',
      'Encumbrances consume the whole developable envelope, leaving nothing buildable.',
      { required: 'a non-empty developable envelope' },
    ))
    return fail()
  }

  // ------------------------------- footprints -------------------------------
  const footprints: ValidatedFootprint[] = []
  const footprintPts: Pt[][] = []
  for (let i = 0; i < draft.footprints.length; i += 1) {
    const fp = draft.footprints[i]
    const rp = resolved.footprintPaths[i]
    if (fp === undefined || rp === undefined) continue
    if (rp.path === null) {
      blockers.push(finding(
        'E_GEOMETRY_INCOMPLETE',
        `Footprint ${fp.footprintId} was declared without a resolvable closed path. It cannot disappear from a review-ready plan.`,
        { observed: 'null footprint path', required: 'validated closed footprint path' },
      ))
      continue
    }
    if (
      fp.storeysAboveGround !== undefined
      && (
        !Number.isFinite(fp.storeysAboveGround)
        || fp.storeysAboveGround <= 0
        || !Number.isInteger(fp.storeysAboveGround)
      )
    ) {
      blockers.push(finding(
        'E_VALUE_OUT_OF_RANGE',
        `Footprint ${fp.footprintId} has ${String(fp.storeysAboveGround)} storeys above ground. When supplied, storeys must be a positive integer.`,
        { observed: String(fp.storeysAboveGround), required: 'positive integer' },
      ))
      continue
    }
    const footprintShape = validatedPolygonShape(
      rp.path,
      rp.holes,
      `Footprint ${fp.footprintId}`,
      eps,
      blockers,
    )
    if (footprintShape === null) continue
    const built = buildRing(
      `footprint-${fp.footprintId}`,
      ringPointsFromPath(rp.path, eps),
      rp.path.closure,
    )
    const builtHoles = rp.holes.map((hole, holeIndex) => buildRing(
      `footprint-${fp.footprintId}-hole-${holeIndex}`,
      ringPointsFromPath(hole, eps),
      hole.closure,
    ).ring)
    const containment = containRingInShapes(footprintShape.outer, shapes, eps)
    if (containment === 'in-void') {
      blockers.push(finding(
        'E_FOOTPRINT_IN_VOID',
        `Footprint ${fp.footprintId} lies inside a void in the developable envelope — an area excluded by an encumbrance.`,
        { observed: 'inside a void', required: 'inside a buildable component' },
      ))
      continue
    }
    if (containment === 'vertex-outside') {
      blockers.push(finding(
        'E_FOOTPRINT_OUTSIDE_ENVELOPE',
        `Footprint ${fp.footprintId} has a vertex outside the developable envelope.`,
        { observed: 'vertex outside', required: 'wholly inside' },
      ))
      continue
    }
    if (containment === 'edge-crosses') {
      blockers.push(finding(
        'E_FOOTPRINT_EDGE_CROSSES_ENVELOPE',
        `Footprint ${fp.footprintId} has every vertex inside the envelope but an edge that leaves it. ` +
          `Testing vertices alone would have passed this.`,
        { observed: 'edge crosses the envelope', required: 'no edge leaves the envelope' },
      ))
      continue
    }
    footprintPts.push(footprintShape.outer)
    footprints.push({
      footprintId: fp.footprintId,
      polygon: {
        polygonId: `footprint-${fp.footprintId}`,
        outer: built.ring,
        holes: builtHoles,
      },
      label: fp.label ?? null,
      storeysAboveGround: fp.storeysAboveGround ?? null,
      origin: fp.origin,
    })
  }
  for (let i = 0; i < footprintPts.length; i += 1) {
    for (let j = i + 1; j < footprintPts.length; j += 1) {
      const a = footprintPts[i]
      const b = footprintPts[j]
      if (a === undefined || b === undefined) continue
      if (ringsOverlap(a, b, eps)) {
        blockers.push(finding(
          'E_FOOTPRINT_OVERLAP',
          `Footprints ${footprints[i]?.footprintId} and ${footprints[j]?.footprintId} overlap.`,
          { observed: 'overlapping', required: 'disjoint interiors' },
        ))
      }
    }
  }

  // --------------------- optional supplied site geometry --------------------
  // Optional means the collection may be empty. Once the user supplies an
  // item, however, that item must validate; it can never vanish from a
  // review-ready drawing because its path was null or malformed.
  const restrictions: ValidatedRestriction[] = []
  for (let index = 0; index < draft.restrictions.length; index += 1) {
    const source = draft.restrictions[index]
    const resolvedRestriction = resolved.restrictionPaths[index]
    if (source === undefined || resolvedRestriction === undefined) continue
    if (source.kindRef.trim() === '') {
      blockers.push(finding(
        'E_GEOMETRY_INCOMPLETE',
        `Restriction ${source.restrictionId} has no type/name.`,
        { observed: 'blank kindRef', required: 'named restriction type' },
      ))
      continue
    }
    const geometry = validatedFeatureGeometry(
      resolvedRestriction.geometry,
      `restriction-${source.restrictionId}`,
      `Restriction ${source.restrictionId}`,
      eps,
      blockers,
    )
    if (geometry === null) {
      if (resolvedRestriction.geometry === null) {
        blockers.push(finding(
          'E_GEOMETRY_INCOMPLETE',
          `Restriction ${source.restrictionId} has no resolvable geometry and would otherwise disappear from the sheet.`,
          { observed: 'null geometry', required: 'validated feature geometry' },
        ))
      }
      continue
    }
    restrictions.push({
      restrictionId: source.restrictionId,
      kindRef: source.kindRef,
      geometry,
      description: source.description,
      sourceRef: source.sourceRef,
    })
  }

  const existingFeatures: ValidatedFeature[] = []
  for (let index = 0; index < draft.existingFeatures.length; index += 1) {
    const source = draft.existingFeatures[index]
    const resolvedFeature = resolved.featurePaths[index]
    if (source === undefined || resolvedFeature === undefined) continue
    if (source.kindRef.trim() === '' || source.toBeRetained === null) {
      blockers.push(finding(
        'E_GEOMETRY_INCOMPLETE',
        `Existing feature ${source.featureId} needs both a feature type and an explicit retain/remove decision.`,
        {
          observed: `kindRef=${JSON.stringify(source.kindRef)}, retained=${String(source.toBeRetained)}`,
          required: 'named type + explicit retention state',
        },
      ))
      continue
    }
    const geometry = validatedFeatureGeometry(
      resolvedFeature.geometry,
      `feature-${source.featureId}`,
      `Existing feature ${source.featureId}`,
      eps,
      blockers,
    )
    if (geometry === null) {
      if (resolvedFeature.geometry === null) {
        blockers.push(finding(
          'E_GEOMETRY_INCOMPLETE',
          `Existing feature ${source.featureId} has no resolvable geometry and would otherwise disappear from the sheet.`,
          { observed: 'null geometry', required: 'validated feature geometry' },
        ))
      }
      continue
    }
    existingFeatures.push({
      featureId: source.featureId,
      kindRef: source.kindRef,
      geometry,
      toBeRetained: source.toBeRetained,
      sourceRef: source.sourceRef,
    })
  }

  const levels: ValidatedLevel[] = []
  for (let index = 0; index < draft.levels.length; index += 1) {
    const source = draft.levels[index]
    const resolvedLevel = resolved.levels[index]
    if (source === undefined || resolvedLevel === undefined) continue
    if (
      !Number.isFinite(resolvedLevel.x)
      || !Number.isFinite(resolvedLevel.y)
      || resolvedLevel.elevation === null
      || resolvedLevel.datum === null
    ) {
      blockers.push(finding(
        'E_GEOMETRY_INCOMPLETE',
        `Level ${source.readingId} needs a finite location, elevation, and declared datum.`,
        {
          observed:
            `x=${String(resolvedLevel.x)}, y=${String(resolvedLevel.y)}, elevation=${String(resolvedLevel.elevation?.canonicalM)}, datum=${String(resolvedLevel.datum)}`,
          required: 'finite point + elevation + datum',
        },
      ))
      continue
    }
    if (resolvedLevel.datum === 'assumed') {
      warnings.push(finding(
        'W_ASSUMED_DATUM',
        `Level ${source.readingId} uses an assumed datum. It remains visible for professional review and requires explicit acknowledgement.`,
        { observed: 'assumed', required: 'MSL/local benchmark or acknowledged assumption' },
      ))
    }
    levels.push({
      readingId: resolvedLevel.readingId,
      x: resolvedLevel.x,
      y: resolvedLevel.y,
      elevation: resolvedLevel.elevation,
      datum: resolvedLevel.datum,
      benchmarkDescription: source.benchmark?.description ?? null,
    })
  }

  const projections: ValidatedProjection[] = []
  const validatedFootprintIds = new Set(footprints.map((footprint) => footprint.footprintId))
  for (let index = 0; index < draft.projections.length; index += 1) {
    const source = draft.projections[index]
    const resolvedProjection = resolved.projectionPaths[index]
    if (source === undefined || resolvedProjection === undefined) continue
    if (resolvedProjection.path === null) {
      blockers.push(finding(
        'E_GEOMETRY_INCOMPLETE',
        `Projection ${source.projectionId} was declared without a resolvable closed path.`,
        { observed: 'null projection path', required: 'validated closed projection path' },
      ))
      continue
    }
    if (
      source.attachedToFootprintId === null
      || !validatedFootprintIds.has(source.attachedToFootprintId)
    ) {
      blockers.push(finding(
        'E_REF_UNRESOLVED',
        `Projection ${source.projectionId} does not reference a validated footprint.`,
        {
          observed: String(source.attachedToFootprintId),
          required: 'attachedToFootprintId of a validated footprint',
        },
      ))
      continue
    }
    for (const [label, measurement] of [
      ['depth', resolvedProjection.projectionDepth],
      ['clear height', resolvedProjection.clearHeight],
    ] as const) {
      if (measurement !== null && measurement.canonicalM <= 0) {
        blockers.push(finding(
          'E_VALUE_OUT_OF_RANGE',
          `Projection ${source.projectionId} ${label} resolves to ${measurement.canonicalM} m and must be positive when supplied.`,
          { observed: `${measurement.canonicalM} m`, required: '> 0 m' },
        ))
      }
    }
    const shape = validatedPolygonShape(
      resolvedProjection.path,
      [],
      `Projection ${source.projectionId}`,
      eps,
      blockers,
    )
    if (shape === null) continue
    const built = buildRing(
      `projection-${source.projectionId}`,
      ringPointsFromPath(resolvedProjection.path, eps),
      resolvedProjection.path.closure,
    )
    projections.push({
      projectionId: source.projectionId,
      polygon: {
        polygonId: `projection-${source.projectionId}`,
        outer: built.ring,
        holes: [],
      },
      kind: source.kind,
      attachedToFootprintId: source.attachedToFootprintId,
      projectionDepth: resolvedProjection.projectionDepth,
      clearHeight: resolvedProjection.clearHeight,
    })
  }

  // -------------------------------- sliver ----------------------------------
  const metrics = sliverMetrics(outerBuilt.pts)
  if (
    metrics.aspectRatio > params.sliver.maxAspectRatio
    || metrics.minEdgeSeparation < params.sliver.minEdgeSeparationM
  ) {
    warnings.push(finding(
      'W_SLIVER_REVIEW',
      `The boundary is narrow: bounding-box aspect ratio ${metrics.aspectRatio.toFixed(1)}:1 and closest ` +
        `non-adjacent edge separation ${metrics.minEdgeSeparation.toFixed(3)} m. Narrow plots can be real, so this ` +
        `is a review item rather than a rejection — but it must be acknowledged.`,
      {
        observed: `${metrics.aspectRatio.toFixed(1)}:1, ${metrics.minEdgeSeparation.toFixed(3)} m`,
        required: `<= ${params.sliver.maxAspectRatio}:1 and >= ${params.sliver.minEdgeSeparationM} m`,
      },
    ))
  }

  // ------------------------------- dimensions -------------------------------
  const dimensions: ResolvedDimension[] = []
  const featurePathIds = collectFeaturePathIds(draft)
  for (const d of draft.dimensions) {
    if ((d.witnessPoints?.length ?? 0) > 0 || d.offset !== undefined) {
      blockers.push(finding(
        'E_DIMENSION_REQUEST_INVALID',
        `Dimension ${d.dimensionId} supplies witness-point or offset placement data that this exporter does not yet consume. The request is blocked rather than silently repositioned.`,
        {
          observed: `witnessPoints=${d.witnessPoints?.length ?? 0}, offset=${String(d.offset)}`,
          required: 'geometry-only request supported by the canonical dimension engine',
        },
      ))
      continue
    }
    const refs: GeometryRef[] = []
    let unresolved = false
    for (const r of d.references) {
      if (r.kind === 'edge') {
        const idx = edgeIndex.resolve(r.ref)
        const edge = idx === null ? undefined : edges[idx]
        if (edge === undefined) { unresolved = true; break }
        refs.push({ kind: 'edge', id: edge.edgeId })
      } else if (r.kind === 'vertex') {
        const vid = resolveVertexRef(r.ref, ringPointIds, outerBuilt.ring, draft)
        if (vid === null) { unresolved = true; break }
        refs.push({ kind: 'vertex', id: vid })
      } else if (r.kind === 'boundary') {
        refs.push({ kind: 'ring', id: outerBuilt.ring.ringId })
      } else {
        if (!featurePathIds.has(r.pathId)) {
          unresolved = true
          break
        }
        refs.push({ kind: 'ring', id: r.pathId })
      }
    }
    if (unresolved) {
      blockers.push(finding(
        'E_REF_UNRESOLVED',
        `Dimension ${d.dimensionId} references geometry that does not exist on this boundary.`,
      ))
      continue
    }
    const rawValue = measureDimension(d.kind, refs, outerBuilt.ring, computedSqm)
    if (rawValue === null || !Number.isFinite(rawValue)) {
      blockers.push(finding(
        'E_DIMENSION_REQUEST_INVALID',
        `Dimension ${d.dimensionId} has a reference pattern that cannot be measured unambiguously as ${d.kind}. No zero or guessed value is emitted.`,
        {
          observed: refs.map((ref) => `${ref.kind}:${ref.id}`).join(', ') || 'no references',
          required:
            d.kind === 'area'
              ? 'the plot boundary'
              : d.kind === 'chain'
                ? 'two or more plot edges'
                : d.kind === 'angle'
                  ? 'two connected plot edges or three plot vertices'
                  : 'one plot edge or exactly two plot vertices',
        },
      ))
      continue
    }
    dimensions.push({
      dimensionId: d.dimensionId,
      kind: d.kind,
      rawValue,
      displayValue: formatDisplay(rawValue, draft.drawing.displayPrecisionM ?? params.defaultDisplayPrecisionM),
      references: refs,
    })
  }

  // -------------------------------- evidence --------------------------------
  const requested = draft.drawing.requestedStamp
  if (requested !== 'ready-for-professional-review') {
    blockers.push(finding(
      'E_REVIEW_REQUEST_ABSENT',
      'Ready for Professional Review was not explicitly requested. A complete draft remains a Research Draft until its owner deliberately asks for elevation.',
      { observed: String(requested), required: 'requestedStamp=ready-for-professional-review' },
    ))
  }

  if ((draft.identity.projectName ?? '').trim() === '') {
    blockers.push(finding(
      'E_IDENTITY_INCOMPLETE',
      'The site/project name is blank. A review drawing must identify the land it describes.',
      { observed: 'blank projectName', required: 'non-empty project/site name' },
    ))
  }

  const drawingProblems: string[] = []
  if (
    draft.drawing.displayPrecisionM === null
    || !Number.isFinite(draft.drawing.displayPrecisionM)
    || draft.drawing.displayPrecisionM <= 0
  ) {
    drawingProblems.push(`displayPrecisionM=${String(draft.drawing.displayPrecisionM)}`)
  }
  if (draft.drawing.displayUnit === null) {
    drawingProblems.push('displayUnit=null')
  }
  if ((draft.drawing.sheetRef ?? '').trim() === '') {
    drawingProblems.push(`sheetRef=${String(draft.drawing.sheetRef)}`)
  }
  if (
    draft.drawing.declaredScaleDenominator === null
    || !Number.isFinite(draft.drawing.declaredScaleDenominator)
    || draft.drawing.declaredScaleDenominator <= 0
  ) {
    drawingProblems.push(`declaredScaleDenominator=${String(draft.drawing.declaredScaleDenominator)}`)
  }
  if (drawingProblems.length > 0) {
    blockers.push(finding(
      'E_DRAWING_PROFILE_INCOMPLETE',
      `The drawing profile is incomplete or unsafe: ${drawingProblems.join(', ')}. Sheet, scale, unit and precision are explicit inputs; none is defaulted at the review gate.`,
      {
        observed: drawingProblems.join(', '),
        required: 'positive precision + display unit + sheet + positive declared scale',
      },
    ))
  }

  if (draft.revisions.length === 0) {
    blockers.push(finding(
      'E_EVIDENCE_INCOMPLETE',
      'No revision/issue record identifies who created this drawing state and from which evidence.',
      { observed: '0 revisions', required: 'at least one sourced revision record' },
    ))
  }

  const missingProvenance = missingProvenancePaths(draft)
  if (missingProvenance.length > 0) {
    blockers.push(finding(
      'E_EVIDENCE_INCOMPLETE',
      `Review-ready inputs contain missing provenance at ${missingProvenance.slice(0, 8).join(', ')}${missingProvenance.length > 8 ? ` and ${missingProvenance.length - 8} more` : ''}. Null evidence links are never treated as verified.`,
      {
        observed: `${missingProvenance.length} null/blank evidence links`,
        required: 'evidenceRef/sourceRef on every supplied source-bearing input',
      },
    ))
  }

  const byId = new Map(draft.evidence.map((record) => [record.evidenceId, record]))
  const required = collectGeometryEvidence(draft)
  for (const identifier of draft.identity.identifiers) {
    if (identifier.sourceRef !== null) required.add(identifier.sourceRef)
  }
  for (const revision of draft.revisions) {
    if (revision.evidenceRef !== null) required.add(revision.evidenceRef)
  }
  if (required.size === 0) {
    for (const record of draft.evidence) required.add(record.evidenceId)
  }

  const unverified: string[] = []
  const incomplete: string[] = []
  for (const id of required) {
    const record = byId.get(id)
    if (record === undefined) {
      unverified.push(`${id} (missing record)`)
      continue
    }
    if (
      record.claimedVerification === 'unverified'
      || record.claimedVerification === 'self-declared'
      || (
        record.claimedVerification === 'professional-verified'
        && (
          record.responsibleProfessional === undefined
          || record.responsibleProfessional.name.trim() === ''
          || record.responsibleProfessional.licenceNumber.trim() === ''
        )
      )
    ) {
      unverified.push(`${id} (${record.claimedVerification})`)
    }

    const problems: string[] = []
    if (record.sourceTypeRef.trim() === '') problems.push('sourceTypeRef')
    if (!validIsoDate(record.sourceDate)) problems.push('sourceDate')
    if (record.originalUnit === undefined) problems.push('originalUnit')
    if (
      record.statedPrecision === undefined
      || !Number.isFinite(record.statedPrecision)
      || record.statedPrecision <= 0
    ) {
      problems.push('positive statedPrecision')
    }
    const file = record.file
    const hasDocumentIdentity =
      (record.documentId ?? '').trim() !== ''
      || (file?.storageRef ?? '').trim() !== ''
    if (!hasDocumentIdentity) problems.push('documentId or immutable storageRef')
    if (record.claimedVerification === 'document-attached' && file === undefined) {
      problems.push('attached file')
    }
    if (file !== undefined) {
      if (!/^[a-fA-F0-9]{64}$/.test(file.sha256)) problems.push('64-hex SHA-256')
      if (file.storageRef.trim() === '') problems.push('file.storageRef')
      if (file.filename.trim() === '') problems.push('file.filename')
      if (!Number.isFinite(file.bytes) || file.bytes <= 0) problems.push('positive file.bytes')
      if (file.mime.trim() === '') problems.push('file.mime')
    }
    if (record.claimedVerification === 'professional-verified') {
      const professional = record.responsibleProfessional
      if (
        professional === undefined
        || professional.name.trim() === ''
        || professional.licenceNumber.trim() === ''
      ) {
        problems.push('identified responsible professional')
      }
    }
    if (problems.length > 0) incomplete.push(`${id}: ${problems.join(', ')}`)
  }

  if (unverified.length > 0) {
    blockers.push(finding(
      'E_EVIDENCE_UNVERIFIED',
      `Ready status rests on evidence that is absent or only self-declared: ${unverified.join('; ')}. The verification label is checked rather than trusted decoratively.`,
      { observed: unverified.join('; '), required: 'document-attached or professional-verified evidence' },
    ))
  }
  if (incomplete.length > 0) {
    blockers.push(finding(
      'E_EVIDENCE_INCOMPLETE',
      `Evidence records are incomplete: ${incomplete.join('; ')}.`,
      {
        observed: incomplete.join('; '),
        required: 'source type, valid date, original unit/precision, document identity, and valid attachment/professional fields for the claimed state',
      },
    ))
  }

  // --------------------------- warning acknowledgement ----------------------
  const acknowledged = new Set(draft.acknowledgedWarnings.map((a) => a.code))
  const unacknowledged = warnings.filter((w) => !acknowledged.has(w.code as WarningCode))
  if (unacknowledged.length > 0) {
    blockers.push(finding(
      'E_WARNING_UNACKNOWLEDGED',
      `Review item(s) ${unacknowledged.map((w) => w.code).join(', ')} have not been acknowledged. ` +
        `They do not reject the plan, but elevation waits for a human to accept them.`,
      { observed: unacknowledged.map((w) => w.code).join(', '), required: 'explicit acknowledgement' },
    ))
  }

  // -------------------------------- overrides -------------------------------
  const { remaining, applied } = applyOverrides(draft, blockers)
  if (remaining.length > 0) {
    return { ok: false, stamp: 'research-draft', blockers: remaining, warnings, resolved }
  }

  // ---------------------------- assemble the plan ---------------------------
  const plotSurface: Polygon = {
    polygonId: 'plot-surface',
    outer: outerBuilt.ring,
    holes: holeRings.map((h) => h.ring),
  }
  const developableEnvelope: MultiPolygon = {
    components: shapes.map((s, i) => ({
      polygonId: `envelope-${i}`,
      outer: buildRing(`envelope-${i}-outer`, ptsToPoints(s.outer), { kind: 'explicit-closing-segment' }).ring,
      holes: s.holes.map((h, j) => buildRing(`envelope-${i}-hole-${j}`, ptsToPoints(h), { kind: 'explicit-closing-segment' }).ring),
    })),
  }

  const encumbrances: ValidatedEncumbrance[] = draft.encumbrances.map((e, i) => {
    const rp = resolved.encumbrancePaths[i]
    const g = rp?.geometry ?? null
    const components: Polygon[] = g !== null && g.geometryType === 'polygon'
      ? [{
          polygonId: `encumbrance-${e.encumbranceId}`,
          outer: buildRing(
            `encumbrance-${e.encumbranceId}-outer`,
            ringPointsFromPath(g.path, eps),
            g.path.closure,
          ).ring,
          holes: g.holes.map((hole, holeIndex) => buildRing(
            `encumbrance-${e.encumbranceId}-hole-${holeIndex}`,
            ringPointsFromPath(hole, eps),
            hole.closure,
          ).ring),
        }]
      : []
    return {
      encumbranceId: e.encumbranceId,
      kind: e.kind,
      surface: { components },
      clearance: rp?.clearance ?? null,
      description: e.description,
      sourceRef: e.sourceRef,
    }
  })

  const payload = {
    identity: {
      projectName: draft.identity.projectName ?? '',
      pilotProfileRef: draft.identity.pilotProfileRef,
      identifiers: draft.identity.identifiers,
    },
    drawing: {
      displayPrecisionM: draft.drawing.displayPrecisionM ?? params.defaultDisplayPrecisionM,
      displayUnit: draft.drawing.displayUnit ?? 'm',
      sheetRef: draft.drawing.sheetRef,
      declaredScaleDenominator: draft.drawing.declaredScaleDenominator,
    },
    plotSurface,
    developableEnvelope,
    frontages,
    encumbrances,
    restrictions,
    existingFeatures,
    levels,
    setbacks: validatedSetbacks,
    footprints,
    projections,
    dimensions,
    orientation: {
      northRotation: reducedNorth ?? resolved.northRotation ?? {
        canonicalDegrees: northDegrees ?? 0,
        from: { reference: northReference, sourceRef: null },
      },
      reference: northReference,
    },
    plotArea,
    closure,
    provenance: draft.evidence,
    appliedOverrides: applied,
    revisions: draft.revisions,
    acknowledgedWarnings: draft.acknowledgedWarnings as readonly AcknowledgedWarning[],
    stamp: 'ready-for-professional-review' as const,
  }

  const digestRecord: ValidationDigest = {
    digest: `${payloadHash(payload)}:${paramsHash(params)}`,
    kernelVersion: params.kernelVersion,
    validatedAt: new Date().toISOString(),
    specRevision: params.specRevision,
  }

  const plan = Object.defineProperty(payload, KERNEL_BRAND, {
    value: digestRecord,
    enumerable: false,
    configurable: false,
    writable: false,
  }) as unknown as ValidatedSitePlan

  deepFreeze(plan)
  return { ok: true, plan, warnings }
}

// ------------------------------- export gate ---------------------------------

export function assertExportable(plan: ValidatedSitePlan, expectedKernelVersion: string): void {
  const reject = (why: string, observed?: string): never => {
    throw new KernelError(finding(
      'E_EXPORT_DIGEST_INVALID',
      `Refusing to export: ${why}`,
      observed === undefined ? {} : { observed },
    ))
  }

  // Read OUR symbol specifically. Scanning for "any symbol key" would accept a
  // digest reattached under a freshly minted Symbol('...') — a forged brand that
  // happens to be shaped right. Only the module-private KERNEL_BRAND counts.
  if (!Object.prototype.hasOwnProperty.call(plan, KERNEL_BRAND)) {
    return reject(
      'the plan carries no kernel brand. A structuredClone or JSON round-trip drops the symbol, and a ' +
        'digest attached under any other symbol is not this kernel\'s brand. Revalidate before exporting.',
      'no kernel brand',
    )
  }
  const record = Reflect.get(plan, KERNEL_BRAND) as ValidationDigest | undefined
  if (record === undefined || typeof record.digest !== 'string') {
    return reject('the kernel brand carries no digest.')
  }
  if (record.kernelVersion !== expectedKernelVersion) {
    return reject(
      `the plan was validated by kernel "${record.kernelVersion}" but "${expectedKernelVersion}" is running. ` +
        'A plan is only valid against the kernel that produced it.',
      record.kernelVersion,
    )
  }

  const [storedPayload] = record.digest.split(':')
  const own: Record<string, unknown> = {}
  for (const key of Object.keys(plan)) {
    own[key] = (plan as unknown as Record<string, unknown>)[key]
  }
  if (payloadHash(own) !== storedPayload) {
    return reject(
      'the digest does not recompute over the payload it accompanies. The plan has been mutated, or a stale ' +
        'brand was reattached to different geometry. The type barrier stops accidents; this check stops the rest.',
      'digest mismatch',
    )
  }
}

// --------------------------- dimension integrity seam -------------------------

export function verifyDimensionIntegrity(
  dimensions: readonly ResolvedDimension[],
  plan: ValidatedSitePlan,
  params: KernelParameters,
): Finding[] {
  const out: Finding[] = []
  for (const d of dimensions) {
    const expected = measureDimension(
      d.kind, d.references, plan.plotSurface.outer, plan.plotArea.computedSqm,
    )
    if (expected === null || Math.abs(d.rawValue - expected) > params.epsM) {
      out.push(finding(
        'E_DIMENSION_MISMATCH',
        `Dimension ${d.dimensionId} reports ${d.rawValue} but its referenced geometry measures ${String(expected)} ` +
          `(difference ${expected === null ? 'unmeasurable' : Math.abs(d.rawValue - expected)} m, tolerance ${params.epsM} m). A dimension's number is ` +
          `derived from geometry, never carried alongside it.`,
        {
          observed: String(d.rawValue),
          required: expected === null ? 'measurable reference pattern' : String(expected),
          refs: [...d.references],
        },
      ))
    }
  }
  return out
}

// --------------------------------- helpers -----------------------------------

function collectFeaturePathIds(draft: SitePlanBriefDraft): Set<string> {
  const out = new Set<string>()
  const addPath = (value: unknown): void => {
    if (value === null || typeof value !== 'object') return
    if (Array.isArray(value)) {
      for (const item of value) addPath(item)
      return
    }
    const record = value as Record<string, unknown>
    if (
      typeof record['pathId'] === 'string'
      && Array.isArray(record['points'])
      && record['closure'] !== undefined
    ) {
      out.add(record['pathId'])
    }
    for (const child of Object.values(record)) addPath(child)
  }
  for (const branch of [
    draft.cadastralHoles,
    draft.encumbrances,
    draft.restrictions,
    draft.existingFeatures,
    draft.footprints,
    draft.projections,
  ]) {
    addPath(branch)
  }
  return out
}

/**
 * Every evidence id a geometry-bearing value leans on.
 *
 * Scoped to the branches that shape the drawing — boundary, area, holes,
 * encumbrances, setbacks, frontages, footprints, projections, levels,
 * orientation — and walked recursively so a nested `sourceRef` cannot escape.
 * Checking only the boundary coordinates was too narrow: a setback distance
 * traced to an unverified note could still carry the review stamp, and a setback
 * is exactly as load-bearing as a corner.
 *
 * Revisions and warning acknowledgements are deliberately excluded: they are
 * process records, not geometry.
 */
function collectGeometryEvidence(draft: SitePlanBriefDraft): Set<EvidenceId> {
  const out = new Set<EvidenceId>()
  const walk = (value: unknown): void => {
    if (value === null || typeof value !== 'object') return
    if (Array.isArray(value)) {
      for (const item of value) walk(item)
      return
    }
    const record = value as Record<string, unknown>
    const sourceRef = record['sourceRef']
    if (typeof sourceRef === 'string') out.add(sourceRef)
    const evidenceRef = record['evidenceRef']
    if (typeof evidenceRef === 'string') out.add(evidenceRef)
    for (const key of Object.keys(record)) walk(record[key])
  }
  for (const branch of [
    draft.boundary, draft.statedArea, draft.cadastralHoles, draft.encumbrances,
    draft.setbacks, draft.roadFrontages, draft.footprints, draft.projections,
    draft.restrictions, draft.existingFeatures, draft.levels, draft.orientation,
  ]) walk(branch)
  return out
}

function ptsToPoints(pts: readonly Pt[]): { pointId: string; x: number; y: number; preserveCollinear: boolean }[] {
  return pts.map((p, i) => ({ pointId: `p${i}`, x: p.x, y: p.y, preserveCollinear: false }))
}

function validatedFeatureGeometry(
  g: ResolvedSitePlan['featurePaths'][number]['geometry'],
  id: string,
  label: string,
  eps: number,
  blockers: Finding[],
): ValidatedFeature['geometry'] | null {
  if (g === null) return null
  if (g.geometryType === 'point') {
    if (!Number.isFinite(g.x) || !Number.isFinite(g.y)) {
      blockers.push(finding(
        'E_VALUE_NOT_FINITE',
        `${label} contains a non-finite point coordinate.`,
        { observed: `${String(g.x)}, ${String(g.y)}`, required: 'finite planar coordinates' },
      ))
      return null
    }
    return { geometryType: 'point', x: g.x, y: g.y }
  }
  if (g.geometryType === 'polyline') {
    if (g.path.closure.kind !== 'open') {
      blockers.push(finding(
        'E_GEOMETRY_INCOMPLETE',
        `${label} is typed as a polyline but carries ${g.path.closure.kind} closure. Closed area features must be represented as polygons.`,
        { observed: g.path.closure.kind, required: 'open polyline or polygon geometry type' },
      ))
      return null
    }
    if (g.path.points.length < 2) {
      blockers.push(finding(
        'E_GEOMETRY_INCOMPLETE',
        `${label} polyline has fewer than two vertices.`,
        { observed: `${g.path.points.length} vertices`, required: '>= 2 vertices' },
      ))
      return null
    }
    for (let index = 0; index < g.path.points.length - 1; index += 1) {
      const first = g.path.points[index]
      const second = g.path.points[index + 1]
      if (
        first !== undefined
        && second !== undefined
        && dist({ x: first.x, y: first.y }, { x: second.x, y: second.y }) <= eps
      ) {
        blockers.push(finding(
          'E_RING_DEGENERATE_EDGE',
          `${label} polyline contains a zero-length or tolerance-length segment at index ${index}.`,
          { observed: `segment ${index}`, required: `length > ${eps} m` },
        ))
        return null
      }
    }
    return {
      geometryType: 'polyline',
      vertices: g.path.points.map((point, index) => ({
        vertexId: `${id}#v${index}`,
        x: point.x,
        y: point.y,
        fromPointId: point.pointId,
        ...(point.monumentId === undefined ? {} : { monumentId: point.monumentId }),
        preservedCollinear: point.preserveCollinear,
      })),
    }
  }
  const shape = validatedPolygonShape(g.path, g.holes, label, eps, blockers)
  if (shape === null) return null
  return {
    geometryType: 'polygon',
    polygon: {
      polygonId: id,
      outer: buildRing(
        `${id}-outer`,
        ringPointsFromPath(g.path, eps),
        g.path.closure,
      ).ring,
      holes: g.holes.map((hole, index) => buildRing(
        `${id}-hole-${index}`,
        ringPointsFromPath(hole, eps),
        hole.closure,
      ).ring),
    },
  }
}

function describeRef(ref: DraftEdgeRef): string {
  if (ref.kind === 'path-edge') {
    return `path-edge ${ref.edge.pathId}:${ref.edge.fromPointId}->${ref.edge.toPointId}`
  }
  if (ref.kind === 'traverse-leg') return `traverse-leg ${ref.legId}`
  return `reconstructed-side ${ref.sideIndex}`
}

function resolveVertexRef(
  ref: { kind: string; pathId?: string; pointId?: string; legId?: string; end?: string; vertexIndex?: number },
  ringPointIds: readonly string[],
  ring: LinearRing,
  draft: SitePlanBriefDraft,
): string | null {
  const route = draft.boundary?.route ?? null
  if (ref.kind === 'path-point') {
    if (route !== 'coordinates' && route !== 'imported-file') return null
    const activePathId = (
      draft.boundary as {
        outerPath: { pathId: string } | null
      }
    ).outerPath?.pathId ?? null
    if (activePathId === null || ref.pathId !== activePathId) return null
    const i = ringPointIds.indexOf(ref.pointId ?? '')
    return i < 0 ? null : ring.vertices[i]?.vertexId ?? null
  }
  if (ref.kind === 'traverse-station') {
    if (route !== 'traverse') return null
    const legs = (draft.boundary as { legs: readonly { legId: string }[] }).legs
    const idx = legs.findIndex((l) => l.legId === ref.legId)
    if (idx < 0) return null
    const at = ref.end === 'end' ? (idx + 1) % ring.vertices.length : idx
    return ring.vertices[at]?.vertexId ?? null
  }
  if (ref.kind === 'reconstructed-corner') {
    if (route !== 'reconstructed') return null
    return ring.vertices[ref.vertexIndex ?? -1]?.vertexId ?? null
  }
  return null
}

function measureDimension(
  kind: ResolvedDimension['kind'],
  refs: readonly GeometryRef[],
  ring: LinearRing,
  plotAreaSqm: number,
): number | null {
  const onlyKinds = (...kinds: GeometryRef['kind'][]): boolean =>
    refs.every((ref) => kinds.includes(ref.kind))
  const vertex = (id: string): CanonicalVertex | undefined =>
    ring.vertices.find((candidate) => candidate.vertexId === id)
  const edge = (id: string): CanonicalEdge | undefined =>
    ring.edges.find((candidate) => candidate.edgeId === id)
  const distanceBetween = (first: CanonicalVertex, second: CanonicalVertex): number =>
    dist({ x: first.x, y: first.y }, { x: second.x, y: second.y })
  const angleBetween = (
    origin: CanonicalVertex,
    first: CanonicalVertex,
    second: CanonicalVertex,
  ): number | null => {
    const ax = first.x - origin.x
    const ay = first.y - origin.y
    const bx = second.x - origin.x
    const by = second.y - origin.y
    const denominator = Math.hypot(ax, ay) * Math.hypot(bx, by)
    if (!(denominator > 0)) return null
    const cosine = Math.max(-1, Math.min(1, (ax * bx + ay * by) / denominator))
    return (Math.acos(cosine) * 180) / Math.PI
  }

  if (kind === 'area') {
    return refs.length === 1
      && refs[0]?.kind === 'ring'
      && refs[0].id === ring.ringId
      ? plotAreaSqm
      : null
  }
  const edgeRefs = refs.filter((r) => r.kind === 'edge')
  const vertexRefs = refs.filter((r) => r.kind === 'vertex')

  if (kind === 'chain') {
    if (edgeRefs.length < 2 || !onlyKinds('edge')) return null
    let total = 0
    for (const r of edgeRefs) {
      const resolvedEdge = edge(r.id)
      if (resolvedEdge === undefined) return null
      total += resolvedEdge.lengthM
    }
    return total
  }

  if (kind === 'angle') {
    if (edgeRefs.length === 2 && onlyKinds('edge')) {
      const firstEdge = edge(edgeRefs[0]?.id ?? '')
      const secondEdge = edge(edgeRefs[1]?.id ?? '')
      if (firstEdge === undefined || secondEdge === undefined) return null
      const firstIds = [firstEdge.fromVertexId, firstEdge.toVertexId]
      const secondIds = [secondEdge.fromVertexId, secondEdge.toVertexId]
      const shared = firstIds.filter((id) => secondIds.includes(id))
      if (shared.length !== 1) return null
      const origin = vertex(shared[0] ?? '')
      const firstOther = vertex(firstIds.find((id) => id !== shared[0]) ?? '')
      const secondOther = vertex(secondIds.find((id) => id !== shared[0]) ?? '')
      return origin === undefined || firstOther === undefined || secondOther === undefined
        ? null
        : angleBetween(origin, firstOther, secondOther)
    }
    if (vertexRefs.length === 3 && onlyKinds('vertex')) {
      const first = vertex(vertexRefs[0]?.id ?? '')
      const origin = vertex(vertexRefs[1]?.id ?? '')
      const second = vertex(vertexRefs[2]?.id ?? '')
      return first === undefined || origin === undefined || second === undefined
        ? null
        : angleBetween(origin, first, second)
    }
    return null
  }

  if ((kind === 'aligned' || kind === 'linear') && edgeRefs.length === 1 && onlyKinds('edge')) {
    return edge(edgeRefs[0]?.id ?? '')?.lengthM ?? null
  }
  if ((kind === 'aligned' || kind === 'linear') && vertexRefs.length === 2 && onlyKinds('vertex')) {
    const first = vertex(vertexRefs[0]?.id ?? '')
    const second = vertex(vertexRefs[1]?.id ?? '')
    return first === undefined || second === undefined
      ? null
      : distanceBetween(first, second)
  }
  return null
}

function formatDisplay(value: number, precisionM: number): string {
  const decimals = precisionM > 0 ? Math.max(0, Math.round(-Math.log10(precisionM))) : 3
  return value.toFixed(Math.min(decimals, 6))
}

/**
 * Blockers a signed professional override may clear.
 *
 * Deliberately a very short list. An override is a professional ARBITRATING
 * between two sources that disagree — it is not a licence to supply information
 * the source never contained. `E_SETBACK_EDGE_UNCOVERED` means no setback was
 * stated for an edge; signing that away would turn a missing input into an
 * implicit zero and let a building run to the boundary. Same for unresolved
 * references, invalid topology, unverified evidence and every other code: the
 * remedy is to supply the datum, not to sign for its absence.
 *
 * Which further codes become overridable is PENDING-MANNU (M8).
 */
const OVERRIDABLE: ReadonlySet<string> = new Set([
  // A deed figure and a surveyed coordinate area can legitimately disagree, and
  // deciding between them is exactly a professional's call.
  'E_AREA_RECONCILIATION',
])

function applyOverrides(
  draft: SitePlanBriefDraft,
  blockers: readonly Finding[],
): { remaining: Finding[]; applied: AppliedOverride[] } {
  const applied: AppliedOverride[] = []
  const remaining: Finding[] = []
  for (const b of blockers) {
    const override = draft.overrides.find((o) => o.targetBlockerCode === b.code)
    if (override === undefined || !OVERRIDABLE.has(b.code)) {
      remaining.push(b)
      continue
    }
    applied.push({
      overrideId: override.overrideId,
      targetBlockerCode: override.targetBlockerCode,
      professional: override.professional,
      signedAt: override.signedAt,
      evidenceRef: override.evidenceRef,
      reason: override.reason,
    })
  }
  return { remaining, applied }
}


/** Unused import guard: LengthValue is part of the payload's public shape. */
export type { LengthValue }
