"use client";

import { useState } from "react";
import type { ConfidenceTier, ExtractedTreatmentHistoryItem, MatchResult } from "@/lib/types";
import { ProvenanceModal, type ProvenanceCitation } from "./ProvenanceModal";

function citationKey(citation: ProvenanceCitation): string {
  if (citation.kind === "patient") return `patient:${citation.ref}`;
  if (citation.kind === "rule") return `rule:${citation.ruleId}`;
  return `cohort:${citation.conditionCode}:${citation.severityCode}:${citation.severityValue}:${citation.ageBand}`;
}

interface ResultsViewProps {
  result: MatchResult;
  /** From the confirmed case's extraction — informational only, never sent to /api/match. */
  treatmentHistory: ExtractedTreatmentHistoryItem[];
}

// Purely a display heuristic — matches this row's treatment against the
// confirmed case's own treatment history by exact display name (case-
// insensitive). A miss just means no badge; it never changes a number or
// a rank, so a false negative here carries no safety risk.
function findHistoryMatch(
  treatmentDisplay: string,
  history: ExtractedTreatmentHistoryItem[]
): ExtractedTreatmentHistoryItem | undefined {
  const normalized = treatmentDisplay.trim().toLowerCase();
  return history.find((item) => item.display.trim().toLowerCase() === normalized);
}

const ADHERENCE_KEYWORDS = ["adher", "missed appointment", "compliance", "compliant", "poor adherence"];

function isAdherenceRelated(note: string): boolean {
  const lower = note.toLowerCase();
  return ADHERENCE_KEYWORDS.some((keyword) => lower.includes(keyword));
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

export function ResultsView({ result, treatmentHistory }: ResultsViewProps) {
  const [selectedCitation, setSelectedCitation] = useState<ProvenanceCitation | null>(null);

  return (
    <div className="w-full max-w-2xl">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Results</h2>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Matched on: condition {result.matchedOn.conditionCode}, severity{" "}
        {result.matchedOn.severityCode} = &ldquo;{result.matchedOn.severityValue}&rdquo;, age band{" "}
        {result.matchedOn.ageBand}. Cohort size:{" "}
        <button
          type="button"
          onClick={() =>
            setSelectedCitation({
              kind: "cohort",
              conditionCode: result.matchedOn.conditionCode,
              severityCode: result.matchedOn.severityCode,
              severityValue: result.matchedOn.severityValue,
              ageBand: result.matchedOn.ageBand,
            })
          }
          className="font-semibold text-blue-700 underline decoration-dotted hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
        >
          {result.cohortSize}
        </button>
        .
      </p>
      <div className="mt-2 rounded-md border border-zinc-300 bg-zinc-50 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900">
        <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
          Retrospective association from synthetic records, not a randomized comparison.
          Treatments were not randomly assigned to patients.
        </p>
      </div>

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
            {result.ranked.map((row, rank) => {
              const historyMatch = findHistoryMatch(row.treatmentDisplay, treatmentHistory);
              return (
                <div
                  key={row.treatmentCode}
                  className="rounded-md border border-zinc-200 p-3 dark:border-zinc-800"
                >
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 font-medium text-zinc-900 dark:text-zinc-100">
                      #{rank + 1} {row.treatmentDisplay}
                      {historyMatch && (
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                          Patient currently on this
                        </span>
                      )}
                    </span>
                    <TierBadge tier={row.confidenceTier} />
                  </div>
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                    N={row.n} · {(row.successRate * 100).toFixed(0)}% improved ({row.successCount}/
                    {row.n}) · {row.adverseEventCount} adverse event
                    {row.adverseEventCount === 1 ? "" : "s"}
                  </p>
                  {historyMatch && isAdherenceRelated(historyMatch.note) && (
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
                      This cohort&apos;s outcomes reflect a range of adherence levels, not drug
                      efficacy alone — re-trial with adherence support is a legitimate clinical
                      option.
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-1">
                    <span className="text-xs text-zinc-500 dark:text-zinc-500">Patients:</span>
                    {row.patientRefs.map((ref) => (
                      <button
                        key={ref}
                        type="button"
                        onClick={() => setSelectedCitation({ kind: "patient", ref })}
                        className="rounded border border-zinc-300 bg-zinc-50 px-1.5 py-0.5 text-xs font-medium text-zinc-700 hover:border-blue-500 hover:bg-blue-50 hover:text-blue-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:border-blue-400 dark:hover:bg-blue-950 dark:hover:text-blue-300"
                      >
                        {ref}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
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
                <button
                  type="button"
                  onClick={() =>
                    setSelectedCitation({
                      kind: "rule",
                      ruleId: row.ruleId,
                      treatmentDisplay: row.treatmentDisplay,
                    })
                  }
                  className="mt-1 text-xs font-medium text-red-700 underline decoration-dotted hover:text-red-900 dark:text-red-300 dark:hover:text-red-100"
                >
                  View rule
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedCitation && (
        <ProvenanceModal
          key={citationKey(selectedCitation)}
          citation={selectedCitation}
          onClose={() => setSelectedCitation(null)}
          onSelectPatient={(ref) => setSelectedCitation({ kind: "patient", ref })}
        />
      )}
    </div>
  );
}
