import { describe, expect, it } from 'vitest'
import { QuoteInputError, evaluateQuote } from './engine'
import { CONFORMING_LIMIT_1_UNIT } from './eligibility'
import { findLtvBand, lookupBaseRate } from './rate-card'
import { requiredCoverage } from './coverage'
import type { QuoteRequest } from './types'

const OPTIONS = { quoteId: 'q_test', evaluatedAt: '2026-08-21T00:00:00.000Z' }

/** A clean, approvable loan. Individual tests override single fields. */
function request(overrides: Partial<QuoteRequest> = {}): QuoteRequest {
  return {
    loanAmount: 380_000,
    propertyValue: 400_000,
    creditScore: 760,
    debtToIncomeRatio: 38,
    loanTerm: 30,
    amortizationType: 'fixed',
    occupancy: 'primary',
    propertyType: 'sfr',
    loanPurpose: 'purchase',
    ...overrides,
  }
}

describe('band boundaries', () => {
  it('treats a band as (min, max] so a whole-number LTV lands in the lower band', () => {
    // 95.00 belongs to 90.01–95, not 95.01–97. Getting this backwards would
    // silently overprice every loan that lands exactly on a boundary.
    expect(findLtvBand(95)?.id).toBe('ltv-90-95')
    expect(findLtvBand(95.01)?.id).toBe('ltv-95-97')
    expect(findLtvBand(90)?.id).toBe('ltv-85-90')
  })

  it('returns no band outside the insurable range', () => {
    expect(findLtvBand(80)).toBeNull()
    expect(findLtvBand(97.5)).toBeNull()
  })

  it('applies reduced coverage to terms of 20 years or less', () => {
    expect(requiredCoverage(92, 30)).toBe(30)
    expect(requiredCoverage(92, 20)).toBe(25)
  })
})

describe('premium calculation', () => {
  it('prices a clean loan from the rate card with no adjustments', () => {
    const result = evaluateQuote(request(), OPTIONS)

    expect(result.decision.outcome).toBe('approve')
    expect(result.derived.ltv).toBe(95)
    expect(result.derived.coveragePercent).toBe(30)
    expect(result.premium?.adjustments).toHaveLength(0)
    expect(result.premium?.finalRatePercent).toBe(
      lookupBaseRate('ltv-90-95', 'fico-760-plus'),
    )
  })

  it('adds every applicable adjustment to the base rate', () => {
    const result = evaluateQuote(
      request({
        propertyType: 'condo',
        amortizationType: 'arm',
        debtToIncomeRatio: 46,
      }),
      OPTIONS,
    )

    const codes = result.premium?.adjustments.map((a) => a.code) ?? []
    expect(codes).toContain('ADJ-AMORT-ARM')
    expect(codes).toContain('ADJ-DTI-45')
    // Condo surcharge is gated on LTV > 90; this loan sits at exactly 95.
    expect(codes).toContain('ADJ-PROP-CONDO')

    const base = lookupBaseRate('ltv-90-95', 'fico-760-plus')!
    expect(result.premium?.finalRatePercent).toBeCloseTo(base + 0.1 + 0.1 + 0.1, 4)
  })

  it('derives the monthly premium from the annual figure', () => {
    const result = evaluateQuote(request(), OPTIONS)
    const premium = result.premium!
    expect(premium.annualPremium).toBeCloseTo(
      (380_000 * premium.finalRatePercent) / 100,
      2,
    )
    expect(premium.monthlyPremium).toBeCloseTo(premium.annualPremium / 12, 2)
  })
})

describe('decision precedence', () => {
  it('declines when a decline rule fires, even alongside refer rules', () => {
    // DTI 52 declines (ELIG-003); investment occupancy also refers (ELIG-013).
    const result = evaluateQuote(
      request({ debtToIncomeRatio: 52, occupancy: 'investment' }),
      OPTIONS,
    )

    expect(result.decision.outcome).toBe('decline')
    const ids = result.decision.reasons.map((r) => r.ruleId)
    expect(ids).toContain('ELIG-003')
    expect(ids).toContain('ELIG-013')
  })

  it('never quotes a premium on a declined loan', () => {
    const result = evaluateQuote(request({ creditScore: 600 }), OPTIONS)
    expect(result.decision.outcome).toBe('decline')
    expect(result.premium).toBeNull()
  })

  it('refers rather than declines on layered risk', () => {
    const result = evaluateQuote(
      { ...request({ creditScore: 650 }), loanAmount: 388_000 },
      OPTIONS,
    )
    expect(result.derived.ltv).toBe(97)
    expect(result.decision.outcome).toBe('refer')
    expect(result.decision.reasons.map((r) => r.ruleId)).toContain('ELIG-011')
    // A referred loan is still priced — the reviewer needs the number.
    expect(result.premium).not.toBeNull()
  })

  it('refers a loan above the conforming limit', () => {
    const result = evaluateQuote(
      request({
        loanAmount: CONFORMING_LIMIT_1_UNIT + 1,
        propertyValue: (CONFORMING_LIMIT_1_UNIT + 1) / 0.9,
      }),
      OPTIONS,
    )
    expect(result.decision.outcome).toBe('refer')
    expect(result.decision.reasons.map((r) => r.ruleId)).toContain('ELIG-012')
  })

  it('declines an LTV that needs no insurance', () => {
    const result = evaluateQuote(
      request({ loanAmount: 300_000, propertyValue: 400_000 }),
      OPTIONS,
    )
    expect(result.decision.outcome).toBe('decline')
    expect(result.decision.reasons.map((r) => r.ruleId)).toContain('ELIG-020')
  })

  it('enforces the occupancy-specific LTV ceiling', () => {
    // 95% LTV is fine on a primary residence but exceeds the 90% second-home cap.
    expect(evaluateQuote(request(), OPTIONS).decision.outcome).toBe('approve')
    const secondHome = evaluateQuote(
      request({ occupancy: 'second-home' }),
      OPTIONS,
    )
    expect(secondHome.decision.outcome).toBe('decline')
    expect(secondHome.decision.reasons.map((r) => r.ruleId)).toContain('ELIG-002')
  })
})

describe('determinism and provenance', () => {
  it('produces identical results for identical inputs', () => {
    const a = evaluateQuote(request(), OPTIONS)
    const b = evaluateQuote(request(), OPTIONS)
    expect(a).toEqual(b)
  })

  it('stamps every result with the rate card and rule set versions', () => {
    const result = evaluateQuote(request(), OPTIONS)
    expect(result.rateCardVersion).toMatch(/^illustrative-/)
    expect(result.rulesVersion).toMatch(/^illustrative-/)
  })

  it('gives every reason a citable source', () => {
    const result = evaluateQuote(request({ creditScore: 600 }), OPTIONS)
    for (const reason of result.decision.reasons) {
      expect(reason.source.length).toBeGreaterThan(0)
      expect(reason.ruleId).toMatch(/^ELIG-\d+$/)
    }
  })
})

describe('input validation', () => {
  it('rejects a non-positive property value rather than dividing by zero', () => {
    expect(() => evaluateQuote(request({ propertyValue: 0 }), OPTIONS)).toThrow(
      QuoteInputError,
    )
  })

  it('rejects an out-of-range credit score', () => {
    expect(() => evaluateQuote(request({ creditScore: 900 }), OPTIONS)).toThrow(
      QuoteInputError,
    )
  })
})
