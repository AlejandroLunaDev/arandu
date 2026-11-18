-- Plan step 3.2, from the first live run: pages and the census write the same course in different forms.
-- USP 'Química - Habilitação: Tecnológica - Ênfase: Alimentos' is census 'Química - Habilitação Tecnológica - Ênfase
-- Em Alimentos'; 'X - Habilitação em Y' is 'X Com Habilitação Em Y'. The degree also sits mid-name
-- ('Letras - Bacharelado - Habilitação: Árabe') or as '(Tecnólogo)' (Mackenzie). When no census name matches
-- exactly, a looser key compares only the content words. It still links only a unique match.

-- name_key without punctuation and the joining words com, em, de, do, da, dos, das, e.
create function staging.loose_key(p_name text) returns text
language sql immutable set search_path = '' as $$
  select btrim(regexp_replace(
    regexp_replace(regexp_replace(staging.name_key(p_name), '[-:,()]', ' ', 'g'), '\m(?:com|em|de|do|da|dos|das|e)\M', ' ', 'g'),
    '\s+', ' ', 'g'))
$$;

create or replace function staging.curriculum_course_ids(p_source_id bigint, p_city text) returns setof bigint
language sql stable set search_path = '' as $$
  with me as (
    select cc.institution_inep_code, staging.name_key(cc.city) as city, staging.name_key(cc.name) as name,
      staging.name_key(coalesce(cc.shift, '')) as shift, cc.every_unit
    from staging.curriculum_courses cc
    where cc.source_id = p_source_id and cc.city = p_city
  ), twins as (
    select other.source_id, staging.curriculum_fingerprint(other.source_id) as fingerprint
    from staging.curriculum_courses other
    join me on other.institution_inep_code = me.institution_inep_code
      and staging.name_key(other.city) = me.city and staging.name_key(other.name) = me.name
      and staging.name_key(coalesce(other.shift, '')) = me.shift
  ), staged as (
    select me.*, (select count(*) from twins) as twin_count
    from me
    where (select count(*) from twins) = 1
      or (p_source_id = (select min(source_id) from twins)
        and (select count(*) from twins where fingerprint is null) = 0
        and (select count(distinct fingerprint) from twins) = 1)
  ), page as (
    select
      institution_inep_code,
      city,
      case
        when name ~ '^bacharelado em ' or name ~ '(?: - | \()bacharel(?:ado)?\)?(?: - |$)' then 'bacharelado'
        when name ~ '^licenciatura em ' or name ~ '(?: - | \()licenciatura\)?(?: - |$)' then 'licenciatura'
        when name ~ '^(?:curso superior de |tecnologia (?:\(em\)|em) )' or name ~ ' \(tecnologo\)$' then 'tecnologico'
      end as degree,
      regexp_replace(regexp_replace(regexp_replace(name,
        '^(?:bacharelado em |licenciatura em |curso superior de (?:tecnologia (?:\(em\)|em) )?|tecnologia (?:\(em\)|em) )',
        ''),
        '(?: - | \()(?:bacharel(?:ado)?|licenciatura|tecnologo)\)?$', ''),
        ' - (?:bacharelado|licenciatura) - ', ' - ') as name,
      every_unit,
      twin_count
    from staged
  ), candidates as (
    select c.id, staging.name_key(c.name) = p.name as exact
    from page p
    join public.institutions i on i.inep_code = p.institution_inep_code
    join public.courses c on c.institution_id = i.id
      and staging.name_key(c.city) = p.city
      and staging.loose_key(c.name) = staging.loose_key(p.name)
      and (p.degree is null or c.degree = p.degree)
  ), matches as (
    select id from candidates where exact or not exists (select 1 from candidates where exact)
  )
  select id from matches
  where (select count(*) from matches) = 1
    or (select every_unit from page)
    or ((select twin_count from page) > 1 and (select count(*) from matches) <= (select twin_count from page))
$$;

revoke execute on function staging.loose_key(text) from public, anon, authenticated;
