import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { computeAge, computeAgeBand } from "@/lib/matching";
import type {
  CohortProvenance,
  OutcomeCode,
  ProvenanceRecord,
  RuleProvenance,
  TreatmentStatus,
} from "@/lib/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ref = searchParams.get("ref");
  const ruleId = searchParams.get("ruleId");
  const conditionCode = searchParams.get("conditionCode");
  const severityCode = searchParams.get("severityCode");
  const severityValue = searchParams.get("severityValue");
  const ageBand = searchParams.get("ageBand");

  if (ruleId) {
    return getRuleProvenance(ruleId);
  }
  if (conditionCode && severityCode && severityValue && ageBand) {
    return getCohortProvenance({ conditionCode, severityCode, severityValue, ageBand });
  }
  if (!ref) {
    return NextResponse.json(
      {
        error:
          "Expected ?ref=<synthetic_ref>, or ?ruleId=<rule_id>, or the four ?conditionCode&severityCode&severityValue&ageBand params.",
      },
      { status: 400 }
    );
  }

  const { data: patient, error: patientError } = await supabaseAdmin
    .from("patients")
    .select("id, synthetic_ref, birth_date, sex")
    .eq("synthetic_ref", ref)
    .maybeSingle();
  if (patientError) {
    return NextResponse.json({ error: patientError.message }, { status: 500 });
  }
  if (!patient) {
    return NextResponse.json({ error: `No patient found for ref "${ref}".` }, { status: 404 });
  }

  const { data: condition, error: conditionError } = await supabaseAdmin
    .from("conditions")
    .select("id, display, clinical_status")
    .eq("patient_id", patient.id)
    .limit(1)
    .maybeSingle();
  if (conditionError) {
    return NextResponse.json({ error: conditionError.message }, { status: 500 });
  }

  const { data: observationsData, error: observationsError } = await supabaseAdmin
    .from("observations")
    .select("code_system, code, display, value_quantity, value_text, unit")
    .eq("patient_id", patient.id);
  if (observationsError) {
    return NextResponse.json({ error: observationsError.message }, { status: 500 });
  }

  const { data: treatmentsData, error: treatmentsError } = await supabaseAdmin
    .from("treatments")
    .select("id, code, display, status, start_date, end_date")
    .eq("patient_id", patient.id);
  if (treatmentsError) {
    return NextResponse.json({ error: treatmentsError.message }, { status: 500 });
  }

  const treatmentIds = (treatmentsData ?? []).map((t) => t.id);
  let outcomesByTreatmentId = new Map<
    string,
    { outcome_code: string; outcome_date: string; notes: string | null }
  >();
  if (treatmentIds.length > 0) {
    const { data: outcomesData, error: outcomesError } = await supabaseAdmin
      .from("treatment_outcomes")
      .select("treatment_id, outcome_code, outcome_date, notes")
      .in("treatment_id", treatmentIds);
    if (outcomesError) {
      return NextResponse.json({ error: outcomesError.message }, { status: 500 });
    }
    outcomesByTreatmentId = new Map(
      (outcomesData ?? []).map((o) => [
        o.treatment_id,
        { outcome_code: o.outcome_code, outcome_date: o.outcome_date, notes: o.notes },
      ])
    );
  }

  const record: ProvenanceRecord = {
    syntheticRef: patient.synthetic_ref,
    birthDate: patient.birth_date,
    sex: patient.sex as ProvenanceRecord["sex"],
    condition: {
      display: condition?.display ?? "Unknown",
      clinicalStatus: (condition?.clinical_status ?? "active") as ProvenanceRecord["condition"]["clinicalStatus"],
    },
    observations: (observationsData ?? []).map((o) => ({
      codeSystem: o.code_system,
      code: o.code,
      display: o.display,
      valueQuantity: o.value_quantity,
      valueText: o.value_text,
      unit: o.unit,
    })),
    treatments: (treatmentsData ?? []).map((t) => {
      const outcome = outcomesByTreatmentId.get(t.id);
      return {
        code: t.code,
        display: t.display,
        status: t.status as TreatmentStatus,
        startDate: t.start_date,
        endDate: t.end_date,
        outcomeCode: (outcome?.outcome_code as OutcomeCode) ?? null,
        outcomeDate: outcome?.outcome_date ?? null,
        outcomeNotes: outcome?.notes ?? null,
      };
    }),
  };

  return NextResponse.json(record);
}

