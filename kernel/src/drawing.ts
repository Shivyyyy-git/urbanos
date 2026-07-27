// ---------------------------------------------------------------------------
// UrbanOS construction-sheet drawing model.
//
// This is the only geometry seam used by the DXF and PDF writers. It accepts a
// kernel-branded ValidatedSitePlan (never a draft), preserves model-space
// coordinates in metres, and emits deterministic vector primitives. Exporters
// may style the primitives differently, but may not rebuild their geometry.
// ---------------------------------------------------------------------------
import type {
  CanonicalEdge,
  CanonicalVertex,
  GeometryRef,
  LinearRing,
  Polygon,
  ResolvedDimension,
  ValidatedFeatureGeometry,
  ValidatedSitePlan,
} from './contract.ts'
import { KernelError } from './errors.ts'

export type DrawingPoint = readonly [x: number, y: number]

export type DrawingLayer =
  | 'PLOT-BOUNDARY'
  | 'CADASTRAL-HOLE'
  | 'DEVELOPABLE-ENVELOPE'
  | 'ROAD-FRONTAGE'
  | 'ENCUMBRANCE'
  | 'RESTRICTION'
  | 'EXISTING-FEATURE'
  | 'SETBACK'
  | 'FOOTPRINT'
  | 'PROJECTION'
  | 'LEVEL'
  | 'DIMENSION'
  | 'NORTH'
  | 'ANNOTATION'

export interface DrawingLayerStyle {
  name: DrawingLayer
  aci: number
  rgb: readonly [red: number, green: number, blue: number]
  lineWeightMm: number
  dashed: boolean
}

export const DRAWING_LAYERS: readonly DrawingLayerStyle[] = [
  { name: 'PLOT-BOUNDARY', aci: 7, rgb: [0.08, 0.08, 0.08], lineWeightMm: 0.60, dashed: false },
  { name: 'CADASTRAL-HOLE', aci: 1, rgb: [0.70, 0.10, 0.10], lineWeightMm: 0.45, dashed: false },
  { name: 'DEVELOPABLE-ENVELOPE', aci: 3, rgb: [0.00, 0.42, 0.16], lineWeightMm: 0.40, dashed: false },
  { name: 'ROAD-FRONTAGE', aci: 5, rgb: [0.10, 0.25, 0.72], lineWeightMm: 0.70, dashed: false },
  { name: 'ENCUMBRANCE', aci: 1, rgb: [0.76, 0.15, 0.15], lineWeightMm: 0.35, dashed: true },
  { name: 'RESTRICTION', aci: 6, rgb: [0.56, 0.18, 0.62], lineWeightMm: 0.30, dashed: true },
  { name: 'EXISTING-FEATURE', aci: 8, rgb: [0.42, 0.42, 0.42], lineWeightMm: 0.30, dashed: false },
  { name: 'SETBACK', aci: 30, rgb: [0.78, 0.38, 0.06], lineWeightMm: 0.30, dashed: true },
  { name: 'FOOTPRINT', aci: 4, rgb: [0.04, 0.45, 0.58], lineWeightMm: 0.55, dashed: false },
  { name: 'PROJECTION', aci: 2, rgb: [0.58, 0.48, 0.02], lineWeightMm: 0.30, dashed: true },
  { name: 'LEVEL', aci: 7, rgb: [0.18, 0.18, 0.18], lineWeightMm: 0.25, dashed: false },
  { name: 'DIMENSION', aci: 2, rgb: [0.30, 0.30, 0.28], lineWeightMm: 0.18, dashed: false },
  { name: 'NORTH', aci: 7, rgb: [0.08, 0.08, 0.08], lineWeightMm: 0.40, dashed: false },
  { name: 'ANNOTATION', aci: 7, rgb: [0.04, 0.04, 0.04], lineWeightMm: 0.18, dashed: false },
] as const

export interface DrawingPath {
  kind: 'path'
  /** Stable across DXF, PDF and the parity manifest. */
  id: string
  layer: DrawingLayer
  points: readonly DrawingPoint[]
  closed: boolean
  /** True when fixture 29 must round-trip every coordinate. */
  critical: boolean
  sourceIds: readonly string[]
}

export interface DrawingText {
  kind: 'text'
  id: string
  layer: DrawingLayer
  at: DrawingPoint
  /** Paper height. Each writer converts it at the declared 1:N scale. */
  heightMm: number
  text: string
  rotationDegrees: number
  align: 'left' | 'center' | 'right'
  bold: boolean
}

export interface DrawingBounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

