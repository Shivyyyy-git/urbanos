import { useEffect, useMemo, useState } from 'react'
import type { ProjectBrief, ScenarioResult } from './types'
import { DEV_TYPE_LABELS } from './types'
import { formatCr, areaBoth, pct, num } from './lib/format'
import { getRules } from './data/jurisdictions'
import { getMarket } from './data/costs'
import { generateScenarios } from './engines/planning'
import { checkCompliance } from './engines/compliance'
import { assessFeasibility } from './engines/feasibility'
import { planConstruction } from './engines/construction'
import { assessComplianceEvidence } from './engines/complianceEvidence'
import { IntakeWizard } from './components/IntakeWizard'
import { LayoutViewer } from './components/LayoutViewer'
import { CompliancePanel } from './components/CompliancePanel'
import { FeasibilityPanel } from './components/FeasibilityPanel'
import { ConstructionPanel } from './components/ConstructionPanel'
import { ReportView } from './components/ReportView'

type Stage = 'intake' | 'generating' | 'workspace'
type PanelTab = 'masterplan' | 'compliance' | 'feasibility' | 'construction'

const GEN_STEPS = [
  'Parsing project brief',
  'Generating development concepts',
  'Drafting masterplan layouts',
  'Running demo rule-screening checks',
  'Modelling costs, revenue & ROI',
  'Preparing construction roadmap',
]

