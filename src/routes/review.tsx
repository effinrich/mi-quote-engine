import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { listReviewTasks, resolveReviewTask } from '#/lib/api'
import type { ReviewTask } from '#/domain/types'

export const Route = createFileRoute('/review')({ component: ReviewPage })

/**
 * The human-in-the-loop surface. Anything the engine referred lands here and
 * stays pending until a person resolves it with a stated reason — the note is
 * required, because an override nobody can explain later is not a review.
 */
function ReviewPage() {
  const [tasks, setTasks] = useState<Array<ReviewTask> | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function refresh() {
    try {
      const { tasks: next } = await listReviewTasks()
      setTasks(next)
      setError(null)
    } catch {
      setError('Could not load the review queue.')
    }
  }

  useEffect(() => {
    void refresh()
  }, [])

  const pending = tasks?.filter((t) => t.status === 'pending') ?? []
  const resolved = tasks?.filter((t) => t.status !== 'pending') ?? []

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Review queue</h1>
        <p className="mt-1 text-sm text-slate-600">
          Loans the engine referred rather than deciding automatically.
        </p>
      </div>

      {error && (
        <p role="alert" className="text-sm text-rose-700">
          {error}
        </p>
      )}

      {tasks === null ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : (
        <>
          <section aria-labelledby="pending-heading">
            <h2 id="pending-heading" className="text-sm font-semibold">
              Pending ({pending.length})
            </h2>
            {pending.length === 0 ? (
              <p className="mt-3 rounded-lg border border-dashed border-slate-300 p-6 text-sm text-slate-500">
                Nothing awaiting review. Run a quote that trips a refer rule —
                a 46% DTI will do it.
              </p>
            ) : (
              <ul className="mt-3 space-y-4">
                {pending.map((task) => (
                  <PendingTask key={task.taskId} task={task} onResolved={refresh} />
                ))}
              </ul>
            )}
          </section>

          {resolved.length > 0 && (
            <section aria-labelledby="resolved-heading">
              <h2 id="resolved-heading" className="text-sm font-semibold">
                Resolved ({resolved.length})
              </h2>
              <ul className="mt-3 space-y-3">
                {resolved.map((task) => (
                  <li
                    key={task.taskId}
                    className="rounded-lg border border-slate-200 bg-white p-4 text-sm shadow-sm"
                  >
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span
                        className={`font-medium ${
                          task.status === 'approved'
                            ? 'text-emerald-700'
                            : 'text-rose-700'
                        }`}
                      >
                        {task.status}
                      </span>
                      <span className="font-mono text-xs text-slate-500">
                        {task.quoteId}
                      </span>
                    </div>
                    {task.resolution && (
                      <p className="mt-1 text-slate-700">
                        “{task.resolution.note}” — {task.resolution.reviewer},{' '}
                        <span className="font-mono text-xs">
                          {task.resolution.resolvedAt}
                        </span>
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  )
}

function PendingTask({
  task,
  onResolved,
}: {
  task: ReviewTask
  onResolved: () => void
}) {
  const [reviewer, setReviewer] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function resolve(status: 'approved' | 'declined') {
    if (!reviewer.trim() || !note.trim()) {
      setError('Reviewer and note are both required.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await resolveReviewTask({ taskId: task.taskId, status, reviewer, note })
      onResolved()
    } catch {
      setError('Could not resolve this task.')
      setBusy(false)
    }
  }

  const field =
    'mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-400'

  return (
    <li className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="font-mono text-xs text-slate-500">{task.quoteId}</span>
        <span className="text-xs text-slate-500">
          opened {task.createdAt} · {task.queue}
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="font-medium">Reviewer</span>
          <input
            value={reviewer}
            onChange={(e) => setReviewer(e.target.value)}
            className={field}
            placeholder="Name or ID"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium">Reason</span>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className={field}
            placeholder="Why this decision"
          />
        </label>
      </div>

      {error && (
        <p role="alert" className="mt-2 text-sm text-rose-700">
          {error}
        </p>
      )}

      <div className="mt-4 flex gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => resolve('approved')}
          className="rounded-md bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-60"
        >
          Approve
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => resolve('declined')}
          className="rounded-md border border-rose-300 px-3 py-1.5 text-sm font-medium text-rose-800 shadow-sm hover:bg-rose-50 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:ring-offset-2 disabled:opacity-60"
        >
          Decline
        </button>
      </div>
    </li>
  )
}
