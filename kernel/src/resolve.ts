// ---------------------------------------------------------------------------
// Stage 1 — resolution (contract §7.5).
//
// Converts as-entered values into canonical metres in a planar working frame.
// Resolution can fail on units, frames, angle forms and non-finite values. It
// deliberately does NOT judge topology, closure, area or containment: a bow-tie
// still has real metres, and we must be able to hold it in order to report where
// it crosses.
// ---------------------------------------------------------------------------
import type {
  CandidateAssembly,
  CoordinateFrame,
  Finding,
  FeatureGeometryDraft,
  KernelParameters,
  ResolvedFeatureGeometry,
  ResolvedPath,
  ResolvedPoint,
  ResolvedSitePlan,
  SitePlanBriefDraft,
  SourcePath,
  TraverseBoundary,
} from './contract.ts'
import { METRES_PER_EXACT_LENGTH, finding, resolveAngle, resolveArea, resolveLength } from './units.ts'
import { enumerateAssemblies } from './reconstruct.ts'
import { cosDeg, dist, sinDeg } from './geom.ts'

type WorkingFrame = { crsCode: string | null; isLocal: boolean }

/** Metres-per-axis-unit for a declared frame, or a finding when undeclarable. */
function frameScale(frame: CoordinateFrame): { scale: number | null; findings: Finding[] } {
  if (frame.kind === 'geographic') {
    if (frame.projectionToPlanar === null) {
      return {
        scale: null,
        findings: [finding(
          'E_FRAME_UNPROJECTED',
          `Geographic coordinates in ${frame.crsCode} carry no verified projection to a planar frame. ` +
            `Degrees are not metres and will not be treated as such.`,
          { observed: frame.crsCode, required: 'projectionToPlanar' },
        )],
      }
    }
    // A NAMED target CRS is not a performed projection. Reprojection is not
    // implemented in this phase, so degrees stay degrees and the frame blocks —
    // relabelling longitude as metres would silently move a plot ~111 km per
    // degree while every input still read back faithfully.
    return {
      scale: null,
      findings: [finding(
        'E_FRAME_UNPROJECTED',
        `Geographic coordinates in ${frame.crsCode} declare a target of ` +
          `${frame.projectionToPlanar.targetCrsCode}, but this kernel performs no reprojection. ` +
          `Naming a target CRS is not the same as projecting to it; supply planar coordinates.`,
        { observed: `${frame.crsCode} -> ${frame.projectionToPlanar.targetCrsCode}`, required: 'planar coordinates' },
      )],
    }
  }
  const scale = METRES_PER_EXACT_LENGTH[frame.axisUnit]
  if (scale === undefined) {
    return {
      scale: null,
      findings: [finding(
        'E_FRAME_UNDECLARED',
        `Frame axis unit "${frame.axisUnit}" is not an exact length unit; a planar frame must declare one.`,
        { observed: frame.axisUnit },
      )],
    }
  }
  return { scale, findings: [] }
}

function frameCompatibilityFinding(
  frame: CoordinateFrame,
  expected: WorkingFrame | undefined,
  label: string,
): Finding | null {
  if (expected === undefined || frame.kind !== 'planar') return null
  if (frame.crsCode === expected.crsCode && frame.isLocal === expected.isLocal) {
    return null
  }
  const observed = `${frame.isLocal ? 'local' : 'georeferenced'}:${String(frame.crsCode)}`
  const required = `${expected.isLocal ? 'local' : 'georeferenced'}:${String(expected.crsCode)}`
  return finding(
    'E_FRAME_UNPROJECTED',
    `${label} uses frame ${observed}, while the plot working frame is ${required}. ` +
      `Scaling axis units is not a coordinate transform; supply geometry in the working frame or perform a verified reprojection.`,
    { observed, required },
  )
}

