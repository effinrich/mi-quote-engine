/**
 * Audit log and review queue.
 *
 * File-backed JSON, which is the right amount of persistence for a demo but
 * the wrong amount for production — a real deployment needs an append-only
 * store with retention guarantees, because the audit trail is the artifact a
 * regulator asks for. The interface here is deliberately narrow so swapping
 * the backing store touches one file.
 *
 * Every quote is written before it is returned to the caller. A decision that
 * was shown to a user but never recorded is the failure mode this guards
 * against.
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import type { QuoteResult, ReviewTask } from '#/domain/types'

const DATA_FILE = join(process.cwd(), 'data', 'audit-log.json')

interface StoreShape {
  quotes: Array<QuoteResult>
  reviewTasks: Array<ReviewTask>
}

const EMPTY: StoreShape = { quotes: [], reviewTasks: [] }

/**
 * Serializes writes. Concurrent request handlers would otherwise read-modify-
 * write the same file and silently drop records.
 */
let writeChain: Promise<unknown> = Promise.resolve()

async function read(): Promise<StoreShape> {
  try {
    const raw = await readFile(DATA_FILE, 'utf8')
    const parsed = JSON.parse(raw) as Partial<StoreShape>
    return {
      quotes: parsed.quotes ?? [],
      reviewTasks: parsed.reviewTasks ?? [],
    }
  } catch {
    return { ...EMPTY }
  }
}

async function write(data: StoreShape): Promise<void> {
  await mkdir(dirname(DATA_FILE), { recursive: true })
  await writeFile(DATA_FILE, JSON.stringify(data, null, 2), 'utf8')
}

function enqueue<T>(operation: (data: StoreShape) => Promise<T> | T): Promise<T> {
  const next = writeChain.then(async () => {
    const data = await read()
    const result = await operation(data)
    await write(data)
    return result
  })
  // Keep the chain alive even if one operation rejects.
  writeChain = next.catch(() => undefined)
  return next
}

export function recordQuote(quote: QuoteResult): Promise<QuoteResult> {
  return enqueue((data) => {
    data.quotes.unshift(quote)
    if (quote.reviewTask) data.reviewTasks.unshift(quote.reviewTask)
    return quote
  })
}

export async function listReviewTasks(): Promise<Array<ReviewTask>> {
  const data = await read()
  return data.reviewTasks
}

export async function getQuote(quoteId: string): Promise<QuoteResult | null> {
  const data = await read()
  return data.quotes.find((q) => q.quoteId === quoteId) ?? null
}

export async function listQuotes(limit = 25): Promise<Array<QuoteResult>> {
  const data = await read()
  return data.quotes.slice(0, limit)
}

export function resolveReviewTask(input: {
  taskId: string
  status: 'approved' | 'declined'
  reviewer: string
  note: string
  resolvedAt: string
}): Promise<ReviewTask | null> {
  return enqueue((data) => {
    const task = data.reviewTasks.find((t) => t.taskId === input.taskId)
    if (!task || task.status !== 'pending') return null

    task.status = input.status
    task.resolution = {
      status: input.status,
      reviewer: input.reviewer,
      note: input.note,
      resolvedAt: input.resolvedAt,
    }

    // Mirror the resolution onto the stored quote so the audit record for a
    // quote is self-contained rather than requiring a join to reconstruct.
    const quote = data.quotes.find((q) => q.quoteId === task.quoteId)
    if (quote?.reviewTask) quote.reviewTask = { ...task }

    return task
  })
}
