// ---------------------------------------------------------------------------
// UrbanOS MVP — DXF writer (Module 5, part 2 of 3).
//
// Serialises a Drawing to ASCII DXF R12 (AC1009). R12 is deliberate: it needs
// no handle table, no BLOCK_RECORD table and no OBJECTS section, so the files
// are small and open cleanly in AutoCAD, BricsCAD, LibreCAD, QGIS, Revit and
// SketchUp. Later formats buy features this drawing does not use and add ways
// for the file to be rejected.
//
// Units are metres ($INSUNITS = 6) and geometry is 1:1 in model space, so the
// receiving CAD environment measures true site dimensions.
// ---------------------------------------------------------------------------
import type { Drawing, DrawEntity, DrawLayer, Pt } from './drawing'

/** DXF group code + value, one per line. */
function g(code: number, value: string | number): string {
  return `${code}\n${value}\n`
}

/** DXF reals are written with fixed precision — millimetre resolution is more
 * than enough for a site plan and keeps the file diff-stable. */
function real(v: number): string {
  return (Math.round(v * 1000) / 1000).toFixed(3)
}

/** R12 is a 7-bit format in practice. Fold the few non-ASCII characters the
 * planning engine and title block can produce so no reader has to guess an
 * encoding. */
export function asciiFold(s: string): string {
  return s
    .replace(/[₹]/g, 'Rs ')
    .replace(/[×✕]/g, 'x')
    .replace(/[·•]/g, '-')
    .replace(/[–—]/g, '-')
    .replace(/[°]/g, ' deg')
    .replace(/[²]/g, '2')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, ' ')
    .replace(/[^\x20-\x7E]/g, '')
    .trim()
}

function header(d: Drawing): string {
  return (
    g(0, 'SECTION') +
    g(2, 'HEADER') +
    g(9, '$ACADVER') +
    g(1, 'AC1009') +
    // 6 = metres. Makes "insert this into my site model" behave.
    g(9, '$INSUNITS') +
    g(70, 6) +
    g(9, '$EXTMIN') +
    g(10, real(d.min[0])) +
    g(20, real(d.min[1])) +
    g(30, real(0)) +
    g(9, '$EXTMAX') +
    g(10, real(d.max[0])) +
    g(20, real(d.max[1])) +
    g(30, real(0)) +
    g(9, '$LIMMIN') +
    g(10, real(d.min[0])) +
    g(20, real(d.min[1])) +
    g(9, '$LIMMAX') +
    g(10, real(d.max[0])) +
    g(20, real(d.max[1])) +
    g(0, 'ENDSEC')
  )
}

function tables(d: Drawing): string {
  let s = g(0, 'SECTION') + g(2, 'TABLES')

  // ---- Linetypes -----------------------------------------------------------
  s += g(0, 'TABLE') + g(2, 'LTYPE') + g(70, 2)
  s +=
    g(0, 'LTYPE') +
    g(2, 'CONTINUOUS') +
    g(70, 0) +
    g(3, 'Solid line') +
    g(72, 65) +
    g(73, 0) +
    g(40, real(0))
  // Dash pattern in DRAWING units (metres) — scaled to the paper scale so the
  // dashes read the same on any sheet.
  const dash = (d.scale * 3) / 1000
  s +=
    g(0, 'LTYPE') +
    g(2, 'DASHED') +
    g(70, 0) +
    g(3, '__ __ __ __') +
    g(72, 65) +
    g(73, 2) +
    g(40, real(dash * 1.5)) +
    g(49, real(dash)) +
    g(49, real(-dash * 0.5))
  s += g(0, 'ENDTAB')

  // ---- Layers --------------------------------------------------------------
  s += g(0, 'TABLE') + g(2, 'LAYER') + g(70, d.layers.length)
  for (const l of d.layers) {
    s +=
      g(0, 'LAYER') +
      g(2, l.name) +
      g(70, 0) +
      g(62, l.aci) +
      g(6, l.dashed ? 'DASHED' : 'CONTINUOUS')
  }
  s += g(0, 'ENDTAB')

  // ---- Text style ----------------------------------------------------------
  s += g(0, 'TABLE') + g(2, 'STYLE') + g(70, 1)
  s +=
    g(0, 'STYLE') +
    g(2, 'STANDARD') +
    g(70, 0) +
    g(40, real(0)) + // 0 = height set per-entity
    g(41, real(1)) +
    g(50, real(0)) +
    g(71, 0) +
    g(42, real(2.5)) +
    g(3, 'txt') +
    g(4, '')
  s += g(0, 'ENDTAB')

  return s + g(0, 'ENDSEC')
}

function polyline(layer: DrawLayer, pts: Pt[], closed: boolean): string {
  let s =
    g(0, 'POLYLINE') +
    g(8, layer) +
    g(66, 1) + // vertices follow — required in R12
    g(70, closed ? 1 : 0) +
    g(10, real(0)) +
    g(20, real(0)) +
    g(30, real(0))
  for (const p of pts) {
    s += g(0, 'VERTEX') + g(8, layer) + g(10, real(p[0])) + g(20, real(p[1])) + g(30, real(0))
  }
  return s + g(0, 'SEQEND') + g(8, layer)
}

function entity(e: DrawEntity): string {
  switch (e.k) {
    case 'polyline':
      return polyline(e.layer, e.pts, e.closed)

    case 'line':
      return (
        g(0, 'LINE') +
        g(8, e.layer) +
        g(10, real(e.a[0])) +
        g(20, real(e.a[1])) +
        g(30, real(0)) +
        g(11, real(e.b[0])) +
        g(21, real(e.b[1])) +
        g(31, real(0))
      )

    case 'circle':
      return (
        g(0, 'CIRCLE') +
        g(8, e.layer) +
        g(10, real(e.c[0])) +
        g(20, real(e.c[1])) +
        g(30, real(0)) +
        g(40, real(e.r))
      )

    case 'solid': {
      // SOLID takes four corners in "bowtie" order: first edge (1,2), then the
      // opposite edge (3,4). A triangle repeats its last corner.
      const p = e.pts
      const q = [p[0], p[1], p[2], p[3] ?? p[2]]
      let s = g(0, 'SOLID') + g(8, e.layer)
      q.forEach((pt, i) => {
        s += g(10 + i, real(pt[0])) + g(20 + i, real(pt[1])) + g(30 + i, real(0))
      })
      return s
    }

    case 'text': {
      const hj = e.align === 'left' ? 0 : e.align === 'center' ? 1 : 2
      return (
        g(0, 'TEXT') +
        g(8, e.layer) +
        g(10, real(e.at[0])) +
        g(20, real(e.at[1])) +
        g(30, real(0)) +
        g(40, real(e.h)) +
        g(1, asciiFold(e.text)) +
        g(50, real(e.rot)) +
        g(7, 'STANDARD') +
        g(72, hj) +
        g(73, 2) + // vertically centred on the insertion point
        // With 72/73 set, the alignment point (11/21) is the one honoured.
        g(11, real(e.at[0])) +
        g(21, real(e.at[1])) +
        g(31, real(0))
      )
    }
  }
}

export function toDXF(d: Drawing): string {
  let s = header(d) + tables(d)
  s += g(0, 'SECTION') + g(2, 'ENTITIES')
  for (const e of d.entities) s += entity(e)
  s += g(0, 'ENDSEC')
  return s + g(0, 'EOF')
}
