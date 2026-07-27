import type {
  AcknowledgedWarning,
  Actor,
  AreaUnitLabel,
  CoordinateFrame,
  EvidenceRecord,
  ExactLengthUnit,
  ExistingFeatureDraft,
  Finding,
  ProfessionalRecord,
  SitePlanBriefDraft,
  SourcePath,
  WarningCode,
} from '../../kernel/src/index.ts'

export type StandardProfile =
  | 'neutral-professional-review'
  | 'dda-site-plan'
  | 'haryana-obpas-site-plan'

export type BoundaryEntryRoute = 'coordinates' | 'reconstructed'
export type SheetName = 'A4' | 'A3' | 'A2' | 'A1' | 'A0'
export type SheetOrientation = 'landscape' | 'portrait'

export interface SurveyPointInput {
  id: string
  x: string
  y: string
  monumentId: string
  preserve: boolean
}

export interface EdgeFactInput {
  setback: string
  setbackCitation: string
  isRoad: boolean
  roadRole: 'main' | 'side'
  roadName: string
  carriagewayWidth: string
  rowWidth: string
  adjoining: string
}

export interface PolygonInput {
  id: string
  label: string
  coordinates: string
  holes: string
}

export interface EncumbranceInput extends PolygonInput {
  kind:
    | 'easement'
    | 'right-of-way'
    | 'no-build-zone'
    | 'service-corridor'
    | 'water-body-buffer'
    | 'other'
  clearance: string
}

export interface ExistingFeatureInput {
  id: string
  kindRef: string
  geometryType: 'point' | 'polyline' | 'polygon'
  coordinates: string
  retained: 'yes' | 'no' | 'unknown'
}

export interface LevelInput {
  id: string
  x: string
  y: string
  elevation: string
  datum: 'MSL' | 'local-benchmark' | 'assumed'
  benchmarkDescription: string
}

export interface FootprintInput extends PolygonInput {
  storeys: string
  origin: 'user-drawn' | 'surveyed-existing'
}

export interface ProjectionInput extends PolygonInput {
  kind: 'balcony' | 'chajja' | 'canopy' | 'porch' | 'ramp' | 'basement' | 'staircase' | 'other'
  attachedToFootprintId: string
  projectionDepth: string
  clearHeight: string
}

export interface EvidenceFileInput {
  filename: string
  bytes: number
  mime: string
  sha256: string
  storageRef: string
}

export interface FeatureOneFormState {
  standardProfile: StandardProfile
  drawingPurpose: 'survey-base' | 'site-plan-proposal'

  projectName: string
  plotNumber: string
  sectorPocket: string
  khasraNumber: string
  schemeLicence: string
  propertyId: string

  sourceTypeRef: string
  documentId: string
  sourceDate: string
  verification: EvidenceRecord['claimedVerification']
  professionalName: string
  professionalLicence: string
  professionalDiscipline: ProfessionalRecord['discipline']
  evidenceFile: EvidenceFileInput | null

  coordinateUnit: Extract<ExactLengthUnit, 'm' | 'ft' | 'yd'>
  coordinatePrecision: string
  measurementUnit: Extract<ExactLengthUnit, 'm' | 'ft' | 'yd'>
  crsCode: string
  isLocalFrame: boolean
  boundaryRoute: BoundaryEntryRoute
  boundaryPoints: SurveyPointInput[]
  reconstructedSides: [string, string, string, string]
  primaryDiagonal: string
  secondaryDiagonal: string
  reconstructionAssemblyId: string
  edgeFacts: EdgeFactInput[]

  statedArea: string
  statedAreaUnit: Extract<AreaUnitLabel, 'sqm' | 'sqft' | 'sqyd' | 'gaj' | 'acre'>
  statedAreaPrecision: string

  northRotation: string
  northReference: 'true' | 'grid' | 'magnetic'
  magneticDate: string
  magneticDeclination: string
  magneticModel: string

  cadastralHoles: PolygonInput[]
  encumbrances: EncumbranceInput[]
  restrictions: PolygonInput[]
  existingFeatures: ExistingFeatureInput[]
  levels: LevelInput[]
  footprints: FootprintInput[]
  projections: ProjectionInput[]

  displayPrecisionM: string
  displayUnit: Extract<ExactLengthUnit, 'm' | 'ft'>
  sheet: SheetName
  sheetOrientation: SheetOrientation
  scaleDenominator: string
  requestProfessionalReview: boolean
  acknowledgedWarnings: WarningCode[]
}

export interface DraftBuildResult {
  draft: SitePlanBriefDraft | null
  errors: string[]
}

const SOURCE_ID = 'primary-survey-evidence'
const BOUNDARY_PATH_ID = 'survey-boundary'

export const EMPTY_EDGE_FACT: EdgeFactInput = {
  setback: '',
  setbackCitation: '',
  isRoad: false,
  roadRole: 'main',
  roadName: '',
  carriagewayWidth: '',
  rowWidth: '',
  adjoining: '',
}

