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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[80vh] w-full max-w-md overflow-y-auto border border-hairline bg-panel p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-hairline pb-3">
          <h3 className="text-sm font-medium text-primary">
            {citation.kind === "patient" ? (
              <>
                Synthetic patient <span className="font-mono tnum">{citation.ref}</span>
              </>
            ) : (
              title
            )}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-muted transition-colors duration-150 hover:text-primary"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {isLoading && <p className="mt-4 text-sm text-faint">Loading record...</p>}

        {errorMessage && <p className="mt-4 text-sm text-muted">{errorMessage}</p>}

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
        <p className="text-faint">
          {record.sex}, born <span className="font-mono tnum">{record.birthDate}</span>
        </p>
        <p className="mt-1 font-medium text-primary">
          {record.condition.display} ({record.condition.clinicalStatus})
        </p>
      </div>

      {record.observations.length > 0 && (
        <div>
          <h4 className="text-xs font-medium uppercase tracking-[0.08em] text-faint">
            Observations
          </h4>
          <ul className="mt-1.5 space-y-1 text-muted">
            {record.observations.map((obs, i) => (
              <li key={i}>
                {obs.display}:{" "}
                <span className="font-mono tnum">
                  {obs.valueText ?? `${obs.valueQuantity ?? "?"}${obs.unit ? ` ${obs.unit}` : ""}`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {record.treatments.length > 0 && (
        <div>
          <h4 className="text-xs font-medium uppercase tracking-[0.08em] text-faint">
            Treatment &amp; outcome
          </h4>
          <ul className="mt-1.5 space-y-2 text-muted">
            {record.treatments.map((t, i) => (
              <li key={i}>
                <span className="font-medium text-primary">{t.display}</span> —{" "}
                {t.status} (<span className="font-mono tnum">{t.startDate}</span>
                {t.endDate ? (
                  <>
                    {" "}
                    to <span className="font-mono tnum">{t.endDate}</span>
                  </>
                ) : (
                  ""
                )}
                )
                {t.outcomeCode && (
                  <p className="mt-0.5">
                    Outcome: <span className="font-medium text-primary">{t.outcomeCode}</span>
                    {t.outcomeNotes ? ` — ${t.outcomeNotes}` : ""}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-xs text-faint">This is a synthetic record, not a real patient.</p>
    </div>
  );
}

function RuleDetail({ rule }: { rule: RuleProvenance }) {
  return (
    <div className="mt-4 space-y-3 text-sm">
      <p className="text-primary">{rule.reason}</p>
      <div className="border-t border-hairline pt-3 text-muted">
        <p>
          <span className="text-xs font-medium uppercase tracking-[0.06em] text-faint">
            Treatment code
          </span>{" "}
          <span className="font-mono tnum">{rule.treatmentCode}</span>
        </p>
        <p className="mt-1.5">
          <span className="text-xs font-medium uppercase tracking-[0.06em] text-faint">
            Rule type
          </span>{" "}
          {rule.ruleType === "allergy" ? "documented allergy match" : "observation threshold"}
        </p>
        <p className="mt-1.5">
          <span className="text-xs font-medium uppercase tracking-[0.06em] text-faint">
            Parameter
          </span>{" "}
          <span className="font-mono tnum">{rule.parameterCode}</span>
        </p>
        {rule.ruleType === "observation_threshold" && (
          <p className="mt-1.5">
            <span className="text-xs font-medium uppercase tracking-[0.06em] text-faint">
              Fires when
            </span>{" "}
            <span className="font-mono tnum">
              value {rule.operator} {rule.thresholdValue}
            </span>
          </p>
        )}
      </div>
      <p className="text-xs text-faint">
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
      <p className="text-muted">
        <span className="font-mono tnum">{cohort.patientRefs.length}</span> synthetic patient
        {cohort.patientRefs.length === 1 ? "" : "s"} matched this condition, severity, and age
        band. Click any record to view it.
      </p>
      <div className="flex flex-wrap gap-1.5">
        {cohort.patientRefs.map((ref) => (
          <button
            key={ref}
            type="button"
            onClick={() => onSelectPatient?.(ref)}
            className="border border-hairline px-1.5 py-0.5 font-mono text-[11px] tnum text-muted transition-colors duration-150 hover:border-accent hover:text-accent"
          >
            {ref}
          </button>
        ))}
      </div>
    </div>
  );
}
