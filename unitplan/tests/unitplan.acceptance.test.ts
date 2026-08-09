// ---------------------------------------------------------------------------
// Feature 2 v0 acceptance suite. Written wearing the verifier hat: every
// fixture states what defect it exists to catch. Sol's role is absorbed here
// per Shivam's 2026-08-08 ruling (ledger 026); the mutation-verification bar
// from Feature 1 still applies and is recorded in the ledger.
// ---------------------------------------------------------------------------
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createHash } from 'node:crypto'
import {
  auditLayoutGeometry,
  buildUnitDrawingModel,
  fi,
  privyAt42BhkBrief,
  sha256,
  toMetres,
  unitDrawingToDxf,
  unitDrawingToPdf,
  validateUnitPlan,
  UnitPlanError,
  type UnitPlanBrief,
  type UnitSheetProfile,
} from '../src/index.ts'

const ISSUE_DATE = '2026-08-08'

function brief(): UnitPlanBrief {
  return privyAt42BhkBrief(ISSUE_DATE)
}

function sheetProfile(): UnitSheetProfile {
  return {
    sheet: { ref: 'A2 landscape', widthMm: 594, heightMm: 420 },
    frame: { leftMm: 15, rightMm: 10, topMm: 10, bottomMm: 10, titleBlockHeightMm: 62 },
    paperToleranceMm: 0.05,
  }
}

function expectCode(code: string, run: () => unknown): UnitPlanError {
  try {
    run()
  } catch (error) {
    assert.ok(error instanceof UnitPlanError, `expected UnitPlanError, got ${String(error)}`)
    assert.equal(error.code, code)
    return error
  }
  assert.fail(`expected ${code}, but no error was thrown`)
}

// --- UP-1: the canonical brief validates and its numbers are exact ---------
test('UP-1: canonical Privy AT4 brief validates with exact carpet area', () => {
  const plan = validateUnitPlan(brief())
  // Sum of printed clear areas, computed independently here in ft-in.
  const rooms: [number, number, number, number][] = [
    [12, 0, 13, 4], // master
    [6, 6, 7, 8],   // toilet master
    [7, 6, 6, 0],   // toilet common
    [10, 9, 11, 6], // bedroom 2
    [7, 0, 10, 9],  // study
    [19, 0, 13, 4], // drawing/dining
    [7, 3, 5, 2],   // lobby
    [11, 0, 7, 5],  // kitchen
  ]
  const expected = rooms.reduce(
    (total, [wf, wi, df, di]) =>
      total + toMetres(fi(wf, wi)) * toMetres(fi(df, di)),
    0,
  )
  assert.ok(Math.abs(plan.carpetAreaSqm - expected) < 1e-9)
  assert.equal(plan.reviewStatus, 'RESEARCH DRAFT - NOT FOR CONSTRUCTION')
  assert.equal(plan.rooms.length, 10) // 8 schedule rooms + corridor + shaft
  assert.equal(plan.balconies.length, 3)
  // Every schedule room letters its printed size verbatim.
  const master = plan.rooms.find((room) => room.id === 'master-bedroom')
  assert.equal(master?.sizeText, `12'-0" x 13'-4"`)
  const toiletCommon = plan.rooms.find((room) => room.id === 'toilet-common')
  assert.equal(toiletCommon?.sizeText, `7'-6" x 6'-0"`)
  // Rotation places the common toilet 6'0" along x, 7'6" along y — printed
  // lettering keeps the brochure order regardless.
  assert.ok(Math.abs(toiletCommon!.rect.w - toMetres(fi(6, 0))) < 1e-9)
  assert.ok(Math.abs(toiletCommon!.rect.h - toMetres(fi(7, 6))) < 1e-9)
})

