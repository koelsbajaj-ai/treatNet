-- Clears all seed data so 001-004 can be reloaded from a clean slate.
-- Safe to re-run any time — this only ever touches the synthetic seed
-- tables, never the schema itself.
truncate table
  patients,
  conditions,
  observations,
  allergy_intolerances,
  treatments,
  treatment_outcomes,
  treatment_contraindication_rules
cascade;
