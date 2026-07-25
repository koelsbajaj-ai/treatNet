import type { ExtractedCase, MatchResult } from "./types";

// Real messy clinical notes from the team, one per domain plus a
// deliberately sparse case. Fallback extraction/match data below is
// hand-verified against the live engine (see git history for the exact
// /api/match calls used) — if these notes ever change, that data needs
// regenerating to match, not just the noteText field.

export interface DemoCase {
  id: "oncology" | "heartFailure" | "type2Diabetes" | "sparse";
  label: string;
  noteText: string;
  fallbackExtraction: ExtractedCase;
  /** Absent for the sparse case — insufficient extraction never reaches /api/match. */
  fallbackMatch?: MatchResult;
}

export const DEMO_CASES: DemoCase[] = [
  {
    id: "oncology",
    label: "Load example: Breast Cancer",
    noteText:
      "58F, stage IV breast ca, HER2+ on path, c/o increasing fatigue and new back pain x2wks at clinic today. Tried trastuzumab ~4mo ago, no response — repeat imaging showed progression so it was d/c'd. Pt frustrated, asking about other options, ECOG maybe 1-2 currently. No new neuro deficits but will need MRI spine to r/o mets given the pain, holding off on next line til we see that.",
    fallbackExtraction: {
      sufficientInformation: true,
      condition: {
        codeSystem: "SNOMED",
        code: "254837009",
        display: "Malignant neoplasm of breast",
        confidence: "high",
      },
      severity: {
        codeSystem: "treatmentnet-severity",
        code: "stage",
        valueText: "IV",
        confidence: "high",
      },
      age: { value: 58, confidence: "high" },
      observations: [
        {
          codeSystem: "LOCAL",
          code: "HER2-status",
          display: "HER2 receptor status",
          valueText: "positive",
          confidence: "high",
        },
      ],
      allergies: [],
      treatmentHistory: [
        {
          display: "Trastuzumab",
          note: "No response after ~4 months; discontinued after imaging showed disease progression",
          confidence: "high",
        },
      ],
    },
    fallbackMatch: {
      matchedOn: {
        conditionCode: "254837009",
        severityCode: "stage",
        severityValue: "IV",
        ageBand: "50-59",
      },
      cohortSize: 3,
      insufficientData: true,
      ranked: [],
      gated: [],
    },
  },
  {
    id: "heartFailure",
    label: "Load example: Heart Failure",
    noteText:
      "81M w/ known HFrEF (EF ~30% on last echo, maybe 2yrs ago, due for repeat), came in SOB again, some ankle swelling per wife. Was on lisinopril before, stopped bc of cough + creatinine bump, switched to something else at that point I think but not documented well here. Lytes wnl today, lungs a bit crackly at bases, no acute distress. Will need updated echo and probably switch to ARNI if tolerates, holding for now til labs back.",
    fallbackExtraction: {
      sufficientInformation: true,
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
      age: { value: 81, confidence: "high" },
      observations: [
        {
          codeSystem: "LOINC",
          code: "10230-1",
          display: "LV ejection fraction",
          valueQuantity: 30,
          unit: "%",
          confidence: "medium",
        },
      ],
      allergies: [],
      treatmentHistory: [
        {
          display: "Lisinopril",
          note: "Discontinued due to cough and a creatinine increase; switched to another agent, not clearly documented which",
          confidence: "medium",
        },
      ],
    },
    fallbackMatch: {
      matchedOn: {
        conditionCode: "84114007",
        severityCode: "ef_band",
        severityValue: "reduced",
        ageBand: "80+",
      },
      cohortSize: 26,
      insufficientData: false,
      ranked: [
        {
          treatmentCode: "4603",
          treatmentDisplay: "Furosemide",
          n: 18,
          successCount: 14,
          successRate: 0.7777777777777778,
          adverseEventCount: 1,
          confidenceTier: "moderate",
          patientRefs: [
            "HF-001",
            "HF-002",
            "HF-003",
            "HF-004",
            "HF-005",
            "HF-006",
            "HF-007",
            "HF-008",
            "HF-009",
            "HF-010",
            "HF-011",
            "HF-012",
            "HF-013",
            "HF-014",
            "HF-015",
            "HF-016",
            "HF-017",
            "HF-018",
          ],
        },
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
      gated: [],
    },
  },
  {
    id: "type2Diabetes",
    label: "Load example: Type 2 Diabetes",
    noteText:
      "Pt c/o polyuria and fatigue, T2DM dx ~6yrs ago, HbA1c back up to 9.8 today from 8.4 last visit despite being on metformin — poor adherence reported, missed a few appts too. Cr slightly bumped at 1.4, eGFR borderline so need to watch before adding anything nephrotoxic, didn't get to recheck UACR today. Says feet tingling more, reassess neuropathy next visit. Control clearly slipping, ran out of time to discuss next step meds.",
    fallbackExtraction: {
      sufficientInformation: true,
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
      // Age is never stated in this note. Estimated from clinical context
      // (6-year T2D history, early neuropathy) — always low confidence,
      // exactly the kind of field the clinician should check and correct.
      age: { value: 64, confidence: "low" },
      observations: [
        {
          codeSystem: "LOINC",
          code: "4548-4",
          display: "Hemoglobin A1c",
          valueQuantity: 9.8,
          unit: "%",
          confidence: "high",
        },
        {
          codeSystem: "LOINC",
          code: "33914-3",
          display: "eGFR (CKD-EPI)",
          valueText: "borderline (no numeric value documented)",
          confidence: "low",
        },
      ],
      allergies: [],
      treatmentHistory: [
        {
          display: "Metformin",
          note: "HbA1c rising (8.4 to 9.8) despite metformin; poor adherence and missed appointments reported",
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
      insufficientData: false,
      ranked: [
        {
          treatmentCode: "6809",
          treatmentDisplay: "Metformin",
          n: 6,
          successCount: 3,
          successRate: 0.5,
          adverseEventCount: 1,
          confidenceTier: "low",
          patientRefs: ["T2D-033", "T2D-034", "T2D-035", "T2D-036", "T2D-037", "T2D-038"],
        },
        {
          treatmentCode: "274783",
          treatmentDisplay: "Insulin glargine",
          n: 4,
          successCount: 2,
          successRate: 0.5,
          adverseEventCount: 1,
          confidenceTier: "insufficient",
          patientRefs: ["T2D-039", "T2D-040", "T2D-041", "T2D-042"],
        },
      ],
      gated: [],
    },
  },
  {
    id: "sparse",
    label: "Load example: Sparse case",
    noteText:
      "Pt seen briefly, c/o generalized fatigue x few wks, no significant PMH on file, meds unclear — pt couldn't recall names. No prior labs or imaging in system. Limited hx obtained, pt seemed rushed/unable to elaborate much, will need to pull records from previous provider before doing anything further.",
    // This is the *other* refusal path — distinct from an insufficient
    // cohort. There's no condition, age, or clinical detail here at all,
    // so extraction refuses before a case is even built. No fallbackMatch:
    // /api/match is never called for this one.
    fallbackExtraction: {
      sufficientInformation: false,
      insufficientReason:
        "No diagnosis, condition, age, or clinically meaningful detail could be identified — the encounter was too brief and no prior records were available.",
    },
  },
];
