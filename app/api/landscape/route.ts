import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { MIN_COHORT_N } from "@/lib/matching";
import type {
  LandscapeConditionOption,
  LandscapeResult,
  LandscapeTreatmentRow,
  OutcomeCode,
} from "@/lib/types";

// Deliberately duplicated from lib/matching.ts's private isSuccess/isAdverse
// rather than exporting them from that file — this route is a read-only
// overview surface with its own (looser, condition-wide, not severity/age
// stratified) aggregation, and must not be able to change, or be changed by,
// the safety-critical per-case matching path. Only the N=5 threshold
// constant (MIN_COHORT_N) is shared, since that's a fixed product rule, not
// matching logic.
function isSuccess(outcome: OutcomeCode): boolean {
  return outcome === "improved";
}
function isAdverse(outcome: OutcomeCode): boolean {
  return outcome === "adverse_event" || outcome === "discontinued_toxicity";
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const conditionCode = searchParams.get("conditionCode");

  if (!conditionCode) {
    return getConditionOptions();
  }
  return getLandscape(conditionCode);
}

async function getConditionOptions() {
  const { data, error } = await supabaseAdmin.from("conditions").select("code, display");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  const seen = new Set<string>();
  const options: LandscapeConditionOption[] = [];
  for (const row of data ?? []) {
    if (seen.has(row.code)) continue;
    seen.add(row.code);
    options.push({ conditionCode: row.code, conditionDisplay: row.display });
  }
  options.sort((a, b) => a.conditionDisplay.localeCompare(b.conditionDisplay));
  return NextResponse.json({ conditions: options });
}

// No cost/price column: deliberately omitted, not overlooked. There is no
// cost or price field anywhere in this schema or its seed data — building
// one here would mean fabricating a number, which is exactly the kind of
// unbacked claim this product exists to avoid. If cost is added later it
// should come from a cited external reference (e.g. published NHS/BNF list
// prices), not be derived from patient records, and should render visually
// distinct from the cohort-derived columns below (see components/
// LandscapeTable.tsx's reserved, empty "Cost" column header).
async function getLandscape(conditionCode: string) {
  // Every condition record for this code — no severity or age filtering.
  // /api/match's cohort matching is the tight, stratified comparison for one
  // patient case; this view is intentionally the loose, whole-database one:
  // "everything we've ever recorded for this condition."
  const { data: conditions, error: conditionsError } = await supabaseAdmin
    .from("conditions")
    .select("id, display")
    .eq("code_system", "SNOMED")
    .eq("code", conditionCode);
  if (conditionsError) {
    return NextResponse.json({ error: conditionsError.message }, { status: 500 });
  }
  if (!conditions || conditions.length === 0) {
    return NextResponse.json({ error: `No condition found for code "${conditionCode}".` }, { status: 404 });
  }
  const conditionIds = conditions.map((c) => c.id);
  const conditionDisplay = conditions[0].display;

  const { data: treatmentsData, error: treatmentsError } = await supabaseAdmin
    .from("treatments")
    .select("id, code, display")
    .in("condition_id", conditionIds);
  if (treatmentsError) {
    return NextResponse.json({ error: treatmentsError.message }, { status: 500 });
  }

  const treatmentIds = (treatmentsData ?? []).map((t) => t.id);
  const outcomesByTreatmentId = new Map<string, OutcomeCode>();
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

  const byCode = new Map<string, { display: string; records: string[] }>();
  for (const t of treatmentsData ?? []) {
    const entry = byCode.get(t.code) ?? { display: t.display, records: [] };
    entry.records.push(t.id);
    byCode.set(t.code, entry);
  }

  const treatments: LandscapeTreatmentRow[] = [...byCode.entries()].map(([code, { display, records }]) => {
    const n = records.length;
    let successCount = 0;
    let adverseEventCount = 0;
    for (const treatmentId of records) {
      const outcome = outcomesByTreatmentId.get(treatmentId);
      if (outcome && isSuccess(outcome)) successCount++;
      if (outcome && isAdverse(outcome)) adverseEventCount++;
    }
    return {
      treatmentCode: code,
      treatmentDisplay: display,
      n,
      successCount,
      successRate: n > 0 ? successCount / n : 0,
      adverseEventCount,
      adverseEventRate: n > 0 ? adverseEventCount / n : 0,
      belowThreshold: n < MIN_COHORT_N,
    };
  });

  treatments.sort((a, b) => b.successRate - a.successRate || b.n - a.n);

  const result: LandscapeResult = { conditionCode, conditionDisplay, treatments };
  return NextResponse.json(result);
}