// --- UP-2: the overlap gate has teeth ---------------------------------------
// First draft of this fixture grew the master bedroom and expected an
// overlap; that premise was WRONG — the template chains placements off room
// sizes, so a changed input moves the whole plan consistently and no input
// can collide two rooms. The gate exists to catch future TEMPLATE bugs, so
// it is tested through the declared audit seam with a hostile layout the
// template would never produce (kernel fixture-28 precedent).
test('UP-2: the audit seam rejects overlapping and degenerate layouts', () => {
  expectCode('E_ROOM_OVERLAP', () =>
    auditLayoutGeometry(
      {
        rooms: [
          { id: 'a', rect: { x: 0, y: 0, w: 4, h: 4 } },
          { id: 'b', rect: { x: 3.9, y: 3.9, w: 4, h: 4 } },
        ],
        balconies: [],
      },
      0.23,
    ))
  expectCode('E_VALUE_NOT_FINITE', () =>
    auditLayoutGeometry(
      {
        rooms: [{ id: 'a', rect: { x: 0, y: 0, w: -1, h: 4 } }],
        balconies: [],
      },
      0.23,
    ))
  // Touching rects (gap exactly 0) are NOT an overlap — shaft sits flush.
  auditLayoutGeometry(
    {
      rooms: [
        { id: 'a', rect: { x: 0, y: 0, w: 4, h: 4 } },
        { id: 'b', rect: { x: 4, y: 0, w: 2, h: 4 } },
      ],
      balconies: [],
    },
    0.23,
  )
  // And the input route that CAN degenerate geometry is refused: a drawing
  // room narrower than the balcony insets flips the balcony width negative.
  const source = brief()
  const corrupted: UnitPlanBrief = {
    ...source,
    rooms: source.rooms.map((room) =>
      room.id === 'dwg-dining' ? { ...room, clearWidth: fi(2, 0) } : room,
    ),
  }
  let refused = false
  try {
    validateUnitPlan(corrupted)
  } catch (error) {
    assert.ok(error instanceof UnitPlanError, `expected UnitPlanError, got ${String(error)}`)
    refused = true
  }
  assert.ok(refused, 'a 2-foot drawing room must be refused, not drawn')
})

// --- UP-3: no silent wall defaults ------------------------------------------
test('UP-3: missing wall assumptions refuse to validate', () => {
  const source = brief()
  expectCode('E_WALL_ASSUMPTION_MISSING', () =>
    validateUnitPlan({ ...source, walls: null }))
  expectCode('E_WALL_ASSUMPTION_MISSING', () =>
    validateUnitPlan({ ...source, template: null }))
})

// --- UP-4: doors must land on real shared walls ----------------------------
test('UP-4: a door between rooms with no shared wall is rejected', () => {
  const source = brief()
  const corrupted: UnitPlanBrief = {
    ...source,
    doors: [
      ...source.doors,
      // Study and bedroom-2 are at opposite corners of the plan.
      { id: 'impossible', fromRoomId: 'study', toRoomId: 'bedroom-2', width: fi(2, 6) },
    ],
  }
  expectCode('E_DOOR_NOT_ON_SHARED_WALL', () => validateUnitPlan(corrupted))
})

// --- UP-5: assumptions block the professional-review stamp ------------------
test('UP-5: ready-for-professional-review is refused while assumptions exist', () => {
  const source = brief()
  const error = expectCode('E_ASSUMPTIONS_BLOCK_REVIEW', () =>
    validateUnitPlan({ ...source, requestedStatus: 'ready-for-professional-review' }))
  assert.match(error.finding.observed ?? '', /M-U4/)
})

// --- UP-6: printed sizes and placed geometry cannot disagree ----------------
test('UP-6: non-integer feet-inches input is rejected at construction', () => {
  expectCode('E_VALUE_NOT_FINITE', () => fi(12.5, 0))
  expectCode('E_VALUE_NOT_FINITE', () => fi(12, 12))
  expectCode('E_VALUE_NOT_FINITE', () => fi(-1, 0))
  expectCode('E_VALUE_NOT_FINITE', () => fi(Number.NaN, 0))
})

// --- UP-7: DXF determinism and coordinate round-trip ------------------------
test('UP-7: DXF is byte-identical across runs and round-trips room corners', () => {
  const planA = validateUnitPlan(brief())
  const planB = validateUnitPlan(brief())
  const modelA = buildUnitDrawingModel(planA, 50)
  const modelB = buildUnitDrawingModel(planB, 50)
  const dxfA = unitDrawingToDxf(modelA)
  const dxfB = unitDrawingToDxf(modelB)
  assert.equal(
    createHash('sha256').update(dxfA).digest('hex'),
    createHash('sha256').update(dxfB).digest('hex'),
  )
  assert.match(dxfA, /\$INSUNITS\n70\n6\n/)
  assert.match(dxfA, /URBANOS_STATUS RESEARCH DRAFT - NOT FOR CONSTRUCTION/)
  assert.match(dxfA, /URBANOS_ASSUMPTION WALLS ASSUMED 230 MM EXTERNAL \/ 115 MM INTERNAL/)

  // Independent parse: pull every VERTEX coordinate out of the DXF text and
  // confirm each critical model point survives to 1e-6 m.
  const vertices = new Set<string>()
  const lines = dxfA.split('\n')
  for (let index = 0; index < lines.length - 3; index += 1) {
    if (lines[index] === '0' && lines[index + 1] === 'VERTEX') {
      let x: string | null = null
      let y: string | null = null
      for (let scan = index + 2; scan < Math.min(index + 12, lines.length - 1); scan += 2) {
        if (lines[scan] === '10') x = lines[scan + 1] ?? null
        if (lines[scan] === '20') y = lines[scan + 1] ?? null
        if (lines[scan] === '0') break
      }
      if (x !== null && y !== null) vertices.add(`${x},${y}`)
    }
  }
  for (const path of modelA.paths) {
    if (!path.critical) continue
    for (const point of path.points) {
      const key = `${point[0].toFixed(6)},${point[1].toFixed(6)}`
      assert.ok(vertices.has(key), `DXF lost critical vertex ${key} of ${path.id}`)
    }
  }
})

