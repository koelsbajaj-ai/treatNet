"use client";

import { useEffect, useState } from "react";
import type { ProvenanceRecord } from "@/lib/types";

interface ProvenanceModalProps {
  syntheticRef: string;
  onClose: () => void;
}

export function ProvenanceModal({ syntheticRef, onClose }: ProvenanceModalProps) {
  const [record, setRecord] = useState<ProvenanceRecord | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/provenance?ref=${encodeURIComponent(syntheticRef)}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? `Lookup failed (${res.status})`);
        }
        return (await res.json()) as ProvenanceRecord;
      })
      .then((data) => {
        if (!cancelled) setRecord(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setErrorMessage(err instanceof Error ? err.message : "Lookup failed.");
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [syntheticRef]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[80vh] w-full max-w-md overflow-y-auto rounded-lg bg-white p-5 shadow-xl dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Synthetic patient {syntheticRef}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {isLoading && (
          <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">Loading record...</p>
        )}

        {errorMessage && (
          <p className="mt-4 text-sm text-red-700 dark:text-red-400">{errorMessage}</p>
        )}

        {record && (
          <div className="mt-4 space-y-4 text-sm">
            <div>
              <p className="text-zinc-500 dark:text-zinc-500">
                {record.sex}, born {record.birthDate}
              </p>
              <p className="mt-1 font-medium text-zinc-900 dark:text-zinc-100">
                {record.condition.display} ({record.condition.clinicalStatus})
              </p>
            </div>

            {record.observations.length > 0 && (
              <div>
                <h4 className="font-semibold text-zinc-700 dark:text-zinc-300">Observations</h4>
                <ul className="mt-1 space-y-1 text-zinc-600 dark:text-zinc-400">
                  {record.observations.map((obs, i) => (
                    <li key={i}>
                      {obs.display}:{" "}
                      {obs.valueText ?? `${obs.valueQuantity ?? "?"}${obs.unit ? ` ${obs.unit}` : ""}`}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {record.treatments.length > 0 && (
              <div>
                <h4 className="font-semibold text-zinc-700 dark:text-zinc-300">
                  Treatment &amp; outcome
                </h4>
                <ul className="mt-1 space-y-2 text-zinc-600 dark:text-zinc-400">
                  {record.treatments.map((t, i) => (
                    <li key={i}>
                      <span className="font-medium text-zinc-800 dark:text-zinc-200">
                        {t.display}
                      </span>{" "}
                      — {t.status} ({t.startDate}
                      {t.endDate ? ` to ${t.endDate}` : ""})
                      {t.outcomeCode && (
                        <p className="mt-0.5">
                          Outcome: <span className="font-medium">{t.outcomeCode}</span>
                          {t.outcomeNotes ? ` — ${t.outcomeNotes}` : ""}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <p className="text-xs text-zinc-500 dark:text-zinc-500">
              This is a synthetic record, not a real patient.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
