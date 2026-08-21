/**
 * ILLUSTRATIVE RATE CARD — NOT A REAL INSURER'S PRICING.
 *
 * The numbers below are synthetic. They are shaped like a borrower-paid
 * monthly mortgage-insurance rate card (annual premium as a percentage of the
 * loan amount, banded by credit score and LTV) so the engine exercises
 * realistic lookup and adjustment logic, but they are not taken from, and do
 * not represent, any insurer's published or proprietary rates.
 *
 * A production system would load a versioned card from a rate service and
 * retain every historical version, because a quote must remain reproducible
 * long after the current card has changed. The `RATE_CARD_VERSION` stamp on
 * every result exists for exactly that reason.
 */

export const RATE_CARD_VERSION = 'illustrative-2026.08-v1'

export interface Band {
  id: string
  label: string
  /** Inclusive lower bound. */
  min: number
  /** Inclusive upper bound. */
  max: number
}

/** Credit-score bands, ordered from strongest to weakest. */
export const FICO_BANDS: Array<Band> = [
  { id: 'fico-760-plus', label: '760+', min: 760, max: 850 },
  { id: 'fico-740-759', label: '740–759', min: 740, max: 759 },
  { id: 'fico-720-739', label: '720–739', min: 720, max: 739 },
  { id: 'fico-700-719', label: '700–719', min: 700, max: 719 },
  { id: 'fico-680-699', label: '680–699', min: 680, max: 699 },
  { id: 'fico-660-679', label: '660–679', min: 660, max: 679 },
  { id: 'fico-640-659', label: '640–659', min: 640, max: 659 },
  { id: 'fico-620-639', label: '620–639', min: 620, max: 639 },
]

/**
 * LTV bands. Bounds are expressed in percent and treated as
 * `min < ltv <= max` so that a loan at exactly 95.00% lands in the 90.01–95
 * band rather than straddling two.
 */
export const LTV_BANDS: Array<Band> = [
  { id: 'ltv-95-97', label: '95.01–97%', min: 95, max: 97 },
  { id: 'ltv-90-95', label: '90.01–95%', min: 90, max: 95 },
  { id: 'ltv-85-90', label: '85.01–90%', min: 85, max: 90 },
  { id: 'ltv-80-85', label: '80.01–85%', min: 80, max: 85 },
]

/**
 * Annual premium rate (percent of loan amount) by LTV band and FICO band.
 * Read as RATE_TABLE[ltvBandId][ficoBandId].
 */
export const RATE_TABLE: Record<string, Record<string, number>> = {
  'ltv-95-97': {
    'fico-760-plus': 0.41,
    'fico-740-759': 0.52,
    'fico-720-739': 0.7,
    'fico-700-719': 0.87,
    'fico-680-699': 1.03,
    'fico-660-679': 1.36,
    'fico-640-659': 1.6,
    'fico-620-639': 1.8,
  },
  'ltv-90-95': {
    'fico-760-plus': 0.33,
    'fico-740-759': 0.42,
    'fico-720-739': 0.56,
    'fico-700-719': 0.7,
    'fico-680-699': 0.85,
    'fico-660-679': 1.12,
    'fico-640-659': 1.33,
    'fico-620-639': 1.5,
  },
  'ltv-85-90': {
    'fico-760-plus': 0.23,
    'fico-740-759': 0.29,
    'fico-720-739': 0.38,
    'fico-700-719': 0.48,
    'fico-680-699': 0.58,
    'fico-660-679': 0.77,
    'fico-640-659': 0.91,
    'fico-620-639': 1.03,
  },
  'ltv-80-85': {
    'fico-760-plus': 0.14,
    'fico-740-759': 0.17,
    'fico-720-739': 0.21,
    'fico-700-719': 0.26,
    'fico-680-699': 0.32,
    'fico-660-679': 0.42,
    'fico-640-659': 0.5,
    'fico-620-639': 0.57,
  },
}

export function findFicoBand(creditScore: number): Band | null {
  return (
    FICO_BANDS.find((b) => creditScore >= b.min && creditScore <= b.max) ?? null
  )
}

/** Bands are half-open at the bottom: `min < ltv <= max`. */
export function findLtvBand(ltv: number): Band | null {
  return LTV_BANDS.find((b) => ltv > b.min && ltv <= b.max) ?? null
}

/**
 * Returns null for an unknown band rather than throwing — a band id that has
 * no cell means the loan cannot be priced from this card, which is a decision
 * the caller makes, not a crash.
 *
 * The explicit `| undefined` annotations are load-bearing: without
 * `noUncheckedIndexedAccess`, TypeScript types a `Record` lookup as always
 * present, and the guards below would be silently optimised away as dead code.
 */
export function lookupBaseRate(
  ltvBandId: string,
  ficoBandId: string,
): number | null {
  const row: Record<string, number> | undefined = RATE_TABLE[ltvBandId]
  if (!row) return null

  const rate: number | undefined = row[ficoBandId]
  return rate ?? null
}
