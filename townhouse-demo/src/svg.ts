// SVG renderer + one-click preview page (ledger 036: Shivam's "see it
// locally" requirement). The SVG is generated from the SAME presentation
// drawing model as the PDF — no separate geometry path — and the page is
// fully self-contained (inline CSS, inline SVG, no external assets), so
// double-clicking townhouse-demo/preview.DEMO.html always shows the latest build.
// The visual bar it works toward is collab/PresentationMapTarget.html (a
// hand-drawn mock); this page is engine output and says so.

import { DEMO_LAYERS, type DemoDrawingModel, type DemoLayerStyle } from './drawing.ts'
import { fail } from './errors.ts'
import type { CommunityEnvelopeReport } from './report.ts'

const PX_PER_METRE = 4

function hex(rgb: readonly [number, number, number]): string {
  return `#${rgb.map((channel) => Math.round(channel * 255).toString(16).padStart(2, '0')).join('')}`
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function style(layer: string): DemoLayerStyle {
  const found = DEMO_LAYERS.find((candidate) => candidate.name === layer)
  if (!found) fail('E_GEOMETRY_PARITY', `Unknown layer "${layer}" in SVG renderer.`)
  return found
}

export function communityDrawingToSvg(model: DemoDrawingModel): string {
  const { bounds } = model
  const width = (bounds.maxX - bounds.minX) * PX_PER_METRE
  const height = (bounds.maxY - bounds.minY) * PX_PER_METRE
  const px = (x: number): number => (x - bounds.minX) * PX_PER_METRE
  const py = (y: number): number => (bounds.maxY - y) * PX_PER_METRE
  const parts: string[] = []
  parts.push(
    `<svg viewBox="0 0 ${width.toFixed(2)} ${height.toFixed(2)}" xmlns="http://www.w3.org/2000/svg" role="img" `
      + `aria-label="${escapeXml(model.title)}">`,
  )
  for (const path of model.paths) {
    const layerStyle = style(path.layer)
    const points = path.points
      .map((point) => `${px(point[0]).toFixed(2)},${py(point[1]).toFixed(2)}`)
      .join(' ')
    const fill = layerStyle.fill && path.closed ? hex(layerStyle.fill) : 'none'
    const dash = layerStyle.dashed ? ' stroke-dasharray="10 6"' : ''
    const tag = path.closed ? 'polygon' : 'polyline'
    parts.push(
      `<${tag} data-id="${escapeXml(path.id)}" points="${points}" fill="${fill}" `
        + `stroke="${hex(layerStyle.stroke)}" stroke-width="${Math.max(layerStyle.lineWeightMm * 2, 0.6).toFixed(2)}"${dash}/>`,
    )
  }
  for (const text of model.texts) {
    if (text.id === 'anno.watermark-demo') continue
    const layerStyle = style(text.layer)
    const anchor = text.align === 'left' ? 'start' : text.align === 'center' ? 'middle' : 'end'
    const size = text.heightMm * 3
    const x = px(text.at[0])
    const y = py(text.at[1])
    const rotate = text.rotationDegrees !== 0 ? ` transform="rotate(${-text.rotationDegrees} ${x.toFixed(2)} ${y.toFixed(2)})"` : ''
    parts.push(
      `<text data-id="${escapeXml(text.id)}" x="${x.toFixed(2)}" y="${y.toFixed(2)}" font-size="${size.toFixed(1)}" `
        + `text-anchor="${anchor}" fill="${hex(layerStyle.stroke)}"${text.bold ? ' font-weight="bold"' : ''}${rotate}>`
        + `${escapeXml(text.text)}</text>`,
    )
  }
  // Watermark on top so it cannot be occluded, positioned over the east
  // green polygon so it crosses no annotation, label, or club/pool geometry
  // (ledger 045 §4); light so it hides nothing beneath it.
  const greenEast = model.paths.find((path) => path.id === 'f.green-east')
  let watermarkX = width / 2
  let watermarkY = height / 2
  let watermarkSize = height / 6
  if (greenEast) {
    const xs = greenEast.points.map((point) => px(point[0]))
    const ys = greenEast.points.map((point) => py(point[1]))
    watermarkX = (Math.min(...xs) + Math.max(...xs)) / 2
    const bandTop = Math.min(...ys)
    const bandHeight = Math.max(...ys) - bandTop
    watermarkSize = Math.min(Math.max(bandHeight * 0.55, 60), 110)
    watermarkY = bandTop + bandHeight / 2 + watermarkSize * 0.36
  }
  parts.push(
    `<text x="${watermarkX.toFixed(2)}" y="${watermarkY.toFixed(2)}" font-size="${watermarkSize.toFixed(0)}" `
      + 'text-anchor="middle" fill="#8f8f8f" opacity="0.34" font-weight="bold" letter-spacing="14">DEMO</text>',
  )
  parts.push('</svg>')
  return parts.join('\n')
}

export function buildPreviewHtml(
  report: CommunityEnvelopeReport,
  presentationModel: DemoDrawingModel,
): string {
  const svg = communityDrawingToSvg(presentationModel)
  const fact = (id: string): number => {
    const found = report.facts.find((candidate) => candidate.id === id)
    if (!found) fail('E_CITATION_MISSING', `Preview needs fact ${id}.`)
    return found!.value
  }
  const legendRows = presentationModel.legend
    .map((item) => {
      const layerStyle = style(item.layer)
      const fill = layerStyle.fill ?? layerStyle.stroke
      return `<div class="row"><span class="swatch" style="background:${hex(fill)};border-color:${hex(layerStyle.stroke)}"></span>${escapeXml(item.label)}</div>`
    })
    .join('\n')
  return `<!doctype html>
<meta charset="utf-8">
<title>Community One — DEMO preview (${escapeXml(report.slice)})</title>
<style>
  body { background:#e9e7df; margin:0; padding:24px; font-family:Georgia,'Times New Roman',serif; color:#3d3b33; display:flex; justify-content:center; }
  .sheet { background:#f8f7f2; box-shadow:0 2px 14px rgba(0,0,0,.18); padding:28px 32px; max-width:1160px; width:100%; }
  h1 { letter-spacing:6px; font-size:30px; color:#2f2d26; margin:0 0 4px; }
  .sub { color:#6b675a; font-size:14px; margin-bottom:2px; }
  .stamp { display:inline-block; border:2px solid #a3552f; color:#a3552f; font-weight:bold; padding:4px 10px; margin:10px 0; letter-spacing:1px; font-size:13px; }
  .layout { display:flex; gap:20px; align-items:flex-start; }
  .map { flex:1; border:1px solid #cfccc1; }
  svg { width:100%; height:auto; display:block; background:#f8f7f2; }
  aside { width:230px; font-size:12px; }
  aside h2 { font-size:13px; letter-spacing:2px; margin:0 0 8px; }
  .row { display:flex; align-items:center; gap:8px; margin:4px 0; }
  .swatch { width:22px; height:12px; border:1px solid; display:inline-block; }
  .nums { margin-top:14px; border-top:1px solid #cfccc1; padding-top:10px; }
  .nums div { margin:3px 0; }
  .digests { margin-top:14px; font-family:monospace; font-size:9.5px; color:#8a8678; word-break:break-all; }
  .note { margin-top:12px; color:#6b675a; font-style:italic; }
</style>
<div class="sheet">
  <h1>COMMUNITY ONE</h1>
  <div class="sub">Townhouse community &middot; site ${fact('fact.site-width')} &times; ${fact('fact.site-depth')} m (${fact('fact.site-area-acres').toFixed(3)} acres) &middot; ${escapeXml(report.slice)} &middot; engine output preview</div>
  <div class="stamp">${escapeXml(report.stamp)}</div>
  <div class="layout">
    <div class="map">
${svg}
    </div>
    <aside>
      <h2>LEGEND</h2>
${legendRows}
      <div class="nums">
        <div><b>Requested (intent):</b> ${fact('fact.requested-du')} DU</div>
        <div><b>Density ceiling:</b> ${fact('fact.density-ceiling')} DU</div>
        <div><b>Placed in this layout:</b> ${fact('fact.placed-du')} DU</div>
        <div><b>Shortfall:</b> ${fact('fact.shortfall-du')} DU</div>
        <div><b>Parking required:</b> ${fact('fact.parking-required')} ECS</div>
      </div>
      <div class="nums">
        <div><b>Classification:</b> ${escapeXml(report.classification)}</div>
        <div><b>Sanctionable today:</b> ${escapeXml(report.actionability.sanctionableToday)}</div>
        <div class="note">${escapeXml(report.actionability.reason)}</div>
      </div>
      <div class="digests">
        fixture ${report.fixtureDigest}<br>
        rulebook ${report.rulebookDigest}<br>
        geometry ${report.geometryDigest}
      </div>
      <div class="note">DEMO — every value illustrative and unverified; no real jurisdiction. This page is regenerated by the engine on every build (ledger 036); it is real output, not the hand-drawn design target.</div>
    </aside>
  </div>
</div>
`
}
