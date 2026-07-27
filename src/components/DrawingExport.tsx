// ---------------------------------------------------------------------------
// Module 5 — CAD export. Turns the generated layout into files a planner,
// architect or developer can actually open: a scaled DXF for CAD/GIS and a
// vector PDF drawing sheet for issue and print.
//
// Both come from the same drawing model (engines/drawing.ts), so the printed
// sheet and the CAD file always agree.
// ---------------------------------------------------------------------------
import { useMemo, useState } from 'react'
import type { BylawRules, ProjectBrief, Scenario } from '../types'
import { buildDrawing, SHEETS } from '../engines/drawing'
import { toDXF } from '../engines/dxf'
import { toPDF } from '../engines/pdfDrawing'
import { downloadFile, slug } from '../lib/download'
import { num } from '../lib/format'

type SheetKey = keyof typeof SHEETS

const SHEET_KEYS: SheetKey[] = ['A4', 'A3', 'A2', 'A1']

export function DrawingExport({
  brief,
  scenario,
  rules,
}: {
  brief: ProjectBrief
  scenario: Scenario
  rules: BylawRules
}) {
  const [sheet, setSheet] = useState<SheetKey>('A3')
  const [notice, setNotice] = useState<{ message: string; error: boolean } | null>(null)

  const drawing = useMemo(
    () =>
      buildDrawing(brief, scenario, rules, {
        sheet,
        issuedOn: new Date().toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        }),
      }),
    [brief, scenario, rules, sheet],
  )

  const base = `${slug(brief.name)}-${scenario.id}-1-${drawing.scale}`

  function flash(message: string, error = false) {
    setNotice({ message, error })
    setTimeout(() => setNotice(null), 4000)
  }

  function exportDxf() {
    try {
      downloadFile(`${base}.dxf`, toDXF(drawing), 'image/vnd.dxf')
      flash(`${base}.dxf download started`)
    } catch {
      flash('Could not prepare the DXF. Regenerate the concept and try again.', true)
    }
  }

  function exportPdf() {
    try {
      downloadFile(`${base}.pdf`, toPDF(drawing), 'application/pdf')
      flash(`${base}.pdf download started`)
    } catch {
      flash(
        `The drawing does not fit ${drawing.sheet.name} at its declared scale. Choose a larger sheet.`,
        true,
      )
    }
  }

  const layerCount = drawing.layers.length
  const entityCount = drawing.entities.length

  return (
    <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--hairline)' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          gap: 10,
          flexWrap: 'wrap',
          marginBottom: 10,
        }}
      >
        <div className="section-title" style={{ margin: 0 }}>
          CAD export
        </div>
        <span className="small muted mono-num">
          1:{num(drawing.scale)} @ {drawing.sheet.name} · {layerCount} layers · {entityCount} entities
        </span>
      </div>

      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div className="field" style={{ marginBottom: 0, minWidth: 120 }}>
          <label htmlFor="dx-sheet">Sheet size</label>
          <select
            id="dx-sheet"
            className="select"
            value={sheet}
            onChange={(e) => setSheet(e.target.value as SheetKey)}
          >
            {SHEET_KEYS.map((k) => (
              <option key={k} value={k}>
                {k} ({SHEETS[k].widthMm} × {SHEETS[k].heightMm} mm)
              </option>
            ))}
          </select>
        </div>
        <button type="button" className="btn btn-primary" onClick={exportDxf}>
          Download DXF
        </button>
        <button type="button" className="btn" onClick={exportPdf}>
          Download PDF drawing
        </button>
      </div>

      <p className="small muted" style={{ marginTop: 10, lineHeight: 1.5 }}>
        Drawn to a standard {drawing.sheet.name} sheet at 1:{num(drawing.scale)} with dimensions,
        parcel labels, setback line, north arrow, scale bar and title block. DXF geometry is 1:1 in
        local metre coordinates on named layers (plot boundary, setbacks, buildings, roads,
        parking, open space, amenities, utilities, dimensions, text). Set import units to metres.
        This V1 export has no CRS or georeferencing; the GPS pin is title-block metadata only.
      </p>
      <p className="small muted" style={{ marginTop: 6, lineHeight: 1.5 }}>
        DWG is a closed Autodesk format and cannot be written in the browser. DXF R12 is intended
        for AutoCAD, BricsCAD, Revit, QGIS, LibreCAD and SketchUp; verify import units and geometry
        before saving it as DWG or using it in a professional workflow.
      </p>
      {!drawing.meta.setbackEnvelopeFits && (
        <p className="small" style={{ marginTop: 8, color: 'var(--status-critical)' }}>
          The required setback envelope does not fit inside these plot dimensions. The export marks
          the conflict and does not draw a reduced setback as if it were compliant.
        </p>
      )}
      {notice && (
        <p
          className="small"
          role={notice.error ? 'alert' : 'status'}
          style={{
            marginTop: 8,
            color: notice.error ? 'var(--status-critical)' : 'var(--status-good-text)',
          }}
        >
          {notice.message}
        </p>
      )}
    </div>
  )
}
