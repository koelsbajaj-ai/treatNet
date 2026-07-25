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

// ---- Stage 4: /api/extract output (draft, pre-confirmation) ----
// The LLM's one job in this product: read unstructured prose and locate the
// clinically relevant facts. Every field carries its own confidence — this
// output is never trusted silently and never reaches /api/match directly;
// the clinician confirms or edits it first.

export type FieldConfidence = "high" | "medium" | "low";

export interface ExtractedCondition {
  codeSystem: string;
  code: string;
  display: string;
  confidence: FieldConfidence;
}

export interface ExtractedSeverity {
  codeSystem: string;
  code: string;
  valueText: string;
  confidence: FieldConfidence;
}

export interface ExtractedAge {
  value: number;
  confidence: FieldConfidence;
}

export interface ExtractedObservation extends CaseObservation {
  confidence: FieldConfidence;
}

export interface ExtractedAllergy extends CaseAllergy {
  confidence: FieldConfidence;
}

/** Informational only — not consumed by /api/match, just shown to the clinician. */
export interface ExtractedTreatmentHistoryItem {
  display: string;
  note: string;
  confidence: FieldConfidence;
}

/** The normal case: enough was extracted to build a confirmable case. */
export interface SufficientExtraction {
  sufficientInformation: true;
  condition: ExtractedCondition;
  severity: ExtractedSeverity;
  age: ExtractedAge;
  observations: ExtractedObservation[];
  allergies: ExtractedAllergy[];
  treatmentHistory: ExtractedTreatmentHistoryItem[];
}

/**
 * A second, distinct refusal path from the engine's insufficient-cohort-data
 * refusal (lib/matching.ts). This one fires before /api/match is ever
 * called: the note itself didn't contain enough to identify one of the
 * three known conditions or extract meaningful clinical detail at all.
 * There's no case to confirm and nothing to match against.
 */
export interface InsufficientExtraction {
  sufficientInformation: false;
  insufficientReason: string;
}

export type ExtractedCase = SufficientExtraction | InsufficientExtraction;

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

// ---- Stage 5/8: /api/provenance response — the actual synthetic record
// backing a citation, so "click a number, see where it came from" is real. ----

export interface ProvenanceObservation {
  codeSystem: string;
  code: string;
  display: string;
  valueQuantity: number | null;
  valueText: string | null;
  unit: string | null;
}

export interface ProvenanceTreatment {
  code: string;
  display: string;
  status: TreatmentStatus;
  startDate: string;
  endDate: string | null;
  outcomeCode: OutcomeCode | null;
  outcomeDate: string | null;
  outcomeNotes: string | null;
}

export interface ProvenanceRecord {
  syntheticRef: string;
  birthDate: string;
  sex: Sex;
  condition: {
    display: string;
    clinicalStatus: ClinicalStatus;
  };
  observations: ProvenanceObservation[];
  treatments: ProvenanceTreatment[];
}

// The rule record backing a gated (avoid-list) treatment citation. A gate is
// a deterministic match against the query case's own allergies/observations,
// not against historical patient records, so the honest "provenance" for a
// gate is the rule definition itself rather than a patient.
export interface RuleProvenance {
  id: string;
  treatmentCode: string;
  ruleType: RuleType;
  parameterCode: string;
  operator: ThresholdOperator | null;
  thresholdValue: number | null;
  reason: string;
}

// The full set of synthetic patient refs behind a "Cohort size: N" citation —
// independently re-derived (see app/api/provenance/route.ts) rather than
// read off /api/match's response, since ranked[].patientRefs is empty
// whenever insufficientData is true.
export interface CohortProvenance {
  patientRefs: string[];
}
