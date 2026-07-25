# TreatNet — Demo Cheat Sheet

One page. Read this before the booth opens, and glance at it between judges if you lose your place. Four demo buttons, one per real note. Never type a note live at the booth.

## Before the booth opens

1. Open the live URL. You should see: an amber banner across the very top reading **"All data is synthetic and illustrative. Not for clinical use."**, the title **TreatNet**, the subtitle **"Evidence surfaced for clinician review, not a prescription."**, and a red **↺ Reset** button in the top-right corner. All four stay visible through every screen, including with the provenance modal open — that's been verified, not assumed.
2. Click each of the four demo buttons once, run each all the way to its final screen, and hit Reset after each. This confirms everything is warm before a judge is watching.
3. Between every judge: click **↺ Reset** (top-right, always visible, works from any screen including with a modal open). That's the only reset you need — it instantly clears back to a blank intake screen.

---

## The four demo notes

Each button loads a real messy clinical note (not typed live) and is marked with a small **⚡ INSTANT DEMO** badge — that's intentional: these four never call the live model for extraction, so venue wifi and Anthropic's API status can't touch them. The match step still calls the real database, with a 3-second automatic fallback to a cached result if that call is ever slow or fails outright.

### 1. Breast Cancer — the "insufficient data" refusal, by cohort size

Click **"Load example: Breast Cancer"** → **Extract**.

**Confirmation screen, exactly:**
| Field | Value | Confidence |
|---|---|---|
| Condition | Malignant neoplasm of breast | 🟢 high |
| Severity (stage) | IV | 🟢 high |
| Age | 58 | 🟢 high |
| Observation: HER2 receptor status | positive | 🟢 high |
| Treatment history | Trastuzumab — no response after ~4 months; discontinued after imaging showed disease progression | 🟢 high |

Every field is green here — say out loud that an amber field would mean the model wasn't sure, and nothing runs until Confirm regardless of color.

Click **Confirm and run**.

**Results screen, exactly:** "Matched on: condition 254837009, severity stage = "IV", age band 50-59. Cohort size: 3." Then a gray box: **"Insufficient data — no recommendation."** No ranked list, no avoid list. This is the smallest cohort in the whole dataset by design — three synthetic patients, below the N=5 floor.

### 2. Heart Failure — a real ranked result, second domain

Click **↺ Reset** → **"Load example: Heart Failure"** → **Extract**.

**Confirmation screen, exactly:**
| Field | Value | Confidence |
|---|---|---|
| Condition | Heart failure | 🟢 high |
| Severity (ef_band) | reduced | 🟢 high |
| Age | 81 | 🟢 high |
| Observation: LV ejection fraction | 30% | ⚪ **medium** |
| Treatment history | Lisinopril — discontinued due to cough and a creatinine increase; switched to another agent, not clearly documented which | ⚪ medium |

The LVEF field is gray/medium, not green — the note says "EF ~30% on last echo, maybe 2yrs ago, due for repeat," i.e. an approximate, possibly-stale number. That's a good one to point out: the model is calibrating confidence to how the note actually reads, not just presence-of-a-number.

Click **Confirm and run**.

**Results screen, exactly:** "Cohort size: 26," age band 80+. Ranked: **#1 Furosemide**, N=18, 78% improved (14/18), 1 adverse event, 🟢 moderate confidence. **#2 Sacubitril-valsartan**, N=8, 75% improved (6/8), 1 adverse event, 🟡 low confidence. No badge on either row (the patient's history is Lisinopril, which isn't either ranked drug — correct, no false match). No avoid list — nothing gates here.

### 3. Type 2 Diabetes — a ranked result with an honest "already tried" flag

Click **↺ Reset** → **"Load example: Type 2 Diabetes"** → **Extract**.

**Confirmation screen, exactly:**
| Field | Value | Confidence |
|---|---|---|
| Condition | Type 2 diabetes mellitus | 🟢 high |
| Severity (a1c_band) | severe | 🟢 high |
| Age | 64 | 🟠 **low (amber)** |
| Observation: Hemoglobin A1c | 9.8% | 🟢 high |
| Observation: eGFR (CKD-EPI) | "borderline (no numeric value documented)" | 🟠 **low (amber)** |
| Treatment history | Metformin — HbA1c rising (8.4 to 9.8) despite metformin; poor adherence and missed appointments reported | 🟢 high |

