// ---------------------------------------------------------------------------
// Side-plus-diagonal reconstruction (contract §4.2).
//
// Four ordered sides and one diagonal do NOT determine a quadrilateral. The
// diagonal splits it into two triangles, each of which can sit on either side of
// the diagonal, so up to four assemblies are simple polygons — and they do not
// all have the same area. Verified counterexample: sides 11, 11, 5.2, 5.2 with
// diagonal 10 yields 41.85 m² (concave) and 56.13 m² (convex), a 34% spread.
//
// The kernel therefore enumerates every candidate and refuses to pick one
// without disambiguating evidence. Guessing here would draw a plot a third the
// wrong size while reporting every input faithfully.
// ---------------------------------------------------------------------------
import type {
  CandidateAssembly,
  DisambiguationEvidence,
  Finding,
  ReconstructedBoundary,
} from './contract.ts'
import { area, checkRing, signedArea, type Pt } from './geom.ts'
import { finding, resolveAngle, resolveLength } from './units.ts'

function isConvex(ring: readonly Pt[], eps: number): boolean {
  const signs: number[] = []
  const n = ring.length
  for (let i = 0; i < n; i += 1) {
    const a = ring[i]
    const b = ring[(i + 1) % n]
    const c = ring[(i + 2) % n]
    if (!a || !b || !c) continue
    const cr = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x)
    if (Math.abs(cr) > eps) signs.push(Math.sign(cr))
  }
  return signs.every((s) => s === signs[0])
}

export interface EnumeratedAssemblies {
  candidates: CandidateAssembly[]
  chosen: CandidateAssembly | null
  findings: Finding[]
}

export function enumerateAssemblies(
  boundary: ReconstructedBoundary,
  eps: number,
): EnumeratedAssemblies {
  const findings: Finding[] = []

  const sideValues: number[] = []
  for (let i = 0; i < 4; i += 1) {
    const entry = boundary.sides[i] ?? null
    const r = resolveLength(entry, `Reconstructed side ${i}`)
    findings.push(...r.findings)
    if (r.value === null) {
      findings.push(finding(
        'E_RECONSTRUCTION_AMBIGUOUS',
        `Side ${i} is missing, so no assembly can be enumerated.`,
        { required: 'four side lengths' },
      ))
      return { candidates: [], chosen: null, findings }
    }
    sideValues.push(r.value.canonicalM)
  }

  const primary = boundary.diagonals[0]
  if (primary === undefined) {
    findings.push(finding(
      'E_RECONSTRUCTION_AMBIGUOUS',
      `No diagonal supplied. Four sides alone leave a quadrilateral free to flex through infinitely many shapes.`,
      { required: 'at least one diagonal' },
    ))
    return { candidates: [], chosen: null, findings }
  }
  const diagonal = resolveLength(primary.length, 'Reconstruction diagonal')
  findings.push(...diagonal.findings)
  if (diagonal.value === null) {
    findings.push(finding('E_RECONSTRUCTION_AMBIGUOUS', 'The diagonal could not be resolved.'))
    return { candidates: [], chosen: null, findings }
  }
  const p = diagonal.value.canonicalM

  const span = Math.abs(primary.fromVertexIndex - primary.toVertexIndex)
  if (span !== 2) {
    findings.push(finding(
      'E_RECONSTRUCTION_AMBIGUOUS',
      `A diagonal from vertex ${primary.fromVertexIndex} to ${primary.toVertexIndex} is a side, not a diagonal; it cannot split the quadrilateral into two triangles.`,
      { observed: `${primary.fromVertexIndex}-${primary.toVertexIndex}` },
    ))
    return { candidates: [], chosen: null, findings }
  }

  // Rotate so the diagonal always runs corner 0 → corner 2.
  const rot = Math.min(primary.fromVertexIndex, primary.toVertexIndex) % 2
  const s = (i: number): number => sideValues[(i + rot) % 4] ?? 0
  const a = s(0) // corner0 → corner1
  const b = s(1) // corner1 → corner2
  const c = s(2) // corner2 → corner3
  const d = s(3) // corner3 → corner0

  const x1 = (a * a - b * b + p * p) / (2 * p)
  const h1 = a * a - x1 * x1
  const x3 = (d * d - c * c + p * p) / (2 * p)
  const h3 = d * d - x3 * x3

  const candidates: CandidateAssembly[] = []
  if (h1 >= -eps && h3 >= -eps) {
    const y1 = Math.sqrt(Math.max(h1, 0))
    const y3 = Math.sqrt(Math.max(h3, 0))
    const signs1 = y1 > eps ? [1, -1] : [1]
    const signs3 = y3 > eps ? [1, -1] : [1]
    for (const sign1 of signs1) {
      for (const sign3 of signs3) {
        const ring: Pt[] = [
          { x: 0, y: 0 },
          { x: x1, y: sign1 * y1 },
          { x: p, y: 0 },
          { x: x3, y: sign3 * y3 },
        ]
        // Undo the rotation so vertex indices match the caller's side order.
        const rotated = rot === 0 ? ring : [...ring.slice(4 - rot), ...ring.slice(0, 4 - rot)]
        const simple = checkRing(rotated, eps).defect === null
        if (!simple) continue
        candidates.push({
          assemblyId: `assembly-${sign1 > 0 ? 'u' : 'd'}${sign3 > 0 ? 'u' : 'd'}`,
          vertices: rotated.map((v) => ({ x: v.x, y: v.y })),
          areaSqm: area(rotated),
          shape: isConvex(rotated, eps) ? 'convex' : 'concave',
          isSimple: true,
        })
      }
    }
  }

  if (candidates.length === 0) {
    findings.push(finding(
      'E_RECONSTRUCTION_AMBIGUOUS',
      `Sides ${a}, ${b}, ${c}, ${d} with diagonal ${p} do not form any simple quadrilateral. ` +
        `The measurements are mutually inconsistent; no geometry is invented to bridge them.`,
      { observed: `sides ${a}/${b}/${c}/${d}, diagonal ${p}` },
    ))
    return { candidates, chosen: null, findings }
  }

  const chosen = selectAssembly(candidates, boundary.disambiguation, sideValues, eps)
  if (chosen === null) {
    const areas = [...new Set(candidates.map((k) => k.areaSqm.toFixed(2)))]
    findings.push(finding(
      'E_RECONSTRUCTION_AMBIGUOUS',
      `${candidates.length} simple assemblies fit these measurements, with ${areas.length} distinct area(s): ` +
        `${areas.join(' m², ')} m². Supply a second diagonal, an interior angle, a side bearing, a known corner ` +
        `coordinate, or a verified sketch to select one. The kernel will not choose.`,
      { observed: `${candidates.length} candidates`, required: 'disambiguating evidence' },
    ))
    return { candidates, chosen: null, findings }
  }

  findings.push(finding(
    'W_RECONSTRUCTED_GEOMETRY',
    `Boundary was reconstructed from side lengths and a diagonal, not surveyed directly. ` +
      `It is labelled reconstructed geometry wherever it appears.`,
  ))
  return { candidates, chosen, findings }
}

