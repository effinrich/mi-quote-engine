import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { ApiError, requestExplanation, requestQuote } from '#/lib/api'
import type { ExplanationResult } from '#/server/explain'
import type { QuoteRequest, QuoteResult } from '#/domain/types'

export const Route = createFileRoute('/')({ component: QuotePage })

const DEFAULTS: QuoteRequest = {
  loanAmount: 380_000,
  propertyValue: 400_000,
  creditScore: 745,
  debtToIncomeRatio: 38,
  loanTerm: 30,
  amortizationType: 'fixed',
  occupancy: 'primary',
  propertyType: 'sfr',
  loanPurpose: 'purchase',
}

const OUTCOME_STYLES = {
  approve: {
    label: 'Approved',
    className: 'bg-emerald-100 text-emerald-900 ring-emerald-600/20',
  },
  refer: {
    label: 'Referred for review',
    className: 'bg-amber-100 text-amber-900 ring-amber-600/20',
  },
  decline: {
    label: 'Declined',
    className: 'bg-rose-100 text-rose-900 ring-rose-600/20',
  },
} as const

const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
})

const fieldClass =
  'mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-400'

function QuotePage() {
  const [form, setForm] = useState<QuoteRequest>(DEFAULTS)
  const [result, setResult] = useState<QuoteResult | null>(null)
  const [explanation, setExplanation] = useState<ExplanationResult | null>(null)
  const [errors, setErrors] = useState<Array<string>>([])
  const [pending, setPending] = useState(false)
  const [explaining, setExplaining] = useState(false)

  function update<TKey extends keyof QuoteRequest>(
    key: TKey,
    value: QuoteRequest[TKey],
  ) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setPending(true)
    setErrors([])
    setExplanation(null)

    try {
      // One call. Everything below renders from this single response.
      setResult(await requestQuote(form))
    } catch (error) {
      setResult(null)
      setErrors(
        error instanceof ApiError && error.details.length
          ? error.details
          : [error instanceof Error ? error.message : 'Something went wrong.'],
      )
    } finally {
      setPending(false)
    }
  }

  async function onExplain() {
    if (!result) return
    setExplaining(true)
    try {
      setExplanation(await requestExplanation(result.quoteId))
    } catch {
      setExplanation({
        text: 'The explanation service is unavailable right now.',
        source: 'deterministic',
      })
    } finally {
      setExplaining(false)
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
      <section aria-labelledby="loan-details">
        <h1 id="loan-details" className="text-xl font-semibold tracking-tight">
          Loan details
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Coverage percentage and pricing band are derived from these inputs.
        </p>

        <form onSubmit={onSubmit} className="mt-5 space-y-4" noValidate>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">
              <span className="font-medium">Loan amount</span>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                value={form.loanAmount}
                onChange={(e) => update('loanAmount', Number(e.target.value))}
                className={fieldClass}
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium">Property value</span>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                value={form.propertyValue}
                onChange={(e) => update('propertyValue', Number(e.target.value))}
                className={fieldClass}
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium">Credit score</span>
              <input
                type="number"
                inputMode="numeric"
                min={300}
                max={850}
                value={form.creditScore}
                onChange={(e) => update('creditScore', Number(e.target.value))}
                className={fieldClass}
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium">DTI %</span>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                max={100}
                step="0.1"
                value={form.debtToIncomeRatio}
                onChange={(e) =>
                  update('debtToIncomeRatio', Number(e.target.value))
                }
                className={fieldClass}
              />
            </label>
          </div>

          <label className="block text-sm">
            <span className="font-medium">Occupancy</span>
            <select
              value={form.occupancy}
              onChange={(e) =>
                update('occupancy', e.target.value as QuoteRequest['occupancy'])
              }
              className={fieldClass}
            >
              <option value="primary">Primary residence</option>
              <option value="second-home">Second home</option>
              <option value="investment">Investment property</option>
            </select>
          </label>

          <label className="block text-sm">
            <span className="font-medium">Property type</span>
            <select
              value={form.propertyType}
              onChange={(e) =>
                update(
                  'propertyType',
                  e.target.value as QuoteRequest['propertyType'],
                )
              }
              className={fieldClass}
            >
              <option value="sfr">Single-family</option>
              <option value="condo">Condominium</option>
              <option value="2-unit">2-unit</option>
              <option value="3-4-unit">3–4 unit</option>
            </select>
          </label>

          <label className="block text-sm">
            <span className="font-medium">Loan purpose</span>
            <select
              value={form.loanPurpose}
              onChange={(e) =>
                update(
                  'loanPurpose',
                  e.target.value as QuoteRequest['loanPurpose'],
                )
              }
              className={fieldClass}
            >
              <option value="purchase">Purchase</option>
              <option value="rate-term-refi">Rate/term refinance</option>
              <option value="cash-out-refi">Cash-out refinance</option>
            </select>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">
              <span className="font-medium">Term</span>
              <select
                value={form.loanTerm}
                onChange={(e) =>
                  update('loanTerm', Number(e.target.value) as 20 | 30)
                }
                className={fieldClass}
              >
                <option value={30}>30 years</option>
                <option value={20}>20 years</option>
              </select>
            </label>
            <label className="block text-sm">
              <span className="font-medium">Amortization</span>
              <select
                value={form.amortizationType}
                onChange={(e) =>
                  update(
                    'amortizationType',
                    e.target.value as QuoteRequest['amortizationType'],
                  )
                }
                className={fieldClass}
              >
                <option value="fixed">Fixed</option>
                <option value="arm">Adjustable</option>
              </select>
            </label>
          </div>

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-md bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 disabled:opacity-60"
          >
            {pending ? 'Evaluating…' : 'Run quote'}
          </button>
        </form>

        {errors.length > 0 && (
          <div
            role="alert"
            className="mt-4 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900"
          >
            <p className="font-medium">This request could not be evaluated.</p>
            <ul className="mt-1 list-inside list-disc">
              {errors.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section aria-live="polite" aria-atomic="false">
        {!result ? (
          <div className="rounded-lg border border-dashed border-slate-300 p-8 text-sm text-slate-500">
            Submit the form to see a decision, the rules that produced it, and
            the premium breakdown.
          </div>
        ) : (
          <ResultPanel
            result={result}
            explanation={explanation}
            explaining={explaining}
            onExplain={onExplain}
          />
        )}
      </section>
    </div>
  )
}

function ResultPanel({
  result,
  explanation,
  explaining,
  onExplain,
}: {
  result: QuoteResult
  explanation: ExplanationResult | null
  explaining: boolean
  onExplain: () => void
}) {
  const outcome = OUTCOME_STYLES[result.decision.outcome]

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ring-1 ring-inset ${outcome.className}`}
          >
            {outcome.label}
          </span>
          <dl className="flex gap-6 text-sm">
            <div>
              <dt className="text-slate-500">LTV</dt>
              <dd className="font-medium tabular-nums">{result.derived.ltv}%</dd>
            </div>
            <div>
              <dt className="text-slate-500">Coverage</dt>
              <dd className="font-medium tabular-nums">
                {result.derived.coveragePercent
                  ? `${result.derived.coveragePercent}%`
                  : '—'}
              </dd>
            </div>
          </dl>
        </div>

        {result.premium ? (
          <div className="mt-6 border-t border-slate-100 pt-5">
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-semibold tabular-nums">
                {money.format(result.premium.monthlyPremium)}
              </span>
              <span className="text-sm text-slate-600">
                per month · {result.premium.finalRatePercent}% annually
              </span>
            </div>

            <table className="mt-4 w-full text-sm">
              <caption className="sr-only">Premium rate breakdown</caption>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <th scope="row" className="py-2 text-left font-normal">
                    Base rate
                    <span className="ml-2 text-xs text-slate-500">
                      {result.derived.ltvBandId} · {result.derived.ficoBandId}
                    </span>
                  </th>
                  <td className="py-2 text-right tabular-nums">
                    {result.premium.baseRatePercent}%
                  </td>
                </tr>
                {result.premium.adjustments.map((adjustment) => (
                  <tr key={adjustment.code}>
                    <th scope="row" className="py-2 text-left font-normal">
                      {adjustment.description}
                      <span className="ml-2 text-xs text-slate-500">
                        {adjustment.code}
                      </span>
                    </th>
                    <td className="py-2 text-right tabular-nums">
                      +{adjustment.deltaPercent}%
                    </td>
                  </tr>
                ))}
                <tr className="font-medium">
                  <th scope="row" className="py-2 text-left">
                    Final rate
                  </th>
                  <td className="py-2 text-right tabular-nums">
                    {result.premium.finalRatePercent}%
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-5 border-t border-slate-100 pt-5 text-sm text-slate-600">
            No premium is quoted on a declined loan.
          </p>
        )}
      </div>

      {result.decision.reasons.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold">Rules that fired</h2>
          <ul className="mt-3 space-y-3">
            {result.decision.reasons.map((reason) => (
              <li key={reason.ruleId} className="text-sm">
                <div className="flex items-start gap-2">
                  <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium">
                    {reason.ruleId}
                  </code>
                  <span
                    className={
                      reason.severity === 'decline'
                        ? 'text-rose-700'
                        : 'text-amber-700'
                    }
                  >
                    {reason.severity}
                  </span>
                </div>
                <p className="mt-1">{reason.description}</p>
                <p className="mt-0.5 text-xs text-slate-500">{reason.source}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold">Plain-language explanation</h2>
          <button
            type="button"
            onClick={onExplain}
            disabled={explaining}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium shadow-sm transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:opacity-60"
          >
            {explaining ? 'Generating…' : 'Explain this decision'}
          </button>
        </div>

        {explanation && (
          <div className="mt-4 text-sm">
            <p>{explanation.text}</p>
            <p className="mt-2 text-xs text-slate-500">
              {explanation.source === 'model'
                ? 'Generated by a language model and verified against the engine result — every figure above appears in the recorded decision.'
                : 'Generated deterministically from the engine result. No model output was used.'}
            </p>
            {explanation.rejectedReason && (
              <p className="mt-2 rounded border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
                {explanation.rejectedReason}
              </p>
            )}
          </div>
        )}
      </div>

      <dl className="rounded-lg border border-slate-200 bg-white p-6 text-xs shadow-sm">
        <div className="flex flex-wrap gap-x-8 gap-y-2">
          <div>
            <dt className="text-slate-500">Quote ID</dt>
            <dd className="font-mono">{result.quoteId}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Rate card</dt>
            <dd className="font-mono">{result.rateCardVersion}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Rule set</dt>
            <dd className="font-mono">{result.rulesVersion}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Evaluated</dt>
            <dd className="font-mono">{result.evaluatedAt}</dd>
          </div>
        </div>
        {result.reviewTask && (
          <p className="mt-4 border-t border-slate-100 pt-3 text-slate-600">
            Review task{' '}
            <span className="font-mono">{result.reviewTask.taskId}</span> opened
            in the {result.reviewTask.queue} queue.
          </p>
        )}
      </dl>
    </div>
  )
}
