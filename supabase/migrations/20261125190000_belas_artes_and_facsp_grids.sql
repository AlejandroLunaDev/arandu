-- Two more grid sources (ADR-0008), read from their own pages: Belas Artes's graduação matrizes and FAC-SP's
-- estruturas curriculares, only the pages of São Paulo city units and of distance courses. The URLs are the ones the
-- 2026-11-25 sweep of the institutions' sites found; pages whose blocks are not their terms are left out.
insert into public.sources (adapter, url, label) values
  ('belas_artes_curriculum', 'https://www.belasartes.br/graduacao/matriz-cursos-de-graduacao/administracao-ead/', 'Belas Artes, matriz curricular: Administração'),
  ('belas_artes_curriculum', 'https://www.belasartes.br/graduacao/matriz-cursos-de-graduacao/administracao-phygital/', 'Belas Artes, matriz curricular: Administração'),
  ('belas_artes_curriculum', 'https://www.belasartes.br/graduacao/matriz-cursos-de-graduacao/analise-e-desenvolvimento-de-sistemas-ead/', 'Belas Artes, matriz curricular: Análise e Desenvolvimento de Sistemas'),
  ('belas_artes_curriculum', 'https://www.belasartes.br/graduacao/matriz-cursos-de-graduacao/analise-e-desenvolvimento-de-sistemas/', 'Belas Artes, matriz curricular: Análise e Desenvolvimento de Sistemas'),
  ('belas_artes_curriculum', 'https://www.belasartes.br/graduacao/matriz-cursos-de-graduacao/arquitetura-e-urbanismo/', 'Belas Artes, matriz curricular: Arquitetura e Urbanismo'),
  ('belas_artes_curriculum', 'https://www.belasartes.br/graduacao/matriz-cursos-de-graduacao/artes-cenicas/', 'Belas Artes, matriz curricular: Artes Cênicas'),
  ('belas_artes_curriculum', 'https://www.belasartes.br/graduacao/matriz-cursos-de-graduacao/artes-plasticas/', 'Belas Artes, matriz curricular: Artes Plásticas'),
  ('belas_artes_curriculum', 'https://www.belasartes.br/graduacao/matriz-cursos-de-graduacao/artes-visuais/', 'Belas Artes, matriz curricular: Artes Visuais'),
  ('belas_artes_curriculum', 'https://www.belasartes.br/graduacao/matriz-cursos-de-graduacao/cinema-e-audiovisual/', 'Belas Artes, matriz curricular: Cinema e Audiovisual'),
  ('belas_artes_curriculum', 'https://www.belasartes.br/graduacao/matriz-cursos-de-graduacao/comercio-exterior-ead/', 'Belas Artes, matriz curricular: Comércio Exterior'),
  ('belas_artes_curriculum', 'https://www.belasartes.br/graduacao/matriz-cursos-de-graduacao/comunicacao-digital-semipresencial-paraiso/', 'Belas Artes, matriz curricular: Comunicação Digital'),
  ('belas_artes_curriculum', 'https://www.belasartes.br/graduacao/matriz-cursos-de-graduacao/comunicacao-institucional/', 'Belas Artes, matriz curricular: Comunicação Institucional'),
  ('belas_artes_curriculum', 'https://www.belasartes.br/graduacao/matriz-cursos-de-graduacao/danca/', 'Belas Artes, matriz curricular: Dança'),
  ('belas_artes_curriculum', 'https://www.belasartes.br/graduacao/matriz-cursos-de-graduacao/design-de-animacao/', 'Belas Artes, matriz curricular: Design de Animação'),
  ('belas_artes_curriculum', 'https://www.belasartes.br/graduacao/matriz-cursos-de-graduacao/design-de-games/', 'Belas Artes, matriz curricular: Design de Games'),
  ('belas_artes_curriculum', 'https://www.belasartes.br/graduacao/matriz-cursos-de-graduacao/design-de-interiores-vila-mariana/', 'Belas Artes, matriz curricular: Design de Interiores'),
  ('belas_artes_curriculum', 'https://www.belasartes.br/graduacao/matriz-cursos-de-graduacao/design-de-interiores/', 'Belas Artes, matriz curricular: Design de Interiores'),
  ('belas_artes_curriculum', 'https://www.belasartes.br/graduacao/matriz-cursos-de-graduacao/design-de-moda-vm/', 'Belas Artes, matriz curricular: Design de Moda'),
  ('belas_artes_curriculum', 'https://www.belasartes.br/graduacao/matriz-cursos-de-graduacao/design-de-moda/', 'Belas Artes, matriz curricular: Design de Moda'),
  ('belas_artes_curriculum', 'https://www.belasartes.br/graduacao/matriz-cursos-de-graduacao/design-de-produto/', 'Belas Artes, matriz curricular: Design de Produto'),
  ('belas_artes_curriculum', 'https://www.belasartes.br/graduacao/matriz-cursos-de-graduacao/design-digital-vila-mariana/', 'Belas Artes, matriz curricular: Design Digital'),
  ('belas_artes_curriculum', 'https://www.belasartes.br/graduacao/matriz-cursos-de-graduacao/design-grafico/', 'Belas Artes, matriz curricular: Design Gráfico'),
  ('belas_artes_curriculum', 'https://www.belasartes.br/graduacao/matriz-cursos-de-graduacao/economia-criativa-vila-mariana/', 'Belas Artes, matriz curricular: Economia Criativa'),
  ('belas_artes_curriculum', 'https://www.belasartes.br/graduacao/matriz-cursos-de-graduacao/economia-criativa/', 'Belas Artes, matriz curricular: Economia Criativa'),
  ('belas_artes_curriculum', 'https://www.belasartes.br/graduacao/matriz-cursos-de-graduacao/escrita-criativa-ead/', 'Belas Artes, matriz curricular: Escrita Criativa'),
  ('belas_artes_curriculum', 'https://www.belasartes.br/graduacao/matriz-cursos-de-graduacao/eventos-ead/', 'Belas Artes, matriz curricular: Eventos'),
  ('belas_artes_curriculum', 'https://www.belasartes.br/graduacao/matriz-cursos-de-graduacao/fotografia/', 'Belas Artes, matriz curricular: Fotografia'),
  ('belas_artes_curriculum', 'https://www.belasartes.br/graduacao/matriz-cursos-de-graduacao/gastronomia/', 'Belas Artes, matriz curricular: Gastronomia'),
  ('belas_artes_curriculum', 'https://www.belasartes.br/graduacao/matriz-cursos-de-graduacao/gestao-de-negocios-e-inovacao-ead/', 'Belas Artes, matriz curricular: Gestão de Negócios e Inovação'),
  ('belas_artes_curriculum', 'https://www.belasartes.br/graduacao/matriz-cursos-de-graduacao/gestao-de-negocios-e-inovacao-presencial-paraiso/', 'Belas Artes, matriz curricular: Gestão de Negócios e Inovação'),
  ('belas_artes_curriculum', 'https://www.belasartes.br/graduacao/matriz-cursos-de-graduacao/gestao-de-recursos-humanos-ead/', 'Belas Artes, matriz curricular: Gestão de Recursos Humanos'),
  ('belas_artes_curriculum', 'https://www.belasartes.br/graduacao/matriz-cursos-de-graduacao/historia-semipresencial/', 'Belas Artes, matriz curricular: História'),
  ('belas_artes_curriculum', 'https://www.belasartes.br/graduacao/matriz-cursos-de-graduacao/jogos-digitais-ead/', 'Belas Artes, matriz curricular: Jogos Digitais'),
  ('belas_artes_curriculum', 'https://www.belasartes.br/graduacao/matriz-cursos-de-graduacao/jogos-digitais-phygital/', 'Belas Artes, matriz curricular: Jogos Digitais'),
  ('belas_artes_curriculum', 'https://www.belasartes.br/graduacao/matriz-cursos-de-graduacao/jornalismo-belas-artes-paraiso/', 'Belas Artes, matriz curricular: Jornalismo'),
  ('belas_artes_curriculum', 'https://www.belasartes.br/graduacao/matriz-cursos-de-graduacao/licenciatura-em-artes/', 'Belas Artes, matriz curricular: Licenciatura em Artes'),
  ('belas_artes_curriculum', 'https://www.belasartes.br/graduacao/matriz-cursos-de-graduacao/marketing-batec/', 'Belas Artes, matriz curricular: Marketing – Tecnólogo'),
  ('belas_artes_curriculum', 'https://www.belasartes.br/graduacao/matriz-cursos-de-graduacao/marketing-ead/', 'Belas Artes, matriz curricular: Marketing – Tecnólogo'),
  ('belas_artes_curriculum', 'https://www.belasartes.br/graduacao/matriz-cursos-de-graduacao/marketing/', 'Belas Artes, matriz curricular: Marketing – Bacharelado'),
  ('belas_artes_curriculum', 'https://www.belasartes.br/graduacao/matriz-cursos-de-graduacao/negocios-da-moda-paraiso/', 'Belas Artes, matriz curricular: Negócios da Moda'),
  ('belas_artes_curriculum', 'https://www.belasartes.br/graduacao/matriz-cursos-de-graduacao/processos-gerenciais-ead/', 'Belas Artes, matriz curricular: Processos Gerenciais'),
  ('belas_artes_curriculum', 'https://www.belasartes.br/graduacao/matriz-cursos-de-graduacao/producao-cultural-ead/', 'Belas Artes, matriz curricular: Produção Cultural'),
  ('belas_artes_curriculum', 'https://www.belasartes.br/graduacao/matriz-cursos-de-graduacao/producao-cultural/', 'Belas Artes, matriz curricular: Produção Cultural'),
  ('belas_artes_curriculum', 'https://www.belasartes.br/graduacao/matriz-cursos-de-graduacao/producao-fonografica/', 'Belas Artes, matriz curricular: Produção Fonográfica'),
  ('belas_artes_curriculum', 'https://www.belasartes.br/graduacao/matriz-cursos-de-graduacao/producao-multimidia-ead/', 'Belas Artes, matriz curricular: Produção Multimídia'),
  ('belas_artes_curriculum', 'https://www.belasartes.br/graduacao/matriz-cursos-de-graduacao/producao-multimidia-phygital/', 'Belas Artes, matriz curricular: Produção Multimídia'),
  ('belas_artes_curriculum', 'https://www.belasartes.br/graduacao/matriz-cursos-de-graduacao/producao-publicitaria-ead/', 'Belas Artes, matriz curricular: Produção Publicitária'),
  ('belas_artes_curriculum', 'https://www.belasartes.br/graduacao/matriz-cursos-de-graduacao/producao-publicitaria-phygital/', 'Belas Artes, matriz curricular: Produção Publicitária'),
  ('belas_artes_curriculum', 'https://www.belasartes.br/graduacao/matriz-cursos-de-graduacao/psicologia/', 'Belas Artes, matriz curricular: Psicologia'),
  ('belas_artes_curriculum', 'https://www.belasartes.br/graduacao/matriz-cursos-de-graduacao/publicidade-e-propaganda/', 'Belas Artes, matriz curricular: Publicidade e Propaganda'),
  ('belas_artes_curriculum', 'https://www.belasartes.br/graduacao/matriz-cursos-de-graduacao/radio-tv-e-internet/', 'Belas Artes, matriz curricular: Rádio, TV e Internet'),
  ('belas_artes_curriculum', 'https://www.belasartes.br/graduacao/matriz-cursos-de-graduacao/relacoes-internacionais/', 'Belas Artes, matriz curricular: Relações Internacionais'),
  ('belas_artes_curriculum', 'https://www.belasartes.br/graduacao/matriz-cursos-de-graduacao/relacoes-publicas/', 'Belas Artes, matriz curricular: Relações Públicas'),
  ('facsp_curriculum', 'https://www.facsp.com.br/wp-content/uploads/2020/01/Grade-Curricular_Log%C3%ADstica.pdf', 'FAC-SP, estrutura curricular: Curso Superior De Tecnologia Em Logística'),
  ('facsp_curriculum', 'https://www.facsp.com.br/wp-content/uploads/2020/01/Grade-Curricular_Sistemas-para-Internet.pdf', 'FAC-SP, estrutura curricular: Curso Superior De Tecnologia Em Sistemas Para Internet')
