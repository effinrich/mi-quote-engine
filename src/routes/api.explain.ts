/**
 * POST /api/explain — plain-language narration of a stored decision.
 *
 * Deliberately a separate call from /api/quote. The decision must render
 * immediately and must not depend on a model being reachable; the explanation
 * is an enhancement that arrives after, or does not arrive at all. Coupling
 * them would put an LLM's latency and availability in front of a number
 * somebody is waiting on.
 *
 * The endpoint takes a quoteId rather than a result body, so the text is
 * always generated from what was recorded in the audit log — a client cannot
 * hand the model a modified result and have it narrate that instead.
 */

import { createFileRoute } from '@tanstack/react-router'
import { explainQuote } from '#/server/explain'
import { getQuote } from '#/server/store'

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  })
}

export const Route = createFileRoute('/api/explain')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: { quoteId?: unknown }
        try {
          body = (await request.json()) as { quoteId?: unknown }
        } catch {
          return json({ error: 'Invalid JSON body.' }, 400)
        }

        if (typeof body.quoteId !== 'string' || !body.quoteId) {
          return json({ error: 'quoteId is required.' }, 422)
        }

        const quote = await getQuote(body.quoteId)
        if (!quote) return json({ error: 'Quote not found.' }, 404)

        const explanation = await explainQuote(quote)
        return json(explanation, 200)
      },
    },
  },
})
