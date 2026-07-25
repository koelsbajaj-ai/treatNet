# TreatmentNet — Demo Cheat Sheet

One page. Read this before the booth opens, and glance at it between judges if you lose your place. The three demo buttons are all you need — never type a note live at the booth.

## Before the booth opens

1. Open the live URL. You should see: an amber banner across the very top reading **"All data is synthetic and illustrative. Not for clinical use."**, the title **TreatmentNet**, the subtitle **"Evidence surfaced for clinician review, not a prescription."**, and a red **↺ Reset** button in the top-right corner.
2. Click each of the three demo buttons once, run each all the way through to results, and hit Reset after each. This confirms everything is warm and working before a judge is watching.
3. Between every judge: click **↺ Reset** (top-right, always visible, works from any screen including with a modal open). That's the only reset you need — it instantly clears back to a blank intake screen.

---

## The 90-second walkthrough

### 1. Breast Cancer — ranked result + a gate firing (0:00–0:30)

- Click **"Load example: Breast Cancer"** (has a small **⚡ INSTANT DEMO** badge — that's intentional, it's pre-computed so venue wifi can't stall it).
- The messy note text fills the box. Click **Extract**.
- **What you should see:** the confirmation screen appears *instantly*. Condition "Malignant neoplasm of breast", Severity (stage) "II", Age 55, two observations (HER2 receptor status: positive, LV ejection fraction: 42), one treatment history line about Trastuzumab. Every field has a green **high** confidence badge — say out loud that an amber-flagged field would mean the model wasn't sure, and nothing runs until you click confirm regardless.
- Click **Confirm and run**.
- **What you should see:** cohort size 25. Ranked treatments: **#1 Paclitaxel**, N=9, 56% improved, low confidence badge. Below that, in red: **Avoid — Trastuzumab, "Contraindicated with reduced ejection fraction (cardiotoxicity risk)"**.
- Click any patient chip under "Patients:" (e.g. **ONC-017**) — a modal opens showing that exact synthetic patient's real record (condition, observations, the treatment they got, the outcome). Close it (✕ or click outside).

### 2. Heart Failure — same engine, second domain, different gate type (0:30–0:55)

- Click **↺ Reset**, then **"Load example: Heart Failure"**, then **Extract**.
- **What you should see:** Condition "Heart failure", Severity (ef_band) "reduced", Age 65, one observation (LV ejection fraction: 28), one allergy — **"Allergy: Sulfonamides (drug class)"** flagged **amber** with a **medium** badge (this is the one deliberately-imperfect field — point it out: the model wasn't fully certain, so it's flagged for you to check, not silently trusted).
- Click **Confirm and run**.
- **What you should see:** cohort size 26. **#1 Sacubitril-valsartan**, N=8, 75% improved. Avoid: **Furosemide, "Cross-reactive allergy risk with sulfonamide-derived diuretics"**. Same engine, same UI, zero code differences from the oncology run — that's the schema-agnostic breadth claim, live.

### 3. Type 2 Diabetes — the refusal state (0:55–1:20)

- Click **↺ Reset**, then **"Load example: Type 2 Diabetes"**, then **Extract**.
- **What you should see:** Condition "Type 2 diabetes mellitus", Severity (a1c_band) "severe", Age 65, two observations (Hemoglobin A1c: 10.1, eGFR: 22).
- Click **Confirm and run**.
- **What you should see:** cohort size 10, but instead of a ranked list: a gray box that says **"Insufficient data — no recommendation."** Below it, still in red: **Avoid — Metformin, "Contraindicated in severe renal impairment (eGFR < 30)"**. Say out loud: the engine refuses to rank when the sample is too small (N<5) rather than bluff a confident-looking answer — and it still tells you about the gate even when it won't rank.

### 4. Close (1:20–1:30)

- Point at the amber banner (still visible, hasn't moved) and the subtitle. One line: *"Every screen says the same thing — this is evidence for a clinician to weigh, not a prescription."* Gesture at the public GitHub repo if it's on screen.

---

## If something looks wrong

- **Screen looks stuck or wrong** → click **↺ Reset**, top-right, always there. Don't reload the page (state is easier to reason about than a fresh load mid-conversation with a judge).
- **A live extraction/match seems slow** → the three demo buttons never wait on anything live for extraction, and the match step automatically falls back to a cached result within 3 seconds if the network stalls or drops — verified under both a simulated 5-second delay and a simulated outright failure. You should never actually see a stall on the three demo buttons.
- **Someone pastes their own note instead of using a button** → that's the one path that does call the live model, so it depends on wifi and Anthropic's API being up. If it errors, an error message appears in a red banner — hit Reset and go back to the three demo buttons.
- **Don't manually retype or edit the demo note text** — editing it breaks the pairing with the pre-computed fallback for that run (still works, just no longer wifi-proof for that one attempt).

---

## Why these three, specifically

- **Breast Cancer** — the strongest single moment: extraction with confidence badges, a real ranking, and a gate visibly firing with a citation you can click into.
- **Heart Failure** — proves the same engine works unmodified on a second condition, and shows the *other* gate type (allergy, not a lab threshold), plus the one amber/medium-confidence field in the set.
- **Type 2 Diabetes** — the refusal state. This is the answer to "what happens when you don't have enough data" — the engine says so plainly instead of guessing.

## Note on the demo notes themselves

The three notes behind these buttons are placeholders (marked `PLACEHOLDER` in `lib/demoCases.ts`) until the real messy handover-style notes are ready. If they get swapped, the specific numbers and quotes in this cheat sheet (N=9, "56% improved", etc.) will change — rehearse once against whatever's live before using this sheet at the booth.
