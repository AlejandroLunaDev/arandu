-- ADR-0004 review: ProUni publishes cut-offs per scholarship type, and a logo needs its licence.

-- A ProUni cut-off is for an integral or a partial scholarship; other routes have none.
alter table public.admission_cutoffs
  add column scholarship text check (scholarship in ('integral', 'parcial')),
  add constraint admission_cutoffs_scholarship_prouni_only check ((route = 'prouni') = (scholarship is not null));

-- The scholarship type is part of what makes a cut-off unique.
alter table public.admission_cutoffs
  drop constraint admission_cutoffs_course_id_route_metric_edition_year_editi_key,
  add constraint admission_cutoffs_unique unique nulls not distinct
    (course_id, route, metric, edition_year, edition_term, call_number, scholarship, quota_code);

-- A logo is shown only with its licence and source.
alter table public.institutions
  add column logo_license text,
  drop constraint institutions_logo_attributed,
  add constraint institutions_logo_attributed check (
    (logo_url is null and logo_license is null and logo_source_url is null)
    or (logo_url is not null and logo_license is not null and logo_source_url is not null)
  );
