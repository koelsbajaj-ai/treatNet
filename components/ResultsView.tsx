"use client";

import { useState } from "react";
import Link from "next/link";
import type { ExtractedTreatmentHistoryItem, MatchResult } from "@/lib/types";
import { TierMeter } from "./ConfidenceMeter";
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
  /** Condition code, for the "view full landscape" link — omitted has no link. */
  conditionCode?: string;
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

function RankMarker({ n }: { n: number }) {
  return (
    <span className="w-7 shrink-0 pt-1 font-mono text-xs tnum text-faint">
      {String(n).padStart(2, "0")}
    </span>
  );
}

export function ResultsView({ result, treatmentHistory, conditionCode }: ResultsViewProps) {
  const [selectedCitation, setSelectedCitation] = useState<ProvenanceCitation | null>(null);

  return (
    <div className="w-full">
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-xs font-medium uppercase tracking-[0.14em] text-faint">Results</h2>
        {conditionCode && (
          <Link
            href={`/landscape?condition=${encodeURIComponent(conditionCode)}`}
            className="text-xs text-accent underline decoration-dotted underline-offset-2 transition-colors duration-150 hover:text-accent-hover"
          >
            View full treatment landscape →
          </Link>
        )}
      </div>
      <p className="mt-2 text-sm text-muted">
        Matched on condition <span className="font-mono tnum">{result.matchedOn.conditionCode}</span>
        , severity <span className="font-mono tnum">{result.matchedOn.severityCode}</span> = &ldquo;
        {result.matchedOn.severityValue}&rdquo;, age band{" "}
        <span className="font-mono tnum">{result.matchedOn.ageBand}</span>. Cohort size:{" "}
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
          className="font-mono tnum font-medium text-accent underline decoration-dotted underline-offset-2 transition-colors duration-150 hover:text-accent-hover"
        >
          {result.cohortSize}
        </button>
        .
      </p>
      <div className="mt-3 border-y border-hairline py-2">
        <p className="text-xs text-muted">
          Retrospective association from synthetic records, not a randomized comparison.
          Treatments were not randomly assigned to patients.
        </p>
      </div>

      {result.insufficientData && (
        <div className="mt-8 border-y border-hairline py-10 text-center">
          <p className="font-mono text-6xl font-medium tracking-tight tnum text-primary">
            N={result.cohortSize}
          </p>
          <p className="mt-3 text-xs font-medium uppercase tracking-[0.2em] text-faint">
            Below minimum cohort — no ranking
          </p>
          <p className="mx-auto mt-4 max-w-md text-sm text-muted">
            The best-matched treatment in this cohort falls below the minimum sample size (N=5).
            The engine refuses to rank rather than show a confident-looking result it can&apos;t
            back up.
          </p>
        </div>
      )}

      {!result.insufficientData && result.ranked.length > 0 && (
        <div className="mt-8">
          <h3 className="text-xs font-medium uppercase tracking-[0.14em] text-faint">
            Ranked treatments
          </h3>
          <div className="mt-3 divide-y divide-hairline border-t border-hairline">
            {result.ranked.map((row, rank) => {
              const historyMatch = findHistoryMatch(row.treatmentDisplay, treatmentHistory);
              return (
                <div key={row.treatmentCode} className="flex gap-3 py-5">
                  <RankMarker n={rank + 1} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-primary">{row.treatmentDisplay}</span>
                        {historyMatch && (
                          <span className="border border-accent px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-accent">
                            Patient currently on this
                          </span>
                        )}
                      </div>
                      <span className="font-mono text-3xl font-medium leading-none tracking-tight tnum text-primary">
                        {(row.successRate * 100).toFixed(0)}
                        <span className="text-lg text-faint">%</span>
                      </span>
                    </div>

                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="font-mono text-xs tnum text-muted">
                        N={row.n} · {row.successCount}/{row.n} improved · {row.adverseEventCount}{" "}
                        adverse event{row.adverseEventCount === 1 ? "" : "s"}
                      </span>
                      <TierMeter tier={row.confidenceTier} />
                    </div>

                    {historyMatch && isAdherenceRelated(historyMatch.note) && (
                      <p className="mt-1.5 text-xs text-faint">
                        This cohort&apos;s outcomes reflect a range of adherence levels, not drug
                        efficacy alone — re-trial with adherence support is a legitimate clinical
                        option.
                      </p>
                    )}

                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                      <span className="text-xs text-faint">Patients:</span>
                      {row.patientRefs.map((ref) => (
                        <button
                          key={ref}
                          type="button"
                          onClick={() => setSelectedCitation({ kind: "patient", ref })}
                          className="border border-hairline px-1.5 py-0.5 font-mono text-[11px] tnum text-muted transition-colors duration-150 hover:border-accent hover:text-accent"
                        >
                          {ref}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {result.gated.length > 0 && (
        <div className="mt-8">
          <h3 className="text-xs font-medium uppercase tracking-[0.14em] text-faint">
            Excluded — contraindication gate
          </h3>
          <div className="mt-3 divide-y divide-hairline border-t border-hairline">
            {result.gated.map((row, i) => (
              <div key={`${row.treatmentCode}-${i}`} className="flex gap-3 py-4">
                <span className="w-7 shrink-0 pt-0.5 font-mono text-xs text-faint">✕</span>
                <div className="min-w-0 flex-1">
                  <span className="font-medium text-muted line-through decoration-faint">
                    {row.treatmentDisplay}
                  </span>
                  <p className="mt-1 text-sm text-muted">{row.reason}</p>
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedCitation({
                        kind: "rule",
                        ruleId: row.ruleId,
                        treatmentDisplay: row.treatmentDisplay,
                      })
                    }
                    className="mt-1 text-xs text-accent underline decoration-dotted underline-offset-2 transition-colors duration-150 hover:text-accent-hover"
                  >
                    View rule
                  </button>
                </div>
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
