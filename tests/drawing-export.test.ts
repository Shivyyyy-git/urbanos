import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import { JURISDICTIONS } from '../src/data/jurisdictions'
import { buildDrawing, SHEETS } from '../src/engines/drawing'
import { toDXF } from '../src/engines/dxf'
import { toPDF } from '../src/engines/pdfDrawing'
import { generateScenarios } from '../src/engines/planning'
import type {
  DevelopmentType,
  LandUseZone,
  ProjectBrief,
} from '../src/types'

const DEVELOPMENT_TYPES: DevelopmentType[] = [
  'house',
  'group-housing',
  'mixed-use',
  'commercial',
  'township',
]

const ZONE_BY_TYPE: Record<DevelopmentType, LandUseZone> = {
  house: 'residential',
  'group-housing': 'residential',
  'mixed-use': 'mixed-use',
  commercial: 'commercial',
  township: 'residential',
}

const AREA_BY_TYPE: Record<DevelopmentType, number> = {
  house: 900,
  'group-housing': 50_000,
  'mixed-use': 60_000,
  commercial: 40_000,
  township: 400_000,
}

describe('DXF and vector PDF drawing exports', () => {
  test('all 90 scenarios serialize on every supported sheet without false scale labels', () => {
    let exported = 0
    for (const rules of JURISDICTIONS) {
      for (const developmentType of DEVELOPMENT_TYPES) {
        const brief: ProjectBrief = {
          name: `Export ${rules.id} ${developmentType}`,
          jurisdiction: rules.id,
          developmentType,
          plotAreaSqm: AREA_BY_TYPE[developmentType],
          roadWidthM: Math.max(30, rules.minRoadWidthForHighRiseM),
          landUseZone: ZONE_BY_TYPE[developmentType],
          budgetCr: 1_000,
          landOwned: true,
          priority: 'balanced',
        }
        for (const scenario of generateScenarios(brief, rules)) {
          for (const sheet of Object.keys(SHEETS) as Array<keyof typeof SHEETS>) {
            const drawing = buildDrawing(brief, scenario, rules, {
              sheet,
              issuedOn: '25 Jul 2026',
            })

            assert.ok(drawing.meta.setbacks.front >= rules.setbacks.minFrontM)
            assert.ok(drawing.meta.setbacks.side >= rules.setbacks.minSideM)
            assert.ok(drawing.meta.setbacks.rear >= rules.setbacks.minRearM)

            const setbackLines = drawing.entities.filter(
              (entity) => entity.k === 'polyline' && entity.layer === 'SETBACK',
            )
            const conflictLabels = drawing.entities.filter(
              (entity) =>
                entity.k === 'text' &&
                entity.layer === 'SETBACK' &&
                entity.text.startsWith('NO COMPLIANT SETBACK ENVELOPE'),
            )
            assert.equal(setbackLines.length, drawing.meta.setbackEnvelopeFits ? 1 : 0)
            assert.equal(conflictLabels.length, drawing.meta.setbackEnvelopeFits ? 0 : 1)

            const dxf = toDXF(drawing)
            assert.ok(dxf.startsWith('0\nSECTION\n'))
            assert.ok(dxf.endsWith('0\nEOF\n'))
            assert.doesNotMatch(dxf, /(?:NaN|Infinity)/)
            assert.match(dxf, /\$INSUNITS/)

            const pdf = toPDF(drawing)
            const pdfText = new TextDecoder('latin1').decode(pdf)
            assert.ok(pdfText.startsWith('%PDF-1.4'))
            assert.ok(pdfText.endsWith('%%EOF\n'))
            assert.doesNotMatch(pdfText, /(?:NaN|Infinity)/)
            assert.match(pdfText, new RegExp(`1:${drawing.scale}`))
            exported += 1
          }
        }
      }
    }
    assert.equal(exported, 6 * 5 * 3 * 4)
  })
})
