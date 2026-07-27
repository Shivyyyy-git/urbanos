// ---------------------------------------------------------------------------
// Unit and angle resolution (contract §2).
//
// Conversion tables are kernel constants: a caller supplies only what a document
// says, never a converted value. Units whose real-world value varies by revenue
// circle have NO table entry — they demand a declared, evidence-backed factor,
// and their absence is a blocker rather than a guess.
// ---------------------------------------------------------------------------
import type {
  AngleEntry,
  AngleValue,
  AreaEntry,
  AreaUnitLabel,
  AreaValue,
  ExactLengthUnit,
  Finding,
  LengthEntry,
  LengthValue,
} from './contract.ts'

export const METRES_PER_EXACT_LENGTH: Readonly<Record<ExactLengthUnit, number>> = {
  m: 1,
  mm: 0.001,
  cm: 0.01,
  km: 1000,
  ft: 0.3048,
  in: 0.0254,
  yd: 0.9144,
  'chain-gunter': 20.1168,
  'link-gunter': 0.201168,
}

/** Only these area units have a single legal value. */
export const SQM_PER_EXACT_AREA: Readonly<Record<string, number>> = {
  sqm: 1,
  sqft: 0.09290304,
  sqyd: 0.83612736,
  gaj: 0.83612736,
  acre: 4046.8564224,
  hectare: 10000,
}

export function finding(
  code: Finding['code'],
  message: string,
  extra: Omit<Finding, 'code' | 'message'> = {},
): Finding {
  return { code, message, ...extra }
}

export interface Resolution<T> {
  value: T | null
  findings: Finding[]
}

function nonFinite(what: string, value: number): Finding {
  return finding(
    'E_VALUE_NOT_FINITE',
    `${what} is ${String(value)}, which is not a finite number. Resolution stops before any geometry operation runs.`,
    { observed: String(value) },
  )
}

function invalidPrecision(
  what: string,
  precision: number | undefined,
): Finding | null {
  if (precision === undefined) return null
  if (!Number.isFinite(precision)) {
    return nonFinite(`${what} stated precision`, precision)
  }
  return null
}

export function resolveLength(
  entry: LengthEntry | null | undefined,
  what: string,
): Resolution<LengthValue> {
  if (entry === null || entry === undefined) return { value: null, findings: [] }
  if (!Number.isFinite(entry.asEntered)) {
    return { value: null, findings: [nonFinite(what, entry.asEntered)] }
  }
  const precisionFinding = invalidPrecision(what, entry.statedPrecision)
  if (precisionFinding !== null) {
    return { value: null, findings: [precisionFinding] }
  }

  const exact = METRES_PER_EXACT_LENGTH[entry.unit as ExactLengthUnit]
  if (exact !== undefined) {
    const canonicalM = entry.asEntered * exact
    if (!Number.isFinite(canonicalM)) {
      return { value: null, findings: [nonFinite(`${what} after unit conversion`, canonicalM)] }
    }
    return {
      value: { canonicalM, from: entry },
      findings: [],
    }
  }

  const declared = entry.declaredFactor
  if (declared === undefined || declared.sourceRef === null || declared.sourceRef === undefined) {
    return {
      value: null,
      findings: [finding(
        'E_UNIT_FACTOR_UNDECLARED',
        `${what} is stated in "${entry.unit}", which has no single legal value. ` +
          `A declared conversion factor with its own evidence reference is required; the kernel will not infer one from the unit's name.`,
        { observed: entry.unit, required: 'declaredFactor.mPerUnit + sourceRef' },
      )],
    }
  }
  if (!Number.isFinite(declared.mPerUnit)) {
    return { value: null, findings: [nonFinite(`${what} conversion factor`, declared.mPerUnit)] }
  }
  const canonicalM = entry.asEntered * declared.mPerUnit
  if (!Number.isFinite(canonicalM)) {
    return { value: null, findings: [nonFinite(`${what} after unit conversion`, canonicalM)] }
  }
  return {
    value: { canonicalM, from: entry },
    findings: [],
  }
}

