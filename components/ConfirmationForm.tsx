"use client";

import { useState } from "react";
import type {
  CaseAllergy,
  CaseObservation,
  ConfirmedCase,
  ExtractedCase,
  FieldConfidence,
} from "@/lib/types";

interface ConfirmationFormProps {
  extracted: ExtractedCase;
  onConfirm: (confirmed: ConfirmedCase) => void;
  isMatching: boolean;
}

function ConfidenceBadge({ confidence }: { confidence: FieldConfidence }) {
  const styles: Record<FieldConfidence, string> = {
    high: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
    medium: "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
    low: "bg-amber-200 text-amber-900 dark:bg-amber-900 dark:text-amber-100",
  };
  return (
    <span className={`ml-2 rounded-full px-2 py-0.5 text-xs font-semibold ${styles[confidence]}`}>
      {confidence}
    </span>
  );
}

/** Wraps a field with an amber ring when confidence is low — the visual flag PLAN.md requires. */
function Field({
  label,
  confidence,
  children,
}: {
  label: string;
  confidence: FieldConfidence;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-md p-3 ${
        confidence === "low"
          ? "border-2 border-amber-500 bg-amber-50 dark:bg-amber-950"
          : "border border-zinc-200 dark:border-zinc-800"
      }`}
    >
      <div className="flex items-center text-sm font-medium text-zinc-700 dark:text-zinc-300">
        {label}
        <ConfidenceBadge confidence={confidence} />
      </div>
      <div className="mt-1">{children}</div>
    </div>
  );
}

type EditableObservation = CaseObservation & { confidence: FieldConfidence };
type EditableAllergy = CaseAllergy & { confidence: FieldConfidence };

export function ConfirmationForm({ extracted, onConfirm, isMatching }: ConfirmationFormProps) {
  const [conditionDisplay, setConditionDisplay] = useState(extracted.condition.display);
  const [severityValueText, setSeverityValueText] = useState(extracted.severity.valueText);
  const [ageValue, setAgeValue] = useState(extracted.age.value);
  const [observations, setObservations] = useState<EditableObservation[]>(extracted.observations);
  const [allergies, setAllergies] = useState<EditableAllergy[]>(extracted.allergies);

  function handleConfirm() {
    const confirmedCase: ConfirmedCase = {
      conditionCodeSystem: extracted.condition.codeSystem,
      conditionCode: extracted.condition.code,
      conditionDisplay,
      severity: {
        codeSystem: extracted.severity.codeSystem,
        code: extracted.severity.code,
        valueText: severityValueText,
      },
      ageYears: ageValue,
      observations: observations.map((obs): CaseObservation => {
        const { confidence, ...rest } = obs;
        void confidence;
        return rest;
      }),
      allergies: allergies.map((allergy): CaseAllergy => {
        const { confidence, ...rest } = allergy;
        void confidence;
        return rest;
      }),
    };
    onConfirm(confirmedCase);
  }

  return (
    <div className="w-full max-w-2xl">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        Confirm extracted fields
      </h2>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Nothing runs until you confirm. Amber fields are low-confidence — check them.
      </p>

      <div className="mt-4 space-y-3">
        <Field label="Condition" confidence={extracted.condition.confidence}>
          <input
            type="text"
            value={conditionDisplay}
            onChange={(e) => setConditionDisplay(e.target.value)}
            className="w-full rounded border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </Field>

        <Field label={`Severity (${extracted.severity.code})`} confidence={extracted.severity.confidence}>
          <input
            type="text"
            value={severityValueText}
            onChange={(e) => setSeverityValueText(e.target.value)}
            className="w-full rounded border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </Field>

        <Field label="Age (years)" confidence={extracted.age.confidence}>
          <input
            type="number"
            value={ageValue}
            onChange={(e) => setAgeValue(Number(e.target.value))}
            className="w-32 rounded border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </Field>

        {observations.map((obs, i) => (
          <Field
            key={`${obs.code}-${i}`}
            label={`Observation: ${obs.display}`}
            confidence={obs.confidence}
          >
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={obs.valueText ?? ""}
                placeholder="value text"
                onChange={(e) =>
                  setObservations((prev) =>
                    prev.map((o, idx) => (idx === i ? { ...o, valueText: e.target.value } : o))
                  )
                }
                className="w-32 rounded border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              />
              <input
                type="number"
                value={obs.valueQuantity ?? ""}
                placeholder="value"
                onChange={(e) =>
                  setObservations((prev) =>
                    prev.map((o, idx) =>
                      idx === i ? { ...o, valueQuantity: Number(e.target.value) } : o
                    )
                  )
                }
                className="w-28 rounded border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              />
              <span className="text-xs text-zinc-500">{obs.unit}</span>
              <button
                type="button"
                onClick={() => setObservations((prev) => prev.filter((_, idx) => idx !== i))}
                className="ml-auto text-xs text-red-600 hover:underline dark:text-red-400"
              >
                remove
              </button>
            </div>
          </Field>
        ))}

        {allergies.map((allergy, i) => (
          <Field
            key={`${allergy.code}-${i}`}
            label={`Allergy: ${allergy.display}`}
            confidence={allergy.confidence}
          >
            <button
              type="button"
              onClick={() => setAllergies((prev) => prev.filter((_, idx) => idx !== i))}
              className="text-xs text-red-600 hover:underline dark:text-red-400"
            >
              remove
            </button>
          </Field>
        ))}

        {extracted.treatmentHistory.length > 0 && (
          <div className="rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
            <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Treatment history (informational — not used for matching)
            </div>
            <ul className="mt-1 list-inside list-disc text-sm text-zinc-600 dark:text-zinc-400">
              {extracted.treatmentHistory.map((item, i) => (
                <li key={i}>
                  {item.display} — {item.note}
                  <ConfidenceBadge confidence={item.confidence} />
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={handleConfirm}
        disabled={isMatching}
        className="mt-4 rounded-md bg-green-700 px-5 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
      >
        {isMatching ? "Running..." : "Confirm and run"}
      </button>
    </div>
  );
}
