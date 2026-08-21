/**
 * Request parsing for the BFF boundary.
 *
 * Hand-rolled rather than schema-library-driven to keep the demo's dependency
 * surface small; the shape of the checks is what a Zod schema would encode.
 * The important property is that nothing reaches the engine untyped — the
 * boundary either produces a fully-formed QuoteRequest or an error listing
 * every field that failed, not just the first.
 */

import type {
  AmortizationType,
  LoanPurpose,
  LoanTerm,
  Occupancy,
  PropertyType,
  QuoteRequest,
} from '#/domain/types'

/**
 * Typed as non-empty tuples so `allowed[0]` is a safe placeholder when a field
 * fails validation. An empty allow-list would otherwise yield `undefined` and
 * hand the engine an unvalidated value alongside a recorded error.
 */
type NonEmpty<T> = [T, ...Array<T>]

const OCCUPANCIES: NonEmpty<Occupancy> = [
  'primary',
  'second-home',
  'investment',
]
const PROPERTY_TYPES: NonEmpty<PropertyType> = [
  'sfr',
  'condo',
  '2-unit',
  '3-4-unit',
]
const PURPOSES: NonEmpty<LoanPurpose> = [
  'purchase',
  'rate-term-refi',
  'cash-out-refi',
]
const AMORTIZATIONS: NonEmpty<AmortizationType> = ['fixed', 'arm']
const TERMS: NonEmpty<LoanTerm> = [20, 30]

export type ParseResult =
  | { ok: true; value: QuoteRequest }
  | { ok: false; errors: Array<string> }

function asNumber(
  value: unknown,
  field: string,
  errors: Array<string>,
): number {
  const parsed = typeof value === 'string' ? Number(value) : value
  if (typeof parsed !== 'number' || !Number.isFinite(parsed)) {
    errors.push(`${field} must be a number.`)
    return Number.NaN
  }
  return parsed
}

function asEnum<TValue extends string>(
  value: unknown,
  allowed: NonEmpty<TValue>,
  field: string,
  errors: Array<string>,
): TValue {
  if (typeof value !== 'string' || !allowed.includes(value as TValue)) {
    errors.push(`${field} must be one of: ${allowed.join(', ')}.`)
    return allowed[0]
  }
  return value as TValue
}

export function parseQuoteRequest(body: unknown): ParseResult {
  if (!body || typeof body !== 'object') {
    return { ok: false, errors: ['Request body must be a JSON object.'] }
  }

  const input = body as Record<string, unknown>
  const errors: Array<string> = []

  const termValue = asNumber(input.loanTerm, 'loanTerm', errors)
  const loanTerm = TERMS.includes(termValue as LoanTerm)
    ? (termValue as LoanTerm)
    : (() => {
        if (Number.isFinite(termValue)) {
          errors.push(`loanTerm must be one of: ${TERMS.join(', ')}.`)
        }
        return 30 as LoanTerm
      })()

  const value: QuoteRequest = {
    loanAmount: asNumber(input.loanAmount, 'loanAmount', errors),
    propertyValue: asNumber(input.propertyValue, 'propertyValue', errors),
    creditScore: asNumber(input.creditScore, 'creditScore', errors),
    debtToIncomeRatio: asNumber(
      input.debtToIncomeRatio,
      'debtToIncomeRatio',
      errors,
    ),
    loanTerm,
    amortizationType: asEnum(
      input.amortizationType,
      AMORTIZATIONS,
      'amortizationType',
      errors,
    ),
    occupancy: asEnum(input.occupancy, OCCUPANCIES, 'occupancy', errors),
    propertyType: asEnum(
      input.propertyType,
      PROPERTY_TYPES,
      'propertyType',
      errors,
    ),
    loanPurpose: asEnum(input.loanPurpose, PURPOSES, 'loanPurpose', errors),
  }

  return errors.length ? { ok: false, errors } : { ok: true, value }
}