function resolvePath(
  path: SourcePath,
  eps: number,
  label: string,
  expectedFrame?: WorkingFrame,
): {
  value: ResolvedPath | null
  findings: Finding[]
} {
  const findings: Finding[] = []
  const compatibility = frameCompatibilityFinding(path.frame, expectedFrame, label)
  if (compatibility !== null) findings.push(compatibility)
  const { scale, findings: frameFindings } = frameScale(path.frame)
  findings.push(...frameFindings)
  if (scale === null || compatibility !== null) return { value: null, findings }

  const points: ResolvedPoint[] = []
  for (const p of path.points) {
    if (!Number.isFinite(p.axis1) || !Number.isFinite(p.axis2)) {
      findings.push(finding(
        'E_VALUE_NOT_FINITE',
        `${label} point ${p.pointId} has a non-finite coordinate (${String(p.axis1)}, ${String(p.axis2)}).`,
        {
          observed: `(${String(p.axis1)}, ${String(p.axis2)})`,
          refs: [{ kind: 'vertex', ref: { kind: 'path-point', pathId: path.pathId, pointId: p.pointId } }],
        },
      ))
      return { value: null, findings }
    }
    points.push({
      pointId: p.pointId,
      x: p.axis1 * scale,
      y: p.axis2 * scale,
      fromSourcePointId: p.pointId,
      ...(p.monumentId === undefined ? {} : { monumentId: p.monumentId }),
      preserveCollinear: p.preserveCollinear === true,
    })
  }

  let endpointGapM: number | null = null
  if (path.closure.kind === 'repeated-first-point' && points.length >= 2) {
    const first = points[0]
    const last = points[points.length - 1]
    if (first !== undefined && last !== undefined) {
      endpointGapM = dist({ x: first.x, y: first.y }, { x: last.x, y: last.y })
    }
  }
  void eps
  return {
    value: { pathId: path.pathId, points, closure: path.closure, endpointGapM },
    findings,
  }
}

function resolveFeatureGeometry(
  geometry: FeatureGeometryDraft | null,
  eps: number,
  label: string,
  expectedFrame?: WorkingFrame,
): { value: ResolvedFeatureGeometry | null; findings: Finding[] } {
  if (geometry === null) return { value: null, findings: [] }
  if (geometry.geometryType === 'point') {
    const compatibility = frameCompatibilityFinding(
      geometry.frame,
      expectedFrame,
      label,
    )
    const { scale, findings } = frameScale(geometry.frame)
    if (compatibility !== null) findings.push(compatibility)
    if (scale === null || compatibility !== null) return { value: null, findings }
    if (!Number.isFinite(geometry.axis1) || !Number.isFinite(geometry.axis2)) {
      return {
        value: null,
        findings: [finding(
          'E_VALUE_NOT_FINITE',
          `${label} has a non-finite coordinate.`,
          { observed: `(${String(geometry.axis1)}, ${String(geometry.axis2)})` },
        )],
      }
    }
    return {
      value: { geometryType: 'point', x: geometry.axis1 * scale, y: geometry.axis2 * scale },
      findings,
    }
  }
  if (geometry.geometryType === 'polyline') {
    const r = resolvePath(geometry.path, eps, label, expectedFrame)
    return r.value === null
      ? { value: null, findings: r.findings }
      : { value: { geometryType: 'polyline', path: r.value }, findings: r.findings }
  }
  const outer = resolvePath(geometry.path, eps, label, expectedFrame)
  const findings = [...outer.findings]
  if (outer.value === null) return { value: null, findings }
  const holes: ResolvedPath[] = []
  for (const h of geometry.holes) {
    const rh = resolvePath(h, eps, `${label} hole`, expectedFrame)
    findings.push(...rh.findings)
    if (rh.value !== null) holes.push(rh.value)
  }
  return { value: { geometryType: 'polygon', path: outer.value, holes }, findings }
}

/**
 * Stations of a closed traverse.
 *
 * Returns TWO different things, and the difference matters:
 *
 * - `perimeterM` / `misclosureM` are computed from the **raw** observations. That
 *   is the survey's own quality figure and it is what the closure profile gates.
 *   Nothing adjusted feeds into it.
 * - `stations` are the unadjusted start station of each observed leg. A
 *   non-closing traverse therefore remains non-closing here. If construction
 *   geometry is requested, `TraverseBoundary.adjustment.adjustedPath` must carry
 *   the professionally approved, explicitly closed station path.
 *
 * Bearings are azimuths from north, clockwise: dx = d·sin θ, dy = d·cos θ.
 */