export const EMPTY_FORM: FeatureOneFormState = {
  standardProfile: 'neutral-professional-review',
  drawingPurpose: 'site-plan-proposal',
  projectName: '',
  plotNumber: '',
  sectorPocket: '',
  khasraNumber: '',
  schemeLicence: '',
  propertyId: '',
  sourceTypeRef: '',
  documentId: '',
  sourceDate: '',
  verification: 'unverified',
  professionalName: '',
  professionalLicence: '',
  professionalDiscipline: 'surveyor',
  evidenceFile: null,
  coordinateUnit: 'm',
  coordinatePrecision: '',
  measurementUnit: 'm',
  crsCode: '',
  isLocalFrame: true,
  boundaryRoute: 'coordinates',
  boundaryPoints: [
    { id: 'P1', x: '', y: '', monumentId: '', preserve: false },
    { id: 'P2', x: '', y: '', monumentId: '', preserve: false },
    { id: 'P3', x: '', y: '', monumentId: '', preserve: false },
    { id: 'P4', x: '', y: '', monumentId: '', preserve: false },
  ],
  reconstructedSides: ['', '', '', ''],
  primaryDiagonal: '',
  secondaryDiagonal: '',
  reconstructionAssemblyId: '',
  edgeFacts: [
    { ...EMPTY_EDGE_FACT },
    { ...EMPTY_EDGE_FACT },
    { ...EMPTY_EDGE_FACT },
    { ...EMPTY_EDGE_FACT },
  ],
  statedArea: '',
  statedAreaUnit: 'sqm',
  statedAreaPrecision: '',
  northRotation: '',
  northReference: 'true',
  magneticDate: '',
  magneticDeclination: '',
  magneticModel: '',
  cadastralHoles: [],
  encumbrances: [],
  restrictions: [],
  existingFeatures: [],
  levels: [],
  footprints: [],
  projections: [],
  displayPrecisionM: '0.001',
  displayUnit: 'm',
  sheet: 'A3',
  sheetOrientation: 'landscape',
  scaleDenominator: '100',
  requestProfessionalReview: false,
  acknowledgedWarnings: [],
}

export const DEMO_FORM: FeatureOneFormState = {
  ...EMPTY_FORM,
  standardProfile: 'haryana-obpas-site-plan',
  projectName: 'Verified Feature 1 sample',
  plotNumber: 'PLOT-101',
  sectorPocket: 'Pilot sector',
  propertyId: 'DEMO-PID-101',
  sourceTypeRef: 'professional-boundary-survey',
  documentId: 'DEMO-SURVEY-001',
  sourceDate: '2026-07-26',
  verification: 'professional-verified',
  professionalName: 'Demo Licensed Surveyor',
  professionalLicence: 'DEMO-LIC-001',
  professionalDiscipline: 'surveyor',
  evidenceFile: {
    filename: 'demo-survey.dxf',
    bytes: 1,
    mime: 'application/dxf',
    sha256: '0000000000000000000000000000000000000000000000000000000000000000',
    storageRef: 'demo://survey-source',
  },
  coordinatePrecision: '0.001',
  isLocalFrame: true,
  boundaryPoints: [
    { id: 'P1', x: '0', y: '0', monumentId: 'M-1', preserve: true },
    { id: 'P2', x: '20', y: '0', monumentId: 'M-2', preserve: true },
    { id: 'P3', x: '20', y: '10', monumentId: 'M-3', preserve: true },
    { id: 'P4', x: '0', y: '10', monumentId: 'M-4', preserve: true },
  ],
  edgeFacts: [
    {
      ...EMPTY_EDGE_FACT,
      setback: '1',
      setbackCitation: 'Demo verified setback schedule',
      isRoad: true,
      roadRole: 'main',
      roadName: 'Demo Main Road',
      carriagewayWidth: '12',
      rowWidth: '18',
      adjoining: '12 m carriageway',
    },
    {
      ...EMPTY_EDGE_FACT,
      setback: '1',
      setbackCitation: 'Demo verified setback schedule',
      adjoining: 'Plot 102',
    },
    {
      ...EMPTY_EDGE_FACT,
      setback: '1',
      setbackCitation: 'Demo verified setback schedule',
      adjoining: 'Plot 110',
    },
    {
      ...EMPTY_EDGE_FACT,
      setback: '1',
      setbackCitation: 'Demo verified setback schedule',
      adjoining: 'Plot 100',
    },
  ],
  statedArea: '200',
  statedAreaUnit: 'sqm',
  statedAreaPrecision: '0.001',
  northRotation: '0',
  northReference: 'true',
  encumbrances: [{
    id: 'service-corridor',
    label: 'Verified service corridor',
    coordinates: '15,2\n16,2\n16,6\n15,6',
    holes: '',
    kind: 'service-corridor',
    clearance: '',
  }],
  existingFeatures: [{
    id: 'existing-wall',
    kindRef: 'wall',
    geometryType: 'polyline',
    coordinates: '2,8\n7,8',
    retained: 'yes',
  }],
  levels: [{
    id: 'RL-1',
    x: '4',
    y: '4',
    elevation: '100.125',
    datum: 'MSL',
    benchmarkDescription: 'Demo benchmark',
  }],
  footprints: [{
    id: 'proposed-building',
    label: 'PROPOSED BUILDING',
    coordinates: '3,3\n9,3\n9,7\n3,7',
    holes: '5,4; 6,4; 6,5; 5,5',
    storeys: '2',
    origin: 'user-drawn',
  }],
  projections: [{
    id: 'entrance-canopy',
    label: 'ENTRANCE CANOPY',
    coordinates: '9,4\n9.8,4\n9.8,6\n9,6',
    holes: '',
    kind: 'canopy',
    attachedToFootprintId: 'proposed-building',
    projectionDepth: '0.8',
    clearHeight: '2.4',
  }],
  requestProfessionalReview: true,
}

