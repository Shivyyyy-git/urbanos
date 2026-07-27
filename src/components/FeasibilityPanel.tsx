// ---------------------------------------------------------------------------
// Module 4 — Feasibility panel ("the money view").
// Pure presentational component: renders a FeasibilityResult computed by
// engines/feasibility. All charts are hand-rolled SVG (no libraries).
// ---------------------------------------------------------------------------
import type { FeasibilityResult, MoneyLine } from '../types'
import { formatCr, pct, months } from '../lib/format'

// ------------------------------ tiny helpers -------------------------------

/** Round to 2 dp for compact SVG path/coordinate strings. */
function r2(v: number): number {
  return Math.round(v * 100) / 100
}

/** "−₹12.3 Cr" for negatives instead of formatCr's "₹-12.3 Cr". */
function signedCr(n: number): string {
  return n < 0 ? `−${formatCr(Math.abs(n))}` : formatCr(n)
}

function truncate(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s
}

/** Horizontal bar anchored at the left baseline, 4px rounded data-end. */
function barPath(x0: number, y: number, w: number, h: number, r = 4): string {
  const rr = Math.max(0, Math.min(r, w, h / 2))
  const x1 = r2(x0 + Math.max(0, w))
  return [
    `M ${r2(x0)} ${r2(y)}`,
    `H ${r2(x1 - rr)}`,
    `Q ${x1} ${r2(y)} ${x1} ${r2(y + rr)}`,
    `V ${r2(y + h - rr)}`,
    `Q ${x1} ${r2(y + h)} ${r2(x1 - rr)} ${r2(y + h)}`,
    `H ${r2(x0)}`,
    'Z',
  ].join(' ')
}

// ------------------------------- KPI tiles ---------------------------------

function KpiTiles({ result }: { result: FeasibilityResult }) {
  const paybackKnown =
    result.profitCr > 0 && Number.isFinite(result.paybackYears) && result.paybackYears > 0 && result.paybackYears < 60
  return (
    <div className="kpi-grid">
      <div className="kpi-tile">
        <div className="kpi-label">Total cost</div>
        <div className="kpi-value mono-num">{formatCr(result.totalCostCr)}</div>
        <div className="kpi-sub">All-in project cost</div>
      </div>
      <div className="kpi-tile">
        <div className="kpi-label">Revenue</div>
        <div className="kpi-value mono-num">{formatCr(result.totalRevenueCr)}</div>
        <div className="kpi-sub">Gross sales value</div>
      </div>
      <div className="kpi-tile">
        <div className="kpi-label">Profit</div>
        <div className={`kpi-value mono-num ${result.profitCr >= 0 ? 'kpi-good' : 'kpi-bad'}`}>
          {signedCr(result.profitCr)}
        </div>
        <div className="kpi-sub">{result.profitCr >= 0 ? 'Pre-tax margin' : 'Projected loss'}</div>
      </div>
      <div className="kpi-tile">
        <div className="kpi-label">ROI</div>
        <div className="kpi-value mono-num">{pct(result.roiPct, 1)}</div>
        <div className="kpi-sub">{result.roiBasisNote ?? 'On total cost'}</div>
      </div>
      <div className="kpi-tile">
        <div className="kpi-label">Viability</div>
        <div className="kpi-value">
          <span className="score-pill">
            {Math.round(result.viabilityScore)}
            <span className="of">/ 100</span>
          </span>
        </div>
        <div className="kpi-sub">{result.viabilityLabel}</div>
      </div>
      <div className="kpi-tile">
        <div className="kpi-label">Payback</div>
        <div className="kpi-value mono-num">
          {paybackKnown ? months(Math.round(result.paybackYears * 12)) : '—'}
        </div>
        <div className="kpi-sub">{paybackKnown ? 'From sales start' : 'Not recovered'}</div>
      </div>
    </div>
  )
}

// ----------------------------- Budget fit strip ----------------------------

