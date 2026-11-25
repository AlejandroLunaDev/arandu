-- The product book's opening is one long paragraph (owner, 2026-11-25: hard to read). It becomes three, one per
-- idea: who it is for, the cat, and the core idea. The owner's approved text stays word for word; each paragraph
-- is its own fact, which the web shows as its own paragraph.
do $$
declare
  changed integer;
begin
  update public.story_facts
  set text = 'O Arandu é um app de orientação vocacional para qualquer pessoa no Brasil que esteja diante da escolha de uma carreira universitária: quem está terminando o ensino médio, quem já começou um ou dois cursos e parou, quem trabalha há anos em outra área e quer mudar, quem se aposentou e quer finalmente estudar o que sempre quis.'
  where book = 'produto' and page = 1 and position = 1
    and text = 'O Arandu é um app de orientação vocacional para qualquer pessoa no Brasil que esteja diante da escolha de uma carreira universitária: quem está terminando o ensino médio, quem já começou um ou dois cursos e parou, quem trabalha há anos em outra área e quer mudar, quem se aposentou e quer finalmente estudar o que sempre quis. Em toda a jornada, você tem a companhia do Arandu, um gato preto curioso e honesto, que caminha ao seu lado enquanto você descobre o que combina com você. A ideia central é simples: experimentar um pedaço real de uma carreira antes de escolher. Em vez de só ler sobre uma profissão, você prova como é estudá-la.';
  get diagnostics changed = row_count;
  if changed <> 1 then
    raise exception 'the product book''s opening is not the text this migration splits';
  end if;
end $$;

insert into public.story_facts (book, page, position, figure, text, source_label, source_url, verified_on) values
  ('produto', 1, 2, null,
    'Em toda a jornada, você tem a companhia do Arandu, um gato preto curioso e honesto, que caminha ao seu lado enquanto você descobre o que combina com você.',
    null, null, '2026-11-19'),
  ('produto', 1, 3, null,
    'A ideia central é simples: experimentar um pedaço real de uma carreira antes de escolher. Em vez de só ler sobre uma profissão, você prova como é estudá-la.',
    null, null, '2026-11-19');
