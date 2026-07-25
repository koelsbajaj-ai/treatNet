import type {
  ConfirmedCase,
  ContraindicationRule,
  GateExclusion,
  ThresholdOperator,
} from "./types";

export interface GateCandidate {
  code: string;
  display: string;
}

function compare(value: number, operator: ThresholdOperator, threshold: number): boolean {
  switch (operator) {
    case "<":
      return value < threshold;
    case "<=":
      return value <= threshold;
    case ">":
      return value > threshold;
    case ">=":
      return value >= threshold;
  }
}

function ruleFires(caseData: ConfirmedCase, rule: ContraindicationRule): boolean {
  if (rule.ruleType === "allergy") {
    return caseData.allergies.some((a) => a.code === rule.parameterCode);
  }
  // observation_threshold
  if (rule.operator === null || rule.thresholdValue === null) return false;
  return caseData.observations.some(
    (o) =>
      o.code === rule.parameterCode &&
      o.valueQuantity !== undefined &&
      compare(o.valueQuantity, rule.operator as ThresholdOperator, rule.thresholdValue as number)
  );
}

/**
 * Removes any candidate treatment matched by a firing contraindication rule,
 * before any ranking happens. Deterministic, exact-code matching only — no
 * fuzzy matching, no LLM involvement. A treatment with no matching rules is
 * always allowed through unchanged.
 */
export function applyGates(
  caseData: ConfirmedCase,
  candidates: GateCandidate[],
  rules: ContraindicationRule[]
): { allowed: GateCandidate[]; gated: GateExclusion[] } {
  const allowed: GateCandidate[] = [];
  const gated: GateExclusion[] = [];

  for (const candidate of candidates) {
    const firingRules = rules.filter(
      (rule) => rule.treatmentCode === candidate.code && ruleFires(caseData, rule)
    );

    if (firingRules.length === 0) {
      allowed.push(candidate);
      continue;
    }

    for (const rule of firingRules) {
      gated.push({
        treatmentCode: candidate.code,
        treatmentDisplay: candidate.display,
        reason: rule.reason,
        ruleId: rule.id,
      });
    }
  }

  return { allowed, gated };
}
