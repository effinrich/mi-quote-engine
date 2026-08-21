import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/about')({ component: AboutPage })

/**
 * Declaring what the system does not model is part of the product, not a
 * footnote to it. A decisioning tool that quietly extrapolates past its
 * verified rules is worse than one that stops and says so.
 */
function AboutPage() {
  return (
    <article className="prose-slate max-w-2xl space-y-8">
      <section>
        <h1 className="text-xl font-semibold tracking-tight">How it works</h1>
        <p className="mt-3 text-sm leading-6 text-slate-700">
          A request goes to a single Backend-for-Frontend endpoint,{' '}
          <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">
            POST /api/quote
          </code>
          . That endpoint derives the loan-to-value and required coverage,
          evaluates the eligibility rules, prices the loan from a versioned rate
          card, opens a review task if the decision was a referral, writes the
          whole thing to the audit log, and returns it in one response. The
          browser makes one round-trip and renders — it performs no composition,
          interprets no rules, and does no arithmetic on money.
        </p>
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Decision precedence
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-700">
          Rules carry a severity rather than an outcome. Any rule at{' '}
          <strong>decline</strong> severity produces a decline; failing that, any
          rule at <strong>refer</strong> severity produces a referral; otherwise
          the loan is approved. Because the outcome is derived from the set of
          rules that fired, adding a rule never requires rewriting the decision
          logic, and every outcome can be traced back to the specific rules
          responsible for it.
        </p>
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Where the AI sits
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-700">
          Downstream of the decision, and nowhere else. The rules engine is
          deterministic and contains no model. The explainer is a separate
          endpoint that reads a decision <em>already recorded in the audit log</em>{' '}
          and narrates it — it cannot re-decide, and it cannot be handed a
          modified result to describe.
        </p>
        <p className="mt-2 text-sm leading-6 text-slate-700">
          Prompt instructions alone are not treated as sufficient. Every model
          response passes a numeric grounding check: any figure in the generated
          text that does not appear in the engine&rsquo;s recorded result causes
          the response to be rejected, and the deterministic explanation is
          served instead. A model asked to explain a premium will otherwise
          produce a plausible number nobody computed — this check makes that
          structurally impossible to display.
        </p>
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Human in the loop
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-700">
          Referred loans are not decided automatically. They open a task in the
          review queue and stay pending until a person resolves them with a
          recorded identity and a written reason. Both fields are required — an
          override nobody can account for later defeats the purpose of routing
          the file to a human at all.
        </p>
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Data provenance
        </h2>
        <ul className="mt-2 space-y-2 text-sm leading-6 text-slate-700">
          <li>
            <strong>Coverage tiers</strong> are the published GSE
            standard-coverage requirements, including the reduced tiers that
            apply to terms of twenty years or less. These are real.
          </li>
          <li>
            <strong>Rate card and eligibility thresholds are synthetic.</strong>{' '}
            They are shaped like published rate cards and eligibility matrices
            so the engine exercises realistic lookup, banding, and adjustment
            logic, but they are invented and represent no insurer&rsquo;s
            pricing or guidelines.
          </li>
          <li>
            Every result is stamped with the rate-card and rule-set version in
            force when it was evaluated, so a quote stays reproducible after
            either one changes.
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          What this does not model
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-700">
          Stated plainly, because the boundary of the rule set is the most
          important thing to publish about a decisioning system:
        </p>
        <ul className="mt-2 list-inside list-disc space-y-1 text-sm leading-6 text-slate-700">
          <li>
            Borrower-paid monthly premium only — no single-premium, split-premium,
            or lender-paid structures.
          </li>
          <li>
            No high-cost-area conforming limits; the baseline one-unit limit is
            applied everywhere.
          </li>
          <li>
            No self-employment, reserves, residual income, first-time-buyer, or
            documentation-type rules.
          </li>
          <li>
            No state-level overlays, no master-policy terms, and no rescission or
            claims logic.
          </li>
          <li>
            Authentication is out of scope: the reviewer identity is supplied by
            the client rather than derived from a verified session.
          </li>
          <li>
            On this hosted demo the audit log is written to the serverless
            instance&rsquo;s temp directory, so it does not survive a cold start
            and is not shared between instances. Quotes and review tasks you
            create may disappear. A real audit trail needs a durable
            append-only store.
          </li>
        </ul>
      </section>
    </article>
  )
}
