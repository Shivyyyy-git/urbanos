// ---------------------------------------------------------------------------
// Module 1 — Project Intake wizard + landing screen.
// Collects a ProjectBrief over 3 steps (Site → Goals → Review) and hands it
// to App via onSubmit. Pure UI: no engine imports, no data-module imports.
// ---------------------------------------------------------------------------
import { Fragment, useState } from 'react'
import type {
  DevelopmentType,
  GeoPoint,
  Jurisdiction,
  LandUseZone,
  Priority,
  ProjectBrief,
} from '../types'
import { DEV_TYPE_LABELS, LAND_USE_ZONE_LABELS, SQM_PER_ACRE, ZONE_PERMITS } from '../types'
import { areaBoth, article, formatCr, num } from '../lib/format'

type AreaUnit = 'acres' | 'sqm'

/** Wizard-local draft: brief fields as text where the user types numbers,
 * plus canonical plot area in sqm and wizard chrome (step, unit). */
interface Draft {
  step: number // 0 Site, 1 Goals, 2 Review
  unit: AreaUnit
  name: string
  jurisdiction: Jurisdiction
  developmentType: DevelopmentType
  landUseZone: LandUseZone
  /** Manually entered plot area, always square metres. Superseded by
   * width x depth whenever BOTH dimension fields parse (see `plotAreaSqm`). */
  plotAreaSqm: number
  /** Text in the area input, expressed in `unit`. */
  areaText: string
  /** Surveyed plot dimensions in metres. Both blank = derive from area. */
  widthText: string
  depthText: string
  roadWidthText: string
  farText: string
  /** GPS pin as typed — "28.5921, 77.0460" (Google Maps paste format). */
  locationText: string
  budgetText: string
  landOwned: boolean
  priority: Priority
  targetUnitsText: string
  notes: string
}

const STEPS = ['Site', 'Goals', 'Review'] as const

const JURISDICTIONS: { id: Jurisdiction; label: string; group: string }[] = [
  { id: 'dwarka-expressway', label: 'Dwarka Expressway (Sectors 99–113)', group: 'Haryana' },
  { id: 'gurugram', label: 'Gurugram (rest of district)', group: 'Haryana' },
  { id: 'dwarka', label: 'Dwarka Sub-City', group: 'NCT of Delhi' },
  { id: 'delhi', label: 'Delhi (rest of NCT)', group: 'NCT of Delhi' },
  { id: 'noida', label: 'Noida', group: 'Uttar Pradesh' },
  { id: 'bengaluru', label: 'Bengaluru', group: 'Karnataka' },
]

/** Approximate centroid per jurisdiction — used only to sanity-check a pasted
 * GPS pin and to seed "drop a pin". Not used for any geometry. */
const JURISDICTION_PINS: Record<Jurisdiction, GeoPoint> = {
  gurugram: { lat: 28.4595, lng: 77.0266 },
  'dwarka-expressway': { lat: 28.489, lng: 77.018 },
  dwarka: { lat: 28.5921, lng: 77.046 },
  delhi: { lat: 28.6139, lng: 77.209 },
  noida: { lat: 28.5355, lng: 77.391 },
  bengaluru: { lat: 12.9716, lng: 77.5946 },
}

const DEV_TYPE_DESCRIPTIONS: Record<DevelopmentType, string> = {
  house: 'Single plotted residence or villa on its own plot',
  'group-housing': 'Apartment towers with shared amenities and podium',
  'mixed-use': 'Homes plus retail / office in one integrated development',
  commercial: 'Offices, retail, or hospitality-led development',
  township: 'Large integrated community with roads, schools and parks',
}

const PRIORITIES: { id: Priority; title: string; desc: string }[] = [
  { id: 'roi', title: 'Maximise returns', desc: 'Push FAR utilisation and saleable area for best ROI' },
  { id: 'balanced', title: 'Balanced development', desc: 'Blend of returns, livability and open space' },
  { id: 'green', title: 'Sustainability first', desc: 'Maximise green cover, daylight and passive design' },
]