export function traverseStations(
  boundary: TraverseBoundary,
): {
  stations: { x: number; y: number }[]
  perimeterM: number
  misclosureM: number
  rawLegLengthsM: number[]
  findings: Finding[]
} {
  const findings: Finding[] = []
  const start = boundary.startPoint
  let originX = 0
  let originY = 0
  if (start !== null) {
    const { scale, findings: f } = frameScale(start.frame)
    findings.push(...f)
    if (scale !== null) {
      if (!Number.isFinite(start.axis1) || !Number.isFinite(start.axis2)) {
        findings.push(finding(
          'E_VALUE_NOT_FINITE',
          `Traverse start point has a non-finite coordinate (${String(start.axis1)}, ${String(start.axis2)}).`,
          { observed: `(${String(start.axis1)}, ${String(start.axis2)})` },
        ))
        return {
          stations: [],
          perimeterM: 0,
          misclosureM: Number.NaN,
          rawLegLengthsM: [],
          findings,
        }
      }
      originX = start.axis1 * scale
      originY = start.axis2 * scale
      if (!Number.isFinite(originX) || !Number.isFinite(originY)) {
        findings.push(finding(
          'E_VALUE_NOT_FINITE',
          `Traverse start point overflows after frame conversion.`,
          { observed: `(${String(originX)}, ${String(originY)})` },
        ))
        return {
          stations: [],
          perimeterM: 0,
          misclosureM: Number.NaN,
          rawLegLengthsM: [],
          findings,
        }
      }
    }
  }

  const vectors: { dx: number; dy: number; length: number }[] = []
  for (const leg of boundary.legs) {
    const bearing = resolveAngle(leg.bearing, `traverse leg ${leg.legId} bearing`)
    const distance = resolveLength(leg.distance, `traverse leg ${leg.legId} distance`)
    findings.push(...bearing.findings, ...distance.findings)
    if (bearing.value === null || distance.value === null) {
      return {
        stations: [],
        perimeterM: 0,
        misclosureM: Number.NaN,
        rawLegLengthsM: [],
        findings,
      }
    }
    const deg = bearing.value.canonicalDegrees
    const d = distance.value.canonicalM
    vectors.push({ dx: d * sinDeg(deg), dy: d * cosDeg(deg), length: d })
  }

  // Misclosure is measured on the RAW observations — that is the survey's own
  // quality figure and the profile gate must judge it, not an adjusted version.
  let sumX = 0
  let sumY = 0
  let perimeterM = 0
  for (const v of vectors) {
    sumX += v.dx
    sumY += v.dy
    perimeterM += v.length
  }
  const misclosureM = Math.hypot(sumX, sumY)

  const stations: { x: number; y: number }[] = [{ x: originX, y: originY }]
  for (let i = 0; i < vectors.length - 1; i += 1) {
    const v = vectors[i]
    const prev = stations[stations.length - 1]
    if (v === undefined || prev === undefined) break
    stations.push({ x: prev.x + v.dx, y: prev.y + v.dy })
  }
  return {
    stations,
    perimeterM,
    misclosureM,
    rawLegLengthsM: vectors.map((vector) => vector.length),
    findings,
  }
}

