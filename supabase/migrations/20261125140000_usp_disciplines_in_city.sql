-- USP subject pages were seeded by hand (20261118150000 and after) for grades of every unit. A grade outside São Paulo
-- city is no longer registered (ADR-0007), so its subject pages have nothing to link to: they go too.
delete from public.sources d
where d.adapter = 'usp_discipline'
  and not exists (
    select 1 from public.sources g
    where g.adapter = 'usp_curriculum'
      and g.url like '%codcur=' || substring(d.url from 'codcur=(\d+&codhab=\d+)') || '&%'
  );
