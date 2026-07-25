# seed

Committed seed data for all three domains, generated once by a script
that is deliberately *not* committed (see below), and loaded into
Supabase via `supabase db query --linked --file <path>`. Never
regenerated live, so loading the database never depends on a live LLM
call succeeding.

- `001_seed_contraindication_rules.sql` — 4 gate rules (2 allergy-type,
  2 observation-threshold-type) spanning oncology, T2D, and heart
  failure, so `lib/gates.ts` has real cross-domain cases to test.
- `002_seed_oncology.sql` — 39 breast cancer patients across stages
  II/III/IV. Stage IV is a deliberately tiny cohort (N=3) for the
  "insufficient data" refusal demo.
- `003_seed_type2_diabetes.sql` — 42 patients across two HbA1c control
  bands.
- `004_seed_heart_failure.sql` — 35 patients across reduced/preserved
  ejection fraction bands.

Run in filename order (001 before 002, etc.) — `treatments` and
`treatment_outcomes` reference `patients`/`conditions` created earlier
in the same file, but the rules file has no such dependency and can
run any time after the schema migration.

Row counts as loaded: 116 patients, 116 conditions, 235 observations,
3 allergy_intolerances, 116 treatments, 116 treatment_outcomes, 4
treatment_contraindication_rules. Verify anytime with a `count(*)`
query per table — see PLAN.md's Stage 2 checkpoint.
