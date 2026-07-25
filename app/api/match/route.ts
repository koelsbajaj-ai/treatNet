import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { buildMatchResult, computeAge, computeAgeBand, type CohortTreatmentRecord } from "@/lib/matching";
import type { ConfirmedCase, ContraindicationRule, MatchResult, OutcomeCode } from "@/lib/types";

function isConfirmedCase(body: unknown): body is ConfirmedCase {
  if (typeof body !== "object" || body === null) return false;
  const b = body as Record<string, unknown>;
  return (
    typeof b.conditionCodeSystem === "string" &&
    typeof b.conditionCode === "string" &&
    typeof b.ageYears === "number" &&
    typeof b.severity === "object" &&
    b.severity !== null &&
    typeof (b.severity as Record<string, unknown>).code === "string" &&
    typeof (b.severity as Record<string, unknown>).valueText === "string" &&
    Array.isArray(b.observations) &&
    Array.isArray(b.allergies)
  );
}

function emptyResult(matchedOn: MatchResult["matchedOn"]): MatchResult {
  return { matchedOn, cohortSize: 0, insufficientData: true, ranked: [], gated: [] };
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be JSON." }, { status: 400 });
  }

  if (!isConfirmedCase(body)) {
    return NextResponse.json(
      {
        error:
          "Expected a confirmed case: { conditionCodeSystem, conditionCode, ageYears, severity: { code, valueText }, observations: [], allergies: [] }.",
      },
      { status: 400 }
    );
  }
  const caseData = body;

  const ageBand = computeAgeBand(caseData.ageYears);
  const matchedOn = {
    conditionCode: caseData.conditionCode,
    severityCode: caseData.severity.code,
    severityValue: caseData.severity.valueText,
    ageBand,
  };

  // 1. Filter candidate historical patients by condition code.
  const { data: conditions, error: conditionsError } = await supabaseAdmin
    .from("conditions")
    .select("id, patient_id")
    .eq("code_system", caseData.conditionCodeSystem)
    .eq("code", caseData.conditionCode);
  if (conditionsError) {
    return NextResponse.json({ error: conditionsError.message }, { status: 500 });
  }
  if (!conditions || conditions.length === 0) {
    return NextResponse.json(emptyResult(matchedOn));
  }
  const conditionIds = conditions.map((c) => c.id);

  // 2. Stratify by severity band — same condition AND same severity band, never all-comers.
  const { data: severityObs, error: severityError } = await supabaseAdmin
    .from("observations")
    .select("condition_id")
    .eq("code_system", caseData.severity.codeSystem)
    .eq("code", caseData.severity.code)
    .eq("value_text", caseData.severity.valueText)
    .in("condition_id", conditionIds);
  if (severityError) {
    return NextResponse.json({ error: severityError.message }, { status: 500 });
  }
  const severityMatchedConditionIds = new Set((severityObs ?? []).map((o) => o.condition_id));
  const severityMatchedConditions = conditions.filter((c) => severityMatchedConditionIds.has(c.id));
  if (severityMatchedConditions.length === 0) {
    return NextResponse.json(emptyResult(matchedOn));
  }
  const candidatePatientIds = [...new Set(severityMatchedConditions.map((c) => c.patient_id))];

  // 3. Stratify by age band.
  const { data: patientsData, error: patientsError } = await supabaseAdmin
    .from("patients")
    .select("id, synthetic_ref, birth_date")
    .in("id", candidatePatientIds);
  if (patientsError) {
    return NextResponse.json({ error: patientsError.message }, { status: 500 });
  }
  const ageMatchedPatients = (patientsData ?? []).filter(
    (p) => computeAgeBand(computeAge(p.birth_date)) === ageBand
  );
  if (ageMatchedPatients.length === 0) {
    return NextResponse.json(emptyResult(matchedOn));
  }
  const ageMatchedPatientIds = new Set(ageMatchedPatients.map((p) => p.id));
  const patientRefById = new Map(ageMatchedPatients.map((p) => [p.id, p.synthetic_ref]));

  const finalConditions = severityMatchedConditions.filter((c) => ageMatchedPatientIds.has(c.patient_id));
  const finalConditionIds = finalConditions.map((c) => c.id);
  const cohortSize = new Set(finalConditions.map((c) => c.patient_id)).size;

  // 4. Treatments actually given within the matched cohort.
  const { data: treatmentsData, error: treatmentsError } = await supabaseAdmin
    .from("treatments")
    .select("id, patient_id, code, display")
    .in("condition_id", finalConditionIds);
  if (treatmentsError) {
    return NextResponse.json({ error: treatmentsError.message }, { status: 500 });
  }
  const cohortTreatments: CohortTreatmentRecord[] = (treatmentsData ?? [])
    .filter((t) => patientRefById.has(t.patient_id))
    .map((t) => ({
      treatmentId: t.id,
      patientId: t.patient_id,
      patientRef: patientRefById.get(t.patient_id) as string,
      code: t.code,
      display: t.display,
    }));

  // 5. Outcomes for those treatments.
  const outcomesByTreatmentId = new Map<string, OutcomeCode>();
  const treatmentIds = cohortTreatments.map((t) => t.treatmentId);
  if (treatmentIds.length > 0) {
    const { data: outcomesData, error: outcomesError } = await supabaseAdmin
      .from("treatment_outcomes")
      .select("treatment_id, outcome_code")
      .in("treatment_id", treatmentIds);
    if (outcomesError) {
      return NextResponse.json({ error: outcomesError.message }, { status: 500 });
    }
    for (const o of outcomesData ?? []) {
      outcomesByTreatmentId.set(o.treatment_id, o.outcome_code as OutcomeCode);
    }
  }

  // 6. Hard contraindication gates — small table, fetched whole and filtered per-candidate in lib/gates.ts.
  const { data: rulesData, error: rulesError } = await supabaseAdmin
    .from("treatment_contraindication_rules")
    .select("*");
  if (rulesError) {
    return NextResponse.json({ error: rulesError.message }, { status: 500 });
  }
  const rules: ContraindicationRule[] = (rulesData ?? []).map((r) => ({
    id: r.id,
    treatmentCode: r.treatment_code,
    ruleType: r.rule_type as ContraindicationRule["ruleType"],
    parameterCode: r.parameter_code,
    operator: r.operator as ContraindicationRule["operator"],
    thresholdValue: r.threshold_value,
    reason: r.reason,
  }));

  const result = buildMatchResult({
    matchedOn,
    cohortSize,
    cohortTreatments,
    outcomesByTreatmentId,
    caseData,
    rules,
  });

  return NextResponse.json(result);
}
