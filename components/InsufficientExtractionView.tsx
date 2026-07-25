"use client";

interface InsufficientExtractionViewProps {
  reason: string;
}

/**
 * A distinct refusal path from ResultsView's insufficient-cohort-data
 * refusal. This one fires before /api/match is ever called — the note
 * itself didn't contain enough to identify a condition or extract
 * meaningful clinical detail. There's no case to confirm and nothing to
 * match against, so this never reaches the confirmation form at all.
 *
 * Deliberately styled as the sibling of the cohort refusal (same hairline
 * rules, same centered hero glyph, same label rhythm) so both refusals read
 * as one considered design language — distinguished by symbol (∅ vs N=)
 * since there's no cohort number here to show.
 */
export function InsufficientExtractionView({ reason }: InsufficientExtractionViewProps) {
  return (
    <div className="w-full">
      <h2 className="text-xs font-medium uppercase tracking-[0.14em] text-faint">Case intake</h2>

      <div className="mt-8 border-y border-hairline py-10 text-center">
        <p className="font-mono text-6xl font-medium tracking-tight text-primary">∅</p>
        <p className="mt-3 text-xs font-medium uppercase tracking-[0.2em] text-faint">
          Cannot process this note
        </p>
        <p className="mx-auto mt-4 max-w-md text-sm text-muted">{reason}</p>
        <p className="mx-auto mt-4 max-w-md text-xs text-faint">
          Distinct from the engine&apos;s cohort-size refusal — this fires before a match is ever
          attempted, because there was nothing here to build a case from.
        </p>
      </div>

      <p className="mt-4 text-sm text-muted">
        Try a different note, or load one of the example notes from the rail.
      </p>
    </div>
  );
}
