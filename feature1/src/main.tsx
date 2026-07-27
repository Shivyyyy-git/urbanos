import { StrictMode, useMemo, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import type { Root } from 'react-dom/client'

import {
  DEFAULT_KERNEL_PARAMETERS,
  KernelError,
  buildDrawingModel,
  exportSitePlan,
  validateSitePlan,
  type CandidateAssembly,
  type DrawingModel,
  type Finding,
  type PdfExportProfile,
  type ValidationResult,
  type WarningCode,
} from '../../kernel/src/index.ts'
import {
  DEMO_FORM,
  EMPTY_EDGE_FACT,
  EMPTY_FORM,
  RECONSTRUCTED_DEMO_FORM,
  boundaryEdgeCount,
  buildDraft,
  normaliseEdgeFacts,
  sectionReadiness,
  type EdgeFactInput,
  type EncumbranceInput,
  type ExistingFeatureInput,
  type FeatureOneFormState,
  type FootprintInput,
  type LevelInput,
  type PolygonInput,
  type ProjectionInput,
  type SheetName,
  type SurveyPointInput,
} from './formModel.ts'
import './styles.css'

const STEPS = [
  ['identity', '1', 'Identity & source'],
  ['boundary', '2', 'Survey boundary'],
  ['edges', '3', 'Roads & setbacks'],
  ['constraints', '4', 'Site constraints'],
  ['proposal', '5', 'Proposal geometry'],
  ['verify', '6', 'Verify & export'],
] as const

type StepId = (typeof STEPS)[number][0]

const PROFILE_COPY = {
  'neutral-professional-review': {
    label: 'Neutral professional review',
    detail: 'Jurisdiction-neutral survey sheet. No planning value is assumed.',
  },
  'dda-site-plan': {
    label: 'Delhi / DDA site-plan intake',
    detail: 'Captures the site-plan facts listed by UBBL 2016; final sanction remains with the authority and appointed professional.',
  },
  'haryana-obpas-site-plan': {
    label: 'Haryana OBPAS site-plan intake',
    detail: 'Captures the site facts required before an architect prepares the current OBPAS CAD package.',
  },
} as const

const OFFICIAL_SOURCES = {
  dda:
    'https://dda.gov.in/sites/default/files/public-notice/COMPENDIUM_OF_UBBL_201605082020.pdf',
  haryanaManual:
    'https://obpas.ulbharyana.gov.in/docs/User%20Manual%20for%20Allottee%20and%20Architect%20for%20OBPAS.pdf',
  haryanaPortal: 'https://obpas.ulbharyana.gov.in/',
}

const SHEETS: Record<SheetName, readonly [shortMm: number, longMm: number]> = {
  A4: [210, 297],
  A3: [297, 420],
  A2: [420, 594],
  A1: [594, 841],
  A0: [841, 1189],
}

function cloneForm(form: FeatureOneFormState): FeatureOneFormState {
  return structuredClone(form)
}

function numberOrNull(value: string): number | null {
  if (value.trim() === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function sheetProfile(form: FeatureOneFormState): PdfExportProfile {
  const dimensions = SHEETS[form.sheet]
  const shortMm = dimensions[0]
  const longMm = dimensions[1]
  const landscape = form.sheetOrientation === 'landscape'
  const widthMm = landscape ? longMm : shortMm
  const heightMm = landscape ? shortMm : longMm
  const titleBlockHeightMm = form.sheet === 'A4' ? 38 : 48
  return {
    sheet: {
      ref: `${form.sheet}-${landscape ? 'L' : 'P'}`,
      widthMm,
      heightMm,
    },
    frame: {
      leftMm: 12,
      rightMm: 12,
      topMm: 12,
      bottomMm: 12,
      titleBlockHeightMm,
    },
    paperToleranceMm: DEFAULT_KERNEL_PARAMETERS.paperToleranceMm,
  }
}

function download(filename: string, data: string | Uint8Array, mime: string): void {
  const blob = new Blob([data as BlobPart], { type: mime })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.style.display = 'none'
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  // Keep the object URL alive long enough for slower browser download
  // managers to claim it before releasing the in-memory bytes.
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000)
}

function fileSlug(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/^-|-$/g, '')
    || 'urbanos-site-plan'
}

function hex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

function Field({
  label,
  hint,
  required = false,
  children,
  wide = false,
}: {
  label: string
  hint?: string
  required?: boolean
  children: ReactNode
  wide?: boolean
}) {
  return (
    <label className={`field ${wide ? 'field-wide' : ''}`}>
      <span className="field-label">
        {label}
        {required && <span className="required" aria-label="required"> *</span>}
      </span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  )
}

function SectionTitle({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string
  title: string
  description: string
}) {
  return (
    <div className="section-title">
      <span>{eyebrow}</span>
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  )
}

function EmptyState({ children }: { children: ReactNode }) {
  return <div className="empty-state">{children}</div>
}

function FindingList({
  title,
  findings,
  kind,
}: {
  title: string
  findings: readonly Finding[]
  kind: 'blocker' | 'warning'
}) {
  if (findings.length === 0) return null
  return (
    <section className={`finding-panel ${kind}`}>
      <h3>{title}</h3>
      <ol>
        {findings.map((finding, index) => (
          <li key={`${finding.code}-${index}`}>
            <code>{finding.code}</code>
            <span>{finding.message}</span>
            {(finding.observed || finding.required) && (
              <small>
                {finding.observed && <>Observed: {finding.observed}</>}
                {finding.observed && finding.required && ' · '}
                {finding.required && <>Required: {finding.required}</>}
              </small>
            )}
          </li>
        ))}
      </ol>
    </section>
  )
}

const PREVIEW_COLOURS: Record<string, string> = {
  'PLOT-BOUNDARY': '#111827',
  'CADASTRAL-HOLE': '#dc2626',
  'DEVELOPABLE-ENVELOPE': '#059669',
  'ROAD-FRONTAGE': '#2563eb',
  ENCUMBRANCE: '#e11d48',
  RESTRICTION: '#9333ea',
  'EXISTING-FEATURE': '#64748b',
  SETBACK: '#d97706',
  FOOTPRINT: '#0891b2',
  PROJECTION: '#a16207',
  LEVEL: '#334155',
  DIMENSION: '#475569',
  NORTH: '#111827',
  ANNOTATION: '#111827',
}

function DrawingPreview({ model }: { model: DrawingModel }) {
  const pad = Math.max(
    (model.bounds.maxX - model.bounds.minX) * 0.06,
    (model.bounds.maxY - model.bounds.minY) * 0.06,
    0.5,
  )
  const minX = model.bounds.minX - pad
  const minY = model.bounds.minY - pad
  const width = model.bounds.maxX - model.bounds.minX + pad * 2
  const height = model.bounds.maxY - model.bounds.minY + pad * 2
  return (
    <div className="preview-card">
      <div className="preview-header">
        <div>
          <span>Canonical preview</span>
          <strong>Same linework feeds DXF + PDF</strong>
        </div>
        <span className="preview-scale">1:{model.scaleDenominator}</span>
      </div>
      {model.boundaryProvenanceNote !== null && (
        <div className="preview-provenance">
          <strong>{model.boundaryProvenanceNote}</strong>
          <span>This note is embedded in the downloaded DXF, PDF and parity manifest.</span>
        </div>
      )}
      <svg
        viewBox={`${minX} ${minY} ${width} ${height}`}
        role="img"
        aria-label="Validated canonical site plan preview"
      >
        <g transform={`translate(0 ${minY * 2 + height}) scale(1 -1)`}>
          {model.paths.map((path) => {
            if (path.points.length < 2) return null
            const d = path.points
              .map(([x, y], index) => `${index === 0 ? 'M' : 'L'} ${x} ${y}`)
              .join(' ')
              + (path.closed ? ' Z' : '')
            return (
              <path
                key={path.id}
                d={d}
                fill="none"
                stroke={PREVIEW_COLOURS[path.layer] ?? '#334155'}
                strokeWidth={path.layer === 'PLOT-BOUNDARY' ? 2.4 : 1.5}
                strokeDasharray={
                  ['SETBACK', 'ENCUMBRANCE', 'PROJECTION', 'RESTRICTION'].includes(path.layer)
                    ? '7 4'
                    : undefined
                }
                vectorEffect="non-scaling-stroke"
              />
            )
          })}
        </g>
      </svg>
      <div className="preview-legend">
        {['PLOT-BOUNDARY', 'SETBACK', 'FOOTPRINT', 'ROAD-FRONTAGE', 'ENCUMBRANCE'].map((layer) => (
          <span key={layer}>
            <i style={{ background: PREVIEW_COLOURS[layer] }} />
            {layer.toLowerCase().replaceAll('-', ' ')}
          </span>
        ))}
      </div>
    </div>
  )
}

function CoordinateTextarea({
  value,
  onChange,
  label = 'Coordinates',
}: {
  value: string
  onChange: (value: string) => void
  label?: string
}) {
  return (
    <Field
      label={label}
      hint="One X,Y pair per line. Coordinates remain exactly as entered."
      required
      wide
    >
      <textarea
        rows={5}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={'0,0\n12.5,0\n12.2,8.4\n0,8'}
      />
    </Field>
  )
}

function IdentityStep({
  form,
  update,
  onFile,
}: {
  form: FeatureOneFormState
  update: <K extends keyof FeatureOneFormState>(key: K, value: FeatureOneFormState[K]) => void
  onFile: (file: File | null) => Promise<void>
}) {
  const professional = form.verification === 'professional-verified'
  return (
    <>
      <SectionTitle
        eyebrow="Step 1 · Traceability"
        title="Identify this plot and its source"
        description="Every coordinate and measurement must trace to one named document or attached file. Verification is a claim the kernel checks, not a decorative badge."
      />

      <div className="profile-grid">
        {Object.entries(PROFILE_COPY).map(([id, copy]) => (
          <button
            type="button"
            key={id}
            className={`profile-choice ${form.standardProfile === id ? 'selected' : ''}`}
            onClick={() => update('standardProfile', id as FeatureOneFormState['standardProfile'])}
          >
            <strong>{copy.label}</strong>
            <span>{copy.detail}</span>
          </button>
        ))}
      </div>

      <div className="source-note">
        <strong>What the official profiles change</strong>
        <p>
          They change required facts and export conventions—not the supplied geometry.
          Review the <a href={OFFICIAL_SOURCES.dda} target="_blank" rel="noreferrer">DDA UBBL source</a>
          {' '}or the <a href={OFFICIAL_SOURCES.haryanaManual} target="_blank" rel="noreferrer">Haryana OBPAS manual</a>.
        </p>
      </div>

      <div className="form-grid">
        <Field label="Drawing purpose" required>
          <select
            value={form.drawingPurpose}
            onChange={(event) => update('drawingPurpose', event.target.value as FeatureOneFormState['drawingPurpose'])}
          >
            <option value="site-plan-proposal">Site plan with supplied proposal</option>
            <option value="survey-base">Survey base / existing conditions</option>
          </select>
        </Field>
        <Field label="Project / site name" required>
          <input value={form.projectName} onChange={(event) => update('projectName', event.target.value)} />
        </Field>
        <Field label="Plot number">
          <input value={form.plotNumber} onChange={(event) => update('plotNumber', event.target.value)} />
        </Field>
        <Field label="Sector / pocket">
          <input value={form.sectorPocket} onChange={(event) => update('sectorPocket', event.target.value)} />
        </Field>
        <Field label="Khasra number">
          <input value={form.khasraNumber} onChange={(event) => update('khasraNumber', event.target.value)} />
        </Field>
        <Field label="Scheme / licence number">
          <input value={form.schemeLicence} onChange={(event) => update('schemeLicence', event.target.value)} />
        </Field>
        <Field
          label="Property ID"
          {...(form.standardProfile === 'haryana-obpas-site-plan'
            ? { hint: 'Haryana OBPAS uses the PID to pull property metadata.' }
            : {})}
        >
          <input value={form.propertyId} onChange={(event) => update('propertyId', event.target.value)} />
        </Field>
      </div>

      <h3 className="subheading">Primary geometry evidence</h3>
      <div className="form-grid">
        <Field label="Source type" required hint="Example: boundary survey, sale deed, sanctioned plan, total-station file.">
          <input
            value={form.sourceTypeRef}
            onChange={(event) => update('sourceTypeRef', event.target.value)}
            placeholder="professional-boundary-survey"
          />
        </Field>
        <Field label="Document / survey ID" required={form.evidenceFile === null}>
          <input value={form.documentId} onChange={(event) => update('documentId', event.target.value)} />
        </Field>
        <Field label="Source date" required>
          <input type="date" value={form.sourceDate} onChange={(event) => update('sourceDate', event.target.value)} />
        </Field>
        <Field label="Verification state" required>
          <select
            value={form.verification}
            onChange={(event) => update('verification', event.target.value as FeatureOneFormState['verification'])}
          >
            <option value="unverified">Unverified</option>
            <option value="self-declared">Self-declared</option>
            <option value="document-attached">Document attached</option>
            <option value="professional-verified">Professional verified</option>
          </select>
        </Field>
        <Field label="Attach source file" hint="Hashed locally; the file is not uploaded anywhere.">
          <input
            type="file"
            accept=".dxf,.dwg,.pdf,.csv,.txt,.json,image/*"
            onChange={(event) => void onFile(event.target.files?.[0] ?? null)}
          />
        </Field>
        <div className="hash-box">
          {form.evidenceFile ? (
            <>
              <strong>{form.evidenceFile.filename}</strong>
              <span>{form.evidenceFile.bytes.toLocaleString()} bytes</span>
              <code>{form.evidenceFile.sha256}</code>
            </>
          ) : (
            <span>No immutable file hash recorded yet.</span>
          )}
        </div>
      </div>

      {professional && (
        <>
          <h3 className="subheading">Responsible professional</h3>
          <div className="form-grid">
            <Field label="Full name" required>
              <input value={form.professionalName} onChange={(event) => update('professionalName', event.target.value)} />
            </Field>
            <Field label="Licence / registration number" required>
              <input value={form.professionalLicence} onChange={(event) => update('professionalLicence', event.target.value)} />
            </Field>
            <Field label="Discipline" required>
              <select
                value={form.professionalDiscipline}
                onChange={(event) => update('professionalDiscipline', event.target.value as FeatureOneFormState['professionalDiscipline'])}
              >
                <option value="surveyor">Surveyor</option>
                <option value="architect">Architect</option>
                <option value="structural-engineer">Structural engineer</option>
                <option value="town-planner">Town planner</option>
                <option value="other">Other</option>
              </select>
            </Field>
          </div>
        </>
      )}
    </>
  )
}

function BoundaryStep({
  form,
  update,
  setPoint,
  addPoint,
  removePoint,
  candidates,
}: {
  form: FeatureOneFormState
  update: <K extends keyof FeatureOneFormState>(key: K, value: FeatureOneFormState[K]) => void
  setPoint: (index: number, patch: Partial<SurveyPointInput>) => void
  addPoint: () => void
  removePoint: (index: number) => void
  candidates: readonly CandidateAssembly[]
}) {
  const setSide = (index: 0 | 1 | 2 | 3, value: string): void => {
    const sides: [string, string, string, string] = [...form.reconstructedSides]
    sides[index] = value
    update('reconstructedSides', sides)
    update('reconstructionAssemblyId', '')
  }
  const candidateIds = new Set(candidates.map((candidate) => candidate.assemblyId))
  if (form.reconstructionAssemblyId !== '') {
    candidateIds.add(form.reconstructionAssemblyId)
  }

  return (
    <>
      <SectionTitle
        eyebrow="Step 2 · Geometry"
        title="Enter the surveyed boundary"
        description="Use surveyed coordinates when available, or four ordered sides plus a measured diagonal from a deed/sketch. No rectangle, snap, missing corner, or north direction is inferred."
      />

      <div className="profile-grid boundary-route-grid">
        <button
          type="button"
          className={`profile-choice ${form.boundaryRoute === 'coordinates' ? 'selected' : ''}`}
          onClick={() => update('boundaryRoute', 'coordinates')}
        >
          <strong>Survey coordinates</strong>
          <span>Best route: ordered corner Easting/Northing or local X/Y from a survey.</span>
        </button>
        <button
          type="button"
          className={`profile-choice ${form.boundaryRoute === 'reconstructed' ? 'selected' : ''}`}
          onClick={() => update('boundaryRoute', 'reconstructed')}
        >
          <strong>Four sides + diagonal</strong>
          <span>Deed/sketch route for a quadrilateral. Ambiguous shapes stay blocked.</span>
        </button>
      </div>

      <div className="form-grid">
        <Field
          label={form.boundaryRoute === 'coordinates'
            ? 'Coordinate unit'
            : 'Supplementary coordinate unit'}
          required
          {...(form.boundaryRoute === 'reconstructed'
            ? { hint: 'Used for footprints, levels and existing features entered as local coordinates.' }
            : {})}
        >
          <select
            value={form.coordinateUnit}
            onChange={(event) => update('coordinateUnit', event.target.value as FeatureOneFormState['coordinateUnit'])}
          >
            <option value="m">Metres</option>
            <option value="ft">Feet</option>
            <option value="yd">Yards</option>
          </select>
        </Field>
        <Field
          label={form.boundaryRoute === 'coordinates'
            ? 'Survey coordinate precision'
            : `Side/diagonal precision (${form.measurementUnit})`}
          required
          hint="The smallest boundary measurement increment claimed by the source."
        >
          <input
            inputMode="decimal"
            value={form.coordinatePrecision}
            onChange={(event) => update('coordinatePrecision', event.target.value)}
            placeholder="0.001"
          />
        </Field>
        <Field
          label={form.boundaryRoute === 'coordinates' ? 'Other measurement unit' : 'Side / measurement unit'}
          required
          hint="Used for side lengths, diagonals, setbacks, road widths and levels."
        >
          <select
            value={form.measurementUnit}
            onChange={(event) => update('measurementUnit', event.target.value as FeatureOneFormState['measurementUnit'])}
          >
            <option value="m">Metres</option>
            <option value="ft">Feet</option>
            <option value="yd">Yards</option>
          </select>
        </Field>
        <Field label="Coordinate frame" required>
          <select
            value={form.isLocalFrame ? 'local' : 'georeferenced'}
            onChange={(event) => update('isLocalFrame', event.target.value === 'local')}
          >
            <option value="local">Local survey grid</option>
            <option value="georeferenced">Projected / georeferenced CRS</option>
          </select>
        </Field>
        <Field
          label="CRS code"
          required={!form.isLocalFrame}
          hint={form.isLocalFrame ? 'Leave blank for a local grid.' : 'Projected CRS only, for example EPSG:32643.'}
        >
          <input
            value={form.crsCode}
            onChange={(event) => update('crsCode', event.target.value)}
            placeholder={form.isLocalFrame ? 'Local frame — blank' : 'EPSG:32643'}
          />
        </Field>
      </div>

      {form.boundaryRoute === 'coordinates' ? (
        <>
          <div className="table-toolbar">
            <div>
              <h3>Ordered boundary corners</h3>
              <p>Preserve a point when it is a surveyed monument even if it lies on a straight edge.</p>
            </div>
            <button type="button" className="button secondary" onClick={addPoint}>+ Add corner</button>
          </div>
          <div className="coordinate-table-wrap">
            <table className="coordinate-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Point ID</th>
                  <th>X / Easting</th>
                  <th>Y / Northing</th>
                  <th>Monument ID</th>
                  <th>Preserve</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {form.boundaryPoints.map((point, index) => (
                  <tr key={`${point.id}-${index}`}>
                    <td>{index + 1}</td>
                    <td><input aria-label={`Point ${index + 1} ID`} value={point.id} onChange={(event) => setPoint(index, { id: event.target.value })} /></td>
                    <td><input aria-label={`Point ${index + 1} X`} inputMode="decimal" value={point.x} onChange={(event) => setPoint(index, { x: event.target.value })} /></td>
                    <td><input aria-label={`Point ${index + 1} Y`} inputMode="decimal" value={point.y} onChange={(event) => setPoint(index, { y: event.target.value })} /></td>
                    <td><input aria-label={`Point ${index + 1} monument`} value={point.monumentId} onChange={(event) => setPoint(index, { monumentId: event.target.value })} /></td>
                    <td>
                      <input
                        aria-label={`Preserve point ${index + 1}`}
                        type="checkbox"
                        checked={point.preserve}
                        onChange={(event) => setPoint(index, { preserve: event.target.checked })}
                      />
                    </td>
                    <td>
                      <button
                        type="button"
                        className="icon-button"
                        disabled={form.boundaryPoints.length <= 3}
                        onClick={() => removePoint(index)}
                        aria-label={`Remove point ${index + 1}`}
                      >×</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <>
          <div className="source-note reconstruction-note">
            <strong>Reconstruction is never treated as a survey</strong>
            <p>
              Enter sides in boundary order V0→V1→V2→V3→V0. One diagonal can describe
              several real shapes. UrbanOS exposes every candidate and blocks export until
              your verified source identifies the correct assembly.
            </p>
          </div>
          <div className="form-grid">
            {form.reconstructedSides.map((side, index) => (
              <Field
                key={`reconstructed-side-${index}`}
                label={`Side V${index}→V${(index + 1) % 4} (${form.measurementUnit})`}
                required
              >
                <input
                  inputMode="decimal"
                  value={side}
                  onChange={(event) => setSide(index as 0 | 1 | 2 | 3, event.target.value)}
                />
              </Field>
            ))}
            <Field label={`Primary diagonal V0→V2 (${form.measurementUnit})`} required>
              <input
                inputMode="decimal"
                value={form.primaryDiagonal}
                onChange={(event) => {
                  update('primaryDiagonal', event.target.value)
                  update('reconstructionAssemblyId', '')
                }}
              />
            </Field>
            <Field
              label={`Second diagonal V1→V3 (${form.measurementUnit})`}
              hint="Recommended. It narrows the candidates but may not prove mirror handedness."
            >
              <input
                inputMode="decimal"
                value={form.secondaryDiagonal}
                onChange={(event) => {
                  update('secondaryDiagonal', event.target.value)
                  update('reconstructionAssemblyId', '')
                }}
              />
            </Field>
            <Field
              label="Verified assembly"
              wide
              hint="Select only when the attached professional sketch/deed clearly matches these vertices. Leaving this blank keeps export blocked."
            >
              <select
                value={form.reconstructionAssemblyId}
                onChange={(event) => update('reconstructionAssemblyId', event.target.value)}
              >
                <option value="">Not yet established by the source</option>
                {[...candidateIds].map((assemblyId) => {
                  const candidate = candidates.find((item) => item.assemblyId === assemblyId)
                  return (
                    <option value={assemblyId} key={assemblyId}>
                      {candidate === undefined
                        ? assemblyId
                        : `${assemblyId} · ${candidate.shape} · ${candidate.areaSqm.toFixed(3)} m²`}
                    </option>
                  )
                })}
              </select>
            </Field>
          </div>
          {candidates.length > 0 && (
            <div className="candidate-grid" aria-label="Reconstruction candidates">
              {candidates.map((candidate) => (
                <article
                  className={form.reconstructionAssemblyId === candidate.assemblyId ? 'selected' : ''}
                  key={candidate.assemblyId}
                >
                  <strong>{candidate.assemblyId}</strong>
                  <span>{candidate.shape} · {candidate.areaSqm.toFixed(3)} m²</span>
                  <code>
                    {candidate.vertices
                      .map((point, index) => `V${index} ${point.x.toFixed(3)},${point.y.toFixed(3)}`)
                      .join(' · ')}
                  </code>
                </article>
              ))}
            </div>
          )}
        </>
      )}

      <h3 className="subheading">Area reconciliation</h3>
      <div className="form-grid">
        <Field label="Stated deed / survey area" required>
          <input inputMode="decimal" value={form.statedArea} onChange={(event) => update('statedArea', event.target.value)} />
        </Field>
        <Field label="Area unit" required>
          <select
            value={form.statedAreaUnit}
            onChange={(event) => update('statedAreaUnit', event.target.value as FeatureOneFormState['statedAreaUnit'])}
          >
            <option value="sqm">Square metres</option>
            <option value="sqft">Square feet</option>
            <option value="sqyd">Square yards</option>
            <option value="gaj">Gaj</option>
            <option value="acre">Acres</option>
          </select>
        </Field>
        <Field label="Source precision step" required hint="Example: 1 for an area rounded to whole gaj, or 0.01 for two decimals.">
          <input inputMode="decimal" value={form.statedAreaPrecision} onChange={(event) => update('statedAreaPrecision', event.target.value)} />
        </Field>
      </div>

      <h3 className="subheading">North basis</h3>
      <div className="form-grid">
        <Field label="North rotation (degrees)" required hint="Rotation of north from drawing-up. Enter 0 only when the source says north is up.">
          <input inputMode="decimal" value={form.northRotation} onChange={(event) => update('northRotation', event.target.value)} />
        </Field>
        <Field label="Reference" required>
          <select
            value={form.northReference}
            onChange={(event) => update('northReference', event.target.value as FeatureOneFormState['northReference'])}
          >
            <option value="true">True north</option>
            <option value="grid">Grid north</option>
            <option value="magnetic">Magnetic observation</option>
          </select>
        </Field>
        {form.northReference === 'magnetic' && (
          <>
            <Field label="Observation date" required>
              <input type="date" value={form.magneticDate} onChange={(event) => update('magneticDate', event.target.value)} />
            </Field>
            <Field label="Declination to true north" required>
              <input inputMode="decimal" value={form.magneticDeclination} onChange={(event) => update('magneticDeclination', event.target.value)} />
            </Field>
            <Field label="Magnetic model / source" required>
              <input value={form.magneticModel} onChange={(event) => update('magneticModel', event.target.value)} placeholder="IGRF/WMM/source record" />
            </Field>
          </>
        )}
      </div>
    </>
  )
}

function EdgesStep({
  form,
  setEdge,
}: {
  form: FeatureOneFormState
  setEdge: (index: number, patch: Partial<EdgeFactInput>) => void
}) {
  const edges = normaliseEdgeFacts(form.edgeFacts, boundaryEdgeCount(form))
  return (
    <>
      <SectionTitle
        eyebrow="Step 3 · Context"
        title="Name every edge, road and setback"
        description="Each row is the real segment from one supplied corner to the next. Road position and setback distance are explicit source facts—there is no front/top/left fallback."
      />
      <div className="edge-list">
        {edges.map((edge, index) => {
          const from = form.boundaryRoute === 'reconstructed'
            ? `V${index}`
            : form.boundaryPoints[index]?.id || `P${index + 1}`
          const to = form.boundaryRoute === 'reconstructed'
            ? `V${(index + 1) % 4}`
            : form.boundaryPoints[(index + 1) % form.boundaryPoints.length]?.id || 'P1'
          return (
            <article className="edge-card" key={`edge-${index}`}>
              <header>
                <div className="edge-number">{index + 1}</div>
                <div>
                  <strong>{from} → {to}</strong>
                  <span>Boundary edge {index + 1}</span>
                </div>
                <label className="road-toggle">
                  <input
                    type="checkbox"
                    checked={edge.isRoad}
                    onChange={(event) => setEdge(index, { isRoad: event.target.checked })}
                  />
                  Road / means of access
                </label>
              </header>
              <div className="form-grid compact">
                <Field label="Adjoining land / street" required>
                  <input value={edge.adjoining} onChange={(event) => setEdge(index, { adjoining: event.target.value })} placeholder="Neighbouring plot, park, drain, road…" />
                </Field>
                <Field label={`Setback (${form.measurementUnit})`} required hint="Enter 0 explicitly if the verified schedule requires zero.">
                  <input inputMode="decimal" value={edge.setback} onChange={(event) => setEdge(index, { setback: event.target.value })} />
                </Field>
                <Field label="Setback source / citation" required>
                  <input value={edge.setbackCitation} onChange={(event) => setEdge(index, { setbackCitation: event.target.value })} />
                </Field>
                {edge.isRoad && (
                  <>
                    <Field label="Road role" required>
                      <select value={edge.roadRole} onChange={(event) => setEdge(index, { roadRole: event.target.value as EdgeFactInput['roadRole'] })}>
                        <option value="main">Main road</option>
                        <option value="side">Side road</option>
                      </select>
                    </Field>
                    <Field label="Road name">
                      <input value={edge.roadName} onChange={(event) => setEdge(index, { roadName: event.target.value })} />
                    </Field>
                    <Field label={`Carriageway width (${form.measurementUnit})`} required>
                      <input inputMode="decimal" value={edge.carriagewayWidth} onChange={(event) => setEdge(index, { carriagewayWidth: event.target.value })} />
                    </Field>
                    <Field label={`Right-of-way width (${form.measurementUnit})`}>
                      <input inputMode="decimal" value={edge.rowWidth} onChange={(event) => setEdge(index, { rowWidth: event.target.value })} />
                    </Field>
                  </>
                )}
              </div>
            </article>
          )
        })}
      </div>
    </>
  )
}

function PolygonCard({
  title,
  item,
  onChange,
  onRemove,
  extra,
}: {
  title: string
  item: PolygonInput
  onChange: (patch: Partial<PolygonInput>) => void
  onRemove: () => void
  extra?: ReactNode
}) {
  return (
    <article className="geometry-card">
      <header>
        <strong>{title}</strong>
        <button type="button" className="icon-button" onClick={onRemove} aria-label={`Remove ${title}`}>×</button>
      </header>
      <div className="form-grid compact">
        <Field label="Stable ID" required>
          <input value={item.id} onChange={(event) => onChange({ id: event.target.value })} />
        </Field>
        <Field label="Description / label">
          <input value={item.label} onChange={(event) => onChange({ label: event.target.value })} />
        </Field>
        {extra}
        <CoordinateTextarea value={item.coordinates} onChange={(coordinates) => onChange({ coordinates })} />
        <Field label="Hole rings" hint="Optional. Separate multiple rings with a line containing ---." wide>
          <textarea rows={3} value={item.holes} onChange={(event) => onChange({ holes: event.target.value })} placeholder="x,y; x,y; x,y" />
        </Field>
      </div>
    </article>
  )
}

function ConstraintsStep({
  form,
  update,
}: {
  form: FeatureOneFormState
  update: <K extends keyof FeatureOneFormState>(key: K, value: FeatureOneFormState[K]) => void
}) {
  const addHole = () => update('cadastralHoles', [...form.cadastralHoles, {
    id: `ownership-void-${form.cadastralHoles.length + 1}`,
    label: '',
    coordinates: '',
    holes: '',
  }])
  const addEncumbrance = () => update('encumbrances', [...form.encumbrances, {
    id: `encumbrance-${form.encumbrances.length + 1}`,
    label: '',
    coordinates: '',
    holes: '',
    kind: 'no-build-zone',
    clearance: '',
  }])
  const addRestriction = () => update('restrictions', [...form.restrictions, {
    id: `restriction-${form.restrictions.length + 1}`,
    label: '',
    coordinates: '',
    holes: '',
  }])
  const addFeature = () => update('existingFeatures', [...form.existingFeatures, {
    id: `feature-${form.existingFeatures.length + 1}`,
    kindRef: '',
    geometryType: 'point',
    coordinates: '',
    retained: 'unknown',
  }])
  const addLevel = () => update('levels', [...form.levels, {
    id: `RL-${form.levels.length + 1}`,
    x: '',
    y: '',
    elevation: '',
    datum: 'MSL',
    benchmarkDescription: '',
  }])
  return (
    <>
      <SectionTitle
        eyebrow="Step 4 · Existing conditions"
        title="Record everything that changes where construction can occur"
        description="Ownership voids, easements, HT/gas/service corridors, drains, trees, walls and levels are separate facts. Empty sections mean none were supplied—not that the site is empty."
      />
      <div className="constraint-actions">
        <button type="button" className="button secondary" onClick={addHole}>+ Ownership void</button>
        <button type="button" className="button secondary" onClick={addEncumbrance}>+ Encumbrance</button>
        <button type="button" className="button secondary" onClick={addRestriction}>+ Restriction</button>
        <button type="button" className="button secondary" onClick={addFeature}>+ Existing feature</button>
        <button type="button" className="button secondary" onClick={addLevel}>+ Level</button>
      </div>

      {form.cadastralHoles.length === 0
        && form.encumbrances.length === 0
        && form.restrictions.length === 0
        && form.existingFeatures.length === 0
        && form.levels.length === 0 && (
          <EmptyState>No site constraints or existing features have been entered.</EmptyState>
        )}

      {form.cadastralHoles.map((item, index) => (
        <PolygonCard
          key={`hole-${index}`}
          title="Ownership void"
          item={item}
          onChange={(patch) => update('cadastralHoles', form.cadastralHoles.map((value, itemIndex) => itemIndex === index ? { ...value, ...patch } : value))}
          onRemove={() => update('cadastralHoles', form.cadastralHoles.filter((_, itemIndex) => itemIndex !== index))}
        />
      ))}
      {form.encumbrances.map((item, index) => (
        <PolygonCard
          key={`encumbrance-${index}`}
          title="Encumbrance / no-build surface"
          item={item}
          onChange={(patch) => update('encumbrances', form.encumbrances.map((value, itemIndex) => itemIndex === index ? { ...value, ...patch } : value))}
          onRemove={() => update('encumbrances', form.encumbrances.filter((_, itemIndex) => itemIndex !== index))}
          extra={(
            <>
              <Field label="Kind" required>
                <select
                  value={item.kind}
                  onChange={(event) => update('encumbrances', form.encumbrances.map((value, itemIndex) => itemIndex === index ? { ...value, kind: event.target.value as EncumbranceInput['kind'] } : value))}
                >
                  <option value="easement">Easement</option>
                  <option value="right-of-way">Right of way</option>
                  <option value="no-build-zone">No-build zone</option>
                  <option value="service-corridor">Service corridor</option>
                  <option value="water-body-buffer">Water-body buffer</option>
                  <option value="other">Other</option>
                </select>
              </Field>
              <Field label={`Clearance (${form.measurementUnit})`} hint="Optional for a polygon; required when a future point/line buffer is used.">
                <input
                  inputMode="decimal"
                  value={item.clearance}
                  onChange={(event) => update('encumbrances', form.encumbrances.map((value, itemIndex) => itemIndex === index ? { ...value, clearance: event.target.value } : value))}
                />
              </Field>
            </>
          )}
        />
      ))}
      {form.restrictions.map((item, index) => (
        <PolygonCard
          key={`restriction-${index}`}
          title="Verified restriction"
          item={item}
          onChange={(patch) => update('restrictions', form.restrictions.map((value, itemIndex) => itemIndex === index ? { ...value, ...patch } : value))}
          onRemove={() => update('restrictions', form.restrictions.filter((_, itemIndex) => itemIndex !== index))}
        />
      ))}

      {form.existingFeatures.map((item, index) => (
        <article className="geometry-card" key={`feature-${index}`}>
          <header>
            <strong>Existing physical feature</strong>
            <button type="button" className="icon-button" onClick={() => update('existingFeatures', form.existingFeatures.filter((_, itemIndex) => itemIndex !== index))}>×</button>
          </header>
          <div className="form-grid compact">
            <Field label="Stable ID" required>
              <input value={item.id} onChange={(event) => update('existingFeatures', form.existingFeatures.map((value, itemIndex) => itemIndex === index ? { ...value, id: event.target.value } : value))} />
            </Field>
            <Field label="Feature kind" required hint="Tree, drain, well, wall, pole, HT line, gas line…">
              <input value={item.kindRef} onChange={(event) => update('existingFeatures', form.existingFeatures.map((value, itemIndex) => itemIndex === index ? { ...value, kindRef: event.target.value } : value))} />
            </Field>
            <Field label="Geometry" required>
              <select value={item.geometryType} onChange={(event) => update('existingFeatures', form.existingFeatures.map((value, itemIndex) => itemIndex === index ? { ...value, geometryType: event.target.value as ExistingFeatureInput['geometryType'] } : value))}>
                <option value="point">Point</option>
                <option value="polyline">Polyline</option>
                <option value="polygon">Polygon</option>
              </select>
            </Field>
            <Field label="Retained?" required>
              <select value={item.retained} onChange={(event) => update('existingFeatures', form.existingFeatures.map((value, itemIndex) => itemIndex === index ? { ...value, retained: event.target.value as ExistingFeatureInput['retained'] } : value))}>
                <option value="unknown">Unknown / review</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </Field>
            <CoordinateTextarea
              value={item.coordinates}
              onChange={(coordinates) => update('existingFeatures', form.existingFeatures.map((value, itemIndex) => itemIndex === index ? { ...value, coordinates } : value))}
            />
          </div>
        </article>
      ))}

      {form.levels.map((item, index) => (
        <article className="geometry-card" key={`level-${index}`}>
          <header>
            <strong>Spot level / reduced level</strong>
            <button type="button" className="icon-button" onClick={() => update('levels', form.levels.filter((_, itemIndex) => itemIndex !== index))}>×</button>
          </header>
          <div className="form-grid compact">
            <Field label="Reading ID" required>
              <input value={item.id} onChange={(event) => update('levels', form.levels.map((value, itemIndex) => itemIndex === index ? { ...value, id: event.target.value } : value))} />
            </Field>
            <Field label="X" required>
              <input inputMode="decimal" value={item.x} onChange={(event) => update('levels', form.levels.map((value, itemIndex) => itemIndex === index ? { ...value, x: event.target.value } : value))} />
            </Field>
            <Field label="Y" required>
              <input inputMode="decimal" value={item.y} onChange={(event) => update('levels', form.levels.map((value, itemIndex) => itemIndex === index ? { ...value, y: event.target.value } : value))} />
            </Field>
            <Field label={`Elevation (${form.measurementUnit})`} required>
              <input inputMode="decimal" value={item.elevation} onChange={(event) => update('levels', form.levels.map((value, itemIndex) => itemIndex === index ? { ...value, elevation: event.target.value } : value))} />
            </Field>
            <Field label="Datum" required>
              <select value={item.datum} onChange={(event) => update('levels', form.levels.map((value, itemIndex) => itemIndex === index ? { ...value, datum: event.target.value as LevelInput['datum'] } : value))}>
                <option value="MSL">Mean sea level</option>
                <option value="local-benchmark">Local benchmark</option>
                <option value="assumed">Assumed datum</option>
              </select>
            </Field>
            <Field label="Benchmark description">
              <input value={item.benchmarkDescription} onChange={(event) => update('levels', form.levels.map((value, itemIndex) => itemIndex === index ? { ...value, benchmarkDescription: event.target.value } : value))} />
            </Field>
          </div>
        </article>
      ))}
    </>
  )
}

function ProposalStep({
  form,
  update,
}: {
  form: FeatureOneFormState
  update: <K extends keyof FeatureOneFormState>(key: K, value: FeatureOneFormState[K]) => void
}) {
  const addFootprint = () => update('footprints', [...form.footprints, {
    id: `building-${form.footprints.length + 1}`,
    label: '',
    coordinates: '',
    holes: '',
    storeys: '',
    origin: 'user-drawn',
  }])
  const addProjection = () => update('projections', [...form.projections, {
    id: `projection-${form.projections.length + 1}`,
    label: '',
    coordinates: '',
    holes: '',
    kind: 'canopy',
    attachedToFootprintId: form.footprints[0]?.id ?? '',
    projectionDepth: '',
    clearHeight: '',
  }])
  return (
    <>
      <SectionTitle
        eyebrow="Step 5 · Proposed geometry"
        title="Supply what is proposed—never ask the map to invent it"
        description="Footprints and projections are exact closed polygons. UrbanOS tests them against the setback-and-exclusion envelope; it does not tile a rectangle or move a building until it fits."
      />
      <div className="constraint-actions">
        <button type="button" className="button secondary" onClick={addFootprint}>+ Building footprint</button>
        <button type="button" className="button secondary" onClick={addProjection}>+ Projection</button>
      </div>
      {form.footprints.length === 0 && form.projections.length === 0 && (
        <EmptyState>
          {form.drawingPurpose === 'survey-base'
            ? 'A survey base may contain no proposal.'
            : 'Add at least one supplied footprint for a proposal site plan.'}
        </EmptyState>
      )}
      {form.footprints.map((item, index) => (
        <PolygonCard
          key={`footprint-${index}`}
          title="Building footprint"
          item={item}
          onChange={(patch) => update('footprints', form.footprints.map((value, itemIndex) => itemIndex === index ? { ...value, ...patch } : value))}
          onRemove={() => update('footprints', form.footprints.filter((_, itemIndex) => itemIndex !== index))}
          extra={(
            <>
              <Field label="Origin" required>
                <select value={item.origin} onChange={(event) => update('footprints', form.footprints.map((value, itemIndex) => itemIndex === index ? { ...value, origin: event.target.value as FootprintInput['origin'] } : value))}>
                  <option value="user-drawn">User / architect supplied</option>
                  <option value="surveyed-existing">Surveyed existing structure</option>
                </select>
              </Field>
              <Field label="Storeys above ground">
                <input inputMode="numeric" value={item.storeys} onChange={(event) => update('footprints', form.footprints.map((value, itemIndex) => itemIndex === index ? { ...value, storeys: event.target.value } : value))} />
              </Field>
            </>
          )}
        />
      ))}
      {form.projections.map((item, index) => (
        <PolygonCard
          key={`projection-${index}`}
          title="Projection"
          item={item}
          onChange={(patch) => update('projections', form.projections.map((value, itemIndex) => itemIndex === index ? { ...value, ...patch } : value))}
          onRemove={() => update('projections', form.projections.filter((_, itemIndex) => itemIndex !== index))}
          extra={(
            <>
              <Field label="Kind" required>
                <select value={item.kind} onChange={(event) => update('projections', form.projections.map((value, itemIndex) => itemIndex === index ? { ...value, kind: event.target.value as ProjectionInput['kind'] } : value))}>
                  <option value="balcony">Balcony</option>
                  <option value="chajja">Chajja</option>
                  <option value="canopy">Canopy</option>
                  <option value="porch">Porch</option>
                  <option value="ramp">Ramp</option>
                  <option value="basement">Basement</option>
                  <option value="staircase">Staircase</option>
                  <option value="other">Other</option>
                </select>
              </Field>
              <Field label="Attached footprint ID">
                <input value={item.attachedToFootprintId} onChange={(event) => update('projections', form.projections.map((value, itemIndex) => itemIndex === index ? { ...value, attachedToFootprintId: event.target.value } : value))} />
              </Field>
              <Field label={`Projection depth (${form.measurementUnit})`}>
                <input inputMode="decimal" value={item.projectionDepth} onChange={(event) => update('projections', form.projections.map((value, itemIndex) => itemIndex === index ? { ...value, projectionDepth: event.target.value } : value))} />
              </Field>
              <Field label={`Clear height (${form.measurementUnit})`}>
                <input inputMode="decimal" value={item.clearHeight} onChange={(event) => update('projections', form.projections.map((value, itemIndex) => itemIndex === index ? { ...value, clearHeight: event.target.value } : value))} />
              </Field>
            </>
          )}
        />
      ))}
    </>
  )
}

function VerifyStep({
  form,
  update,
  formErrors,
  result,
  preview,
  exportError,
  onExport,
  onAcknowledge,
}: {
  form: FeatureOneFormState
  update: <K extends keyof FeatureOneFormState>(key: K, value: FeatureOneFormState[K]) => void
  formErrors: readonly string[]
  result: ValidationResult | null
  preview: DrawingModel | null
  exportError: string | null
  onExport: (kind: 'dxf' | 'pdf' | 'manifest') => void
  onAcknowledge: (code: WarningCode, checked: boolean) => void
}) {
  const blockers = result !== null && !result.ok ? result.blockers : []
  const warnings = result?.warnings ?? []
  const ready = result?.ok === true && form.requestProfessionalReview
  return (
    <>
      <SectionTitle
        eyebrow="Step 6 · Fail-closed gate"
        title="Review what is missing before any drawing unlocks"
        description="A red item is not auto-filled. A green export means the geometry, provenance, dimensions, scale and artifact parity gates passed—not that a professional has approved construction."
      />
      <div className="form-grid">
        <Field label="Display precision (metres)" required>
          <input inputMode="decimal" value={form.displayPrecisionM} onChange={(event) => update('displayPrecisionM', event.target.value)} />
        </Field>
        <Field label="Display unit" required>
          <select value={form.displayUnit} onChange={(event) => update('displayUnit', event.target.value as FeatureOneFormState['displayUnit'])}>
            <option value="m">Metres</option>
            <option value="ft">Feet</option>
          </select>
        </Field>
        <Field label="Sheet" required>
          <select value={form.sheet} onChange={(event) => update('sheet', event.target.value as SheetName)}>
            {Object.keys(SHEETS).map((sheet) => <option key={sheet} value={sheet}>{sheet}</option>)}
          </select>
        </Field>
        <Field label="Orientation" required>
          <select value={form.sheetOrientation} onChange={(event) => update('sheetOrientation', event.target.value as FeatureOneFormState['sheetOrientation'])}>
            <option value="landscape">Landscape</option>
            <option value="portrait">Portrait</option>
          </select>
        </Field>
        <Field label="Declared scale denominator" required hint="100 means 1:100. Export fails if the selected sheet cannot hold it.">
          <input inputMode="numeric" value={form.scaleDenominator} onChange={(event) => update('scaleDenominator', event.target.value)} />
        </Field>
      </div>

      <label className={`review-request ${form.requestProfessionalReview ? 'checked' : ''}`}>
        <input
          type="checkbox"
          checked={form.requestProfessionalReview}
          onChange={(event) => update('requestProfessionalReview', event.target.checked)}
        />
        <span>
          <strong>Request “Ready for Professional Review”</strong>
          <small>This is not permission to construct. It only activates the strict evidence and export gate.</small>
        </span>
      </label>

      {formErrors.length > 0 && (
        <section className="finding-panel blocker">
          <h3>Form inputs still required</h3>
          <ol>
            {formErrors.map((error, index) => <li key={`${error}-${index}`}><span>{error}</span></li>)}
          </ol>
        </section>
      )}
      <FindingList title="Kernel blockers" findings={blockers} kind="blocker" />
      <FindingList title="Review warnings" findings={warnings} kind="warning" />

      {warnings.length > 0 && (
        <div className="warning-acknowledgements">
          <h3>Acknowledge only after review</h3>
          {warnings.map((warning) => (
            <label key={warning.code}>
              <input
                type="checkbox"
                checked={form.acknowledgedWarnings.includes(warning.code as WarningCode)}
                onChange={(event) => onAcknowledge(warning.code as WarningCode, event.target.checked)}
              />
              <span><code>{warning.code}</code> I reviewed this warning and accept it for professional review.</span>
            </label>
          ))}
        </div>
      )}

      {ready && preview && (
        <div className="ready-banner">
          <span aria-hidden>✓</span>
          <div>
            <strong>Validated exporter input is ready</strong>
            <p>DXF and PDF will be generated from one canonical drawing model and stamped “Not for Construction”.</p>
          </div>
        </div>
      )}
      {preview && <DrawingPreview model={preview} />}

      {exportError && <div className="export-error">{exportError}</div>}
      <div className="export-actions">
        <button type="button" className="button primary" disabled={!ready} onClick={() => onExport('dxf')}>
          Download DXF
        </button>
        <button type="button" className="button primary" disabled={!ready} onClick={() => onExport('pdf')}>
          Download PDF
        </button>
        <button type="button" className="button secondary" disabled={!ready} onClick={() => onExport('manifest')}>
          Download parity manifest
        </button>
        <button type="button" className="button disabled-action" disabled title="Requires an approved local/server conversion route and round-trip verification.">
          DWG — conversion approval required
        </button>
      </div>
      <p className="export-footnote">
        Haryana OBPAS currently expects an architect-prepared CAD package with mandatory layers, floor plans,
        sections and elevations. Feature 1 produces the validated site-plan geometry; it does not mislabel this
        partial package as an authority submission. <a href={OFFICIAL_SOURCES.haryanaPortal} target="_blank" rel="noreferrer">Official portal ↗</a>
      </p>
    </>
  )
}

function App() {
  const [form, setForm] = useState<FeatureOneFormState>(() => cloneForm(EMPTY_FORM))
  const [step, setStep] = useState<StepId>('identity')
  const [exportError, setExportError] = useState<string | null>(null)

  const update = <K extends keyof FeatureOneFormState>(
    key: K,
    value: FeatureOneFormState[K],
  ): void => {
    setForm((current) => ({ ...current, [key]: value }))
    setExportError(null)
  }

  const built = useMemo(() => buildDraft(form), [form])
  const result = useMemo<ValidationResult | null>(() => {
    if (built.draft === null) return null
    return validateSitePlan(built.draft, DEFAULT_KERNEL_PARAMETERS)
  }, [built.draft])
  const allFindings = useMemo<readonly Finding[]>(() => {
    if (result === null) return []
    return result.ok ? result.warnings : [...result.blockers, ...result.warnings]
  }, [result])
  const readiness = useMemo(
    () => sectionReadiness(form, built.errors, allFindings),
    [form, built.errors, allFindings],
  )
  const completed = readiness.filter((item) => item.complete).length
  const inputScore = (completed / readiness.length) * 10
  const preview = useMemo<DrawingModel | null>(() => {
    if (!result?.ok) return null
    try {
      return buildDrawingModel(result.plan)
    } catch {
      return null
    }
  }, [result])
  const reconstructionCandidates = result !== null && !result.ok
    ? result.resolved?.candidateAssemblies ?? []
    : []

  const currentStepIndex = STEPS.findIndex(([id]) => id === step)

  const setBoundaryPoint = (index: number, patch: Partial<SurveyPointInput>) => {
    setForm((current) => ({
      ...current,
      boundaryPoints: current.boundaryPoints.map((point, pointIndex) =>
        pointIndex === index ? { ...point, ...patch } : point),
    }))
  }
  const addBoundaryPoint = () => {
    setForm((current) => {
      const boundaryPoints = [...current.boundaryPoints, {
        id: `P${current.boundaryPoints.length + 1}`,
        x: '',
        y: '',
        monumentId: '',
        preserve: false,
      }]
      return {
        ...current,
        boundaryPoints,
        edgeFacts: normaliseEdgeFacts(current.edgeFacts, boundaryPoints.length),
      }
    })
  }
  const removeBoundaryPoint = (index: number) => {
    setForm((current) => {
      if (current.boundaryPoints.length <= 3) return current
      const boundaryPoints = current.boundaryPoints.filter((_, pointIndex) => pointIndex !== index)
      return {
        ...current,
        boundaryPoints,
        edgeFacts: normaliseEdgeFacts(
          current.edgeFacts.filter((_, edgeIndex) => edgeIndex !== index),
          boundaryPoints.length,
        ),
      }
    })
  }
  const setEdge = (index: number, patch: Partial<EdgeFactInput>) => {
    setForm((current) => ({
      ...current,
      edgeFacts: normaliseEdgeFacts(current.edgeFacts, boundaryEdgeCount(current))
        .map((edge, edgeIndex) => edgeIndex === index ? { ...edge, ...patch } : edge),
    }))
  }
  const handleEvidenceFile = async (file: File | null): Promise<void> => {
    if (file === null) {
      update('evidenceFile', null)
      return
    }
    const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer())
    update('evidenceFile', {
      filename: file.name,
      bytes: file.size,
      mime: file.type || 'application/octet-stream',
      sha256: hex(digest),
      storageRef: `local-browser://${encodeURIComponent(file.name)}#sha256=${hex(digest)}`,
    })
  }
  const acknowledge = (code: WarningCode, checked: boolean) => {
    update(
      'acknowledgedWarnings',
      checked
        ? [...new Set([...form.acknowledgedWarnings, code])]
        : form.acknowledgedWarnings.filter((item) => item !== code),
    )
  }
  const runExport = (kind: 'dxf' | 'pdf' | 'manifest'): void => {
    setExportError(null)
    if (!result?.ok || !form.requestProfessionalReview) {
      setExportError('Export remains locked until the strict review gate passes.')
      return
    }
    try {
      const artifact = exportSitePlan(result.plan, {
        expectedKernelVersion: DEFAULT_KERNEL_PARAMETERS.kernelVersion,
        profile: sheetProfile(form),
      })
      const name = fileSlug(form.projectName)
      if (kind === 'dxf') download(`${name}.dxf`, artifact.dxf, 'image/vnd.dxf')
      if (kind === 'pdf') download(`${name}.pdf`, artifact.pdf, 'application/pdf')
      if (kind === 'manifest') {
        download(
          `${name}.parity.json`,
          `${JSON.stringify(artifact.manifest, null, 2)}\n`,
          'application/json',
        )
      }
    } catch (error) {
      if (error instanceof KernelError) {
        setExportError(`${error.code}: ${error.message}`)
      } else {
        setExportError(error instanceof Error ? error.message : String(error))
      }
    }
  }

  const go = (direction: -1 | 1) => {
    const next = Math.max(0, Math.min(STEPS.length - 1, currentStepIndex + direction))
    const nextStep = STEPS[next]
    if (nextStep !== undefined) setStep(nextStep[0])
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">U</div>
          <div>
            <strong>UrbanOS</strong>
            <span>Feature 1 · Survey → verified 2D site plan</span>
          </div>
        </div>
        <div className="topbar-actions">
          <span className="status-pill">Local only · no upload</span>
          <button type="button" className="button quiet" onClick={() => {
            setForm(cloneForm(DEMO_FORM))
            setStep('verify')
          }}>
            Load coordinate sample
          </button>
          <button type="button" className="button quiet" onClick={() => {
            setForm(cloneForm(RECONSTRUCTED_DEMO_FORM))
            setStep('verify')
          }}>
            Load deed-route sample
          </button>
          <button type="button" className="button quiet danger" onClick={() => {
            setForm(cloneForm(EMPTY_FORM))
            setStep('identity')
          }}>
            Clear
          </button>
        </div>
      </header>

      <div className="workspace">
        <aside className="sidebar">
          <div className="score-card">
            <div className="score-ring" style={{ '--progress': `${inputScore * 10}%` } as CSSProperties}>
              <div><strong>{inputScore.toFixed(1)}</strong><span>/10</span></div>
            </div>
            <div>
              <strong>Input completeness</strong>
              <span>{completed} of {readiness.length} truth groups complete</span>
            </div>
          </div>

          <nav className="step-nav" aria-label="Input form steps">
            {STEPS.map(([id, number, label]) => (
              <button
                type="button"
                key={id}
                className={step === id ? 'active' : ''}
                onClick={() => setStep(id)}
              >
                <span>{number}</span>
                {label}
              </button>
            ))}
          </nav>

          <div className="readiness-list">
            <h3>Truth gate</h3>
            {readiness.map((item) => (
              <div className={item.complete ? 'complete' : ''} key={item.label}>
                <i>{item.complete ? '✓' : '·'}</i>
                <span><strong>{item.label}</strong><small>{item.detail}</small></span>
              </div>
            ))}
          </div>

          <div className="honesty-note">
            <strong>Two honest statuses</strong>
            <span>Research Draft</span>
            <span>Ready for Professional Review</span>
            <small>Software never stamps “For Construction”.</small>
          </div>
        </aside>

        <main className="form-stage">
          <div className="form-card">
            {step === 'identity' && (
              <IdentityStep form={form} update={update} onFile={handleEvidenceFile} />
            )}
            {step === 'boundary' && (
              <BoundaryStep
                form={form}
                update={update}
                setPoint={setBoundaryPoint}
                addPoint={addBoundaryPoint}
                removePoint={removeBoundaryPoint}
                candidates={reconstructionCandidates}
              />
            )}
            {step === 'edges' && <EdgesStep form={form} setEdge={setEdge} />}
            {step === 'constraints' && <ConstraintsStep form={form} update={update} />}
            {step === 'proposal' && <ProposalStep form={form} update={update} />}
            {step === 'verify' && (
              <VerifyStep
                form={form}
                update={update}
                formErrors={built.errors}
                result={result}
                preview={preview}
                exportError={exportError}
                onExport={runExport}
                onAcknowledge={acknowledge}
              />
            )}

            <footer className="form-footer">
              <button
                type="button"
                className="button secondary"
                disabled={currentStepIndex <= 0}
                onClick={() => go(-1)}
              >
                ← Back
              </button>
              <span>Step {currentStepIndex + 1} of {STEPS.length}</span>
              <button
                type="button"
                className="button primary"
                disabled={currentStepIndex >= STEPS.length - 1}
                onClick={() => go(1)}
              >
                Continue →
              </button>
            </footer>
          </div>
        </main>
      </div>
    </div>
  )
}

const rootElement = document.getElementById('root')
if (rootElement === null) {
  throw new Error('UrbanOS Feature 1 requires a #root element.')
}
const rootWindow = window as Window & { __urbanosFeatureOneRoot?: Root }
const appRoot = rootWindow.__urbanosFeatureOneRoot ?? createRoot(rootElement)
rootWindow.__urbanosFeatureOneRoot = appRoot
appRoot.render(
  <StrictMode>
    <App />
  </StrictMode>,
)
