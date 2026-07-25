import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import type { OutcomeCode, ProvenanceRecord, TreatmentStatus } from "@/lib/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ref = searchParams.get("ref");
  if (!ref) {
    return NextResponse.json({ error: "Expected ?ref=<synthetic_ref>." }, { status: 400 });
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