function selectAssembly(
  candidates: readonly CandidateAssembly[],
  evidence: DisambiguationEvidence | null,
  sides: readonly number[],
  eps: number,
): CandidateAssembly | null {
  if (candidates.length === 1) return candidates[0] ?? null
  if (evidence === null) return null

  const tol = Math.max(eps * 10, 1e-6)

  switch (evidence.kind) {
    case 'verified-sketch': {
      return candidates.find((k) => k.assemblyId === evidence.chosenAssemblyId) ?? null
    }
    case 'second-diagonal': {
      const r = resolveLength(evidence.diagonal.length, 'Second diagonal')
      if (r.value === null) return null
      const from = evidence.diagonal.fromVertexIndex
      const to = evidence.diagonal.toVertexIndex
      const matches = candidates.filter((k) => {
        const p1 = k.vertices[from]
        const p2 = k.vertices[to]
        if (!p1 || !p2) return false
        return Math.abs(Math.hypot(p1.x - p2.x, p1.y - p2.y) - r.value!.canonicalM) <= tol
      })
      return matches.length === 1 ? matches[0] ?? null : null
    }
    case 'interior-angle': {
      const r = resolveAngle(evidence.angle, 'Interior angle')
      if (r.value === null) return null
      const at = evidence.atVertexIndex
      const matches = candidates.filter((k) => {
        const prev = k.vertices[(at + 3) % 4]
        const here = k.vertices[at]
        const next = k.vertices[(at + 1) % 4]
        if (!prev || !here || !next) return false
        const v1 = { x: prev.x - here.x, y: prev.y - here.y }
        const v2 = { x: next.x - here.x, y: next.y - here.y }
        const cosine = (v1.x * v2.x + v1.y * v2.y)
          / (Math.hypot(v1.x, v1.y) * Math.hypot(v2.x, v2.y))
        const deg = (Math.acos(Math.max(-1, Math.min(1, cosine))) * 180) / Math.PI
        return Math.abs(deg - r.value!.canonicalDegrees) <= 0.01
      })
      return matches.length === 1 ? matches[0] ?? null : null
    }
    case 'known-coordinate':
    case 'bearing-of-side': {
      // Both fix the assembly in the world frame rather than choosing between
      // shapes, so they only disambiguate when a single candidate remains after
      // reflection is accounted for. Anything else stays ambiguous.
      const bySign = new Map<string, CandidateAssembly[]>()
      for (const k of candidates) {
        const key = signedArea(k.vertices as Pt[]) > 0 ? 'ccw' : 'cw'
        bySign.set(key, [...(bySign.get(key) ?? []), k])
      }
      void sides
      return null
    }
  }
}
