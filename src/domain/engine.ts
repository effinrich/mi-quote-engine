/**
 * The decisioning engine.
 *
 * Deterministic and side-effect free: same request in, same result out. No
 * network calls, no clock-dependent branching (the timestamp is stamped but
 * never influences a decision), and no model in the path. The AI explainer
 * sits *downstream* of this function and can only describe what it returns.
 */

import { computeAdjustments } from './adjustments'
import { COVERAGE_SOURCE, requiredCoverage } from './coverage'
import { RULES_VERSION, evaluateEligibility } from './eligibility'
import {
  RATE_CARD_VERSION,
  findFicoBand,
  findLtvBand,
  lookupBaseRate,
} from './rate-card'
import type {
  DecisionOutcome,
  PremiumBreakdown,
  QuoteRequest,
  QuoteResult,
  RuleCitation,
} from './types'

export class QuoteInputError extends Error {}

function round(value: number, places: number): number {
  const factor = 10 ** places
  return Math.round(value * factor) / factor
}

function validate(request: QuoteRequest): void {
  if (!(request.loanAmount > 0))
    throw new QuoteInputError('Loan amount must be greater than zero.')
  if (!(request.propertyValue > 0))
    throw new QuoteInputError('Property value must be greater than zero.')
  if (request.creditScore < 300 || request.creditScore > 850)
    throw new QuoteInputError('Credit score must be between 300 and 850.')
  if (request.debtToIncomeRatio < 0 || request.debtToIncomeRatio > 100)
    throw new QuoteInputError('Debt-to-income ratio must be between 0 and 100.')
}

/** Decline beats refer beats approve, regardless of rule order. */
function deriveOutcome(reasons: Array<RuleCitation>): DecisionOutcome {
  if (reasons.some((r) => r.severity === 'decline')) return 'decline'
  if (reasons.some((r) => r.severity === 'refer')) return 'refer'
  return 'approve'
}

function computePremium(
  request: QuoteRequest,
  ltv: number,
  ltvBandId: string,
  ficoBandId: string,
): PremiumBreakdown | null {
  const baseRatePercent = lookupBaseRate(ltvBandId, ficoBandId)
  if (baseRatePercent === null) return null

  const adjustments = computeAdjustments(request, ltv)
  const totalDelta = adjustments.reduce((sum, a) => sum + a.deltaPercent, 0)
  const finalRatePercent = round(baseRatePercent + totalDelta, 4)
  const annualPremium = round((request.loanAmount * finalRatePercent) / 100, 2)

  return {
    baseRatePercent,
    adjustments,
    finalRatePercent,
    annualPremium,
    monthlyPremium: round(annualPremium / 12, 2),
  }
}

export interface EvaluateOptions {
  /** Injected so the engine stays deterministic and testable. */
  quoteId: string
  evaluatedAt: string
}

export function evaluateQuote(
  request: QuoteRequest,
  options: EvaluateOptions,
): QuoteResult {
  validate(request)

  const ltv = round((request.loanAmount / request.propertyValue) * 100, 2)
  const coveragePercent = requiredCoverage(ltv, request.loanTerm)
  const ficoBand = findFicoBand(request.creditScore)
  const ltvBand = findLtvBand(ltv)

  const reasons = evaluateEligibility(request, ltv)

  // Structural ineligibility that the rule set does not already cover: an LTV
  // outside the insurable range has no coverage tier and no rate-card column,
  // so there is nothing to price even if every eligibility rule passes.
  if (coveragePercent === null) {
    reasons.push({
      ruleId: 'ELIG-020',
      description:
        ltv <= 80
          ? 'LTV at or below 80% — mortgage insurance is not required'
          : 'LTV above 97% — outside the standard coverage range',
      severity: 'decline',
      source: COVERAGE_SOURCE,
    })
  }

  const outcome = deriveOutcome(reasons)

  const premium =
    outcome === 'decline' || !ltvBand || !ficoBand
      ? null
      : computePremium(request, ltv, ltvBand.id, ficoBand.id)

  return {
    quoteId: options.quoteId,
    evaluatedAt: options.evaluatedAt,
    rateCardVersion: RATE_CARD_VERSION,
    rulesVersion: RULES_VERSION,
    request,
    derived: {
      ltv,
      coveragePercent: coveragePercent ?? 0,
      ltvBandId: ltvBand?.id ?? 'none',
      ficoBandId: ficoBand?.id ?? 'none',
    },
    decision: { outcome, reasons },
    premium,
    reviewTask: null,
  }
}