export interface DrawingModel {
  coordinateUnit: 'm'
  scaleDenominator: number
  projectName: string
  reviewStatus: 'READY FOR PROFESSIONAL REVIEW - NOT FOR CONSTRUCTION'
  boundaryProvenanceNote: string | null
  paths: readonly DrawingPath[]
  texts: readonly DrawingText[]
  bounds: DrawingBounds
  plotAreaSqm: number
  northRotationDegrees: number
  northReference: 'true' | 'grid'
  drawingPrecisionM: number
}

interface GeometryIndex {
  vertices: Map<string, CanonicalVertex>
  edges: Map<string, { edge: CanonicalEdge; from: CanonicalVertex; to: CanonicalVertex }>
  rings: Map<string, LinearRing>
}

function parityError(message: string, observed?: string, required?: string): never {
  throw new KernelError({
    code: 'E_EXPORT_PARITY',
    message,
    ...(observed === undefined ? {} : { observed }),
    ...(required === undefined ? {} : { required }),
  })
}

function finitePoint(point: DrawingPoint, label: string): DrawingPoint {
  if (!Number.isFinite(point[0]) || !Number.isFinite(point[1])) {
    return parityError(
      `${label} contains a non-finite coordinate. Export stops rather than writing corrupt CAD/PDF bytes.`,
      `${String(point[0])}, ${String(point[1])}`,
      'finite model-space metres',
    )
  }
  return point
}

function pointsOf(ring: LinearRing): DrawingPoint[] {
  return ring.vertices.map((vertex) => finitePoint(
    [vertex.x, vertex.y],
    `Ring ${ring.ringId}`,
  ))
}

function buildGeometryIndex(plan: ValidatedSitePlan): GeometryIndex {
  const vertices = new Map<string, CanonicalVertex>()
  const edges = new Map<string, {
    edge: CanonicalEdge
    from: CanonicalVertex
    to: CanonicalVertex
  }>()
  const rings = new Map<string, LinearRing>()

  const addRing = (ring: LinearRing): void => {
    const priorRing = rings.get(ring.ringId)
    if (priorRing !== undefined && priorRing !== ring) {
      parityError(
        `Canonical ring id "${ring.ringId}" is not unique. Export references would be ambiguous.`,
      )
    }
    rings.set(ring.ringId, ring)
    for (const vertex of ring.vertices) {
      const priorVertex = vertices.get(vertex.vertexId)
      if (
        priorVertex !== undefined
        && (priorVertex.x !== vertex.x || priorVertex.y !== vertex.y)
      ) {
        parityError(
          `Canonical vertex id "${vertex.vertexId}" resolves to two different coordinates.`,
        )
      }
      vertices.set(vertex.vertexId, vertex)
    }
    for (const edge of ring.edges) {
      const from = vertices.get(edge.fromVertexId)
      const to = vertices.get(edge.toVertexId)
      if (from === undefined || to === undefined) {
        parityError(
          `Canonical edge "${edge.edgeId}" has an unresolved endpoint.`,
        )
      }
      const priorEdge = edges.get(edge.edgeId)
      if (
        priorEdge !== undefined
        && (
          priorEdge.from.x !== from.x
          || priorEdge.from.y !== from.y
          || priorEdge.to.x !== to.x
          || priorEdge.to.y !== to.y
        )
      ) {
        parityError(
          `Canonical edge id "${edge.edgeId}" resolves to two different segments.`,
        )
      }
      edges.set(edge.edgeId, { edge, from, to })
    }
  }

  const addPolygon = (polygon: Polygon): void => {
    addRing(polygon.outer)
    for (const hole of polygon.holes) addRing(hole)
  }
  const addFeatureGeometry = (geometry: ValidatedFeatureGeometry | null): void => {
    if (geometry === null) return
    if (geometry.geometryType === 'polygon') {
      addPolygon(geometry.polygon)
      return
    }
    if (geometry.geometryType === 'polyline') {
      for (const vertex of geometry.vertices) vertices.set(vertex.vertexId, vertex)
    }
  }

  addPolygon(plan.plotSurface)
  for (const polygon of plan.developableEnvelope.components) addPolygon(polygon)
  for (const encumbrance of plan.encumbrances) {
    for (const polygon of encumbrance.surface.components) addPolygon(polygon)
  }
  for (const restriction of plan.restrictions) addFeatureGeometry(restriction.geometry)
  for (const feature of plan.existingFeatures) addFeatureGeometry(feature.geometry)
  for (const footprint of plan.footprints) addPolygon(footprint.polygon)
  for (const projection of plan.projections) addPolygon(projection.polygon)

  return { vertices, edges, rings }
}

