// ---------------------------------------------------------------------------
// Deterministic ASCII DXF R12 writer.
//
// Geometry is always model-space metres at 1:1. Group-code 999 path markers
// allow the acceptance harness to round-trip every shared DrawingPath without
// relying on entity order or layer names.
// ---------------------------------------------------------------------------
import {
  DRAWING_LAYERS,
  type DrawingLayerStyle,
  type DrawingModel,
  type DrawingPath,
  type DrawingText,
} from './drawing.ts'

function group(code: number, value: string | number): string {
  return `${code}\n${String(value)}\n`
}

function real(value: number): string {
  if (!Number.isFinite(value)) {
    throw new Error(`DXF writer received a non-finite number: ${String(value)}`)
  }
  const rounded = Math.abs(value) < 0.0000005 ? 0 : Math.round(value * 1_000_000) / 1_000_000
  return rounded.toFixed(6)
}

export function asciiFold(value: string): string {
  return value
    .normalize('NFKD')
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

function marker(id: string): string {
  return group(999, `URBANOS_PATH ${encodeURIComponent(id)}`)
}

function header(model: DrawingModel): string {
  const { bounds } = model
  return (
    group(0, 'SECTION')
    + group(2, 'HEADER')
    + group(9, '$ACADVER')
    + group(1, 'AC1009')
    + group(9, '$INSUNITS')
    + group(70, 6)
    + group(9, '$MEASUREMENT')
    + group(70, 1)
    + group(9, '$LUNITS')
    + group(70, 2)
    + group(9, '$LUPREC')
    + group(70, 6)
    + group(9, '$EXTMIN')
    + group(10, real(bounds.minX))
    + group(20, real(bounds.minY))
    + group(30, real(0))
    + group(9, '$EXTMAX')
    + group(10, real(bounds.maxX))
    + group(20, real(bounds.maxY))
    + group(30, real(0))
    + group(9, '$LIMMIN')
    + group(10, real(bounds.minX))
    + group(20, real(bounds.minY))
    + group(9, '$LIMMAX')
    + group(10, real(bounds.maxX))
    + group(20, real(bounds.maxY))
    + group(0, 'ENDSEC')
  )
}

function layerRecord(layer: DrawingLayerStyle): string {
  return (
    group(0, 'LAYER')
    + group(2, layer.name)
    + group(70, 0)
    + group(62, layer.aci)
    + group(6, layer.dashed ? 'DASHED' : 'CONTINUOUS')
  )
}

function tables(model: DrawingModel): string {
  const dashLengthM = (3 * model.scaleDenominator) / 1000
  let output = group(0, 'SECTION') + group(2, 'TABLES')
  output += group(0, 'TABLE') + group(2, 'LTYPE') + group(70, 2)
  output += (
    group(0, 'LTYPE')
    + group(2, 'CONTINUOUS')
    + group(70, 0)
    + group(3, 'Solid line')
    + group(72, 65)
    + group(73, 0)
    + group(40, real(0))
  )
  output += (
    group(0, 'LTYPE')
    + group(2, 'DASHED')
    + group(70, 0)
    + group(3, '__ __ __')
    + group(72, 65)
    + group(73, 2)
    + group(40, real(dashLengthM * 1.6))
    + group(49, real(dashLengthM))
    + group(49, real(-dashLengthM * 0.6))
  )
  output += group(0, 'ENDTAB')

  output += group(0, 'TABLE') + group(2, 'LAYER') + group(70, DRAWING_LAYERS.length)
  for (const layer of DRAWING_LAYERS) output += layerRecord(layer)
  output += group(0, 'ENDTAB')

  output += group(0, 'TABLE') + group(2, 'STYLE') + group(70, 1)
  output += (
    group(0, 'STYLE')
    + group(2, 'STANDARD')
    + group(70, 0)
    + group(40, real(0))
    + group(41, real(1))
    + group(50, real(0))
    + group(71, 0)
    + group(42, real(2.5))
    + group(3, 'txt')
    + group(4, '')
  )
  output += group(0, 'ENDTAB')
  return output + group(0, 'ENDSEC')
}

function pathEntity(path: DrawingPath): string {
  let output = marker(path.id)
  output += (
    group(0, 'POLYLINE')
    + group(8, path.layer)
    + group(66, 1)
    + group(70, path.closed ? 1 : 0)
    + group(10, real(0))
    + group(20, real(0))
    + group(30, real(0))
  )
  for (const point of path.points) {
    output += (
      group(0, 'VERTEX')
      + group(8, path.layer)
      + group(10, real(point[0]))
      + group(20, real(point[1]))
      + group(30, real(0))
    )
  }
  return output + group(0, 'SEQEND') + group(8, path.layer)
}

function textEntity(text: DrawingText, scaleDenominator: number): string {
  const heightM = (text.heightMm * scaleDenominator) / 1000
  const horizontal = text.align === 'left' ? 0 : text.align === 'center' ? 1 : 2
  return (
    group(999, `URBANOS_TEXT ${encodeURIComponent(text.id)}`)
    + group(0, 'TEXT')
    + group(8, text.layer)
    + group(10, real(text.at[0]))
    + group(20, real(text.at[1]))
    + group(30, real(0))
    + group(40, real(heightM))
    + group(1, asciiFold(text.text))
    + group(50, real(text.rotationDegrees))
    + group(7, 'STANDARD')
    + group(72, horizontal)
    + group(73, 2)
    + group(11, real(text.at[0]))
    + group(21, real(text.at[1]))
    + group(31, real(0))
  )
}

export function drawingToDxf(model: DrawingModel): string {
  let output = header(model) + tables(model)
  output += group(0, 'SECTION') + group(2, 'ENTITIES')
  output += group(999, 'URBANOS_COORDINATE_UNIT metre')
  output += group(999, `URBANOS_DECLARED_SCALE 1:${real(model.scaleDenominator)}`)
  output += group(999, `URBANOS_STATUS ${model.reviewStatus}`)
  if (model.boundaryProvenanceNote !== null) {
    output += group(999, `URBANOS_BOUNDARY_PROVENANCE ${model.boundaryProvenanceNote}`)
  }
  for (const path of model.paths) output += pathEntity(path)
  for (const text of model.texts) output += textEntity(text, model.scaleDenominator)
  output += group(0, 'ENDSEC')
  return output + group(0, 'EOF')
}
