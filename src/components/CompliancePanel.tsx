// ---------------------------------------------------------------------------
// Module 3 UI — Compliance panel: regulatory clearance dashboard.
// Pure presentation of a ComplianceResult (computed by engines/compliance).
// ---------------------------------------------------------------------------
import { useState } from 'react'
import type { ComplianceCheck, ComplianceResult, ComplianceStatus } from '../types'
import type { ComplianceEvidenceAssessment } from '../engines/complianceEvidence'
import { num } from '../lib/format'

type Filter = 'all' | 'issues'

const STATUS_META: Record<ComplianceStatus, { icon: string; word: string; badge: string }> = {
  pass: { icon: '✓', word: 'Model pass', badge: 'badge-pass' },
  warn: { icon: '!', word: 'Review', badge: 'badge-warn' },
  fail: { icon: '✕', word: 'Model fail', badge: 'badge-fail' },
}

/** Score bands are demo-grade UX thresholds, not statutory categories. */
function scoreTone(score: number): { color: string; label: string } {
  if (score >= 85) return { color: 'var(--status-good-text)', label: 'Low modelled conflict' }
  // #8a5a00 matches the .badge-warn ink in styles.css (readable warning tone on light surface).
  if (score >= 60) return { color: '#8a5a00', label: 'Conditions identified' }
  return { color: 'var(--status-critical)', label: 'Redesign indicated' }
}

/** Group checks by category, preserving first-appearance order. */
function groupByCategory(checks: ComplianceCheck[]): [string, ComplianceCheck[]][] {
  const groups = new Map<string, ComplianceCheck[]>()
  for (const check of checks) {
    const bucket = groups.get(check.category)
    if (bucket) bucket.push(check)
    else groups.set(check.category, [check])
  }
  return Array.from(groups.entries())
}

function StatusBadge({ status }: { status: ComplianceStatus }) {
  const meta = STATUS_META[status]
  return (
    <span className={`badge ${meta.badge}`}>
      <span aria-hidden>{meta.icon}</span>
      {meta.word}
    </span>
  )
}

export function CompliancePanel({
  result,
  evidence,
}: {
  result: ComplianceResult
  evidence: ComplianceEvidenceAssessment
}) {
  const [filter, setFilter] = useState<Filter>('all')

  const tone = scoreTone(result.score)
  const { pass, warn, fail } = result.summary

  const visibleChecks =
    filter === 'all' ? result.checks : result.checks.filter((c) => c.status !== 'pass')
  const groups = groupByCategory(visibleChecks)

  return (
    <div>
      <div
        className="card card-pad"
        style={{
          marginBottom: 16,
          borderLeft: `4px solid var(${
            evidence.decisionGradeAllowed ? '--status-good' : '--status-warning'
          })`,
        }}
      >
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="section-title" style={{ margin: 0 }}>
            Regulatory evidence: {evidence.status}
          </div>
          <span className={`badge ${evidence.decisionGradeAllowed ? 'badge-pass' : 'badge-warn'}`}>
            {evidence.decisionGradeClaims}/{evidence.totalClaims} decision-grade rules
          </span>
        </div>
        <p className="small" style={{ marginTop: 8, lineHeight: 1.5 }}>
          {evidence.decisionGradeAllowed
            ? 'Every modelled rule is linked to current, verified, in-scope and professionally signed evidence.'
            : 'Decision-grade use is blocked. Current rule sources are research leads without complete official URLs, clauses, effective dates, freshness checks and professional sign-off.'}
        </p>
        <p className="small muted" style={{ marginTop: 5 }}>
          Evidence evaluated {evidence.asOfDate} · {evidence.linkedSourceCount} linked source records ·{' '}
          {evidence.blockers.length} unresolved blocker types
        </p>
      </div>

      {/* ------------------------------ Header card ------------------------------ */}
      <div className="card card-pad" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
          <div>
            <span className="score-pill" style={{ fontSize: 42, lineHeight: 1, color: tone.color }}>
              {num(result.score)}
              <span className="of">/100</span>
            </span>
            <div style={{ fontWeight: 650, color: tone.color, marginTop: 6 }}>{tone.label}</div>
            <div className="small muted" style={{ marginTop: 2 }}>
              Demo rule-screening score — not an approval or clearance
            </div>
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span className="badge badge-pass">
              <span aria-hidden>✓</span>
              {num(pass)} model passes
            </span>
            {warn > 0 && (
              <span className="badge badge-warn">
                <span aria-hidden>!</span>
                {num(warn)} {warn === 1 ? 'warning' : 'warnings'}
              </span>
            )}
            {fail > 0 && (
              <span className="badge badge-fail">
                <span aria-hidden>✕</span>
                {num(fail)} failed
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ------------------------------ Filter chips ------------------------------ */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }} role="group" aria-label="Filter compliance checks">
        <button
          className={`btn ${filter === 'all' ? 'btn-primary' : ''}`}
          style={{ padding: '6px 14px', fontSize: 13 }}
          aria-pressed={filter === 'all'}
          onClick={() => setFilter('all')}
        >
          All
        </button>
        <button
          className={`btn ${filter === 'issues' ? 'btn-primary' : ''}`}
          style={{ padding: '6px 14px', fontSize: 13 }}
          aria-pressed={filter === 'issues'}
          onClick={() => setFilter('issues')}
        >
          Issues only
        </button>
      </div>

      {/* ---------------------------- Grouped check tables ---------------------------- */}
      <div className="card card-pad">
        {groups.length === 0 ? (
          <div className="empty">No modelled issues in the selected filter</div>
        ) : (
          groups.map(([category, checks], gi) => (
            <div key={category} style={{ marginTop: gi === 0 ? 0 : 24 }}>
              <div className="section-title">{category}</div>
              <div style={{ overflowX: 'auto' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th style={{ width: '44%' }}>Rule</th>
                      <th>Required</th>
                      <th className="num">Proposed</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {checks.map((check) => (
                      <tr key={check.id}>
                        <td>
                          <div>{check.rule}</div>
                          <div className="small muted">
                            Working reference — unverified: {check.reference}
                          </div>
                          {check.status !== 'pass' && check.remediation && (
                            <div
                              className="small"
                              style={{
                                marginTop: 6,
                                paddingLeft: 8,
                                color: 'var(--ink-2)',
                                borderLeft: `3px solid var(${
                                  check.status === 'fail' ? '--status-critical' : '--status-warning'
                                })`,
                              }}
                            >
                              → {check.remediation}
                            </div>
                          )}
                        </td>
                        <td className="mono-num">{check.required}</td>
                        <td className="num">{check.proposed}</td>
                        <td>
                          <StatusBadge status={check.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}
        <p className="chart-note" style={{ marginTop: 16 }}>
          These are deterministic, demo-grade screening checks. Working references are not verified
          citations and cannot support a sanction, acquisition, design or investment decision.
        </p>
      </div>
    </div>
  )
}
