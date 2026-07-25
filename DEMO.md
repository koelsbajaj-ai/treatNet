# TreatNet — Demo Cheat Sheet

One page. Read this before the booth opens, and glance at it between judges if you lose your place. Four rail items, one per real note. Never type a note live at the booth.

## The shell (read this first — it's new)

- **Dark by default.** The whole app is a dark-first UI (light mode also works if a laptop happens to be set to light — same layout, same information, inverted surface values, nothing missing).
- **Top bar, always visible:** **TreatNet** wordmark (left), an amber uppercase notice — "SYNTHETIC DATA — NOT FOR CLINICAL USE" (center), and **⟲ Reset** (right, a bordered button, not a floating red pill anymore).
- **Left rail, always visible:** the four demo cases as a vertical list — Breast Cancer, Heart Failure, Type 2 Diabetes, Sparse case. Click any one, from any screen, to load that case and jump straight to its confirmation screen; the active one is highlighted. Below that, a **Treatment landscape** link (see near the bottom of this sheet).
- **Main content** sits inside a visibly distinct panel — subtly lighter than the page background behind it, not floating loose on the page.
- All three of the above persist across every screen, including with a provenance modal open. There is no more per-page demo-button grid or "⚡ instant demo" badge — case selection lives in the rail now.

## Before the booth opens

1. Open the live URL. You should see the shell above with an empty intake screen: "Paste a clinical note," an empty textarea, a disabled Extract button.
2. Click each of the four rail items once, run each all the way to its final screen, and hit Reset after each. This confirms everything is warm before a judge is watching.
3. Between every judge: click **Reset** (top bar, always visible, works from any screen including with a modal open). That's the only reset you need.

---

## The four demo cases

Clicking a rail item drops a real messy clinical note into the textarea and highlights that item. None of the four ever call the live model for extraction — venue wifi and Anthropic's API status can't touch them. The match step still calls the real database, with a 3-second automatic fallback to a cached result if that call is ever slow or fails outright.

Confidence is shown as a **three-segment bar next to a word** — three filled segments reads "high," two reads "medium," one reads "low" — not a colored pill. A low-confidence field also gets a thin amber edge on the left of its row. When a confirmation screen first appears, fields animate in over roughly 800ms, sorted by confidence — low-confidence fields visibly settle last. Case 3 (Diabetes) is the best one to point this out on, since it has two low-confidence fields that land noticeably after the rest.

### 1. Breast Cancer — the "insufficient data" refusal, by cohort size

Click **Breast Cancer** (rail) → **Extract**.

**Confirmation screen, exactly:**
| Field | Value | Confidence |
|---|---|---|
| Condition | Malignant neoplasm of breast | ●●● high |
| Severity (stage) | IV | ●●● high |
| Age | 58 | ●●● high |
| Obs: HER2 receptor status | positive | ●●● high |
| Treatment history | Trastuzumab — no response after ~4 months; discontinued after imaging showed disease progression | ●●● high |

Every bar is fully filled here — say out loud that a shorter bar (plus an amber left edge) would mean the model wasn't sure, and nothing runs until Confirm regardless.

Click **Confirm and run**.

**Results screen, exactly:** "Matched on condition 254837009, severity stage = "IV", age band 50-59. Cohort size: 3." Then the refusal itself: a large, centered, mono **N=3** between two hairline rules, labelled "BELOW MINIMUM COHORT — NO RANKING," with the explanation underneath. No ranked list, no excluded-treatments section. This is the smallest cohort in the whole dataset by design — three synthetic patients, below the N=5 floor.

### 2. Heart Failure — a real ranked result, second domain

Click **Heart Failure** (rail) → **Extract**.

**Confirmation screen, exactly:**
| Field | Value | Confidence |
|---|---|---|
| Condition | Heart failure | ●●● high |
| Severity (ef_band) | reduced | ●●● high |
| Age | 81 | ●●● high |
| Obs: LV ejection fraction | 30% | ●●○ medium |
| Treatment history | Lisinopril — discontinued due to cough and a creatinine increase; switched to another agent, not clearly documented which | ●●○ medium |

The LVEF bar stops at two segments, not three — the note says "EF ~30% on last echo, maybe 2yrs ago, due for repeat," an approximate, possibly-stale number. Good example of confidence tracking how the note actually reads, not just whether a number is present.

Click **Confirm and run**.

**Results screen, exactly:** Cohort size **26**, age band 80+. Hairline-divided ranked rows, small mono rank markers, the response percentage as the large number on the right of each row:
- **01 Furosemide** — **78%** · N=18 · 14/18 improved · 1 adverse event · ●●● Moderate confidence
- **02 Sacubitril-valsartan** — **75%** · N=8 · 6/8 improved · 1 adverse event · ●●○ Low confidence

No "Patient currently on this" badge on either row (the patient's history is Lisinopril, which isn't either ranked drug — correct, no false match). No excluded-treatments section — nothing gates here. The cohort-size number ("26") and every patient-ID chip are clickable, opening a bordered provenance panel (no drop shadow) with that patient's sex, birth date, condition, observations, and treatment/outcome.

### 3. Type 2 Diabetes — a ranked result with an honest "already tried" flag

Click **Type 2 Diabetes** (rail) → **Extract**.

**Confirmation screen, exactly:**
| Field | Value | Confidence |
|---|---|---|
| Condition | Type 2 diabetes mellitus | ●●● high |
| Severity (a1c_band) | severe | ●●● high |
| Age | 64 | ●○○ **low** (amber edge) |
| Obs: Hemoglobin A1c | 9.8% | ●●● high |
| Obs: eGFR (CKD-EPI) | "borderline (no numeric value documented)" | ●○○ **low** (amber edge) |
| Treatment history | Metformin — HbA1c rising (8.4 to 9.8) despite metformin; poor adherence and missed appointments reported | ●●● high |

