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
  const greenEast = model.paths.find((path) => path.id === 'f.green-west')
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
/**
 * The one-click preview carries the SAME poster hierarchy as the presentation
 * PDF (ledger 055 P0-2): project identity, hero numbers, integrated legend,
 * typical-plot inset with its two car spaces, and ONE honesty footer.
 * Provenance digests stay as a small verification strip at the foot, not as
 * the leading message.
 *
 * Every element, attribute and CSS property below stays inside the frozen
 * preview gate's closed-world vocabulary (verify.ts) — the gate is Sol's and
 * is not touched by this pass.
 */
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
  // Two per row, matching the PDF's 2 x 3 hierarchy. The frozen CSS
  // vocabulary has no flex-wrap, so the rows are explicit (058 P0-3).
  const statRows: string[] = []
  for (let index = 0; index < presentationModel.stats.length; index += 2) {
    const pair = presentationModel.stats.slice(index, index + 2)
    statRows.push(
      `<div class="stats">${pair
        .map(
          (stat) =>
            `<div class="stat"><div class="k">${escapeXml(stat.label)}</div>`
            + `<div class="v">${escapeXml(stat.value)}</div></div>`,
        )
        .join('')}</div>`,
    )
  }
  const statCells = statRows.join('\n')
  // The verdict line keeps the gate-checked "</b> N DU<" shape.
  const verdict = [
    ['Requested (client intent)', fact('fact.requested-du')],
    ['Density ceiling', fact('fact.density-ceiling')],
    ['Placed in this layout', fact('fact.placed-du')],
    ['Shortfall against request', fact('fact.shortfall-du')],
  ]
    // Plain <div> rows: the frozen preview tests inject their hostile cases
    // at these exact markup anchors, so the shape stays injectable.
    .map(([label, value]) => `<div><b>${escapeXml(String(label))}:</b> ${value} DU</div>`)
    .join('\n')

  return `<!doctype html>
<meta charset="utf-8">
<title>Community One — DEMO preview (${escapeXml(report.slice)})</title>
<style>
  body { background:#e9e7df; margin:0; padding:26px; font-family:Georgia,'Times New Roman',serif; color:#33312b; display:flex; justify-content:center; }
  .sheet { background:#fbfaf6; box-shadow:0 2px 18px rgba(0,0,0,.2); padding:30px; max-width:1500px; width:100%; }
  h1 { letter-spacing:9px; font-size:40px; color:#26241e; margin:0; font-weight:bold; }
  h2 { font-size:13px; letter-spacing:3px; color:#7a7568; margin:0; margin-top:6px; font-weight:normal; }
  .rule { border-top:2px solid #a3552f; margin-top:12px; margin-bottom:16px; height:0px; }
  .layout { display:flex; gap:26px; align-items:flex-start; }
  .map { flex:3; border:1px solid #d5d1c4; background:#f8f7f2; }
  svg { width:100%; height:auto; display:block; }
  aside { flex:1; max-width:300px; }
  .stats { display:flex; gap:14px; margin-bottom:10px; }
  .stat { flex:1; width:50%; word-break:break-word; }
  .k { font-size:10px; letter-spacing:2px; color:#8a8577; }
  .v { font-size:17px; font-weight:bold; color:#1d1b16; margin-top:2px; word-break:break-word; }
  .block { border-top:1px solid #ded9cc; padding-top:12px; margin-top:14px; }
  .h { font-size:11px; letter-spacing:3px; color:#4b483f; font-weight:bold; margin-bottom:8px; }
  .row { display:flex; align-items:center; gap:9px; font-size:12px; margin-top:5px; }
  .program div { font-size:12px; margin-top:5px; }
  .swatch { width:26px; height:13px; border:1px solid; display:inline-block; }
  .unit { display:flex; gap:12px; align-items:center; margin-top:8px; }
  .plot { width:90px; height:132px; background:#e6d09e; border:1px solid #8c6b3d; padding:5px; }
  .house { width:78px; height:96px; background:#c28c5c; border:1px solid #73502f; padding-top:5px; }
  .bay { width:44px; height:34px; background:#dcd8d0; border:1px solid #9e9a92; margin:4px; }
  .yard { width:78px; height:20px; background:#8fbf63; border:1px solid #5f8a3c; margin-top:4px; }
  .cap { font-size:11px; color:#5c584d; }
  .cap b { color:#26241e; }
  .foot { border-top:1px solid #ded9cc; margin-top:18px; padding-top:10px; display:flex; justify-content:space-between; align-items:center; gap:16px; }
  .stamp { display:inline-block; border:2px solid #a3552f; color:#a3552f; font-weight:bold; padding:5px; font-size:12px; letter-spacing:1px; }
  .note { font-size:11px; color:#6b675a; font-style:italic; margin-top:6px; }
  .digests { font-family:monospace; font-size:9px; color:#97928a; word-break:break-all; margin-top:10px; }
</style>
<div class="sheet">
  <h1>COMMUNITY ONE</h1>
  <h2>TOWNHOUSE MASTERPLAN — DEMO · ${escapeXml(report.slice)}</h2>
  <div class="rule"></div>
  <div class="layout">
    <div class="map">
${svg}
    </div>
    <aside>
${statCells}
      <div class="block">
        <div class="h">TYPICAL TOWNHOUSE PLOT</div>
        <div class="unit">
          <div class="plot">
            <div class="house">
${'              <div class="bay"></div>\n'.repeat(0)}${new Array(presentationModel.stiltBaysPerHome).fill('              <div class="bay"></div>').join('\n')}
            </div>
            <div class="yard"></div>
          </div>
          <div class="cap">
${escapeXml(presentationModel.insetCaption)}
          </div>
        </div>
      </div>
      <div class="block">
        <div class="h">NEIGHBOURHOODS</div>
${presentationModel.placeLabels.map((label) => `        <div class="row">${escapeXml(label.text)}</div>`).join('\n')}
      </div>
      <div class="block">
        <div class="h">LEGEND</div>
${legendRows}
      </div>
      <div class="block program">
        <div class="h">PROGRAM</div>
${verdict}
        <div><b>Classification:</b> ${escapeXml(report.classification)}</div>
        <div><b>Sanctionable today:</b> unknown</div>
        <div class="note">${escapeXml(report.actionability.reason)}</div>
      </div>
    </aside>
  </div>
  <div class="foot">
    <div class="stamp">${escapeXml(report.stamp)}</div>
    <div class="cap">${escapeXml(presentationModel.footerLine)}</div>
  </div>
  <div class="digests">
    fixture ${report.fixtureDigest} · rulebook ${report.rulebookDigest} · geometry ${report.geometryDigest}
  </div>
</div>
`
}