export const RECONSTRUCTED_DEMO_FORM: FeatureOneFormState = {
  ...DEMO_FORM,
  drawingPurpose: 'survey-base',
  projectName: 'Verified deed-route sample',
  plotNumber: 'PLOT-DEED-101',
  propertyId: 'DEMO-PID-DEED-101',
  sourceTypeRef: 'professional-verified-boundary-sketch',
  documentId: 'DEMO-DEED-SKETCH-001',
  evidenceFile: {
    filename: 'demo-boundary-sketch.pdf',
    bytes: 1,
    mime: 'application/pdf',
    sha256: '1111111111111111111111111111111111111111111111111111111111111111',
    storageRef: 'demo://verified-boundary-sketch',
  },
  boundaryRoute: 'reconstructed',
  reconstructedSides: ['20', '10', '20', '10'],
  primaryDiagonal: String(Math.sqrt(500)),
  secondaryDiagonal: String(Math.sqrt(500)),
  reconstructionAssemblyId: 'assembly-ud',
  edgeFacts: DEMO_FORM.edgeFacts.map((edge) => ({ ...edge, setback: '0' })),
  cadastralHoles: [],
  encumbrances: [],
  restrictions: [],
  existingFeatures: [],
  levels: [],
  footprints: [],
  projections: [],
  acknowledgedWarnings: ['W_RECONSTRUCTED_GEOMETRY'],
}

export function normaliseEdgeFacts(
  edgeFacts: readonly EdgeFactInput[],
  edgeCount: number,
): EdgeFactInput[] {
  return Array.from({ length: edgeCount }, (_, index) => ({
    ...EMPTY_EDGE_FACT,
    ...(edgeFacts[index] ?? {}),
  }))
}

export function boundaryEdgeCount(form: FeatureOneFormState): number {
  return form.boundaryRoute === 'reconstructed' ? 4 : form.boundaryPoints.length
}

function finiteNumber(value: string): number | null {
  if (value.trim() === '') return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function positiveNumber(value: string): number | null {
  const number = finiteNumber(value)
  return number !== null && number > 0 ? number : null
}

function nonNegativeNumber(value: string): number | null {
  const number = finiteNumber(value)
  return number !== null && number >= 0 ? number : null
}

function parseCoordinateList(
  input: string,
  label: string,
  minimum: number,
  errors: string[],
): readonly [number, number][] | null {
  const normalised = input.replaceAll(';', '\n')
  const lines = normalised
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
  const coordinates: [number, number][] = []
  for (const [index, line] of lines.entries()) {
    const parts = line.split(/[\s,]+/).filter(Boolean)
    if (parts.length !== 2) {
      errors.push(`${label} coordinate ${index + 1} must contain exactly X and Y.`)
      continue
    }
    const x = Number(parts[0])
    const y = Number(parts[1])
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      errors.push(`${label} coordinate ${index + 1} is not finite.`)
      continue
    }
    coordinates.push([x, y])
  }
  if (coordinates.length < minimum) {
    errors.push(`${label} needs at least ${minimum} coordinate${minimum === 1 ? '' : 's'}.`)
    return null
  }
  return coordinates
}

function parseHoleLists(
  input: string,
  label: string,
  errors: string[],
): readonly (readonly [number, number][])[] {
  if (input.trim() === '') return []
  return input
    .split(/\n\s*---+\s*\n/)
    .map((hole, index) => parseCoordinateList(
      hole,
      `${label} hole ${index + 1}`,
      3,
      errors,
    ))
    .filter((hole): hole is readonly [number, number][] => hole !== null)
}

function frame(form: FeatureOneFormState): CoordinateFrame {
  return {
    kind: 'planar',
    axisUnit: form.coordinateUnit,
    crsCode: form.crsCode.trim() || null,
    isLocal: form.isLocalFrame,
    sourceRef: SOURCE_ID,
  }
}

function sourcePath(
  pathId: string,
  coordinates: readonly (readonly [number, number])[],
  coordinateFrame: CoordinateFrame,
  closure: SourcePath['closure'],
  preserveAll = false,
): SourcePath {
  return {
    pathId,
    frame: coordinateFrame,
    points: coordinates.map(([axis1, axis2], index) => ({
      pointId: `${pathId}-p${index + 1}`,
      axis1,
      axis2,
      preserveCollinear: preserveAll,
      sourceRef: SOURCE_ID,
    })),
    closure,
  }
}

