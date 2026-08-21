/**
 * POST /api/quote — the BFF endpoint.
 *
 * This is the whole point of the project. One call returns everything the
 * quote screen needs: the derived facts, the decision with the rules that
 * produced it, the itemised premium, the review task if one was opened, and
 * the audit identifiers. The client makes one round-trip and renders; it does
 * no composition, no rule interpretation, and no arithmetic on money.
 *
 * The contract is fixed and versioned rather than client-shaped. In a
 * regulated workflow you need to answer "what exactly was asked, and what
 * exactly was returned" months later, which a flexible query language makes
 * harder rather than easier.
 */

import { createFileRoute } from '@tanstack/react-router'
import { QuoteInputError, evaluateQuote } from '#/domain/engine'
import { parseQuoteRequest } from '#/server/parse'
import { recordQuote } from '#/server/store'
import type { QuoteResult, ReviewTask } from '#/domain/types'

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  })
}

function openReviewTask(result: QuoteResult, now: string): ReviewTask {
  return {
    taskId: `task_${crypto.randomUUID()}`,
    quoteId: result.quoteId,
    // A real deployment would route by exception type; one queue keeps the
    // demo honest about what it does and does not model.
    queue: 'underwriting-review',
    status: 'pending',
    createdAt: now,
    resolution: null,
  }
}

export const Route = createFileRoute('/api/quote')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: unknown
        try {
          body = await request.json()
        } catch {
          return json({ error: 'Invalid JSON body.' }, 400)
        }

        const parsed = parseQuoteRequest(body)
        if (!parsed.ok) {
          return json({ error: 'Validation failed.', details: parsed.errors }, 422)
        }

        const now = new Date().toISOString()

        let result: QuoteResult
        try {
          result = evaluateQuote(parsed.value, {
            quoteId: `q_${crypto.randomUUID()}`,
            evaluatedAt: now,
          })
        } catch (error) {
          if (error instanceof QuoteInputError) {
            return json({ error: error.message }, 422)
          }
          console.error('[quote] evaluation failed:', error)
          return json({ error: 'Quote evaluation failed.' }, 500)
        }

        if (result.decision.outcome === 'refer') {
          result.reviewTask = openReviewTask(result, now)
        }

        // Recorded before the response is returned: a decision shown to a user
        // but absent from the audit log is the failure this ordering prevents.
        await recordQuote(result)

        return json(result, 200)
      },
    },
  },
})
