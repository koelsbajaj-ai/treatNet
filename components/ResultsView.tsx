"use client";

import { useState } from "react";
import type { ConfidenceTier, MatchResult } from "@/lib/types";
import { ProvenanceModal } from "./ProvenanceModal";

interface ResultsViewProps {
  result: MatchResult;
  onStartOver: () => void;
}

function TierBadge({ tier }: { tier: ConfidenceTier }) {
  const styles: Record<ConfidenceTier, string> = {
    moderate: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
    low: "bg-amber-200 text-amber-900 dark:bg-amber-900 dark:text-amber-100",
    insufficient: "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  };
  const labels: Record<ConfidenceTier, string> = {
    moderate: "Moderate confidence",
    low: "Low confidence",
    insufficient: "Insufficient data",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${styles[tier]}`}>
      {labels[tier]}
    </span>
  );
}

export function ResultsView({ result, onStartOver }: ResultsViewProps) {
  const [selectedRef, setSelectedRef] = useState<string | null>(null);

  return (
    <div className="w-full max-w-2xl">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Results</h2>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Matched on: condition {result.matchedOn.conditionCode}, severity{" "}
        {result.matchedOn.severityCode} = &ldquo;{result.matchedOn.severityValue}&rdquo;, age band{" "}
        {result.matchedOn.ageBand}. Cohort size: {result.cohortSize}.
      </p>
      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
        Retrospective association from synthetic records, not a randomized comparison.
        Treatments were not randomly assigned to patients.
      </p>

      {result.insufficientData && (
        <div className="mt-4 rounded-md border-2 border-zinc-400 bg-zinc-100 p-4 dark:border-zinc-600 dark:bg-zinc-800">
          <p className="font-semibold text-zinc-900 dark:text-zinc-100">
            Insufficient data — no recommendation.
          </p>
          <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
            The best-matched treatment in this cohort falls below the minimum sample size (N=5).
            The engine refuses to rank rather than show a confident-looking result it can&apos;t
            back up.
          </p>
        </div>
      )}

      {!result.insufficientData && result.ranked.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
            Ranked treatments
          </h3>
          <div className="mt-2 space-y-2">
            {result.ranked.map((row, rank) => (
              <div
                key={row.treatmentCode}
                className="rounded-md border border-zinc-200 p-3 dark:border-zinc-800"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">
                    #{rank + 1} {row.treatmentDisplay}
                  </span>
                  <TierBadge tier={row.confidenceTier} />
                </div>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  N={row.n} · {(row.successRate * 100).toFixed(0)}% improved ({row.successCount}/
                  {row.n}) · {row.adverseEventCount} adverse event
                  {row.adverseEventCount === 1 ? "" : "s"}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-1">
                  <span className="text-xs text-zinc-500 dark:text-zinc-500">Patients:</span>
                  {row.patientRefs.map((ref) => (
                    <button
                      key={ref}
                      type="button"
                      onClick={() => setSelectedRef(ref)}
                      className="rounded border border-zinc-300 bg-zinc-50 px-1.5 py-0.5 text-xs font-medium text-zinc-700 hover:border-blue-500 hover:bg-blue-50 hover:text-blue-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:border-blue-400 dark:hover:bg-blue-950 dark:hover:text-blue-300"
                    >
                      {ref}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {result.gated.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-semibold text-red-700 dark:text-red-400">
            Avoid — excluded by contraindication gate
          </h3>
          <div className="mt-2 space-y-2">
            {result.gated.map((row, i) => (
              <div
                key={`${row.treatmentCode}-${i}`}
                className="rounded-md border-2 border-red-400 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950"
              >
                <span className="font-medium text-red-900 dark:text-red-200">
                  {row.treatmentDisplay}
                </span>
                <p className="mt-1 text-sm text-red-800 dark:text-red-300">{row.reason}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={onStartOver}
        className="mt-6 rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        Start over
      </button>

      {selectedRef && (
        <ProvenanceModal
          key={selectedRef}
          syntheticRef={selectedRef}
          onClose={() => setSelectedRef(null)}
        />
      )}
    </div>
  );
}