function professional(form: FeatureOneFormState): ProfessionalRecord | null {
  if (
    form.professionalName.trim() === ''
    || form.professionalLicence.trim() === ''
  ) {
    return null
  }
  return {
    name: form.professionalName.trim(),
    licenceNumber: form.professionalLicence.trim(),
    discipline: form.professionalDiscipline,
  }
}

function actor(form: FeatureOneFormState): Actor {
  return professional(form) ?? { userId: 'local-form-user' }
}

function evidence(form: FeatureOneFormState): EvidenceRecord {
  const responsibleProfessional = professional(form)
  const statedPrecision = finiteNumber(form.coordinatePrecision)
  return {
    evidenceId: SOURCE_ID,
    sourceTypeRef: form.sourceTypeRef.trim(),
    ...(form.documentId.trim() === '' ? {} : { documentId: form.documentId.trim() }),
    sourceDate: form.sourceDate || null,
    originalUnit: form.boundaryRoute === 'reconstructed'
      ? form.measurementUnit
      : form.coordinateUnit,
    ...(statedPrecision === null ? {} : { statedPrecision }),
    claimedVerification: form.verification,
    ...(responsibleProfessional === null ? {} : { responsibleProfessional }),
    ...(form.evidenceFile === null ? {} : { file: { ...form.evidenceFile } }),
  }
}

function edgeReference(
  path: SourcePath,
  index: number,
): {
  kind: 'path-edge'
  edge: { pathId: string; fromPointId: string; toPointId: string }
} {
  const from = path.points[index]
  const to = path.points[(index + 1) % path.points.length]
  if (from === undefined || to === undefined) {
    throw new Error(`Boundary edge ${index + 1} has no endpoints.`)
  }
  return {
    kind: 'path-edge',
    edge: {
      pathId: path.pathId,
      fromPointId: from.pointId,
      toPointId: to.pointId,
    },
  }
}

function reconstructedEdgeReference(index: number): {
  kind: 'reconstructed-side'
  sideIndex: 0 | 1 | 2 | 3
} {
  if (index < 0 || index > 3 || !Number.isInteger(index)) {
    throw new Error(`Reconstructed boundary edge ${index + 1} is outside the four-side route.`)
  }
  return {
    kind: 'reconstructed-side',
    sideIndex: index as 0 | 1 | 2 | 3,
  }
}

function polygonPath(
  input: PolygonInput,
  prefix: string,
  coordinateFrame: CoordinateFrame,
  errors: string[],
): { path: SourcePath; holes: SourcePath[] } | null {
  const coordinates = parseCoordinateList(input.coordinates, input.label || input.id, 3, errors)
  if (coordinates === null) return null
  const holes = parseHoleLists(input.holes, input.label || input.id, errors)
  return {
    path: sourcePath(`${prefix}-${input.id}`, coordinates, coordinateFrame, {
      kind: 'closed-flag',
      flagSource: 'UrbanOS coordinate form',
    }),
    holes: holes.map((hole, index) => sourcePath(
      `${prefix}-${input.id}-hole-${index + 1}`,
      hole,
      coordinateFrame,
      { kind: 'closed-flag', flagSource: 'UrbanOS coordinate form' },
    )),
  }
}

function warningAcknowledgements(
  form: FeatureOneFormState,
): AcknowledgedWarning[] {
  return form.acknowledgedWarnings.map((code) => ({
    code,
    acknowledgedBy: actor(form),
    at: '2026-07-26',
    evidenceRef: SOURCE_ID,
    note: 'Acknowledged in the local Feature 1 form after reviewing the warning.',
  }))
}

