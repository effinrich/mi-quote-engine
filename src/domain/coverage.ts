/**
 * Required MI coverage percentage by LTV.
 *
 * These are the GSE standard-coverage tiers, which are published and stable —
 * unlike the rate card, this table is not synthetic. Coverage is the share of
 * the loan the insurer covers on a claim, and it drives which column of the
 * rate card applies, so it is derived before pricing rather than supplied by
 * the requester.
 */

export const COVERAGE_SOURCE =
  'GSE standard coverage tiers (Fannie Mae Selling Guide B7-1-02 / Freddie Mac Guide 4701.1)'

interface CoverageTier {
  /** `min < ltv <= max`, matching the rate-card band convention. */
  min: number
  max: number
  /** Standard coverage for terms over 20 years. */
  standard: number
  /** Reduced coverage applies to terms of 20 years or less. */
  shortTerm: number
}

const COVERAGE_TIERS: Array<CoverageTier> = [
  { min: 95, max: 97, standard: 35, shortTerm: 35 },
  { min: 90, max: 95, standard: 30, shortTerm: 25 },
  { min: 85, max: 90, standard: 25, shortTerm: 12 },
  { min: 80, max: 85, standard: 12, shortTerm: 6 },
]

/**
 * Returns the required coverage percentage, or null when the LTV falls outside
 * the insurable range (at or below 80% no MI is required; above 97% the loan
 * is not eligible for standard coverage).
 */
export function requiredCoverage(ltv: number, loanTerm: number): number | null {
  const tier = COVERAGE_TIERS.find((t) => ltv > t.min && ltv <= t.max)
  if (!tier) return null
  return loanTerm <= 20 ? tier.shortTerm : tier.standard
}
