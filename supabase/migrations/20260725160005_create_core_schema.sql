-- TreatmentNet core schema — FHIR-resource-aligned, condition-agnostic.
-- See PLAN.md section 2 for the schema design rationale and worked examples.
-- Codes (SNOMED/LOINC/RxNorm) are illustrative for demo realism, not
-- clinically verified.

create extension if not exists pgcrypto;

create table patients (
  id            uuid primary key default gen_random_uuid(),
  synthetic_ref text not null unique,
  birth_date    date not null,
  sex           text not null check (sex in ('male', 'female', 'other')),
  created_at    timestamptz not null default now()
);

create table conditions (
  id              uuid primary key default gen_random_uuid(),
  patient_id      uuid not null references patients(id) on delete cascade,
  code_system     text not null,
  code            text not null,
  display         text not null,
  clinical_status text not null check (clinical_status in ('active', 'resolved', 'remission')),
  onset_date      date
);

create table observations (
  id                 uuid primary key default gen_random_uuid(),
  patient_id         uuid not null references patients(id) on delete cascade,
  condition_id       uuid references conditions(id) on delete set null,
  code_system        text not null,
  code               text not null,
  display            text not null,
  value_quantity     numeric,
  value_text         text,
  unit               text,
  effective_datetime timestamptz not null
);

create table allergy_intolerances (
  id            uuid primary key default gen_random_uuid(),
  patient_id    uuid not null references patients(id) on delete cascade,
  code_system   text not null,
  code          text not null,
  display       text not null,
  criticality   text not null check (criticality in ('low', 'high', 'unable-to-assess')),
  reaction_text text
);

create table treatments (
  id           uuid primary key default gen_random_uuid(),
  patient_id   uuid not null references patients(id) on delete cascade,
  condition_id uuid not null references conditions(id) on delete cascade,
  type         text not null check (type in ('medication', 'procedure')),
  code_system  text not null,
  code         text not null,
  display      text not null,
  start_date   date not null,
  end_date     date,
  status       text not null check (status in ('active', 'completed', 'stopped'))
);

create table treatment_outcomes (
  id            uuid primary key default gen_random_uuid(),
  treatment_id  uuid not null references treatments(id) on delete cascade,
  outcome_code  text not null check (outcome_code in ('improved', 'no_response', 'adverse_event', 'discontinued_toxicity', 'discontinued_other')),
  outcome_date  date not null,
  notes         text
);

-- Deterministic gate source, human-readable. Matched against treatments.code
-- by lib/gates.ts — never fuzzy-matched, never left to the LLM.
create table treatment_contraindication_rules (
  id              uuid primary key default gen_random_uuid(),
  treatment_code  text not null,
  rule_type       text not null check (rule_type in ('allergy', 'observation_threshold')),
  parameter_code  text not null,
  operator        text check (operator in ('<', '<=', '>', '>=')),
  threshold_value numeric,
  reason          text not null
);

-- Indexes for the matching engine's lookup patterns (condition code filter,
-- severity/observation lookup, gate lookup by treatment code).
create index idx_conditions_patient_id on conditions(patient_id);
create index idx_conditions_code on conditions(code);
create index idx_observations_patient_id on observations(patient_id);
create index idx_observations_condition_id on observations(condition_id);
create index idx_observations_code on observations(code);
create index idx_allergy_intolerances_patient_id on allergy_intolerances(patient_id);
create index idx_treatments_patient_id on treatments(patient_id);
create index idx_treatments_condition_id on treatments(condition_id);
create index idx_treatments_code on treatments(code);
create index idx_treatment_outcomes_treatment_id on treatment_outcomes(treatment_id);
create index idx_contraindication_rules_treatment_code on treatment_contraindication_rules(treatment_code);

-- All access goes through server-side API routes using the service-role key,
-- which bypasses RLS. Enabling RLS with no policies means the anon key
-- (the one that could ever reach the browser) cannot read or write any
-- of this data, even by mistake.
alter table patients enable row level security;
alter table conditions enable row level security;
alter table observations enable row level security;
alter table allergy_intolerances enable row level security;
alter table treatments enable row level security;
alter table treatment_outcomes enable row level security;
alter table treatment_contraindication_rules enable row level security;