export function buildDraft(form: FeatureOneFormState): DraftBuildResult {
  const errors: string[] = []
  if (form.projectName.trim() === '') errors.push('Project name is required.')
  if (
    [
      form.plotNumber,
      form.sectorPocket,
      form.khasraNumber,
      form.schemeLicence,
      form.propertyId,
    ].every((value) => value.trim() === '')
  ) {
    errors.push('Provide at least one plot, sector, khasra, scheme, or property identifier.')
  }
  if (
    form.standardProfile === 'dda-site-plan'
    && (form.plotNumber.trim() === '' || form.sectorPocket.trim() === '')
  ) {
    errors.push('The DDA intake profile requires both plot number and sector/pocket.')
  }
  if (
    form.standardProfile === 'haryana-obpas-site-plan'
    && form.propertyId.trim() === ''
  ) {
    errors.push('The Haryana OBPAS intake profile requires the Property ID (PID).')
  }
  if (form.sourceTypeRef.trim() === '') errors.push('Evidence source type is required.')
  if (form.documentId.trim() === '' && form.evidenceFile === null) {
    errors.push('Provide a source document ID or attach a source file.')
  }
  if (form.sourceDate === '') errors.push('Evidence source date is required.')
  if (
    form.verification === 'professional-verified'
    && professional(form) === null
  ) {
    errors.push('Professional verification requires both name and licence number.')
  }
  if (form.requestProfessionalReview && form.verification !== 'professional-verified') {
    errors.push('Ready for Professional Review requires professionally verified geometry evidence.')
  }
  if (!form.isLocalFrame && form.crsCode.trim() === '') {
    errors.push('A non-local coordinate frame requires a CRS code.')
  }
  if (form.isLocalFrame && form.crsCode.trim() !== '') {
    errors.push('A local frame cannot also claim a georeferenced CRS code.')
  }
  if (form.boundaryRoute === 'reconstructed' && !form.isLocalFrame) {
    errors.push(
      'A sides-plus-diagonal boundary stays on a local grid; georeferencing requires surveyed corner coordinates.',
    )
  }
  const coordinatePrecision = positiveNumber(form.coordinatePrecision)
  if (coordinatePrecision === null) {
    errors.push('State the boundary measurement precision claimed by the source.')
  }

  const boundaryCoordinates: [number, number][] = []
  if (form.boundaryRoute === 'coordinates') {
    if (form.boundaryPoints.length < 3) {
      errors.push('Coordinate boundary requires at least three points.')
    }
    const seenPointIds = new Set<string>()
    for (const [index, point] of form.boundaryPoints.entries()) {
      const id = point.id.trim()
      if (id === '') errors.push(`Boundary point ${index + 1} needs an ID.`)
      if (seenPointIds.has(id)) errors.push(`Boundary point ID "${id}" is duplicated.`)
      seenPointIds.add(id)
      const x = finiteNumber(point.x)
      const y = finiteNumber(point.y)
      if (x === null || y === null) {
        errors.push(`Boundary point ${id || index + 1} needs finite X and Y values.`)
      } else {
        boundaryCoordinates.push([x, y])
      }
    }
  } else {
    for (const [index, side] of form.reconstructedSides.entries()) {
      if (positiveNumber(side) === null) {
        errors.push(`Reconstructed side V${index}→V${(index + 1) % 4} must be positive.`)
      }
    }
    if (positiveNumber(form.primaryDiagonal) === null) {
      errors.push('Reconstruction requires the measured V0→V2 diagonal.')
    }
    if (
      form.secondaryDiagonal.trim() !== ''
      && positiveNumber(form.secondaryDiagonal) === null
    ) {
      errors.push('The optional V1→V3 diagonal must be positive when supplied.')
    }
  }

  const statedArea = positiveNumber(form.statedArea)
  if (statedArea === null) errors.push('Stated plot area must be a positive number.')
  const areaPrecision = positiveNumber(form.statedAreaPrecision)
  if (areaPrecision === null) errors.push('State the precision claimed by the area source.')
  const northRotation = finiteNumber(form.northRotation)
  if (northRotation === null) errors.push('North rotation is required; north-up is never assumed.')
  if (form.northReference === 'magnetic') {
    if (form.magneticDate === '') errors.push('Magnetic north requires an observation date.')
    if (finiteNumber(form.magneticDeclination) === null) {
      errors.push('Magnetic north requires a finite declination.')
    }
    if (form.magneticModel.trim() === '') {
      errors.push('Magnetic north requires a named model or source.')
    }
  }

  const displayPrecision = positiveNumber(form.displayPrecisionM)
  if (displayPrecision === null) errors.push('Drawing precision must be positive.')
  const scale = positiveNumber(form.scaleDenominator)
  if (scale === null) errors.push('Declared drawing scale must be positive.')

  const edgeFacts = normaliseEdgeFacts(form.edgeFacts, boundaryEdgeCount(form))
  for (const [index, edge] of edgeFacts.entries()) {
    if (nonNegativeNumber(edge.setback) === null) {
      errors.push(`Edge ${index + 1} needs a sourced setback (zero must be entered explicitly).`)
    }
    if (edge.setbackCitation.trim() === '') {
      errors.push(`Edge ${index + 1} needs the setback source/citation.`)
    }
    if (edge.adjoining.trim() === '') {
      errors.push(`Edge ${index + 1} needs its adjoining land/street description.`)
    }
    if (edge.isRoad && positiveNumber(edge.carriagewayWidth) === null) {
      errors.push(`Road edge ${index + 1} needs a measured carriageway width.`)
    }
  }
  if (!edgeFacts.some((edge) => edge.isRoad)) {
    errors.push('At least one explicit boundary edge must be identified as the means of access.')
  }

  if (form.drawingPurpose === 'site-plan-proposal' && form.footprints.length === 0) {
    errors.push('A proposal site plan requires at least one supplied building footprint.')
  }

  if (
    errors.length > 0
    || (
      form.boundaryRoute === 'coordinates'
      && boundaryCoordinates.length !== form.boundaryPoints.length
    )
  ) {
    return { draft: null, errors }
  }

  const coordinateFrame = frame(form)
  const boundaryPath = form.boundaryRoute === 'coordinates'
    ? sourcePath(
      BOUNDARY_PATH_ID,
      boundaryCoordinates,
      coordinateFrame,
      { kind: 'closed-flag', flagSource: 'UrbanOS coordinate form' },
    )
    : null
  if (boundaryPath !== null) {
    boundaryPath.points = boundaryPath.points.map((point, index) => {
      const input = form.boundaryPoints[index]
      return {
        ...point,
        pointId: input?.id.trim() || point.pointId,
        ...(input?.monumentId.trim() ? { monumentId: input.monumentId.trim() } : {}),
        preserveCollinear: input?.preserve ?? false,
      }
    })
  }

  const boundaryEdgeReference = (index: number) => boundaryPath === null
    ? reconstructedEdgeReference(index)
    : edgeReference(boundaryPath, index)

  const setbacks = edgeFacts.map((edge, index) => ({
    setbackId: `setback-edge-${index + 1}`,
    edges: [boundaryEdgeReference(index)],
    distance: {
      asEntered: nonNegativeNumber(edge.setback)!,
      unit: form.measurementUnit,
      sourceRef: SOURCE_ID,
    },
    basis: {
      citation: edge.setbackCitation.trim(),
      sourceRef: SOURCE_ID,
    },
  }))

  const roadFrontages = edgeFacts.flatMap((edge, index) => {
    if (!edge.isRoad) return []
    const rowWidth = positiveNumber(edge.rowWidth)
    return [{
      frontageId: `road-edge-${index + 1}`,
      edges: [boundaryEdgeReference(index)],
      carriagewayWidth: {
        asEntered: positiveNumber(edge.carriagewayWidth)!,
        unit: form.measurementUnit,
        sourceRef: SOURCE_ID,
      },
      ...(rowWidth === null ? {} : {
        rowWidth: {
          asEntered: rowWidth,
          unit: form.measurementUnit,
          sourceRef: SOURCE_ID,
        },
      }),
      roadName: edge.roadName.trim() || `ROAD AT EDGE ${index + 1}`,
      roadClassRef: edge.roadRole,
    }]
  })

  const cadastralHoles = form.cadastralHoles.flatMap((hole) => {
    const geometry = polygonPath(hole, 'cadastral-hole', coordinateFrame, errors)
    return geometry === null ? [] : [{
      holeId: hole.id,
      path: geometry.path,
      description: hole.label,
      sourceRef: SOURCE_ID,
    }]
  })
  const encumbrances = form.encumbrances.flatMap((item) => {
    const geometry = polygonPath(item, 'encumbrance', coordinateFrame, errors)
    if (geometry === null) return []
    const clearance = nonNegativeNumber(item.clearance)
    return [{
      encumbranceId: item.id,
      kind: item.kind,
      geometry: {
        geometryType: 'polygon' as const,
        featureId: `${item.id}-geometry`,
        path: geometry.path,
        holes: geometry.holes,
      },
      ...(clearance === null ? {} : {
        clearance: { asEntered: clearance, unit: form.measurementUnit, sourceRef: SOURCE_ID },
      }),
      description: item.label,
      sourceRef: SOURCE_ID,
    }]
  })
  const restrictions = form.restrictions.flatMap((item) => {
    const geometry = polygonPath(item, 'restriction', coordinateFrame, errors)
    return geometry === null ? [] : [{
      restrictionId: item.id,
      kindRef: item.label || 'restriction',
      geometry: {
        geometryType: 'polygon' as const,
        featureId: `${item.id}-geometry`,
        path: geometry.path,
        holes: geometry.holes,
      },
      description: item.label,
      sourceRef: SOURCE_ID,
    }]
  })
  const existingFeatures: ExistingFeatureDraft[] = []
  form.existingFeatures.forEach((item) => {
    const minimum = item.geometryType === 'point' ? 1 : item.geometryType === 'polyline' ? 2 : 3
    const coordinates = parseCoordinateList(
      item.coordinates,
      item.kindRef || item.id,
      minimum,
      errors,
    )
    if (coordinates === null) return
    if (item.geometryType === 'point') {
      const firstPoint = coordinates[0]
      if (firstPoint === undefined) return
      existingFeatures.push({
        featureId: item.id,
        kindRef: item.kindRef,
        geometry: {
          geometryType: 'point' as const,
          featureId: item.id,
          frame: coordinateFrame,
          axis1: firstPoint[0],
          axis2: firstPoint[1],
          sourceRef: SOURCE_ID,
        },
        toBeRetained: item.retained === 'unknown' ? null : item.retained === 'yes',
        sourceRef: SOURCE_ID,
      })
      return
    }
    const path = sourcePath(
      `existing-${item.id}`,
      coordinates,
      coordinateFrame,
      item.geometryType === 'polygon'
        ? { kind: 'closed-flag', flagSource: 'UrbanOS coordinate form' }
        : { kind: 'open' },
    )
    existingFeatures.push({
      featureId: item.id,
      kindRef: item.kindRef,
      geometry: item.geometryType === 'polygon'
        ? {
            geometryType: 'polygon' as const,
            featureId: item.id,
            path,
            holes: [],
          }
        : {
            geometryType: 'polyline' as const,
            featureId: item.id,
            path,
          },
      toBeRetained: item.retained === 'unknown' ? null : item.retained === 'yes',
      sourceRef: SOURCE_ID,
    })
  })
  const levels = form.levels.flatMap((item) => {
    const x = finiteNumber(item.x)
    const y = finiteNumber(item.y)
    const elevation = finiteNumber(item.elevation)
    if (x === null || y === null || elevation === null) {
      errors.push(`Level ${item.id} requires finite X, Y and elevation.`)
      return []
    }
    return [{
      readingId: item.id,
      location: {
        geometryType: 'point' as const,
        featureId: `${item.id}-location`,
        frame: coordinateFrame,
        axis1: x,
        axis2: y,
        sourceRef: SOURCE_ID,
      },
      elevation: {
        asEntered: elevation,
        unit: form.measurementUnit,
        sourceRef: SOURCE_ID,
      },
      datum: item.datum,
      ...(item.benchmarkDescription.trim() === '' ? {} : {
        benchmark: {
          description: item.benchmarkDescription.trim(),
          location: {
            geometryType: 'point' as const,
            featureId: `${item.id}-benchmark`,
            frame: coordinateFrame,
            axis1: x,
            axis2: y,
            sourceRef: SOURCE_ID,
          },
          sourceRef: SOURCE_ID,
        },
      }),
    }]
  })
  const footprints = form.footprints.flatMap((item) => {
    const geometry = polygonPath(item, 'footprint', coordinateFrame, errors)
    if (geometry === null) return []
    const storeys = positiveNumber(item.storeys)
    return [{
      footprintId: item.id,
      path: geometry.path,
      holes: geometry.holes,
      label: item.label,
      ...(storeys === null ? {} : { storeysAboveGround: storeys }),
      origin: item.origin === 'surveyed-existing'
        ? { kind: 'surveyed-existing' as const, sourceRef: SOURCE_ID }
        : { kind: 'user-drawn' as const, sourceRef: SOURCE_ID },
    }]
  })
  const projections = form.projections.flatMap((item) => {
    const geometry = polygonPath(item, 'projection', coordinateFrame, errors)
    if (geometry === null) return []
    const depth = positiveNumber(item.projectionDepth)
    const clearHeight = positiveNumber(item.clearHeight)
    return [{
      projectionId: item.id,
      kind: item.kind,
      path: geometry.path,
      attachedToFootprintId: item.attachedToFootprintId.trim() || null,
      ...(depth === null ? {} : {
        projectionDepth: { asEntered: depth, unit: form.measurementUnit, sourceRef: SOURCE_ID },
      }),
      ...(clearHeight === null ? {} : {
        clearHeight: { asEntered: clearHeight, unit: form.measurementUnit, sourceRef: SOURCE_ID },
      }),
    }]
  })

  if (errors.length > 0) return { draft: null, errors }

  const identifiers = [
    ['plot-number', form.plotNumber],
    ['sector-pocket', form.sectorPocket],
    ['khasra-number', form.khasraNumber],
    ['scheme-licence', form.schemeLicence],
    ['property-id', form.propertyId],
    ['drawing-standard', form.standardProfile],
    ...edgeFacts.map((edge, index) => [`adjoining-edge-${index + 1}`, edge.adjoining]),
  ].flatMap(([key, value]) => value?.trim()
    ? [{ key: key ?? 'identifier', value: value.trim(), sourceRef: SOURCE_ID }]
    : [])

  const magneticDeclination = finiteNumber(form.magneticDeclination)
  const revisionActor = actor(form)
  const reconstructionLength = (value: string) => ({
    asEntered: positiveNumber(value)!,
    unit: form.measurementUnit,
    sourceRef: SOURCE_ID,
  })
  const reconstructedSides = form.reconstructedSides.map(reconstructionLength) as [
    ReturnType<typeof reconstructionLength>,
    ReturnType<typeof reconstructionLength>,
    ReturnType<typeof reconstructionLength>,
    ReturnType<typeof reconstructionLength>,
  ]
  const primaryDiagonal = {
    fromVertexIndex: 0 as const,
    toVertexIndex: 2 as const,
    length: reconstructionLength(form.primaryDiagonal),
  }
  const secondaryDiagonal = form.secondaryDiagonal.trim() === ''
    ? null
    : {
      fromVertexIndex: 1 as const,
      toVertexIndex: 3 as const,
      length: reconstructionLength(form.secondaryDiagonal),
    }
  const boundary: NonNullable<SitePlanBriefDraft['boundary']> = boundaryPath === null
    ? {
      route: 'reconstructed',
      sides: reconstructedSides,
      diagonals: [primaryDiagonal],
      disambiguation: form.reconstructionAssemblyId.trim() !== ''
        ? {
          kind: 'verified-sketch',
          sourceRef: SOURCE_ID,
          chosenAssemblyId: form.reconstructionAssemblyId.trim(),
        }
        : secondaryDiagonal === null
          ? null
          : { kind: 'second-diagonal', diagonal: secondaryDiagonal },
    }
    : {
      route: 'coordinates',
      outerPath: boundaryPath,
    }
  const draft: SitePlanBriefDraft = {
    schemaVersion: '3.0.0-draft',
    briefId: `local-${form.projectName.trim().toLowerCase().replaceAll(/[^a-z0-9]+/g, '-').replaceAll(/^-|-$/g, '') || 'site-plan'}`,
    identity: {
      projectName: form.projectName.trim(),
      pilotProfileRef: form.standardProfile,
      identifiers,
    },
    boundary,
    statedArea: {
      asEntered: statedArea!,
      unit: form.statedAreaUnit,
      statedPrecision: areaPrecision!,
      sourceRef: SOURCE_ID,
    },
    orientation: {
      basis: 'explicit-rotation',
      northRotation: {
        decimalDegrees: northRotation!,
        reference: form.northReference,
        sourceRef: SOURCE_ID,
      },
      ...(form.northReference !== 'magnetic' ? {} : {
        magnetic: {
          observationDate: form.magneticDate || null,
          declination: magneticDeclination === null ? null : {
            decimalDegrees: magneticDeclination,
            reference: 'true',
            sourceRef: SOURCE_ID,
          },
          modelOrSource: form.magneticModel.trim() || null,
        },
      }),
    },
    roadFrontages,
    cadastralHoles,
    encumbrances,
    restrictions,
    levels,
    existingFeatures,
    setbacks,
    footprints,
    projections,
    dimensions: [],
    drawing: {
      displayPrecisionM: displayPrecision!,
      displayUnit: form.displayUnit,
      sheetRef: `${form.sheet}-${form.sheetOrientation === 'landscape' ? 'L' : 'P'}`,
      declaredScaleDenominator: scale!,
      ...(form.requestProfessionalReview
        ? { requestedStamp: 'ready-for-professional-review' as const }
        : {}),
    },
    evidence: [evidence(form)],
    overrides: [],
    revisions: [{
      revisionId: 'revision-0',
      index: 0,
      issuedAt: '2026-07-26',
      issuedBy: revisionActor,
      evidenceRef: SOURCE_ID,
      changeNote: 'Created through the UrbanOS Feature 1 survey form.',
    }],
    acknowledgedWarnings: warningAcknowledgements(form),
  }

  return { draft, errors: [] }
}

