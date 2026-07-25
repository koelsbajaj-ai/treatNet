# migrations

Stage 2. Versioned `.sql` files that create the 7 FHIR-aligned tables
(patients, conditions, observations, allergy_intolerances, treatments,
treatment_outcomes, treatment_contraindication_rules) in Supabase
Postgres. See PLAN.md section 2 for the exact schema.

Migrations are committed files, run in order, never ad-hoc SQL typed
into the Supabase dashboard — that's what makes the schema
reproducible and lets anyone re-run the same steps later.
