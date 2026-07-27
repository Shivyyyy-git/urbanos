// ---------------------------------------------------------------------------
// ConstructionPanel — construction intelligence for the active scenario.
// KPI tiles, an SVG Gantt timeline with a milestone lane, per-phase activity
// details, and workforce/material tables. Pure presentation: every number
// comes from the construction engine via the ConstructionPlan contract.
// ---------------------------------------------------------------------------
import type { ConstructionPlan } from '../types'
import { months, num } from '../lib/format'

/** Ordinal blue ramp for phase bars, light → dark, applied in phase order. */
const PHASE_RAMP = ['#86b6ef', '#5598e7', '#2a78d6', '#1c5cab', '#104281']

/** Rough SVG text width estimate (px) for label placement decisions. */
function estTextW(s: string, fontSize: number): number {
  return s.length * fontSize * 0.6
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(Math.max(v, lo), hi)
}

// ------------------------------ Gantt chart --------------------------------

function GanttChart({ plan }: { plan: ConstructionPlan }) {
  const { phases, milestones } = plan

  const W = 920
  const padL = 10
  const padR = 56
  const rowH = 34
  const barH = 20

  // Time scale — guard degenerate/zero-length programmes (division by zero).
  const maxEnd = Math.max(
    plan.totalMonths,
    ...phases.map((p) => p.startMonth + p.durationMonths),
    ...milestones.map((m) => m.month),
  )
  const T = Math.max(1, maxEnd)
  const chartW = W - padL - padR
  const xOf = (m: number) => padL + (clamp(m, 0, T) / T) * chartW

  // Month grid: hairline verticals every 6 months, labelled M0/M6/…
  const step = 6
  const ticks: number[] = []
  for (let m = 0; m <= T; m += step) ticks.push(m)

  const axisY = 24
  const phasesTop = axisY + 6
  const phasesBottom = phasesTop + phases.length * rowH

  // Milestone lane: labels staggered across as many rows as needed (first-fit).
  const hasMilestones = milestones.length > 0
  const diamondY = phasesBottom + 20
  const labelY0 = diamondY + 17
  const labelRowStep = 12.5
  const rowEnds: number[] = []
  const placedMilestones = milestones
    .slice()
    .sort((a, b) => a.month - b.month)
    .map((m) => {
      const x = xOf(m.month)
      const w = estTextW(m.label, 10.5)
      const lx = clamp(x, 4 + w / 2, W - 4 - w / 2)
      const start = lx - w / 2
      let row = 0
      while (rowEnds[row] !== undefined && start < (rowEnds[row] as number) + 8) row++
      rowEnds[row] = lx + w / 2
      return { month: m.month, label: m.label, x, lx, row }
    })
  const maxRow = placedMilestones.reduce((r, m) => Math.max(r, m.row), 0)
  const H = hasMilestones ? labelY0 + maxRow * labelRowStep + 8 : phasesBottom + 10

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Construction phase timeline">
      {/* Month grid + axis */}
      {ticks.map((m) => (
        <g key={m}>
          <line x1={xOf(m)} y1={axisY} x2={xOf(m)} y2={phasesBottom + 4} stroke="var(--hairline)" strokeWidth={1} />
          <text
            x={xOf(m)}
            y={15}
            textAnchor={m === 0 ? 'start' : 'middle'}
            fontSize={11}
            fill="var(--muted)"
            className="mono-num"
          >
            {`M${m}`}
          </text>
        </g>
      ))}
      {T % step !== 0 && (
        <line x1={xOf(T)} y1={axisY} x2={xOf(T)} y2={phasesBottom + 4} stroke="var(--hairline)" strokeWidth={1} />
      )}
      <line x1={padL} y1={axisY} x2={xOf(T)} y2={axisY} stroke="var(--baseline)" strokeWidth={1} />

      {/* Phase bars */}
      {phases.map((p, i) => {
        const y = phasesTop + i * rowH
        const barY = y + (rowH - barH) / 2
        const textY = y + rowH / 2 + 4
        const bx = xOf(p.startMonth)
        const bw = Math.max(xOf(p.startMonth + p.durationMonths) - bx, 6)
        const color = PHASE_RAMP[i % PHASE_RAMP.length]
        const nameW = estTextW(p.name, 12)
        const durText = `${p.durationMonths} mo`
        const durW = estTextW(durText, 11)
        const fitsLeft = bx - padL >= nameW + 14
        // Only place the name inside light bars — ink text needs contrast.
        const fitsInside = bw >= nameW + 18 && i % PHASE_RAMP.length < 2
        const durFitsRight = bx + bw + 8 + durW <= W - 2
        const tip = `${p.name}: M${p.startMonth}–M${p.startMonth + p.durationMonths} · ${months(
          p.durationMonths,
        )} · peak crew ${num(p.manpowerPeak)}`
        return (
          <g key={`${p.name}-${i}`}>
            <title>{tip}</title>
            <rect x={bx} y={barY} width={bw} height={barH} rx={4} fill={color} stroke="var(--surface)" strokeWidth={2} />
            {fitsLeft ? (
              <text x={bx - 8} y={textY} textAnchor="end" fontSize={12} fontWeight={600} fill="var(--ink)">
                {p.name}
              </text>
            ) : fitsInside ? (
              <text x={bx + 9} y={textY} fontSize={12} fontWeight={600} fill="var(--ink)">
                {p.name}
              </text>
            ) : (
              <text x={bx + bw + 8} y={textY} fontSize={12} fontWeight={600} fill="var(--ink)">
                {p.name}
                <tspan fontSize={11} fontWeight={400} fill="var(--ink-2)" className="mono-num">
                  {' '}· {durText}
                </tspan>
              </text>
            )}
            {(fitsLeft || fitsInside) &&
              (durFitsRight ? (
                <text x={bx + bw + 8} y={textY} fontSize={11} fill="var(--ink-2)" className="mono-num">
                  {durText}
                </text>
              ) : (
                <text x={bx + bw - 8} y={textY} textAnchor="end" fontSize={11} fill="var(--ink)" className="mono-num">
                  {durText}
                </text>
              ))}
          </g>
        )
      })}

      {/* Milestone lane */}
      {placedMilestones.map((m, idx) => (
        <g key={`${m.label}-${idx}`}>
          <title>{`${m.label} — month ${m.month}`}</title>
          <line x1={m.x} y1={phasesBottom + 4} x2={m.x} y2={diamondY - 8} stroke="var(--hairline)" strokeWidth={1} />
          <rect
            x={m.x - 4.5}
            y={diamondY - 4.5}
            width={9}
            height={9}
            rx={1.5}
            transform={`rotate(45 ${m.x} ${diamondY})`}
            fill="var(--series-6)"
            stroke="var(--surface)"
            strokeWidth={1.5}
          />
          <text x={m.lx} y={labelY0 + m.row * labelRowStep} textAnchor="middle" fontSize={10.5} fill="var(--ink-2)">
            {m.label}
          </text>
        </g>
      ))}
    </svg>
  )
}

