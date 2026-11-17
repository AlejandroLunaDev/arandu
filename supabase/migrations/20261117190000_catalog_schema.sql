-- Catalog schema for the profession books (ADR-0004).
-- Only the API and the engine touch these tables, with the service-role key.
-- RLS is on with no policies, so the anon and authenticated roles read nothing.

-- Where every fact comes from. One row per fetched document.
create table public.sources (
  id bigint generated always as identity primary key,
  adapter text not null,                          -- engine adapter that fetches and parses it, e.g. 'inep_census'
  url text not null unique,
  label text not null,                            -- citation shown to the user
  refresh_interval interval not null default interval '7 days',
  last_fetched_at timestamptz,
  last_content_hash text,                         -- unchanged hash: the engine skips parsing
  created_at timestamptz not null default now()
);

-- One row per engine run of one adapter.
create table public.scrape_runs (
  id bigint generated always as identity primary key,
  adapter text not null,
  status text not null default 'running' check (status in ('running', 'succeeded', 'failed')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  rows_written integer check (rows_written >= 0),
  error text
);
create index scrape_runs_adapter_started_at_idx on public.scrape_runs (adapter, started_at desc);

create table public.professions (
  id bigint generated always as identity primary key,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null
);

create table public.institutions (
  id bigint generated always as identity primary key,
  inep_code integer not null unique,               -- INEP CO_IES
  name text not null,
  short_name text,
  kind text not null check (kind in ('public', 'private', 'special')),  -- 'special': INEP category "Especial"
  source_id bigint not null references public.sources (id),
  logo_url text,
  logo_source_url text,
  photo_url text,
  photo_credit text,
  photo_license text,
  photo_source_url text,
  -- A logo or photo is shown only with its full attribution.
  constraint institutions_logo_attributed check ((logo_url is null) = (logo_source_url is null)),
  constraint institutions_photo_attributed check (
    (photo_url is null and photo_credit is null and photo_license is null and photo_source_url is null)
    or (photo_url is not null and photo_credit is not null and photo_license is not null and photo_source_url is not null)
  )
);
create index institutions_source_id_idx on public.institutions (source_id);

create table public.courses (
  id bigint generated always as identity primary key,
  inep_code bigint not null unique,                -- INEP CO_CURSO (the e-MEC course code)
  institution_id bigint not null references public.institutions (id),
  profession_id bigint references public.professions (id),  -- null until the course is mapped to a profession
  name text not null,
  degree text check (degree in ('bacharelado', 'licenciatura', 'tecnologico', 'bacharelado_licenciatura')),
  shift text check (shift in ('matutino', 'vespertino', 'noturno', 'integral')),
  duration_years numeric(3, 1) check (duration_years > 0),
  city text not null,
  campus_name text,
  source_id bigint not null references public.sources (id)
);
create index courses_institution_id_idx on public.courses (institution_id);
create index courses_profession_id_idx on public.courses (profession_id);
create index courses_source_id_idx on public.courses (source_id);

create table public.admission_cutoffs (
  id bigint generated always as identity primary key,
  course_id bigint not null references public.courses (id) on delete cascade,
  route text not null check (route in ('sisu', 'prouni', 'fuvest', 'enem_usp')),
  -- Fuvest phase 1 is 0-90 points; final and first-call scores are 0-1000. Never compare across metrics.
  metric text not null check (metric in ('final_cutoff', 'first_call_min', 'phase1_min')),
  edition_year smallint not null check (edition_year between 2000 and 2100),
  edition_term smallint check (edition_term in (1, 2)),   -- SISU and ProUni run per semester
  call_number smallint check (call_number > 0),           -- Fuvest and ENEM-USP publish one list per chamada
  quota_code text not null,                               -- source code as published, e.g. 'AC', 'LB_PPI'
  quota_label text not null,
  score numeric(6, 2) not null check (score >= 0 and score <= 1000),
  source_id bigint not null references public.sources (id),
  unique nulls not distinct (course_id, route, metric, edition_year, edition_term, call_number, quota_code)
);
create index admission_cutoffs_source_id_idx on public.admission_cutoffs (source_id);

create table public.curriculum_subjects (
  id bigint generated always as identity primary key,
  course_id bigint not null references public.courses (id) on delete cascade,
  year smallint not null check (year between 1 and 7),
  term smallint check (term between 1 and 14),            -- null when the source groups by year only (FIAP)
  name text not null,
  hours numeric(6, 1) check (hours > 0),
  is_elective boolean not null default false,
  source_id bigint not null references public.sources (id),
  unique nulls not distinct (course_id, year, term, name)
);
create index curriculum_subjects_source_id_idx on public.curriculum_subjects (source_id);

alter table public.sources enable row level security;
alter table public.scrape_runs enable row level security;
alter table public.professions enable row level security;
alter table public.institutions enable row level security;
alter table public.courses enable row level security;
alter table public.admission_cutoffs enable row level security;
alter table public.curriculum_subjects enable row level security;
