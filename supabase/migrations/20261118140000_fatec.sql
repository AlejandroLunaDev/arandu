-- Fatecs (Centro Paula Souza): every unit is its own census institution and publishes its PPCs on its own WordPress
-- site, whose public media API lists them. Each media search and each PDF it lists carries the unit's CO_IES here.
create table staging.fatec_documents (
  source_id bigint primary key references public.sources (id) on delete cascade,
  institution_inep_code integer not null
);

-- The 56 units whose site lists PDFs and that the census has (CPS unit pages, 2026-11-18), each matched to its CO_IES
-- by name and city among the census's public institutions. The census's 'Faculdade de Tecnologia de Piracicaba'
-- 4150 is private (FATEP), not the Fatec 15682. shortcut: units without a census row (Atibaia, Esportes,
-- Ilha Solteira, Itapevi, Olímpia, Porto Ferreira, Rio Claro, Suzano) and sites whose media API lists nothing are
-- left out; add them when the census or the site has them.
with unit (host, inep_code) as (
  values
    ('fatecadamantina.cps.sp.gov.br', 23459), ('www.fatec.edu.br', 35), ('fatecararaquara.cps.sp.gov.br', 22939),
    ('fatecararas.cps.sp.gov.br', 23438), ('fatecassis.cps.sp.gov.br', 19863), ('fatecbarretos.cps.sp.gov.br', 28986),
    ('fatecbarueri.cps.sp.gov.br', 15757), ('fatecbauru.cps.sp.gov.br', 15689), ('fatecbb.cps.sp.gov.br', 19862),
    ('fatecbraganca.cps.sp.gov.br', 5633), ('fateccapaobonito.cps.sp.gov.br', 15704),
    ('fateccarapicuiba.cps.sp.gov.br', 16395), ('fateccatanduva.cps.sp.gov.br', 16410),
    ('fateccotia.cps.sp.gov.br', 19578), ('fatecdiadema.cps.sp.gov.br', 18099), ('fatecgarca.cps.sp.gov.br', 4021),
    ('fatecguarulhos.cps.sp.gov.br', 15752), ('fatecipiranga.cps.sp.gov.br', 15746),
    ('fatecitapetininga.cps.sp.gov.br', 15693), ('fatecitapira.cps.sp.gov.br', 19864),
    ('fatecitaqua.cps.sp.gov.br', 15639), ('fatecitaquera.cps.sp.gov.br', 17977),
    ('fatecdeitatiba.cps.sp.gov.br', 22319), ('fatecitu.cps.sp.gov.br', 15695), ('fatecjahu.edu.br', 37),
    ('fatecmarilia.cps.sp.gov.br', 15784), ('fatecmatao.cps.sp.gov.br', 24672), ('www.fatecmaua.com.br', 4023),
    ('fatecmococa.cps.sp.gov.br', 4024), ('fatecmm.cps.sp.gov.br', 15714), ('fatecosasco.cps.sp.gov.br', 15709),
    ('fatecourinhos.cps.sp.gov.br', 1874), ('fatecpindamonhangaba.cps.sp.gov.br', 15687),
    ('fatecpiracicaba.cps.sp.gov.br', 15682), ('fatecpg.cps.sp.gov.br', 4926), ('fatecpp.cps.sp.gov.br', 5627),
    ('fatecregistro.cps.sp.gov.br', 28985), ('fatecrp.cps.sp.gov.br', 21713), ('fatecsdp.cps.sp.gov.br', 20478),
    ('fatecsantoandre.cps.sp.gov.br', 15585), ('fatecsbc.cps.sp.gov.br', 5099), ('fatecsaocarlos.cps.sp.gov.br', 19500),
    ('fatecriopreto.cps.sp.gov.br', 4025), ('fatecsaoroque.cps.sp.gov.br', 18817),
    ('fatecsaosebastiao.cps.sp.gov.br', 15793), ('fatecsebrae.cps.sp.gov.br', 19501),
    ('fatecsertaozinho.cps.sp.gov.br', 15696), ('fatecsorocaba.cps.sp.gov.br', 33), ('fatecsumare.cps.sp.gov.br', 23867),
    ('fatectatuape.cps.sp.gov.br', 17942), ('fatectatui.cps.sp.gov.br', 15803), ('fatectaubate.cps.sp.gov.br', 18049),
    ('fatecvotorantim.cps.sp.gov.br', 28988), ('fateczl.cps.sp.gov.br', 4026), ('www.fateczonasul.edu.br', 15688),
    ('fatecferraz.cps.sp.gov.br', 23700)
), seeded as (
  insert into public.sources (adapter, url, label, refresh_interval)
  select 'fatec_media',
    'https://' || host || '/wp-json/wp/v2/media?mime_type=application/pdf&per_page=100&_fields=source_url&search=' || term,
    'Fatec ' || host || ', PDFs: ' || term, interval '1 year'
  from unit cross join unnest(array['PPC', 'grade', 'matriz']) as term
  returning id, url
)
insert into staging.fatec_documents (source_id, institution_inep_code)
select seeded.id, unit.inep_code from seeded join unit on seeded.url like 'https://' || unit.host || '/%';
