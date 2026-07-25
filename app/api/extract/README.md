# app/api/extract

Stage 4. One API route (`route.ts`) that calls Claude to turn a pasted
free-text clinical note into structured fields (condition, severity,
biomarkers, allergies, treatment history), each tagged `high` / `medium`
/ `low` confidence.

This is the one place in the product where the LLM is allowed to do
something deterministic code can't. Its output is always a draft — it
is rendered back as an editable form and nothing downstream runs until
the clinician confirms or corrects it. See PLAN.md section 1.
