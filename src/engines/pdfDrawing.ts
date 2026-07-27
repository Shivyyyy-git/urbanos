// ---------------------------------------------------------------------------
// UrbanOS MVP — PDF writer (Module 5, part 3 of 3).
//
// Serialises a Drawing to a single-page vector PDF laid out as a real drawing
// sheet: true paper size, true 1:N scale, filled land-use areas, dimensions,
// north arrow, scale bar and title block. This is NOT a screenshot of the
// on-screen SVG — it is generated from the same geometry the DXF carries, so
// a printed sheet and the CAD file agree.
//
// Everything is written as 7-bit ASCII (see asciiFold) so that byte offsets in
// the xref table equal character offsets.
// ---------------------------------------------------------------------------
import type { Drawing, DrawEntity, DrawLayer, LayerDef } from './drawing'
import { asciiFold } from './dxf'

const PT_PER_MM = 72 / 25.4

/** Helvetica advance widths per 1000 units, characters 32-126. Needed to
 * centre and right-align text — PDF has no alignment of its own. */
const HELV_W = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556,
  556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667,
  611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667,
  667, 611, 278, 278, 278, 469, 556, 333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500,
  222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584,
]

/** Cap height as a fraction of em for Helvetica. Drawing text heights are cap
 * heights (the CAD convention), so the font size is derived from this. */
const CAP_RATIO = 0.717

function textWidthPt(s: string, sizePt: number): number {
  let w = 0
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i)
    w += c >= 32 && c <= 126 ? HELV_W[c - 32] : 556
  }
  return (w / 1000) * sizePt
}

/** Escape the three characters that are special inside a PDF literal string. */
function pdfString(s: string): string {
  return s.replace(/[\\()]/g, (m) => `\\${m}`)
}

function n(v: number): string {
  return (Math.round(v * 1000) / 1000).toFixed(3)
}

/** Painter's order — area fills first, annotation last, so nothing important
 * disappears under a later parcel. The DXF keeps the authoring order instead;
 * CAD has real layer control and does not need this. */
const PAINT_ORDER: DrawLayer[] = [
  'ROAD',
  'PARKING',
  'OPEN-SPACE',
  'AMENITY',
  'UTILITY',
  'PARCEL',
  'BUILDING',
  'SETBACK',
  'PLOT-BOUNDARY',
  'DIMENSIONS',
  'NORTH-SCALE',
  'TITLEBLOCK',
  'TEXT',
]

function rgb(c: [number, number, number]): string {
  return `${n(c[0])} ${n(c[1])} ${n(c[2])}`
}