function BudgetStrip({ result, budgetCr }: { result: FeasibilityResult; budgetCr: number }) {
  const cost = Math.max(0, result.totalCostCr)
  const budget = Math.max(0, budgetCr)
  const over = result.budgetFitPct > 100 && budget > 0 && cost > budget
  // Bar width represents max(cost, budget); guard degenerate zero inputs.
  const scale = Math.max(cost, budget, 0.0001)
  const budgetPct = (budget / scale) * 100
  const withinPct = (Math.min(cost, budget) / scale) * 100
  const overPct = over ? ((cost - budget) / scale) * 100 : 0

  return (
    <div className="card card-pad">
      <div className="chart-title">Budget fit</div>
      <div
        style={{ position: 'relative', height: 18, margin: '6px 0 8px' }}
        title={`Cost ${formatCr(cost)} vs budget ${formatCr(budget)} — ${pct(result.budgetFitPct)} of budget`}
      >
        {/* track = budget envelope */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            width: `${budgetPct}%`,
            top: 0,
            bottom: 0,
            background: 'var(--hairline)',
            borderRadius: 9,
          }}
        />
        {/* fill = cost within budget */}
        {withinPct > 0 && (
          <div
            style={{
              position: 'absolute',
              left: 0,
              width: `${withinPct}%`,
              top: 0,
              bottom: 0,
              background: 'var(--series-1)',
              borderRadius: over ? '9px 0 0 9px' : '9px 4px 4px 9px',
            }}
          />
        )}
        {/* overflow beyond budget */}
        {over && (
          <div
            style={{
              position: 'absolute',
              left: `${budgetPct}%`,
              width: `${overPct}%`,
              top: 0,
              bottom: 0,
              background: 'var(--status-critical)',
              borderRadius: '0 4px 4px 0',
              borderLeft: '2px solid var(--surface)',
            }}
          />
        )}
        {/* budget marker tick */}
        <div
          style={{
            position: 'absolute',
            left: `calc(${budgetPct}% - 1px)`,
            width: 2,
            top: -4,
            bottom: -4,
            background: 'var(--baseline)',
          }}
        />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <span className="small mono-num" style={{ color: 'var(--ink)', fontWeight: 650 }}>
          Cost {formatCr(cost)}
        </span>
        <span className="small mono-num" style={{ color: 'var(--ink-2)' }}>
          Budget {formatCr(budget)}
        </span>
      </div>
      {over ? (
        <>
          <div className="small mono-num" style={{ color: 'var(--status-critical)', fontWeight: 650, marginTop: 4 }}>
            <span aria-hidden>⚠</span> Over budget by {formatCr(cost - budget)} ({pct(result.budgetFitPct)} of budget)
          </div>
          {result.budgetFitPct > 200 && (
            <div className="small muted" style={{ marginTop: 2 }}>
              Tip: at this budget, consider phased delivery or a lower-FAR concept — see the Green Core option.
            </div>
          )}
        </>
      ) : (
        <div className="small muted" style={{ marginTop: 4 }}>
          Uses {pct(result.budgetFitPct)} of budget
        </div>
      )}
    </div>
  )
}

// ------------------------- Chart 1: cost breakdown -------------------------

const VB_W = 480 // shared viewBox width for both charts

function CostBreakdownChart({ costs, totalCostCr }: { costs: MoneyLine[]; totalCostCr: number }) {
  const sorted = [...costs].sort((a, b) => b.amountCr - a.amountCr)
  const PX0 = 124 // plot left (after category label gutter)
  const PX1 = 404 // plot right (leave room for value labels)
  const RH = 27
  const BAR_H = 18
  const PAD_Y = 6
  const height = PAD_Y * 2 + sorted.length * RH
  const maxV = Math.max(...sorted.map((c) => c.amountCr), 0.0001)

  if (sorted.length === 0) {
    return <div className="empty">No cost lines</div>
  }

  return (
    <figure className="chart-figure">
      <svg
        width="100%"
        viewBox={`0 0 ${VB_W} ${height}`}
        role="img"
        aria-label="Cost breakdown by head"
      >
        {/* hairline vertical gridlines at quarters of the max value */}
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <line
            key={f}
            x1={r2(PX0 + f * (PX1 - PX0))}
            x2={r2(PX0 + f * (PX1 - PX0))}
            y1={PAD_Y}
            y2={height - PAD_Y}
            stroke="var(--hairline)"
            strokeWidth={1}
          />
        ))}
        {/* baseline */}
        <line x1={PX0} x2={PX0} y1={PAD_Y} y2={height - PAD_Y} stroke="var(--baseline)" strokeWidth={1} />
        {sorted.map((c, i) => {
          const y = PAD_Y + i * RH + (RH - BAR_H) / 2
          const w = (Math.max(0, c.amountCr) / maxV) * (PX1 - PX0)
          const share = totalCostCr > 0 ? (c.amountCr / totalCostCr) * 100 : 0
          return (
            <g key={c.label}>
              <title>{`${c.label}: ${formatCr(c.amountCr)} (${pct(share)} of total cost)`}</title>
              <text
                x={PX0 - 8}
                y={y + BAR_H / 2}
                textAnchor="end"
                dominantBaseline="central"
                fontSize={11}
                fill="var(--ink-2)"
              >
                {truncate(c.label, 20)}
              </text>
              <path d={barPath(PX0, y, w, BAR_H)} fill="var(--series-1)" />
              <text
                x={r2(PX0 + w + 6)}
                y={y + BAR_H / 2}
                dominantBaseline="central"
                fontSize={11}
                fill="var(--ink)"
                className="mono-num"
              >
                {formatCr(c.amountCr)}
              </text>
            </g>
          )
        })}
      </svg>
    </figure>
  )
}

