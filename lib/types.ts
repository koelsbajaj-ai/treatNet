// Mirrors the Supabase schema 1:1 (supabase/migrations/20260725160005_create_core_schema.sql).
// Single source of truth the matching engine and gates are written against.

export type Sex = "male" | "female" | "other";

export interface Patient {
  id: string;
  syntheticRef: string;
  birthDate: string;
  sex: Sex;
  createdAt: string;
}

export type ClinicalStatus = "active" | "resolved" | "remission";

export interface Condition {
  id: string;
  patientId: string;
  codeSystem: string;
  code: string;
  display: string;
  clinicalStatus: ClinicalStatus;
  onsetDate: string | null;
}

export interface Observation {
  id: string;
  patientId: string;
  conditionId: string | null;
  codeSystem: string;
  code: string;
  display: string;
  valueQuantity: number | null;
  valueText: string | null;
  unit: string | null;
  effectiveDatetime: string;
}

export type AllergyCriticality = "low" | "high" | "unable-to-assess";

export interface AllergyIntolerance {
  id: string;
  patientId: string;
  codeSystem: string;
  code: string;
  display: string;
  criticality: AllergyCriticality;
  reactionText: string | null;
}

export type TreatmentType = "medication" | "procedure";
export type TreatmentStatus = "active" | "completed" | "stopped";

export interface Treatment {
  id: string;
  patientId: string;
  conditionId: string;
  type: TreatmentType;
  codeSystem: string;
  code: string;
  display: string;
  startDate: string;
  endDate: string | null;
  status: TreatmentStatus;
}

export type OutcomeCode =
  | "improved"
  | "no_response"
  | "adverse_event"
  | "discontinued_toxicity"
  | "discontinued_other";

export interface TreatmentOutcome {
  id: string;
  treatmentId: string;
  outcomeCode: OutcomeCode;
  outcomeDate: string;
  notes: string | null;
}

export type RuleType = "allergy" | "observation_threshold";
export type ThresholdOperator = "<" | "<=" | ">" | ">=";

export interface ContraindicationRule {
  id: string;
  treatmentCode: string;
  ruleType: RuleType;
  parameterCode: string;
  operator: ThresholdOperator | null;
  thresholdValue: number | null;
  reason: string;
}

// ---- Confirmed clinician case (output of Stage 4 extraction + confirmation) ----

export interface CaseObservation {
  codeSystem: string;
  code: string;
  display: string;
  valueQuantity?: number;
  valueText?: string;
  unit?: string;
}

export interface CaseAllergy {
  codeSystem: string;
  code: string;
  display: string;
}

export interface ConfirmedCase {
  conditionCodeSystem: string;
  conditionCode: string;
  conditionDisplay: string;
  /** Severity/stratification observation — same code as used in the matched cohort's observations. */
  severity: { codeSystem: string; code: string; valueText: string };
  ageYears: number;
  observations: CaseObservation[];
  allergies: CaseAllergy[];
}

// ---- /api/match response shape ----

export type ConfidenceTier = "insufficient" | "low" | "moderate";

export interface GateExclusion {
  treatmentCode: string;
  treatmentDisplay: string;
  reason: string;
  ruleId: string;
}

export interface RankedTreatment {
  treatmentCode: string;
  treatmentDisplay: string;
  n: number;
  successCount: number;
  successRate: number;
  adverseEventCount: number;
  confidenceTier: ConfidenceTier;
  /** Patient synthetic_refs backing this row, for the provenance view (Stage 8). */
  patientRefs: string[];
}

export interface MatchResult {
  matchedOn: {
    conditionCode: string;
    severityCode: string;
    severityValue: string;
    ageBand: string;
  };
  cohortSize: number;
  insufficientData: boolean;
  ranked: RankedTreatment[];
  gated: GateExclusion[];
}