export function resolveSitePlan(
  draft: SitePlanBriefDraft,
  params: KernelParameters,
): ResolvedSitePlan {
  const eps = params.epsM
  const findings: Finding[] = []

  let outerPath: ResolvedPath | null = null
  let workingFrame: WorkingFrame = { crsCode: null, isLocal: true }
  let candidateAssemblies: CandidateAssembly[] = []

  const boundary = draft.boundary
  if (boundary !== null) {
    if (boundary.route === 'coordinates' || boundary.route === 'imported-file') {
      let unitsBlocked = false
      if (boundary.route === 'imported-file') {
        const u = boundary.units
        const pathUnit = boundary.outerPath?.frame.kind === 'planar'
          ? boundary.outerPath.frame.axisUnit
          : null
        if (u.state !== 'confirmed') {
          unitsBlocked = true
          findings.push(finding(
            'E_UNIT_AMBIGUOUS',
            `Imported boundary units are "${u.state}". A CAD file's units are never assumed.`,
            { observed: u.state, required: 'confirmed' },
          ))
        } else if (u.confirmedBy === null) {
          unitsBlocked = true
          findings.push(finding(
            'E_UNIT_AMBIGUOUS',
            `Imported units are marked confirmed but name no confirmer. "Confirmed" is a claim about a human ` +
              `decision; without the reference there is nothing to check.`,
            { observed: 'confirmed with confirmedBy=null', required: 'confirmedBy' },
          ))
        } else if (u.interpretedAs !== null && pathUnit !== null && u.interpretedAs !== pathUnit) {
          unitsBlocked = true
          findings.push(finding(
            'E_UNIT_AMBIGUOUS',
            `Imported units were confirmed as "${u.interpretedAs}" but the extracted path frame declares ` +
              `"${pathUnit}". Two disagreeing unit claims cannot both be right, and picking one would scale the ` +
              `whole plot by ${(0.3048).toString()}x or its inverse.`,
            { observed: `${u.interpretedAs} vs ${pathUnit}`, required: 'agreement' },
          ))
        }
      }
      const path = unitsBlocked ? null : boundary.outerPath
      if (path !== null) {
        if (path.frame.kind === 'planar') {
          workingFrame = { crsCode: path.frame.crsCode, isLocal: path.frame.isLocal }
        } else {
          workingFrame = { crsCode: path.frame.crsCode, isLocal: false }
        }
        const r = resolvePath(path, eps, 'Boundary')
        findings.push(...r.findings)
        outerPath = r.value
      }
    } else if (boundary.route === 'traverse') {
      if (boundary.startPoint?.frame.kind === 'planar') {
        workingFrame = {
          crsCode: boundary.startPoint.frame.crsCode,
          isLocal: boundary.startPoint.frame.isLocal,
        }
      }
      const t = traverseStations(boundary)
      findings.push(...t.findings)
      if (boundary.adjustment !== null) {
        const adjusted = resolvePath(
          boundary.adjustment.adjustedPath,
          eps,
          'Professionally adjusted traverse',
          workingFrame,
        )
        findings.push(...adjusted.findings)
        outerPath = adjusted.value
      } else if (t.stations.length >= 3) {
        outerPath = {
          pathId: 'traverse-derived',
          points: t.stations.map((s, i) => ({
            pointId: `station-${i}`,
            x: s.x,
            y: s.y,
            fromSourcePointId: `station-${i}`,
            preserveCollinear: false,
          })),
          closure: { kind: 'explicit-closing-segment' },
          endpointGapM: null,
        }
      }
    } else {
      const enumerated = enumerateAssemblies(boundary, eps)
      findings.push(...enumerated.findings)
      candidateAssemblies = enumerated.candidates
      if (enumerated.chosen !== null) {
        outerPath = {
          pathId: 'reconstructed-derived',
          points: enumerated.chosen.vertices.map((v, i) => ({
            pointId: `corner-${i}`,
            x: v.x,
            y: v.y,
            fromSourcePointId: `corner-${i}`,
            preserveCollinear: false,
          })),
          closure: { kind: 'explicit-closing-segment' },
          endpointGapM: null,
        }
      }
    }
  }

  const statedArea = resolveArea(draft.statedArea, 'Stated plot area')
  findings.push(...statedArea.findings)

  const orientation = draft.orientation
  const northRotation = orientation.basis === 'explicit-rotation'
    ? resolveAngle(orientation.northRotation, 'North rotation')
    : { value: null, findings: [] as Finding[] }
  findings.push(...northRotation.findings)

  const cadastralHolePaths: ResolvedPath[] = []
  for (const hole of draft.cadastralHoles) {
    const r = resolvePath(
      hole.path,
      eps,
      `Cadastral hole ${hole.holeId}`,
      workingFrame,
    )
    findings.push(...r.findings)
    if (r.value !== null) cadastralHolePaths.push(r.value)
  }

  const encumbrancePaths: ResolvedSitePlan['encumbrancePaths'] = []
  for (const e of draft.encumbrances) {
    const g = resolveFeatureGeometry(
      e.geometry,
      eps,
      `Encumbrance ${e.encumbranceId}`,
      workingFrame,
    )
    const clearance = resolveLength(e.clearance, `Encumbrance ${e.encumbranceId} clearance`)
    findings.push(...g.findings, ...clearance.findings)
    encumbrancePaths.push({
      encumbranceId: e.encumbranceId,
      geometry: g.value,
      clearance: clearance.value,
    })
  }

  const restrictionPaths: ResolvedSitePlan['restrictionPaths'] = []
  for (const r of draft.restrictions) {
    const g = resolveFeatureGeometry(
      r.geometry,
      eps,
      `Restriction ${r.restrictionId}`,
      workingFrame,
    )
    findings.push(...g.findings)
    restrictionPaths.push({ restrictionId: r.restrictionId, geometry: g.value })
  }

  const featurePaths: ResolvedSitePlan['featurePaths'] = []
  for (const f of draft.existingFeatures) {
    const g = resolveFeatureGeometry(
      f.geometry,
      eps,
      `Feature ${f.featureId}`,
      workingFrame,
    )
    findings.push(...g.findings)
    featurePaths.push({ featureId: f.featureId, geometry: g.value })
  }

  const footprintPaths: ResolvedSitePlan['footprintPaths'] = []
  for (const fp of draft.footprints) {
    const p = fp.path === null
      ? { value: null, findings: [] as Finding[] }
      : resolvePath(fp.path, eps, `Footprint ${fp.footprintId}`, workingFrame)
    findings.push(...p.findings)
    const holes: ResolvedPath[] = []
    for (const h of fp.holes) {
      const rh = resolvePath(
        h,
        eps,
        `Footprint ${fp.footprintId} hole`,
        workingFrame,
      )
      findings.push(...rh.findings)
      if (rh.value !== null) holes.push(rh.value)
    }
    footprintPaths.push({ footprintId: fp.footprintId, path: p.value, holes, origin: fp.origin })
  }

  const projectionPaths: ResolvedSitePlan['projectionPaths'] = []
  for (const pr of draft.projections) {
    const p = pr.path === null
      ? { value: null, findings: [] as Finding[] }
      : resolvePath(pr.path, eps, `Projection ${pr.projectionId}`, workingFrame)
    const projectionDepth = resolveLength(
      pr.projectionDepth,
      `Projection ${pr.projectionId} depth`,
    )
    const clearHeight = resolveLength(
      pr.clearHeight,
      `Projection ${pr.projectionId} clear height`,
    )
    findings.push(
      ...p.findings,
      ...projectionDepth.findings,
      ...clearHeight.findings,
    )
    projectionPaths.push({
      projectionId: pr.projectionId,
      path: p.value,
      projectionDepth: projectionDepth.value,
      clearHeight: clearHeight.value,
    })
  }

  const setbacks: ResolvedSitePlan['setbacks'] = draft.setbacks.map((s) => {
    const d = resolveLength(s.distance, `Setback ${s.setbackId} distance`)
    findings.push(...d.findings)
    return { setbackId: s.setbackId, edges: s.edges, distance: d.value, basis: s.basis }
  })

  const frontages: ResolvedSitePlan['frontages'] = draft.roadFrontages.map((f) => {
    const cw = resolveLength(f.carriagewayWidth, `Frontage ${f.frontageId} carriageway width`)
    const rw = resolveLength(f.rowWidth, `Frontage ${f.frontageId} right-of-way width`)
    findings.push(...cw.findings, ...rw.findings)
    return {
      frontageId: f.frontageId,
      edges: f.edges,
      carriagewayWidth: cw.value,
      rowWidth: rw.value,
    }
  })

  const levels: ResolvedSitePlan['levels'] = []
  for (const l of draft.levels) {
    const loc = resolveFeatureGeometry(
      l.location,
      eps,
      `Level ${l.readingId}`,
      workingFrame,
    )
    const elevation = resolveLength(l.elevation, `Level ${l.readingId} elevation`)
    findings.push(...loc.findings, ...elevation.findings)
    const at = loc.value !== null && loc.value.geometryType === 'point'
      ? { x: loc.value.x, y: loc.value.y }
      : { x: Number.NaN, y: Number.NaN }
    levels.push({ readingId: l.readingId, x: at.x, y: at.y, elevation: elevation.value, datum: l.datum })
  }

  return {
    briefId: draft.briefId,
    workingFrame,
    outerPath,
    cadastralHolePaths,
    encumbrancePaths,
    restrictionPaths,
    featurePaths,
    footprintPaths,
    projectionPaths,
    setbacks,
    frontages,
    levels,
    statedArea: statedArea.value,
    northRotation: northRotation.value,
    candidateAssemblies,
    findings,
  }
}
