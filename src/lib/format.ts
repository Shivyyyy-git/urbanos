// Formatting helpers — Indian units and currency. Use these everywhere so
// numbers read consistently across panels and the report.
import { SQFT_PER_SQM, SQM_PER_ACRE } from '../types'

/** "₹312.4 Cr" — crore with smart precision. */
export function formatCr(n: number): string {
  const abs = Math.abs(n)
  const digits = abs >= 100 ? 0 : abs >= 10 ? 1 : 2
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: digits, minimumFractionDigits: 0 })} Cr`
}

/** Indian-grouped integer, e.g. "12,34,567". */
export function num(n: number): string {
  return Math.round(n).toLocaleString('en-IN')
}

export function pct(n: number, digits = 0): string {
  return `${n.toLocaleString('en-IN', { maximumFractionDigits: digits })}%`
}

export function sqm(n: number): string {
  return `${num(n)} sq m`
}

export function sqft(nSqm: number): string {
  return `${num(nSqm * SQFT_PER_SQM)} sq ft`
}

export function acres(nSqm: number, digits = 2): string {
  return `${(nSqm / SQM_PER_ACRE).toLocaleString('en-IN', { maximumFractionDigits: digits })} acres`
}

/** "2.5 acres (10,117 sq m)" */
export function areaBoth(nSqm: number): string {
  return `${acres(nSqm)} (${sqm(nSqm)})`
}

/** "a" / "an" for a following word — zone and use labels are interpolated into
 * prose in the wizard and in compliance remediations. */
export function article(word: string): string {
  return /^[aeiou]/i.test(word.trim()) ? 'an' : 'a'
}

export function months(n: number): string {
  if (n < 12) return `${n} mo`
  const y = Math.floor(n / 12)
  const m = n % 12
  return m === 0 ? `${y} yr` : `${y} yr ${m} mo`
}