export function resolveArea(
  entry: AreaEntry | null | undefined,
  what: string,
): Resolution<AreaValue> {
  if (entry === null || entry === undefined) return { value: null, findings: [] }
  if (!Number.isFinite(entry.asEntered)) {
    return { value: null, findings: [nonFinite(what, entry.asEntered)] }
  }
  const precisionFinding = invalidPrecision(what, entry.statedPrecision)
  if (precisionFinding !== null) {
    return { value: null, findings: [precisionFinding] }
  }

  const exact = SQM_PER_EXACT_AREA[entry.unit as AreaUnitLabel]
  if (exact !== undefined) {
    const canonicalSqm = entry.asEntered * exact
    if (!Number.isFinite(canonicalSqm)) {
      return { value: null, findings: [nonFinite(`${what} after unit conversion`, canonicalSqm)] }
    }
    return { value: { canonicalSqm, from: entry }, findings: [] }
  }

  const declared = entry.declaredFactor
  if (declared === undefined || declared.sourceRef === null || declared.sourceRef === undefined) {
    return {
      value: null,
      findings: [finding(
        'E_UNIT_FACTOR_UNDECLARED',
        `${what} is stated in "${entry.unit}", whose value varies by state and revenue circle. ` +
          `A declared conversion factor with its own evidence reference is required.`,
        { observed: entry.unit, required: 'declaredFactor.sqmPerUnit + sourceRef' },
      )],
    }
  }
  if (!Number.isFinite(declared.sqmPerUnit)) {
    return { value: null, findings: [nonFinite(`${what} conversion factor`, declared.sqmPerUnit)] }
  }
  const canonicalSqm = entry.asEntered * declared.sqmPerUnit
  if (!Number.isFinite(canonicalSqm)) {
    return { value: null, findings: [nonFinite(`${what} after unit conversion`, canonicalSqm)] }
  }
  return {
    value: { canonicalSqm, from: entry },
    findings: [],
  }
}

export function resolveAngle(
  entry: AngleEntry | null | undefined,
  what: string,
): Resolution<AngleValue> {
  if (entry === null || entry === undefined) return { value: null, findings: [] }

  const hasDecimal = entry.decimalDegrees !== undefined
  const hasDms = entry.dms !== undefined
  if (hasDecimal === hasDms) {
    return {
      value: null,
      findings: [finding(
        'E_ANGLE_FORM_INVALID',
        `${what} must carry exactly one of decimalDegrees or dms; found ${hasDecimal ? 'both' : 'neither'}.`,
        { observed: hasDecimal ? 'both forms' : 'no form', required: 'exactly one form' },
      )],
    }
  }

  let degrees: number
  if (entry.decimalDegrees !== undefined) {
    degrees = entry.decimalDegrees
  } else {
    const dms = entry.dms
    if (dms === undefined) {
      return {
        value: null,
        findings: [finding('E_ANGLE_FORM_INVALID', `${what} has no readable angle form.`)],
      }
    }
    if (![dms.d, dms.m, dms.s, dms.sign].every((n) => Number.isFinite(n))) {
      return {
        value: null,
        findings: [finding(
          'E_ANGLE_FORM_INVALID',
          `${what} contains a non-finite DMS component.`,
          { observed: JSON.stringify(dms) },
        )],
      }
    }
    degrees = dms.sign * (Math.abs(dms.d) + dms.m / 60 + dms.s / 3600)
  }

  if (!Number.isFinite(degrees)) {
    return {
      value: null,
      findings: [finding(
        'E_ANGLE_FORM_INVALID',
        `${what} resolves to ${String(degrees)}, which is not a finite angle.`,
        { observed: String(degrees) },
      )],
    }
  }
  return { value: { canonicalDegrees: degrees, from: entry }, findings: [] }
}

/**
 * Half the source's own precision step, in m². Serves the R2 correction: a deed
 * stated in whole gaj carries ±0.418 m² of legitimate rounding, which is larger
 * than the 0.25 m² floor for any plot under 500 gaj.
 */
export function sourcePrecisionHalfStepSqm(entry: AreaEntry | null): number | null {
  if (entry === null || entry.statedPrecision === undefined) return null
  if (!Number.isFinite(entry.statedPrecision)) return null
  const perUnit = SQM_PER_EXACT_AREA[entry.unit]
    ?? entry.declaredFactor?.sqmPerUnit
    ?? null
  if (perUnit === null) return null
  return (entry.statedPrecision * perUnit) / 2
}