// ----------------------- Chart 2: cost vs revenue --------------------------

function CostVsRevenueChart({ result }: { result: FeasibilityResult }) {
  const rows: { label: string; value: number; color: string }[] = [
    { label: 'Cost', value: Math.max(0, result.totalCostCr), color: 'var(--series-1)' },
    { label: 'Revenue', value: Math.max(0, result.totalRevenueCr), color: 'var(--series-2)' },
  ]
  const PX0 = 78
  const PX1 = 404
  const RH = 32
  const BAR_H = 18
  const PAD_Y = 8
  const height = PAD_Y * 2 + rows.length * RH
  const maxV = Math.max(...rows.map((d) => d.value), 0.0001)
  const gain = result.profitCr >= 0

  return (
    <figure className="chart-figure">
      <svg width="100%" viewBox={`0 0 ${VB_W} ${height}`} role="img" aria-label="Cost versus revenue">
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <line
            key={f}
            x1={r2(PX0 + f * (PX1 - PX0))}
            x2={r2(PX0 + f * (PX1 - PX0))}
            y1={PAD_Y}
            y2={height - PAD_Y}
            stroke="var(--hairline)"
            strokeWidth={1}
          />
        ))}
        <line x1={PX0} x2={PX0} y1={PAD_Y} y2={height - PAD_Y} stroke="var(--baseline)" strokeWidth={1} />
        {rows.map((d, i) => {
          const y = PAD_Y + i * RH + (RH - BAR_H) / 2
          const w = (d.value / maxV) * (PX1 - PX0)
          return (
            <g key={d.label}>
              <title>{`${d.label}: ${formatCr(d.value)}`}</title>
              <text
                x={PX0 - 8}
                y={y + BAR_H / 2}
                textAnchor="end"
                dominantBaseline="central"
                fontSize={11.5}
                fill="var(--ink-2)"
              >
                {d.label}
              </text>
              <path d={barPath(PX0, y, w, BAR_H)} fill={d.color} />
              <text
                x={r2(PX0 + w + 6)}
                y={y + BAR_H / 2}
                dominantBaseline="central"
                fontSize={11}
                fill="var(--ink)"
                className="mono-num"
              >
                {formatCr(d.value)}
              </text>
            </g>
          )
        })}
      </svg>
      <div
        className="small mono-num"
        style={{
          color: gain ? 'var(--status-good-text)' : 'var(--status-critical)',
          fontWeight: 650,
          marginTop: 6,
        }}
      >
        {gain ? (
          <>
            <span aria-hidden>▲</span> Profit {formatCr(result.profitCr)}
          </>
        ) : (
          <>
            <span aria-hidden>▼</span> Loss {formatCr(Math.abs(result.profitCr))}
          </>
        )}
      </div>
      <div className="legend" style={{ marginTop: 8 }}>
        <span className="legend-item">
          <span className="legend-swatch" style={{ background: 'var(--series-1)' }} />
          Cost
        </span>
        <span className="legend-item">
          <span className="legend-swatch" style={{ background: 'var(--series-2)' }} />
          Revenue
        </span>
      </div>
    </figure>
  )
}

// --------------------------- Sensitivity ("What if") -----------------------