Two fields are amber here, and both are honest, not sloppy: **age is never stated in this note at all** — 64 is an estimate from context, correctly marked low-confidence for the clinician to check or correct. **eGFR has no number in the note** ("eGFR borderline") — the model didn't invent one; it recorded the ambiguity as text instead of a fabricated value. Good talking point if a judge asks about hallucination risk.

Click **Confirm and run**.

**Results screen, exactly:** "Cohort size: 10," age band 60-69. Ranked: **#1 Metformin** — with a blue **"Patient currently on this"** badge next to the name — N=6, 50% improved (3/6), 1 adverse event, 🟡 low confidence. Directly under the stats line, a short gray note: *"This cohort's outcomes reflect a range of adherence levels, not drug efficacy alone — re-trial with adherence support is a legitimate clinical option."* **#2 Insulin glargine**, N=4, 50% improved (2/4), 1 adverse event, gray **"Insufficient data"** tier badge (shown transparently even though it's below the ranking floor, since Metformin's N=6 already clears it for the cohort as a whole).

The badge and the adherence line only appear because the treatment history text matches "Metformin" exactly and mentions adherence — this is a client-side display match, not a change to the ranking or the underlying numbers. Worth saying explicitly if asked: **the tool doesn't hide or downrank Metformin for the fact that this patient is already on it and not improving — it surfaces that fact next to the number, and leaves the judgment call to the clinician.**

### 4. Sparse case — the *other* refusal, before a match is ever attempted

Click **↺ Reset** → **"Load example: Sparse case"** → **Extract**.

**What you should see immediately (no confirmation screen at all):** a screen titled **"Cannot process this note"**, with an amber box: *"Too little clinical detail to extract a case."* Reason shown: *"No diagnosis, condition, age, or clinically meaningful detail could be identified — the encounter was too brief and no prior records were available."* Below that, explicit text distinguishing this from the other refusal: this fires **before** any match is attempted, because there was nothing to build a case from — not because a cohort turned out to be small.

This is the second, structurally distinct refusal path. If a judge asks "what happens with bad input," this is the answer: the system won't force a guess at a condition just to have something to show.

---

## The two distinct refusal paths — what triggers each

| | Insufficient extraction (case 4) | Insufficient cohort data (case 1) |
|---|---|---|
| **Where it happens** | At Extract, before any confirmation screen | At Confirm and run, after a real match attempt |
| **What triggers it** | The note doesn't describe one of the three known conditions, or has no usable clinical detail at all | The matched cohort's best-available treatment has fewer than 5 historical patients |
| **What it means** | "There's nothing here to build a case from" | "We tried the match; the data we have is too thin to rank confidently" |
| **Screen shown** | "Cannot process this note" (amber box, no cohort numbers) | "Insufficient data — no recommendation" (gray box, shows cohort size) |

Both are real refusals the engine can hit live, not scripted-only — worth stating if a judge pushes on it.

---

## If something looks wrong

- **Screen looks stuck or wrong** → click **↺ Reset**, top-right, always there. Don't reload the page (state is easier to reason about than a fresh load mid-conversation with a judge).
- **A live match seems slow** → the four demo buttons never wait on anything live for extraction, and the match step automatically falls back to a cached result within 3 seconds if the network stalls or drops outright — verified under both a simulated 5-second delay and a simulated hard failure. You should never actually see a stall on the four demo buttons.
- **Someone pastes their own note instead of using a button** → that's the one path that calls the live model for extraction, so it depends on wifi and Anthropic's API being up. If it errors, a red banner shows the error message — hit Reset and go back to the four demo buttons.
- **Don't manually retype or edit a demo note's text** — editing it breaks the pairing with its pre-computed fallback for that run (extraction will then try to call the live model instead of using the cached result).
- **A confidence badge or number doesn't match this sheet** → the underlying notes or seed data may have changed since this was written. Trust the screen, not this sheet, and flag it to fix after the demo.

---

## Why these four, specifically

- **Breast Cancer** — the insufficient-*cohort* refusal, with a real (if tiny) cohort size shown.
- **Heart Failure** — proves the same engine works unmodified on a second condition, with a genuinely ambiguous/stale observation value shown as medium confidence rather than green.
- **Type 2 Diabetes** — a real ranked result carrying two honestly-estimated amber fields, plus the "patient currently on this" flag that keeps the top-ranked drug from reading as an oblivious recommendation.
- **Sparse case** — the insufficient-*extraction* refusal, structurally distinct from the cohort one, proving the system won't force a case out of nothing.