export function sectionReadiness(
  form: FeatureOneFormState,
  formErrors: readonly string[],
  findings: readonly Finding[],
): {
  label: string
  complete: boolean
  detail: string
}[] {
  const findingCodes = new Set(findings.map((finding) => finding.code))
  const hasIdentity = form.projectName.trim() !== ''
    && [
      form.plotNumber,
      form.sectorPocket,
      form.khasraNumber,
      form.schemeLicence,
      form.propertyId,
    ].some((value) => value.trim() !== '')
  const hasEvidence = form.sourceTypeRef.trim() !== ''
    && form.sourceDate !== ''
    && positiveNumber(form.coordinatePrecision) !== null
    && (form.documentId.trim() !== '' || form.evidenceFile !== null)
  const hasBoundaryInput = form.boundaryRoute === 'coordinates'
    ? form.boundaryPoints.length >= 3
      && form.boundaryPoints.every((point) =>
        finiteNumber(point.x) !== null && finiteNumber(point.y) !== null)
    : form.reconstructedSides.every((side) => positiveNumber(side) !== null)
      && positiveNumber(form.primaryDiagonal) !== null
  const hasBoundary = hasBoundaryInput
    && !findingCodes.has('E_RECONSTRUCTION_AMBIGUOUS')
  const hasRoadNorth = finiteNumber(form.northRotation) !== null
    && normaliseEdgeFacts(form.edgeFacts, boundaryEdgeCount(form))
      .some((edge) => edge.isRoad && positiveNumber(edge.carriagewayWidth) !== null)
  const hasSetbacks = normaliseEdgeFacts(form.edgeFacts, boundaryEdgeCount(form))
    .every((edge) =>
      nonNegativeNumber(edge.setback) !== null
      && edge.setbackCitation.trim() !== ''
      && edge.adjoining.trim() !== '')
  const hasProposal = form.drawingPurpose === 'survey-base' || form.footprints.length > 0
  const hasDrawing = positiveNumber(form.scaleDenominator) !== null
    && positiveNumber(form.displayPrecisionM) !== null
  return [
    { label: 'Identity', complete: hasIdentity, detail: 'Plot/project identifiers' },
    { label: 'Evidence', complete: hasEvidence && !findingCodes.has('E_EVIDENCE_UNVERIFIED'), detail: 'Source and verification' },
    {
      label: 'Boundary',
      complete: hasBoundary && ![...findingCodes].some((code) => code.startsWith('E_RING_')),
      detail: form.boundaryRoute === 'coordinates'
        ? 'Survey coordinates and topology'
        : 'Four sides, diagonal and verified assembly',
    },
    { label: 'Access + north', complete: hasRoadNorth && !findingCodes.has('E_NORTH_ABSENT'), detail: 'Explicit road edge and orientation' },
    { label: 'Constraints', complete: hasSetbacks && !findingCodes.has('E_SETBACK_EDGE_UNCOVERED'), detail: 'Setbacks and adjoining context' },
    { label: 'Proposal', complete: hasProposal && ![...findingCodes].some((code) => code.startsWith('E_FOOTPRINT_')), detail: 'Supplied footprint, if requested' },
    { label: 'Drawing', complete: hasDrawing && formErrors.length === 0, detail: 'Sheet, scale and precision' },
  ]
}
