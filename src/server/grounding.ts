/**
 * Numeric grounding check for model-generated text.
 *
 * The explainer's only job is to narrate a decision the engine already made.
 * Prompting alone does not guarantee that — a model asked to explain a
 * premium will cheerfully produce a plausible number that nobody computed. So
 * the prompt is backed by a mechanical check: every number in the generated
 * text must already appear somewhere in the engine's result, or the response
 * is rejected and the deterministic fallback is served instead.
 *
 * This is deliberately strict. A false rejection costs a nicer sentence; a
 * false acceptance puts an invented rate in front of someone pricing a loan.
 */

/**
 * Numbers the explainer may use even though they are not in the result:
 * 12 (months in a year) and 100 (percent conversions) show up in ordinary
 * phrasing without asserting anything about the quote.
 */
const PERMITTED_CONSTANTS = new Set(['12', '100'])

const NUMBER_PATTERN = /\d[\d,]*(?:\.\d+)?/g

/** Collapses formatting differences so "1,234.00" and "1234" compare equal. */
function normalize(raw: string): string {
  const parsed = Number.parseFloat(raw.replace(/,/g, ''))
  return Number.isFinite(parsed) ? String(parsed) : raw
}

function collectNumbers(value: unknown, into: Set<string>): void {
  if (typeof value === 'number') {
    into.add(String(value))
    return
  }
  if (typeof value === 'string') {
    for (const match of value.matchAll(NUMBER_PATTERN)) {
      into.add(normalize(match[0]))
    }
    return
  }
  if (Array.isArray(value)) {
    for (const item of value) collectNumbers(item, into)
    return
  }
  if (value && typeof value === 'object') {
    for (const item of Object.values(value)) collectNumbers(item, into)
  }
}

export interface GroundingReport {
  grounded: boolean
  /** Numbers found in the text that do not appear in the source data. */
  ungrounded: Array<string>
}

/**
 * Builds the allowlist from the source object, then checks the text against
 * it. Derived values a reader would reasonably expect — the monthly premium
 * times twelve, for instance — must be present in the source object rather
 * than recomputed here, which is why the engine returns both annual and
 * monthly figures.
 */
export function checkNumericGrounding(
  text: string,
  source: unknown,
): GroundingReport {
  const allowed = new Set<string>()
  collectNumbers(source, allowed)

  const ungrounded: Array<string> = []
  for (const match of text.matchAll(NUMBER_PATTERN)) {
    const raw = match[0]
    const normalized = normalize(raw)
    if (allowed.has(normalized) || PERMITTED_CONSTANTS.has(normalized)) continue
    if (!ungrounded.includes(raw)) ungrounded.push(raw)
  }

  return { grounded: ungrounded.length === 0, ungrounded }
}
