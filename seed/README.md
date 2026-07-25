# seed

Stage 2. Committed `.sql`/`.json` seed data for all three domains
(Oncology, Type 2 Diabetes, Heart Failure) — generated once, checked
in as static files, and loaded into Supabase. Never regenerated live,
so loading the database never depends on a live LLM call succeeding.

Includes at least one deliberately tiny cohort (N < 5) so the
"insufficient data" refusal state has something real to demo. See
PLAN.md section 3.