export function toPDF(d: Drawing): Uint8Array {
  const sheetWpt = d.sheet.widthMm * PT_PER_MM
  const sheetHpt = d.sheet.heightMm * PT_PER_MM

  // ---- model metres -> sheet points, at the drawing's own 1:N scale ---------
  const mmPerM = 1000 / d.scale
  const extWmm = (d.max[0] - d.min[0]) * mmPerM
  const extHmm = (d.max[1] - d.min[1]) * mmPerM
  // The scale ladder in buildDrawing already guarantees a fit; this only
  // guards a pathological extent rather than silently rescaling in practice.
  const fit = Math.min(
    1,
    (d.sheet.widthMm - 2 * d.marginMm) / Math.max(extWmm, 1),
    (d.sheet.heightMm - 2 * d.marginMm) / Math.max(extHmm, 1),
  )
  if (fit < 0.999) {
    throw new Error(
      `Drawing extents do not fit ${d.sheet.name} at the declared 1:${d.scale} scale.`,
    )
  }
  const offXmm = (d.sheet.widthMm - extWmm * fit) / 2
  const offYmm = (d.sheet.heightMm - extHmm * fit) / 2
  const X = (x: number) => (offXmm + (x - d.min[0]) * mmPerM * fit) * PT_PER_MM
  const Y = (y: number) => (offYmm + (y - d.min[1]) * mmPerM * fit) * PT_PER_MM
  /** Model metres -> points, for lengths (text heights). */
  const L = (m: number) => m * mmPerM * fit * PT_PER_MM

  const byName = new Map<DrawLayer, LayerDef>(d.layers.map((l) => [l.name, l]))
  const rank = new Map<DrawLayer, number>(PAINT_ORDER.map((nm, i) => [nm, i]))
  const ordered = d.entities
    .map((e, i) => ({ e, i }))
    .sort((a, b) => {
      const ra = rank.get(a.e.layer) ?? 99
      const rb = rank.get(b.e.layer) ?? 99
      return ra !== rb ? ra - rb : a.i - b.i // stable within a layer
    })
    .map((x) => x.e)

  // ------------------------------ content stream ----------------------------
  const ops: string[] = []
  // Sheet border — a plotted drawing always has one.
  const bl = d.marginMm * PT_PER_MM
  ops.push('q', '0.25 w', '0.4 0.4 0.38 RG')
  ops.push(
    `${n(bl)} ${n(bl)} ${n(sheetWpt - 2 * bl)} ${n(sheetHpt - 2 * bl)} re S`,
  )
  ops.push('Q')

  let lastFontSize = -1
  const drawEntity = (e: DrawEntity) => {
    const layer = byName.get(e.layer)
    if (!layer) return
    const stroke = rgb(layer.rgb)
    const lw = Math.max(layer.lwMm * PT_PER_MM, 0.24)

    switch (e.k) {
      case 'polyline': {
        if (e.pts.length < 2) return
        ops.push('q', `${n(lw)} w`, `${stroke} RG`)
        if (layer.fill) ops.push(`${rgb(layer.fill)} rg`)
        if (layer.dashed) {
          const dash = 3 * PT_PER_MM
          ops.push(`[${n(dash)} ${n(dash * 0.6)}] 0 d`)
        }
        const p0 = e.pts[0]
        ops.push(`${n(X(p0[0]))} ${n(Y(p0[1]))} m`)
        for (let i = 1; i < e.pts.length; i++) {
          ops.push(`${n(X(e.pts[i][0]))} ${n(Y(e.pts[i][1]))} l`)
        }
        if (e.closed) ops.push('h')
        ops.push(e.closed && layer.fill ? 'B' : 'S')
        ops.push('Q')
        return
      }

      case 'line': {
        ops.push('q', `${n(lw)} w`, `${stroke} RG`)
        if (layer.dashed) {
          const dash = 3 * PT_PER_MM
          ops.push(`[${n(dash)} ${n(dash * 0.6)}] 0 d`)
        }
        ops.push(
          `${n(X(e.a[0]))} ${n(Y(e.a[1]))} m`,
          `${n(X(e.b[0]))} ${n(Y(e.b[1]))} l`,
          'S',
          'Q',
        )
        return
      }

      case 'circle': {
        // Four Bézier arcs — PDF has no circle primitive.
        const k = 0.5523
        const cx = X(e.c[0])
        const cy = Y(e.c[1])
        const r = L(e.r)
        ops.push('q', `${n(lw)} w`, `${stroke} RG`)
        if (layer.fill) ops.push(`${rgb(layer.fill)} rg`)
        ops.push(`${n(cx + r)} ${n(cy)} m`)
        ops.push(
          `${n(cx + r)} ${n(cy + r * k)} ${n(cx + r * k)} ${n(cy + r)} ${n(cx)} ${n(cy + r)} c`,
          `${n(cx - r * k)} ${n(cy + r)} ${n(cx - r)} ${n(cy + r * k)} ${n(cx - r)} ${n(cy)} c`,
          `${n(cx - r)} ${n(cy - r * k)} ${n(cx - r * k)} ${n(cy - r)} ${n(cx)} ${n(cy - r)} c`,
          `${n(cx + r * k)} ${n(cy - r)} ${n(cx + r)} ${n(cy - r * k)} ${n(cx + r)} ${n(cy)} c`,
        )
        ops.push(layer.fill ? 'B' : 'S', 'Q')
        return
      }

      case 'solid': {
        if (e.pts.length < 3) return
        const fill = layer.fill ?? layer.rgb
        ops.push('q', `${rgb(fill)} rg`)
        // Drawing-model SOLIDs use the DXF bowtie order (edge 1-2, then 3-4),
        // so a quad must be walked 0,1,3,2 to trace its outline.
        const order = e.pts.length >= 4 ? [0, 1, 3, 2] : [0, 1, 2]
        ops.push(`${n(X(e.pts[order[0]][0]))} ${n(Y(e.pts[order[0]][1]))} m`)
        for (let i = 1; i < order.length; i++) {
          ops.push(`${n(X(e.pts[order[i]][0]))} ${n(Y(e.pts[order[i]][1]))} l`)
        }
        ops.push('h', 'f', 'Q')
        return
      }

      case 'text': {
        const txt = asciiFold(e.text)
        if (!txt) return
        const capPt = L(e.h)
        const size = capPt / CAP_RATIO
        if (size < 1.2) return // below legibility at this scale — skip, don't smudge
        const w = textWidthPt(txt, size)
        const font = e.bold ? '/F2' : '/F1'
        ops.push('q', `${rgb(layer.rgb)} rg`, 'BT')
        if (size !== lastFontSize) lastFontSize = size
        ops.push(`${font} ${n(size)} Tf`)
        if (e.rot === 90) {
          // Rotated text: shift the baseline off the centre line, then run up.
          const bx = X(e.at[0]) + capPt / 2
          const by = Y(e.at[1]) - (e.align === 'center' ? w / 2 : 0)
          ops.push(`0 1 -1 0 ${n(bx)} ${n(by)} Tm`)
        } else {
          const ax =
            e.align === 'left' ? X(e.at[0]) : e.align === 'center' ? X(e.at[0]) - w / 2 : X(e.at[0]) - w
          ops.push(`1 0 0 1 ${n(ax)} ${n(Y(e.at[1]) - capPt / 2)} Tm`)
        }
        ops.push(`(${pdfString(txt)}) Tj`, 'ET', 'Q')
        return
      }
    }
  }

  for (const e of ordered) drawEntity(e)
  const content = ops.join('\n')

  // -------------------------------- assemble --------------------------------
  const objects: string[] = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${n(sheetWpt)} ${n(sheetHpt)}] ` +
      `/Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>`,
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
    `<< /Title (${pdfString(asciiFold(d.meta.projectName))}) ` +
      `/Subject (${pdfString(asciiFold(`${d.meta.scenarioName} - 1:${d.scale} @ ${d.sheet.name}`))}) ` +
      `/Creator (UrbanOS) /Producer (UrbanOS drawing engine) >>`,
  ]

  let pdf = '%PDF-1.4\n'
  const offsets: number[] = []
  objects.forEach((body, i) => {
    offsets.push(pdf.length)
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`
  })

  const xrefAt = pdf.length
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  for (const off of offsets) pdf += `${String(off).padStart(10, '0')} 00000 n \n`
  pdf +=
    `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info ${objects.length} 0 R >>\n` +
    `startxref\n${xrefAt}\n%%EOF\n`

  // ASCII throughout, so one byte per character and the xref offsets hold.
  const bytes = new Uint8Array(pdf.length)
  for (let i = 0; i < pdf.length; i++) bytes[i] = pdf.charCodeAt(i) & 0xff
  return bytes
}
