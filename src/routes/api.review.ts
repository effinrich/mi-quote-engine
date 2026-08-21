/**
 * /api/review — the human-in-the-loop queue.
 *
 * GET lists pending and resolved tasks. POST resolves one, recording who
 * decided, what they decided, and why. The note is required: an override
 * without a stated reason is not reviewable later, which defeats the purpose
 * of routing the file to a person in the first place.
 *
 * Authentication is out of scope for this demo and the reviewer identity is
 * taken from the request body — see README. In a real deployment the reviewer
 * comes from the verified session and entitlement to resolve a task is checked
 * server-side, never inferred from the client.
 */

import { createFileRoute } from '@tanstack/react-router'
import { listReviewTasks, resolveReviewTask } from '#/server/store'

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  })
}

export const Route = createFileRoute('/api/review')({
  server: {
    handlers: {
      GET: async () => json({ tasks: await listReviewTasks() }, 200),

      POST: async ({ request }) => {
        let body: Record<string, unknown>
        try {
          body = (await request.json()) as Record<string, unknown>
        } catch {
          return json({ error: 'Invalid JSON body.' }, 400)
        }

        const { taskId, status, reviewer, note } = body
        const errors: Array<string> = []
        if (typeof taskId !== 'string' || !taskId)
          errors.push('taskId is required.')
        if (status !== 'approved' && status !== 'declined')
          errors.push('status must be "approved" or "declined".')
        if (typeof reviewer !== 'string' || !reviewer.trim())
          errors.push('reviewer is required.')
        if (typeof note !== 'string' || !note.trim())
          errors.push('note is required — record why this decision was made.')

        if (errors.length)
          return json({ error: 'Validation failed.', details: errors }, 422)

        const task = await resolveReviewTask({
          taskId: taskId as string,
          status: status as 'approved' | 'declined',
          reviewer: (reviewer as string).trim(),
          note: (note as string).trim(),
          resolvedAt: new Date().toISOString(),
        })

        if (!task)
          return json({ error: 'Task not found or already resolved.' }, 409)

        return json(task, 200)
      },
    },
  },
})