function SensitivityChart({ result }: { result: FeasibilityResult }) {
  // The engine's sensitivity list already leads with its own base case — keep
  // the single emphasized synthetic row and drop the duplicate.
  const rows: { label: string; roiPct: number; base: boolean }[] = [
    { label: 'Base case', roiPct: result.roiPct, base: true },
    ...result.sensitivity
      .filter((s) => s.label !== 'Base case')
      .map((s) => ({ label: s.label, roiPct: s.roiPct, base: false })),
  ]
  const LX = 178 // track left (after label gutter)
  const RX = 408 // track right (leave room for ROI value column)
  const RH = 26
  const PAD_Y = 8
  const height = PAD_Y * 2 + rows.length * RH

  // Range scale across all cases; guard a degenerate flat range.
  let lo = Math.min(...rows.map((d) => d.roiPct))
  let hi = Math.max(...rows.map((d) => d.roiPct))
  if (hi - lo < 1e-9) {
    lo -= 5
    hi += 5
  }
  const pad = (hi - lo) * 0.08
  lo -= pad
  hi += pad
  const xFor = (v: number) => r2(LX + ((v - lo) / (hi - lo)) * (RX - LX))

  return (
    <div className="card card-pad">
      <div className="chart-title">What if</div>
      <figure className="chart-figure">
        <svg width="100%" viewBox={`0 0 ${VB_W} ${height}`} role="img" aria-label="ROI sensitivity to what-if shifts">
          {/* reference line at base-case ROI across all rows */}
          <line
            x1={xFor(result.roiPct)}
            x2={xFor(result.roiPct)}
            y1={PAD_Y - 2}
            y2={height - PAD_Y + 2}
            stroke="var(--baseline)"
            strokeWidth={1}
            strokeDasharray="2 3"
          />
          {rows.map((d, i) => {
            const cy = PAD_Y + i * RH + RH / 2
            const negative = d.roiPct < 0
            return (
              <g key={`${d.label}-${i}`}>
                <title>{`${d.label}: ROI ${pct(d.roiPct, 1)}`}</title>
                <text
                  x={LX - 10}
                  y={cy}
                  textAnchor="end"
                  dominantBaseline="central"
                  fontSize={11}
                  fill={d.base ? 'var(--ink)' : 'var(--ink-2)'}
                  fontWeight={d.base ? 700 : 400}
                >
                  {truncate(d.label, 26)}
                </text>
                {/* thin min..max range track */}
                <rect x={LX} y={cy - 2} width={RX - LX} height={4} rx={2} fill="var(--hairline)" />
                {/* marker */}
                {d.base ? (
                  <circle cx={xFor(d.roiPct)} cy={cy} r={6} fill="var(--accent)" stroke="var(--surface)" strokeWidth={2} />
                ) : (
                  <circle cx={xFor(d.roiPct)} cy={cy} r={4.5} fill="var(--surface)" stroke="var(--ink-2)" strokeWidth={1.5} />
                )}
                <text
                  x={VB_W - 2}
                  y={cy}
                  textAnchor="end"
                  dominantBaseline="central"
                  fontSize={11.5}
                  className="mono-num"
                  fill={negative ? 'var(--status-critical)' : 'var(--ink)'}
                  fontWeight={d.base ? 700 : 500}
                >
                  {negative ? `⚠ ${pct(d.roiPct, 1)}` : pct(d.roiPct, 1)}
                </text>
              </g>
            )
          })}
        </svg>
      </figure>
      <div className="chart-note">
        Dashed line marks base-case ROI ({pct(result.roiPct, 1)}). <span aria-hidden>⚠</span> flags cases that turn
        loss-making.
      </div>
    </div>
  )
}

// --------------------------------- Panel -----------------------------------

export function FeasibilityPanel({ result, budgetCr }: { result: FeasibilityResult; budgetCr: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <KpiTiles result={result} />

      <BudgetStrip result={result} budgetCr={budgetCr} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 }}>
        <div className="card card-pad">
          <div className="chart-title">Where the money goes</div>
          <CostBreakdownChart costs={result.costs} totalCostCr={result.totalCostCr} />
        </div>
        <div className="card card-pad">
          <div className="chart-title">Cost vs revenue</div>
          <CostVsRevenueChart result={result} />
        </div>
      </div>

      <SensitivityChart result={result} />

      <div className="card card-pad">
        <details>
          <summary style={{ cursor: 'pointer', fontWeight: 650, fontSize: 13.5 }}>Assumptions &amp; rates</summary>
          <ul style={{ margin: '10px 0 0', paddingLeft: 20 }}>
            {result.assumptions.map((a) => (
              <li key={a} className="small muted" style={{ marginBottom: 4 }}>
                {a}
              </li>
            ))}
          </ul>
        </details>
      </div>
    </div>
  )
}
