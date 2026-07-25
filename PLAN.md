# TreatmentNet — Hackathon Build Plan

**Assumptions locked in from your answers:** accounts (GitHub, Vercel, Supabase, Anthropic API key) are already set up; you'll do one long work stretch then a sleep gap; teammate's repo involvement is undecided so this plan defaults to "hands you files, never touches the repo"; three seed domains are Oncology (deep), Type 2 Diabetes, Heart Failure (breadth); no clinical vetting is available so all data is explicitly labeled synthetic/illustrative everywhere it appears; demo is in-person live/walk-up so venue wifi must not be a single point of failure; repo is public.

---

## 1. Architecture

### Components
- **Next.js app (App Router, TypeScript) on Vercel.** One deployable unit — UI pages + serverless API routes. No separate backend service to stand up or keep alive.
- **Supabase Postgres.** Holds the FHIR-aligned tables. Accessed only from server-side API routes (never from the browser) using the service-role key, kept in Vercel environment variables.
- **Anthropic API (Claude).** Called only from two narrow server-side functions (below). Never touches the database directly and never decides gates, cohorts, or rankings.

### Data flow (per query)
1. Clinician selects or types a patient case in the UI.
2. The clinician pastes an unstructured clinical note — a messy paragraph, written the way a real handover actually is — into the intake box. This text is sent to `/api/extract`, which calls Claude with instructions to pull structured fields (condition code, severity/biomarker observations, allergies, key treatment history) into a fixed JSON shape, **with a confidence level (`high` / `medium` / `low`) attached to every individual field**. This is the one place in the whole product where the LLM does something deterministic code genuinely cannot do — read unstructured prose and locate the clinically relevant facts in it. The extracted fields are rendered back as an editable form, **low-confidence fields visually flagged**, and **nothing downstream runs until the clinician confirms or corrects them**. The LLM's output is always a draft; it is never trusted silently.
3. The confirmed structured case hits `/api/match`, pure TypeScript/SQL:
   - Filters candidate historical patients by condition code.
   - Stratifies by severity band (see schema) so we're comparing like-with-like, not all-comers.
   - Applies hard contraindication gates from `treatment_contraindication_rules` — allergy or lab-threshold matches remove a treatment from the candidate set entirely, before any ranking happens.
   - Aggregates outcomes per remaining treatment: N, success rate, adverse events.
   - Computes a confidence tier from N using fixed thresholds (below).
   - If the best-matched cohort is below the minimum N, returns `insufficient_data: true` and **no ranking**.
4. The API returns this structured result (numbers, record IDs, gate reasons) to the UI, which renders it directly.
5. *(Optional)* A second, separate Claude call takes that already-computed JSON and writes one paragraph of plain-language narrative. The prompt explicitly forbids stating any number not present in the input JSON. The narrative is rendered *next to*, not *instead of*, the raw numbers, so any drift is visible.

### What must NOT be left to the model, and why
| Decision | Owner | Why |
|---|---|---|
| Contraindication gating (allergy, lab threshold) | Deterministic TS, `lib/gates.ts` | Safety-critical hard constraint. A hallucinated or inconsistent gate is the single worst failure mode this product can have — it would look like the tool endorsing a dangerous treatment. |
| Cohort matching / severity stratification | Deterministic SQL/TS, `lib/matching.ts` | Must be reproducible: same case + same DB state → same cohort, every time. An LLM can't guarantee that, and judges need to be able to read the exact matching rule in the code, not trust a prompt. |
| Outcome statistics (N, success rate, confidence tier) | Deterministic aggregation | Arithmetic is exactly what LLMs quietly get wrong under paraphrase. This is the number a clinician judge will challenge first — it must trace to a query they could re-run by hand. |
| Ranking order | Deterministic (sort by success rate, gated by N threshold) | Ranking can't be allowed to drift with prompt wording between demo runs. |
| Free-text → structured case extraction | Claude, per-field confidence + human-confirmed before use | **Core capability, not a convenience.** This is the one task in the product an LLM can do that deterministic code cannot — read unstructured prose and locate the clinically relevant facts. Still never trusted silently: every extracted field carries a confidence level, low-confidence fields are visually flagged, and nothing reaches the engine until the clinician confirms or edits. |
| Narrative gloss on already-computed stats | Claude, numbers-locked prompt | Readability only. Adds nothing the deterministic layer didn't already produce — lower priority than extraction, and the first thing sacrificed if extraction needs the time instead. |

