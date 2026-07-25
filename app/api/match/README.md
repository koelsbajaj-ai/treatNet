# app/api/match

Stage 3. One API route (`route.ts`) that takes a confirmed structured
case and returns ranked treatments. Pure TypeScript/SQL — no LLM call
happens here, ever.

Does, in order: filters candidates by condition code, stratifies by
severity band, applies hard contraindication gates from
`treatment_contraindication_rules` (via `lib/gates.ts`), aggregates
outcomes per remaining treatment (N, success rate, adverse events),
computes a confidence tier from N, and refuses to rank
(`insufficient_data: true`) if the best-matched cohort is below the
minimum N. See PLAN.md section 1 for the full rule and section 2 for
the confidence tier thresholds.
