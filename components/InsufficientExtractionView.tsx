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
 */
export function InsufficientExtractionView({ reason }: InsufficientExtractionViewProps) {
  return (
    <div className="w-full max-w-2xl">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        Cannot process this note
      </h2>
      <div className="mt-4 rounded-md border-2 border-amber-500 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-950">
        <p className="font-semibold text-amber-900 dark:text-amber-100">
          Too little clinical detail to extract a case.
        </p>
        <p className="mt-1 text-sm text-amber-800 dark:text-amber-200">{reason}</p>
        <p className="mt-3 text-sm text-amber-800 dark:text-amber-200">
          This is different from the engine&apos;s &ldquo;insufficient data&rdquo; refusal, which
          only happens after a case is matched against too small a cohort. Here, there was nothing
          to build a case from in the first place — a real diagnosis and some clinical detail are
          needed before a match can even be attempted.
        </p>
      </div>
      <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
        Try a different note, or load one of the example notes above.
      </p>
    </div>
  );
}
