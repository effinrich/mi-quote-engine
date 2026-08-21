import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

export function getRouter() {
  const router = createTanStackRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 0,
    defaultNotFoundComponent: () => (
      <div className="rounded-lg border border-dashed border-slate-300 p-8">
        <h1 className="text-lg font-semibold">Page not found</h1>
        <p className="mt-2 text-sm text-slate-600">
          That route doesn&rsquo;t exist. Try the quote form, the review queue,
          or the explanation of how this works.
        </p>
      </div>
    ),
  })

  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