async function getRuleProvenance(ruleId: string) {
  const { data: rule, error } = await supabaseAdmin
    .from("treatment_contraindication_rules")
    .select("id, treatment_code, rule_type, parameter_code, operator, threshold_value, reason")
    .eq("id", ruleId)
    .maybeSingle();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!rule) {
    return NextResponse.json({ error: `No rule found for id "${ruleId}".` }, { status: 404 });
  }

  const record: RuleProvenance = {
    id: rule.id,
    treatmentCode: rule.treatment_code,
    ruleType: rule.rule_type as RuleProvenance["ruleType"],
    parameterCode: rule.parameter_code,
    operator: rule.operator as RuleProvenance["operator"],
    thresholdValue: rule.threshold_value,
    reason: rule.reason,
  };
  return NextResponse.json(record);
}

// Read-only re-derivation of a matched cohort's patient list, deliberately
// duplicated from the condition -> severity -> age filtering steps in
// app/api/match/route.ts rather than importing/sharing that logic. Two
// reasons: (1) lib/matching.ts and the match route are the safety-critical
// path that produces the numbers a clinician acts on — this endpoint is a
// read-only citation viewer and must not be able to change that path's
// behavior by being edited later, in either direction; (2) /api/match's
// response only carries per-treatment patientRefs, which are empty whenever
// insufficientData is true (see lib/matching.ts), so there is no way to
// answer "which patients make up this cohort" from that response alone for
// the refusal-state cases. This function is guarded by a one-time manual
// check (see CLAUDE.md) that its returned count matches the cohortSize
// already shown on screen for all four demo cases, since a silent drift
// between the two would be a real bug, not a cosmetic one. Condition codes
// are always SNOMED and severity codes always use the treatmentnet-severity
// code system across every seeded domain (see seed/*.sql) — hardcoded here
// for that reason, not guessed.
async function getCohortProvenance(params: {
  conditionCode: string;
  severityCode: string;
  severityValue: string;
  ageBand: string;
}) {
  const { conditionCode, severityCode, severityValue, ageBand } = params;

  const { data: conditions, error: conditionsError } = await supabaseAdmin
    .from("conditions")
    .select("id, patient_id")
    .eq("code_system", "SNOMED")
    .eq("code", conditionCode);
  if (conditionsError) {
    return NextResponse.json({ error: conditionsError.message }, { status: 500 });
  }
  if (!conditions || conditions.length === 0) {
    return NextResponse.json({ patientRefs: [] } satisfies CohortProvenance);
  }
  const conditionIds = conditions.map((c) => c.id);

  const { data: severityObs, error: severityError } = await supabaseAdmin
    .from("observations")
    .select("condition_id")
    .eq("code_system", "treatmentnet-severity")
    .eq("code", severityCode)
    .eq("value_text", severityValue)
    .in("condition_id", conditionIds);
  if (severityError) {
    return NextResponse.json({ error: severityError.message }, { status: 500 });
  }
  const severityMatchedConditionIds = new Set((severityObs ?? []).map((o) => o.condition_id));
  const candidatePatientIds = [
    ...new Set(
      conditions.filter((c) => severityMatchedConditionIds.has(c.id)).map((c) => c.patient_id)
    ),
  ];
  if (candidatePatientIds.length === 0) {
    return NextResponse.json({ patientRefs: [] } satisfies CohortProvenance);
  }

  const { data: patientsData, error: patientsError } = await supabaseAdmin
    .from("patients")
    .select("synthetic_ref, birth_date")
    .in("id", candidatePatientIds);
  if (patientsError) {
    return NextResponse.json({ error: patientsError.message }, { status: 500 });
  }

  const patientRefs = (patientsData ?? [])
    .filter((p) => computeAgeBand(computeAge(p.birth_date)) === ageBand)
    .map((p) => p.synthetic_ref);

  return NextResponse.json({ patientRefs } satisfies CohortProvenance);
}
