/**
 * Typed client for the BFF.
 *
 * Hand-written here because the project has one consumer. The pattern it
 * stands in for is generating this file from `contracts/openapi.yaml` so the
 * client cannot drift from the contract — which is how the equivalent layer
 * was built in the production system this demo is modelled on.
 *
 * Note what the client does *not* do: no composition, no rule interpretation,
 * no arithmetic on money. It calls one endpoint and hands back what it got.
 */

import type { ExplanationResult } from '#/server/explain'
import type { QuoteRequest, QuoteResult, ReviewTask } from '#/domain/types'

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly details: Array<string> = [],
  ) {
    super(message)
  }
}

async function send<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init.headers },
  })

  const body = (await response.json().catch(() => null)) as
    | (T & { error?: string; details?: Array<string> })
    | null

  if (!response.ok) {
    throw new ApiError(
      body?.error ?? `Request failed (${response.status}).`,
      response.status,
      body?.details ?? [],
    )
  }
  if (body === null) throw new ApiError('Empty response.', response.status)

  return body
}

export function requestQuote(request: QuoteRequest): Promise<QuoteResult> {
  return send<QuoteResult>('/api/quote', {
    method: 'POST',
    body: JSON.stringify(request),
  })
}

export function requestExplanation(quoteId: string): Promise<ExplanationResult> {
  return send<ExplanationResult>('/api/explain', {
    method: 'POST',
    body: JSON.stringify({ quoteId }),
  })
}

export function listReviewTasks(): Promise<{ tasks: Array<ReviewTask> }> {
  return send<{ tasks: Array<ReviewTask> }>('/api/review', { method: 'GET' })
}

export function resolveReviewTask(input: {
  taskId: string
  status: 'approved' | 'declined'
  reviewer: string
  note: string
}): Promise<ReviewTask> {
  return send<ReviewTask>('/api/review', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}
