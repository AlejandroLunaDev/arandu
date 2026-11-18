begin;
create extension if not exists pgtap with schema extensions;
select plan(5);

select has_table('staging', 'fatec_documents', 'the Fatec documents table exists');
select is((select count(*)::int from sources where adapter = 'fatec_media'), 168, '56 hosts x PPC/grade/matriz media searches are seeded');
select is((select count(*)::int from sources s where s.adapter = 'fatec_media'
  and not exists (select 1 from staging.fatec_documents d where d.source_id = s.id)), 0, 'every media search carries its CO_IES');
select is((select count(*)::int from staging.fatec_documents where institution_inep_code = 15682), 3, 'Fatec Piracicaba (15682) has its three searches');
select is((select count(*)::int from staging.fatec_documents where institution_inep_code = 4150), 0, 'the private FATEP (4150) is not a Fatec');

select * from finish();
rollback;
