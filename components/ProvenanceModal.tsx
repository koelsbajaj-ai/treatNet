"use client";

import { useEffect, useState } from "react";
import type { CohortProvenance, ProvenanceRecord, RuleProvenance } from "@/lib/types";

export type ProvenanceCitation =
  | { kind: "patient"; ref: string }
  | { kind: "rule"; ruleId: string; treatmentDisplay: string }
  | {
      kind: "cohort";
      conditionCode: string;
      severityCode: string;
      severityValue: string;
      ageBand: string;
    };

interface ProvenanceModalProps {
  citation: ProvenanceCitation;
  onClose: () => void;
  /** Cohort mode only: lets a clinician drill from the patient list into one record. */
  onSelectPatient?: (ref: string) => void;
}

function citationQuery(citation: ProvenanceCitation): string {
  if (citation.kind === "patient") return `ref=${encodeURIComponent(citation.ref)}`;
  if (citation.kind === "rule") return `ruleId=${encodeURIComponent(citation.ruleId)}`;
  return [
    `conditionCode=${encodeURIComponent(citation.conditionCode)}`,
    `severityCode=${encodeURIComponent(citation.severityCode)}`,
    `severityValue=${encodeURIComponent(citation.severityValue)}`,
    `ageBand=${encodeURIComponent(citation.ageBand)}`,
  ].join("&");
}

export function ProvenanceModal({ citation, onClose, onSelectPatient }: ProvenanceModalProps) {
  const [record, setRecord] = useState<ProvenanceRecord | RuleProvenance | CohortProvenance | null>(
    null
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/provenance?${citationQuery(citation)}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? `Lookup failed (${res.status})`);
        }
        return await res.json();
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
  }, [citation]);

  const title =
    citation.kind === "patient"
      ? `Synthetic patient ${citation.ref}`
      : citation.kind === "rule"
        ? `Contraindication rule — ${citation.treatmentDisplay}`
        : "Cohort — all matched patient records";

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
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{title}</h3>
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

        {record && citation.kind === "patient" && (
          <PatientDetail record={record as ProvenanceRecord} />
        )}
        {record && citation.kind === "rule" && <RuleDetail rule={record as RuleProvenance} />}
        {record && citation.kind === "cohort" && (
          <CohortDetail
            cohort={record as CohortProvenance}
            onSelectPatient={onSelectPatient}
          />
        )}
      </div>
    </div>
  );
}

function PatientDetail({ record }: { record: ProvenanceRecord }) {
  return (
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
          <h4 className="font-semibold text-zinc-700 dark:text-zinc-300">Treatment &amp; outcome</h4>
          <ul className="mt-1 space-y-2 text-zinc-600 dark:text-zinc-400">
            {record.treatments.map((t, i) => (
              <li key={i}>
                <span className="font-medium text-zinc-800 dark:text-zinc-200">{t.display}</span> —{" "}
                {t.status} ({t.startDate}
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
  );
}

function RuleDetail({ rule }: { rule: RuleProvenance }) {
  return (
    <div className="mt-4 space-y-3 text-sm">
      <p className="text-zinc-700 dark:text-zinc-300">{rule.reason}</p>
      <div className="rounded-md border border-zinc-200 p-3 text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
        <p>
          <span className="font-semibold text-zinc-700 dark:text-zinc-300">Treatment code:</span>{" "}
          {rule.treatmentCode}
        </p>
        <p className="mt-1">
          <span className="font-semibold text-zinc-700 dark:text-zinc-300">Rule type:</span>{" "}
          {rule.ruleType === "allergy" ? "documented allergy match" : "observation threshold"}
        </p>
        <p className="mt-1">
          <span className="font-semibold text-zinc-700 dark:text-zinc-300">Parameter:</span>{" "}
          {rule.parameterCode}
        </p>
        {rule.ruleType === "observation_threshold" && (
          <p className="mt-1">
            <span className="font-semibold text-zinc-700 dark:text-zinc-300">Fires when:</span>{" "}
            value {rule.operator} {rule.thresholdValue}
          </p>
        )}
      </div>
      <p className="text-xs text-zinc-500 dark:text-zinc-500">
        This gate is evaluated against the current patient&apos;s own confirmed allergies and
        observations — it is not a statistic drawn from historical patient records.
      </p>
    </div>
  );
}

function CohortDetail({
  cohort,
  onSelectPatient,
}: {
  cohort: CohortProvenance;
  onSelectPatient?: (ref: string) => void;
}) {
  return (
    <div className="mt-4 space-y-3 text-sm">
      <p className="text-zinc-600 dark:text-zinc-400">
        {cohort.patientRefs.length} synthetic patient
        {cohort.patientRefs.length === 1 ? "" : "s"} matched this condition, severity, and age
        band. Click any record to view it.
      </p>
      <div className="flex flex-wrap gap-1.5">
        {cohort.patientRefs.map((ref) => (
          <button
            key={ref}
            type="button"
            onClick={() => onSelectPatient?.(ref)}
            className="rounded border border-zinc-300 bg-zinc-50 px-1.5 py-0.5 text-xs font-medium text-zinc-700 hover:border-blue-500 hover:bg-blue-50 hover:text-blue-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:border-blue-400 dark:hover:bg-blue-950 dark:hover:text-blue-300"
          >
            {ref}
          </button>
        ))}
      </div>
    </div>
  );
}
