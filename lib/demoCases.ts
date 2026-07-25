import type { ExtractedCase, MatchResult } from "./types";

// PLACEHOLDER demo notes — written by me as stand-ins so Stage 4 can be built
// and tested end-to-end. The user's teammate is writing the real messy
// clinical notes per PLAN.md section 6; replace the three noteText values
// below (search "PLACEHOLDER" to find them) once those arrive. Everything
// else on this file (fallback extraction/match data) will need regenerating
// too if the replacement notes describe different patients.

export interface DemoCase {
  id: "oncology" | "heartFailure" | "type2Diabetes";
  label: string;
  noteText: string;
  fallbackExtraction: ExtractedCase;
  fallbackMatch: MatchResult;
}

export const DEMO_CASES: DemoCase[] = [
  {
    id: "oncology",
    label: "Load example: Breast Cancer",
    // PLACEHOLDER — replace with teammate's real note.
    noteText:
      "55f, hx breast ca dx'd 14 mo ago, stage II per onc notes, ER+/HER2+ on original path. c/o new SOB last visit, echo done 2wk ago showed EF 42% (down from baseline). was on trastuzumab initially but cardiology wants to hold given the EF drop. no known drug allergies per chart. pt otherwise doing ok, wants to know what other options make sense given the cardiac issue.",
    fallbackExtraction: {
      condition: {
        codeSystem: "SNOMED",
        code: "254837009",
        display: "Malignant neoplasm of breast",
        confidence: "high",
      },
      severity: {
        codeSystem: "treatmentnet-severity",
        code: "stage",
        valueText: "II",
        confidence: "high",
      },
      age: { value: 55, confidence: "high" },
      observations: [
        {
          codeSystem: "LOCAL",
          code: "HER2-status",
          display: "HER2 receptor status",
          valueText: "positive",
          confidence: "high",
        },
        {
          codeSystem: "LOINC",
          code: "10230-1",
          display: "LV ejection fraction",
          valueQuantity: 42,
          unit: "%",
          confidence: "high",
        },
      ],
      allergies: [],
      treatmentHistory: [
        {
          display: "Trastuzumab",
          note: "Held by cardiology due to declining ejection fraction (cardiotoxicity concern)",
          confidence: "high",
        },
      ],
    },
    fallbackMatch: {
      matchedOn: {
        conditionCode: "254837009",
        severityCode: "stage",
        severityValue: "II",
        ageBand: "50-59",
      },
      cohortSize: 25,
      insufficientData: false,
      ranked: [
        {
          treatmentCode: "56946",
          treatmentDisplay: "Paclitaxel",
          n: 9,
          successCount: 5,
          successRate: 0.5555555555555556,
          adverseEventCount: 1,
          confidenceTier: "low",
          patientRefs: [
            "ONC-017",
            "ONC-018",
            "ONC-019",
            "ONC-020",
            "ONC-021",
            "ONC-022",
            "ONC-023",
            "ONC-024",
            "ONC-025",
          ],
        },
      ],
      gated: [
        {
          treatmentCode: "224905",
          treatmentDisplay: "Trastuzumab",
          reason: "Contraindicated with reduced ejection fraction (cardiotoxicity risk)",
          ruleId: "4a962fae-2708-840e-2ab2-6d8cf1c18391",
        },
      ],
    },
  },
  {
    id: "heartFailure",
    label: "Load example: Heart Failure",
    // PLACEHOLDER — replace with teammate's real note.
    noteText:
      "65 yo, admitted for HF exacerbation, echo reduced EF around 28%, on lasix as outpt but wife says he broke out in a rash last time he was given a sulfa antibiotic in the ER a few yrs back — noted as sulfonamide allergy in old records. looking for alternative diuretic/regimen options given that.",
    fallbackExtraction: {
      condition: {
        codeSystem: "SNOMED",
        code: "84114007",
        display: "Heart failure",
        confidence: "high",
      },
      severity: {
        codeSystem: "treatmentnet-severity",
        code: "ef_band",
        valueText: "reduced",
        confidence: "high",
      },
      age: { value: 65, confidence: "high" },
      observations: [
        {
          codeSystem: "LOINC",
          code: "10230-1",
          display: "LV ejection fraction",
          valueQuantity: 28,
          unit: "%",
          confidence: "high",
        },
      ],
      allergies: [
        {
          codeSystem: "LOCAL",
          code: "SULFA-CLASS",
          display: "Sulfonamides (drug class)",
          confidence: "medium",
        },
      ],
      treatmentHistory: [
        {
          display: "Furosemide (Lasix)",
          note: "Current outpatient diuretic",
          confidence: "high",
        },
      ],
    },
    fallbackMatch: {
      matchedOn: {
        conditionCode: "84114007",
        severityCode: "ef_band",
        severityValue: "reduced",
        ageBand: "60-69",
      },
      cohortSize: 26,
      insufficientData: false,
      ranked: [
        {
          treatmentCode: "1656339",
          treatmentDisplay: "Sacubitril-valsartan",
          n: 8,
          successCount: 6,
          successRate: 0.75,
          adverseEventCount: 1,
          confidenceTier: "low",
          patientRefs: [
            "HF-019",
            "HF-020",
            "HF-021",
            "HF-022",
            "HF-023",
            "HF-024",
            "HF-025",
            "HF-026",
          ],
        },
      ],
      gated: [
        {
          treatmentCode: "4603",
          treatmentDisplay: "Furosemide",
          reason: "Cross-reactive allergy risk with sulfonamide-derived diuretics",
          ruleId: "a3befe94-1a89-e290-4edc-83317281d8c2",
        },
      ],
    },
  },
  {
    id: "type2Diabetes",
    label: "Load example: Type 2 Diabetes",
    // PLACEHOLDER — replace with teammate's real note.
    noteText:
      "65m with longstanding t2dm, labs back today a1c 10.1, uncontrolled x many yrs, now with worsening renal fxn - egfr 22 on last chem panel, nephro involved. currently just on metformin, wondering if that's even still appropriate given the kidney numbers.",
    fallbackExtraction: {
      condition: {
        codeSystem: "SNOMED",
        code: "44054006",
        display: "Type 2 diabetes mellitus",
        confidence: "high",
      },
      severity: {
        codeSystem: "treatmentnet-severity",
        code: "a1c_band",
        valueText: "severe",
        confidence: "high",
      },
      age: { value: 65, confidence: "high" },
      observations: [
        {
          codeSystem: "LOINC",
          code: "4548-4",
          display: "Hemoglobin A1c",
          valueQuantity: 10.1,
          unit: "%",
          confidence: "high",
        },
        {
          codeSystem: "LOINC",
          code: "33914-3",
          display: "eGFR (CKD-EPI)",
          valueQuantity: 22,
          unit: "mL/min/1.73m2",
          confidence: "high",
        },
      ],
      allergies: [],
      treatmentHistory: [
        {
          display: "Metformin",
          note: "Current treatment; appropriateness in question given declining renal function",
          confidence: "high",
        },
      ],
    },
    fallbackMatch: {
      matchedOn: {
        conditionCode: "44054006",
        severityCode: "a1c_band",
        severityValue: "severe",
        ageBand: "60-69",
      },
      cohortSize: 10,
      insufficientData: true,
      ranked: [],
      gated: [
        {
          treatmentCode: "6809",
          treatmentDisplay: "Metformin",
          reason: "Contraindicated in severe renal impairment (eGFR < 30)",
          ruleId: "373cfd9f-8d61-80bf-d3f9-941381d0ce17",
        },
      ],
    },
  },
];
