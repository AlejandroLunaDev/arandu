-- ADR-0008: nothing already stored is fetched again, and nothing is fetched that cannot add content. Every fetch costs
-- a scraper credit.

-- UNIP's grids state no term (none of the 1985 subjects staged from them has one), so its unit and grid pages not
-- fetched yet add nothing; these five Ânima course pages are gone from their sites. Their staged course rows go with
-- them (on delete cascade).
delete from public.sources
where last_fetched_at is null
  and (adapter in ('unip_units', 'unip_curriculum')
    or url in (
      'https://www.usjt.br/cursos/graduacao/matematica-licenciatura/',
      'https://portal.anhembi.br/cursos/graduacao/comunicacao-social-jornalismo-bacharelado/',
      'https://portal.anhembi.br/cursos/graduacao/comunicacao-social-publicidade-e-propaganda-bacharelado/',
      'https://portal.anhembi.br/cursos/graduacao/fotografia-graduacao-tecnologica/',
      'https://portal.anhembi.br/cursos/graduacao/producao-audiovisual-graduacao-tecnologica/'));

-- A fetched source is never due again: refetching stored pages every 7 days was a full reload. A source that failed
-- stays due (last_fetched_at null) until it is read.
alter table public.sources alter column refresh_interval set default 'infinity';
update public.sources set refresh_interval = 'infinity' where refresh_interval <> 'infinity';
