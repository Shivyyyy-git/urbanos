// ---------------------------------------------------------------------------
// LayoutViewer — Module 2's visual centerpiece. Renders scenario.layout as an
// SVG site masterplan (left card) next to "Plan facts" (right card).
// Pure presentation: all plan geometry comes from the planning engine.
// ---------------------------------------------------------------------------
import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, MouseEvent as RMouseEvent, RefObject } from 'react'
import type { BylawRules, LandUseCategory, Parcel, ProjectBrief, Scenario } from '../types'
import { LAND_USE_LABELS } from '../types'
import { acres, areaBoth, num, pct, sqft, sqm } from '../lib/format'
import { DrawingExport } from './DrawingExport'

// Fixed semantic ordering for legends & breakdowns (matches types.ts order).
const LU_ORDER: LandUseCategory[] = [
  'residential',
  'commercial',
  'green',
  'roads',
  'amenities',
  'utilities',
]

const LU_VAR: Record<LandUseCategory, string> = {
  residential: 'var(--lu-residential)',
  commercial: 'var(--lu-commercial)',
  green: 'var(--lu-green)',
  roads: 'var(--lu-roads)',
  amenities: 'var(--lu-amenities)',
  utilities: 'var(--lu-utilities)',
}

/** Deterministic 0..1 hash (FNV-1a) — decorative tree placement must be
 * stable across renders (no Math.random anywhere). */
function hash01(seed: string, i: number): number {
  const s = `${seed}:${i}`
  let h = 2166136261
  for (let c = 0; c < s.length; c++) {
    h ^= s.charCodeAt(c)
    h = Math.imul(h, 16777619)
  }
  return ((h >>> 0) % 1000) / 1000
}

/** Observe an element's rendered width (for px↔metre scale + chart widths). */
function useElementWidth<T extends HTMLElement>(): [RefObject<T>, number] {
  const ref = useRef<T>(null)
  const [w, setW] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const e = entries[0]
      if (e) setW(e.contentRect.width)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, w]
}

/** Nice round scale-bar length in metres for a plot of width plotW. */
function pickScaleBar(plotW: number): number {
  // Survey-drawing convention: 10/20/50/100 m bars; small urban plots get 2–5 m.
  const nice = [2, 5, 10, 20, 50, 100, 200, 250, 500, 1000]
  let best = nice[0] ?? 2
  for (const n of nice) if (n <= plotW * 0.4) best = n
  return best
}

interface HoverState {
  id: string
  x: number
  y: number
}