function addPolygonPaths(
  paths: DrawingPath[],
  layer: DrawingLayer,
  prefix: string,
  polygon: Polygon,
  sourceIds: readonly string[],
): void {
  paths.push({
    kind: 'path',
    id: `${prefix}:outer:${polygon.outer.ringId}`,
    layer,
    points: pointsOf(polygon.outer),
    closed: true,
    critical: true,
    sourceIds: [...sourceIds, polygon.outer.ringId],
  })
  for (const hole of polygon.holes) {
    paths.push({
      kind: 'path',
      id: `${prefix}:hole:${hole.ringId}`,
      layer,
      points: pointsOf(hole),
      closed: true,
      critical: true,
      sourceIds: [...sourceIds, hole.ringId],
    })
  }
}

function addFeaturePaths(
  paths: DrawingPath[],
  texts: DrawingText[],
  layer: DrawingLayer,
  prefix: string,
  geometry: ValidatedFeatureGeometry | null,
  sourceIds: readonly string[],
  scaleDenominator: number,
): void {
  if (geometry === null) return
  if (geometry.geometryType === 'point') {
    const arm = (2 * scaleDenominator) / 1000
    const point = finitePoint([geometry.x, geometry.y], `${prefix} point`)
    paths.push(
      {
        kind: 'path',
        id: `${prefix}:point-horizontal`,
        layer,
        points: [
          [point[0] - arm, point[1]],
          [point[0] + arm, point[1]],
        ],
        closed: false,
        critical: true,
        sourceIds,
      },
      {
        kind: 'path',
        id: `${prefix}:point-vertical`,
        layer,
        points: [
          [point[0], point[1] - arm],
          [point[0], point[1] + arm],
        ],
        closed: false,
        critical: true,
        sourceIds,
      },
    )
    texts.push({
      kind: 'text',
      id: `${prefix}:point-label`,
      layer,
      at: [point[0] + arm * 1.2, point[1] + arm * 1.2],
      heightMm: 2.0,
      text: sourceIds[0] ?? prefix,
      rotationDegrees: 0,
      align: 'left',
      bold: false,
    })
    return
  }
  if (geometry.geometryType === 'polyline') {
    paths.push({
      kind: 'path',
      id: `${prefix}:polyline`,
      layer,
      points: geometry.vertices.map((vertex) => finitePoint(
        [vertex.x, vertex.y],
        `${prefix} polyline`,
      )),
      closed: false,
      critical: true,
      sourceIds,
    })
    return
  }
  addPolygonPaths(paths, layer, prefix, geometry.polygon, sourceIds)
}

function normalisedAngle(degrees: number): number {
  const reduced = degrees % 360
  return reduced < 0 ? reduced + 360 : reduced
}

function readableTextAngle(degrees: number): number {
  const angle = normalisedAngle(degrees)
  return angle > 90 && angle <= 270 ? angle + 180 : angle
}