// -------------------------------- Panel ------------------------------------

export function ConstructionPanel({ plan }: { plan: ConstructionPlan }) {
  const peakWorkforce = plan.phases.reduce((mx, p) => Math.max(mx, p.manpowerPeak), 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="kpi-grid">
        <div className="kpi-tile">
          <div className="kpi-label">Total duration</div>
          <div className="kpi-value mono-num">{months(plan.totalMonths)}</div>
          <div className="kpi-sub mono-num">M0 → M{plan.totalMonths}</div>
        </div>
        <div className="kpi-tile">
          <div className="kpi-label">Peak workforce</div>
          <div className="kpi-value mono-num">{num(peakWorkforce)}</div>
          <div className="kpi-sub">workers on site at peak</div>
        </div>
        <div className="kpi-tile">
          <div className="kpi-label">Phases</div>
          <div className="kpi-value mono-num">{num(plan.phases.length)}</div>
          <div className="kpi-sub">execution stages</div>
        </div>
        <div className="kpi-tile">
          <div className="kpi-label">Milestones</div>
          <div className="kpi-value mono-num">{num(plan.milestones.length)}</div>
          <div className="kpi-sub">key checkpoints</div>
        </div>
      </div>

      <div className="card card-pad">
        <div className="section-title">Construction timeline</div>
        {plan.phases.length === 0 ? (
          <div className="empty">No construction phases generated for this scenario.</div>
        ) : (
          <figure className="chart-figure">
            <GanttChart plan={plan} />
            <div className="legend" style={{ marginTop: 10 }}>
              <span className="legend-item">
                <span className="legend-swatch" style={{ background: PHASE_RAMP[2] }} />
                Phase bar (shade follows sequence)
              </span>
              {plan.milestones.length > 0 && (
                <span className="legend-item">
                  <span
                    className="legend-swatch"
                    style={{ background: 'var(--series-6)', transform: 'rotate(45deg) scale(0.8)', borderRadius: 2 }}
                  />
                  Milestone
                </span>
              )}
            </div>
          </figure>
        )}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 14,
          alignItems: 'start',
        }}
      >
        <div className="card card-pad">
          <div className="section-title">Phase details</div>
          {plan.phases.length === 0 ? (
            <div className="empty">No phases to detail.</div>
          ) : (
            plan.phases.map((p, i) => (
              <div
                key={`${p.name}-${i}`}
                style={{ padding: '10px 0', borderTop: i > 0 ? '1px solid var(--hairline)' : 'none' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span
                    aria-hidden
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 3,
                      background: PHASE_RAMP[i % PHASE_RAMP.length],
                      flexShrink: 0,
                    }}
                  />
                  <b style={{ fontSize: 13.5 }}>{p.name}</b>
                  <span className="small muted mono-num">
                    M{p.startMonth}–M{p.startMonth + p.durationMonths} · {months(p.durationMonths)}
                  </span>
                  <span style={{ flex: 1 }} />
                  <span className="badge badge-neutral mono-num">peak crew {num(p.manpowerPeak)}</span>
                </div>
                <ul style={{ margin: '6px 0 0', paddingLeft: 20, fontSize: 12.5, color: 'var(--ink-2)' }}>
                  {p.activities.map((a, j) => (
                    <li key={j}>{a}</li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="card card-pad">
            <div className="section-title">Workforce</div>
            {plan.manpower.length === 0 ? (
              <div className="empty">No workforce estimate available.</div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Role</th>
                    <th className="num">Count</th>
                  </tr>
                </thead>
                <tbody>
                  {plan.manpower.map((r) => (
                    <tr key={r.role}>
                      <td>{r.role}</td>
                      <td className="num">{num(r.count)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="card card-pad">
            <div className="section-title">Key materials</div>
            {plan.materials.length === 0 ? (
              <div className="empty">No material estimate available.</div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Material</th>
                    <th className="num">Est. quantity</th>
                  </tr>
                </thead>
                <tbody>
                  {plan.materials.map((m) => (
                    <tr key={m.name}>
                      <td>{m.name}</td>
                      <td className="num">{m.qty}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      <p className="chart-note">
        Timeline and quantities are parametric estimates for planning; detailed scheduling requires a contractor's
        programme.
      </p>
    </div>
  )
}
