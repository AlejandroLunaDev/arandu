begin;
create extension if not exists pgtap with schema extensions;
select plan(4);

select is((select count(*)::int from public.sources where adapter = 'usp_discipline'), 54, 'seeds 54 usp_discipline sources');
select is((select count(*)::int from public.sources where adapter = 'usp_discipline' and url not like '%sgldis=%'), 0, 'every url names its subject (sgldis)');
select is((select count(*)::int from public.sources where adapter = 'usp_discipline' and url not like '%codcur=%'), 0, 'every url names its course (codcur)');
select is((select count(*)::int from public.sources where adapter = 'usp_discipline' and url not like '%codhab=%'), 0, 'every url names its habilitation (codhab)');

select * from finish();
rollback;
