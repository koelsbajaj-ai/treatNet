"use client";

import { useEffect, useState } from "react";
import type {
  CaseAllergy,
  CaseObservation,
  ConfirmedCase,
  FieldConfidence,
  SufficientExtraction,
} from "@/lib/types";
import { FieldConfidenceMeter } from "./ConfidenceMeter";

interface ConfirmationFormProps {
  extracted: SufficientExtraction;
  onConfirm: (confirmed: ConfirmedCase) => void;
  isMatching: boolean;
}

const CONFIDENCE_RANK: Record<FieldConfidence, number> = { high: 0, medium: 1, low: 2 };

/**
 * Wraps a field as a hairline-divided row. Low confidence keeps its own
 * visual flag (the non-negotiable rule) via a left accent bar, distinct from
 * the segment meter which shows the same signal quantitatively.
 *
 * `revealIndex` drives the extraction-moment animation (see ConfirmationForm
 * below): each row fades/slides in with a delay proportional to its position
 * in the confidence-sorted reveal order, so low-confidence fields visibly
 * settle last. `revealed` flips true one tick after mount so the transition
 * actually fires instead of starting in its end state.
 */
function Field({
  label,
  confidence,
  revealIndex,
  revealed,
  children,
}: {
  label: string;
  confidence: FieldConfidence;
  revealIndex: number;
  revealed: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{ transitionDelay: `${revealIndex * 90}ms` }}
      className={`flex items-start gap-4 border-l-2 py-3 pl-3 transition-all duration-300 ease-out ${
        confidence === "low" ? "border-l-warn" : "border-l-transparent"
      } ${revealed ? "translate-y-0 opacity-100" : "translate-y-1.5 opacity-0"}`}
    >
      <div className="w-40 shrink-0">
        <p className="text-xs font-medium uppercase tracking-[0.08em] text-faint">{label}</p>
        <div className="mt-1">
          <FieldConfidenceMeter confidence={confidence} />
        </div>
      </div>
      <div className="min-w-0 flex-1 pt-0.5">{children}</div>
    </div>
  );
}

type EditableObservation = CaseObservation & { confidence: FieldConfidence };
type EditableAllergy = CaseAllergy & { confidence: FieldConfidence };

const inputBase =
  "border border-hairline bg-raised px-2 py-1 text-sm text-primary transition-colors duration-150 focus:border-accent focus:outline-none";
const numericInput = `${inputBase} font-mono tnum`;

export function ConfirmationForm({ extracted, onConfirm, isMatching }: ConfirmationFormProps) {
  const [conditionDisplay, setConditionDisplay] = useState(extracted.condition.display);
  const [severityValueText, setSeverityValueText] = useState(extracted.severity.valueText);
  const [ageValue, setAgeValue] = useState(extracted.age.value);
  const [observations, setObservations] = useState<EditableObservation[]>(extracted.observations);
  const [allergies, setAllergies] = useState<EditableAllergy[]>(extracted.allergies);

  // The extraction moment: fields settle in over ~800ms, low-confidence
  // ones last. Purely a CSS transition triggered by this mount flag — it
  // plays identically whether extraction came from the live model or the
  // instant cached demo fallback, since neither path affects this timer.
  const [revealed, setRevealed] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setRevealed(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const fieldOrder: { key: string; confidence: FieldConfidence }[] = [
    { key: "condition", confidence: extracted.condition.confidence },
    { key: "severity", confidence: extracted.severity.confidence },
    { key: "age", confidence: extracted.age.confidence },
    ...observations.map((o, i) => ({ key: `obs-${i}`, confidence: o.confidence })),
    ...allergies.map((a, i) => ({ key: `allergy-${i}`, confidence: a.confidence })),
  ];
  const revealIndexByKey = new Map(
    [...fieldOrder]
      .sort((a, b) => CONFIDENCE_RANK[a.confidence] - CONFIDENCE_RANK[b.confidence])
      .map((f, i) => [f.key, i])
  );

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
    <div className="w-full">
      <h2 className="text-xs font-medium uppercase tracking-[0.14em] text-faint">Case intake</h2>
      <p className="mt-2 text-lg text-primary">Confirm extracted fields</p>
      <p className="mt-1 text-sm text-muted">
        Nothing runs until you confirm. Fields with a shorter confidence bar and an amber edge
        need a check.
      </p>

      <div className="mt-5 divide-y divide-hairline border-t border-hairline">
        <Field
          label="Condition"
          confidence={extracted.condition.confidence}
          revealIndex={revealIndexByKey.get("condition") ?? 0}
          revealed={revealed}
        >
          <input
            type="text"
            value={conditionDisplay}
            onChange={(e) => setConditionDisplay(e.target.value)}
            className={`w-full ${inputBase}`}
          />
        </Field>

        <Field
          label={`Severity (${extracted.severity.code})`}
          confidence={extracted.severity.confidence}
          revealIndex={revealIndexByKey.get("severity") ?? 0}
          revealed={revealed}
        >
          <input
            type="text"
            value={severityValueText}
            onChange={(e) => setSeverityValueText(e.target.value)}
            className={`w-full ${inputBase}`}
          />
        </Field>

        <Field
          label="Age (years)"
          confidence={extracted.age.confidence}
          revealIndex={revealIndexByKey.get("age") ?? 0}
          revealed={revealed}
        >
          <input
            type="number"
            value={ageValue}
            onChange={(e) => setAgeValue(Number(e.target.value))}
            className={`w-24 ${numericInput}`}
          />
        </Field>

        {observations.map((obs, i) => (
          <Field
            key={`${obs.code}-${i}`}
            label={`Obs: ${obs.display}`}
            confidence={obs.confidence}
            revealIndex={revealIndexByKey.get(`obs-${i}`) ?? 0}
            revealed={revealed}
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
                className={`w-36 ${inputBase}`}
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
                className={`w-24 ${numericInput}`}
              />
              <span className="font-mono text-xs text-muted">{obs.unit}</span>
              <button
                type="button"
                onClick={() => setObservations((prev) => prev.filter((_, idx) => idx !== i))}
                className="ml-auto text-xs text-muted transition-colors duration-150 hover:text-primary"
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
            revealIndex={revealIndexByKey.get(`allergy-${i}`) ?? 0}
            revealed={revealed}
          >
            <button
              type="button"
              onClick={() => setAllergies((prev) => prev.filter((_, idx) => idx !== i))}
              className="text-xs text-muted transition-colors duration-150 hover:text-primary"
            >
              remove
            </button>
          </Field>
        ))}
      </div>

      {extracted.treatmentHistory.length > 0 && (
        <div className="mt-5 border-t border-hairline pt-4">
          <p className="text-xs font-medium uppercase tracking-[0.08em] text-faint">
            Treatment history — informational, not used for matching
          </p>
          <ul className="mt-2 space-y-1.5 text-sm text-primary">
            {extracted.treatmentHistory.map((item, i) => (
              <li key={i} className="flex items-baseline gap-2">
                <span>
                  <span className="font-medium">{item.display}</span> — {item.note}
                </span>
                <FieldConfidenceMeter confidence={item.confidence} />
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        type="button"
        onClick={handleConfirm}
        disabled={isMatching}
        className="mt-6 bg-accent px-5 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
      >
        {isMatching ? "Running..." : "Confirm and run"}
      </button>
    </div>
  );
}
