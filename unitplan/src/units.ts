// ---------------------------------------------------------------------------
// Feet-inches values, exactly as printed in the source room schedule.
// Conversion uses the exact international foot (0.3048 m). No parsing of
// free-text strings: callers supply feet and inches as numbers.
// ---------------------------------------------------------------------------
import { fail } from './errors.ts'

export const METRES_PER_FOOT = 0.3048

export interface FeetInches {
  readonly feet: number
  readonly inches: number
}

export function fi(feet: number, inches: number): FeetInches {
  if (
    !Number.isFinite(feet)
    || !Number.isFinite(inches)
    || feet < 0
    || inches < 0
    || inches >= 12
    || !Number.isInteger(feet)
    || !Number.isInteger(inches)
  ) {
    fail({
      code: 'E_VALUE_NOT_FINITE',
      message: 'Feet-inches values must be non-negative integers with inches < 12.',
      observed: `${String(feet)}' ${String(inches)}"`,
      required: "integer feet >= 0, integer 0 <= inches < 12, e.g. 12'0\"",
    })
  }
  return { feet, inches }
}

export function toMetres(value: FeetInches): number {
  return (value.feet + value.inches / 12) * METRES_PER_FOOT
}

/** Renders exactly like the brochure lettering: 12'-0" x 13'-4". */
export function formatFeetInches(value: FeetInches): string {
  return `${value.feet}'-${value.inches}"`
}

export function formatSize(width: FeetInches, depth: FeetInches): string {
  return `${formatFeetInches(width)} x ${formatFeetInches(depth)}`
}
