import { NextResponse } from "next/server";
import type Anthropic from "@anthropic-ai/sdk";
import { anthropic } from "@/lib/anthropic";
import type { ExtractedCase } from "@/lib/types";

const MODEL = "claude-sonnet-4-6";

// The demo's fixed vocabulary — condition-agnostic in the engine (lib/matching.ts,
// lib/gates.ts), but extraction has to map free text onto *something*, and our
// seed data only exists for these three domains. Extraction picks from this
// list rather than inventing codes; anything it can't confidently map gets
// low confidence rather than a guessed code.
const SYSTEM_PROMPT = `You extract structured clinical fields from a single free-text clinical note, for a system called TreatmentNet that only has data for three conditions. You are the one place in this product allowed to read unstructured prose — everything downstream is deterministic code that trusts your output completely, so:

- Extract ONLY what the note actually states or very strongly implies. Never invent a value that isn't grounded in the text.
- Every field gets its own confidence: "high" (explicitly and unambiguously stated), "medium" (stated but with some ambiguity, e.g. an abbreviation or indirect phrasing), or "low" (inferred, uncertain, or only weakly implied).
- If the note doesn't mention something at all, omit it (empty array for observations/allergies/treatmentHistory) rather than guessing.
- Do not let a low-confidence guess replace an honest "I'm not sure" — mark it low confidence instead of upgrading your certainty to make the output look cleaner.

Known conditions (pick exactly one — this note must be about one of these three):
- SNOMED 254837009 "Malignant neoplasm of breast" — severity code "stage", valueText one of: "II", "III", "IV"
- SNOMED 44054006 "Type 2 diabetes mellitus" — severity code "a1c_band", valueText one of: "uncontrolled", "severe" (uncontrolled: HbA1c roughly 7.5-9%; severe: above ~9.5%)
- SNOMED 84114007 "Heart failure" — severity code "ef_band", valueText one of: "reduced", "preserved" (reduced: LV ejection fraction below ~40%; preserved: ~50% or above)

Known observations to extract when mentioned (codeSystem, code, display):
- LOCAL / HER2-status / "HER2 receptor status" — valueText "positive" or "negative" (breast cancer only)
- LOINC / 10230-1 / "LV ejection fraction" — valueQuantity as a percent (breast cancer cardiotoxicity monitoring, or heart failure)
- LOINC / 4548-4 / "Hemoglobin A1c" — valueQuantity as a percent (type 2 diabetes)
- LOINC / 33914-3 / "eGFR (CKD-EPI)" — valueQuantity in mL/min/1.73m2 (type 2 diabetes renal function)

Known allergy substances relevant to this system's gating rules — use these exact codes when the note describes them, even if the note uses a brand name or informal phrasing:
- RxNorm / 224905 / "Trastuzumab"
- LOCAL / SULFA-CLASS / "Sulfonamides (drug class)" — includes sulfa antibiotics and sulfonamide-derived diuretics like furosemide/Lasix reactions attributed to "sulfa"

Any other allergy the note mentions should still be extracted with your best-guess code/display and codeSystem "LOCAL", marked low confidence if you're not sure of the substance.

Treatment history: list medications/procedures the note mentions for this condition, with a short note on status or outcome if stated (e.g. "discontinued for cardiotoxicity"). This is shown to the clinician for context only — it is never used by the matching engine, so err toward including anything mentioned rather than omitting it.

Age must be extracted as a plain integer number of years.

Call record_extraction exactly once with the complete structured result.`;

const CONDITION_CODES = ["254837009", "44054006", "84114007"] as const;
const SEVERITY_CODES = ["stage", "a1c_band", "ef_band"] as const;
const SEVERITY_VALUES = [
  "II",
  "III",
  "IV",
  "uncontrolled",
  "severe",
  "reduced",
  "preserved",
] as const;
const CONFIDENCE = ["high", "medium", "low"] as const;

const EXTRACTION_TOOL: Anthropic.Tool = {
  name: "record_extraction",
  description:
    "Record the structured fields extracted from the clinical note, each with its own confidence level.",
  input_schema: {
    type: "object",
    properties: {
      condition: {
        type: "object",
        properties: {
          codeSystem: { type: "string", enum: ["SNOMED"] },
          code: { type: "string", enum: CONDITION_CODES },
          display: { type: "string" },
          confidence: { type: "string", enum: CONFIDENCE },
        },
        required: ["codeSystem", "code", "display", "confidence"],
      },
      severity: {
        type: "object",
        properties: {
          codeSystem: { type: "string", enum: ["treatmentnet-severity"] },
          code: { type: "string", enum: SEVERITY_CODES },
          valueText: { type: "string", enum: SEVERITY_VALUES },
          confidence: { type: "string", enum: CONFIDENCE },
        },
        required: ["codeSystem", "code", "valueText", "confidence"],
      },
      age: {
        type: "object",
        properties: {
          value: { type: "number" },
          confidence: { type: "string", enum: CONFIDENCE },
        },
        required: ["value", "confidence"],
      },
      observations: {
        type: "array",
        items: {
          type: "object",
          properties: {
            codeSystem: { type: "string" },
            code: { type: "string" },
            display: { type: "string" },
            valueQuantity: { type: "number" },
            valueText: { type: "string" },
            unit: { type: "string" },
            confidence: { type: "string", enum: CONFIDENCE },
          },
          required: ["codeSystem", "code", "display", "confidence"],
        },
      },
      allergies: {
        type: "array",
        items: {
          type: "object",
          properties: {
            codeSystem: { type: "string" },
            code: { type: "string" },
            display: { type: "string" },
            confidence: { type: "string", enum: CONFIDENCE },
          },
          required: ["codeSystem", "code", "display", "confidence"],
        },
      },
      treatmentHistory: {
        type: "array",
        items: {
          type: "object",
          properties: {
            display: { type: "string" },
            note: { type: "string" },
            confidence: { type: "string", enum: CONFIDENCE },
          },
          required: ["display", "note", "confidence"],
        },
      },
    },
    required: ["condition", "severity", "age", "observations", "allergies", "treatmentHistory"],
  },
};

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be JSON." }, { status: 400 });
  }

  const noteText = (body as Record<string, unknown> | null)?.noteText;
  if (typeof noteText !== "string" || noteText.trim().length === 0) {
    return NextResponse.json({ error: "Expected { noteText: string }." }, { status: 400 });
  }

  let response;
  try {
    response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 2048,
      temperature: 0,
      system: SYSTEM_PROMPT,
      tools: [EXTRACTION_TOOL],
      tool_choice: { type: "tool", name: "record_extraction" },
      messages: [{ role: "user", content: noteText }],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Anthropic API request failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const toolUse = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
  );
  if (!toolUse) {
    return NextResponse.json(
      { error: "Model did not return a structured extraction." },
      { status: 502 }
    );
  }

  const extracted = toolUse.input as ExtractedCase;
  return NextResponse.json(extracted);
}
