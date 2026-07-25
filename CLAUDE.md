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

**Stage 3 (Deterministic matching + gating engine) — complete.**
`lib/types.ts`, `lib/gates.ts`, `lib/matching.ts`, `lib/database.types.ts`
(generated via `npx supabase gen types typescript --linked`, re-run
whenever the schema changes), and `app/api/match/route.ts` are all
written and type-check clean. `lib/supabase.ts` holds the server-only
Supabase client (service-role key), guarded by `import "server-only"`
so a build fails outright if anything client-side ever imports it —
see the "server-only Supabase client" note below for the full
reasoning. Verified directly (no UI) with 8 requests across all 3
domains: correct ranking + success rates, both contraindication gate
types firing (allergy and observation-threshold), the deliberate N=3
insufficient-data refusal, and one case where a gate exclusion and an
insufficient-data refusal both fire on the same cohort.

Two bugs found and fixed while testing, worth knowing about:
1. **Seed data age-band bug.** The original generator spread each
   cohort's patient ages evenly across a wide range (e.g. 38-72),
   which meant any single age-banded query only ever matched a handful
   of patients — the matching engine's age-band stratification
   fragmented every cohort. Fixed by narrowing each cohort's age range
   to sit inside one age band with a safety margin. If you ever
   regenerate seed data, keep each cohort's ages inside a single band.
2. **`.env.local` had the anon key pasted into `SUPABASE_SERVICE_ROLE_KEY`
   by mistake** — same value in both fields. Since RLS is enabled with
   no policies, that made every query from the "admin" client silently
   return zero rows (Postgres RLS filters rows rather than erroring),
   which looked identical to an empty database. Caught by decoding the
   `role` claim inside each JWT (`anon` vs `service_role`) without ever
   printing the actual key. **Still outstanding:** when the file was
   corrected, the harness's own file-change tracking surfaced the full
   `.env.local` contents (including both raw keys) into the
   conversation despite deliberately routing around that — the user
   was told and should regenerate both Supabase keys in the dashboard
   as hygiene once things are stable.

**Stage 4 (Free-text case intake) — complete.** `app/api/extract`
calls `claude-sonnet-4-6` (server-only client in `lib/anthropic.ts`,
same `import "server-only"` treatment as Supabase) with a forced tool
call (`tool_choice`) rather than `output_config.format`, since
structured outputs aren't listed as supported on Sonnet 4.6. The
system prompt constrains extraction to the exact vocabulary the seed
data uses (3 condition codes, their severity codes/values, 4
observation codes, 2 gate-relevant allergy codes) so free text reliably
maps onto real cohorts instead of drifting into codes nothing matches.
Every field carries `high`/`medium`/`low` confidence.

UI: `components/IntakeForm.tsx` (textarea + 3 demo buttons),
`ConfirmationForm.tsx` (editable fields, confidence badges, amber
ring specifically on `low`-confidence fields — verified visually, not
just in code), `ResultsView.tsx` (ranked/gated/insufficient states).
`app/page.tsx` wires the state machine: intake → confirming → results.
Nothing runs downstream until "Confirm and run" is clicked, per the
non-negotiable rule.

**Demo notes are placeholders** (`lib/demoCases.ts`, search
"PLACEHOLDER") — written by Claude to unblock building and testing;
swap in the teammate's real notes when ready, which also means
regenerating the hand-written `fallbackExtraction`/`fallbackMatch` data
alongside them.

**Demo buttons never call the live model.** Per explicit instruction,
clicking a demo button and then Extract uses `fallbackExtraction`
directly with zero network calls — verified via the browser network
tab. Only a manually pasted note hits live `/api/extract`. Each demo
button shows a small "⚡ instant demo" badge so it reads as a deliberate
wifi-safety feature at the booth, not a broken live call. The match
step (`/api/match`) keeps its original behavior: live call raced
against a 3-second timeout, falling back to the cached match result
only if the demo path is still active and the real call is slow — this
wasn't asked to change and isn't Anthropic-billing-dependent anyway.

Tested end-to-end twice: once with `ANTHROPIC_API_KEY` at zero credit
balance (confirmed clean error surfacing, and confirmed the confirm →
match → results path works against the real Supabase-backed engine by
temporarily hardcoding a test-only stage jump, reverted before
committing — see git history, not present in shipped code), and once
after the instant-demo change (confirmed via network tab: demo path
fires zero `/api/` requests through extraction, manual paste fires a
real one). **Live extraction is still unverified** — the API key had no
credits both times the user tried, including after a top-up that
hadn't propagated yet (or hit a different workspace than the key
belongs to — unconfirmed). User is now waiting on credits to land
overnight. Retest with a real demo note (not the hardcoded-state trick)
the next time this comes up.

**Stage 5 (Results UI polish) — complete**, and it also completes
Stage 8's core function early (user's explicit choice, asked directly
rather than assumed): `app/api/provenance/route.ts` fetches a real
patient record (condition, observations, treatment, outcome) by
`synthetic_ref` from Supabase, and `components/ProvenanceModal.tsx`
renders it. `ResultsView.tsx`'s patient-ref citations are now clickable
chips wired to this — verified in-browser clicking two different
citations and confirming each showed that specific patient's real,
different data (not stale/shared state), plus backdrop-click-to-close.
Ranked rows also got numbered (#1, #2...) for readability.

Next up: whatever's next after Stage 5/8 — check PLAN.md's build order
(Stage 6 narrative layer is explicitly cuttable/lowest-priority; Stage
7 credibility UI banner is partially already done via the layout
banner and results-screen disclaimer text; Stage 9 demo hardening and
Stage 10 README/repo hygiene remain). Ask the user which they want
next rather than assuming, same as every stage boundary so far.