on conflict (url) do nothing;

-- A distance course has no city in the census: a grid of its institution links to it whatever the page's city, and
-- the courses of each modality are ranked apart.
create or replace function staging.curriculum_course_ids(p_source_id bigint, p_city text) returns setof bigint
language sql stable set search_path = '' as $$
  with page as (
    select cc.institution_inep_code, staging.name_key(cc.city) as city,
      case
        when n ~ '^bacharelado em ' or n ~ '(?: - | \()bacharel(?:ado)?\)?(?: - |$)' then 'bacharelado'
        when n ~ '^licenciatura em ' or n ~ '(?: - | \()licenciatura\)?(?: - |$)' then 'licenciatura'
        when n ~ '^(?:curso superior de |tecnologia (?:\(em\)|em) )' or n ~ ' \(tecnologo\)$' then 'tecnologico'
      end as degree,
      staging.loose_key(regexp_replace(regexp_replace(regexp_replace(n,
        '^(?:bacharelado em |licenciatura em |curso superior de (?:tecnologia (?:\(em\)|em) )?|tecnologia (?:\(em\)|em) )',
        ''),
        '(?: - | \()(?:bacharel(?:ado)?|licenciatura|tecnologo)\)?$', ''),
        ' - (?:bacharelado|licenciatura) - ', ' - ')) as k
    from staging.curriculum_courses cc, staging.name_key(cc.name) as n
    where cc.source_id = p_source_id and cc.city = p_city
  ), courses as (
    select c.id, staging.loose_key(c.name) as ck, p.k, c.city is null as distance
    from page p
    join public.institutions i on i.inep_code = p.institution_inep_code
    join public.courses c on c.institution_id = i.id
      and (c.city is null or staging.name_key(c.city) = p.city)
      and (p.degree is null or c.degree = p.degree)
  ), ranked as (
    select id, ck, k, distance,
      case when ck = k then 1 when ck like k || ' %' then 2 when ' ' || k || ' ' like '% ' || ck || ' %' then 3 end as tier
    from courses
  ), best as (
    -- In-person and distance courses are ranked apart: an exact-named distance course does not take an in-person
    -- course's grid away.
    select *, min(tier) over (partition by distance) as top, max(length(ck)) over (partition by distance, tier) as longest
    from ranked where tier is not null
  )
  select id from best
  where tier = top
    and (tier < 3
      or (length(ck) = longest
        and not exists (select 1 from courses o
                        where o.distance = best.distance
                          and staging.shared_words(o.ck, o.k) > array_length(string_to_array(best.ck, ' '), 1))))
$$;


-- Re-link every grid already fetched: distance courses can now receive them.
select staging.normalize_curriculum(source_id) from (select distinct source_id from staging.curriculum_courses) pages;