// Sensible defaults: mid-size Gurugram group housing (2 acres, 18 m sector
// road, ₹100 Cr) — a typical NCR infill parcel.
function defaultDraft(): Draft {
  return {
    step: 0,
    unit: 'acres',
    name: '',
    jurisdiction: 'dwarka-expressway',
    developmentType: 'group-housing',
    landUseZone: 'residential',
    plotAreaSqm: 2 * SQM_PER_ACRE,
    areaText: '2',
    widthText: '',
    depthText: '',
    roadWidthText: '18',
    farText: '',
    locationText: '',
    budgetText: '100',
    landOwned: true,
    priority: 'balanced',
    targetUnitsText: '',
    notes: '',
  }
}

// Sample brief: 20-acre mixed-use on Dwarka Expressway (24 m sector road is
// common along the corridor; ₹300 Cr is demo-grade for land-owned JV).
// Pin sits in Sector 102, on the corridor.
function sampleDwarka(): Draft {
  return {
    ...defaultDraft(),
    step: 2,
    unit: 'acres',
    name: 'Dwarka Expressway Mixed-Use District',
    jurisdiction: 'dwarka-expressway',
    developmentType: 'mixed-use',
    landUseZone: 'mixed-use',
    plotAreaSqm: 20 * SQM_PER_ACRE,
    areaText: '20',
    roadWidthText: '24',
    locationText: '28.4912, 77.0225',
    budgetText: '300',
    priority: 'roi',
  }
}

// Sample brief: 1.2-acre CGHS group-housing plot in Dwarka Sector 19B, on a
// 24 m sector road. Surveyed dimensions given, so the layout draws the real
// parcel rather than a derived rectangle.
function sampleDwarkaSubCity(): Draft {
  return {
    ...defaultDraft(),
    step: 2,
    unit: 'sqm',
    name: 'Sector 19B Group Housing',
    jurisdiction: 'dwarka',
    developmentType: 'group-housing',
    landUseZone: 'residential',
    plotAreaSqm: 4860,
    areaText: '4,860',
    widthText: '81',
    depthText: '60',
    roadWidthText: '24',
    locationText: '28.5674, 77.0512',
    budgetText: '85',
    priority: 'balanced',
  }
}

// Sample brief: ~4,000 sq ft (335 sqm) Koramangala plot, 12 m road, ₹3.5 Cr —
// plausible 2026 build budget for a premium Bengaluru independent house.
function sampleBengaluru(): Draft {
  return {
    ...defaultDraft(),
    step: 2,
    unit: 'sqm',
    name: 'Koramangala Residence',
    jurisdiction: 'bengaluru',
    developmentType: 'house',
    landUseZone: 'residential',
    plotAreaSqm: 335,
    areaText: '335',
    roadWidthText: '12',
    budgetText: '3.5',
    priority: 'balanced',
  }
}

/** Lenient positive-number parse for text inputs; 0 means "empty/invalid".
 * Strips grouping commas first — "8,000" must parse as 8000, not 8. */
function toNum(s: string): number {
  const n = Number.parseFloat(s.replace(/,/g, ''))
  return Number.isFinite(n) && n > 0 ? n : 0
}

/** Number → short display string without trailing zeros (for unit toggle). */
function trimNum(n: number, digits: number): string {
  return String(Number(n.toFixed(digits)))
}

/** Parse a GPS pin from "28.5921, 77.0460" or "28.5921 77.0460" — the two
 * shapes Google Maps puts on the clipboard. Null for anything unparseable or
 * out of range, so the caller can tell "empty" from "typed but wrong". */
function parseLatLng(s: string): GeoPoint | null {
  const m = s.trim().match(/^(-?\d{1,3}(?:\.\d+)?)\s*[,\s]\s*(-?\d{1,3}(?:\.\d+)?)$/)
  if (!m) return null
  const lat = Number(m[1])
  const lng = Number(m[2])
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null
  return { lat, lng }
}

