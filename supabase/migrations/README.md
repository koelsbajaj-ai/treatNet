# supabase/migrations

Versioned `.sql` files that create the 7 FHIR-aligned tables (patients,
conditions, observations, allergy_intolerances, treatments,
treatment_outcomes, treatment_contraindication_rules) in Supabase
Postgres. See PLAN.md section 2 for the exact schema.

This lives under `supabase/` rather than a top-level `migrations/`
folder because that's the path the Supabase CLI's `db push` /
`migration list` commands require — not a PLAN.md deviation, just the
tool's convention.

Applied with `npx supabase db push` against the linked project. Check
what's applied with `npx supabase migration list` — `local` and
`remote` columns should match.
