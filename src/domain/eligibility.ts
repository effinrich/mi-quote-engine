/**
 * Eligibility rules.
 *
 * Every rule is a pure predicate with a stable id, a human-readable
 * description, a severity, and a source. The engine never encodes a decision
 * inline — it collects the rules that fired and derives the outcome from their
 * severities. That separation is what makes a decision explainable after the
 * fact: you can always answer "which rule did this, and where does that rule
 * come from?"
 *
 * ILLUSTRATIVE — thresholds are representative of published MI eligibility
 * matrices but are not any insurer's actual underwriting guidelines.
 */

import type { QuoteRequest, RuleCitation, RuleSeverity } from './types'

export const RULES_VERSION = 'illustrative-eligibility-2026.08-v1'

/** 2026 conforming loan limit for a one-unit property, baseline (non-high-cost). */
export const CONFORMING_LIMIT_1_UNIT = 806_500

const GUIDE = 'Illustrative MI eligibility matrix 2026.08-v1'

interface EligibilityRule {
  ruleId: string
  description: string
  severity: RuleSeverity
  source: string
  applies: (request: QuoteRequest, ltv: number) => boolean
}

const MAX_LTV_BY_OCCUPANCY: Record<QuoteRequest['occupancy'], number> = {
  primary: 97,
  'second-home': 90,
  investment: 85,
}

const ELIGIBILITY_RULES: Array<EligibilityRule> = [
  {
    ruleId: 'ELIG-001',
    description: 'Credit score below the 620 minimum',
    severity: 'decline',
    source: GUIDE,
    applies: (r) => r.creditScore < 620,
  },
  {
    ruleId: 'ELIG-002',
    description: 'LTV exceeds the maximum for this occupancy type',
    severity: 'decline',
    source: GUIDE,
    applies: (r, ltv) => ltv > MAX_LTV_BY_OCCUPANCY[r.occupancy],
  },
  {
    ruleId: 'ELIG-003',
    description: 'Debt-to-income ratio above the 50% maximum',
    severity: 'decline',
    source: GUIDE,
    applies: (r) => r.debtToIncomeRatio > 50,
  },
  {
    ruleId: 'ELIG-004',
    description: 'Cash-out refinance above 85% LTV',
    severity: 'decline',
    source: GUIDE,
    applies: (r, ltv) => r.loanPurpose === 'cash-out-refi' && ltv > 85,
  },
  {
    ruleId: 'ELIG-005',
    description: '3–4 unit property above 80% LTV',
    severity: 'decline',
    source: GUIDE,
    applies: (r, ltv) => r.propertyType === '3-4-unit' && ltv > 80,
  },
  {
    ruleId: 'ELIG-010',
    description:
      'Debt-to-income ratio between 45% and 50% — manual review required',
    severity: 'refer',
    source: GUIDE,
    applies: (r) => r.debtToIncomeRatio > 45 && r.debtToIncomeRatio <= 50,
  },
  {
    ruleId: 'ELIG-011',
    description:
      'Layered risk: credit score below 660 combined with LTV above 95%',
    severity: 'refer',
    source: GUIDE,
    applies: (r, ltv) => r.creditScore < 660 && ltv > 95,
  },
  {
    ruleId: 'ELIG-012',
    description:
      'Loan amount above the baseline conforming limit — high-balance review',
    severity: 'refer',
    source: GUIDE,
    applies: (r) => r.loanAmount > CONFORMING_LIMIT_1_UNIT,
  },
  {
    ruleId: 'ELIG-013',
    description: 'Investment property — manual review required',
    severity: 'refer',
    source: GUIDE,
    applies: (r) => r.occupancy === 'investment',
  },
]

/** Returns every rule that fired, in declaration order. */
export function evaluateEligibility(
  request: QuoteRequest,
  ltv: number,
): Array<RuleCitation> {
  return ELIGIBILITY_RULES.filter((rule) => rule.applies(request, ltv)).map(
    (rule) => ({
      ruleId: rule.ruleId,
      description: rule.description,
      severity: rule.severity,
      source: rule.source,
    }),
  )
}
