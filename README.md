# MI Rate & Eligibility Engine

A working demonstration of **Backend-for-Frontend composition over a regulated decisioning
workflow**: mortgage-insurance pricing and eligibility, where every number traces to a rule,
every referral reaches a human, and the AI layer cannot invent a figure even if it tries.

> **Demonstration only.** The rate card and eligibility thresholds are synthetic. They are
> shaped like published rate cards and eligibility matrices so the engine exercises realistic
> banding, lookup, and adjustment logic, but they represent no insurer's pricing or
> guidelines, and the project is not affiliated with any insurer.

```bash
pnpm install
pnpm dev      # http://localhost:3000
pnpm test     # 25 tests
pnpm build
```

---

## The BFF, and why it is shaped this way

One endpoint — `POST /api/quote` — returns everything the quote screen renders:

```
derived facts  →  ltv, required coverage, pricing bands
decision       →  approve | refer | decline, plus every rule that fired, with its source
premium        →  base rate, each adjustment itemised, final rate, annual and monthly
review task    →  opened automatically when the decision is a referral
provenance     →  quote id, rate-card version, rule-set version, evaluation timestamp
```

The client makes **one round-trip and renders**. It performs no composition, interprets no
rules, and does no arithmetic on money. Everything that could disagree with the system of
record happens server-side.

**Why REST with a versioned contract rather than GraphQL or tRPC.** The BFF idea that matters
is *journey-shaped endpoints* — the protocol is secondary. For this domain the contract should
be fixed and versioned rather than client-shaped, because the question a regulated workflow
has to answer months later is "what exactly was asked, and what exactly was returned." A
client-shaped query language makes that harder. tRPC additionally assumes you own both ends in
TypeScript, which is rarely true when a BFF fronts enterprise services. The contract lives in
[`contracts/openapi.yaml`](contracts/openapi.yaml); `src/lib/api.ts` is hand-written here
because there is one consumer, and stands in for a client generated from that contract.

## Decisions are derived, not hard-coded

Rules carry a **severity**, not an outcome:

```ts
{ ruleId: 'ELIG-010', description: '…', severity: 'refer', source: '…' }
```

The engine collects every rule that fired and derives the result — any `decline` produces a
decline, otherwise any `refer` produces a referral, otherwise approve. Adding a rule never
means rewriting decision logic, and every outcome decomposes into the specific rules
responsible for it. A declined loan is never quoted a premium: a number tends to outlive the
decision attached to it.

The engine (`src/domain/engine.ts`) is pure — no network, no clock-dependent branching, no
model. The same request always produces the same result, which is what makes the audit log
worth keeping.

## Where the AI sits, and what stops it

Downstream of the decision, and nowhere else. `POST /api/explain` takes a **quoteId**, not a
result body, so narration is always generated from what was recorded — a client cannot hand
the model a modified result and have it describe that instead.

Three layers, in order of trust:

1. **Deterministic template** built from the result. Always correct, always available.
2. **Model pass** that rewrites the same facts more naturally.
3. **Numeric grounding check** (`src/server/grounding.ts`) — every number in the generated
   text must already appear in the engine's result, or the response is rejected and layer 1 is
   served instead.

Layer 3 is the interesting one. Prompting alone does not prevent a model from producing a
plausible premium nobody computed; a mechanical check does. It is deliberately strict enough
to reject a number that is *arithmetically correct but absent from the result* — if the
monthly premium times twelve should be displayable, the engine must return that figure, not
the model recompute it. A false rejection costs a nicer sentence. A false acceptance puts an
invented rate in front of someone pricing a loan.

The prompt also treats retrieved content as data rather than instructions, refuses
underwriting advice, and forbids re-deciding the outcome. The UI always labels which layer
produced the text, so the source is never ambiguous to the reader.

Without `ANTHROPIC_API_KEY` set, the app runs fully on layer 1.

## Human in the loop

Referred loans are not decided automatically. They open a task in `/review` and stay pending
until a person resolves them with a recorded identity and a **written reason** — both
required, because an override nobody can account for later defeats the purpose of routing the
file to a human. Resolution is single-shot; a resolved task returns `409`.

## Layout

```
src/domain/      rate-card, coverage, adjustments, eligibility, engine   (pure, tested)
src/server/      parse, store, grounding, explain                        (server-only)
src/routes/      api.quote, api.explain, api.review                      (the BFF)
                 index, review, about                                    (the UI)
contracts/       openapi.yaml
```

## Tests

25 tests across the engine and the grounding check, covering band-boundary behaviour
(a 95.00% LTV belongs to the 90.01–95 band, not 95.01–97 — getting that backwards
silently overprices every loan on a boundary), decision precedence, determinism, and the
grounding validator's rejection of invented and recomputed figures.

## Known limits

Published rather than buried, because the boundary of the rule set is the most important
thing to state about a decisioning system. The full list is on the **How it works** page in
the app; the short version:

- Borrower-paid monthly premium only — no single, split, or lender-paid structures.
- Baseline conforming limit only; no high-cost-area limits.
- No self-employment, reserves, residual income, or documentation-type rules.
- No state overlays, master-policy terms, rescission, or claims logic.
- **No authentication.** The reviewer identity comes from the request body. In a real
  deployment it comes from a verified session and entitlement to resolve a task is checked
  server-side — never inferred from the client.
- File-backed JSON persistence. A real audit trail needs an append-only store with retention
  guarantees; the storage interface is narrow so swapping it touches one file.
- **On the hosted demo the audit log is ephemeral.** Serverless runtimes mount a read-only
  filesystem apart from the temp directory, so records are written per-instance and do not
  survive a cold start. Set `DATA_DIR` to a mounted volume where one exists.

## Stack

TanStack Start (React 19), TypeScript, Tailwind CSS 4, Vitest, Anthropic SDK.
