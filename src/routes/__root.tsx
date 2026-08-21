import { HeadContent, Link, Scripts, createRootRoute } from '@tanstack/react-router'

import appCss from '../styles.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'MI Rate & Eligibility Engine' },
      {
        name: 'description',
        content:
          'A demonstration mortgage-insurance pricing and eligibility engine with rule-level provenance, human review, and a grounded AI explainer.',
      },
    ],
    links: [{ rel: 'stylesheet', href: appCss }],
  }),
  shellComponent: RootDocument,
})

const NAV = [
  { to: '/', label: 'Quote' },
  { to: '/review', label: 'Review queue' },
  { to: '/about', label: 'How it works' },
] as const

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <head>
        <HeadContent />
      </head>
      <body className="min-h-full bg-slate-50 text-slate-900 antialiased">
        <div
          role="note"
          className="bg-amber-100 px-4 py-2 text-center text-sm text-amber-900"
        >
          <strong className="font-semibold">Demonstration only.</strong> Rates and
          eligibility thresholds are illustrative and synthetic. Not affiliated
          with, and not representative of, any insurer&rsquo;s pricing.
        </div>

        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-8 gap-y-3 px-4 py-4">
            <Link to="/" className="text-lg font-semibold tracking-tight">
              MI Rate &amp; Eligibility Engine
            </Link>
            <nav className="flex gap-6 text-sm">
              {NAV.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="text-slate-600 transition-colors hover:text-slate-900"
                  activeProps={{ className: 'text-slate-900 font-medium' }}
                  activeOptions={{ exact: item.to === '/' }}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>

        <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>

        <footer className="mx-auto max-w-5xl px-4 pb-12 text-xs text-slate-500">
          Built as a working demonstration of Backend-for-Frontend composition
          over a regulated decisioning workflow.
        </footer>

        <Scripts />
      </body>
    </html>
  )
}