### Confidence tiers (fixed thresholds, not statistics we don't have)
- **N < 5** → "Insufficient data" — no ranking shown, no treatment flagged as preferred, gate/avoid flags still shown if triggered by allergy/threshold rules (those are deterministic and don't need cohort size).
- **5 ≤ N < 15** → "Low confidence" — ranking shown, tier badge visible, banner reminds this is a small sample.
- **N ≥ 15** → "Moderate confidence" — ranking shown. We do not claim "high confidence" anywhere; this is synthetic data at hackathon scale, not a validated model.

### Confounding-by-indication: what we actually do about it
We cannot statistically adjust for confounding with synthetic data and no clinical vetting — claiming otherwise would be the credibility failure the spec warns about. Two honest mitigations, both visible on screen:
1. **Severity-band stratification is mandatory**, not optional — the matched cohort is always same-condition *and* same-severity-band before any outcome is compared. This is shown explicitly in the UI ("Matched on: condition, severity band, age band").
2. **A persistent, non-dismissable banner**: *"Retrospective association from synthetic records, not a randomized comparison. Treatments were not randomly assigned to patients."* This sentence, or one materially identical, appears on every results screen and in the README.

---

## 2. Data Schema

FHIR-resource-aligned, condition-agnostic. Severity, biomarkers, and lab values are all just rows in `observations` with different codes — nothing about oncology, diabetes, or heart failure is hardcoded into the schema or the engine. Adding a fourth domain means inserting rows with new codes, never touching a table definition or `lib/matching.ts`.

> Codes below (SNOMED/LOINC/RxNorm) are illustrative for demo realism, not clinically verified — nobody on the team can vouch for them, and the README will say so plainly.

```
patients
  id                uuid, pk
  synthetic_ref     text        -- e.g. "ONC-014", shown in UI as the citable ID
  birth_date        date
  sex               text        -- 'male' | 'female' | 'other'
  created_at        timestamptz

conditions
  id                uuid, pk
  patient_id        uuid, fk -> patients
  code_system       text        -- 'SNOMED'
  code               text
  display           text
  clinical_status   text        -- 'active' | 'resolved' | 'remission'
  onset_date        date

observations        -- generic: severity bands, labs, biomarkers, vitals all live here
  id                uuid, pk
  patient_id        uuid, fk -> patients
  condition_id      uuid, fk -> conditions, nullable
  code_system       text        -- 'LOINC' | 'treatmentnet-severity' | ...
  code              text
  display           text
  value_quantity    numeric, nullable
  value_text        text, nullable   -- e.g. severity band, stage
  unit              text, nullable
  effective_datetime timestamptz

allergy_intolerances
  id                uuid, pk
  patient_id        uuid, fk -> patients
  code_system       text
  code              text
  display           text
  criticality       text        -- 'low' | 'high' | 'unable-to-assess'
  reaction_text     text, nullable

treatments           -- generalizes MedicationStatement + Procedure
  id                uuid, pk
  patient_id        uuid, fk -> patients
  condition_id      uuid, fk -> conditions
  type              text        -- 'medication' | 'procedure'
  code_system       text        -- 'RxNorm' | 'SNOMED'
  code              text
  display           text
  start_date        date
  end_date          date, nullable
  status            text        -- 'active' | 'completed' | 'stopped'

treatment_outcomes
  id                uuid, pk
  treatment_id      uuid, fk -> treatments
  outcome_code      text        -- 'improved' | 'no_response' | 'adverse_event' | 'discontinued_toxicity' | 'discontinued_other'
  outcome_date      date
  notes             text, nullable

treatment_contraindication_rules   -- the deterministic gate source, human-readable
  id                uuid, pk
  treatment_code    text        -- matches treatments.code
  rule_type         text        -- 'allergy' | 'observation_threshold'
  parameter_code    text        -- allergy substance code, or observation code (e.g. eGFR)
  operator          text, nullable   -- '<' | '<=' | '>' | '>=', null for allergy rules
  threshold_value   numeric, nullable
  reason            text        -- human-readable, shown in UI when a gate fires
```

TypeScript types in `lib/types.ts` mirror these tables 1:1 (e.g. `type Observation = { id: string; patientId: string; codeSystem: string; code: string; ... }`) — Supabase's generated types plus these hand-written domain types are the single source of truth the matching engine is written against.

### Worked examples, one per domain

**Oncology (deep-dive domain)**
```
patient:      { synthetic_ref: "ONC-014", birth_date: 1968-03-11, sex: "female" }
condition:    { code_system: "SNOMED", code: "254837009", display: "Malignant neoplasm of breast" }
observation:  { code_system: "treatmentnet-severity", code: "stage", value_text: "III" }
observation:  { code_system: "LOCAL", code: "HER2-status", value_text: "positive" }
treatment:    { type: "medication", code_system: "RxNorm", display: "Trastuzumab", status: "stopped" }
outcome:      { outcome_code: "discontinued_toxicity", notes: "Discontinued for cardiotoxicity" }
```

**Type 2 Diabetes (breadth domain)**
```
patient:      { synthetic_ref: "T2D-102", birth_date: 1975-06-02, sex: "male" }
condition:    { code_system: "SNOMED", code: "44054006", display: "Type 2 diabetes mellitus" }
observation:  { code_system: "LOINC", code: "4548-4", display: "Hemoglobin A1c", value_quantity: 9.2, unit: "%" }
treatment:    { type: "medication", code_system: "RxNorm", display: "Metformin" }
outcome:      { outcome_code: "no_response", notes: "HbA1c remained above 9% at 6 months" }
```

**Heart Failure (breadth domain)**
```
patient:      { synthetic_ref: "HF-055", birth_date: 1958-11-20, sex: "female" }
condition:    { code_system: "SNOMED", code: "84114007", display: "Heart failure" }
observation:  { code_system: "LOINC", code: "10230-1", display: "LV ejection fraction", value_quantity: 28, unit: "%" }
treatment:    { type: "medication", code_system: "RxNorm", display: "Furosemide" }
outcome:      { outcome_code: "improved", notes: "Symptom improvement, reduced NYHA class" }
```

### Schema-agnosticism test, applied
Adding heart failure alongside oncology required: new `condition` rows with a heart-failure SNOMED code, new `observation` rows for ejection fraction, new `treatment` rows for the relevant drugs, new `treatment_contraindication_rules` rows if any apply. Zero table changes, zero changes to `lib/matching.ts` or `lib/gates.ts`. That's the test the spec set, and it passes by construction — the engine only ever asks "what condition code, what severity band, what observations, what gates apply," never "what does an oncology patient look like."

---

## 3. Data Sources — honest assessment

| Source | Gives us | Cost | Failure mode | Verdict |
|---|---|---|---|---|
| **Synthea** | Real multi-condition FHIR bundles, no privacy issues | Realistically 3–5h to flatten deeply-nested FHIR JSON into our relational shape, debugged by me since you can't read the JSON yourself — well above your 2h bar. Synthea also has no native "treatment outcome" resource, so I'd still have to synthesize outcome labels on top of it, same gap as building from scratch. | Silent, slow bleed of hours into JSON-wrangling with no demoable output until it's fully done | **Cut for the core build.** Attempt only as a stretch goal after everything else is deployed, hard-timeboxed to 2h with a walk-away rule back to the synthetic fallback. |
| **ClinicalTrials.gov API** | Real recruiting trials, real NCT IDs, no auth | ~1–1.5h for a read-only fetch-by-condition-code side panel | Low — it's isolated from the core engine, worst case it just doesn't render | **Stretch, attempt after core stages are done.** Cheap and adds real-world credibility without risking the risky path. |
| **openFDA adverse events** | Real safety signal badge on a drug | ~1–1.5h, same isolated-addon shape as above | Low, same reasoning | **Stretch, same tier as ClinicalTrials.gov.** Pick whichever one you and your teammate find more compelling if there's only time for one. |
| **LLM-generated synthetic** | Full schema control, guaranteed outcome labels, guaranteed small *and* large cohorts so both "confident ranking" and "insufficient data" demo states exist on purpose | ~2–3h: I draft a generation approach, produce records, you skim a sample for "does this read as plausible" (not clinical review — just sanity), then it's loaded into Supabase as committed SQL/JSON files | None that block the build — it's fully within our control | **Primary and only data source for the actual product.** Real-API sources are flavor, never a dependency. |

**Important reproducibility note:** seed data is generated once, early, and the *output* is committed to the repo as static `.sql`/`.json` files — not regenerated live at setup time. That means loading the database never depends on a live LLM call succeeding, which matters both for your setup reliability and for anyone (a judge) trying to reproduce the repo later.

---

## 4. Build Order

Total working time ≈ 28h (36h minus an assumed ~8h sleep gap), leaving real slack against the ~25h full path below.

**Do stages 1–4 before sleep** — they're the foundation and the highest-risk-of-silent-failure work (deploy pipeline, schema, engine, and the free-text intake loop). **Do stages 5–10 after waking** — polish, credibility framing, and demo rehearsal go better with a clear head, and none of them are safe to rush in the last hour.

| # | Stage | What "done" looks like | Est. hours | Cuttable? |
|---|---|---|---|---|
| 1 | **Empty app live on Vercel** | Next.js scaffold pushed to GitHub, Vercel auto-deploy connected, a page at the live URL shows "TreatmentNet" and a Supabase connection health check ("DB: connected"). | 1h | No — foundation |
| 2 | **Schema + seed data** | All 7 tables created via committed migration SQL; seed data for all 3 domains loaded, including at least one deliberately tiny cohort (N<5) for the insufficient-data demo. Verifiable by a row-count query. | 3h | No |
| 3 | **Deterministic matching + gating engine** | `/api/match` takes a structured case, returns ranked treatments with N, confidence tier, and gate exclusions — verified by calling it directly (no UI yet) with 3+ test cases across domains. | 4h | No — this *is* the product |
| 4 | **Free-text case intake (must-have)** | Clinician pastes/loads a messy clinical note → `/api/extract` returns structured fields, each tagged `high`/`medium`/`low` confidence → editable confirmation form, low-confidence fields visually flagged → on confirm, the engine runs and a bare-bones (unstyled but functional) results readout appears. The full loop — paste → extract → confirm → rank — is demonstrable end to end, even before Stage 5's polish. | 4h | **No.** This is the strongest demo moment we have — the one place the LLM does something the deterministic engine genuinely can't. Protected ahead of the narrative layer (Stage 6). |
| 5 | **Results UI polish** | Turns Stage 4's bare readout into the actual demo screen: ranked table, N, confidence tier badge, "avoid" flags in red, clickable citations wired to record IDs. | 3h | Visual polish is cuttable; the table's presence is not |
| 6 | **LLM narrative layer** | A second Claude call takes the already-computed match JSON and writes one plain-language paragraph, numbers-locked, rendered next to (not instead of) the raw stats. | 2h | **Yes — cut first, and specifically to protect Stage 4 if time is tight.** Between free-text intake and the narrative gloss, intake wins; the narrative is the one piece of scope that exists to be sacrificed for it. |
| 7 | **Credibility UI** | Persistent confounding-limitation banner; explicit "Insufficient data" refusal state fully styled, not just functional. | 2h | Partially — can simplify styling but not remove |
| 8 | **Provenance detail view** | Clicking a record ID opens the actual synthetic patient record it came from. | 2h | Yes — fallback is showing IDs as plain text if time runs out |
| 9 | **Demo hardening** | Pre-warm the demo-path extraction *and* match queries; embed a static JSON fallback for both steps of each demo note so the walkthrough renders instantly even if venue wifi stalls the live calls. | 2h | No — required for the demo to be safe |
| 10 | **README + repo hygiene** | README covers pitch, architecture, non-goals, synthetic-data disclaimer, how to run locally, screenshot; `.env.example` present; no secrets in git history (checked before making repo public). | 2h | No — explicitly judged |
| 11 | **Stretch: real-API add-ons / Synthea** | ClinicalTrials.gov panel and/or openFDA badge; Synthea only if everything above is done with 3+ hours to spare. | remaining time | Yes — entirely optional |

Full path (everything but stretch): ≈25h. Minimum non-cuttable path (drop Stage 6 and 8, trim Stage 7's styling): ≈20h. Either fits inside 28 working hours with real slack for debugging — and the free-text intake loop, the single strongest demo beat, is inside the non-cuttable 20h, not the optional 5h.

---

## 5. Risk Register

1. **A Supabase schema/migration error you can't diagnose yourself.**
   *Mitigation:* I write and run all SQL through Claude Code, migrations are versioned `.sql` files in the repo (never ad-hoc), and every migration step ends with a stated "you should see N tables / N rows" checkpoint so you can independently confirm success without reading SQL.

2. **Vercel deploy breaks or an env var goes missing right before the demo.**
   *Mitigation:* the deploy pipeline is locked in at Stage 1 and every later stage ends with "open this URL, you should see X." Deploys freeze at least 3 hours before the demo slot — no live changes during the show.

3. **The LLM misparses a note, or the narrative layer states a number that isn't actually in the database.**
   *Mitigation:* extraction is never trusted silently — every field carries a confidence level, low-confidence fields are visually flagged, and nothing runs until the clinician confirms or edits (Stage 4). For the separate narrative layer, the deterministic layer computes every number first; the narrative prompt is given only those numbers with an explicit "state no number not provided" instruction, and the raw numbers render alongside the prose so drift is visible immediately. The narrative layer (Stage 6) is cuttable if it ever looks untrustworthy late in the build; extraction (Stage 4) is not cuttable, but its confirm-before-run design is exactly what contains this risk.

4. **You can't tell "expected empty/refusal state" from "the app is broken" mid-demo.**
   *Mitigation:* the demo path is scripted to exactly 3–4 pre-verified notes (Stage 9), loaded via a button rather than typed live, including the insufficient-data case, with a one-page cheat sheet showing what each screen — extraction fields, confidence badges, ranked results, refusal state — is supposed to look like. No improvising with untested notes at the venue.

5. **Time evaporates chasing Synthea or a real API instead of finishing the core product.**
   *Mitigation:* hard rule — stretch work (Stage 10) starts only after Stages 1–9 are deployed and demoable, and Synthea specifically gets a 2-hour hard timebox with a pre-agreed walk-away point back to the synthetic dataset already in place.

---

## 6. What Your Teammate Should Produce

None of this blocks my work except item A, which has a generous window.

- **A. 3–5 demo clinical notes, written messy on purpose** — real handover style, one per domain plus at least one deliberately sparse/rare case: run-on sentences, abbreviations, the facts not in a clean order. This is the literal text that gets pasted into the free-text intake box during the demo (Stage 4), so it needs to actually look unstructured, not like a filled-in form. Format: plain text, one note per file/section. **Due by hour 8** — Stage 4 is core work planned before the sleep gap (finishes around hour 12), so this needs a safety margin, not just before it's needed.
- **B. Pitch narrative + slides** (problem, why it matters, live-demo narration script, roadmap/non-goals). Fully parallel track, doesn't touch the repo. **Due by hour 30**, ahead of demo rehearsal.
- **C. (Optional, non-blocking) A plain-language skim** of a sample of generated synthetic records — "does this read as a plausible case," not clinical validation, since neither of you has a clinical background. Comments in whatever format is easiest; due whenever, never blocks anything.

If your teammate wants to touch the repo directly (undecided per your answer), the only safe self-serve task is reviewing generated JSON/SQL seed files before I load them — not running commands. I'd rather keep write access to the repo with me throughout to avoid merge/state confusion neither of you needs to debug mid-hackathon.

---

## 7. Demo Script (90 seconds, venue wifi assumed unreliable)

The walkthrough leads with intake, because that's the strongest moment: **paste messy note → watch it become structured data → deterministic engine ranks treatments with cohort sizes and confidence → avoid-list traced to specific record IDs.**

**Pre-req (done once, ~30 min before the demo slot):** run each demo note through extraction *and* matching live once to warm the Vercel functions and DB connection; confirm the static JSON fallback (Stage 9) renders instantly for both steps if toggled.

1. **(0–15s)** Land on the homepage. Click "Load example note: Breast Cancer" — fills the intake box with a real-feeling, messy handover paragraph (no live typing). Click "Extract."
2. **(15–30s)** Structured fields appear: condition, severity/stage, biomarker status, allergy — each with a confidence badge. One field (e.g. an ambiguous prior-therapy mention) is deliberately shown as low-confidence, highlighted amber. Click "Confirm and run."
3. **(30–45s)** Ranked results appear: cohort N, confidence tier badge, a red "avoid" flag on the treatment that already failed for this profile.
4. **(45–55s)** Click the avoid flag's citation → provenance modal shows the exact synthetic patient records backing that number.
5. **(55–70s)** Load the Heart Failure example note → extract → confirm → run. Same intake flow, same engine, zero code differences — proving the schema-agnostic breadth claim live, on a second domain, rather than by assertion.
6. **(70–85s)** Load the deliberately sparse-case note → extraction still succeeds, but the engine explicitly refuses to rank: "Insufficient data — no recommendation," proving it doesn't bluff confidence it doesn't have.
7. **(85–90s)** Close on the persistent framing banner — *"Evidence surfaced for clinician review, not a prescription"* — and gesture at the public GitHub repo/README on screen.

**Resilience:** every demo note has a pre-computed static JSON fallback for *both* steps — the extraction output and the match result — embedded client-side. If either live API call takes longer than ~2 seconds, the UI falls back to the cached result automatically, so a bad venue connection never stalls the walkthrough at either the intake step or the ranking step.

---

## 8. Three Questions a Clinician Judge Will Ask

1. **"How do you know drug B is really better, or is this just because sicker patients got drug A?"**
   → The UI shows "Matched on: condition, severity band, age band" before any comparison, and every results screen carries the disclaimer that this is retrospective association from synthetic data, not a randomized comparison. We surface the limitation instead of hiding it.

2. **"What happens with a rare case where you don't have much data?"**
   → Live in the demo: the sparse case returns an explicit "insufficient data, n=3, no recommendation" state instead of a confident-looking ranking. The refusal is the answer.

3. **"Where does this number come from — can I check it?"**
   → Click any statistic → a provenance modal shows the exact patient/record IDs it was computed from. No number anywhere in the UI is unattributed.

---

## What will NOT fit, said plainly

Synthea integration will very likely not happen — plan for it not to, and be pleasantly surprised if it does. Free-text intake (Stage 4) is now core, not optional — it's the strongest demo moment and is protected ahead of everything except the engine itself. If the clock gets tight, the **narrative layer (Stage 6)** is the first thing to cut, specifically to buy time for intake, not the other way around; the deterministic engine plus intake plus a ranked table is a complete, credible demo without it. Real EHR integration, auth, multi-tenancy, HIPAA/GDPR work, vector databases, fine-tuning, and mobile are out of scope entirely and belong only in a README "roadmap" section, never in the build.