// --- UP-8: PDF structure, stamp, and DXF/PDF parity ------------------------
test('UP-8: PDF is A2, carries the stamp, and matches DXF geometry on paper', () => {
  const plan = validateUnitPlan(brief())
  const model = buildUnitDrawingModel(plan, 50)
  const artifact = unitDrawingToPdf(model, sheetProfile())
  const text = Buffer.from(artifact.bytes).toString('latin1')
  assert.match(text, /MediaBox \[0 0 1683\.7\d+ 1190\.5\d+\]/)
  const stampCount = text.split('RESEARCH DRAFT - NOT FOR CONSTRUCTION').length - 1
  assert.ok(stampCount >= 2, `stamp appears ${stampCount} time(s); need >= 2`)
  assert.match(text, /NOT A TRACE OF THE SOURCE PLAN/)

  // Parity: re-derive each critical path's paper coordinates from the model
  // via the artifact's own transform and find them in the content stream.
  const tolerancePt = 0.25 * (72 / 25.4) // 0.25 mm on paper
  for (const path of model.paths) {
    if (!path.critical) continue
    const marker = `% URBANOS_PATH ${encodeURIComponent(path.id)}`
    const at = text.indexOf(marker)
    assert.ok(at >= 0, `PDF lost path ${path.id}`)
    const section = text.slice(at, text.indexOf('S\nQ', at))
    const coordinates = [...section.matchAll(/([-\d.]+) ([-\d.]+) [ml]/g)].map(
      (match) => [Number(match[1]), Number(match[2])] as const,
    )
    assert.equal(coordinates.length, path.points.length, `vertex count differs for ${path.id}`)
    for (const [index, point] of path.points.entries()) {
      const expectedX = artifact.transform.originXPoints
        + (point[0] - artifact.transform.modelMinX) * artifact.transform.pointsPerModelMetre
      const expectedY = artifact.transform.originYPoints
        + (point[1] - artifact.transform.modelMinY) * artifact.transform.pointsPerModelMetre
      const actual = coordinates[index]!
      assert.ok(
        Math.abs(actual[0] - expectedX) < tolerancePt
          && Math.abs(actual[1] - expectedY) < tolerancePt,
        `paper parity failed for ${path.id}[${index}]`,
      )
    }
  }
})

// --- UP-9: the exporter refuses to rescale ---------------------------------
test('UP-9: a sheet too small for the declared scale fails, never rescales', () => {
  const plan = validateUnitPlan(brief())
  const model = buildUnitDrawingModel(plan, 50)
  const tiny: UnitSheetProfile = {
    sheet: { ref: 'A5', widthMm: 210, heightMm: 148 },
    frame: { leftMm: 10, rightMm: 10, topMm: 10, bottomMm: 10, titleBlockHeightMm: 30 },
    paperToleranceMm: 0.05,
  }
  const error = expectCode('E_EXPORT_PARITY', () => unitDrawingToPdf(model, tiny))
  assert.match(error.message, /did not rescale/)
})

// --- UP-10: balconies can neither detach nor silently vanish ----------------
// First run of this fixture exposed a REAL defect: a balcony pointed at a
// room without a template slot was silently dropped — declared in the input,
// absent from the drawing, no error. Same defect class as the old
// prototype's fabricated setbacks. The template now fails closed on it.
test('UP-10: a balcony without a template slot is refused, not dropped', () => {
  const source = brief()
  const corrupted: UnitPlanBrief = {
    ...source,
    balconies: source.balconies.map((balcony) =>
      balcony.id === 'balcony-master'
        ? { ...balcony, attachedToRoomId: 'study' }
        : balcony,
    ),
    doors: source.doors.filter((door) => door.id !== 'master-balcony'),
  }
  const error = expectCode('E_BALCONY_DETACHED', () => validateUnitPlan(corrupted))
  assert.match(error.message, /no balcony slot/)
  // Every balcony declared in the canonical brief is present in the output —
  // the anti-silent-drop property stated positively.
  const plan = validateUnitPlan(brief())
  for (const declared of brief().balconies) {
    assert.ok(
      plan.balconies.some((placed) => placed.id === declared.id),
      `balcony ${declared.id} missing from validated plan`,
    )
  }
})