/** Great-circle distance in km. Used only to warn when a pasted pin sits far
 * from the selected jurisdiction — a common copy-paste slip. */
function distanceKm(a: GeoPoint, b: GeoPoint): number {
  const R = 6371
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}

function fmtPin(p: GeoPoint): string {
  return `${p.lat.toFixed(5)}° N, ${p.lng.toFixed(5)}° E`
}

export function IntakeWizard({ onSubmit }: { onSubmit: (brief: ProjectBrief) => void }) {
  const [draft, setDraft] = useState<Draft>(defaultDraft)

  const [geoBusy, setGeoBusy] = useState(false)
  const [geoError, setGeoError] = useState('')

  const roadWidth = toNum(draft.roadWidthText)
  const budget = toNum(draft.budgetText)

  // Surveyed dimensions, when BOTH are present, define the plot outright —
  // plot area becomes a computed read-out rather than an input.
  const dimW = toNum(draft.widthText)
  const dimD = toNum(draft.depthText)
  const dimsGiven = dimW > 0 && dimD > 0
  // One dimension alone is still usable: the other follows from the plot area.
  const dimsPartial = !dimsGiven && (dimW > 0 || dimD > 0)
  const plotAreaSqm = dimsGiven ? dimW * dimD : draft.plotAreaSqm
  const areaOk = plotAreaSqm > 0

  const farOverride = toNum(draft.farText)
  const location = parseLatLng(draft.locationText)
  const locationBad = draft.locationText.trim().length > 0 && location === null
  // A pin >60 km from the jurisdiction centroid is almost always a paste slip.
  const pinDriftKm = location ? distanceKm(location, JURISDICTION_PINS[draft.jurisdiction]) : 0
  const pinFarOff = location !== null && pinDriftKm > 60

  const usePermitted = ZONE_PERMITS[draft.landUseZone].includes(draft.developmentType)

  const siteValid = draft.name.trim().length > 0 && areaOk && roadWidth > 0 && !locationBad
  const goalsValid = budget > 0
  const allValid = siteValid && goalsValid
  const stepValid = draft.step === 0 ? siteValid : draft.step === 1 ? goalsValid : allValid

  function patch(p: Partial<Draft>) {
    setDraft((d) => ({ ...d, ...p }))
  }

  function setAreaText(text: string) {
    setDraft((d) => ({
      ...d,
      areaText: text,
      plotAreaSqm: d.unit === 'acres' ? toNum(text) * SQM_PER_ACRE : toNum(text),
    }))
  }

  function setUnit(unit: AreaUnit) {
    setDraft((d) => {
      if (d.unit === unit) return d
      const areaText = !(d.plotAreaSqm > 0)
        ? ''
        : unit === 'acres'
          ? trimNum(d.plotAreaSqm / SQM_PER_ACRE, 3)
          : String(Math.round(d.plotAreaSqm))
      return { ...d, unit, areaText }
    })
  }

  /** Ask the browser for the device's position and drop it in the pin field.
   * Best-effort: desktop accuracy is poor, so this is a convenience, not a
   * survey instrument. */
  function dropPinHere() {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGeoError('This browser does not expose a location API — paste the pin instead.')
      return
    }
    setGeoBusy(true)
    setGeoError('')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoBusy(false)
        patch({
          locationText: `${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`,
        })
      },
      (err) => {
        setGeoBusy(false)
        setGeoError(
          err.code === err.PERMISSION_DENIED
            ? 'Location permission denied — paste the pin from Google Maps instead.'
            : 'Could not read a location — paste the pin from Google Maps instead.',
        )
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  function submit() {
    if (!allValid) return
    const targetUnits = Math.round(toNum(draft.targetUnitsText))
    const notes = draft.notes.trim()
    const brief: ProjectBrief = {
      name: draft.name.trim(),
      developmentType: draft.developmentType,
      jurisdiction: draft.jurisdiction,
      landUseZone: draft.landUseZone,
      plotAreaSqm,
      roadWidthM: roadWidth,
      budgetCr: budget,
      landOwned: draft.landOwned,
      priority: draft.priority,
    }
    // Dimensions and frontage are mutually exclusive: a surveyed W x D already
    // states the frontage, so sending both would let them contradict.
    if (dimsGiven) {
      brief.plotWidthM = dimW
      brief.plotDepthM = dimD
    } else if (dimW > 0) {
      brief.plotFrontageM = dimW
    } else if (dimD > 0) {
      // Depth alone still pins the envelope — the width follows from the area.
      brief.plotFrontageM = plotAreaSqm / dimD
    }
    if (farOverride > 0) brief.farOverride = farOverride
    if (location) brief.location = location
    if (targetUnits > 0) brief.targetUnits = targetUnits
    if (notes) brief.notes = notes
    onSubmit(brief)
  }

  const jurisdictionLabel = JURISDICTIONS.find((j) => j.id === draft.jurisdiction)?.label ?? draft.jurisdiction
  const priorityTitle = PRIORITIES.find((p) => p.id === draft.priority)?.title ?? draft.priority

  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      {/* ------------------------------- Hero -------------------------------- */}
      <div style={{ textAlign: 'center', margin: '26px 0 22px' }}>
        <h1 style={{ fontSize: 30, lineHeight: 1.2, letterSpacing: '-0.02em' }}>
          From project brief to buildable plan in minutes
        </h1>
        <p className="muted" style={{ marginTop: 10, fontSize: 15 }}>
          Concept masterplans · rule screening · feasibility · construction roadmap — generated by UrbanOS
        </p>
      </div>

      {/* --------------------------- Sample briefs ---------------------------- */}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 8 }}>
        <button type="button" className="btn" onClick={() => setDraft(sampleDwarka())}>
          Try: 20-acre mixed-use, Dwarka Expressway (₹300 Cr)
        </button>
        <button type="button" className="btn" onClick={() => setDraft(sampleDwarkaSubCity())}>
          Try: CGHS group housing, Dwarka Sector 19B
        </button>
        <button type="button" className="btn" onClick={() => setDraft(sampleBengaluru())}>
          Try: Family home in Bengaluru
        </button>
      </div>
      <p className="muted small" style={{ textAlign: 'center', marginBottom: 22 }}>
        or describe your own project below
      </p>

      <div className="card card-pad">
        {/* ---------------------------- Step indicator ------------------------ */}
        <div aria-label="Intake steps" style={{ display: 'flex', alignItems: 'center', marginBottom: 22 }}>
          {STEPS.map((label, i) => {
            const done = i < draft.step
            const active = i === draft.step
            const dot = (
              <span
                aria-hidden
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: 12,
                  fontWeight: 700,
                  flexShrink: 0,
                  background: done || active ? 'var(--accent)' : 'transparent',
                  color: done || active ? '#fff' : 'var(--muted)',
                  border: `1.5px solid ${done || active ? 'var(--accent)' : 'var(--baseline)'}`,
                }}
              >
                {done ? '✓' : i + 1}
              </span>
            )
            return (
              <Fragment key={label}>
                {i > 0 && (
                  <span
                    aria-hidden
                    style={{ flex: 1, height: 1.5, margin: '0 10px', background: done || active ? 'var(--accent)' : 'var(--hairline)' }}
                  />
                )}
                <button
                  type="button"
                  onClick={() => done && patch({ step: i })}
                  aria-current={active ? 'step' : undefined}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    font: 'inherit',
                    fontSize: 13,
                    fontWeight: 650,
                    color: active ? 'var(--ink)' : done ? 'var(--accent-deep)' : 'var(--muted)',
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: done ? 'pointer' : 'default',
                  }}
                >
                  {dot}
                  {label}
                </button>
              </Fragment>
            )
          })}
        </div>

        {/* ----------------------------- Step 1: Site ------------------------- */}
        {draft.step === 0 && (
          <>
            <div className="section-title">Step 1 · Site</div>

            <div className="field">
              <label htmlFor="iw-name">Project name</label>
              <input
                id="iw-name"
                className="input"
                value={draft.name}
                onChange={(e) => patch({ name: e.target.value })}
                placeholder="e.g. Sector 89 Group Housing"
                autoFocus
              />
            </div>

            <div className="field">
              <label htmlFor="iw-jurisdiction">Jurisdiction</label>
              <select
                id="iw-jurisdiction"
                className="select"
                value={draft.jurisdiction}
                onChange={(e) => patch({ jurisdiction: e.target.value as Jurisdiction })}
              >
                {Array.from(new Set(JURISDICTIONS.map((j) => j.group))).map((g) => (
                  <optgroup key={g} label={g}>
                    {JURISDICTIONS.filter((j) => j.group === g).map((j) => (
                      <option key={j.id} value={j.id}>
                        {j.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <span className="hint">
                Dwarka Sub-City (DDA, Delhi) and Dwarka Expressway (DTCP, Haryana) are separate
                regimes — pick the one your plot actually sits in.
              </span>
            </div>

            <div className="field">
              <label htmlFor="iw-zone">Master-plan land use</label>
              <select
                id="iw-zone"
                className="select"
                value={draft.landUseZone}
                onChange={(e) => patch({ landUseZone: e.target.value as LandUseZone })}
              >
                {(Object.keys(LAND_USE_ZONE_LABELS) as LandUseZone[]).map((z) => (
                  <option key={z} value={z}>
                    {LAND_USE_ZONE_LABELS[z]}
                  </option>
                ))}
              </select>
              <span className="hint">
                The zoning on the statutory plan, not what you intend to build — UrbanOS compares
                the two.
              </span>
            </div>

            <div className="field">
              <label>Development type</label>
              <div className="radio-cards">
                {(Object.keys(DEV_TYPE_LABELS) as DevelopmentType[]).map((t) => (
                  <button
                    type="button"
                    key={t}
                    className={`radio-card ${draft.developmentType === t ? 'selected' : ''}`}
                    aria-pressed={draft.developmentType === t}
                    onClick={() => patch({ developmentType: t })}
                  >
                    <div className="rc-title">{DEV_TYPE_LABELS[t]}</div>
                    <div className="rc-desc">{DEV_TYPE_DESCRIPTIONS[t]}</div>
                  </button>
                ))}
              </div>
              {/* Advisory, not blocking — the compliance report is where a
                  land-use conflict belongs, with the CLU route spelled out. */}
              {usePermitted ? (
                <span className="hint">
                  Permitted outright in {article(LAND_USE_ZONE_LABELS[draft.landUseZone])}{' '}
                  {LAND_USE_ZONE_LABELS[draft.landUseZone]} zone.
                </span>
              ) : (
                <span className="hint-warn">
                  Not permitted outright in {article(LAND_USE_ZONE_LABELS[draft.landUseZone])}{' '}
                  {LAND_USE_ZONE_LABELS[draft.landUseZone]} zone — you can continue, and compliance
                  will flag the change-of-land-use requirement.
                </span>
              )}
            </div>

            <div className="field">
              <label htmlFor="iw-area">Plot area</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  id="iw-area"
                  className="input"
                  inputMode="decimal"
                  value={
                    dimsGiven
                      ? draft.unit === 'acres'
                        ? trimNum(plotAreaSqm / SQM_PER_ACRE, 3)
                        : String(Math.round(plotAreaSqm))
                      : draft.areaText
                  }
                  onChange={(e) => setAreaText(e.target.value)}
                  disabled={dimsGiven}
                  placeholder={draft.unit === 'acres' ? 'e.g. 2' : 'e.g. 8,000'}
                  style={{ flex: 1 }}
                />
                <div
                  role="group"
                  aria-label="Area unit"
                  style={{ display: 'inline-flex', border: '1px solid var(--hairline)', borderRadius: 8, overflow: 'hidden', flexShrink: 0 }}
                >
                  {(['acres', 'sqm'] as AreaUnit[]).map((u) => (
                    <button
                      type="button"
                      key={u}
                      onClick={() => setUnit(u)}
                      aria-pressed={draft.unit === u}
                      style={{
                        font: 'inherit',
                        fontSize: 13,
                        fontWeight: 600,
                        padding: '0 14px',
                        border: 'none',
                        cursor: 'pointer',
                        background: draft.unit === u ? 'var(--accent)' : '#fff',
                        color: draft.unit === u ? '#fff' : 'var(--ink-2)',
                      }}
                    >
                      {u === 'acres' ? 'acres' : 'sq m'}
                    </button>
                  ))}
                </div>
              </div>
              <span className={dimsGiven ? 'hint' : areaOk ? 'hint' : 'hint-bad'}>
                {dimsGiven
                  ? `= ${areaBoth(plotAreaSqm)} — computed from ${num(dimW)} × ${num(dimD)} m`
                  : areaOk
                    ? `= ${areaBoth(plotAreaSqm)}`
                    : 'Enter the plot area to continue'}
              </span>
            </div>

            <div className="input-row">
              <div className="field">
                <label htmlFor="iw-width">Plot width / frontage (m) — optional</label>
                <input
                  id="iw-width"
                  className="input"
                  inputMode="decimal"
                  value={draft.widthText}
                  onChange={(e) => patch({ widthText: e.target.value })}
                  placeholder="e.g. 81"
                />
              </div>
              <div className="field">
                <label htmlFor="iw-depth">Plot depth (m) — optional</label>
                <input
                  id="iw-depth"
                  className="input"
                  inputMode="decimal"
                  value={draft.depthText}
                  onChange={(e) => patch({ depthText: e.target.value })}
                  placeholder="e.g. 60"
                />
              </div>
            </div>
            <div className="field" style={{ marginTop: -8 }}>
              {dimsGiven ? (
                <span className="hint">
                  Surveyed dimensions — the drawing uses this exact envelope and plot area is
                  computed from it.
                </span>
              ) : dimsPartial ? (
                <span className="hint">
                  {dimW > 0
                    ? `Width fixed at ${num(dimW)} m — depth follows from the plot area.`
                    : `Depth fixed at ${num(dimD)} m — width follows from the plot area.`}
                </span>
              ) : (
                <span className="hint">
                  Leave both blank and UrbanOS derives a rectangular envelope from the plot area.
                </span>
              )}
            </div>

            <div className="input-row">
              <div className="field">
                <label htmlFor="iw-road">Abutting road width (m)</label>
                <input
                  id="iw-road"
                  className="input"
                  inputMode="decimal"
                  value={draft.roadWidthText}
                  onChange={(e) => patch({ roadWidthText: e.target.value })}
                  placeholder="e.g. 18"
                />
                <span className="hint">Widest road touching the plot — drives high-rise permission</span>
              </div>
              <div className="field">
                <label htmlFor="iw-far">Sanctioned FAR / FSI — optional</label>
                <input
                  id="iw-far"
                  className="input"
                  inputMode="decimal"
                  value={draft.farText}
                  onChange={(e) => patch({ farText: e.target.value })}
                  placeholder="Use bylaw table"
                />
                <span className="hint">
                  Only if your licence, zonal plan or purchased FAR sets a site-specific figure
                </span>
              </div>
            </div>

            <div className="field">
              <label htmlFor="iw-pin">GPS location pin — optional</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  id="iw-pin"
                  className="input"
                  value={draft.locationText}
                  onChange={(e) => {
                    setGeoError('')
                    patch({ locationText: e.target.value })
                  }}
                  placeholder="Paste from Google Maps — e.g. 28.5921, 77.0460"
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  className="btn"
                  onClick={dropPinHere}
                  disabled={geoBusy}
                  style={{ flexShrink: 0 }}
                >
                  {geoBusy ? 'Locating…' : 'Use my location'}
                </button>
              </div>
              {geoError ? (
                <span className="hint-warn">{geoError}</span>
              ) : locationBad ? (
                <span className="hint-bad">
                  Could not read that as a pin — use decimal degrees, e.g. 28.5921, 77.0460
                </span>
              ) : pinFarOff && location ? (
                <span className="hint-warn">
                  {fmtPin(location)} — about {num(pinDriftKm)} km from{' '}
                  {jurisdictionLabel}. Check the pin or the jurisdiction.
                </span>
              ) : location ? (
                <span className="hint">{fmtPin(location)} — recorded on the drawing title block</span>
              ) : (
                <span className="hint">Recorded on the brief, drawing and report. No basemap in V1.</span>
              )}
            </div>
          </>
        )}

        {/* ---------------------------- Step 2: Goals ------------------------- */}
        {draft.step === 1 && (
          <>
            <div className="section-title">Step 2 · Goals</div>

            <div className="field">
              <label htmlFor="iw-budget">Total budget (₹ crore)</label>
              <input
                id="iw-budget"
                className="input"
                inputMode="decimal"
                value={draft.budgetText}
                onChange={(e) => patch({ budgetText: e.target.value })}
                placeholder="e.g. 100"
                autoFocus
              />
              <span className="hint">{budget > 0 ? `= ${formatCr(budget)} all-in (land development, construction, approvals)` : 'Enter a budget to continue'}</span>
            </div>

            <div className="field">
              <label>Land ownership</label>
              <div className="radio-cards">
                <button
                  type="button"
                  className={`radio-card ${draft.landOwned ? 'selected' : ''}`}
                  aria-pressed={draft.landOwned}
                  onClick={() => patch({ landOwned: true })}
                >
                  <div className="rc-title">I own the land</div>
                  <div className="rc-desc">Acquisition cost excluded — ROI reads as development margin</div>
                </button>
                <button
                  type="button"
                  className={`radio-card ${!draft.landOwned ? 'selected' : ''}`}
                  aria-pressed={!draft.landOwned}
                  onClick={() => patch({ landOwned: false })}
                >
                  <div className="rc-title">Evaluating a purchase</div>
                  <div className="rc-desc">Adds a land-acquisition cost line at market benchmarks</div>
                </button>
              </div>
            </div>

            <div className="field">
              <label>Optimisation priority</label>
              <div className="radio-cards">
                {PRIORITIES.map((p) => (
                  <button
                    type="button"
                    key={p.id}
                    className={`radio-card ${draft.priority === p.id ? 'selected' : ''}`}
                    aria-pressed={draft.priority === p.id}
                    onClick={() => patch({ priority: p.id })}
                  >
                    <div className="rc-title">{p.title}</div>
                    <div className="rc-desc">{p.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="input-row">
              <div className="field">
                <label htmlFor="iw-units">Target units — optional</label>
                <input
                  id="iw-units"
                  className="input"
                  inputMode="numeric"
                  value={draft.targetUnitsText}
                  onChange={(e) => patch({ targetUnitsText: e.target.value })}
                  placeholder="Let UrbanOS optimise"
                />
                <span className="hint">Dwelling units (population proxy for townships)</span>
              </div>
            </div>

            <div className="field">
              <label htmlFor="iw-notes">Notes for the planner — optional</label>
              <textarea
                id="iw-notes"
                className="input"
                rows={3}
                value={draft.notes}
                onChange={(e) => patch({ notes: e.target.value })}
                placeholder="e.g. Premium positioning, keep a large central park, phase-wise launch…"
              />
            </div>
          </>
        )}

        {/* --------------------------- Step 3: Review ------------------------- */}
        {draft.step === 2 && (
          <>
            <div className="section-title">Step 3 · Review</div>
            <table className="table" style={{ marginBottom: 6 }}>
              <tbody>
                <tr>
                  <td className="muted" style={{ width: 190 }}>Project</td>
                  <td style={{ fontWeight: 650 }}>{draft.name.trim() || '—'}</td>
                </tr>
                <tr>
                  <td className="muted">Development type</td>
                  <td>{DEV_TYPE_LABELS[draft.developmentType]}</td>
                </tr>
                <tr>
                  <td className="muted">Jurisdiction</td>
                  <td>{jurisdictionLabel}</td>
                </tr>
                <tr>
                  <td className="muted">Master-plan land use</td>
                  <td>
                    {LAND_USE_ZONE_LABELS[draft.landUseZone]}
                    {!usePermitted && (
                      <span className="badge badge-warn" style={{ marginLeft: 8 }}>
                        CLU required
                      </span>
                    )}
                  </td>
                </tr>
                <tr>
                  <td className="muted">Plot area</td>
                  <td className="mono-num">{areaOk ? areaBoth(plotAreaSqm) : '—'}</td>
                </tr>
                <tr>
                  <td className="muted">Plot dimensions</td>
                  <td className="mono-num">
                    {dimsGiven
                      ? `${num(dimW)} × ${num(dimD)} m (surveyed)`
                      : dimW > 0
                        ? `${num(dimW)} m frontage · depth derived`
                        : dimD > 0
                          ? `${num(dimD)} m depth · width derived`
                          : 'Auto (derived from area)'}
                  </td>
                </tr>
                <tr>
                  <td className="muted">Abutting road width</td>
                  <td className="mono-num">{roadWidth > 0 ? `${roadWidth} m` : '—'}</td>
                </tr>
                <tr>
                  <td className="muted">Sanctioned FAR / FSI</td>
                  <td className="mono-num">
                    {farOverride > 0 ? farOverride.toFixed(2) : 'Bylaw table for this jurisdiction'}
                  </td>
                </tr>
                <tr>
                  <td className="muted">GPS pin</td>
                  <td className="mono-num">{location ? fmtPin(location) : 'Not set'}</td>
                </tr>
                <tr>
                  <td className="muted">Budget</td>
                  <td className="mono-num">{budget > 0 ? formatCr(budget) : '—'}</td>
                </tr>
                <tr>
                  <td className="muted">Land ownership</td>
                  <td>{draft.landOwned ? 'Already owned' : 'To be acquired'}</td>
                </tr>
                <tr>
                  <td className="muted">Priority</td>
                  <td>{priorityTitle}</td>
                </tr>
                <tr>
                  <td className="muted">Target units</td>
                  <td className="mono-num">{toNum(draft.targetUnitsText) > 0 ? num(toNum(draft.targetUnitsText)) : 'Let UrbanOS optimise'}</td>
                </tr>
                <tr>
                  <td className="muted">Notes</td>
                  <td>{draft.notes.trim() || '—'}</td>
                </tr>
              </tbody>
            </table>
            <p className="muted small" style={{ marginBottom: 4 }}>
              UrbanOS will generate concept masterplans, run demo rule screening, model feasibility, and draft a construction roadmap.
            </p>
          </>
        )}

        {/* ------------------------------ Footer nav --------------------------- */}
        <hr className="divider" />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <div>
            {draft.step > 0 && (
              <button type="button" className="btn" onClick={() => patch({ step: draft.step - 1 })}>
                Back
              </button>
            )}
          </div>
          {draft.step < 2 ? (
            <button
              type="button"
              className="btn btn-primary"
              disabled={!stepValid}
              onClick={() => patch({ step: draft.step + 1 })}
            >
              Next
            </button>
          ) : (
            <button type="button" className="btn btn-primary btn-lg" disabled={!allValid} onClick={submit}>
              Generate development plan
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