export function LayoutViewer({
  scenario,
  brief,
  rules,
}: {
  scenario: Scenario
  brief: ProjectBrief
  rules: BylawRules
}) {
  const [planRef, planW] = useElementWidth<HTMLDivElement>()
  const [barRef, barW] = useElementWidth<HTMLDivElement>()
  const [hover, setHover] = useState<HoverState | null>(null)

  const { layout } = scenario
  // Guard degenerate envelopes (engine should never emit these, but be safe).
  const plotW = Math.max(layout.plotW, 1)
  const plotD = Math.max(layout.plotD, 1)
  const parcels = layout.parcels

  // ---- Scale: fit container width, cap rendered depth for very deep plots ----
  const marginPx = 30 // margin (px) around the plot for north arrow / scale bar
  const availW = Math.max((planW || 560) - 2 * marginPx, 60)
  const availH = 600 - 2 * marginPx
  const s = Math.max(Math.min(availW / plotW, availH / plotD), 0.01) // px per metre
  const px = (n: number) => n / s // convert a screen-px size into metre units
  const marginM = marginPx / s
  const svgW = plotW * s + 2 * marginPx
  const svgH = plotD * s + 2 * marginPx
  const viewBox = `${-marginM} ${-marginM} ${plotW + 2 * marginM} ${plotD + 2 * marginM}`

  const scaleLen = pickScaleBar(plotW)
  const usesPresent = LU_ORDER.filter((u) => parcels.some((p) => p.use === u))
  const hoverParcel = hover ? parcels.find((p) => p.id === hover.id) : undefined

  function moveTip(p: Parcel, e: RMouseEvent<SVGRectElement>) {
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1200
    const vh = typeof window !== 'undefined' ? window.innerHeight : 800
    setHover({
      id: p.id,
      x: Math.min(e.clientX + 14, vw - 250),
      y: Math.min(e.clientY + 14, vh - 130), // keep the tooltip on-screen at the bottom edge
    })
  }

  // Label lines for one parcel, only if the rendered rect actually fits them.
  function parcelLines(p: Parcel): { text: string; bold: boolean }[] {
    const wPx = p.w * s
    const hPx = p.h * s
    const lines: { text: string; bold: boolean }[] = []
    const fits = (t: string) => wPx - 8 >= t.length * 6
    if (p.label && fits(p.label) && hPx >= 16) lines.push({ text: p.label, bold: false })
    if (p.floors && p.floors > 0) {
      const g = `G+${p.floors - 1}` // Indian convention: ground + N upper floors
      if (fits(g) && hPx >= 16) lines.push({ text: g, bold: true })
    }
    // Two lines need ~30px of height; otherwise keep the most informative one.
    if (lines.length === 2 && hPx < 30) {
      const bold = lines.find((l) => l.bold)
      return bold ? [bold] : lines.slice(0, 1)
    }
    return lines
  }

  // Decorative trees on large green parcels (deterministic positions).
  function trees(p: Parcel): { cx: number; cy: number; r: number }[] {
    if (p.use !== 'green') return []
    const area = p.w * p.h
    if (area < 250 || Math.min(p.w, p.h) < 5) return []
    const count = area >= 1500 ? 4 : area >= 600 ? 3 : 2
    const r = Math.min(Math.max(Math.min(p.w, p.h) * 0.1, px(2.5)), px(6))
    const out: { cx: number; cy: number; r: number }[] = []
    for (let i = 0; i < count; i++) {
      out.push({
        cx: p.x + p.w * (0.18 + 0.64 * hash01(p.id, i * 2)),
        cy: p.y + p.h * (0.18 + 0.64 * hash01(p.id, i * 2 + 1)),
        r,
      })
    }
    return out
  }

  // ---- Land-use stacked bar (Plan facts) ----
  const luEntries = scenario.landUse.filter((l) => l.pct > 0)
  const luTotalPct = luEntries.reduce((a, l) => a + l.pct, 0)
  const barWidth = Math.max(barW || 480, 240)
  const barId = `lu-bar-${scenario.id.replace(/[^a-zA-Z0-9_-]/g, '')}`

  const rowStyle: CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: 12,
    padding: '7px 0',
    borderBottom: '1px solid var(--hairline)',
    fontSize: 13.5,
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: 16,
        alignItems: 'start',
      }}
    >
      {/* ------------------------------ Plan card ------------------------------ */}
      <div className="card card-pad">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
          <h3 style={{ fontSize: 15 }}>Site masterplan</h3>
          <span className="small muted mono-num">
            Plot {num(plotW)} × {num(plotD)} m · {areaBoth(brief.plotAreaSqm)}
          </span>
        </div>
        <p className="small muted" style={{ marginTop: 2, marginBottom: 12 }}>
          {scenario.name} — {scenario.tagline}
        </p>

        <div ref={planRef}>
          {parcels.length === 0 ? (
            <div className="empty">No parcels in this layout.</div>
          ) : (
            <svg
              viewBox={viewBox}
              width={svgW}
              height={svgH}
              style={{ display: 'block', maxWidth: '100%', height: 'auto', margin: '0 auto' }}
              role="img"
              aria-label={`Masterplan of ${scenario.name}: ${num(plotW)} by ${num(plotD)} metre plot with ${parcels.length} parcels`}
              onMouseLeave={() => setHover(null)}
            >
              {/* Plot boundary — offset outward ~3 screen-px so parcels that
                  legitimately run to the plot line never overlap the dashes. */}
              <rect
                x={-px(3)}
                y={-px(3)}
                width={plotW + 2 * px(3)}
                height={plotD + 2 * px(3)}
                fill="none"
                stroke="var(--baseline)"
                strokeWidth={px(1.5)}
                strokeDasharray={`${px(6)} ${px(4)}`}
              />

              {/* Parcels */}
              {parcels.map((p) => {
                const rx = Math.min(1.5, p.w / 4, p.h / 4) // ≈1.5 m corner radius
                const inset = Math.min(1.2, p.w / 8, p.h / 8)
                const lines = parcelLines(p)
                const cy = p.y + p.h / 2
                return (
                  <g key={p.id}>
                    <rect
                      x={p.x}
                      y={p.y}
                      width={p.w}
                      height={p.h}
                      rx={rx}
                      fill={LU_VAR[p.use]}
                      stroke="var(--surface)"
                      strokeWidth={px(2)}
                      onMouseEnter={(e) => moveTip(p, e)}
                      onMouseMove={(e) => moveTip(p, e)}
                      onMouseLeave={() => setHover(null)}
                    >
                      {/* Native fallback so touch/keyboard users get parcel data too */}
                      <title>
                        {`${p.label ?? LAND_USE_LABELS[p.use]} · ${LAND_USE_LABELS[p.use]} · ${sqm(p.w * p.h)}${p.floors && p.floors > 0 ? ` · G+${p.floors - 1}` : ''}`}
                      </title>
                    </rect>
                    {p.floors && p.floors > 0 ? (
                      <rect
                        x={p.x + inset}
                        y={p.y + inset}
                        width={Math.max(p.w - 2 * inset, 0.1)}
                        height={Math.max(p.h - 2 * inset, 0.1)}
                        rx={Math.max(rx - inset / 2, 0.2)}
                        fill="rgba(11, 11, 11, 0.12)"
                        pointerEvents="none"
                      />
                    ) : null}
                    {trees(p).map((t, i) => (
                      <circle
                        key={i}
                        cx={t.cx}
                        cy={t.cy}
                        r={t.r}
                        fill="#005400" /* darker shade of --lu-green, decorative */
                        opacity={0.5}
                        pointerEvents="none"
                      />
                    ))}
                    {lines.map((l, i) => (
                      <text
                        key={i}
                        x={p.x + p.w / 2}
                        y={cy + (lines.length === 2 ? (i === 0 ? -px(7) : px(7)) : 0)}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fontSize={l.bold ? px(11) : px(10.5)}
                        fontWeight={l.bold ? 700 : 500}
                        fill="var(--ink)"
                        pointerEvents="none"
                      >
                        {l.text}
                      </text>
                    ))}
                  </g>
                )
              })}

              {/* Hover highlight (drawn above everything) */}
              {hoverParcel && (
                <rect
                  x={hoverParcel.x}
                  y={hoverParcel.y}
                  width={hoverParcel.w}
                  height={hoverParcel.h}
                  rx={Math.min(1.5, hoverParcel.w / 4, hoverParcel.h / 4)}
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth={px(2.5)}
                  pointerEvents="none"
                />
              )}

              {/* North arrow — top-right, in the margin */}
              <g fill="var(--ink-2)" pointerEvents="none">
                <polygon
                  points={`${plotW - px(6)},${-marginM + px(3)} ${plotW - px(11)},${-marginM + px(13)} ${plotW - px(1)},${-marginM + px(13)}`}
                />
                <text
                  x={plotW - px(6)}
                  y={-marginM + px(24)}
                  textAnchor="middle"
                  fontSize={px(10)}
                  fontWeight={700}
                >
                  N
                </text>
              </g>

              {/* Scale bar — bottom-left, in the margin */}
              <g stroke="var(--ink-2)" strokeWidth={px(1.5)} pointerEvents="none">
                <line x1={0} y1={plotD + marginM * 0.55} x2={scaleLen} y2={plotD + marginM * 0.55} />
                <line x1={0} y1={plotD + marginM * 0.55 - px(4)} x2={0} y2={plotD + marginM * 0.55 + px(4)} />
                <line
                  x1={scaleLen}
                  y1={plotD + marginM * 0.55 - px(4)}
                  x2={scaleLen}
                  y2={plotD + marginM * 0.55 + px(4)}
                />
              </g>
              <text
                x={scaleLen + px(7)}
                y={plotD + marginM * 0.55}
                dominantBaseline="central"
                fontSize={px(10)}
                fill="var(--ink-2)"
                className="mono-num"
                pointerEvents="none"
              >
                {num(scaleLen)} m
              </text>
            </svg>
          )}
        </div>

        {usesPresent.length > 0 && (
          <div className="legend" style={{ marginTop: 12 }}>
            {usesPresent.map((u) => (
              <span key={u} className="legend-item">
                <span className="legend-swatch" style={{ background: LU_VAR[u] }} />
                {LAND_USE_LABELS[u]}
              </span>
            ))}
          </div>
        )}

        <DrawingExport brief={brief} scenario={scenario} rules={rules} />
      </div>

      {/* ----------------------------- Plan facts ------------------------------ */}
      <div className="card card-pad">
        <h3 style={{ fontSize: 15, marginBottom: 14 }}>Plan facts</h3>

        <div className="section-title">Land-use mix</div>
        <div ref={barRef}>
          {luTotalPct > 0 && (
            <svg
              viewBox={`0 0 ${barWidth} 44`}
              width="100%"
              height={44}
              style={{ display: 'block' }}
              role="img"
              aria-label="Land-use share of plot area"
            >
              <defs>
                <clipPath id={barId}>
                  <rect x={0} y={0} width={barWidth} height={26} rx={5} />
                </clipPath>
              </defs>
              <g clipPath={`url(#${barId})`}>
                {(() => {
                  let cursor = 0
                  return luEntries.map((l) => {
                    const w = (l.pct / luTotalPct) * barWidth
                    const x = cursor
                    cursor += w
                    return (
                      <rect
                        key={l.use}
                        x={x}
                        y={0}
                        width={w}
                        height={26}
                        fill={LU_VAR[l.use]}
                        stroke="var(--surface)"
                        strokeWidth={2}
                      >
                        <title>
                          {`${LAND_USE_LABELS[l.use]} — ${pct(l.pct)} · ${sqm(l.areaSqm)}`}
                        </title>
                      </rect>
                    )
                  })
                })()}
              </g>
              {(() => {
                let cursor = 0
                return luEntries.map((l) => {
                  const w = (l.pct / luTotalPct) * barWidth
                  const cx = cursor + w / 2
                  cursor += w
                  if (l.pct < 8) return null // direct labels only on readable segments
                  return (
                    <text
                      key={l.use}
                      x={cx}
                      y={40}
                      textAnchor="middle"
                      fontSize={11}
                      fill="var(--ink-2)"
                      className="mono-num"
                    >
                      {pct(l.pct)}
                    </text>
                  )
                })
              })()}
            </svg>
          )}
        </div>

        <div style={{ marginTop: 10 }}>
          {luEntries.map((l) => (
            <div key={l.use} style={{ ...rowStyle, padding: '5px 0', borderBottom: 'none', fontSize: 12.5 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--ink-2)' }}>
                <span className="legend-swatch" style={{ background: LU_VAR[l.use] }} />
                {LAND_USE_LABELS[l.use]}
              </span>
              <span className="mono-num" style={{ whiteSpace: 'nowrap' }}>
                {sqm(l.areaSqm)} · {pct(l.pct)}
              </span>
            </div>
          ))}
        </div>

        <hr className="divider" />

        <div className="section-title">Key metrics</div>
        <div>
          <div style={rowStyle}>
            <span className="muted">FAR (proposed)</span>
            <b className="mono-num">{scenario.far.toFixed(2)}</b>
          </div>
          <div style={rowStyle}>
            <span className="muted">Built-up area</span>
            <b className="mono-num" style={{ textAlign: 'right' }}>
              {sqm(scenario.builtUpAreaSqm)} · {sqft(scenario.builtUpAreaSqm)}
            </b>
          </div>
          <div style={rowStyle}>
            <span className="muted">Saleable area</span>
            <b className="mono-num" style={{ textAlign: 'right' }}>
              {sqm(scenario.saleableAreaSqm)} · {sqft(scenario.saleableAreaSqm)}
            </b>
          </div>
          <div style={rowStyle}>
            <span className="muted">Tallest block</span>
            <b className="mono-num">
              {scenario.maxFloors > 0 ? `G+${scenario.maxFloors - 1} (${num(scenario.maxFloors)} floors)` : '—'}
            </b>
          </div>
          <div style={{ ...rowStyle, borderBottom: 'none' }}>
            <span className="muted">Total units</span>
            <b className="mono-num">{num(scenario.totalUnits)}</b>
          </div>
        </div>

        {scenario.unitMix.length > 0 && (
          <>
            <hr className="divider" />
            <div className="section-title">Unit mix</div>
            <table className="table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th className="num">Units</th>
                  <th className="num">Avg size</th>
                </tr>
              </thead>
              <tbody>
                {scenario.unitMix.map((u) => (
                  <tr key={u.type}>
                    <td>{u.type}</td>
                    <td className="num">{num(u.count)}</td>
                    <td className="num">{sqft(u.avgSizeSqm)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {scenario.highlights.length > 0 && (
          <>
            <hr className="divider" />
            <div className="section-title">Highlights</div>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {scenario.highlights.map((h) => (
                <li key={h} style={{ display: 'flex', gap: 8, padding: '4px 0', fontSize: 13.5 }}>
                  <span aria-hidden style={{ color: 'var(--accent)' }}>✦</span>
                  <span>{h}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {/* ------------------------- Fixed hover tooltip ------------------------- */}
      {hover && hoverParcel && (
        <div
          style={{
            position: 'fixed',
            left: hover.x,
            top: hover.y,
            zIndex: 60,
            pointerEvents: 'none',
            maxWidth: 236,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            boxShadow: 'var(--shadow)',
            padding: '8px 12px',
            fontSize: 12.5,
            lineHeight: 1.45,
          }}
        >
          <div style={{ fontWeight: 700 }}>{hoverParcel.label ?? LAND_USE_LABELS[hoverParcel.use]}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--ink-2)' }}>
            <span className="legend-swatch" style={{ background: LU_VAR[hoverParcel.use] }} />
            {LAND_USE_LABELS[hoverParcel.use]}
          </div>
          <div className="mono-num" style={{ color: 'var(--ink-2)' }}>
            {sqm(hoverParcel.w * hoverParcel.h)} · {acres(hoverParcel.w * hoverParcel.h)}
          </div>
          {hoverParcel.floors && hoverParcel.floors > 0 ? (
            <div className="mono-num" style={{ color: 'var(--ink-2)' }}>
              G+{hoverParcel.floors - 1} · {num(hoverParcel.floors)} floors
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}
