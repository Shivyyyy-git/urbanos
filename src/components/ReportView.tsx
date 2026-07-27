// ---------------------------------------------------------------------------
// UrbanOS MVP — Module 5: exportable report (print-first).
// Pure presentation: receives all computed results via props, renders a
// consultant-style appraisal document. window.print() is the export path
// (styles.css @media print strips chrome and handles page breaks).
// ---------------------------------------------------------------------------
import { useEffect } from 'react'
import type {
  ComplianceResult,
  ComplianceStatus,
  ConstructionPlan,
  FeasibilityResult,
  Jurisdiction,
  Priority,
  ProjectBrief,
  Scenario,
} from '../types'
import { DEV_TYPE_LABELS, LAND_USE_LABELS, LAND_USE_ZONE_LABELS } from '../types'
import type { ComplianceEvidenceAssessment } from '../engines/complianceEvidence'
import { areaBoth, formatCr, months, num, pct, sqft, sqm } from '../lib/format'

// Display metadata kept local so this component depends on types.ts only
// (App.tsx wires data modules; the report must stay self-contained).
// Authority names are indicative, demo-grade (DTCP Haryana, DDA, UP Awas
// evam Vikas / Noida Authority, BBMP/BDA — as commonly cited in 2026).
const JURISDICTION_META: Record<Jurisdiction, { place: string; authority: string }> = {
  gurugram: { place: 'Gurugram, Haryana', authority: 'DTCP Haryana / GMDA' },
  'dwarka-expressway': {
    place: 'Dwarka Expressway (Sectors 99–113), Gurugram, Haryana',
    authority: 'DTCP Haryana / GMDA',
  },
  dwarka: { place: 'Dwarka Sub-City, Delhi (NCT)', authority: 'DDA' },
  delhi: { place: 'Delhi (NCT)', authority: 'DDA / MCD' },
  noida: { place: 'Noida, Uttar Pradesh', authority: 'Noida Authority' },
  bengaluru: { place: 'Bengaluru, Karnataka', authority: 'BBMP / BDA' },
}

const PRIORITY_LABELS: Record<Priority, string> = {
  roi: 'Maximise returns (ROI-led)',
  balanced: 'Balanced development',
  green: 'Sustainability-led',
}

const STATUS_WORD: Record<ComplianceStatus, string> = {
  pass: '✓ Pass',
  warn: '! Warning',
  fail: '✕ Fail',
}

const H2 = { fontSize: 17, margin: '30px 0 10px' }
const TABLE_WRAP = { margin: '8px 0 4px' }

/** Road width / frontage can be fractional (e.g. 13.5 m) — never round away. */
function metres(n: number): string {
  return n.toLocaleString('en-IN', { maximumFractionDigits: 1 })
}

function gpsPin(lat: number, lng: number): string {
  const ns = lat >= 0 ? 'N' : 'S'
  const ew = lng >= 0 ? 'E' : 'W'
  return `${Math.abs(lat).toFixed(5)}° ${ns}, ${Math.abs(lng).toFixed(5)}° ${ew}`
}

function BriefRow({ label, value }: { label: string; value: string }) {
  return (
    <tr>
      <td style={{ width: '38%' }} className="muted">{label}</td>
      <td>{value}</td>
    </tr>
  )
}