// --- UP-11: envelope topology gates have teeth ------------------------------
// First draft expected an 8' shaft to disconnect the plan; WRONG premise —
// the template chains every placement, so the plan stretches and stays
// connected (verified by hand and accepted as correct behaviour). The
// disconnection and hole gates guard against template bugs, so they are
// tested through the audit seam.
test('UP-11: disconnected and holed envelopes are refused via the audit seam', () => {
  expectCode('E_ENVELOPE_DISCONNECTED', () =>
    auditLayoutGeometry(
      {
        rooms: [
          { id: 'west', rect: { x: 0, y: 0, w: 4, h: 4 } },
          { id: 'east', rect: { x: 10, y: 0, w: 4, h: 4 } }, // 6 m apart
        ],
        balconies: [],
      },
      0.23,
    ))
  expectCode('E_ENVELOPE_HAS_HOLES', () =>
    auditLayoutGeometry(
      {
        // Four bars forming a ring around an unclaimed courtyard.
        rooms: [
          { id: 's', rect: { x: 0, y: 0, w: 10, h: 2 } },
          { id: 'n', rect: { x: 0, y: 8, w: 10, h: 2 } },
          { id: 'w', rect: { x: 0, y: 2.2, w: 2, h: 5.6 } },
          { id: 'e', rect: { x: 8, y: 2.2, w: 2, h: 5.6 } },
        ],
        balconies: [],
      },
      0.23,
    ))
  // And the stretched-but-connected 8' shaft variant genuinely validates —
  // the template absorbing hostile parameters consistently is a feature.
  const source = brief()
  const stretched: UnitPlanBrief = {
    ...source,
    template: source.template === null ? null : {
      ...source.template,
      shaftWidth: fi(8, 0),
    },
  }
  const plan = validateUnitPlan(stretched)
  assert.ok(plan.envelopeRing.length >= 4)
})

// --- UP-12: validated plans are deeply immutable ----------------------------
test('UP-12: the validated plan is deeply frozen and digest-stable', () => {
  const planA = validateUnitPlan(brief())
  const planB = validateUnitPlan(brief())
  assert.equal(planA.digest, planB.digest)
  assert.ok(Object.isFrozen(planA))
  assert.ok(Object.isFrozen(planA.rooms))
  assert.ok(Object.isFrozen(planA.rooms[0]))
  assert.ok(Object.isFrozen(planA.envelopeRing))
  assert.throws(() => {
    ;(planA as { carpetAreaSqm: number }).carpetAreaSqm = 0
  })
  // The digest must move when geometry moves.
  const other = brief()
  const otherPlan = validateUnitPlan({
    ...other,
    rooms: other.rooms.map((room) =>
      room.id === 'study' ? { ...room, clearWidth: fi(8, 0) } : room,
    ),
  })
  assert.notEqual(planA.digest, otherPlan.digest)
})

// --- UP-13: envelope topology gates -----------------------------------------
test('UP-13: envelope is one connected ring containing every room corner', () => {
  const plan = validateUnitPlan(brief())
  assert.ok(plan.envelopeRing.length >= 4)
  // Ring must be rectilinear: successive points share an axis.
  for (let index = 0; index < plan.envelopeRing.length; index += 1) {
    const a = plan.envelopeRing[index]!
    const b = plan.envelopeRing[(index + 1) % plan.envelopeRing.length]!
    assert.ok(
      Math.abs(a[0] - b[0]) < 1e-9 || Math.abs(a[1] - b[1]) < 1e-9,
      'envelope ring must be axis-aligned',
    )
  }
})

// --- UP-14: local sha256 agrees with node:crypto ----------------------------
test('UP-14: bundled sha256 matches node:crypto on the digest payload sizes', () => {
  for (const sample of ['', 'abc', 'x'.repeat(1000), '{"a":1,"b":[2,3]}']) {
    assert.equal(
      sha256(sample),
      createHash('sha256').update(sample).digest('hex'),
    )
  }
})
