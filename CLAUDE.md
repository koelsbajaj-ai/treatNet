@AGENTS.md

# TreatmentNet

TreatmentNet surfaces cohort-based treatment outcomes from synthetic patient
records for clinician review — it ranks, it never prescribes.

Full architecture, schema, and stage-by-stage build order live in
`PLAN.md`. This file is the quick-context layer: how to work with the
user, and the rules that must never be broken regardless of stage.

## Working with this user: they are not a coder

The person you're working with does not write or read code. Every session
must be usable by someone who cannot diagnose an error themselves. Concretely:

- **Explain every command before running it** — what it does, in plain
  language, not just what flags it has.
- **State what success looks like** after running it — the exact output or
  behavior that means "this worked," so they can confirm without guessing.
- **Give one command at a time** when they need to run something themselves.
  Never hand over a multi-step sequence and assume they'll execute it
  correctly or notice which step failed.
- **Never assume they can self-diagnose an error.** If something breaks,
  explain what broke and what you're doing about it — don't say "you'll need
  to fix X" and stop there.
- Treat silence or "it doesn't look right" as a signal to investigate, not a
  cue to ask them to debug.

## Non-negotiable architecture rules

These hold at every stage, no exceptions, no matter how much time pressure
there is close to the demo:

- **Cohort matching, statistics, and ranking are deterministic TypeScript
  (and SQL), never delegated to the LLM.** Same case + same DB state must
  always produce the same result. Lives in `lib/matching.ts`, `lib/gates.ts`,
  and `app/api/match`.
- **The LLM is used only for two narrow things:** (1) free-text extraction —
  turning a pasted clinical note into structured fields, and (2) narrating
  an already-computed result in plain language, numbers-locked to what the
  deterministic layer produced. It never touches the database, never gates,
  never ranks.
- **Extracted fields always require human confirmation before anything
  downstream runs.** Every field the LLM extracts carries a confidence level
  (`high`/`medium`/`low`); low-confidence fields are visually flagged; the
  matching engine never runs on unconfirmed extraction output.
- **The engine refuses to rank below the minimum cohort size.** N < 5 means
  `insufficient_data: true` and no ranking — not a low-confidence ranking,
  no ranking at all. This refusal is a feature, not a bug to work around.
- **All data is synthetic and must be labelled as such in the UI.** A
  persistent, non-dismissable banner stating the data is synthetic and this
  is a retrospective association, not a randomized comparison, must appear
  on every results screen.

See `PLAN.md` section 1 for the full reasoning behind each rule.

## Repo conventions

- **Commit after every working change**, with a descriptive message
  explaining why, not just what.
- **Secrets live only in `.env.local`.** Never `.env.example` — that file
  holds placeholders only and is the one env file that's safe to commit.
- Follow `PLAN.md`'s folder structure and stage boundaries exactly. If
  something is ambiguous, ask before guessing.

## Current status

**Stage 1 (Empty app live) — complete.** Next.js app scaffolded
(TypeScript, Tailwind, App Router), folder structure per PLAN.md,
`.env.example` / `.gitignore` in place, homepage is the smoke-test
placeholder (title, subtitle, synthetic-data banner). Pushed to
https://github.com/koelsbajaj-ai/treatNet (public). User connected
Vercel and added `ANTHROPIC_API_KEY` there. Note: Stage 1's "DB:
connected" health check still isn't built — that's a small addition
for later, not blocking anything.

**Stage 2 (Schema + seed data) — complete.** Supabase CLI linked to
the live project (`jbifrxdcmjiprsxjutmk`, the one Vercel's integration
created — there's a second, unused Supabase project on the account,
`ecmrhezqjohywdjjeqii`, don't seed data into that one by mistake).
Migration `supabase/migrations/20260725160005_create_core_schema.sql`
creates all 7 tables with CHECK constraints on enumerated fields and
RLS enabled (no policies — locks out the anon key entirely, service-
role key bypasses it). Seed data for all 3 domains loaded via
`supabase db query --linked --file seed/<file>.sql`: 116 patients, 116
conditions, 235 observations, 3 allergies, 116 treatments, 116
outcomes, 4 contraindication rules (see `seed/README.md` for the
breakdown). Oncology stage IV is the deliberately tiny cohort (N=3) for
the insufficient-data demo. Seed SQL was produced by a one-off
generator script that was intentionally NOT committed (per PLAN.md:
only the static output is committed, never regenerated live).

Next up: Stage 3 (deterministic matching + gating engine — `lib/types.ts`,
`lib/matching.ts`, `lib/gates.ts`, `app/api/match`).
