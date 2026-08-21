import { describe, expect, it } from 'vitest'
import { checkNumericGrounding } from './grounding'

const RESULT = {
  quoteId: 'q_abc',
  derived: { ltv: 95, coveragePercent: 30 },
  premium: {
    baseRatePercent: 0.33,
    finalRatePercent: 0.43,
    annualPremium: 1634,
    monthlyPremium: 136.17,
  },
  decision: { reasons: [{ ruleId: 'ELIG-010' }] },
}

describe('numeric grounding', () => {
  it('accepts text whose numbers all come from the result', () => {
    const text =
      'Approved at 95% LTV with 30% coverage. The rate is 0.43% annually, or $136.17 per month.'
    expect(checkNumericGrounding(text, RESULT).grounded).toBe(true)
  })

  it('rejects an invented premium', () => {
    // The classic failure: a fluent, plausible, entirely made-up number.
    const text = 'Approved at 95% LTV. The rate is 0.39% annually.'
    const report = checkNumericGrounding(text, RESULT)
    expect(report.grounded).toBe(false)
    expect(report.ungrounded).toContain('0.39')
  })

  it('rejects a number that is arithmetically right but absent from the result', () => {
    // 136.17 * 12 = 1634.04, close to but not equal to the recorded annual
    // premium. The engine's own figure is what may be quoted, not the model's
    // recomputation of it.
    const text = 'That works out to $1,634.04 over the first year.'
    expect(checkNumericGrounding(text, RESULT).grounded).toBe(false)
  })

  it('ignores formatting differences between text and source', () => {
    const text = 'The annual premium is $1,634.'
    expect(checkNumericGrounding(text, RESULT).grounded).toBe(true)
  })

  it('permits ordinary phrasing constants', () => {
    const text = 'Divided over 12 months at 0.43%.'
    expect(checkNumericGrounding(text, RESULT).grounded).toBe(true)
  })

  it('finds numbers embedded in identifiers', () => {
    const text = 'Flagged by ELIG-010.'
    expect(checkNumericGrounding(text, RESULT).grounded).toBe(true)
  })

  it('reports every ungrounded number, not just the first', () => {
    const text = 'The rate is 0.39% and the payment is $99.'
    const report = checkNumericGrounding(text, RESULT)
    expect(report.ungrounded).toEqual(['0.39', '99'])
  })

  it('accepts text with no numbers at all', () => {
    expect(
      checkNumericGrounding('This loan needs manual review.', RESULT).grounded,
    ).toBe(true)
  })
})
