/**
 * Rate adjustments applied on top of the base rate.
 *
 * Each adjustment is additive in annual percentage points and carries its own
 * source string, so a quote can always be taken apart into the base rate plus
 * the specific risk factors that moved it. Adjustments are evaluated in a
 * fixed order for reproducibility.
 *
 * ILLUSTRATIVE — the deltas are synthetic, matching the structure of published
 * rate-adjustment grids without reproducing any insurer's actual values.
 */

import type { PremiumAdjustment, QuoteRequest } from './types'

const ADJUSTMENT_SOURCE = 'Illustrative rate adjustment grid 2026.08-v1'

interface AdjustmentRule {
  code: string
  description: string
  deltaPercent: number
  applies: (request: QuoteRequest, ltv: number) => boolean
}

const ADJUSTMENT_RULES: Array<AdjustmentRule> = [
  {
    code: 'ADJ-DTI-45',
    description: 'Debt-to-income ratio above 45%',
    deltaPercent: 0.1,
    applies: (r) => r.debtToIncomeRatio > 45,
  },
  {
    code: 'ADJ-OCC-INV',
    description: 'Investment property occupancy',
    deltaPercent: 0.2,
    applies: (r) => r.occupancy === 'investment',
  },
  {
    code: 'ADJ-OCC-SECOND',
    description: 'Second-home occupancy',
    deltaPercent: 0.08,
    applies: (r) => r.occupancy === 'second-home',
  },
  {
    code: 'ADJ-PROP-MULTI',
    description: 'Multi-unit property (2–4 units)',
    deltaPercent: 0.2,
    applies: (r) => r.propertyType === '2-unit' || r.propertyType === '3-4-unit',
  },
  {
    code: 'ADJ-PROP-CONDO',
    description: 'Condominium above 90% LTV',
    deltaPercent: 0.1,
    applies: (r, ltv) => r.propertyType === 'condo' && ltv > 90,
  },
  {
    code: 'ADJ-PURPOSE-CASHOUT',
    description: 'Cash-out refinance',
    deltaPercent: 0.15,
    applies: (r) => r.loanPurpose === 'cash-out-refi',
  },
  {
    code: 'ADJ-AMORT-ARM',
    description: 'Adjustable-rate amortization',
    deltaPercent: 0.1,
    applies: (r) => r.amortizationType === 'arm',
  },
]

export function computeAdjustments(
  request: QuoteRequest,
  ltv: number,
): Array<PremiumAdjustment> {
  return ADJUSTMENT_RULES.filter((rule) => rule.applies(request, ltv)).map(
    (rule) => ({
      code: rule.code,
      description: rule.description,
      deltaPercent: rule.deltaPercent,
      source: ADJUSTMENT_SOURCE,
    }),
  )
}