This is the case to show the reveal animation on: Condition, Severity, A1c, and treatment history settle almost immediately; Age and eGFR — the two low-confidence fields — visibly land last, a few hundred milliseconds behind.

Both amber fields are honest, not sloppy: **age is never stated in this note at all** — 64 is estimated from context. **eGFR has no number in the note** ("eGFR borderline") — the model recorded the ambiguity as text rather than inventing a value. Good talking point if a judge asks about hallucination risk.

Click **Confirm and run**.

**Results screen, exactly:** Cohort size **10**, age band 60-69.
- **01 Metformin** `PATIENT CURRENTLY ON THIS` (an outlined blue tag beside the name, not filled) — **50%** · N=6 · 3/6 improved · 1 adverse event · ●●○ Low confidence. Directly under the stats line: *"This cohort's outcomes reflect a range of adherence levels, not drug efficacy alone — re-trial with adherence support is a legitimate clinical option."*
- **02 Insulin glargine** — **50%** · N=4 · 2/4 improved · 1 adverse event · ● Insufficient data (shown transparently even though it's below the ranking floor, since Metformin's N=6 already clears the cohort as a whole)

The badge and adherence line only appear because the treatment-history text matches "Metformin" exactly and mentions adherence — a client-side display match, not a change to ranking or the underlying numbers. Worth saying explicitly if asked: **the tool doesn't hide or downrank Metformin for the fact that this patient is already on it and not improving — it surfaces that fact next to the number and leaves the judgment call to the clinician.**

While here, try clicking **"View full treatment landscape →"** at the top of the results panel — it jumps to the condition-wide view for Type 2 diabetes (see near the bottom of this sheet).

### 4. Sparse case — the *other* refusal, before a match is ever attempted

Click **Sparse case** (rail) → **Extract**.

**What you should see immediately (no confirmation screen at all):** a large, centered, mono **∅** between two hairline rules, labelled "CANNOT PROCESS THIS NOTE," with the reason underneath: *"No diagnosis, condition, age, or clinically meaningful detail could be identified — the encounter was too brief and no prior records were available."* Below that, text distinguishing this from the other refusal: this fires **before** any match is attempted, because there was nothing to build a case from — not because a cohort turned out to be small.

Same visual family as the N=3 screen (hairline rules, centered hero glyph, uppercase label) but a different glyph and a different meaning — deliberately styled as a sibling, not a lesser cousin, of the cohort refusal.

---

## The two refusal paths, side by side

| | Insufficient extraction (case 4) | Insufficient cohort data (case 1) |
|---|---|---|
| **Where it happens** | At Extract, before any confirmation screen | At Confirm and run, after a real match attempt |
| **What triggers it** | The note doesn't describe one of the three known conditions, or has no usable clinical detail at all | The matched cohort's best-available treatment has fewer than 5 historical patients |
| **What it means** | "There's nothing here to build a case from" | "We tried the match; the data we have is too thin to rank confidently" |
| **Hero glyph** | ∅ | N=3 |
| **Screen label** | "CANNOT PROCESS THIS NOTE" | "BELOW MINIMUM COHORT — NO RANKING" |

Both are real refusals the engine can hit live, not scripted-only — worth stating if a judge pushes on it.

---

## Treatment landscape (bonus, if there's time)

Reachable from the left rail ("Treatment landscape") or from any results screen's "View full treatment landscape →" link. Shows **every** treatment ever recorded for a condition across the whole database — not the tight, severity- and age-matched cohort a confirmed case gets from Confirm and run. Pick a condition (three pills: Heart failure / Malignant neoplasm of breast / Type 2 diabetes mellitus) to get a sortable table — treatment name, cohort size, response rate (a bar whose length is the rate and whose weight reflects cohort size), adverse event rate. Rows below N=5 are dimmed, with a footnote explaining why. There's a reserved, empty "Cost" column in the layout — deliberately not built, since there's no cost or price data anywhere in the schema, and inventing one would break this product's whole claim of never stating a number it can't back.

Good answer if a judge asks "what if I want to see everything, not just my patient's matched cohort" — this is a structurally distinct view, not a variant of the results screen.

---

## If something looks wrong

- **Screen looks stuck or wrong** → click **Reset**, top bar, always there. Don't reload the page (state is easier to reason about than a fresh load mid-conversation with a judge).
- **A live match seems slow** → the four demo cases never wait on anything live for extraction, and the match step automatically falls back to a cached result within 3 seconds if the network stalls or drops outright. You should never actually see a stall on the four demo cases.
- **Someone pastes their own note instead of using the rail** → that's the one path that calls the live model for extraction, so it depends on wifi and Anthropic's API being up. If it errors, a red-accented banner shows the error message — hit Reset and go back to the rail.
- **Don't manually retype or edit a demo note's text** — editing it breaks the pairing with its pre-computed fallback for that run (extraction will then try to call the live model instead of using the cached result).
- **A confidence bar or number doesn't match this sheet** → the underlying notes or seed data may have changed since this was written. Trust the screen, not this sheet, and flag it to fix after the demo.

---

## Why these four, specifically

- **Breast Cancer** — the insufficient-*cohort* refusal, with a real (if tiny) cohort size shown.
- **Heart Failure** — proves the same engine works unmodified on a second condition, with a genuinely ambiguous/stale observation value shown at medium confidence rather than high.
- **Type 2 Diabetes** — a real ranked result carrying two honestly-estimated low-confidence fields, plus the "patient currently on this" flag that keeps the top-ranked drug from reading as an oblivious recommendation.
- **Sparse case** — the insufficient-*extraction* refusal, structurally distinct from the cohort one, proving the system won't force a case out of nothing.
