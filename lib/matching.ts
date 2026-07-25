import { applyGates, type GateCandidate } from "./gates";
import type {
  ConfidenceTier,
  ConfirmedCase,
  ContraindicationRule,
  MatchResult,
  OutcomeCode,
  RankedTreatment,
} from "./types";

/** Fixed thresholds from PLAN.md section 1 — not statistics we don't have. */
export const MIN_COHORT_N = 5;
export const MODERATE_CONFIDENCE_MIN_N = 15;

export function confidenceTierForN(n: number): ConfidenceTier {
  if (n < MIN_COHORT_N) return "insufficient";
  if (n < MODERATE_CONFIDENCE_MIN_N) return "low";
  return "moderate";
}

/** Fixed decade-ish bands. Same birth_date + same "today" always yields the same band. */
export function computeAgeBand(ageYears: number): string {
  if (ageYears < 40) return "<40";
  if (ageYears < 50) return "40-49";
  if (ageYears < 60) return "50-59";
  if (ageYears < 70) return "60-69";
  if (ageYears < 80) return "70-79";
  return "80+";
}

export function computeAge(birthDate: string, asOf: Date = new Date()): number {
  const birth = new Date(birthDate);
  let age = asOf.getUTCFullYear() - birth.getUTCFullYear();
  const hasHadBirthdayThisYear =
    asOf.getUTCMonth() > birth.getUTCMonth() ||
    (asOf.getUTCMonth() === birth.getUTCMonth() && asOf.getUTCDate() >= birth.getUTCDate());
  if (!hasHadBirthdayThisYear) age -= 1;
  return age;
}

/** A treatment actually given to a matched historical patient, joined with its outcome. */
export interface CohortTreatmentRecord {
  treatmentId: string;
  patientId: string;
  patientRef: string;
  code: string;
  display: string;
}

/** "Success" is specifically the improved outcome — everything else (no
 * response, adverse event, discontinued for any reason) counts against
 * the success rate. Adverse-event count also folds in discontinued_toxicity,
 * since both represent a safety signal a clinician would want surfaced,
 * even though only "adverse_event" is the strict FHIR-outcome label. */
function isSuccess(outcome: OutcomeCode): boolean {
  return outcome === "improved";
}
function isAdverse(outcome: OutcomeCode): boolean {
  return outcome === "adverse_event" || outcome === "discontinued_toxicity";
}

export function buildMatchResult(params: {
  matchedOn: {
    conditionCode: string;
    severityCode: string;
    severityValue: string;
    ageBand: string;
  };
  cohortSize: number;
  cohortTreatments: CohortTreatmentRecord[];
  outcomesByTreatmentId: Map<string, OutcomeCode>;
  caseData: ConfirmedCase;
  rules: ContraindicationRule[];
}): MatchResult {
  const { matchedOn, cohortSize, cohortTreatments, outcomesByTreatmentId, caseData, rules } = params;

  // Distinct candidate treatments actually used in this cohort.
  const candidatesByCode = new Map<string, GateCandidate>();
  for (const t of cohortTreatments) {
    if (!candidatesByCode.has(t.code)) {
      candidatesByCode.set(t.code, { code: t.code, display: t.display });
    }
  }
  const candidates = [...candidatesByCode.values()];

  const { allowed, gated } = applyGates(caseData, candidates, rules);
  const allowedCodes = new Set(allowed.map((c) => c.code));

  const ranked: RankedTreatment[] = allowed.map((candidate) => {
    const records = cohortTreatments.filter((t) => t.code === candidate.code);
    const n = records.length;
    let successCount = 0;
    let adverseEventCount = 0;
    const patientRefs = new Set<string>();

    for (const record of records) {
      const outcome = outcomesByTreatmentId.get(record.treatmentId);
      if (outcome && isSuccess(outcome)) successCount++;
      if (outcome && isAdverse(outcome)) adverseEventCount++;
      patientRefs.add(record.patientRef);
    }

    return {
      treatmentCode: candidate.code,
      treatmentDisplay: candidate.display,
      n,
      successCount,
      successRate: n > 0 ? successCount / n : 0,
      adverseEventCount,
      confidenceTier: confidenceTierForN(n),
      patientRefs: [...patientRefs],
    };
  });

  // Deterministic order: best success rate first, ties broken by larger N,
  // then by code — so re-running the same query never reorders results.
  ranked.sort((a, b) => {
    if (b.successRate !== a.successRate) return b.successRate - a.successRate;
    if (b.n !== a.n) return b.n - a.n;
    return a.treatmentCode.localeCompare(b.treatmentCode);
  });

  // The whole comparison is refused only when even the best available
  // treatment doesn't clear the minimum — not when any single treatment
  // happens to be thin. See PLAN.md section 1's confidence tier table.
  const bestN = ranked.reduce((max, r) => Math.max(max, r.n), 0);
  const insufficientData = allowedCodes.size === 0 ? cohortSize < MIN_COHORT_N : bestN < MIN_COHORT_N;

  return {
    matchedOn,
    cohortSize,
    insufficientData,
    ranked: insufficientData ? [] : ranked,
    gated,
  };
}