function lineAngle(a: DrawingPoint, b: DrawingPoint): number {
  return (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI
}

function midpoint(a: DrawingPoint, b: DrawingPoint): DrawingPoint {
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
}

function addBoundaryDimensions(
  plan: ValidatedSitePlan,
  paths: DrawingPath[],
  texts: DrawingText[],
): void {
  const ring = plan.plotSurface.outer
  const offsetM = (8 * plan.drawing.declaredScaleDenominator!) / 1000
  const extensionM = (1.5 * plan.drawing.declaredScaleDenominator!) / 1000
  const arrowM = (1.8 * plan.drawing.declaredScaleDenominator!) / 1000
  const ccw = ring.signedAreaSqm > 0
  const byId = new Map(ring.vertices.map((vertex) => [vertex.vertexId, vertex]))
  const requestedByEdge = new Map<string, string[]>()
  for (const dimension of plan.dimensions) {
    if (dimension.kind !== 'aligned' || dimension.references.length !== 1) continue
    const reference = dimension.references[0]
    if (reference?.kind !== 'edge') continue
    const ids = requestedByEdge.get(reference.id) ?? []
    ids.push(dimension.dimensionId)
    requestedByEdge.set(reference.id, ids)
  }

  for (const edge of ring.edges) {
    const fromVertex = byId.get(edge.fromVertexId)
    const toVertex = byId.get(edge.toVertexId)
    if (fromVertex === undefined || toVertex === undefined) {
      parityError(`Boundary edge "${edge.edgeId}" has no canonical endpoints.`)
    }
    const a: DrawingPoint = [fromVertex.x, fromVertex.y]
    const b: DrawingPoint = [toVertex.x, toVertex.y]
    const dx = b[0] - a[0]
    const dy = b[1] - a[1]
    const length = Math.hypot(dx, dy)
    if (!(length > 0)) {
      parityError(`Boundary edge "${edge.edgeId}" has zero drawing length.`)
    }
    const nx = ccw ? dy / length : -dy / length
    const ny = ccw ? -dx / length : dx / length
    const da: DrawingPoint = [a[0] + nx * offsetM, a[1] + ny * offsetM]
    const db: DrawingPoint = [b[0] + nx * offsetM, b[1] + ny * offsetM]
    const extensionA: DrawingPoint = [
      a[0] + nx * (offsetM + extensionM),
      a[1] + ny * (offsetM + extensionM),
    ]
    const extensionB: DrawingPoint = [
      b[0] + nx * (offsetM + extensionM),
      b[1] + ny * (offsetM + extensionM),
    ]
    const sourceIds = [edge.edgeId, ...(requestedByEdge.get(edge.edgeId) ?? [])]

    paths.push(
      {
        kind: 'path',
        id: `auto-dimension:${edge.edgeId}:line`,
        layer: 'DIMENSION',
        points: [da, db],
        closed: false,
        critical: true,
        sourceIds,
      },
      {
        kind: 'path',
        id: `auto-dimension:${edge.edgeId}:extension-a`,
        layer: 'DIMENSION',
        points: [a, extensionA],
        closed: false,
        critical: true,
        sourceIds: [...sourceIds, edge.fromVertexId],
      },
      {
        kind: 'path',
        id: `auto-dimension:${edge.edgeId}:extension-b`,
        layer: 'DIMENSION',
        points: [b, extensionB],
        closed: false,
        critical: true,
        sourceIds: [...sourceIds, edge.toVertexId],
      },
    )

    const ux = dx / length
    const uy = dy / length
    paths.push(
      {
        kind: 'path',
        id: `auto-dimension:${edge.edgeId}:arrow-a`,
        layer: 'DIMENSION',
        points: [
          [da[0] + ux * arrowM + nx * arrowM * 0.45, da[1] + uy * arrowM + ny * arrowM * 0.45],
          da,
          [da[0] + ux * arrowM - nx * arrowM * 0.45, da[1] + uy * arrowM - ny * arrowM * 0.45],
        ],
        closed: false,
        critical: false,
        sourceIds,
      },
      {
        kind: 'path',
        id: `auto-dimension:${edge.edgeId}:arrow-b`,
        layer: 'DIMENSION',
        points: [
          [db[0] - ux * arrowM + nx * arrowM * 0.45, db[1] - uy * arrowM + ny * arrowM * 0.45],
          db,
          [db[0] - ux * arrowM - nx * arrowM * 0.45, db[1] - uy * arrowM - ny * arrowM * 0.45],
        ],
        closed: false,
        critical: false,
        sourceIds,
      },
    )

    texts.push({
      kind: 'text',
      id: `auto-dimension:${edge.edgeId}:text`,
      layer: 'DIMENSION',
      at: midpoint(da, db),
      heightMm: 2.4,
      text: `${edge.lengthM.toFixed(
        Math.min(6, Math.max(0, Math.round(-Math.log10(plan.drawing.displayPrecisionM)))),
      )} m`,
      rotationDegrees: readableTextAngle(lineAngle(a, b)),
      align: 'center',
      bold: false,
    })
  }
}

function referenceVertices(
  dimension: ResolvedDimension,
  index: GeometryIndex,
): CanonicalVertex[] {
  const output: CanonicalVertex[] = []
  for (const ref of dimension.references) {
    if (ref.kind === 'vertex') {
      const vertex = index.vertices.get(ref.id)
      if (vertex !== undefined) output.push(vertex)
    }
  }
  return output
}

function referenceEdges(
  dimension: ResolvedDimension,
  index: GeometryIndex,
): { edge: CanonicalEdge; from: CanonicalVertex; to: CanonicalVertex }[] {
  const output: { edge: CanonicalEdge; from: CanonicalVertex; to: CanonicalVertex }[] = []
  for (const ref of dimension.references) {
    if (ref.kind === 'edge') {
      const edge = index.edges.get(ref.id)
      if (edge !== undefined) output.push(edge)
    }
  }
  return output
}

function referenceRing(
  references: readonly GeometryRef[],
  index: GeometryIndex,
): LinearRing | null {
  const ringRef = references.find((ref) => ref.kind === 'ring')
  if (ringRef === undefined || ringRef.kind !== 'ring') return null
  return index.rings.get(ringRef.id) ?? null
}

function ringCentroid(ring: LinearRing): DrawingPoint {
  const vertices = ring.vertices
  let twiceArea = 0
  let cx = 0
  let cy = 0
  for (let i = 0; i < vertices.length; i += 1) {
    const current = vertices[i]
    const next = vertices[(i + 1) % vertices.length]
    if (current === undefined || next === undefined) continue
    const cross = current.x * next.y - next.x * current.y
    twiceArea += cross
    cx += (current.x + next.x) * cross
    cy += (current.y + next.y) * cross
  }
  if (Math.abs(twiceArea) < 1e-12) {
    const first = vertices[0]
    return first === undefined ? [0, 0] : [first.x, first.y]
  }
  return [cx / (3 * twiceArea), cy / (3 * twiceArea)]
}

function dimensionSuffix(kind: ResolvedDimension['kind']): string {
  if (kind === 'area') return ' m2'
  if (kind === 'angle') return ' deg'
  return ' m'
}

function addRequestedDimensions(
  plan: ValidatedSitePlan,
  index: GeometryIndex,
  paths: DrawingPath[],
  texts: DrawingText[],
): void {
  for (const dimension of plan.dimensions) {
    if (!Number.isFinite(dimension.rawValue)) {
      parityError(
        `Dimension "${dimension.dimensionId}" contains a non-finite value.`,
        String(dimension.rawValue),
        'finite geometry-derived dimension',
      )
    }
    const edges = referenceEdges(dimension, index)
    const vertices = referenceVertices(dimension, index)
    const ring = referenceRing(dimension.references, index)

    if (
      dimension.kind === 'aligned'
      && edges.length === 1
      && plan.plotSurface.outer.edges.some((edge) => edge.edgeId === edges[0]?.edge.edgeId)
    ) {
      // Every ownership edge is already dimensioned outside the boundary. The
      // request id is attached to that auto dimension's sourceIds above, so
      // drawing it again on top of the edge would add no information and would
      // make the sheet unreadable.
      continue
    }

    if (edges.length > 0) {
      edges.forEach(({ edge, from, to }, edgeIndex) => {
        paths.push({
          kind: 'path',
          id: `requested-dimension:${dimension.dimensionId}:edge-${edgeIndex}`,
          layer: 'DIMENSION',
          points: [[from.x, from.y], [to.x, to.y]],
          closed: false,
          critical: true,
          sourceIds: [dimension.dimensionId, edge.edgeId],
        })
      })
      const first = edges[0]
      if (first !== undefined) {
        texts.push({
          kind: 'text',
          id: `requested-dimension:${dimension.dimensionId}:text`,
          layer: 'DIMENSION',
          at: midpoint([first.from.x, first.from.y], [first.to.x, first.to.y]),
          heightMm: 2.4,
          text: `${dimension.displayValue}${dimensionSuffix(dimension.kind)}`,
          rotationDegrees: readableTextAngle(
            lineAngle([first.from.x, first.from.y], [first.to.x, first.to.y]),
          ),
          align: 'center',
          bold: false,
        })
      }
      continue
    }

    if (vertices.length >= 2) {
      const points = vertices.map((vertex): DrawingPoint => [vertex.x, vertex.y])
      paths.push({
        kind: 'path',
        id: `requested-dimension:${dimension.dimensionId}:vertices`,
        layer: 'DIMENSION',
        points,
        closed: false,
        critical: true,
        sourceIds: [dimension.dimensionId, ...vertices.map((vertex) => vertex.vertexId)],
      })
      const first = points[0]
      const last = points.at(-1)
      if (first !== undefined && last !== undefined) {
        texts.push({
          kind: 'text',
          id: `requested-dimension:${dimension.dimensionId}:text`,
          layer: 'DIMENSION',
          at: midpoint(first, last),
          heightMm: 2.4,
          text: `${dimension.displayValue}${dimensionSuffix(dimension.kind)}`,
          rotationDegrees: readableTextAngle(lineAngle(first, last)),
          align: 'center',
          bold: false,
        })
      }
      continue
    }

    if (ring !== null) {
      texts.push({
        kind: 'text',
        id: `requested-dimension:${dimension.dimensionId}:text`,
        layer: 'DIMENSION',
        at: ringCentroid(ring),
        heightMm: 2.4,
        text: `${dimension.displayValue}${dimensionSuffix(dimension.kind)}`,
        rotationDegrees: 0,
        align: 'center',
        bold: false,
      })
      continue
    }

    parityError(
      `Dimension "${dimension.dimensionId}" cannot be placed because none of its canonical references exist in the validated exporter payload.`,
    )
  }
}

function boundsFor(paths: readonly DrawingPath[], texts: readonly DrawingText[]): DrawingBounds {
  const coordinates: DrawingPoint[] = []
  for (const path of paths) coordinates.push(...path.points)
  for (const text of texts) coordinates.push(text.at)
  if (coordinates.length === 0) {
    parityError('The validated plan contains no drawable coordinates.')
  }
  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY
  for (const point of coordinates) {
    finitePoint(point, 'Drawing bounds')
    minX = Math.min(minX, point[0])
    minY = Math.min(minY, point[1])
    maxX = Math.max(maxX, point[0])
    maxY = Math.max(maxY, point[1])
  }
  if (!(maxX > minX) || !(maxY > minY)) {
    parityError(
      'Drawing extents are degenerate.',
      `${maxX - minX} m x ${maxY - minY} m`,
      'positive width and height',
    )
  }
  return { minX, minY, maxX, maxY }
}

function validateDrawingProfile(plan: ValidatedSitePlan): number {
  const denominator = plan.drawing.declaredScaleDenominator
  if (
    denominator === null
    || !Number.isFinite(denominator)
    || denominator <= 0
  ) {
    parityError(
      'A finite positive declared scale is required. The exporter never chooses or silently changes a scale.',
      String(denominator),
      'declaredScaleDenominator > 0',
    )
  }
  if (
    !Number.isFinite(plan.drawing.displayPrecisionM)
    || plan.drawing.displayPrecisionM <= 0
  ) {
    parityError(
      'Drawing display precision must be a finite positive metre value.',
      String(plan.drawing.displayPrecisionM),
      'displayPrecisionM > 0',
    )
  }
  return denominator
}

export function buildDrawingModel(plan: ValidatedSitePlan): DrawingModel {
  const scaleDenominator = validateDrawingProfile(plan)
  const paths: DrawingPath[] = []
  const texts: DrawingText[] = []
  const reconstructedBoundary = plan.acknowledgedWarnings.some(
    (warning) => warning.code === 'W_RECONSTRUCTED_GEOMETRY',
  )
  const boundaryProvenanceNote = reconstructedBoundary
    ? 'RECONSTRUCTED FROM SIDES/DIAGONAL - VERIFY SOURCE BEFORE SETTING OUT'
    : null

  addPolygonPaths(paths, 'PLOT-BOUNDARY', 'plot', plan.plotSurface, [
    plan.plotSurface.polygonId,
  ])
  // Ownership holes are distinct construction facts even though they are also
  // part of plotSurface.
  for (const hole of plan.plotSurface.holes) {
    paths.push({
      kind: 'path',
      id: `cadastral-hole:${hole.ringId}`,
      layer: 'CADASTRAL-HOLE',
      points: pointsOf(hole),
      closed: true,
      critical: true,
      sourceIds: [hole.ringId],
    })
  }

  for (const [componentIndex, component] of plan.developableEnvelope.components.entries()) {
    addPolygonPaths(
      paths,
      'DEVELOPABLE-ENVELOPE',
      `developable:${componentIndex}`,
      component,
      [component.polygonId],
    )
    addPolygonPaths(
      paths,
      'SETBACK',
      `setback-envelope:${componentIndex}`,
      component,
      plan.setbacks.map((setback) => setback.setbackId),
    )
  }

  const plotVertexIndex = new Map(
    plan.plotSurface.outer.vertices.map((vertex) => [vertex.vertexId, vertex]),
  )
  for (const frontage of plan.frontages) {
    for (const [edgeIndex, edge] of frontage.edges.entries()) {
      const from = plotVertexIndex.get(edge.fromVertexId)
      const to = plotVertexIndex.get(edge.toVertexId)
      if (from === undefined || to === undefined) {
        parityError(
          `Frontage "${frontage.frontageId}" references an edge whose coordinates are absent.`,
        )
      }
      paths.push({
        kind: 'path',
        id: `frontage:${frontage.frontageId}:${edgeIndex}`,
        layer: 'ROAD-FRONTAGE',
        points: [[from.x, from.y], [to.x, to.y]],
        closed: false,
        critical: true,
        sourceIds: [frontage.frontageId, edge.edgeId],
      })
      const label = [
        frontage.roadName ?? 'ROAD',
        `CW ${frontage.carriagewayWidth.canonicalM.toFixed(3)} m`,
        frontage.rowWidth === null ? null : `ROW ${frontage.rowWidth.canonicalM.toFixed(3)} m`,
      ].filter((value): value is string => value !== null).join(' / ')
      const frontageA: DrawingPoint = [from.x, from.y]
      const frontageB: DrawingPoint = [to.x, to.y]
      const dx = frontageB[0] - frontageA[0]
      const dy = frontageB[1] - frontageA[1]
      const edgeLength = Math.hypot(dx, dy)
      if (!(edgeLength > 0)) {
        parityError(`Frontage "${frontage.frontageId}" contains a zero-length edge.`)
      }
      const ccw = plan.plotSurface.outer.signedAreaSqm > 0
      const inwardX = ccw ? -dy / edgeLength : dy / edgeLength
      const inwardY = ccw ? dx / edgeLength : -dx / edgeLength
      const labelOffsetM = (4 * scaleDenominator) / 1000
      const frontageMidpoint = midpoint(frontageA, frontageB)
      texts.push({
        kind: 'text',
        id: `frontage:${frontage.frontageId}:${edgeIndex}:label`,
        layer: 'ROAD-FRONTAGE',
        at: [
          frontageMidpoint[0] + inwardX * labelOffsetM,
          frontageMidpoint[1] + inwardY * labelOffsetM,
        ],
        heightMm: 2.5,
        text: label,
        rotationDegrees: readableTextAngle(lineAngle([from.x, from.y], [to.x, to.y])),
        align: 'center',
        bold: true,
      })
    }
  }

  for (const encumbrance of plan.encumbrances) {
    for (const [componentIndex, component] of encumbrance.surface.components.entries()) {
      addPolygonPaths(
        paths,
        'ENCUMBRANCE',
        `encumbrance:${encumbrance.encumbranceId}:${componentIndex}`,
        component,
        [encumbrance.encumbranceId],
      )
    }
  }

  for (const restriction of plan.restrictions) {
    addFeaturePaths(
      paths,
      texts,
      'RESTRICTION',
      `restriction:${restriction.restrictionId}`,
      restriction.geometry,
      [restriction.restrictionId],
      scaleDenominator,
    )
  }

  for (const feature of plan.existingFeatures) {
    addFeaturePaths(
      paths,
      texts,
      'EXISTING-FEATURE',
      `existing-feature:${feature.featureId}`,
      feature.geometry,
      [feature.featureId],
      scaleDenominator,
    )
  }

  for (const footprint of plan.footprints) {
    addPolygonPaths(
      paths,
      'FOOTPRINT',
      `footprint:${footprint.footprintId}`,
      footprint.polygon,
      [footprint.footprintId],
    )
    const labelAt = ringCentroid(footprint.polygon.outer)
    texts.push({
      kind: 'text',
      id: `footprint:${footprint.footprintId}:label`,
      layer: 'FOOTPRINT',
      at: labelAt,
      heightMm: 2.6,
      text: [
        footprint.label ?? footprint.footprintId,
        footprint.storeysAboveGround === null ? null : `${footprint.storeysAboveGround} STOREY`,
      ].filter((value): value is string => value !== null).join(' / '),
      rotationDegrees: 0,
      align: 'center',
      bold: true,
    })
  }

  for (const projection of plan.projections) {
    addPolygonPaths(
      paths,
      'PROJECTION',
      `projection:${projection.projectionId}`,
      projection.polygon,
      [projection.projectionId],
    )
  }

  for (const level of plan.levels) {
    const arm = (1.5 * scaleDenominator) / 1000
    const at: DrawingPoint = finitePoint([level.x, level.y], `Level ${level.readingId}`)
    paths.push(
      {
        kind: 'path',
        id: `level:${level.readingId}:horizontal`,
        layer: 'LEVEL',
        points: [[at[0] - arm, at[1]], [at[0] + arm, at[1]]],
        closed: false,
        critical: true,
        sourceIds: [level.readingId],
      },
      {
        kind: 'path',
        id: `level:${level.readingId}:vertical`,
        layer: 'LEVEL',
        points: [[at[0], at[1] - arm], [at[0], at[1] + arm]],
        closed: false,
        critical: true,
        sourceIds: [level.readingId],
      },
    )
    texts.push({
      kind: 'text',
      id: `level:${level.readingId}:label`,
      layer: 'LEVEL',
      at: [at[0] + arm * 1.3, at[1] + arm * 1.3],
      heightMm: 2.1,
      text: `RL ${level.elevation.canonicalM.toFixed(3)} m (${level.datum})`,
      rotationDegrees: 0,
      align: 'left',
      bold: false,
    })
  }

  const geometryIndex = buildGeometryIndex(plan)
  addBoundaryDimensions(plan, paths, texts)
  addRequestedDimensions(plan, geometryIndex, paths, texts)

  const preliminaryBounds = boundsFor(paths, texts)
  const plotBounds = boundsFor(
    [{
      kind: 'path',
      id: 'plot-bounds',
      layer: 'PLOT-BOUNDARY',
      points: pointsOf(plan.plotSurface.outer),
      closed: true,
      critical: false,
      sourceIds: [],
    }],
    [],
  )
  const arrowLengthM = (15 * scaleDenominator) / 1000
  const arrowHalfWidthM = (2.5 * scaleDenominator) / 1000
  const clearanceM = (16 * scaleDenominator) / 1000
  const anchor: DrawingPoint = [
    plotBounds.maxX + clearanceM,
    plotBounds.maxY - arrowLengthM,
  ]
  const radians = ((90 + plan.orientation.northRotation.canonicalDegrees) * Math.PI) / 180
  const tip: DrawingPoint = [
    anchor[0] + Math.cos(radians) * arrowLengthM,
    anchor[1] + Math.sin(radians) * arrowLengthM,
  ]
  const perpendicular = radians + Math.PI / 2
  const wingA: DrawingPoint = [
    tip[0] - Math.cos(radians) * arrowHalfWidthM + Math.cos(perpendicular) * arrowHalfWidthM,
    tip[1] - Math.sin(radians) * arrowHalfWidthM + Math.sin(perpendicular) * arrowHalfWidthM,
  ]
  const wingB: DrawingPoint = [
    tip[0] - Math.cos(radians) * arrowHalfWidthM - Math.cos(perpendicular) * arrowHalfWidthM,
    tip[1] - Math.sin(radians) * arrowHalfWidthM - Math.sin(perpendicular) * arrowHalfWidthM,
  ]
  paths.push(
    {
      kind: 'path',
      id: 'north:shaft',
      layer: 'NORTH',
      points: [anchor, tip],
      closed: false,
      critical: true,
      sourceIds: [plan.orientation.reference],
    },
    {
      kind: 'path',
      id: 'north:arrowhead',
      layer: 'NORTH',
      points: [wingA, tip, wingB],
      closed: true,
      critical: false,
      sourceIds: [plan.orientation.reference],
    },
  )
  texts.push({
    kind: 'text',
    id: 'north:label',
    layer: 'NORTH',
    at: [
      tip[0] + Math.cos(radians) * (3 * scaleDenominator) / 1000,
      tip[1] + Math.sin(radians) * (3 * scaleDenominator) / 1000,
    ],
    heightMm: 3.2,
    text: `N (${plan.orientation.reference.toUpperCase()})`,
    rotationDegrees: 0,
    align: 'center',
    bold: true,
  })

  texts.push({
    kind: 'text',
    id: 'review-status',
    layer: 'ANNOTATION',
    at: [
      preliminaryBounds.minX,
      preliminaryBounds.minY - (6 * scaleDenominator) / 1000,
    ],
    heightMm: 2.4,
    text: 'READY FOR PROFESSIONAL REVIEW - NOT FOR CONSTRUCTION',
    rotationDegrees: 0,
    align: 'left',
    bold: true,
  })
  if (boundaryProvenanceNote !== null) {
    texts.push({
      kind: 'text',
      id: 'boundary-provenance',
      layer: 'ANNOTATION',
      at: [
        preliminaryBounds.minX,
        preliminaryBounds.minY - (10 * scaleDenominator) / 1000,
      ],
      heightMm: 2.4,
      text: boundaryProvenanceNote,
      rotationDegrees: 0,
      align: 'left',
      bold: true,
    })
  }

  return {
    coordinateUnit: 'm',
    scaleDenominator,
    projectName: plan.identity.projectName,
    reviewStatus: 'READY FOR PROFESSIONAL REVIEW - NOT FOR CONSTRUCTION',
    boundaryProvenanceNote,
    paths,
    texts,
    bounds: boundsFor(paths, texts),
    plotAreaSqm: plan.plotArea.computedSqm,
    northRotationDegrees: plan.orientation.northRotation.canonicalDegrees,
    northReference: plan.orientation.reference,
    drawingPrecisionM: plan.drawing.displayPrecisionM,
  }
}