export function ReportView({ brief, scenario, compliance, evidence, feasibility, construction, onClose }: {
  brief: ProjectBrief; scenario: Scenario; compliance: ComplianceResult; evidence: ComplianceEvidenceAssessment; feasibility: FeasibilityResult; construction: ConstructionPlan; onClose: () => void }) {
  const juris = JURISDICTION_META[brief.jurisdiction]
  // Date.now/new Date are banned in engines; the report generation stamp is
  // explicitly allowed here (it is presentation metadata, not model output).
  const generatedOn = new Date().toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  // Escape closes the overlay (basic modal keyboard behaviour).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const failing = compliance.checks.filter((c) => c.status !== 'pass')
  // Mirror FeasibilityPanel's guard: never assert a payback for a loss-maker.
  const paybackKnown =
    feasibility.profitCr > 0 &&
    Number.isFinite(feasibility.paybackYears) &&
    feasibility.paybackYears > 0 &&
    feasibility.paybackYears < 60
  const paybackText = paybackKnown
    ? `${feasibility.paybackYears.toLocaleString('en-IN', { maximumFractionDigits: 1 })} years`
    : 'Not recovered at projected prices'

  return (
    <div className="report-overlay" role="dialog" aria-modal="true" aria-label="Project report">
      <div className="report-toolbar">
        <button className="btn btn-primary" onClick={() => window.print()}>Print / Save as PDF</button>
        <button className="btn" onClick={onClose}>Close</button>
      </div>

      <div className="report-sheet">
        {/* ------------------------------ Cover ------------------------------ */}
        <div style={{ borderBottom: '2px solid var(--ink)', paddingBottom: 18 }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--accent)' }}>
            UrbanOS · Development Intelligence
          </div>
          <h1 style={{ fontSize: 26, marginTop: 10 }}>{brief.name}</h1>
          <p className="muted" style={{ marginTop: 4, fontSize: 15 }}>
            Deterministic development appraisal — {scenario.name} concept
          </p>
          <p className="small muted" style={{ marginTop: 10 }}>
            Generated on {generatedOn} · {juris.place} · Sanctioning authority: {juris.authority}
          </p>
        </div>

        <div
          className="small"
          style={{
            border: '1px solid var(--status-warning)',
            borderLeftWidth: 4,
            borderRadius: 8,
            padding: '12px 16px',
            marginTop: 18,
          }}
        >
          <b>Regulatory evidence: {evidence.status}.</b>{' '}
          {evidence.decisionGradeAllowed
            ? 'All screened rules passed the structured evidence gate.'
            : `Decision-grade use is blocked: ${evidence.researchDraftClaims} of ${evidence.totalClaims} screened rules lack complete, current, verified and professionally signed evidence.`}
        </div>

        {/* ------------------------- 1 · Project brief ------------------------ */}
        <h2 style={H2}>1 · Project brief</h2>
        <div style={TABLE_WRAP}>
          <table className="table">
            <tbody>
              <BriefRow label="Project name" value={brief.name} />
              <BriefRow label="Development type" value={DEV_TYPE_LABELS[brief.developmentType]} />
              <BriefRow label="Jurisdiction" value={`${juris.place} (${juris.authority})`} />
              <BriefRow label="Master-plan land use" value={LAND_USE_ZONE_LABELS[brief.landUseZone]} />
              <BriefRow label="Plot area" value={areaBoth(brief.plotAreaSqm)} />
              {brief.plotWidthM !== undefined && brief.plotDepthM !== undefined && (
                <BriefRow
                  label="Surveyed plot dimensions"
                  value={`${metres(brief.plotWidthM)} m × ${metres(brief.plotDepthM)} m`}
                />
              )}
              <BriefRow label="Abutting road width" value={`${metres(brief.roadWidthM)} m`} />
              <BriefRow
                label="Plot frontage"
                value={
                  brief.plotWidthM !== undefined
                    ? `${metres(brief.plotWidthM)} m (surveyed width)`
                    : brief.plotFrontageM !== undefined
                      ? `${metres(brief.plotFrontageM)} m`
                      : 'Not specified — derived from plot proportions'
                }
              />
              <BriefRow
                label="Sanctioned FAR / FSI"
                value={
                  brief.farOverride !== undefined
                    ? brief.farOverride.toLocaleString('en-IN', { maximumFractionDigits: 2 })
                    : 'Jurisdiction rule table'
                }
              />
              {brief.location !== undefined && (
                <BriefRow label="GPS location pin" value={gpsPin(brief.location.lat, brief.location.lng)} />
              )}
              <BriefRow label="Sanctioned budget" value={formatCr(brief.budgetCr)} />
              <BriefRow label="Land ownership" value={brief.landOwned === false ? 'To be acquired' : 'Already owned'} />
              <BriefRow label="Optimisation priority" value={PRIORITY_LABELS[brief.priority]} />
              {brief.targetUnits !== undefined && (
                <BriefRow label="Target units" value={num(brief.targetUnits)} />
              )}
              {brief.notes !== undefined && brief.notes.trim() !== '' && (
                <BriefRow label="Client notes" value={brief.notes} />
              )}
            </tbody>
          </table>
        </div>

        {/* ------------- 2 · Recommended development concept ------------------ */}
        <h2 style={H2}>2 · Recommended development concept</h2>
        <p style={{ marginBottom: 12 }}>
          The <b>{scenario.name}</b> concept — {scenario.tagline}
        </p>

        <div style={TABLE_WRAP}>
          <table className="table">
            <thead>
              <tr><th>Development metric</th><th className="num">Value</th></tr>
            </thead>
            <tbody>
              <tr><td>Floor Area Ratio (FAR) utilised</td><td className="num">{scenario.far.toFixed(2)}</td></tr>
              <tr><td>Ground coverage</td><td className="num">{pct(scenario.groundCoveragePct)}</td></tr>
              <tr><td>Maximum floors</td><td className="num">{num(scenario.maxFloors)}</td></tr>
              <tr><td>Built-up area</td><td className="num">{sqm(scenario.builtUpAreaSqm)} ({sqft(scenario.builtUpAreaSqm)})</td></tr>
              <tr><td>Saleable area</td><td className="num">{sqm(scenario.saleableAreaSqm)} ({sqft(scenario.saleableAreaSqm)})</td></tr>
              <tr><td>Total units</td><td className="num">{num(scenario.totalUnits)}</td></tr>
              <tr><td>Green &amp; open space</td><td className="num">{pct(scenario.greenPct)}</td></tr>
            </tbody>
          </table>
        </div>

        <h3 style={{ fontSize: 14, margin: '18px 0 8px' }}>Land-use allocation</h3>
        <table className="table">
          <thead>
            <tr><th>Land use</th><th className="num">Share</th><th className="num">Area</th></tr>
          </thead>
          <tbody>
            {scenario.landUse.map((u) => (
              <tr key={u.use}>
                <td>{LAND_USE_LABELS[u.use]}</td>
                <td className="num">{pct(u.pct, 1)}</td>
                <td className="num">{sqm(u.areaSqm)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h3 style={{ fontSize: 14, margin: '18px 0 8px' }}>Unit mix</h3>
        {scenario.unitMix.length > 0 ? (
          <table className="table">
            <thead>
              <tr><th>Unit type</th><th className="num">Count</th><th className="num">Avg size</th></tr>
            </thead>
            <tbody>
              {scenario.unitMix.map((u) => (
                <tr key={u.type}>
                  <td>{u.type}</td>
                  <td className="num">{num(u.count)}</td>
                  <td className="num">{sqm(u.avgSizeSqm)} ({sqft(u.avgSizeSqm)})</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="small muted">No unit mix applicable for this concept.</p>
        )}

        <h3 style={{ fontSize: 14, margin: '18px 0 8px' }}>Concept highlights</h3>
        <ul style={{ margin: '0 0 4px', paddingLeft: 20 }}>
          {scenario.highlights.map((h) => (
            <li key={h} style={{ marginBottom: 4 }}>{h}</li>
          ))}
        </ul>

        {/* --------------------- 3 · Compliance screening ---------------------- */}
        <h2 className="report-page-break" style={H2}>3 · Compliance screening</h2>
        <p style={{ marginBottom: 12 }}>
          Demo rule-screening score: <b>{compliance.score}/100</b> — {compliance.summary.pass} model passes,{' '}
          {compliance.summary.warn} with warnings, {compliance.summary.fail} failed.
        </p>
        <p className="small muted" style={{ marginBottom: 12 }}>
          Evidence status: <b>{evidence.status}</b>. Working references below are research labels,
          not verified citations or approval findings.
        </p>

        <table className="table">
          <thead>
            <tr>
              <th>Rule &amp; working reference</th>
              <th>Required</th>
              <th>Proposed</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {compliance.checks.map((c) => (
              <tr key={c.id}>
                <td>
                  {c.rule}
                  <div className="small muted">{c.category} · Unverified: {c.reference}</div>
                </td>
                <td className="num">{c.required}</td>
                <td className="num">{c.proposed}</td>
                <td style={{ whiteSpace: 'nowrap' }}>{STATUS_WORD[c.status]}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h3 style={{ fontSize: 14, margin: '18px 0 8px' }}>Actions required</h3>
        {failing.length > 0 ? (
          <ul style={{ margin: '0 0 4px', paddingLeft: 20 }}>
            {failing.map((c) => (
              <li key={c.id} style={{ marginBottom: 4 }}>
                <b>{c.rule}:</b>{' '}
                {c.remediation !== undefined && c.remediation !== ''
                  ? c.remediation
                  : `Review against ${c.reference} and revise the proposal to meet ${c.required}.`}
              </li>
            ))}
          </ul>
        ) : (
          <p className="small muted">
            No modelled remediation actions. The evidence gate and professional review still apply.
          </p>
        )}

        {/* -------------------- 4 · Financial feasibility ---------------------- */}
        <h2 className="report-page-break" style={H2}>4 · Financial feasibility</h2>

        <h3 style={{ fontSize: 14, margin: '14px 0 8px' }}>Development cost</h3>
        <table className="table">
          <thead>
            <tr><th>Cost head</th><th className="num">Amount</th></tr>
          </thead>
          <tbody>
            {feasibility.costs.map((line) => (
              <tr key={line.label}>
                <td>{line.label}</td>
                <td className="num">{formatCr(line.amountCr)}</td>
              </tr>
            ))}
            <tr>
              <td><b>Total development cost</b></td>
              <td className="num"><b>{formatCr(feasibility.totalCostCr)}</b></td>
            </tr>
          </tbody>
        </table>

        <h3 style={{ fontSize: 14, margin: '18px 0 8px' }}>Revenue</h3>
        <table className="table">
          <thead>
            <tr><th>Revenue stream</th><th className="num">Amount</th></tr>
          </thead>
          <tbody>
            {feasibility.revenues.map((line) => (
              <tr key={line.label}>
                <td>{line.label}</td>
                <td className="num">{formatCr(line.amountCr)}</td>
              </tr>
            ))}
            <tr>
              <td><b>Total revenue</b></td>
              <td className="num"><b>{formatCr(feasibility.totalRevenueCr)}</b></td>
            </tr>
          </tbody>
        </table>

        <h3 style={{ fontSize: 14, margin: '18px 0 8px' }}>Key outcomes</h3>
        <table className="table">
          <tbody>
            <tr><td className="muted" style={{ width: '38%' }}>Gross development profit</td><td>{formatCr(feasibility.profitCr)}</td></tr>
            <tr><td className="muted">Project ROI</td><td>{pct(feasibility.roiPct, 1)}</td></tr>
            <tr><td className="muted">Indicative payback period</td><td>{paybackText}</td></tr>
            <tr><td className="muted">Viability assessment</td><td>{feasibility.viabilityScore}/100 — {feasibility.viabilityLabel}</td></tr>
            <tr>
              <td className="muted">Budget fit</td>
              <td>Total cost is {pct(feasibility.budgetFitPct)} of the {formatCr(brief.budgetCr)} budget (100% = exactly on budget)</td>
            </tr>
          </tbody>
        </table>

        <h3 style={{ fontSize: 14, margin: '18px 0 8px' }}>Sensitivity analysis</h3>
        {feasibility.sensitivity.length > 0 ? (
          <table className="table">
            <thead>
              <tr><th>What-if scenario</th><th className="num">Resulting ROI</th></tr>
            </thead>
            <tbody>
              {feasibility.sensitivity.map((s) => (
                <tr key={s.label}>
                  <td>{s.label}</td>
                  <td className="num">{pct(s.roiPct, 1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="small muted">No sensitivity scenarios modelled.</p>
        )}

        <h3 style={{ fontSize: 14, margin: '18px 0 8px' }}>Assumptions</h3>
        <ul className="small muted" style={{ margin: '0 0 4px', paddingLeft: 20 }}>
          {feasibility.assumptions.map((a) => (
            <li key={a} style={{ marginBottom: 3 }}>{a}</li>
          ))}
        </ul>

        {/* -------------------- 5 · Construction roadmap ----------------------- */}
        <h2 style={H2}>5 · Construction roadmap</h2>
        <p style={{ marginBottom: 12 }}>
          Estimated programme duration: <b>{months(construction.totalMonths)}</b> across {num(construction.phases.length)} phases.
        </p>

        <table className="table">
          <thead>
            <tr>
              <th>Phase</th>
              <th className="num">Start</th>
              <th className="num">Duration</th>
              <th className="num">Peak crew</th>
            </tr>
          </thead>
          <tbody>
            {construction.phases.map((p) => (
              <tr key={p.name}>
                <td>
                  {p.name}
                  {p.activities.length > 0 && (
                    <div className="small muted">{p.activities.join(' · ')}</div>
                  )}
                </td>
                <td className="num">Month {p.startMonth + 1}</td>
                <td className="num">{months(p.durationMonths)}</td>
                <td className="num">{num(p.manpowerPeak)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h3 style={{ fontSize: 14, margin: '18px 0 8px' }}>Key milestones</h3>
        {construction.milestones.length > 0 ? (
          <ul style={{ margin: '0 0 4px', paddingLeft: 20 }}>
            {construction.milestones.map((m) => (
              <li key={`${m.month}-${m.label}`} style={{ marginBottom: 4 }}>
                <b>Month {num(m.month)}</b> — {m.label}
              </li>
            ))}
          </ul>
        ) : (
          <p className="small muted">No milestones defined.</p>
        )}

        <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap', marginTop: 18 }}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <h3 style={{ fontSize: 14, margin: '0 0 8px' }}>Workforce plan</h3>
            <table className="table">
              <thead>
                <tr><th>Role</th><th className="num">Count</th></tr>
              </thead>
              <tbody>
                {construction.manpower.map((m) => (
                  <tr key={m.role}>
                    <td>{m.role}</td>
                    <td className="num">{num(m.count)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ flex: 1, minWidth: 240 }}>
            <h3 style={{ fontSize: 14, margin: '0 0 8px' }}>Major materials</h3>
            <table className="table">
              <thead>
                <tr><th>Material</th><th className="num">Estimated quantity</th></tr>
              </thead>
              <tbody>
                {construction.materials.map((m) => (
                  <tr key={m.name}>
                    <td>{m.name}</td>
                    <td className="num">{m.qty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ----------------------------- Disclaimer ---------------------------- */}
        <div
          className="small muted"
          style={{ border: '1px solid var(--hairline)', borderRadius: 8, padding: '12px 16px', marginTop: 32 }}
        >
          <b>Research Draft — not decision grade.</b> This report contains deterministic, demo-grade
          estimates produced by the UrbanOS MVP for illustration only. Working regulatory references
          have not yet passed the structured evidence gate. Figures, rule interpretations and timelines
          are indicative and do not constitute architectural, engineering, legal or investment advice.
          Verify all parameters with licensed professionals and the relevant sanctioning authority
          ({juris.authority}) before making any decision.
        </div>
      </div>
    </div>
  )
}