function GeneratingOverlay({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0)
  useEffect(() => {
    if (step >= GEN_STEPS.length) {
      const t = setTimeout(onDone, 350)
      return () => clearTimeout(t)
    }
    const t = setTimeout(() => setStep((s) => s + 1), 520)
    return () => clearTimeout(t)
  }, [step, onDone])
  return (
    <div className="gen-overlay">
      <div className="gen-box">
        <div className="logo-mark" style={{ margin: '0 auto 14px', width: 44, height: 44, fontSize: 20 }}>U</div>
        <h2>UrbanOS is planning your development</h2>
        <p className="muted" style={{ marginTop: 6 }}>
          Deterministic concepts · rule screening · feasibility · execution
        </p>
        <div className="gen-steps">
          {GEN_STEPS.map((label, i) => (
            <div key={label} className={`gen-step ${i < step ? 'done' : i === step ? 'now' : ''}`}>
              {i < step ? <span aria-hidden>✓</span> : i === step ? <span className="spinner" /> : <span aria-hidden>○</span>}
              {label}
            </div>
          ))}
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${Math.min(100, (step / GEN_STEPS.length) * 100)}%` }} />
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const [stage, setStage] = useState<Stage>('intake')
  const [brief, setBrief] = useState<ProjectBrief | null>(null)
  const [activeScenario, setActiveScenario] = useState(0)
  const [tab, setTab] = useState<PanelTab>('masterplan')
  const [reportOpen, setReportOpen] = useState(false)
  const evidenceAsOfDate = useMemo(() => new Date().toISOString().slice(0, 10), [])

  const results: ScenarioResult[] = useMemo(() => {
    if (!brief) return []
    const rules = getRules(brief.jurisdiction)
    const market = getMarket(brief.jurisdiction)
    return generateScenarios(brief, rules).map((scenario) => {
      const construction = planConstruction(brief, scenario)
      return {
        scenario,
        compliance: checkCompliance(brief, scenario, rules),
        // Pass the programme length so both views quote one build duration.
        feasibility: assessFeasibility(brief, scenario, market, construction.totalMonths),
        construction,
      }
    })
  }, [brief])

  const active = results[activeScenario]
  const activeEvidence = useMemo(() => {
    if (!brief || !active) return null
    return assessComplianceEvidence({
      jurisdiction: brief.jurisdiction,
      developmentType: brief.developmentType,
      ruleIds: active.compliance.checks.map((check) => check.id),
      asOfDate: evidenceAsOfDate,
    })
  }, [active, brief, evidenceAsOfDate])

  function startProject(b: ProjectBrief) {
    setBrief(b)
    setActiveScenario(0)
    setTab('masterplan')
    setStage('generating')
  }

  function resetAll() {
    setBrief(null)
    setReportOpen(false)
    setStage('intake')
  }

  return (
    <>
      <header className="app-header">
        <div className="logo-mark">U</div>
        <div>
          <div className="app-title">UrbanOS</div>
          <div className="app-tagline">AI Operating System for Smarter Development</div>
        </div>
        <div className="header-spacer" />
        {stage === 'workspace' && brief && (
          <>
            <button className="btn" onClick={resetAll}>New project</button>
            <button className="btn btn-primary" onClick={() => setReportOpen(true)}>
              Open report
            </button>
          </>
        )}
      </header>

      <main className="app-main">
        {stage === 'intake' && <IntakeWizard onSubmit={startProject} />}

        {stage === 'workspace' && brief && active && (
          <>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap', marginBottom: 6 }}>
              <h1 style={{ fontSize: 22 }}>{brief.name}</h1>
              <span className="badge badge-neutral">{DEV_TYPE_LABELS[brief.developmentType]}</span>
              {activeEvidence && !activeEvidence.decisionGradeAllowed && (
                <span className="badge badge-warn">Research Draft</span>
              )}
            </div>
            <p className="muted" style={{ marginBottom: 20 }}>
              {getRules(brief.jurisdiction).name}, {getRules(brief.jurisdiction).state} · {areaBoth(brief.plotAreaSqm)} ·
              Budget {formatCr(brief.budgetCr)} · {brief.roadWidthM} m abutting road
            </p>

            <div className="scenario-cards">
              {results.map((r, i) => (
                <button
                  key={r.scenario.id}
                  className={`scenario-card ${i === activeScenario ? 'active' : ''}`}
                  onClick={() => setActiveScenario(i)}
                >
                  <div className="sc-name">{r.scenario.name}</div>
                  <div className="sc-tagline">{r.scenario.tagline}</div>
                  <div className="sc-stats">
                    <span>FAR <b>{r.scenario.far.toFixed(2)}</b></span>
                    <span>ROI <b>{pct(r.feasibility.roiPct)}</b></span>
                    <span>Rule screen <b>{r.compliance.score}/100</b></span>
                    <span>Units <b>{num(r.scenario.totalUnits)}</b></span>
                  </div>
                </button>
              ))}
            </div>

            <nav className="tabs" aria-label="Result panels">
              {(
                [
                  ['masterplan', 'Masterplan'],
                  ['compliance', 'Rule screening'],
                  ['feasibility', 'Feasibility'],
                  ['construction', 'Construction'],
                ] as [PanelTab, string][]
              ).map(([id, label]) => (
                <button key={id} className={`tab ${tab === id ? 'active' : ''}`} onClick={() => setTab(id)}>
                  {label}
                </button>
              ))}
            </nav>

            {tab === 'masterplan' && (
              <LayoutViewer
                scenario={active.scenario}
                brief={brief}
                rules={getRules(brief.jurisdiction)}
              />
            )}
            {tab === 'compliance' && activeEvidence && (
              <CompliancePanel result={active.compliance} evidence={activeEvidence} />
            )}
            {tab === 'feasibility' && <FeasibilityPanel result={active.feasibility} budgetCr={brief.budgetCr} />}
            {tab === 'construction' && <ConstructionPanel plan={active.construction} />}
          </>
        )}
      </main>

      {stage === 'generating' && <GeneratingOverlay onDone={() => setStage('workspace')} />}

      {reportOpen && brief && active && activeEvidence && (
        <ReportView
          brief={brief}
          scenario={active.scenario}
          compliance={active.compliance}
          evidence={activeEvidence}
          feasibility={active.feasibility}
          construction={active.construction}
          onClose={() => setReportOpen(false)}
        />
      )}
    </>
  )
}
