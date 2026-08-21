/**
 * Domain types for the MI rate & eligibility engine.
 *
 * Everything the engine produces is designed to be auditable: each decision
 * carries the rule that produced it, each premium adjustment carries its
 * source, and the whole result is stamped with the versions of the rate card
 * and rule set that were in force at evaluation time.
 */

export type Occupancy = 'primary' | 'second-home' | 'investment'
export type PropertyType = 'sfr' | 'condo' | '2-unit' | '3-4-unit'
export type LoanPurpose = 'purchase' | 'rate-term-refi' | 'cash-out-refi'
export type AmortizationType = 'fixed' | 'arm'
export type LoanTerm = 20 | 30

/** What the borrower/loan officer submits. */
export interface QuoteRequest {
  loanAmount: number
  propertyValue: number
  creditScore: number
  debtToIncomeRatio: number
  loanTerm: LoanTerm
  amortizationType: AmortizationType
  occupancy: Occupancy
  propertyType: PropertyType
  loanPurpose: LoanPurpose
}

/** Values the engine computes from the request before any rule runs. */
export interface DerivedFacts {
  /** Loan-to-value, as a percentage rounded to 2dp (e.g. 94.87). */
  ltv: number
  /** Required MI coverage percentage for this LTV and term. */
  coveragePercent: number
  ltvBandId: string
  ficoBandId: string
}

export type DecisionOutcome = 'approve' | 'refer' | 'decline'

/** Severity determines decision precedence: decline beats refer beats approve. */
export type RuleSeverity = 'decline' | 'refer'

export interface RuleCitation {
  ruleId: string
  description: string
  severity: RuleSeverity
  /** Where the rule comes from — a document, guideline, or policy reference. */
  source: string
}

export interface PremiumAdjustment {
  code: string
  description: string
  /** Additive delta in annual percentage points (e.g. 0.1 = +0.10%). */
  deltaPercent: number
  source: string
}

export interface PremiumBreakdown {
  /** Annual premium rate before adjustments, as a percentage of loan amount. */
  baseRatePercent: number
  adjustments: Array<PremiumAdjustment>
  /** Annual rate after all adjustments. */
  finalRatePercent: number
  annualPremium: number
  monthlyPremium: number
}

export interface QuoteResult {
  quoteId: string
  evaluatedAt: string
  rateCardVersion: string
  rulesVersion: string
  request: QuoteRequest
  derived: DerivedFacts
  decision: {
    outcome: DecisionOutcome
    /** Every rule that fired, in the order evaluated. Empty on a clean approve. */
    reasons: Array<RuleCitation>
  }
  /**
   * Null when the loan is declined — we do not quote a premium on a loan we
   * would not insure, because a quoted number tends to outlive the decision
   * attached to it.
   */
  premium: PremiumBreakdown | null
  /** Present when the decision is `refer`, routing the file to a human. */
  reviewTask: ReviewTask | null
}

export type ReviewStatus = 'pending' | 'approved' | 'declined'

export interface ReviewTask {
  taskId: string
  quoteId: string
  queue: string
  status: ReviewStatus
  createdAt: string
  /** Populated when a human resolves the task. */
  resolution: {
    status: Exclude<ReviewStatus, 'pending'>
    reviewer: string
    note: string
    resolvedAt: string
  } | null
}
