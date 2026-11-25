-- A subject's chapters are its topics (ADR-0008), and 961 disciplines store their whole ementa as one topic, so each
-- would be a one-chapter book (content-and-exercises session, owner OK 2026-11-25). The engine now splits such an ementa
-- with engine.curricula.split_topics: one topic per idea in its order, numbered items whole, PDF page furniture and pieces
-- that are no topic dropped. This back-fills the rows already stored with that same function, so no page is fetched
-- again. Each row changes only while it still holds the ementa this was generated from (its md5) and has no chapter made.
-- Disciplines that already list several topics are left as they are.

update public.disciplines set topics = array['Discurso matemático: leitura e escrita matemática', 'Estratégias de demonstrações', 'Princípio da indução finita', 'Sequências, somas, recorrências e contagem', 'Algoritmo de Euclides', 'Divisibilidade nos inteiros', 'Sistemas de numeração', 'MDC e MMC', 'Teorema de Bézout', 'Teorema fundamental da aritmética', 'Congruências', 'O anel dos inteiros módulo m', 'Os corpos Zp', 'Relações de equivalência, conjunto quociente, definição de funções e operações no conjunto quociente', 'Ordem, fecho transitivo de relações', 'Conjuntos infinitos']::text[]
where id = 20 and cardinality(topics) = 1 and md5(topics[1]) = '08d66ae8dbef1739aca578ca5d5e8ce4'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 20);

update public.disciplines set topics = array['Breve história da computação', 'Noções de organização e funcionamento de computadores e programas', 'Conceitos de linguagens de programação; 3.1 Entrada e saída; 3.2 Comandos de atribuição, seleção e repetição; 3.3 Expressões aritméticas, lógica e relacionais; 3.4 Tipos de dados escalares e estruturados', 'Modularização de programas: 4.1 Funções e procedimentos; 4.2 Passagem de parâmetros; 4.3 Escopo de identificadores', 'Prática de programação por meio de resolução de problemas, desenvolvimento de algoritmos, e teste e depuração de programas']::text[]
where id = 21 and cardinality(topics) = 1 and md5(topics[1]) = '2454dad62e97e06647d1e2a53dc7a35b'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 21);

update public.disciplines set topics = array['Noções de organização de computadores, modelo de von Neumann, linguagens, interpretação e compilação, representação interna dos dados', 'Resolução de problemas e desenvolvimento de algoritmos, análise de problemas, estratégias de solução, representação e documentação', 'Tipos de dados: escalares, arranjos, matrizes, cadeias de caracteres', 'Passagem de parâmetros', 'Linguagem de programação e transcrição de algoritmos', 'Introdução a uma linguagem imperativa', 'Depuração (debugger) e documentação de programas', 'Testes unitários', 'Introdução a algoritmos de busca e ordenação', 'Manipulação de referências']::text[]
where id = 22 and cardinality(topics) = 1 and md5(topics[1]) = 'fdde706e09a7146e4d8a35052b232beb'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 22);

update public.disciplines set topics = array['Conceitos básicos de SI', 'Tipos de SI', 'Uso de SI em diferentes tipos de organização e na sociedade', 'Sistemas corporativos (CRM, SCM, ERP etc.)', 'Integração de SI', 'Processos de negócio', 'Tomada de decisão apoiada por SI', 'Inteligência de negócios', 'Negócios eletrônicos e comércio eletrônico', 'Infraestrutura de TI', 'Segurança da informação', 'Gestão do conhecimento', 'Questões éticas e sociais', 'Mercado de trabalho', 'Visão geral da estrutura curricular e das disciplinas do curso de SI', 'Áreas de pesquisa correlatas a SI']::text[]
where id = 23 and cardinality(topics) = 1 and md5(topics[1]) = 'aae3b21ada60e7bb709cf5392455b91f'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 23);

update public.disciplines set topics = array['As Leis de Newton', 'Forças fundamentais da Natureza e forças derivadas', 'Trabalho, energia, momento linear e momento angular', 'Leis de conservação e simetrias na Natureza', 'A Lei Universal da Gravitação e a descrição dos movimentos dos planeas', 'As leis de Kepler', 'Relação entre a LGU e o peso dos corpos na Terra']::text[]
where id = 39 and cardinality(topics) = 1 and md5(topics[1]) = 'a569852eeedf4e4816fd4b0e09f3b673'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 39);

update public.disciplines set topics = array['Cenários de prática profissional (hospital, restaurante, unidade básica de saúde, indústria de alimentos, secretarias municipais e estaduais, entre outros', 'Áreas de atuação do nutricionista', 'Regulamentação da profissão', 'Associações profissionais', 'Histórico da Nutrição enquanto campo científico', 'Segurança alimentar e nutricional e direito humano à alimentação adequada e saudável']::text[]
where id = 50 and cardinality(topics) = 1 and md5(topics[1]) = '8735b72ad0cbd4f0b701f62445f7d703'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 50);

update public.disciplines set topics = array['Natureza mecânica do som e princípios de ondulatória', 'Conceitos básicos de acústica, fase e propagação sonora', 'Sistema auditivo', 'Parâmetros subjetivos: altura', 'Batimentos e Banda Crítica', 'Fundamental ausente, sons de diferença, harmônicos aurais', 'Parâmetros Subjetivos: volume', 'Curvas de audibilidade e percepção de volume', 'Introdução ao conceito de timbre']::text[]
where id = 72 and cardinality(topics) = 1 and md5(topics[1]) = '1306bfc90c38d2f6c0c9adb9449568a9'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 72);

update public.disciplines set topics = array['Definições de ciência em diferentes meios: livros didáticos, dicionários, páginas eletrônicas etc', 'O processo de construção do conhecimento científico', 'As linguagens utilizadas pelas ciências', 'Diferentes concepções de educação', 'Letramento Científico: Características e Definições Atuais', 'Gêneros Textuais', 'Processos de Construção de Textos', 'Coerência e Coesão Textuais', 'Aspectos Gerais da Linguística da Língua Portuguesa', 'Formas de Divulgação Científica', 'Textos Jornalísticos de Ciências', 'Revistas de Divulgação Científica', 'Livros Científicos para o Público Geral', 'Ciência e Literatura', 'Ficção Científica']::text[]
where id = 79 and cardinality(topics) = 1 and md5(topics[1]) = 'f7f4b70095852f7ce9e054bbabea4380'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 79);

update public.disciplines set topics = array['A antropologia como saber acadêmico', 'Formação de uma literatura sobre a diversidade cultural', 'Evolucionismo Social e as noções de evolução, raça e progresso', 'As críticas ao evolucionismo', 'Escola Sociológica Francesa e as representações coletivas', 'Introdução ao método etnográfico, Possibilidades de articulação entre conceitos antropológicos e práticas educativas voltadas à diversidade cultural e à equidade no contexto escolar']::text[]
where id = 118 and cardinality(topics) = 1 and md5(topics[1]) = '961e4149a5fe73a5412f5b8099bc261d'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 118);

update public.disciplines set topics = array['Aplicação prática da expressividade ao falar em público, com direcionamento acadêmico e empresarial', 'Desenvolvimento de textos corporativos e científicos', 'Leitura crítica e interpretativa', 'Elaboração de textos, permeados pela clareza, intencionalidade, coesão e coerência', 'Orientação para emprego da ABNT em produções científicas']::text[]
where id = 120 and cardinality(topics) = 1 and md5(topics[1]) = '80d10017b003e8cc18d1b2986c1a02b6'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 120);

update public.disciplines set topics = array['Estudo dos principais conceitos da matemática básica', 'Operações com números reais', 'Porcentagem', 'Equações e inequações', 'Noções das funções do 1º e 2º grau', 'Estudo das funções de Receita, Custo e Lucro']::text[]
where id = 121 and cardinality(topics) = 1 and md5(topics[1]) = 'ce09a6c77ea5e763b3652881a5a8e006'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 121);

update public.disciplines set topics = array['Desenvolvimento de planilhas eletrônicas para a produção de relatórios técnicos, análise de informações e tomada de decisão', 'Estudo de noções de lógica de programação para a elaboração de macros', 'Integração do Excel com outras plataformas e estruturação de banco de dados']::text[]
where id = 122 and cardinality(topics) = 1 and md5(topics[1]) = '55949b79953f53eb89cbd6865ad2646b'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 122);

update public.disciplines set topics = array['Estudo sobre o que é marketing e como ele pode ser utilizado para geração de valor para o cliente e para a empresa', 'Investigação sobre seus principais conceitos: satisfação, valor, fidelidade, comportamento do consumidor, comportamento do comprador organizacional e marketing estratégico, incluindo segmentação e posicionamento']::text[]
where id = 123 and cardinality(topics) = 1 and md5(topics[1]) = '82b8bda967b954bee4826d3eebd6111e'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 123);

update public.disciplines set topics = array['Aplicação prática da expressividade ao falar em público, com direcionamento acadêmico e empresarial', 'Desenvolvimento de textos corporativos e científicos', 'Leitura crítica e interpretativa', 'Elaboração de textos, permeados pela clareza, intencionalidade, coesão e coerência', 'Orientação para emprego da ABNT em produções científicas']::text[]
where id = 124 and cardinality(topics) = 1 and md5(topics[1]) = '80d10017b003e8cc18d1b2986c1a02b6'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 124);

update public.disciplines set topics = array['Desenvolvimento de planilhas eletrônicas para a produção de relatórios técnicos, análise de informações e tomada de decisão', 'Estudo de noções de lógica de programação para a elaboração de macros', 'Integração do Excel com outras plataformas e estruturação de banco de dados']::text[]
where id = 125 and cardinality(topics) = 1 and md5(topics[1]) = '55949b79953f53eb89cbd6865ad2646b'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 125);

update public.disciplines set topics = array['Estudo sobre o que é marketing e como ele pode ser utilizado para geração de valor para o cliente e para a empresa', 'Investigação sobre seus principais conceitos: satisfação, valor, fidelidade, comportamento do consumidor, comportamento do comprador organizacional e marketing estratégico, incluindo segmentação e posicionamento']::text[]
where id = 126 and cardinality(topics) = 1 and md5(topics[1]) = '82b8bda967b954bee4826d3eebd6111e'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 126);

update public.disciplines set topics = array['Caracterização da célula sob os aspectos constitutivos e funcionais e as inter-relações dos mesmos', 'Descrição do dinamismo das estruturas celulares', 'compreensão do uso da energia química, da relação com o microambiente e dos mecanismos regulatórios das atividades celulares']::text[]
where id = 127 and cardinality(topics) = 1 and md5(topics[1]) = '9b3fe9acc3f84c2c177d7470e8aa3271'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 127);

update public.disciplines set topics = array['Definição de representação visual', 'Estudo de técnicas de representação visual tanto para a pesquisa quanto para o ensino de Biologia', 'Expressão da linguagem gráfica e da comunicação visual com os elementos que constituem o universo das Ciências Biológicas', 'Produção de um projeto utilizando uma das técnicas de representação visual']::text[]
where id = 128 and cardinality(topics) = 1 and md5(topics[1]) = 'c84466560c4cc5e8a82fa7e290db52a5'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 128);

update public.disciplines set topics = array['Aplicação prática da expressividade ao falar em público, com direcionamento acadêmico e organizacional', 'Desenvolvimento de textos corporativos e científicos', 'Leitura crítica e interpretativa', 'Elaboração de textos, permeados pela clareza, intencionalidade, coesão e coerência']::text[]
where id = 129 and cardinality(topics) = 1 and md5(topics[1]) = '60cf81df6b4014b18b3c12a89c0b306c'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 129);

update public.disciplines set topics = array['Estudo dos conceitos mais característicos de cada “escola” da administração ao longo dos séculos XIX e XX', 'Compreensão sobre a realidade da época de cada “escola” e os conceitos desenvolvidos para reflexão sobre as razões de muitas teorias estarem presentes até hoje nas práticas organizacionais']::text[]
where id = 130 and cardinality(topics) = 1 and md5(topics[1]) = 'fbaa1ec89347af73aae91a86baa0ffc8'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 130);

update public.disciplines set topics = array['Administração financeira, estudo das operações financeiras básicas, análise de projetos e investimentos']::text[]
where id = 131 and cardinality(topics) = 1 and md5(topics[1]) = '43a992f52b01426500d574f4653c35e5'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 131);

update public.disciplines set topics = array['Estudo dos conceitos básicos da subordinação jurídica da teoria e dos trâmites de processo em juízo no que diz respeito a necessidade de prova pericial', 'Apresentação dos conhecimentos sobre a formação, perfil, e responsabilidade do perito judicial']::text[]
where id = 132 and cardinality(topics) = 1 and md5(topics[1]) = '900c8ba6049bbb47c6fa3051ab27a6de'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 132);

update public.disciplines set topics = array['Estudo da fundamentação científica da contabilidade através da abordagem da Teoria Positiva, discutindo a relação da contabilidade com o mercado financeiro', 'Trazer conceitos de qualidade da informação contábil e o seu desenvolvimento através de tecnologia, regulação contábil, gerenciamento de resultados como discussão para o entendimento do papel da informação contábil no como meio de resolução de conflitos entre os diversos interessados na empresa']::text[]
where id = 133 and cardinality(topics) = 1 and md5(topics[1]) = '690f4cbe6b6b00ca2414190409ac9a60'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 133);

update public.disciplines set topics = array['Análise da especificidade da abordagem antropológica do direito', 'Exame dos elementos fundamentais da antropologia social e jurídica', 'Explicitação dos traços fundamentais da análise e da pesquisa em antropologia', 'Reconstrução crítica das perspectivas teóricas da antropologia social e jurídica', 'Descrição da abordagem antropológica como forma de compreensão do direito numa perspectiva plural', 'Exame da questão da aculturação jurídica', 'Discussão do pluralismo jurídico e da fundamentação do direito numa sociedade multicultural', 'Análise da relação entre pluralismo jurídico e o direito das minorias e dos povos autóctones', 'Exame crítico dos direitos das minorias e dos povos autóctones no Brasil', 'Discussão da questão dos direitos humanos a partir da perspectiva antropológica', 'Explicitação de questões fundamentais relativas à observação antropológica do campo jurídico']::text[]
where id = 134 and cardinality(topics) = 1 and md5(topics[1]) = '0f5c792293a723ab96e6156bae1ecde2'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 134);

update public.disciplines set topics = array['Explicitação dos conceitos básicos de ciência política', 'Contraste da ciência política e ciências afins', 'Exame das temáticas do Estado, da sociedade e do direito', 'Explicitação da relação entre governo, legitimidade e legalidade', 'Exame dos regimes políticos', 'Análise da democracia liberal, da democracia popular e da socialdemocracia', 'Discussão da temática do Estado de direito: evolução do pensamento', 'Análise de perspectivas teóricas expressivas no âmbito da Ciência política', 'Discussão acerca dos aportes teóricos da ciência política à questão da globalização']::text[]
where id = 135 and cardinality(topics) = 1 and md5(topics[1]) = '78ac352be0b0478b86f93f63e60dceaf'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 135);

update public.disciplines set topics = array['Estudo das interfaces entre ciência, tecnologia e sociedade e suas recíprocas influências', 'Reflexão sobre a neutralidade na ciência', 'Análise dos fatos científicos condicionados ao seu contexto social de criação e desenvolvimento', 'Demonstra como as descobertas da ciência e suas aplicações tecnológicas se inter-relacionam à dimensão social humana']::text[]
where id = 136 and cardinality(topics) = 1 and md5(topics[1]) = '89f66467509f714820037e625d180aaa'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 136);

update public.disciplines set topics = array['A disciplina Economia Política e Direito apresenta as noções gerais e conceitos de Economia e a sua relação com o Direito, destacando as principais teorias econômicas, a evolução do pensamento econômico, os sistemas econômicos, o comportamento dos agentes econômicos no mercado e os princípios gerais da macro e microeconomia']::text[]
where id = 137 and cardinality(topics) = 1 and md5(topics[1]) = '59615dba98339e39ce09ae75d6b40af2'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 137);

update public.disciplines set topics = array['Estudo e interpretação dos fenômenos históricos, estabelecendo as relações entre as instituições jurídicas do passado e as instituições atuais', 'Discussão do problema relativo ao anacronismo na análise histórica', 'Análise histórica dos conceitos jurídicos', 'Discussão de diversos sistemas jurídicos numa perspectiva diacrônica', 'Estabelecimento de relações entre o direito português e o atual direito brasileiro', 'Análise histórica da formação do atual Ordenamento Jurídico Brasileiro', 'Reflexões e exames de questões históricas das Constituições brasileiras, destacando a importância dos diversos diplomas constitucionais']::text[]
where id = 138 and cardinality(topics) = 1 and md5(topics[1]) = '20ad7645371ade497119806e6dc36567'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 138);

update public.disciplines set topics = array['Análise dos diferentes níveis comunicativos e sua interface com o discurso jurídico', 'Estudo do vocabulário jurídico e de brocardos latinos', 'Apresentação dos aspectos relevantes da estruturação frasal, do discurso argumentativo e da redação técnica']::text[]
where id = 139 and cardinality(topics) = 1 and md5(topics[1]) = 'f71b86369bcbde3aa4c97dd430232910'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 139);

update public.disciplines set topics = array['Lógica: questões introdutórias, conceitos e princípios fundamentais', 'O papel da Lógica no Direito: aplicação da lógica formal no âmbito jurídico', 'A lógica analítica e a lógica do razoável', 'análise lógica e argumentação jurídica, falácias']::text[]
where id = 140 and cardinality(topics) = 1 and md5(topics[1]) = '5e1a829d52096d416c71b3b91bd47330'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 140);

update public.disciplines set topics = array['Análise da posição do Direito Civil no Direito e sua relação com as demais áreas do Direito', 'Exame do conteúdo dos Livros I e II da Parte Geral do Código Civil e sua importância para as relações político-sociais', 'Estudo da pessoa natural e pessoa jurídica, como sujeitos de direitos', 'personalidade e bens, como objeto das relações jurídicas que se formam entre as pessoas']::text[]
where id = 141 and cardinality(topics) = 1 and md5(topics[1]) = 'e3fada6834210098448ddbe50609b8f0'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 141);

update public.disciplines set topics = array['Análise do conceito de direito e sua relação com os âmbitos da moral, da política, da justiça, do poder, da força e do Estado', 'Explicitação da distinção entre dogmática e zetética', 'Exame da formação do pensamento dogmático moderno acerca do direito', 'Análise da questão da decidibilidade dos conflitos como objeto do saber dogmático jurídico', 'Panorama da história da ciência jurídica', 'Abordagem da teoria da norma jurídica', 'Discussão das noções de validade, eficácia, exigência e força', 'Explicitação dos elementos fundamentais da teoria dogmática da interpretação jurídica']::text[]
where id = 142 and cardinality(topics) = 1 and md5(topics[1]) = '087b98236712d61ccd2dae5b65d5af06'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 142);

update public.disciplines set topics = array['Estudo dos pressupostos conceituais sobre Ética e Cidadania e suas inter-relações na esfera social e o seu desenvolvimento ao longo da história', 'Aborda o papel e a contribuição da ética calvinista, refletindo sua importância e sua relação com a prática da cidadania em seus aspectos civis, políticos e sociais']::text[]
where id = 143 and cardinality(topics) = 1 and md5(topics[1]) = '6f025155415a3e329fbdc50487828f9d'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 143);

update public.disciplines set topics = array['Análise dos princípios que regem os sistemas ambientais e seus fatores de desequilíbrio', 'Estudo dos sistemas, métodos e processos aplicados a recursos naturais', 'da recuperação de áreas degradadas', 'da poluição por veículos e sistemas e equipamentos de monitoramento e controle ambiental', 'dos ecossistemas terrestres aquáticos e atmosféricos', 'das fontes de energias relacionadas com a Engenharia Ambiental', 'e dos impactos energéticos ambientais']::text[]
where id = 144 and cardinality(topics) = 1 and md5(topics[1]) = '6458793b46b44e765a74a5fd24c6e87c'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 144);

update public.disciplines set topics = array['Estudo dos conceitos de ética, moral, cidadania e suas inter-relações, bem como das relações étnico-raciais', 'Discussão dos temas fundamentais da ética norteada pelos princípios da cosmovisão calvinista', 'Reflexão e análise crítica das teorias ético-normativas mais sublinhadas na atualidade e suas implicações práticas', 'Estabelecimento e identificação de pontos de contato entre a ética calvinista e as demais áreas do conhecimento']::text[]
where id = 145 and cardinality(topics) = 1 and md5(topics[1]) = '8e08f9b1a6e133d1306afb7d84ff9f1d'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 145);

update public.disciplines set topics = array['Estudo dos conceitos de ética, moral, cidadania e suas inter-relações, bem como das relações étnico-raciais', 'Discussão dos temas fundamentais da ética norteada pelos princípios da cosmovisão calvinista', 'Reflexão e análise crítica das teorias ético-normativas mais sublinhadas na atualidade e suas implicações práticas', 'Estabelecimento e identificação de pontos de contato entre a ética calvinista e as demais áreas do conhecimento']::text[]
where id = 146 and cardinality(topics) = 1 and md5(topics[1]) = '8e08f9b1a6e133d1306afb7d84ff9f1d'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 146);

update public.disciplines set topics = array['Análise dos princípios que regem os sistemas ambientais e seus fatores de desequilíbrio', 'Estudo dos sistemas, métodos e processos aplicados a recursos naturais', 'a recuperação de áreas degradadas', 'a poluição por veículos e sistemas e equipamentos de monitoramento e controle ambiental os ecossistemas terrestres aquáticos e atmosféricos', 'as fontes de energias relacionadas com a Engenharia Ambiental', 'e os impactos energéticos ambientais']::text[]
where id = 147 and cardinality(topics) = 1 and md5(topics[1]) = 'a8c4331c7a46013873501e0ef8817a97'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 147);

update public.disciplines set topics = array['Estudo dos conceitos de ética, moral, cidadania e suas inter-relações, bem como das relações étnico-raciais', 'Discussão dos temas fundamentais da ética norteada pelos princípios da cosmovisão calvinista', 'Reflexão e análise crítica das teorias ético-normativas mais sublinhadas na atualidade e suas implicações práticas', 'Estabelecimento e identificação de pontos de contato entre a ética calvinista e as demais áreas do conhecimento']::text[]
where id = 148 and cardinality(topics) = 1 and md5(topics[1]) = '8e08f9b1a6e133d1306afb7d84ff9f1d'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 148);

update public.disciplines set topics = array['Análise dos princípios que regem os sistemas ambientais e seus fatores de desequilíbrio', 'Estudo dos sistemas, métodos e processos aplicados a recursos naturais', 'a recuperação de áreas degradadas', 'a poluição por veículos e sistemas e equipamentos de monitoramento e controle ambiental os ecossistemas terrestres aquáticos e atmosféricos', 'as implicações da dinâmica envolvendo o ambiente, a responsabilidade social e econômica, as fontes de energias relacionadas com a Engenharia Ambiental', 'e os impactos energéticos ambientais', 'Impactos adversos ao ambiente bem como análise da adoção de medidas de prevenção e de combate a incêndio e a desastres em estabelecimentos, edificações, áreas de reunião de público e ao ambiente']::text[]
where id = 149 and cardinality(topics) = 1 and md5(topics[1]) = 'f5138b7d84ef0105484ce6e4c89f7bd9'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 149);

update public.disciplines set topics = array['Funções reais de uma variável real, limites (limites laterais, funções contínuas, limites indeterminados, limites fundamentais e limites infinitos e no infinito), derivadas (definição, retas tangente e normal, regras de derivação, taxa de variação e aplicações)']::text[]
where id = 150 and cardinality(topics) = 1 and md5(topics[1]) = '20d32197e9b7aedff25b0b988f96e4c2'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 150);

update public.disciplines set topics = array['Familiarização com o sistema internacional de medidas e suas unidades fundamentais', 'Trabalho com a estática do ponto material e do corpo rígido, bem como percepção 2D de forças aplicadas', 'Entendimento sobre condições de equilíbrio de translação e rotação de corpos em movimento horizontal, vertical, oblíquo e direcionado', 'Noções sobre estrutura da ABNT e CREA quanto a normas de laboratório, estimativa e mensuração de erros, instrumento de medidas, gráficos cartesianos em escala, e práticas de determinação de constante elástica de molas helicoidais, densidade de corpos e condições de equilíbrio']::text[]
where id = 151 and cardinality(topics) = 1 and md5(topics[1]) = '5ba6cb8d2c563de9750513571ede2f81'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 151);

update public.disciplines set topics = array['Estudo dos conceitos básicos de informática', 'Descrição de algoritmos: Narrativa, Pseudocódigo, Fluxogramas e Linguagem de programação', 'Desenvolvimento de Lógica de Programação', 'Estudo dos Elementos básicos de programação: variáveis e tipos', 'entrada e saída de dados', 'estrutura sequencial', 'estruturas condicionais', 'estruturas repetitivas', 'funções predefinidas e funções de usuário', 'Simulação de algoritmos (teste de mesa)', 'Elaboração de funções com passagem de parâmetros por valor e por referência', 'Criação de Unidades independentes (bibliotecas de funções)', 'Manipulação de arranjos estáticos (vetores e matrizes)', 'Noções de interfaces gráficas de usuário']::text[]
where id = 152 and cardinality(topics) = 1 and md5(topics[1]) = 'a4d82401dc38aecac532af04ee36e831'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 152);

update public.disciplines set topics = array['Materiais ferrosos (diferenciação entre aço e ferro fundido), Materiais não ferrosos, Corrosão, Densidade de sólidos, Viscosidade de líquidos, Análise do gesso (teste de solubilidade, água de cristalização), Preparo de soluções, Análise de água (condutividade, pH, Dureza, Cloretos)', 'Reações químicas e teorias ácido-base']::text[]
where id = 153 and cardinality(topics) = 1 and md5(topics[1]) = '4c5a6ab56ced56749672e193d29c7969'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 153);

update public.disciplines set topics = array['A disciplina apresenta os conceitos de ética, moral, cidadania e suas inter-relações, no âmbito social, com uma avaliação de sua evolução ao longo da história da humanidade e dos valores fundamentais, segundo os princípios da cosmovisão cristã reformada', 'Promove-se a reflexão e análise crítica das teorias ético-normativas mais sublinhadas na contemporaneidade e suas implicações práticas em nível político- social, profissional e familiar, por meio de uma discussão à luz dos preceitos calvinistas, destacando-se pontos de contato entre a ética cristã reformada e as diferentes áreas do conhecimento, com a valorização da dignidade humana']::text[]
where id = 154 and cardinality(topics) = 1 and md5(topics[1]) = '3b2c30367be303527202a76f3f11220a'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 154);

update public.disciplines set topics = array['Estudo das interfaces entre ciência, tecnologia e sociedade e suas recíprocas influências', 'Reflexão sobre a neutralidade na ciência', 'Análise dos fatos científicos condicionados ao seu contexto social de criação e desenvolvimento', 'Demonstra como as descobertas da ciência e suas aplicações tecnológicas se inter- relacionam à dimensão social humana']::text[]
where id = 155 and cardinality(topics) = 1 and md5(topics[1]) = 'd7011a994f40a61e6019b49a89f2987c'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 155);

update public.disciplines set topics = array['Análise dos princípios que regem os sistemas ambientais e seus fatores de desequilíbrio', 'Estudo dos sistemas, métodos e processos aplicados a recursos naturais', 'a recuperação de áreas degradadas', 'a poluição por veículos e sistemas e equipamentos de monitoramento e controle ambiental os ecossistemas terrestres aquáticos e atmosféricos', 'as implicações da dinâmica envolvendo o ambiente, a responsabilidade social e econômica, as fontes de energias relacionadas com a Engenharia Ambiental', 'e os impactos energéticos ambientais', 'Impactos adversos ao ambiente bem como análise da adoção de medidas de prevenção e de combate a incêndio e a desastres em estabelecimentos, edificações, áreas de reunião de público e ao ambiente', 'Políticas de educação ambiental']::text[]
where id = 156 and cardinality(topics) = 1 and md5(topics[1]) = '61aa2af11b66b3ebd8ef074f59640019'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 156);

update public.disciplines set topics = array['Familiarização com o sistema internacional de medidas e suas unidades fundamentais', 'Trabalho com a estática do ponto material e do corpo rígido, bem como percepção 2D de forças aplicadas', 'Entendimento sobre condições de equilíbrio de translação e rotação de corpos em movimento horizontal, vertical, oblíquo e direcionado', 'Noções sobre estrutura da ABNT e CREA quanto a normas de laboratório, estimativa e mensuração de erros, instrumento de medidas, gráficos cartesianos em escala, e práticas de determinação de constante elástica de molas helicoidais, densidade de corpos e condições de equilíbrio']::text[]
where id = 157 and cardinality(topics) = 1 and md5(topics[1]) = '5ba6cb8d2c563de9750513571ede2f81'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 157);

update public.disciplines set topics = array['Materiais ferrosos (diferenciação entre aço e ferro fundido), Materiais não ferrosos, Corrosão, Densidade de sólidos, Viscosidade de líquidos, Análise do gesso (teste de solubilidade, água de cristalização), Preparo de soluções, Análise de água (condutividade, pH, Dureza, Cloretos)', 'Reações químicas e teorias ácido-base']::text[]
where id = 158 and cardinality(topics) = 1 and md5(topics[1]) = '4c5a6ab56ced56749672e193d29c7969'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 158);

update public.disciplines set topics = array['A disciplina apresenta os conceitos de ética, moral, cidadania e suas inter-relações, no âmbito social, com uma avaliação de sua evolução ao longo da história da humanidade e dos valores fundamentais, segundo os princípios da cosmovisão cristã reformada', 'Promove-se a reflexão e análise crítica das teorias ético- normativas mais sublinhadas na contemporaneidade e suas implicações práticas em nível político-social, profissional e familiar, por meio de uma discussão à luz dos preceitos calvinistas, destacando-se pontos de contato entre a ética cristã reformada e as diferentes áreas do conhecimento, com a valorização da dignidade humana', 'Políticas relação étnico-racial e indígena', 'História e cultura afro-brasileira']::text[]
where id = 159 and cardinality(topics) = 1 and md5(topics[1]) = 'c2e6235a0d09dc27de32dd7a4e967e26'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 159);

update public.disciplines set topics = array['Análise dos princípios que regem os sistemas ambientais e seus fatores de desequilíbrio', 'Estudo dos sistemas, métodos e processos aplicados a recursos naturais', 'da recuperação de áreas degradadas', 'da poluição por veículos e sistemas e equipamentos de monitoramento e controle ambiental', 'dos ecossistemas terrestres aquáticos e atmosféricos', 'das fontes de energias relacionadas com a Engenharia Ambiental', 'e dos impactos energéticos ambientais']::text[]
where id = 160 and cardinality(topics) = 1 and md5(topics[1]) = '6458793b46b44e765a74a5fd24c6e87c'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 160);

update public.disciplines set topics = array['Compreensão das relações morfológicas e funcionais do corpo humano', 'Construção de uma visão geral e integrada entre os diversos sistemas que constituem o corpo humano']::text[]
where id = 161 and cardinality(topics) = 1 and md5(topics[1]) = 'e86ea92ac45e04937154768e9ba8b098'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 161);

update public.disciplines set topics = array['Estudo da célula e tecidos sob os aspectos constitutivos e funcionais, inter-relacionando-os', 'Apresenta conceitos básicos sobre o dinamismo das estruturas celulares, o uso da energia química, a relação com o microambiente, bem como os mecanismos regulatórios das atividades celulares', 'Reconhece técnicas básicas de estudo dos tecidos em seres vivos e evoca a histofisiologia dos mesmos', 'Também abrange noções fundamentais do desenvolvimento embrionário e fetal, as quais subsidiam disciplinas que apresentam peculiaridades morfológicas e fisiológicas']::text[]
where id = 162 and cardinality(topics) = 1 and md5(topics[1]) = 'b7909d8a29058241ec92b58e600a98f2'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 162);

update public.disciplines set topics = array['Exploração e análise descritiva de dados biológicos', 'Interpretação e construção de tabelas e gráficos', 'Introdução às funções reais e aplicações de cálculo matemático']::text[]
where id = 163 and cardinality(topics) = 1 and md5(topics[1]) = 'e2ad22311d004f6d5cc26a5822726b1e'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 163);

update public.disciplines set topics = array['Estudo das interfaces entre ciência, tecnologia e sociedade e suas recíprocas influências', 'O processo de gestão do conhecimento e os conceitos de informação, conhecimento e inovação', 'Categorias do conhecimento', 'Reflexão sobre a (não) neutralidade na ciência e sua relação com os conhecimentos empírico, filosófico e teológico', 'Análise dos fatos científicos condicionados ao seu contexto social de criação e desenvolvimento', 'O processo de socialização e a evolução dos tipos sociais como exercício do mandato cultural', 'A crise da modernidade e as características da pós- modernidade', 'Análise dos avanços tecnológicos e dos consequentes dilemas ético-sociais deles advindos, na relação entre tecnologia, mercado de trabalho e interações humanas', 'Abordagem dos impactos da tecnologia na saúde', 'Discussão sobre a relação entre ciência, tecnologia e sociedade na saúde']::text[]
where id = 164 and cardinality(topics) = 1 and md5(topics[1]) = 'cc9ecb76dc033725f1f07be701c3380f'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 164);

update public.disciplines set topics = array['Estudo dos conceitos de ética, moral, cidadania e suas inter-relações', 'Discussão dos temas fundamentais da ética norteada pelos princípios da cosmovisão calvinista', 'Reflexão e análise crítica das teorias ético-normativas mais sublinhadas na atualidade e suas implicações práticas', 'Estabelecimento e identificação de pontos de contato entre a ética calvinista e as demais áreas do conhecimento']::text[]
where id = 165 and cardinality(topics) = 1 and md5(topics[1]) = '2cac73c7e3a1249c5fc62f2a65764102'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 165);

update public.disciplines set topics = array['Caracterização da estrutura do DNA, sua duplicação, os mecanismos de expressão e mutações do material genético', 'Caracterização do cariótipo humano e anomalias cromossômicas humanas', 'Fundamentos do desenvolvimento embrionário e fetal']::text[]
where id = 166 and cardinality(topics) = 1 and md5(topics[1]) = '4d6bfd429850491310be89fcfd13b5eb'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 166);

update public.disciplines set topics = array['A percepção do corpo como instrumento de expressão', 'Reflexão das mudanças culturais e históricas na concepção e conhecimento do corpo pelo Homem', 'Sensibilização e experimentação das possibilidades corporais do movimento humano']::text[]
where id = 167 and cardinality(topics) = 1 and md5(topics[1]) = '6d72a757526025f3252b2d0a512d5eff'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 167);

update public.disciplines set topics = array['O conteúdo abordará aspectos básicos da Química envolvidos no preparo de alimentos', 'Estudo das principais propriedades de alguns elementos químicos presente nos alimentos e sua importância biológica', 'Estudos das principais propriedades das substâncias iônicas ou covalentes presentes nos alimentos', 'Estudo e compreensão dos principais parâmetros físicos e químicos envolvidos no processamento dos alimentos', 'Estudo das principais reações químicas que ocorrem nos diferentes grupos de alimentos', 'Estudo de processos enzimáticos e fermentativos de interesse na gastronomia', 'Estabelecer mecanismos de controle como ferramenta na produção de alimentos']::text[]
where id = 168 and cardinality(topics) = 1 and md5(topics[1]) = '6259bb8d3f5da3edc38f2c64c8774353'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 168);

update public.disciplines set topics = array['Estudo dos mecanismos biológicos da alimentação e dos conceitos básicos de nutrição, por meio da compreensão do conteúdo em energia e nutrientes dos alimentos, além de sua classificação em grupos alimentares, definindo as características de uma alimentação saudável']::text[]
where id = 169 and cardinality(topics) = 1 and md5(topics[1]) = 'b8338e31a10780a7aea2a3bee312b6ab'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 169);

update public.disciplines set topics = array['Desenvolvimento de atitudes empresariais e empreendedora', 'Discussões de medidas que contemplem abordagens contemporâneas sobre visão geral de gestão de pessoas, capital humano das organizações', 'Correlação das ações de planejamento, princípios, políticas e processos de gestão de pessoas com o trabalho em equipe e a qualidade de vida no trabalho']::text[]
where id = 170 and cardinality(topics) = 1 and md5(topics[1]) = '07455731ff4f2c9cf915ddc63f3ac4fc'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 170);

update public.disciplines set topics = array['Estudo dos pressupostos conceituais sobre Ética e Cidadania e suas inter-relações na esfera social e o seu desenvolvimento ao longo da história', 'Aborda o papel e a contribuição da ética calvinista, refletindo sua importância e sua relação com a prática da cidadania em seus aspectos civis, políticos e sociais']::text[]
where id = 171 and cardinality(topics) = 1 and md5(topics[1]) = '6f025155415a3e329fbdc50487828f9d'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 171);

update public.disciplines set topics = array['Discussão sobre as possibilidades e características da linguagem cinematográfica', 'Apresentação e discussão sobre os mitos no cinema, cinema e representação do real, cinema e identidade cultural', 'Apresentação do panorama do cinema brasileiro']::text[]
where id = 172 and cardinality(topics) = 1 and md5(topics[1]) = '68a5994f2a564084c35e59d6039cb466'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 172);

update public.disciplines set topics = array['Estudos das técnicas de registro fotográfico, operação de câmera fotográfica e seus acessórios', 'Uso de filtros e lentes especiais e dos recursos técnicos das câmeras fotográficas profissionais', 'Fotografia com iluminação natural, flash e lâmpadas', 'Utilização de teleobjetivas, grande-angulares e anel de reprodução', 'Discussão sobre o uso de softwares de edição de imagem', 'Apresentação dos formatos digitais de imagem', 'Canais de cor', 'Camadas', 'Máscaras', 'Fusões', 'Recortes', 'Filtros e efeitos', 'Tamanho e resolução das imagens digitais', 'Digitalização de imagens para impressão e para telas']::text[]
where id = 173 and cardinality(topics) = 1 and md5(topics[1]) = 'd2eba37e3896ca6d38967ca5077a553f'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 173);

update public.disciplines set topics = array['Estudo sobre a correção ortográfica e gramatical de termos e textos, a adequação vocabular e a aplicação dentro do universo jornalístico', 'Discussão acerca do gerúndio e do infinitivo nos meios de comunicação', 'Discussão e prática sobre a produção de parágrafos em Língua Portuguesa', 'Estudo das regras ortográficas, a correção gramatical de termos e textos, a adequação vocabular e a aplicação dentro do universo jornalístico', 'A leitura e a interpretação de textos jornalísticos', 'As funções da linguagem', 'Teoria e elaboração de resumo a partir da técnica de sublinhar e esquematizar', 'Semântica e sintagma']::text[]
where id = 174 and cardinality(topics) = 1 and md5(topics[1]) = 'b08387fb446e4b86290fd67a904adcfd'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 174);

update public.disciplines set topics = array['Apresentação de alguns paradigmas do jornalismo (verdade, atualidade, objetividade, precisão, imparcialidade etc.) e das situações em que ocorre a ruptura desses padrões', 'Notícia e critérios de noticiabilidade', 'Funções, lugares e responsabilidades do jornalista', 'Discussão da estrutura e do funcionamento de uma redação e de uma empresa e de comunicação organizacional, bem como da natureza profissional do jornalista', 'Apresentação da gênese e evolução do jornalismo, das modalidades jornalísticas e da estrutura da notícia', 'Desenvolvimento de textos jornalísticos', 'Atividade extensionista: desenvolvimento das habilidades de apuração e produção de notícias para a realização e um jornal-laboratório voltado aos moradores e frequentadores dos bairros no entorno da UPM']::text[]
where id = 175 and cardinality(topics) = 1 and md5(topics[1]) = '64f902e4f63bfc04c36890c2571e0c61'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 175);

update public.disciplines set topics = array['Correntes, tendências sociais e políticas contemporâneas', 'A relação entre o indivíduo, sociedade (instituições) e o Estado', 'Principais abordagens do pensamento filosófico contemporâneo - Círculo de Viena e filosofia contemporânea']::text[]
where id = 176 and cardinality(topics) = 1 and md5(topics[1]) = 'bda0d29814bdc455de9202cfb186b91e'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 176);

update public.disciplines set topics = array['Estudo das interfaces entre ciência, tecnologia e sociedade e suas recíprocas influências', 'O processo de gestão do conhecimento e os conceitos de informação, conhecimento e inovação', 'Categorias do conhecimento', 'Reflexão sobre a (não) neutralidade na ciência e sua relação com os conhecimentos empírico, filosófico e teológico', 'Análise dos fatos científicos condicionados ao seu contexto social de criação e desenvolvimento', 'O processo de socialização e a evolução dos tipos sociais como exercício do mandato cultural', 'A crise da modernidade e as características da pós- modernidade', 'Análise dos avanços tecnológicos e dos consequentes dilemas ético-sociais deles advindos, na relação entre tecnologia, mercado de trabalho e interações humanas', 'Abordagem dos impactos da tecnologia na saúde', 'Discussão sobre a relação entre ciência, tecnologia e sociedade na saúde']::text[]
where id = 177 and cardinality(topics) = 1 and md5(topics[1]) = 'cc9ecb76dc033725f1f07be701c3380f'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 177);

update public.disciplines set topics = array['Fundamentação da Ciência da Nutrição em seus aspectos históricos, culturais, biopsicossociais e da composição dos alimentos', 'Estudo da relação entre os alimentos, nutrientes e a saúde humana']::text[]
where id = 178 and cardinality(topics) = 1 and md5(topics[1]) = 'd6e76a35e23116ef6323b28358d5a9c8'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 178);

update public.disciplines set topics = array['Conhecimento e apropriação dos: conceitos de ciência, noções básicas sobre conhecimento, conhecimento científico', 'Estudo dos Conceitos de']::text[]
where id = 179 and cardinality(topics) = 1 and md5(topics[1]) = '014f7e6333546daf10e249594f459065'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 179);

update public.disciplines set topics = array['Estudo das interfaces entre ciência, tecnologia e sociedade e suas recíprocas influências', 'O processo de gestão do conhecimento e os conceitos de informação, conhecimento e inovação', 'Categorias do conhecimento', 'Reflexão sobre a (não) neutralidade na ciência e sua relação com os conhecimentos empírico, filosófico e teológico', 'Análise dos fatos científicos condicionados ao seu contexto social de criação e desenvolvimento', 'O processo de socialização e a evolução dos tipos sociais como exercício do mandato cultural', 'A crise da modernidade e as características da pós- modernidade', 'Análise dos avanços tecnológicos e dos consequentes dilemas ético-sociais deles advindos, na relação entre tecnologia, mercado de trabalho e interações humanas', 'Abordagem dos impactos da tecnologia na saúde', 'Discussão sobre a relação entre ciência, tecnologia e sociedade na saúde']::text[]
where id = 180 and cardinality(topics) = 1 and md5(topics[1]) = 'cc9ecb76dc033725f1f07be701c3380f'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 180);

update public.disciplines set topics = array['Estudo dos fundamentos filosóficos e epistemológicos do pensamento psicológico e suas implicações nas diferentes concepções de homem, objetos de estudo e métodos científicos']::text[]
where id = 181 and cardinality(topics) = 1 and md5(topics[1]) = '7ca5e7221d5878565fb1c22d307f5e9b'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 181);

update public.disciplines set topics = array['Abordagem dos grandes temas da Sociologia, os conceitos fundamentais, as perspectivas teóricas e os principais norteadores contemporâneos dessa disciplina, tratando os fenômenos sociais na interface com a Psicologia']::text[]
where id = 183 and cardinality(topics) = 1 and md5(topics[1]) = '6004dff3d90fa04acd1d20687dbce7d9'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 183);

update public.disciplines set topics = array['Compreensão dos conceitos teóricos de ética e cidadania, suas inter-relações na esfera social e o seu desenvolvimento ao longo da história', 'entendimento do papel e a contribuição da ética calvinista para a formação da cidadania em seus aspectos civis, políticos e sociais', 'Ética filosófica compreendida a partir de ações práticas na sociedade que visem transformação social e dignificação da pessoa humana']::text[]
where id = 184 and cardinality(topics) = 1 and md5(topics[1]) = 'b5cc8acf1f051bea21f122e956450ce9'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 184);

update public.disciplines set topics = array['Estudo e desenvolvimento de algoritmos envolvendo comandos de atribuição, condicionais e de repetição, tendo com ênfase a resolução de problemas em ordem crescente de complexidade', 'Implementação de algoritmos utilizando linguagem de programação imperativa']::text[]
where id = 185 and cardinality(topics) = 1 and md5(topics[1]) = 'b26c4e62a9c5bec539a55545d6f1aaf2'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 185);

update public.disciplines set topics = array['Estudo do desenvolvimento da ciência e da tecnologia, suas interfaces com a sociedade e suas recíprocas influências na Matemática e na Computação', 'Estudo sobre os fundamentos epistemológicos da ciência e tecnologia', 'Reflexão sobre a não-neutralidade na ciência', 'Análise dos fatos científicos condicionados ao seu contexto social de origem e desenvolvimento', 'Estudo de como as descobertas da ciência e suas aplicações tecnológicas se inter-relacionam à dimensão social humana e no contexto da relação homem-máquina']::text[]
where id = 186 and cardinality(topics) = 1 and md5(topics[1]) = '5458df970450a45d44fa183d2d0757b6'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 186);

update public.disciplines set topics = array['Fundamentação da área de Sistemas de Informação, Conceituação da pesquisa em Sistemas de Informação, Detalhamento da atuação do profissional de SI, Estudo da Abordagem Sócio técnica, Estudo da Teoria Geral de Sistemas, Caracterização da Gestão de Infraestrutura de TI, Caracterização da Gestão de Sistemas de Informação, Estudo sobre Desenvolvimento de Sistemas de Informação, Caracterização da Gestão de Dados, Fundamentação de aspectos de Empreendedorismo e de Inovação em Sistemas de Informação, Relacionamento de Sistemas de Informação com outras áreas']::text[]
where id = 187 and cardinality(topics) = 1 and md5(topics[1]) = 'a53f581f881a70de8916bbefccf47c9c'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 187);

update public.disciplines set topics = array['Introdução a estrutura de ambientes Web e arquitetura cliente servidor', 'Construção de páginas Web com linguagens do lado cliente', 'Organização de conteúdo com linguagem de marcação', 'Construção de leiautes de páginas Web com folhas de estilo', 'Design Responsivo', 'Acesso ao JavaScript para tornar as páginas web mais interativas']::text[]
where id = 188 and cardinality(topics) = 1 and md5(topics[1]) = 'f9ad29daaa87e01ed901bd7025f82ee8'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 188);

update public.disciplines set topics = array['Dados, informação e conhecimento', 'Modelos de computação (von Neumann e Turing)', 'Álgebra Booleana e Circuitos Lógicos', 'Sistemas de hardware e software', 'Dados e armazenamento', 'Organização funcional de computadores', 'Sistema de Numeração', 'Unidade Central de Processamento', 'Memória', 'Barramento', 'Sistema de E/S']::text[]
where id = 189 and cardinality(topics) = 1 and md5(topics[1]) = 'fef142f3ee252b0dcfa81dbeb753c34e'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 189);

update public.disciplines set topics = array['Explicar os conceitos teóricos de ética e cidadania, suas inter-relações na esfera social e o seu desenvolvimento ao longo da história', 'bem como, destacar o papel e a contribuição da ética calvinista para a formação da cidadania em seus aspectos civis, políticos e sociais']::text[]
where id = 190 and cardinality(topics) = 1 and md5(topics[1]) = 'c25eb2659f9acee2944db27c25fdeb35'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 190);

update public.disciplines set topics = array['Introdução prática à construção de agentes baseados em LLMs', 'Funcionamento de modelos generativos, APIs, embeddings, tokenização, contexto e limitações', 'Criação dos primeiros agentes com integração básica a ferramentas externas']::text[]
where id = 191 and cardinality(topics) = 1 and md5(topics[1]) = 'b907e7fe40e2edcd741610b626bd75da'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 191);

update public.disciplines set topics = array['Técnicas avançadas de Prompt Engineering, estruturação de contexto, controle de saída, uso de system prompts, memory patterns e estratégias para melhorar consistência e confiabilidade de agentes']::text[]
where id = 192 and cardinality(topics) = 1 and md5(topics[1]) = '89568f8e1c30acf4524e92e5cd4ebdaf'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 192);

update public.disciplines set topics = array['Integração de agentes com APIs externas, bancos de dados e serviços SaaS', 'Implementação de tool calling, manipulação de dados externos e construção de agentes capazes de executar tarefas reais']::text[]
where id = 193 and cardinality(topics) = 1 and md5(topics[1]) = '5998705cd7e34c9f7799403ab7415005'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 193);

update public.disciplines set topics = array['Implementação de Retrieval Augmented Generation com embeddings, bancos vetoriais, indexação, busca semântica e construção de agentes com memória baseada em conhecimento estruturado']::text[]
where id = 194 and cardinality(topics) = 1 and md5(topics[1]) = '436bc2e6bcec666c4c747a1a127221e4'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 194);

update public.disciplines set topics = array['Desenvolvimento de workflows automatizados com agentes', 'Criação de pipelines inteligentes para automação de tarefas empresariais e integração com sistemas corporativos']::text[]
where id = 195 and cardinality(topics) = 1 and md5(topics[1]) = '214ffbe07d981c733aaffbb751cbbc3e'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 195);

update public.disciplines set topics = array['Deploy de agentes em ambientes de nuvem', 'Uso de containers, APIs e boas práticas de escalabilidade, monitoramento e controle de custos']::text[]
where id = 196 and cardinality(topics) = 1 and md5(topics[1]) = 'ae2acfc49bd99bbd7facb4a04821ea34'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 196);

update public.disciplines set topics = array['Desenvolvimento prático com Python voltado à construção de agentes, integração com frameworks como LangChain e LlamaIndex e criação de APIs com FastAPI']::text[]
where id = 197 and cardinality(topics) = 1 and md5(topics[1]) = '84d602d2f993fdaf266a1ae356344383'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 197);

update public.disciplines set topics = array['Reflexão sobre impactos sociais, éticos e econômicos da IA baseada em agentes, incluindo automação, mercado de trabalho, responsabilidade no desenvolvimento de sistemas autônomos e inclusão digital']::text[]
where id = 198 and cardinality(topics) = 1 and md5(topics[1]) = 'aefb380ccdf9519f514650c80ca94112'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 198);

update public.disciplines set topics = array['Comunicação entre agentes, divisão de tarefas, coordenação, planejamento e orquestração de workflows usando frameworks modernos', 'Aplicação em empresas e produtos digitais', 'Padrões arquiteturais para sistemas multiagentes', 'Arquiteturas hierárquicas e cooperativas']::text[]
where id = 199 and cardinality(topics) = 1 and md5(topics[1]) = 'de4607fe95a7bd15165e4fa09a3f51aa'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 199);

update public.disciplines set topics = array['Desenvolvimento de soluções aplicadas a problemas reais de empresas', 'Identificação de oportunidades, prototipação rápida com LLMs e integração com sistemas existentes', 'Preparação para atuar como Engenheiro(a) de Soluções de IA, traduzindo desafios de negócios em arquiteturas técnicas']::text[]
where id = 200 and cardinality(topics) = 1 and md5(topics[1]) = 'ec5f6ef8952483d5d75fccca07c3d3fd'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 200);

update public.disciplines set topics = array['Integração de agentes com sistemas corporativos como ERP, CRM, bancos de dados e plataformas SaaS', 'Criação de agentes aplicados a atendimento, análise de dados, automação e suporte estratégico', 'Versionamento de agentes', 'Pipelines de dados e eventos', 'Arquitetura de soluções baseadas em agentes']::text[]
where id = 201 and cardinality(topics) = 1 and md5(topics[1]) = 'd208ca1e5a49e0a433d224e82e568d50'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 201);

update public.disciplines set topics = array['Modelos de memória de curto e longo prazo, planejamento orientado a objetivos e tomada de decisão baseada em contexto para controle de ações autônomas']::text[]
where id = 202 and cardinality(topics) = 1 and md5(topics[1]) = '565d7cd7974635fe8804ca274ecc30bd'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 202);

update public.disciplines set topics = array['Monitoramento, rastreabilidade de decisões, controle de acesso, políticas de uso e mitigação de riscos em sistemas autônomos corporativos', 'Implementação de práticas de governança ao longo do ciclo de vida de agentes']::text[]
where id = 203 and cardinality(topics) = 1 and md5(topics[1]) = '7a81dfc419a3d52d60d6bbebbb9169fd'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 203);

update public.disciplines set topics = array['Otimização de custo, latência, consumo de tokens e arquitetura para alta disponibilidade', 'Estratégias para produção em larga escala']::text[]
where id = 204 and cardinality(topics) = 1 and md5(topics[1]) = '976354c26afc43a3f19b4fa3a00c52a6'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 204);

update public.disciplines set topics = array['Design de interfaces, UX aplicado a agentes e criação de produtos digitais', 'Validação de mercado, métricas de performance e monetização de soluções inteligentes']::text[]
where id = 205 and cardinality(topics) = 1 and md5(topics[1]) = '895f3da74ab12e756dd7c5fedf388866'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 205);

update public.disciplines set topics = array['Criação de pipelines de avaliação automatizada (Evals) para medição de precisão e segurança de sistemas autônomos', 'Uso de LLM-as-a-Judge, Golden Datasets e benchmarks', 'Aplicação de técnicas de observabilidade, rastreamento de cadeias de pensamento (Chain-of-Thought) e guardrails em tempo real']::text[]
where id = 206 and cardinality(topics) = 1 and md5(topics[1]) = 'a35521337062d845ec02c56b5f9b4fae'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 206);

update public.disciplines set topics = array['A transformação digital e esse mundo pós-digital têm impulsionado o mercado de software', 'Nesse contexto, desenvolver um projeto de software requer a compreensão dos requisitos do negócio e a criação de modelos que se integrem à Total Experience (TX), proporcionando uma experiência completa para funcionários, clientes e usuários', 'Aprender a fazer a gestão de projetos com ágil Scrum é ponto forte dessa matéria, além de todo o contexto de Retorno Sobre o Investimento (ROI), cálculo do custo de projeto, como implementar softwares e alinhar ao modelo de negócio e a TX, é possível obter insights valiosos para aprimorar a oferta de valor e a satisfação dos envolvidos', 'Você aprenderá como coletar, documentar e até implementar um projeto através das necessidades do seu cliente, obtendo a melhor qualidade na entrega, aplicando a gestão ágil de projetos']::text[]
where id = 207 and cardinality(topics) = 1 and md5(topics[1]) = 'b05e11424e3632c04d085bf42a7009e2'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 207);

update public.disciplines set topics = array['Exploraremos como a Inteligência Artificial Generativa está transformando o desenvolvimento de software por meio de Grandes Modelos de Linguagem (LLMs), agentes inteligentes e aplicações baseadas em IA', 'Ao longo da disciplina, você aprenderá a integrar modelos de IA utilizando APIs, desenvolver prompts eficientes, conectar aplicações por meio do Model Context Protocol (MCP) e construir agentes capazes de compreender contextos e executar tarefas', 'Também serão exploradas arquiteturas modernas para o desenvolvimento de aplicações inteligentes, incluindo frameworks para agentes, orquestração de workflows, Retrieval-Augmented Generation (RAG) e bancos de dados vetoriais, permitindo a criação de soluções mais precisas, contextualizadas e alinhadas às necessidades do mercado', 'Ao final da disciplina, você estará preparado para projetar e desenvolver agentes autônomos para automatizar processos, integrar serviços e resolver problemas reais de engenharia de software, utilizando as tecnologias e práticas adotadas pelas principais empresas de tecnologia']::text[]
where id = 208 and cardinality(topics) = 1 and md5(topics[1]) = '12dafe8eef99825e2b2b25dc404bcc3b'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 208);

update public.disciplines set topics = array['Algoritmos permeiam praticamente todos os aspectos da nossa vida, encontrando aplicação em dispositivos como computadores, notebooks, tablets, smartphones, televisores inteligentes, robôs e uma variedade de outros aparelhos', 'Esteja apto a desenvolver soluções eficazes para diversas problemáticas computacionais através de um dos principais idiomas contemporâneos: PYTHON', 'Ao embarcar nesse aprendizado, será possível construir uma base sólida para programação em outras linguagens, tais como Java, C#, C, entre outros', 'Capacite-se a criar programas e aplicativos que interajam de maneira direta com os usuários, proporcionando assistência em suas atividades diárias', 'Desenvolva um domínio completo dos princípios de lógica de programação, abrangendo desde conceitos elementares até abordagens avançadas', 'Este aprimoramento garantirá ao aluno uma capacitação plena para enfrentar situações reais, conforme exigido pelo ambiente corporativo']::text[]
where id = 209 and cardinality(topics) = 1 and md5(topics[1]) = '4f422977b42bc28240fde9a0f2917b6d'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 209);

update public.disciplines set topics = array['No atual cenário, em que os dados constituem um dos principais ativos de uma empresa, este curso o conduzirá à exploração da formulação de estratégias sofisticadas para a esfera da informação', 'Abrangerá desde a construção dos alicerces da modelagem relacional até a aplicação de critérios avançados de normalização de dados', 'Ao participar deste curso, você adquirirá a competência para implementar estruturas de dados eficazes em sistemas de gerenciamento de banco de dados relacionais, manipulando-os por meio das linguagens SQL padrão e do Oracle DBMS', 'As aulas compreenderão a introdução de métodos atuais para a elaboração de esquemas de banco de dados que sejam não somente eficazes, mas também escaláveis e de desempenho otimizados', 'Aprendizado acerca da aplicação apropriada da normalização de dados estabelecerá uma base sólida para a gestão de informações, assegurando consistência e eliminando redundâncias', 'Adicionalmente, será realizado um mergulho profundo na manipulação de dados por meio das robustas capacidades da linguagem SQL e do Oracle, permitindo que você recupere, atualize e analise informações de maneira ágil e eficiente', 'Ao concluir este curso, você estará plenamente habilitado a gerenciar camadas de informação avançadas, garantindo que os dados sejam armazenados e acessados de maneira eficiente – um elemento crucial para o sucesso de projetos contemporâneos de desenvolvimento de software']::text[]
where id = 210 and cardinality(topics) = 1 and md5(topics[1]) = 'd881bf33d609270d2f6645055396ce08'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 210);

update public.disciplines set topics = array['Essa jornada mergulha na transformadora abordagem do Domain Driven Design para o desenvolvimento de software, unindo-a ao poder do Java', 'Aprenda a importância crucial da modelagem precisa do domínio e sua aplicação em Java, enquanto incorpora conceitos de orientação a objetos (JSE e JEE) que promovem a reutilização de código e minimizam o acoplamento por meio de padrões inteligentes', 'Você também explorará a comunicação eficaz com bancos de dados usando JDBC, criando sólidas ligações entre o banco de dados e o front-end', 'Além disso, dominará a arte de desenvolver APIs internas e externas', 'Una-se a nós nessa jornada para elevar suas habilidades, criar softwares excepcionais e entender como conectar domínio, código e eficiência']::text[]
where id = 211 and cardinality(topics) = 1 and md5(topics[1]) = '32391d83fa6a1d2293edaaf9453791b6'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 211);

update public.disciplines set topics = array['Front-end Design Engineering, uma jornada para dominar a criação de Single Page Applications com interfaces altamente responsivas', 'Explore as tecnologias-chave, desde HTML 5 e CSS 3 até JavaScript, Typescript, Bootstrap e React.JS', 'Ao mergulhar em padrões W3C, web semântica e SEO, você se tornará um especialista em desenvolvimento front-end capaz de criar experiências online excepcionais, proporcionando tanto estética visual quanto desempenho otimizado para os usuários']::text[]
where id = 212 and cardinality(topics) = 1 and md5(topics[1]) = '6112c91a249599749c09f7e7dcb8e2c8'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 212);

update public.disciplines set topics = array['Construção de soluções que envolvam sustentabilidade e explorem a gestão no respeito e convivência com as diferenças sociais e culturais']::text[]
where id = 213 and cardinality(topics) = 1 and md5(topics[1]) = 'ed2e8a95a9c234515df39cdf2df1a120'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 213);

update public.disciplines set topics = array['Na atual era digital, marcada pela necessidade de agilidade, flexibilidade e escalabilidade da infraestrutura para enfrentar desafios das organizações estão buscando uma solução eficaz: a migração para a computação em nuvem', 'Essa mudança vai muito além de simplesmente adotar um ambiente remoto para processamento computacional', 'Para prosperar nesse cenário, é essencial construir uma base sólida e alinhada com as demandas corporativas, capacitando-se para preparar e monitorar plataformas de virtualização em nuvem', 'Isso permitirá que as equipes se qualifiquem para implementar projetos estratégicos de TI de forma rápida e segura, integrando os times de desenvolvimento de sistemas, infraestrutura e operações, tudo isso utilizando métodos ágeis e as diversas tecnologias disponíveis em cloud computing', 'Compreender os serviços sob demanda oferecidos pela nuvem, como IaaS (Infraestrutura como Serviço), SaaS (Software como Serviço) e PaaS (Plataforma como Serviço), é fundamental para aproveitar ao máximo essa tecnologia', 'Além disso, é crucial aprender a implantar e monitorar o comportamento das aplicações de forma automatizada, garantindo uma gestão eficiente dos recursos disponíveis', 'Ao adotar tais práticas, as organizações estarão preparadas para enfrentar os desafios e tirar o máximo proveito das vantagens proporcionadas pela computação em nuvem']::text[]
where id = 214 and cardinality(topics) = 1 and md5(topics[1]) = '255149a744c87b3e90bccec1cdc22017'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 214);

update public.disciplines set topics = array['No cenário tecnológico atual, o domínio da concepção, execução, controle e automação de testes de software e dados desempenha um papel de extrema relevância', 'Essa proficiência impulsiona a agilidade e o discernimento, possibilitando a contínua entrega de inovações que enriquecem a experiência dos indivíduos e a performance das empresas, através de novas aplicações que transformam, simplificam e otimizam suas rotinas', 'A maestria nos princípios da qualidade de software é imprescindível para assegurar a eficácia dos produtos e serviços fornecidos', 'Ao internalizar e aplicar as práticas de teste mais eficientes, é viável otimizar a eficiência no ambiente de trabalho, garantindo que cada fase de desenvolvimento seja minuciosamente validada e aprimorada com confiança', 'A sinergia entre um conhecimento sólido dos fundamentos da qualidade de software e a implementação de testes automatizados viabiliza a abordagem destemida dos desafios do desenvolvimento de software contemporâneo, tudo isso sustentado pela gestão ágil de projetos', 'Nessa jornada, você vai explorar o conceito de Gherkin e a criação de testes automatizados usando a linguagem Java com o Framework Cucumber']::text[]
where id = 215 and cardinality(topics) = 1 and md5(topics[1]) = 'a9487af23db449f0f70e40f0ebad30fc'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 215);

update public.disciplines set topics = array['Durante este curso, você mergulhará na linguagem ANSI SQL e PL/SQL, desvendando sua versatilidade no contexto do banco de dados Oracle', 'Aprenderá sobre componentes cruciais, incluindo procedures, functions, packages, triggers, collections, PL/SQL tables, PL/SQL com Bulk processing, Autonomous transactions e Exception handling', 'Além disso, receberá orientações essenciais para aprimorar a otimização de consultas SQL', 'Navegue pelo mundo do MongoDB para aprofundar os conhecimentos em bancos de dados não relacionais', 'Do design sem esquema ao armazenamento flexível de documentos, você mergulhará no cerne do MongoDB e suas capacidades', 'Ganhe expertise em consultas usando a Linguagem de Consulta MongoDB (MQL), aprenda a realizar operações eficientes de CRUD e aproveite o poder dos pipelines de agregação para processamento avançado de dados', 'Explore o rico ecossistema do MongoDB e aprenda sobre índices, modelagem de dados e as melhores práticas para aplicações de alto desempenho', 'Domine conceitos como shard e replicação para garantir escalabilidade e disponibilidade de dados', 'Além disso, descubra a integração do MongoDB com linguagens de programação e estruturas populares']::text[]
where id = 216 and cardinality(topics) = 1 and md5(topics[1]) = '0272e46a1adda714d112033e12a00153'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 216);

update public.disciplines set topics = array['Aqui, mergulharemos na criação de soluções digitais incríveis que fazem toda a diferença', 'Prepare-se para uma jornada repleta de aprendizado valioso que vai elevar sua carreira no desenvolvimento de software', 'Vamos explorar o incrível mundo do framework', 'NET de maneira prática e detalhada', 'Usando a linguagem poderosa C#, você estará pronto para criar aplicações inovadoras que realmente brilham', 'Nós cobriremos todos os aspectos essenciais, desde a arquitetura até a criação de soluções que são eficientes e podem crescer junto com seus negócios']::text[]
where id = 217 and cardinality(topics) = 1 and md5(topics[1]) = 'f9bbc2b41eacf3499977f335fed94274'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 217);

update public.disciplines set topics = array['Explorando as mais recentes tendências tecnológicas que abrangem a Inteligência Artificial Generativa (IA Generativa), a Internet das Coisas (IoT) e a Internet do Comportamento (IoB), este curso introdutório oferece uma visão abrangente de conceitos emocionantes e aplicações inovadoras', 'Você terá a oportunidade de se aprofundar no mundo das placas de desenvolvimento, como Arduino e Raspberry Pi, que formam a base para a criação de projetos visionários', 'Além disso, serão exploradas tecnologias de conectividade essenciais, como Wifi, Bluetooth e RFID, que desempenham um papel fundamental na habilitação da comunicação entre dispositivos e na troca de informações na era da IoT', 'Você também ganhará compreensão sobre a arquitetura M2M (Máquina para Máquina) com MQTT, permitindo uma integração mais eficaz entre os dispositivos conectados']::text[]
where id = 218 and cardinality(topics) = 1 and md5(topics[1]) = '8301331bcb52d39e9d15ab3c2b92e28d'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 218);

update public.disciplines set topics = array['No módulo "Java Advanced", mergulhe em estratégias digitais de negócios habilitadas pela integração de aplicações e explore a construção de arquiteturas robustas orientadas a microsserviços', 'Este curso inovador expande seus horizontes para as tecnologias atuais, incorporando conceitos relevantes para o framework Spring e a arquitetura de microsserviços', 'Aprofunde-se no desenvolvimento de aplicações corporativas utilizando os renomados frameworks do universo Java, como JPA, Hibernate e, especialmente, o ecossistema Spring, incluindo Spring Boot, Spring Data e Spring Security', 'Explore as práticas modernas para a criação de microsserviços altamente eficazes e escaláveis, permitindo a integração flexível de aplicações', 'Ao final do curso, você estará preparado para enfrentar os desafios do desenvolvimento de software avançado e a criar soluções que impulsionam a inovação empresarial e a excelência técnica']::text[]
where id = 219 and cardinality(topics) = 1 and md5(topics[1]) = '98e6b53d14607d65576333175bc0f761'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 219);

update public.disciplines set topics = array['Mergulhe na criação de aplicativos para dispositivos móveis nas plataformas Android e iOS', 'Este curso o conduzirá pelo processo completo de desenvolvimento de Apps , permitindo que você conheça as funcionalidades específicas e atuais de cada plataforma, adquirindo conhecimento em conceitos como integração de APIs, design responsivo e otimização de desempenho']::text[]
where id = 220 and cardinality(topics) = 1 and md5(topics[1]) = '814436e5a2fef2a0628c7dcd8d3db93b'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 220);

update public.disciplines set topics = array['Desenvolvimento de aplicações para Data Science utilizando Python, abordando lógica de programação, pensamento computacional, estruturas de dados, programação orientada a objetos, manipulação e persistência de dados, integração com APIs e serviços externos, automação, desenvolvimento de aplicações interativas, versionamento de código e utilização de Inteligência Artificial como apoio ao desenvolvimento de software, preparando o estudante para construir soluções modernas orientadas por dados']::text[]
where id = 221 and cardinality(topics) = 1 and md5(topics[1]) = '9257d86861e5e0f6a90573a3cb461b44'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 221);

update public.disciplines set topics = array['Introdução aos fundamentos de Business Intelligence, Visual Analytics e Data Storytelling, com foco na compreensão de problemas de negócio, definição de indicadores, análise exploratória, construção de dashboards e comunicação de insights para apoiar a tomada de decisão baseada em dados']::text[]
where id = 222 and cardinality(topics) = 1 and md5(topics[1]) = '3e3c1c2c118c2956aed65a2b726e35ec'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 222);

update public.disciplines set topics = array['Aplicação de técnicas de análise exploratória de dados e fundamentos estatísticos para identificação de padrões, interpretação de resultados e suporte à tomada de decisão baseada em dados']::text[]
where id = 223 and cardinality(topics) = 1 and md5(topics[1]) = '1f0d2b318e73c1421dafc1abb8ceeab8'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 223);

update public.disciplines set topics = array['Modelagem conceitual e lógica de dados, implementação de bancos de dados relacionais e utilização de SQL para organização, consulta, integração e preparação de dados em cenários reais, com foco em Data Analytics e apoio da Inteligência Artificial para aumentar a produtividade e a qualidade das análises']::text[]
where id = 224 and cardinality(topics) = 1 and md5(topics[1]) = '804ade68a3cb30566c2b93e853997264'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 224);

update public.disciplines set topics = array['Introdução ao ecossistema moderno de dados, abordando os fundamentos de Big Data, bancos de dados relacionais e NoSQL, arquiteturas distribuídas, modelos modernos de armazenamento, Cloud Data e tecnologias utilizadas em ambientes analíticos escaláveis para suportar aplicações orientadas por dados']::text[]
where id = 225 and cardinality(topics) = 1 and md5(topics[1]) = 'ecb1de9fd994acdf98571b577937b967'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 225);

update public.disciplines set topics = array['Introdução aos conceitos fundamentais de Inteligência Artificial e Aprendizado de Máquina, abordando os principais paradigmas de Machine Learning, aplicações práticas, fundamentos da IA Generativa e seu uso inicial no contexto da análise de dados e da tomada de decisão baseada em dados']::text[]
where id = 226 and cardinality(topics) = 1 and md5(topics[1]) = '57073b31154f46785c8af03019855b6b'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 226);

update public.disciplines set topics = array['Construção de soluções que envolvam sustentabilidade e explorem a gestão no respeito e convivência com as diferenças sociais e culturais']::text[]
where id = 227 and cardinality(topics) = 1 and md5(topics[1]) = 'ed2e8a95a9c234515df39cdf2df1a120'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 227);

update public.disciplines set topics = array['Desenvolvimento de modelos de Machine Learning e técnicas de preparação de dados, com foco na construção, avaliação, validação e otimização de modelos preditivos', 'Aborda práticas de Feature Engineering e Feature Selection, ajuste de hiperparâmetros, interpretação e explicabilidade de modelos, preparando os estudantes para desenvolver soluções analíticas confiáveis e aplicadas a problemas reais']::text[]
where id = 228 and cardinality(topics) = 1 and md5(topics[1]) = '4a3b3619eacaf7a439a05742420e08ce'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 228);

update public.disciplines set topics = array['Desenvolvimento de pipelines de dados para ingestão, transformação, integração e disponibilização de informações em arquiteturas modernas', 'Aborda processos ETL e ELT, ingestão de dados em ambientes batch e streaming, orquestração, qualidade, monitoramento e observabilidade de pipelines, preparando dados para aplicações analíticas, Business Intelligence e Inteligência Artificial']::text[]
where id = 229 and cardinality(topics) = 1 and md5(topics[1]) = '2b0a277e02cd7f62fed9277e4fe5dc81'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 229);

update public.disciplines set topics = array['Estudo das principais arquiteturas e tecnologias de armazenamento de dados em ambientes modernos, abordando Data Warehouses, Data Lakes, Lakehouses e bancos NoSQL', 'Explora modelagem dimensional para ambientes analíticos, armazenamento distribuído, formatos modernos de armazenamento, Open Table Formats, desempenho, escalabilidade, governança e integração com plataformas de Analytics, Machine Learning e Inteligência Artificial']::text[]
where id = 230 and cardinality(topics) = 1 and md5(topics[1]) = '631edc558d1144ecfcb862c513c1cabe'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 230);

update public.disciplines set topics = array['Estudo dos fundamentos da Inteligência Artificial Generativa e sua aplicação no ecossistema de dados', 'Aborda a evolução do Machine Learning para o Deep Learning, os princípios das Redes Neurais, a arquitetura Transformer, mecanismos de Attention e os Grandes Modelos de Linguagem (LLMs)', 'Explora Prompt Engineering, embeddings, modelos multimodais, engenharia de contexto, agentes inteligentes, recuperação aumentada por geração (RAG), Fine-tuning (visão geral), avaliação de aplicações baseadas em IA Generativa e sua utilização em Business Intelligence, Analytics, Engenharia de Dados e Ciência de Dados']::text[]
where id = 231 and cardinality(topics) = 1 and md5(topics[1]) = 'f7885550db1695d3be1c292356ebadb4'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 231);

update public.disciplines set topics = array['Desenvolvimento, integração e disponibilização de soluções de dados e Inteligência Artificial em ambientes Cloud, utilizando APIs, conteinerização, serviços gerenciados e boas práticas de engenharia', 'Aborda: deploy de aplicações analíticas e modelos de IA, integração entre sistemas, automação, monitoramento, observabilidade, segurança, versionamento, CI/CD e fundamentos de MLOps para operacionalização de soluções escaláveis e confiáveis']::text[]
where id = 232 and cardinality(topics) = 1 and md5(topics[1]) = '3604b55591f9a028b63e0173b4782ff8'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 232);

update public.disciplines set topics = array['Estudo dos princípios de concepção, desenvolvimento, disponibilização e governança de Data Products, integrando dados, Analytics e Inteligência Artificial ao contexto organizacional', 'Aborda métricas de negócio, Product Analytics, gestão do ciclo de vida de produtos de dados, qualidade, catálogo, linhagem e governança de dados, Inteligência Artificial Responsável, ética, privacidade, segurança, conformidade, observabilidade e monitoramento de produtos de dados, preparando o estudante para desenvolver soluções que gerem valor ao negócio de forma segura, escalável e sustentável']::text[]
where id = 233 and cardinality(topics) = 1 and md5(topics[1]) = '2ec8dc198ac142cd7e271f7e65049f09'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 233);

update public.disciplines set topics = array['Introdução aos fundamentos do design visual, com ênfase na intersecção entre arte e tecnologia', 'Os alunos e alunas exploram processos criativos, estética, formas, cores e composição, utilizando ferramentas digitais e analógicas para expressar ideias visualmente']::text[]
where id = 234 and cardinality(topics) = 1 and md5(topics[1]) = '5238dc195ce538e55af6fcd160b35762'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 234);

update public.disciplines set topics = array['Desenvolvimento de habilidades técnicas e criativas na criação de ilustrações digitais', 'A disciplina aborda desde o desenho vetorial até a pintura digital, com foco na construção de personagens, cenários e conceitos visuais originais']::text[]
where id = 235 and cardinality(topics) = 1 and md5(topics[1]) = 'bf6ffb1987951621acab7e741ccffa9f'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 235);

update public.disciplines set topics = array['Estudo dos elementos visuais como linguagem', 'Os alunos e alunas aprendem a interpretar e criar mensagens visuais eficazes, explorando signos, símbolos, cultura visual e a construção de sentido na comunicação contemporânea']::text[]
where id = 236 and cardinality(topics) = 1 and md5(topics[1]) = '1e438f14914f17b1b5082a59db4ac422'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 236);

update public.disciplines set topics = array['Introdução às estratégias de marketing digital e atuação em redes sociais', 'A disciplina apresenta conceitos de branding, criação de conteúdo, análise de métricas e construção de presença digital para marcas e projetos criativos']::text[]
where id = 237 and cardinality(topics) = 1 and md5(topics[1]) = '5a4a18161500dc018826b5ee45ad8501'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 237);

update public.disciplines set topics = array['Exploração das técnicas de storytelling aplicadas à era da inteligência artificial generativa', 'Os alunos e alunas aprendem a construir narrativas envolventes, utilizando ferramentas de IA para criar roteiros, personagens e experiências interativas']::text[]
where id = 238 and cardinality(topics) = 1 and md5(topics[1]) = '1fa67e0e56aabcebd1ee4fc55f4d1241'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 238);

update public.disciplines set topics = array['Práticas de produção e edição de vídeo, da pré à pós-produção', 'A disciplina cobre roteiro, filmagem, enquadramento, iluminação, além da montagem e edição com softwares profissionais, preparando os alunos e alunas para a comunicação audiovisual contemporânea']::text[]
where id = 239 and cardinality(topics) = 1 and md5(topics[1]) = '89933446b36ba00e11e7698279080ebc'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 239);

update public.disciplines set topics = array['Introdução à modelagem, texturização e renderização em ambientes tridimensionais', 'Os alunos e alunas aprendem os fundamentos da arte 3D, criando objetos, cenários e personagens digitais para diferentes aplicações visuais']::text[]
where id = 240 and cardinality(topics) = 1 and md5(topics[1]) = '3d0d7845440e30ba65ada1cea744f7e7'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 240);

update public.disciplines set topics = array['Disciplina transversal que promove a reflexão crítica sobre questões sociais, ambientais e éticas', 'Estimula o desenvolvimento de projetos conscientes e sustentáveis, com foco no impacto positivo na sociedade e no meio ambiente']::text[]
where id = 241 and cardinality(topics) = 1 and md5(topics[1]) = '5937bf4cdaead6e999ebabbd74fdfbfd'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 241);

update public.disciplines set topics = array['Aprofundamento dos fundamentos do design com foco em animação gráfica', 'Os alunos e alunas aprendem a criar movimentos visuais dinâmicos e expressivos para vídeos, interfaces e conteúdos digitais']::text[]
where id = 242 and cardinality(topics) = 1 and md5(topics[1]) = '955649c962ce655a713df9eb3709da01'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 242);

update public.disciplines set topics = array['Criação de animações tridimensionais e efeitos visuais para cinema, jogos e experiências digitais', 'A disciplina explora rigging, simulações, partículas e integração de elementos 3D em vídeos reais']::text[]
where id = 243 and cardinality(topics) = 1 and md5(topics[1]) = '1dc18b2743e870bc4d5b3dbe3f82d8ba'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 243);

update public.disciplines set topics = array['Estudo do design centrado no usuário, com foco em usabilidade, prototipação e interfaces digitais', 'Os alunos e alunas aprendem a projetar experiências intuitivas e visuais atraentes para aplicativos, sites e sistemas interativos']::text[]
where id = 244 and cardinality(topics) = 1 and md5(topics[1]) = '04cc2b82521270cb9a8e99eeea3885be'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 244);

update public.disciplines set topics = array['Imersão no universo cinematográfico, da direção à pós-produção', 'Os alunos e alunas desenvolvem projetos autorais, explorando linguagem audiovisual, técnicas de filmagem e narrativa para diferentes formatos de vídeo']::text[]
where id = 245 and cardinality(topics) = 1 and md5(topics[1]) = '5e65002a2b8b91b0105a28f658c9c72c'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 245);

update public.disciplines set topics = array['Desenvolvimento de experiências imersivas utilizando ambientes tridimensionais', 'A disciplina aborda engines gráficas, realidade aumentada/virtual e design interativo, preparando os(as) participantes para o futuro da criação digital']::text[]
where id = 246 and cardinality(topics) = 1 and md5(topics[1]) = 'd50d35965608fd44f2a60c57ab9be331'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 246);

update public.disciplines set topics = array['Criação de produtos digitais e físicos com foco em inovação, funcionalidade e estética', 'Os alunos e alunas aprendem a transformar ideias em protótipos testáveis, utilizando técnicas de design thinking, modelagem 3D e fabricação digital']::text[]
where id = 247 and cardinality(topics) = 1 and md5(topics[1]) = '902394987fbedcd431c8500c868afa23'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 247);

update public.disciplines set topics = array['Estudo do ecossistema de creators e influencers, das dinâmicas de novas mídias digitais (redes sociais, streaming e web3), do mercado de e-sports e de sua convergência com a organização de eventos presenciais e on-line', 'Aborda estratégias de branding, monetização, métricas de performance, comportamento de audiência, gestão de comunidades e criação de experiências ao vivo ou híbridas', 'Discorre sobre modelos de negócio, patrocínio, regulamentação e tendências tecnológicas que moldam o entretenimento interativo contemporâneo']::text[]
where id = 248 and cardinality(topics) = 1 and md5(topics[1]) = 'b043997723438100e7d3facc8a99a91f'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 248);

update public.disciplines set topics = array['Idealize e crie conteúdo 3D para games, utilizando os principais softwares do mercado, entendendo conceitos de modelagem hard surface, UV, texturização, rigging e animação']::text[]
where id = 249 and cardinality(topics) = 1 and md5(topics[1]) = 'bb2cdc73e6fff6cc3741137a50d3eba5'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 249);

update public.disciplines set topics = array['Aprenda a desenvolver interfaces e aplicações Web focadas em UI (User Interface) e UX (User Experience)', 'Para isso, faremos uma imersão no desenvolvimento Front-end, ele é fundamental na criação de uma experiência online envolvente e eficaz, é através dele que criamos interfaces: bonitas, interativas, acessivas e usuais', 'Para isso usaremos as tecnologias e linguagens: HTML, CSS e Javascript em conjunto com o framework Front-end mais usado da Internet, o Bootstrap', 'Com todos esses recursos disponíveis, será muito mais fácil apresentar ao mundo, seu game studio e os jogos que você criará']::text[]
where id = 250 and cardinality(topics) = 1 and md5(topics[1]) = '8fd318e10f3e0df42f572322af4541e4'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 250);

update public.disciplines set topics = array['As interfaces estão presentes em nosso cotidiano expostas por telas de smartphones, aplicativos em smartTVs, sites e claro nos games', 'Você aprenderá conceitos de UX (experiência do usuário), técnicas de criação e prototipação, desenvolverá interfaces utilizando o Adobe Photoshop para manipular e criar imagens digitais, aplicando conceitos sobre tipografia e diagramação de layouts', 'Além disso, irá tratar texturas e fazer pinturas digitais aplicando os conceitos de cor e semiótica aos seus trabalhos', 'Por fim, realizará testes de usabilidade com aplicações dos fundamentos de UX Research']::text[]
where id = 251 and cardinality(topics) = 1 and md5(topics[1]) = '29754bbfc15cd3124d069b1e6763da0f'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 251);

update public.disciplines set topics = array['Desenvolva habilidades para resolução de problemas e criação de algoritmos aplicada a linguagem de programação C#, transformando código em experiências interativas divertidas', 'Utilizando o game engine Unity, você irá desenvolver jogos com as mais variadas mecânicas e terá ao final, alguns jogos que será usado na composição de um portfólio, algo essencial para o ingresso no mercado de trabalho', 'Tenha a máquina sob seu comando e transforme códigos em pura diversão']::text[]
where id = 252 and cardinality(topics) = 1 and md5(topics[1]) = '32cf4a57360e1a18d8a8dd8fa495e71b'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 252);

update public.disciplines set topics = array['Desenvolva roteiro para games com as mais consagradas pipelines de produção, como a jornada do herói de Campbell, recontada pelo roteirista da Disney, Vogler, utilizada em Star Wars e nos maiores blockbusters de games', 'Trabalhe com criação de personagens e de mundos fantásticos', 'Adentre o cativante universo da roteirização para jogos eletrônicos e descubra técnicas renomadas que permitiram criar roteiros impactantes, como os encontrados em jogos como “The Last of Us” e “The Witcher 3”, capturando a atenção dos jogadores e deixando uma marca inesquecível']::text[]
where id = 253 and cardinality(topics) = 1 and md5(topics[1]) = '4827c74336882d06c6b0d568bb8d21ed'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 253);

update public.disciplines set topics = array['Partindo desde a primeira ideia ou Game Concept até o game finalizado, é trabalho do Game Designer entender todos os aspectos da produção e utilizar esse conhecimento a seu favor', 'Aprenda como o Game Designer define a experiência do jogo e seus pilares, descrevendo todos os aspectos necessários em cada uma das disciplinas (Narrativa, Sistema, Level e Balance) e as melhores formas para passar essas informações para o time de desenvolvimento']::text[]
where id = 254 and cardinality(topics) = 1 and md5(topics[1]) = '7186de242061b08e9e57bfd836fff895'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 254);

update public.disciplines set topics = array['A disciplina apresenta os fundamentos dos eSports, abordando sua origem, evolução histórica e relação com os avanços tecnológicos que transformaram os jogos eletrônicos em uma indústria competitiva global', 'Você conhecerá as principais modalidades e gêneros competitivos, vivenciando experiências práticas em diferentes gêneros de jogos como: Battle Royale, FPS, RTS e MOBA', 'Também serão explorados o ecossistema dos eSports, mercado, carreira, seus atores, modelos de monetização, publicidade, patrocínios, organização e planejamento de torneios, além de temas relacionados à ética, comportamento e saúde']::text[]
where id = 255 and cardinality(topics) = 1 and md5(topics[1]) = '4c75e188e12ab126c58a6c58f750a831'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 255);

update public.disciplines set topics = array['Aspectos sociais como: TI verde, sustentabilidade e questões étnicas nas empresas são habilidades que trabalharemos nesta disciplina', 'Você poderá construir games que envolvam sustentabilidade e gestão na convivência com as diferenças sociais e culturais']::text[]
where id = 256 and cardinality(topics) = 1 and md5(topics[1]) = '8cfbe552966303ee33fd099e992da0e9'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 256);

update public.disciplines set topics = array['O desenvolvimento de jogos para dispositivos móveis utilizando a Unity envolve uma variedade de matérias e tópicos importantes, desde gráficos e arte 2D/3D para otimizar os ativos visuais, interação multitouch capaz de implementar controles táteis e gestuais, otimização de desempenho para garantir que o jogo seja executado suavemente em dispositivos com recursos limitados, monetização, integração de plataformas móveis, redes sociais e muito mais', 'Esses são alguns dos tópicos fundamentais para desenvolver jogos móveis bem-sucedidos na Unity', 'A combinação de habilidades de programação, design e otimização é essencial para criar jogos atraentes e de alto desempenho para dispositivos móveis']::text[]
where id = 257 and cardinality(topics) = 1 and md5(topics[1]) = 'cc87537cfa01d94024bb778a366bb594'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 257);

update public.disciplines set topics = array['O campo de Tech Art, abreviação de Technical Art ou Arte Técnica, é uma disciplina dentro da indústria de jogos e mídia interativa que combina habilidades artísticas com conhecimento técnico para criar ativos visuais e sistemas interativos de alta qualidade', 'Os Tech Artists desempenham um papel fundamental na produção de jogos, filmes e outras formas de entretenimento digital, garantindo que a arte seja otimizada, funcione corretamente e seja visualmente impressionante']::text[]
where id = 258 and cardinality(topics) = 1 and md5(topics[1]) = '4b562bd6359b6e609cb474eb44686851'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 258);

update public.disciplines set topics = array['Explore todas as possibilidades do audiovisual e refine a experiência de seus jogos, você irá aprender sobre o processo criativo voltado para a música e sound design, através de técnicas e tecnologias especializadas nestas competências, dentre estas: a utilização de uma DAW, a criação de efeitos sonoros e técnicas gerais de mixagem e masterização', 'Tudo para manter os ouvidos do jogador bem atentos aos sons que compõem o universo do jogo, além disso o conteúdo desta disciplina lhe auxiliará, igualmente, a produzir não apenas trailers e cutscenes cativantes como também peças audiovisuais de divulgação de seu próprio jogo, direcionando o olhar do jogador e a forma como fazer isso de modo mais eficiente']::text[]
where id = 259 and cardinality(topics) = 1 and md5(topics[1]) = '7ca7fb504bdca6ce728d2f4df5e4979d'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 259);

update public.disciplines set topics = array['Aprenda a lidar com o desenvolvimento em diversas plataformas como: Mobile, consoles, desktop e até mesmo realidade virtual e aumentada, todas por meio do game engine Unity', 'Desenvolva os desafios de seu jogo com uso de algoritmos de inteligência artificial, fazendo com que agentes possam reconhecer o espaço virtual e fazer tomadas de decisão', 'Entenda as pipelines de render, criação de materiais e iluminação em tempo real, dando aos ambientes de suas experiencias um visual muito atrativo, indo do estilizado ao realista, conhecimento importante para que seu jogo possa performar de forma adequada de acordo com o processamento do equipamento no qual ele irá funcionar', 'Tudo isso pode ficar melhor ainda quando a imersão aumenta e aquele mundo antes visto em uma tela, passa a estar ao seu redor por meio de recursos de realidade virtual e aumentada', 'Leve o jogador a fazer realmente parte de jogo']::text[]
where id = 260 and cardinality(topics) = 1 and md5(topics[1]) = '28d85b50a0e6ce861e4feb6f68d047ce'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 260);

update public.disciplines set topics = array['Evolua suas habilidades em modelagem criando personagens e cenários diversos, e deixando seus assets preparados para serem usado em uma Game Engine', 'Conhecimentos de UV, texturização, rigging e animação serão expandidos como você nunca viu antes!']::text[]
where id = 261 and cardinality(topics) = 1 and md5(topics[1]) = '4be10e143af613b160ee967605dc9bc8'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 261);

update public.disciplines set topics = array['Crie levels poderosos, trabalhe com a engine Unreal para construção do level design e gameplay', 'Engine é a ferramenta em que construímos um jogo onde incluímos os assets de arte, som, física e por meio de blueprint ativar uma experiência incrível', 'Utilize ferramentas que farão seu jogo criar vida']::text[]
where id = 262 and cardinality(topics) = 1 and md5(topics[1]) = 'f21e8e510f62032e361270acc8e44fb5'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 262);

update public.disciplines set topics = array['Aumente suas oportunidades de atuação no mercado, o mundo é mobile, desenvolva Apps para dispositivos móveis da Apple, aprenda os conceitos de programação orientada a objetos utilizando classes, heranças, protocolos e muito mais, faça uso dos mais diversos componentes, acesse dados via serviços Web utilizando Json, use serviços de autenticação na nuvem, aprenda como os dados podem ser armazenados localmente ou em nuvem, crie mapas com rotas, conheça o ecossistema de sensores e multimídia, tudo isso com linguagem de programação nativa Swift']::text[]
where id = 263 and cardinality(topics) = 1 and md5(topics[1]) = '0506a357016df286c6520df168ce7628'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 263);

update public.disciplines set topics = array['Transforme suas ideias em realidade, aprenda a trilhar o caminho do sucesso nos negócios do futuro, desde o planejamento à publicação de jogos, dominando os princípios fundamentais das startups e todo seu ecossistema, transformando o seu jogo em um produto de sucesso', 'Prepare-se para inovar, liderar e prosperar no cenário empresarial de jogos']::text[]
where id = 264 and cardinality(topics) = 1 and md5(topics[1]) = 'e637f2cd0eca5f9b1a06f7b67543e94e'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 264);

update public.disciplines set topics = array['Modelos de processos de desenvolvimento e técnicas de gerenciamento e planejamento de software', 'Requisitos, especificação e garantia de qualidade de software']::text[]
where id = 265 and cardinality(topics) = 1 and md5(topics[1]) = 'c2ddc9048583b277d4a5eb875598b98a'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 265);

update public.disciplines set topics = array['Engenharia de dados', 'Métodos matemáticos e estatísticos sobre um volume crescente de dados, mais técnicas de Data Mining e Machine Learning', 'O Cientista de Dados obtém respostas e, principalmente, formula as perguntas certas', 'Análise dados voltada à tomada de decisão em negócios', 'Ferramentas para tomada da decisão', 'Metodologia da pesquisa e processos estatísticos de abordagem, censo e estimação, questionário e observações científicas, população e amostra, variáveis qualitativas e quantitativas, discretas e contínuas, estatística descritiva, estatística indutiva (inferência)', 'Gráficos', 'Séries estatísticas']::text[]
where id = 266 and cardinality(topics) = 1 and md5(topics[1]) = '6da1e4020875c9bd68eb7e1fa99f7241'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 266);

update public.disciplines set topics = array['Noções Preliminares de Direito', 'Constituição de Empresas e Lei das Sociedades Anônimas', 'Normas Trabalhistas: CLT, Organização Sindical e Terceirização', 'Normas de Proteção ao Consumidor e aos Direitos Autorais', 'Direito Ambiental e Bioética']::text[]
where id = 267 and cardinality(topics) = 1 and md5(topics[1]) = '08ef2b46abc016a24cafeb6763b8ef93'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 267);

update public.disciplines set topics = array['Aplicação dos fundamentos dos modelos de negócios tradicionais e dos novos modelos na análise e elaboração de negócios competivos']::text[]
where id = 268 and cardinality(topics) = 1 and md5(topics[1]) = 'a6f00b7c6d6c36ff9e7fb13c499e111a'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 268);

update public.disciplines set topics = array['Gerenciamento da central de serviços, das dimensões do processo de serviços, dos riscos (incidentes e problemas), das mudanças e da continuidade']::text[]
where id = 269 and cardinality(topics) = 1 and md5(topics[1]) = '44379140aa225f5920d91b969fa6c441'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 269);

update public.disciplines set topics = array['Normas, processos e indicadores de desempenho para a área de TI, utilizando os modelos de apoio para governança de TI como COBIT e ITIL']::text[]
where id = 270 and cardinality(topics) = 1 and md5(topics[1]) = 'd21714c07902a7c30452222ffc36d591'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 270);

update public.disciplines set topics = array['Visão estratégica do marketing online: elaboração e avaliação de uma campanha']::text[]
where id = 271 and cardinality(topics) = 1 and md5(topics[1]) = '95a7570131c521d8979f795ec6cf7388'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 271);

update public.disciplines set topics = array['Tecnologias exponenciais e seus impactos no ambiente empresarial', 'Inteligência Artificial, Robótica, Big Data, Biotecnologia e outras tecnologias que transformaram a economia e as empresas nos próximos anos', 'Análise dos impactos das novas tecnologias nas empresas', 'A chegada da geração millennials nas empresas', 'Nova cultura organizacional', 'Novos modelos organizacionais e de negócios', 'Digitalização dos negócios']::text[]
where id = 272 and cardinality(topics) = 1 and md5(topics[1]) = '9bf6c1976fd0e27357ebc3aca1ea5109'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 272);

update public.disciplines set topics = array['Construção de soluções que envolvam sustentabilidade e explorem a gestão no respeito e convivência com as diferenças sociais e culturais']::text[]
where id = 273 and cardinality(topics) = 1 and md5(topics[1]) = 'ed2e8a95a9c234515df39cdf2df1a120'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 273);

update public.disciplines set topics = array['Direito cibernético, melhores práticas na área de TI e sobre a interatividade dos princípios de direito e suas aplicações, especialmente focados nas inúmeras atividades da tecnologia da informação']::text[]
where id = 274 and cardinality(topics) = 1 and md5(topics[1]) = '75aec109be88aaa7c8debcaad2e19e7c'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 274);

update public.disciplines set topics = array['Conceitos e definições sobre gestão de pessoas e liderança nas organizações', 'Como fazer o RH ser digital? As práticas de RH no mundo digital – Como ficam a avaliação de desempenho, a meritocracia, o processo seletivo, a integração e a demissão HR Analytics – Quando é o momento e como usar a favor do RH HR Techs - Tecnologias que estão ajudando o RH a inovar seus processos']::text[]
where id = 275 and cardinality(topics) = 1 and md5(topics[1]) = 'b4b1bc0208eba06daf393c856f071cc4'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 275);

update public.disciplines set topics = array['Principais ferramentas, equipamentos e softwares utilizados para proteger as informações e aprender a gerenciar o departamento das empresas que operam com segurança da informação']::text[]
where id = 276 and cardinality(topics) = 1 and md5(topics[1]) = '76c53bebfa093cfe7132dce758fe1c1b'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 276);

update public.disciplines set topics = array['Tecnologias emergentes decisivas no mundo corporativo']::text[]
where id = 277 and cardinality(topics) = 1 and md5(topics[1]) = 'a7bcca9fa2a6a667ffee98d3b7ee429a'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 277);

update public.disciplines set topics = array['Questões financeiras relevantes em qualquer departamento de TI']::text[]
where id = 278 and cardinality(topics) = 1 and md5(topics[1]) = 'aff825737ad282cbd43cb472c85342b6'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 278);

update public.disciplines set topics = array['Visões estratégicas, táticas/analíticas e operacionais os painéis de resultados e relatórios da alta gestão da empresa', 'Assim, você vai poder colocar em prática técnicas de diagramação, construção de diferentes storytellings e aplicações de cada tipo de gráfico e formação de paleta de cores', 'Planejamento Estratégico']::text[]
where id = 279 and cardinality(topics) = 1 and md5(topics[1]) = '514e24b462ac7f21c04796fcde645539'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 279);

update public.disciplines set topics = array['Conceitos e prática de empreendedorismo', 'Criação de Startups de base tecnológica']::text[]
where id = 280 and cardinality(topics) = 1 and md5(topics[1]) = '1b0189c58b8a9bd45f9ceeccbff9eddb'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 280);

update public.disciplines set topics = array['Introdução estratégica à Inteligência Artificial no contexto empresarial', 'Análise de como a IA transforma setores como finanças, saúde, varejo, indústria e serviços', 'Estudo de maturidade digital, vantagem competitiva, posicionamento estratégico e identificação de oportunidades de aplicação']::text[]
where id = 281 and cardinality(topics) = 1 and md5(topics[1]) = '568b7b575149c96f0d182f2917d6407d'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 281);

update public.disciplines set topics = array['Desenvolvimento de raciocínio estruturado aplicado à IA', 'Modelos de Machine Learning e IA Generativa, incluindo conceitos como treinamento, inferência, viés algorítmico, qualidade de dados, limitações técnicas e impacto operacional', 'Base conceitual para tomada de decisão estratégica sem foco em programação']::text[]
where id = 282 and cardinality(topics) = 1 and md5(topics[1]) = '59d67983ef837706b9a947f4a2e27ce4'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 282);

update public.disciplines set topics = array['Fundamentos de cultura orientada por dados', 'Estruturação de KPIs estratégicos, governança de dados, business intelligence e análise de performance organizacional', 'Aplicação de ferramentas corporativas para apoiar decisões executivas baseadas em dados']::text[]
where id = 283 and cardinality(topics) = 1 and md5(topics[1]) = 'e84b759421bfc635366dc37400e20ccb'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 283);

update public.disciplines set topics = array['Criação, validação e gestão de produtos e serviços com IA', 'Desenvolvimento de roadmaps estratégicos, definição de métricas de sucesso, análise de viabilidade financeira, monetização e escalabilidade de soluções em empresas']::text[]
where id = 284 and cardinality(topics) = 1 and md5(topics[1]) = '68e6bad2a22c654672b44116d33a0609'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 284);

update public.disciplines set topics = array['Estruturação de governança para IA em organizações', 'Políticas, papéis e processos de accountability para gestão estratégica de iniciativas de IA', 'Estudo de frameworks internacionais de governança e Responsible AI, gestão de riscos organizacionais e implementação de diretrizes para uso ético, transparente e responsável da Inteligência Artificial em ambientes corporativos']::text[]
where id = 285 and cardinality(topics) = 1 and md5(topics[1]) = '4b63a0ac4e96f3cded77e21699852a7c'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 285);

update public.disciplines set topics = array['Aplicação estratégica de Prompt Engineering em ambientes corporativos', 'Desenvolvimento de prompts orientados a objetivos de negócio, controle de contexto e mitigação de riscos em sistemas baseados em LLMs', 'Integração de IA generativa com automação de processos e copilots corporativos para ganho de eficiência, produtividade e inovação organizacional']::text[]
where id = 286 and cardinality(topics) = 1 and md5(topics[1]) = 'a28f216db3e43a46afdb397c72ba00a1'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 286);

update public.disciplines set topics = array['Desenvolvimento de competências de liderança para ambientes de transformação digital', 'Gestão de times técnicos e multidisciplinares, comunicação executiva, gestão de stakeholders e construção de cultura organizacional orientada por Inteligência Artificial']::text[]
where id = 287 and cardinality(topics) = 1 and md5(topics[1]) = '23e7de3bbedb99f2a44012d2a9382f17'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 287);

update public.disciplines set topics = array['Reflexão crítica sobre os impactos sociais, culturais e ambientais da Inteligência Artificial', 'Desenvolvimento de soluções responsáveis e inclusivas, alinhadas a princípios de ética, diversidade, sustentabilidade e responsabilidade corporativa']::text[]
where id = 288 and cardinality(topics) = 1 and md5(topics[1]) = '98be7ec62359d39ef174323fa7fdfc9e'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 288);

update public.disciplines set topics = array['Estruturação do modelo operacional e da arquitetura organizacional para adoção de IA em empresas', 'Definição de AI Operating Model, integração entre dados, tecnologia e áreas de negócio, desenho de estruturas para escalabilidade de iniciativas de IA', 'Planejamento da arquitetura corporativa de IA, alinhamento com plataformas tecnológicas e coordenação entre times técnicos e estratégicos para implementação sustentável de soluções inteligentes']::text[]
where id = 289 and cardinality(topics) = 1 and md5(topics[1]) = '7f94c6ea5770f7b55f42362205d4ae2d'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 289);

update public.disciplines set topics = array['Priorização de investimentos, definição de OKRs, análise de ROI, gestão orçamentária e acompanhamento de múltiplas iniciativas de IA em ambientes corporativos complexos']::text[]
where id = 290 and cardinality(topics) = 1 and md5(topics[1]) = '58610b00373a30d0c82528f4bacc6da7'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 290);

update public.disciplines set topics = array['Estratégias avançadas de produtos e serviços baseados em IA', 'Escalabilidade, monetização, plataformas digitais, data network effects e posicionamento competitivo em mercados globais']::text[]
where id = 291 and cardinality(topics) = 1 and md5(topics[1]) = '54cf8a2c4fa22083dad2439b94958b23'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 291);

update public.disciplines set topics = array['Gestão de riscos técnicos associados ao desenvolvimento e operação de sistemas de IA', 'Identificação e mitigação de vieses algorítmicos, falhas de modelos e riscos operacionais', 'Segurança aplicada a sistemas de IA e modelos generativos, incluindo proteção contra ataques adversariais e vazamento de dados', 'Aplicação de práticas de auditoria, validação e monitoramento contínuo de modelos para garantir confiabilidade e robustez em ambientes corporativos']::text[]
where id = 292 and cardinality(topics) = 1 and md5(topics[1]) = '5c166d131e83446f5ae29f8ea5cde189'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 292);

update public.disciplines set topics = array['Estratégias para seleção e adoção de plataformas de Inteligência Artificial em ambientes corporativos', 'Avaliação de ecossistemas tecnológicos globais como Microsoft, Google, AWS, IBM, Oracle, SAP e Salesforce', 'Análise de trade-offs entre soluções proprietárias, open source e desenvolvimento interno', 'Estratégias de arquitetura de plataformas, gestão de dependência tecnológica (vendor lock-in), integração entre sistemas e definição do AI technology stack para escalabilidade e competitividade organizacional']::text[]
where id = 293 and cardinality(topics) = 1 and md5(topics[1]) = 'cb7bf9eeef304d641061ce827838e4c1'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 293);

update public.disciplines set topics = array['Análise econômica da IA como ativo estratégico', 'Modelagem econômica e de investimentos', 'Capex vs Opex', 'Valuation de projetos de IA', 'Estrutura de custos, decisões de investimento, impacto financeiro e construção de vantagem competitiva sustentável baseada em dados']::text[]
where id = 294 and cardinality(topics) = 1 and md5(topics[1]) = '4d04f5597ba8d4ccc5b3c30f71d8b2f4'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 294);

update public.disciplines set topics = array['Análise do ambiente regulatório da IA em nível nacional e internacional', 'Estudo de legislações e marcos regulatórios como LGPD, GDPR e AI Act, além de diretrizes globais para uso responsável da IA', 'Avaliação das implicações jurídicas da adoção de sistemas inteligentes e desenvolvimento de estratégias corporativas de adaptação às novas regulações da economia orientada por IA']::text[]
where id = 295 and cardinality(topics) = 1 and md5(topics[1]) = 'd88896905fe7c527ccd253e8d09f4f8e'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 295);

update public.disciplines set topics = array['Governança de dados, arquitetura empresarial, integração entre sistemas, data strategy e alinhamento entre dados e objetivos estratégicos da organização']::text[]
where id = 296 and cardinality(topics) = 1 and md5(topics[1]) = '22742f73ac82ac9928480694166db0fd'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 296);

update public.disciplines set topics = array['Simulações executivas de tomada de decisão em nível C-Level', 'Gestão de stakeholders, comunicação estratégica, negociação e liderança de programas corporativos de Inteligência Artificial']::text[]
where id = 297 and cardinality(topics) = 1 and md5(topics[1]) = '736b9603059f6833889159dc82d182de'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 297);

update public.disciplines set topics = array['Introdução à IA, aplicações e conceitos de modelagem geral', 'Você aprenderá sobre agentes inteligentes, agentes especialistas e geolocalização', 'Além disso, nesta disciplina você desenvolve um challenge com uma empresa real de mercado, prototipando soluções e resolvendo problemas práticos e aplicados']::text[]
where id = 298 and cardinality(topics) = 1 and md5(topics[1]) = '55396797afa4b4722a0edb603ab02be2'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 298);

update public.disciplines set topics = array['Entenda o funcionamento dos sistemas computacionais e desenvolva modelos de IA para incorporá-los em dispositivos como Raspberry Pi e ESP32', 'Você conhecerá também como coletar dados de sensores em singleboard computers e como usar modelos de IA para tomada de decisão']::text[]
where id = 299 and cardinality(topics) = 1 and md5(topics[1]) = '10ff08f2368b4629dc2594a185310b35'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 299);

update public.disciplines set topics = array['Entenda a importância dos dados e o conceito de banco de dados, modelos, políticas, regras e normas para coleta, armazenagem, ordenação e integração de dados, além de técnicas para extração de dados em bases']::text[]
where id = 300 and cardinality(topics) = 1 and md5(topics[1]) = 'fa0563123f7220bf3b7ff9fba810acb4'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 300);

update public.disciplines set topics = array['Conceitos de lógica, modelagem matemática de sistemas físicos, inferência, lógica Fuzzy e técnicas de otimização', 'Aprenda técnicas de aprendizado de máquina como a regressão linear, regressão logística e árvores de decisão']::text[]
where id = 301 and cardinality(topics) = 1 and md5(topics[1]) = 'edefd5036addd22c46a86cc31f9043a7'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 301);

update public.disciplines set topics = array['Os hackers ainda estão encontrando maneiras de violar medidas de segurança nas organizações', 'Todo o arcabouço da inteligência artificial é o meio para novas implementações cognitivas que possam proteger de forma eficiente os dados das empresas']::text[]
where id = 302 and cardinality(topics) = 1 and md5(topics[1]) = '3af516ec4284a264b98ff08596d2eaea'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 302);

update public.disciplines set topics = array['Conheça a abordagem das principais plataformas cognitivas da atualidade, como IBM Cloud, Microsoft Azure, Amazon Web Services e Google Cloud']::text[]
where id = 303 and cardinality(topics) = 1 and md5(topics[1]) = '4e575796ffcf24cd1191cd6f24adedcf'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 303);

update public.disciplines set topics = array['Aprenda a utilizar neurociência, redes neurais artificiais, algoritmos de otimização e frameworks como o TensorFlow', 'Entenda conceitos como Reinforcement Learning, algoritmos evolucionários e algoritmos genéticos']::text[]
where id = 304 and cardinality(topics) = 1 and md5(topics[1]) = '78d5cb1bc620596b4a3a5d3aa00c1ff5'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 304);

update public.disciplines set topics = array['Os algoritmos estão inseridos em quase tudo na nossa vida', 'Podemos encontrá-los em computadores, notebooks, tablets, smartphones, TVs inteligentes, robôs e muitos outros equipamentos', 'Entenda como construir soluções eficientes para diversos problemas computacionais em uma das principais linguagens da atualidade: PYTHON']::text[]
where id = 305 and cardinality(topics) = 1 and md5(topics[1]) = 'c29b182b57fed7222be0e334b7e8ecd6'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 305);

update public.disciplines set topics = array['Aprenda conceitos de estatística e probabilidade a partir da utilização da linguagem R', 'Análise de dados e análise preditiva']::text[]
where id = 306 and cardinality(topics) = 1 and md5(topics[1]) = 'c1ab83f67bd5243fc1c1ff851c865227'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 306);

update public.disciplines set topics = array['Construção de soluções que envolvam sustentabilidade e explorem a gestão no respeito e convivência com as diferenças sociais e culturais']::text[]
where id = 307 and cardinality(topics) = 1 and md5(topics[1]) = 'ed2e8a95a9c234515df39cdf2df1a120'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 307);

update public.disciplines set topics = array['Entenda os modelos generativos, como funciona o chatGPT, o Dall-e, Bard e tantos outros modelos', 'Aprenda sobre os transformers, as redes de correspondência generativa (GANs)', 'Evolua com outras redes avançadas e novos modelos de IA']::text[]
where id = 308 and cardinality(topics) = 1 and md5(topics[1]) = '4e2f67454262077e2692648239a8f6d9'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 308);

update public.disciplines set topics = array['Aprenda sobre desenvolvimento mobile frontend para exibição de dados, coleta de informações e deploy de soluções em IA', 'Desenvolva aplicativos mobile low-code/no-code para entregas rápidas de soluções']::text[]
where id = 309 and cardinality(topics) = 1 and md5(topics[1]) = '605c34dfcbfd7c80b56f3ad998e576e5'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 309);

update public.disciplines set topics = array['Introdução à visão computacional', 'Entenda o conceito de imagens, OPENCV, técnicas de convolução, deep neural networks, filtros e processamento de sinais']::text[]
where id = 310 and cardinality(topics) = 1 and md5(topics[1]) = '76afa050ff720320bdb611697ff32ce4'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 310);

update public.disciplines set topics = array['Introdução à computação física, sistemas Arduino, dispositivos eletrônicos, robótica, automação, sensores e atuadores', 'Conheça elementos de robótica e IoT, como edge computing e edge analytics, e como utilizar dispositivos para captura de dados e processamento local de informação']::text[]
where id = 311 and cardinality(topics) = 1 and md5(topics[1]) = '15b87310d3ab69de55b3b2e663519767'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 311);

update public.disciplines set topics = array['Conceitos de computação quântica', 'Aplicações', 'Aplicação de inteligência artificial em arquiteturas quânticas buscando o desenvolvimento de soluções unindo a computação quântica com todos os recursos da IA']::text[]
where id = 312 and cardinality(topics) = 1 and md5(topics[1]) = 'f85299e5b60daa997a3abcb192665f6d'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 312);

update public.disciplines set topics = array['Descubra a importância dos sistemas computacionais no desempenho de soluções de IA', 'Entenda o papel dos supercomputadores, dos clusters, das GPUs, dos elementos de hardware, computação neuromórfica e computação fotônica']::text[]
where id = 313 and cardinality(topics) = 1 and md5(topics[1]) = '2da422f7e5fd6e3db58990d245456483'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 313);

update public.disciplines set topics = array['Interpretação de linguagem natural e semântica, análise de sentimentos e construção de chatbots usando dialogFlow e outros frameworks, desde a implementação, aos testes e a verificação']::text[]
where id = 314 and cardinality(topics) = 1 and md5(topics[1]) = 'fc436d67a5a257b9ff99b4f10258c99e'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 314);

update public.disciplines set topics = array['Aprenda a desenvolver processos para automação de tarefas repetitivas e técnicas para determinação do fluxo de trabalho e tomadas de decisão', 'Conheça sobre processos empresariais, sistemas RPA e integração com soluções de IA, como chatGPT']::text[]
where id = 315 and cardinality(topics) = 1 and md5(topics[1]) = '8adae3de0d89261e86aae5af5ad01a55'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 315);

update public.disciplines set topics = array['Aprenda técnicas para governança em IA, business intelligence, visualização de dados e business analytics']::text[]
where id = 316 and cardinality(topics) = 1 and md5(topics[1]) = '7a25a83a509e01ab7193c2bf60bea11d'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 316);

update public.disciplines set topics = array['Conceito de computação cognitiva', 'A Inteligência Artificial aplicada aos modelos de negócios', 'Modelos de atendimento ao cliente pela utilização da computação cognitiva', 'Aqui você entenderá como as tecnologias associadas à inteligência artificial contribuem para uma campanha de marketing', 'Vivemos a era do Marketing 5.0, em que as tecnologias fazem parte do marketing, assim o ambiente de IAs generativas (tais como: Chat GPT, DALL-E, Bard e outras) deve ser utilizado como alavancador de negócios digitais']::text[]
where id = 317 and cardinality(topics) = 1 and md5(topics[1]) = '6b8111b2dc1419efc0d6a2a9ebb089f6'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 317);

update public.disciplines set topics = array['Introdução ao Marketing. 4Ps do Marketing, 8Ps do Marketing, conceito de Inbound Marketing (conhecido como o marketing da atração), Inbound Marketing, Funil de vendas, Precificação e promoção, comportamento do cliente, formação de persona, gamificação a favor do marketing, SEO, utilização de palavras-chave e como se posicionar no mercado']::text[]
where id = 318 and cardinality(topics) = 1 and md5(topics[1]) = '2feccfce34e5870602ff324792caf306'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 318);

update public.disciplines set topics = array['Introdução aos Conceitos Básicos: metodologia da pesquisa e processos estatísticos de abordagem, censo e estimação, questionário e observações científicas, população e amostra, variáveis qualitativas e quantitativas, discretas e contínuas, estatística descritiva, estatística indutiva (inferência)', 'Gráficos', 'Séries estatísticas', 'Preparação de dados para análises estatísticas', 'Estatística Descritiva', 'Representação gráfica de séries estatísticas', 'Aqui você entenderá sobre dados e como os eles auxiliam na tomada de decisão, tal como tomar essas decisões no marketing da sua empresa e na concepção de um produto']::text[]
where id = 319 and cardinality(topics) = 1 and md5(topics[1]) = '616bedc0f21def6a1c2b709bc71ba1be'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 319);

update public.disciplines set topics = array['O objetivo dessa disciplina é que você entenda todo o processo de como os dados são gerados e como utilizar a ciência de dados no processo de decisão como profissional de marketing', 'Introdução à linguagem R', 'Modelos Preditivos', 'Analytics', 'Data Warehouse e Data Marts', 'ETL - Extract, Transform, Load', 'Data mining e Machine Learning', 'Big Data, Trends & Predictions', 'Computing and Data Analysis']::text[]
where id = 320 and cardinality(topics) = 1 and md5(topics[1]) = '32c8110c6824f8db54ef17e7d8a18549'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 320);

update public.disciplines set topics = array['Aplicação dos fundamentos dos modelos de negócios tradicionais e dos novos modelos na análise e elaboração de negócios competitivos', 'Entender como ser um bom estrategista na hora de montar e de vender o seu negócio', 'Domínio de técnicas para ser um bom negociador']::text[]
where id = 321 and cardinality(topics) = 1 and md5(topics[1]) = 'c1f9beaad607f3338f8fe461a8b8ee9d'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 321);

update public.disciplines set topics = array['Nessa disciplina apresentamos a utilização de diversas tecnologias a favor do marketing de beacons e realidade virtual até a internet das coisas', 'Vivemos a era do marketing 5.0, em que a tecnologia é parte integrante essencial das campanhas de marketing', 'Conceito de Internet of Things e como o IoT pode e é integrado ao marketing por diversas marcas e produtos', 'Abordagem ao conceito de Internet of Things, planejamento do Marketing Digital com aplicação de dispositivos para captura e gestão de dados e BI analytics aplicados a dispositivos eletrônicos']::text[]
where id = 322 and cardinality(topics) = 1 and md5(topics[1]) = 'aa0dd570587071b9ece2f37d9a5e6bbe'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 322);

update public.disciplines set topics = array['Domínio das atuais redes sociais', 'Passando pelo planejamento, produção e gestão de conteúdo das redes sociais tal como o entendimento do funcionamento atual dos algoritmos de rankeamento das redes sociais', 'Técnicas de rankeamento e posicionamento de marca nas redes sociais']::text[]
where id = 323 and cardinality(topics) = 1 and md5(topics[1]) = '3f5c41b0732c3ea680d8a02931f6f457'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 323);

update public.disciplines set topics = array['Sabemos o quanto a experiência do usuário é fundamental na hora da decisão de compra', 'Para tal, você entenderá nessa disciplina a jornada do usuário completa, passando desde a descoberta da marca nas redes sociais até o pós-venda', 'Veremos aqui fundamentos de UX que vão desde as Heurísticas de Nielsen aos Fundamentos de Norman, Design Thinking, Teoria do Diamante Duplo, User Interface, Acessibilidade e UX Writing', 'Visão estratégica do marketing online: elaboração e avaliação estratégias de marketing em dispositivos mobile', 'Vivemos em um mundo mobile, estamos a todo o tempo conectados em nossos celulares, aqui você aprenderá a posicionar sua marca no cenário mobile que não desconecta nunca!']::text[]
where id = 324 and cardinality(topics) = 1 and md5(topics[1]) = '8454837bd52cc4be4414c8184a80323e'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 324);

update public.disciplines set topics = array['Aspectos sociais para o gestor de TI como: TI verde, sustentabilidade, questões étnicas nas empresas, ESG, são habilidades que trabalharemos nesta disciplina']::text[]
where id = 325 and cardinality(topics) = 1 and md5(topics[1]) = '42d69639aec6e73a2b131b786ea5d4da'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 325);

update public.disciplines set topics = array['Aprenda como mostrar os dados de maneira coerente, a fim de contar a narrativa de vendas e negociação que você deseja', 'Visões estratégicas, táticas/analíticas e operacionais dos painéis de resultados e relatórios da alta gestão da empresa', 'Técnicas de diagramação, e aplicações de cada tipo de gráfico e formação de paleta de cores', 'Power BI e Tableu']::text[]
where id = 326 and cardinality(topics) = 1 and md5(topics[1]) = '5606bbb5d9b1ce9a5ce749a46fd93328'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 326);

update public.disciplines set topics = array['Direito cibernético, melhores práticas na área de TI e sobre a interatividade dos princípios de direito e suas aplicações, especialmente focados nas inúmeras atividades da tecnologia da informação', 'Entendimento do cenário da LGPD']::text[]
where id = 327 and cardinality(topics) = 1 and md5(topics[1]) = 'ac98bb670322e18e6078e67a7c346d45'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 327);

update public.disciplines set topics = array['Design de marcas e estratégia de branding para empresas', 'Composto de Marketing e decisões sobre produto e promoção (comunicação integrada de Marketing)', 'Desenvolvimento e gestão de marcas']::text[]
where id = 328 and cardinality(topics) = 1 and md5(topics[1]) = '7a8d967279f5a503402a7777212aba48'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 328);

update public.disciplines set topics = array['Conceitos e definições sobre gestão de pessoas e liderança nas organizações', 'Como fazer o RH ser digital? As práticas de RH no mundo digital – Como ficam a avaliação de desempenho, a meritocracia, o processo seletivo, a integração e a demissão HR Analytics – Quando é o momento e como usar a favor do RH HR Techs - Tecnologias que estão ajudando o RH a inovar seus processos']::text[]
where id = 329 and cardinality(topics) = 1 and md5(topics[1]) = 'b4b1bc0208eba06daf393c856f071cc4'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 329);

update public.disciplines set topics = array['Questões financeiras relevantes para o desenvolvimento de serviços relacionados ao marketing, mídia e criação de produtos e precificação', 'Conceito de dinheiro, moeda e valor, valor agregado, margem de lucro, investimento em canais de média e precificação', 'Fluxo de Caixa e administração financeira, demonstrações financeiras', 'Custos, margem e lucros']::text[]
where id = 330 and cardinality(topics) = 1 and md5(topics[1]) = '7cc1a34d6b366500ad12ac7712a27124'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 330);

update public.disciplines set topics = array['Conceitos de estratégia empresarial', 'Definição de Visão, valores e política da empresa, fatores críticos de sucesso, estratégias de competição, perfil do planejador de marketing, plano de marketing, gestão do orçamento das ações de marketing, cronograma de atividades, equipes e implantação da estratégia de marketing']::text[]
where id = 331 and cardinality(topics) = 1 and md5(topics[1]) = '544fa93e74a74dbb27161ff5f5b02d10'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 331);

update public.disciplines set topics = array['Desenvolvimento de projetos de Startups, ideação de negócios inovadores e escaláveis']::text[]
where id = 332 and cardinality(topics) = 1 and md5(topics[1]) = '06fd8d71758c39d793e31a79daac2c4f'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 332);

update public.disciplines set topics = array['Introdução ao conhecimento básico em cibersegurança, configuração e troubleshooting de equipamentos de segurança como firewalls e IPSs']::text[]
where id = 333 and cardinality(topics) = 1 and md5(topics[1]) = '81f5cec1c76778293e10e1b7c73d0301'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 333);

update public.disciplines set topics = array['Aplicação da linguagem Python e JS no cotidiano, em um ambiente de redes de computadores, persistindo dados para ambientes multiplataformas e gerenciar dispositivos IoT, faz parte do dia a dia de um profissional de Defesa Cibernética, que deve automatizar tarefas e aplicar conhecimentos de programação para o desenvolvimento de suas próprias ferramentas']::text[]
where id = 334 and cardinality(topics) = 1 and md5(topics[1]) = '7d265d3b46b22846bbc7c3ac9116378d'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 334);

update public.disciplines set topics = array['Fundamentos de Arquitetura de Computadores, fundamentos de gerenciamento de memória, registradores (32 e 64 bits), estrutura de binários (Linux e Windows, introdução à Linguagem Assembly x86 e Introdução a Debuggers']::text[]
where id = 335 and cardinality(topics) = 1 and md5(topics[1]) = '26de438d9be4a269c4cbce5bbed57ec5'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 335);

update public.disciplines set topics = array['Especialistas dizem que em 2021, haverá 4.3 dispositivos conectados à Internet para cada homem, mulher e criança no planeta', 'Consumer IoT, Commercial IoT e Industrial IoT são dispositivos que naturalmente não são projetados com foco na segurança, ataques sobre eles podem ser devastadores, por isso a importância em conhecer o funcionamento destes equipamentos e as possíveis falhas de segurança que podem ser exploradas pelos cibercriminosos', 'Tendo em vista esses dados temos uma alta necessidade de aprendizado de Tecnicas Hacking em hardware']::text[]
where id = 336 and cardinality(topics) = 1 and md5(topics[1]) = '243d97db5e7896913ec9b818f62860be'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 336);

update public.disciplines set topics = array['Apresentação das bases do sistema operacional Linux como instalação, utilização e serviços como apache, SMB e LDAP']::text[]
where id = 337 and cardinality(topics) = 1 and md5(topics[1]) = 'b4b9ab25b791861d776e76cadf65e2a4'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 337);

update public.disciplines set topics = array['As novas arquiteturas de redes e o estudo dos novos protocolos de comunicação e ativos que compõem uma rede de computadores são responsáveis por melhorar a experiência das organizações na era digital, impulsionando a inovação, elevando a segurança e possibilitando a implantação de plataformas com alta disponibilidade']::text[]
where id = 338 and cardinality(topics) = 1 and md5(topics[1]) = '7fa1a04a6e10a849cef1a289e714051c'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 338);

update public.disciplines set topics = array['As organizações recebem ataques frequentes sobre estruturas de grande valor, como data centers e sistemas de comunicação, com o principal intuito de roubar e/ou sequestrar dados', 'O impacto para as organizações vai além dos valores solicitados para resgate, chegando a prejudicar a relação de confiança com o consumidor', 'Uma forma de prevenir e mitigar problemas futuros é aplicar uma gestão de riscos controlada e assertiva']::text[]
where id = 339 and cardinality(topics) = 1 and md5(topics[1]) = '45afe60c0d213a333fd10deb012cdc44'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 339);

update public.disciplines set topics = array['Apresentação das bases do sistema operacionalWindows como instalação, utilização e serviços como AD, FileServer e IIS']::text[]
where id = 340 and cardinality(topics) = 1 and md5(topics[1]) = 'c4fc7482a537163298b37b31d91ef004'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 340);

update public.disciplines set topics = array['Construção de soluções que envolvam sustentabilidade e explorem a gestão no respeito e convivência com as diferenças sociais e culturais']::text[]
where id = 341 and cardinality(topics) = 1 and md5(topics[1]) = 'ed2e8a95a9c234515df39cdf2df1a120'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 341);

update public.disciplines set topics = array['Aplicação dos padrões periciais (ISO 27037 e RFC 3227), conhecimento dos processos de identificação, coleta e preservação, análise e apresentação de evidências, engenharia reversa e perícia em dispositivos móveis são conhecimentos fundamentais para os profissionais que atuam com segurança da informação']::text[]
where id = 342 and cardinality(topics) = 1 and md5(topics[1]) = '0b188df0cb6af1fc2cf8f8341f4b13cc'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 342);

update public.disciplines set topics = array['Conhecimentos básicos de cloud computing, introdução a Azure compute, storage, networking e Security', 'Planejar, instalar, configurar e gerenciar recursos dentro do Azure, como: servidores (Windows e Linux), web apps, redes e banco de dados', 'Elaborar e implantar políticas de segurança para servidores Windows e Linux, além de identificar, realizar auditorias, administrar e monitorar o desempenho e comportamentos que podem comprometer questões de segurança, desde a sua instalação']::text[]
where id = 343 and cardinality(topics) = 1 and md5(topics[1]) = '709be984571cf1a933a7a83814c45b31'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 343);

update public.disciplines set topics = array['A utilização da inteligência e contrainteligência possibilita unir toda a rede distribuída de forma segura conectando dispositivos endpoint e IOT, com redes locais através da nuvem', 'Sincronizar a rede com a inteligência de segurança amplia a visibilidade dos processos e automatiza o controle em toda a organização, o que permite detectar e defender o seu ambiente contra as mais avançadas ameaças existentes no ambiente cibernético']::text[]
where id = 344 and cardinality(topics) = 1 and md5(topics[1]) = '9cebca21e2c256ee5092b022a232e3c4'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 344);

update public.disciplines set topics = array['A IA permite ao profissional reconhecer e implantar recursos que não prejudiquem a alta disponibilidade de serviços de segurança baseados em nuvem, que podem rastrear e defender com o conceito de machine learning, os dispositivos que estiverem conectados ao ecossistema de redes', 'Os dados que serão relatados poderão auxiliar na tomada de decisão de ações rápidas e efetivas para identificação de um malware ou um cibercriminoso dentro do seu ambiente de trabalho']::text[]
where id = 345 and cardinality(topics) = 1 and md5(topics[1]) = '39e202d1fc55630b65b99762516ac38d'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 345);

update public.disciplines set topics = array['O profissional de Defesa Cibernética não pode planejar, projetar, implementar, gerenciar, analisar, avaliar ou melhorar a política de segurança se não entender os objetivos de negócios de curto e longo prazo da sua organização, pautado nas leis que regem o direito eletrônico e a privacidade, como a LGPD e a GDPR']::text[]
where id = 346 and cardinality(topics) = 1 and md5(topics[1]) = 'cfbd1f2fc073622ad779607dbcf29eb6'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 346);

update public.disciplines set topics = array['Conheça com profundidade as metodologias, técnicas e ferramentas utilizadas pelos cibercriminosos', 'Só assim será possível estabelecer um planejamento eficiente de defesa cibernética', 'Análise de artefatos contaminados será o principal foco deste conteúdo']::text[]
where id = 347 and cardinality(topics) = 1 and md5(topics[1]) = '218f69d5f5c1c6862056d5b1d0fb9a1e'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 347);

update public.disciplines set topics = array['Controles de segurança aplicados às infraestruturas críticas de comunicação, saúde, transporte, energia, economia e demais infraestruturas, segurança de componentes críticos dispostos no ciberespaço e modelagem de ameaças cibernéticas serão os assuntos abordados nesta disciplina', 'O propósito do Ethical Hacking é o de avaliar, de maneira legal, a segurança de um sistema ou rede de computador por meio da descoberta e exploração das vulnerabilidades', 'Coleta de itens de inteligência, varredura de redes/sistemas de computador e invasão de sistemas']::text[]
where id = 348 and cardinality(topics) = 1 and md5(topics[1]) = '9ac3c3aa122e4354e45b6ad865ea41f2'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 348);

update public.disciplines set topics = array['Avaliação de vulnerabilidades em códigos de programação, Aplicação WEB e aplicações mobile são habilidades necessárias para que os profissionais de defesa cibernética possam atuar com os desenvolvedores de sistemas']::text[]
where id = 349 and cardinality(topics) = 1 and md5(topics[1]) = '027616b3c599121ff3ebc33cf4fa282d'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 349);

update public.disciplines set topics = array['No atual cenário de transformação digital, a computação em nuvem e o DevOps têm papel fundamental para possibilitar um desenvolvimento mais ágil e flexível', 'Nesta disciplina, você aprenderá como integrar práticas de DevOps e computação em nuvem para aprimorar o desenvolvimento de aplicações web', 'Com serviços de provedores como AWS e Azure, será possível entender como gerenciar de forma eficaz a infraestrutura e automação, reduzindo custos e maximizando o retorno sobre o investimento (ROI)', 'Além disso, ao explorar CI/CD e a automação de processos, você será capaz de desenvolver soluções que proporcionem uma experiência completa para empresas, usuários e desenvolvedores, colaborando para um ambiente digital mais dinâmico e sustentável']::text[]
where id = 350 and cardinality(topics) = 1 and md5(topics[1]) = '7224ed5a629170098304a06ec613b12a'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 350);

update public.disciplines set topics = array['O pensamento computacional não é apenas uma habilidade técnica, mas uma competência essencial no mundo digital, que impacta diretamente a sociedade', 'Nesta disciplina, você aprenderá a resolver problemas de maneira estruturada e lógica, utilizando o Python para transformar ideias em soluções tangíveis', 'A construção de servidores de aplicação integrados a plataformas web permite criar ferramentas que atendem diretamente às necessidades dos negócios, promovendo uma melhor experiência para usuários e colaboradores', 'Mais do que aprender a programar, você vai se preparar para criar soluções que façam a diferença em um mundo cada vez mais digitalizado e interconectado']::text[]
where id = 351 and cardinality(topics) = 1 and md5(topics[1]) = '63eeccbe93823d52f95d1f8308fdfc24'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 351);

update public.disciplines set topics = array['Com a celeridade da transformação digital, os frameworks tornaram-se indispensáveis para o desenvolvimento eficiente de interfaces interativas e dinâmicas', 'Nesta disciplina, você se aprofundará no uso do Frameworks para criar aplicações web que não são apenas tecnologicamente avançadas, mas também intuitivas e focadas na experiência do usuário', 'Por meio desses Frameworks e bibliotecas, você aprenderá a desenvolver interfaces que alinham os objetivos empresariais e as expectativas dos usuários, promovendo uma Total Experience', 'Essa abordagem contribui para um mercado mais dinâmico e responde às necessidades de uma sociedade que busca rapidez, personalização e valor agregado']::text[]
where id = 352 and cardinality(topics) = 1 and md5(topics[1]) = '578202aa665664747303e02979d1d64d'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 352);

update public.disciplines set topics = array['Vivemos em uma era visual em que o design impacta diretamente a percepção de valor e a experiência do usuário', 'Nesta disciplina, você explorará o design gráfico aplicado ao desenvolvimento web, aprendendo a criar interfaces que não apenas são funcionais, mas também cativantes', 'Ao entender como utilizar cores, tipografia e imagens de forma eficaz, você será capaz de desenvolver layouts que conectarão pessoas e marcas em um ambiente digital inclusivo e atrativo', 'Além de ferramentas como Photoshop e Illustrator, aprenderá a aplicar o design responsivo para que as interfaces se adaptem a diferentes dispositivos, tornando a web um lugar mais acessível e agradável para todos']::text[]
where id = 353 and cardinality(topics) = 1 and md5(topics[1]) = 'a7022ddf420466b05c83e6202235e93c'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 353);

update public.disciplines set topics = array['A simplicidade e a eficiência tornaram-se pilares do desenvolvimento no mundo pós-digital', 'Nesta disciplina, você aprenderá como as plataformas de Low Code estão revolucionando o desenvolvimento de software, permitindo que aplicações sejam criadas de forma rápida e com baixo custo', 'Com o Low Code, é possível transformar ideias em soluções digitais que atendam às necessidades do mercado e da sociedade de maneira ágil', 'Aprender a automatizar processos e criar soluções visuais facilita o acesso à tecnologia, democratizando o desenvolvimento e promovendo um ambiente digital mais inclusivo e eficiente']::text[]
where id = 354 and cardinality(topics) = 1 and md5(topics[1]) = '42b59e76ae2abeb33e430fb764e5cf1c'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 354);

update public.disciplines set topics = array['No mundo atual, onde o acesso digital acontece em diversos dispositivos, desenvolver interfaces responsivas é essencial para promover uma experiência de usuário consistente', 'Esta disciplina ensina como HTML, CSS e JavaScript podem ser aplicados para criar páginas web que se adaptam a diferentes telas, proporcionando uma experiência otimizada para todos', 'Você aprenderá técnicas avançadas para construir interfaces que atendam às necessidades de uma sociedade conectada, além de aprimorar a interatividade e a navegabilidade', 'A web responsiva garante que a tecnologia se ajuste às pessoas, contribuindo para uma sociedade mais acessível e conectada']::text[]
where id = 355 and cardinality(topics) = 1 and md5(topics[1]) = 'cc1d0c12635804bb0af15c92f8022aff'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 355);

update public.disciplines set topics = array['O papel social das empresas e dos indivíduos é cada vez mais significativo', 'Nesta disciplina, vamos explorar o impacto das práticas de Environmental, Social and Governance (ESG) na sociedade e como aplicá-las ao ambiente corporativo', 'Além de entender questões sociais e raciais contemporâneas, você aprenderá a desenvolver práticas sustentáveis que promovem um mundo mais inclusivo e ético', 'Integrar esses conceitos ao desenvolvimento tecnológico contribui para um mercado mais consciente e responsável, no qual a tecnologia serve como um meio de transformação positiva e desenvolvimento sustentável']::text[]
where id = 356 and cardinality(topics) = 1 and md5(topics[1]) = '0a60590987dab779e4090131479fd8f5'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 356);

update public.disciplines set topics = array['Temos o desenvolvimento centrado no usuário', 'O design de experiências e interfaces tornou-se uma das habilidades mais importantes para criar produtos digitais de sucesso', 'Nesta disciplina, você aprenderá a entender as necessidades e comportamentos dos usuários, aplicando técnicas de UX e UI para desenvolver interfaces acessíveis e envolventes', 'Ferramentas de prototipação e Inteligência Artificial serão exploradas para que você crie soluções que respondam às expectativas de uma sociedade cada vez mais exigente', 'O design centrado no usuário não apenas melhora a experiência digital, ele também contribui para o fortalecimento de marcas e o engajamento de clientes']::text[]
where id = 357 and cardinality(topics) = 1 and md5(topics[1]) = '72428892ac61df39691cf024fd5a7ff7'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 357);

update public.disciplines set topics = array['A inteligência artificial é uma força motriz da transformação digital, moldando o presente e o futuro do desenvolvimento de software', 'Nesta disciplina, você vai explorar a integração de IA no desenvolvimento de aplicações web, criando chatbots interativos', 'Aprenderá a aplicar conceitos de processamento de linguagem natural para criar soluções que elevam a experiência do usuário', 'Além de desenvolver habilidades técnicas, você terá insights sobre como a IA pode trazer benefícios reais para empresas e clientes, conectando tecnologia e experiência de forma que gere valor e aprofunde o engajamento no mundo digital']::text[]
where id = 358 and cardinality(topics) = 1 and md5(topics[1]) = 'c8dcadab8828a88ecf1d20eb5696222b'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 358);

update public.disciplines set topics = array['Você já ouviu dizer que os dados são o novo petróleo da sociedade? Compreender como organizá-los e gerenciá-los é essencial', 'Esta disciplina foca o desenvolvimento e a implementação de bancos de dados para aplicações web e mobile, capacitando você a criar estruturas que não apenas armazenam, mas que também agregam valor e facilitam a tomada de decisões', 'Desde a modelagem até o acesso seguro, você aprenderá a manipular dados de forma eficiente, compreendendo seu impacto no cenário digital e corporativo', 'Essas habilidades são fundamentais para desenvolver aplicações que atendam às necessidades de um mundo cada vez mais data-driven']::text[]
where id = 359 and cardinality(topics) = 1 and md5(topics[1]) = '49596cc7bfcd585bad9e15ab97c82997'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 359);

update public.disciplines set topics = array['A comunicação visual é crucial em uma era em que o engajamento digital depende de experiências visuais dinâmicas e cativantes', 'Nesta disciplina, você vai além dos fundamentos do design gráfico, explorando o uso de animações e motion graphics para criar interfaces atraentes e interativas', 'Utilizando ferramentas como Adobe After Effects, você aprenderá a enriquecer experiências de usuário, desenvolvendo microinterações e transições que tornam o ambiente digital mais imersivo e intuitivo', 'Este conhecimento não apenas fortalece o vínculo entre o usuário e a interface, mas também melhora a forma como as marcas se conectam com o público']::text[]
where id = 360 and cardinality(topics) = 1 and md5(topics[1]) = '3da8276aeb5c61c8a5f232f0e0773e52'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 360);

update public.disciplines set topics = array['O marketing digital é o elo que conecta as marcas à sociedade contemporânea', 'Nesta disciplina, você aprenderá a desenvolver estratégias de SEO, criar conteúdo envolvente e gerir campanhas de marketing em redes sociais, ampliando a presença online de marcas e produtos', 'Com foco em engajamento e visibilidade, você desenvolverá habilidades que vão além da criação, permitindo que suas campanhas impactem positivamente o público', 'O objetivo é promover interações que gerem valor, tornando a comunicação digital um meio eficaz de engajar e fidelizar clientes em um mercado competitivo']::text[]
where id = 361 and cardinality(topics) = 1 and md5(topics[1]) = '104b8b66fa55eeb0264996c7532ffc7c'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 361);

update public.disciplines set topics = array['Em um mundo onde a inovação é essencial, transformar ideias em negócios viáveis é o segredo para o sucesso', 'Nesta disciplina, você aprenderá a estruturar startups e desenvolver produtos digitais, aplicando metodologias ágeis para guiar o processo do início ao fim', 'Do desenvolvimento do produto à análise de mercado, você terá uma visão completa do ciclo de vida de uma startup, compreendendo como criar valor e escalar um negócio', 'Esse conhecimento permite que você desenvolva soluções que não apenas atendem às demandas da sociedade, mas que também fazem parte da mudança que a inovação proporciona no mercado']::text[]
where id = 362 and cardinality(topics) = 1 and md5(topics[1]) = 'e7a9cb059dadecceb1720758f38830bc'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 362);

update public.disciplines set topics = array['Com a necessidade crescente de aplicações eficientes e de alto desempenho, os frameworks evoluíram para atender às exigências de um mundo digital em rápida transformação', 'Nesta disciplina, você aprofundará seus conhecimentos em Frameworks, explorando funcionalidades avançadas como a renderização no servidor e a integração de APIs', 'Aprenderá a criar aplicações que respondem às expectativas dos usuários e melhoram a experiência digital', 'Ao entender como frameworks facilitam o desenvolvimento ágil e escalável, você será capaz de construir soluções robustas que acompanham a evolução das demandas tecnológicas e sociais']::text[]
where id = 363 and cardinality(topics) = 1 and md5(topics[1]) = 'fa272b08aaf96bef5d650c4e173ca0c3'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 363);

update public.disciplines set topics = array['Os jogos e a gamificação são ferramentas poderosas para engajar e motivar em diversas áreas, desde a educação até o marketing', 'Nesta disciplina, você explorará o design e o desenvolvimento de jogos simples, além de aprender a aplicar mecânicas de gamificação para criar experiências interativas e motivadoras', 'Ao compreender como recompensas, desafios e narrativas podem transformar a experiência digital, você será capaz de criar interfaces mais atraentes e eficientes', 'Essas habilidades são valiosas para construir projetos que ressoem com o público e se integrem à sociedade de maneira divertida e inovadora']::text[]
where id = 364 and cardinality(topics) = 1 and md5(topics[1]) = '088eb469833a8bb39ac37bc446631d20'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 364);

update public.disciplines set topics = array['Com o aumento exponencial do uso de dispositivos móveis, desenvolver aplicações híbridas que funcionem em múltiplas plataformas é uma necessidade no mercado atual', 'Nesta disciplina, você aprenderá a criar apps que oferecem uma experiência nativa, utilizando uma única base de código para Android e iOS', 'Ao desenvolver competências em design responsivo e otimização de performance, você estará preparado para criar soluções móveis que se ajustam ao estilo de vida e às expectativas de uma sociedade conectada']::text[]
where id = 365 and cardinality(topics) = 1 and md5(topics[1]) = '03d849cc9cefb254e459956ff524a65b'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 365);

update public.disciplines set topics = array['Análise de cenários econômicos pelo profissional de Administração, para tomada de decisão empresarial', 'O conceito de economia', 'Os recursos econômicos e o processo de produção', 'Moeda: Oferta e Procura', 'Formação da Taxa de Juros (Primária e Secundária)', 'Inflação e os principais índices econômicos']::text[]
where id = 366 and cardinality(topics) = 1 and md5(topics[1]) = '103dd7f4a66786947e37d613925897fa'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 366);

update public.disciplines set topics = array['Esta disciplina aborda o impacto das tecnologias exponenciais no mundo dos negócios e introduz práticas emergentes de interação com sistemas baseados em inteligência artificial, por meio do prompt engineering', 'O foco está na compreensão das transformações tecnológicas que estão redefinindo a economia, os modelos organizacionais e a cultura corporativa, como automação, robótica, análise de dados, biotecnologia e outras inovações disruptivas']::text[]
where id = 367 and cardinality(topics) = 1 and md5(topics[1]) = '0674961d1e7e8dd5dc8237003ea0cc4d'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 367);

update public.disciplines set topics = array['O indivíduo e a Organização', 'Comportamento humano nas Organizações', 'Personalidade', 'Papéis e valores', 'Conflitos e Motivação', 'Análise Transacional, Neurolinguística', 'A identificação e discussão de Hábitos Eficazes pessoais e Empresariais', 'Atitudes de um gestor']::text[]
where id = 368 and cardinality(topics) = 1 and md5(topics[1]) = 'ca9a7c1dfac17e8ea2403eca1e642f33'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 368);

update public.disciplines set topics = array['Desenvolvimento da expressão oral', 'Leitura e interpretação de textos', 'Produção de textos técnicos', 'Construção de Pitchs de Startups']::text[]
where id = 369 and cardinality(topics) = 1 and md5(topics[1]) = 'f5d08fb16c9c0170db7e9463f18750aa'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 369);

update public.disciplines set topics = array['Fundamentos da Contabilidade', 'Método das Partidas Dobradas', 'Demonstrativos Contábeis', 'Operações com Mercadorias', 'Métodos de Tributação', 'Outros Demonstrativos Contábeis']::text[]
where id = 370 and cardinality(topics) = 1 and md5(topics[1]) = '12d1ccfed06d7657d11ecf30225779ab'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 370);

update public.disciplines set topics = array['Métodos quantitativos aplicados à ciência da administração', 'Operações e expressões matemáticas, algébricas e suas aplicações', 'Gráficos de funções do primeiro e segundo grau', 'Gráficos de funções do segundo grau', 'Função composta', 'Função inversa', 'Função exponencial', 'Função logarítmica', 'Limites e Derivadas simples', 'Noções de integrais']::text[]
where id = 371 and cardinality(topics) = 1 and md5(topics[1]) = '8c46d31477801e1bf07b61baaaf33174'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 371);

update public.disciplines set topics = array['Construção de soluções que envolvam sustentabilidade e explorem a gestão no respeito e convivência com as diferenças sociais e culturais']::text[]
where id = 373 and cardinality(topics) = 1 and md5(topics[1]) = 'ed2e8a95a9c234515df39cdf2df1a120'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 373);

update public.disciplines set topics = array['Domínio das demonstrações contábeis como ferramenta de trabalho para o Administrador, bem como conhecimento da origem e aplicação de recursos na organização', 'Análise da situação econômica e financeira da empresa']::text[]
where id = 374 and cardinality(topics) = 1 and md5(topics[1]) = '8c6ffc8ab890a57a0c2b6c73ca29f3e9'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 374);

update public.disciplines set topics = array['Introdução ao Marketing', 'O ambiente de Marketing', 'Segmentação e posicionamento de mercado', 'Comportamento do Cliente', 'Composto de Marketing e decisões sobre produto e promoção (comunicação integrada de Marketing)', 'Desenvolvimento e gestão de marcas']::text[]
where id = 375 and cardinality(topics) = 1 and md5(topics[1]) = '536d4ef2863339359993b882611247c5'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 375);

update public.disciplines set topics = array['Direito tributário', 'Tributos', 'Sistema Constitucional Tributário', 'Fato Gerador', 'Obrigação Tributária', 'Crédito Tributário', 'Direito do Trabalho']::text[]
where id = 376 and cardinality(topics) = 1 and md5(topics[1]) = '6d50781cb04a987bdba3913db8863161'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 376);

update public.disciplines set topics = array['Relacionar a engenharia e as técnicas quantitativas que podem ser utilizadas para avaliações econômicas, destacando suas aplicações e limitações no ambiente de negócios']::text[]
where id = 377 and cardinality(topics) = 1 and md5(topics[1]) = '60fd052427740b7555a64a21191996ee'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 377);

update public.disciplines set topics = array['A importância do líder nas organizações da Era Digital', 'Habilidades e competências do líder na sociedade 5.0', 'A realidade das organizações exponenciais e a ação do líder', 'O gerente como coach', 'Liderando nas mudanças e transformações', 'O líder como parte atuante da equipe']::text[]
where id = 378 and cardinality(topics) = 1 and md5(topics[1]) = '2499b42507a6348b6e18e7c341e81b7a'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 378);

update public.disciplines set topics = array['Fundamentos de Matemática Financeira', 'Capitalização Simples e Composta', 'Desconto Simples', 'Taxa Nominal e Efetiva', 'Capitais Equivalentes', 'Série de Pagamentos', 'Sistemas de Amortização', 'Índices Econômicos e Financeiros']::text[]
where id = 379 and cardinality(topics) = 1 and md5(topics[1]) = 'db0e168a178f77fd0c152c784bfea2ba'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 379);

update public.disciplines set topics = array['Introdução aos Conceitos Básicos: metodologia da pesquisa e processos estatísticos de abordagem, censo e estimação, questionário e observações científicas, população e amostra, variáveis qualitativas e quantitativas, discretas e contínuas, estatística descritiva, estatística indutiva (inferência)', 'Gráficos', 'Séries estatísticas', 'Preparação de dados para análises estatísticas', 'Estatística Descritiva', 'Representação gráfica de séries estatísticas']::text[]
where id = 380 and cardinality(topics) = 1 and md5(topics[1]) = 'b720fe50b1395f55ff3eb7c2fc1a3e62'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 380);

update public.disciplines set topics = array['Propriedade Intelectual', 'Marcas e patentes', 'Tipos de sociedade de empresas', 'Abertura de empresas', 'Obrigações jurídicas dos empresários', 'Implicações do novo marco civil da internet nas empresas']::text[]
where id = 381 and cardinality(topics) = 1 and md5(topics[1]) = 'd7562d3e6e845164af0e205aae17b73d'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 381);

update public.disciplines set topics = array['Desenvolvimento de projetos de inovação e tecnologia para melhoria da competitividade empresarial', 'Desafios e competições em parcerias com empresas', 'Apresentação de Pitchs de inovação para empresas parceiras']::text[]
where id = 382 and cardinality(topics) = 1 and md5(topics[1]) = '124109e85c90bd50c93226b12cd07393'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 382);

update public.disciplines set topics = array['Introdução aos Conceitos Básicos: metodologia da pesquisa e processos estatísticos de abordagem, censo e estimação, questionário e observações científicas, população e amostra, variáveis qualitativas e quantitativas, discretas e contínuas, estatística descritiva, estatística indutiva (inferência)', 'Gráficos', 'Séries estatísticas', 'Preparação de dados para análises estatísticas', 'Estatística Descritiva', 'Representação gráfica de séries estatísticas']::text[]
where id = 383 and cardinality(topics) = 1 and md5(topics[1]) = 'b720fe50b1395f55ff3eb7c2fc1a3e62'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 383);

update public.disciplines set topics = array['A Administração Financeira', 'Métodos de Avaliação de Investimentos', 'Ponto de Equilíbrio', 'Risco Operacional e Financeiro', 'Risco de Insolvência', 'Mercados de Capitais', 'Fontes de Financiamento de Longo Prazo', 'Decisões de Estrutura e Custo do Capital']::text[]
where id = 384 and cardinality(topics) = 1 and md5(topics[1]) = 'c62dca7d5a702b5bf65965c9dc9acbff'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 384);

update public.disciplines set topics = array['Aplicação dos conceitos de Gestão de Projetos no contexto da área de TI, estudos de casos e dinâmicas relacionadas à gestão de projetos de TI nas organizações']::text[]
where id = 385 and cardinality(topics) = 1 and md5(topics[1]) = 'e5c2ca1094d8464328870b9ad6f3d9e5'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 385);

update public.disciplines set topics = array['Método e tecnologia aplicados à Gestão de Pessoas nas Organizações, Recrutamento e Seleção, Desenvolvimento e Treinamento, Remuneração e Benefícios, Agilidade e Liderança', 'Uso de tecnologias para gestão de pessoas nas organizações', 'Impactos de tecnologias exponenciais como IA generativa aplicada à área de RH']::text[]
where id = 386 and cardinality(topics) = 1 and md5(topics[1]) = 'a264a6ea13f5066112cb637353de5c44'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 386);

update public.disciplines set topics = array['Papel estratégico de TI nas organizações', 'Conceitos de governança corporativa e governança em tecnologia da informação']::text[]
where id = 387 and cardinality(topics) = 1 and md5(topics[1]) = '206e33c304555b670dee0b44c2e04ee9'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 387);

update public.disciplines set topics = array['Design Thinking', 'Pensamento e atitude empreendedora', 'Sistemas de Informação e Pesquisa de Marketing', 'Prototipação de ideias de negócios', 'Validação de ideias com protótipos']::text[]
where id = 388 and cardinality(topics) = 1 and md5(topics[1]) = '930ea865d02ec5e7041b32c9829e2495'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 388);

update public.disciplines set topics = array['O Futuro do trabalho e das empresas', 'Novos modelos de estruturas organizacionais', 'Transformação de organizações em plataformas negócios', 'Novas teorias econômicas', 'Economia compartilhada', 'Economia colaborativa', 'Estratégias de negócios na era da 4ª Revolução Industrial']::text[]
where id = 389 and cardinality(topics) = 1 and md5(topics[1]) = 'c0f789675d2f208d1cc7fc264a716308'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 389);

update public.disciplines set topics = array['Relações com Investidores e transformação digital Avaliação de empresas na era digital e negócios exponenciais Política de Dividendos', 'Administração do Capital de Giro', 'Novas fontes de financiamento: Crowdfunding, Investidor Anjo, órgãos de fomento, fundos de venture capital etc']::text[]
where id = 390 and cardinality(topics) = 1 and md5(topics[1]) = '0117f092b14c9b21f37b4c8597a59eb7'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 390);

update public.disciplines set topics = array['Conceitos e prática de empreendedorismo', 'Criação de Startups de base tecnológica']::text[]
where id = 391 and cardinality(topics) = 1 and md5(topics[1]) = '1b0189c58b8a9bd45f9ceeccbff9eddb'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 391);

update public.disciplines set topics = array['Visões estratégicas, táticas/analíticas e operacionais os painéis de resultados e relatórios da alta gestão da empresa', 'Assim, você vai poder colocar em prática técnicas de diagramação, construção de diferentes storytellings e aplicações de cada tipo de gráfico e formação de paleta de cores', 'Planejamento Estratégico']::text[]
where id = 392 and cardinality(topics) = 1 and md5(topics[1]) = '514e24b462ac7f21c04796fcde645539'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 392);

update public.disciplines set topics = array['Conhecimentos jurídicos essenciais ao exercício das atividades do Administrador profissional', 'Noções Preliminares de Direito', 'Constituição Federal: Histórico e Princípios Fundamentais', 'Normas Civis: Contratos, Obrigações, Responsabilidade Civil e o Dever de Indenizar', 'Constituição de Empresas e Lei das Sociedades Anônimas', 'Normas Penais: Crimes Contra a Ordem Tributária, Contra a Organização do Trabalho e Crime Falimentar', 'Normas Trabalhistas: CLT, Organização Sindical e Terceirização', 'Normas de Proteção ao Consumidor e aos Direitos Autorais', 'Direito Ambiental e Bioética']::text[]
where id = 393 and cardinality(topics) = 1 and md5(topics[1]) = '3b9ddffaf2e90f4d922afa35b7d0fc45'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 393);

update public.disciplines set topics = array['Realização da atividade de estágio, supervisionado pela coordenação de estágio da instituição']::text[]
where id = 394 and cardinality(topics) = 1 and md5(topics[1]) = '2a3378092290f200ce79533221790614'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 394);

update public.disciplines set topics = array['Alinhamento estratégico de TI', 'Gestão de portfólio de projetos de TI', 'Definição e aplicação de casos de negócio (business cases) para definição de projetos de TI', 'Técnicas para elaboração de casos de negócio', 'Cálculo do retorno sobre investimento em projetos de TI', 'Avaliação e controle do desempenho da estratégia empresarial', 'Mapas Estratégicos', 'Indicadores', 'Balanced Scorecard (BSC)', 'Perspectivas e criação de um BSC', 'Tópicos avançados em gerenciamento de TI']::text[]
where id = 395 and cardinality(topics) = 1 and md5(topics[1]) = '8302ff36d949d6cf881a224fb41e3457'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 395);

update public.disciplines set topics = array['A gestão logística nas organizações', 'Armazenagem: recepção, estocagem, expedição e distribuição', 'Administração patrimonial: funções e objetivos', 'Atividades voltadas a materiais permanentes, móveis, máquinas e equipamentos: conservação e manutenção de edificações e de instalações físicas', 'Segurança patrimonial: normas e procedimentos: terceirização']::text[]
where id = 396 and cardinality(topics) = 1 and md5(topics[1]) = 'd4a3319f354c148cccb6dad362335151'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 396);

update public.disciplines set topics = array['No cenário atual, a ciência da computação é a base para todas as inovações tecnológicas', 'Nesta disciplina, você explorará as estruturas fundamentais da computação, desde a lógica booleana até a programação em baixo nível', 'Estudaremos linguagens como C e Python, abordando conceitos de programação procedural e modular', 'Além disso, você aprenderá a aplicar esses conhecimentos para resolver problemas complexos e otimizar soluções, preparando-se para desafios mais avançados da carreira']::text[]
where id = 397 and cardinality(topics) = 1 and md5(topics[1]) = 'fb131fc4a6e1cc6c1a049c151029d346'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 397);

update public.disciplines set topics = array['A automação está transformando a maneira como as empresas operam, e o pensamento computacional é a chave para desbloquear esse potencial', 'Aqui, você desenvolverá a habilidade de decompor problemas e construir algoritmos eficientes, utilizando Python como principal linguagem', 'Exploraremos frameworks como Flask para automação de processos e introdução a práticas de DevOps, preparando você para a construção de soluções que vão além do trivial']::text[]
where id = 398 and cardinality(topics) = 1 and md5(topics[1]) = '1556a1f0cf5f172fbeb4b771871e9a38'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 398);

update public.disciplines set topics = array['A matemática é a espinha dorsal da computação, essencial para modelagem de sistemas complexos', 'Nesta disciplina, você mergulhará em álgebra linear, cálculo e estatística, aplicando essas ferramentas para modelar problemas computacionais e simular soluções', 'Softwares como MATLAB e R serão explorados para resolver equações diferenciais, otimizar sistemas e prever resultados, dando-lhe as bases para o aprendizado de máquina e inteligência artificial']::text[]
where id = 399 and cardinality(topics) = 1 and md5(topics[1]) = 'e99af570213be797cec05e6f70ede238'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 399);

update public.disciplines set topics = array['No coração da eficiência computacional estão as estruturas de dados e os algoritmos', 'Estudaremos estruturas como listas, árvores e grafos, e exploraremos algoritmos de ordenação, busca e otimização', 'Python e C++ serão as linguagens de foco, enquanto ferramentas como Git para versionamento e benchmarking serão introduzidas para avaliar a performance das soluções, preparando você para desafios técnicos de alto nível']::text[]
where id = 400 and cardinality(topics) = 1 and md5(topics[1]) = '752899a3cea69ad19ae90c87918088e9'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 400);

update public.disciplines set topics = array['Entender a arquitetura de computadores é crucial para otimização de software e hardware', 'Nesta disciplina, exploraremos a estrutura interna de sistemas computacionais, desde os circuitos lógicos até a memória e processadores', 'Ferramentas como o simulador MARS para MIPS serão utilizadas para demonstrar como o hardware influencia diretamente a performance e a eficiência energética dos sistemas que desenvolvemos']::text[]
where id = 401 and cardinality(topics) = 1 and md5(topics[1]) = 'edb0ea6adad11d399a579f2890bd6a3f'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 401);

update public.disciplines set topics = array['A modelagem linear é a base para muitos algoritmos de aprendizado de máquina', 'Você aprenderá a construir e interpretar modelos lineares, aplicando-os em problemas reais usando Python e bibliotecas como scikit-learn e TensorFlow', 'Estudaremos também técnicas de regularização e seleção de variáveis, essenciais para a criação de modelos robustos e eficientes']::text[]
where id = 402 and cardinality(topics) = 1 and md5(topics[1]) = 'a4c88bc9566f22977003225f284fc6fb'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 402);

update public.disciplines set topics = array['A era da inteligência artificial está transformando todos os setores da economia', 'Nesta disciplina, você entenderá como prompts e modelos de linguagem interagem para criar soluções inteligentes', 'Exploraremos ferramentas como OpenAI e GPT, além de integrar essas tecnologias em plataformas práticas para criar chatbots e assistentes virtuais que respondem a comandos complexos']::text[]
where id = 403 and cardinality(topics) = 1 and md5(topics[1]) = '137619336d74eaf20e6e809edea07dcc'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 403);

update public.disciplines set topics = array['Com a crescente demanda por sustentabilidade, a eficiência energética tornou-se uma prioridade', 'Nesta disciplina, você aprenderá a aplicar algoritmos avançados para otimizar o consumo energético em sistemas renováveis, utilizando ferramentas como MATLAB e simuladores de energia', 'Estudaremos também o impacto de modelos preditivos e machine learning para prever e melhorar a eficiência energética em projetos reais']::text[]
where id = 404 and cardinality(topics) = 1 and md5(topics[1]) = 'ed02fa6e45dce1da3e7bc57b5f0e0f30'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 404);

update public.disciplines set topics = array['No mundo atual, a responsabilidade social é tão importante quanto as habilidades técnicas', 'Nesta disciplina, você explorará como as tecnologias da informação podem ser utilizadas para promover sustentabilidade e impactar positivamente a sociedade', 'Estudaremos exemplos de projetos bem-sucedidos e discutiremos como aplicar práticas sustentáveis em iniciativas de TI']::text[]
where id = 405 and cardinality(topics) = 1 and md5(topics[1]) = '49ec3d4ffc2bcd37bac5180900e5661c'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 405);

update public.disciplines set topics = array['Programação orientada a objetos é a pedra angular do desenvolvimento de software moderno', 'Nesta disciplina, você aprofundará seus conhecimentos em OOP, utilizando linguagens como Java e C#', 'Exploraremos princípios como encapsulamento, herança e polimorfismo, aplicando esses conceitos no desenvolvimento de software robusto e escalável, enquanto utilizamos IDEs como IntelliJ e Visual Studio para maximizar a produtividade']::text[]
where id = 406 and cardinality(topics) = 1 and md5(topics[1]) = 'f031402f7ac69fc239b8e2f026e553ee'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 406);

update public.disciplines set topics = array['A engenharia de software vai além da codificação', 'Trata-se de entender o ciclo de vida do software, desde a concepção até a manutenção', 'Exploraremos metodologias ágeis como Scrum e Kanban', 'e ferramentas como Jira e GitLab para gestão de projetos', 'O foco será em como desenhar, implementar e testar software de alta qualidade, sempre com um olhar para a escalabilidade e manutenção do código']::text[]
where id = 407 and cardinality(topics) = 1 and md5(topics[1]) = '59a2d913a8c8050ddfdda24bff9148b3'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 407);

update public.disciplines set topics = array['Os sistemas operacionais e as redes de computadores formam a base da infraestrutura digital', 'Nesta disciplina, você aprenderá sobre o funcionamento interno dos sistemas operacionais, desde a gestão de processos até a alocação de memória', 'Em paralelo, exploraremos redes de computadores, utilizando simuladores como Cisco Packet Tracer para configurar e otimizar redes, garantindo a segurança e a eficiência']::text[]
where id = 408 and cardinality(topics) = 1 and md5(topics[1]) = '0dd771c8834f6a7135311e1953f72f12'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 408);

update public.disciplines set topics = array['Nesta disciplina, você mergulhará no desenvolvimento de aplicações modernas, com ênfase em tecnologias e frameworks que dominam o mercado', 'Através do uso de HTML5, CSS3, e JavaScript, você aprenderá a criar interfaces web dinâmicas e responsivas, enquanto explora o desenvolvimento de backends robustos com Node.js e a integração com bancos de dados NoSQL como MongoDB', 'A disciplina também abordará práticas essenciais para garantir a escalabilidade e a segurança das aplicações, preparando você para enfrentar desafios reais do mercado']::text[]
where id = 409 and cardinality(topics) = 1 and md5(topics[1]) = '2e71f6cbc9ce0d4352434e020bf09d24'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 409);

update public.disciplines set topics = array['A ciência de dados é o novo petróleo do século XXI', 'Nesta disciplina, você aprenderá a coletar, processar e analisar grandes volumes de dados, utilizando Python e bibliotecas como pandas, NumPy e Matplotlib', 'Exploraremos técnicas de machine learning e ferramentas como TensorFlow para criar modelos preditivos que auxiliam na tomada de decisões informadas e baseadas em dados']::text[]
where id = 410 and cardinality(topics) = 1 and md5(topics[1]) = '6d6b3ab937949a85af6069d18696d0f6'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 410);

update public.disciplines set topics = array['As redes neurais convolucionais são a base para avanços em visão computacional e reconhecimento de padrões', 'Você aprenderá a construir e treinar CNNs utilizando frameworks como TensorFlow e PyTorch', 'Aplicaremos esses conhecimentos em problemas práticos como classificação de imagens e reconhecimento facial, preparando você para projetos complexos e inovadores']::text[]
where id = 411 and cardinality(topics) = 1 and md5(topics[1]) = '9dd2cefef36b5163440985c9e622cfc4'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 411);

update public.disciplines set topics = array['Nesta disciplina, você aprenderá a desenvolver aplicações que funcionam em múltiplas plataformas, utilizando frameworks como React Native e Flutter', 'O foco será na criação de soluções consistentes e de alta qualidade, maximizando a reutilização de código e garantindo uma experiência uniforme em diferentes dispositivos', 'Ao final, você estará preparado para criar aplicações versáteis e escaláveis, prontas para o mercado global']::text[]
where id = 412 and cardinality(topics) = 1 and md5(topics[1]) = 'ee67a74764581bf547e28a77552f03dd'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 412);

update public.disciplines set topics = array['A computação de borda está transformando a forma como processamos e analisamos dados em tempo real', 'Nesta disciplina, você aprenderá a implementar soluções de edge computing que reduzem a latência e melhoram a eficiência dos sistemas, utilizando ferramentas como Docker e Kubernetes', 'Exploraremos casos de uso em IoT e computação distribuída, preparando você para desafios de alta tecnologia']::text[]
where id = 413 and cardinality(topics) = 1 and md5(topics[1]) = 'cc42b8ca4e9435b55019b658cb360a1b'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 413);

update public.disciplines set topics = array['O aprendizado profundo está na vanguarda da inteligência artificial, capacitando sistemas a aprenderem e tomarem decisões autônomas', 'Nesta disciplina, você aprenderá a construir modelos de deep learning utilizando frameworks como TensorFlow e Keras, aplicando-os em problemas como reconhecimento de voz e processamento de linguagem natural', 'Exploraremos também técnicas avançadas de machine learning, preparando você para o desenvolvimento de soluções inovadoras e disruptivas']::text[]
where id = 414 and cardinality(topics) = 1 and md5(topics[1]) = '0573d19c338e1a975de9e6624b94616d'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 414);

update public.disciplines set topics = array['A computação em nuvem e o big data são essenciais para a escalabilidade e análise de grandes volumes de informações', 'Você aprenderá a trabalhar com plataformas como AWS, Azure e Google Cloud para desenvolver e gerenciar infraestruturas na nuvem', 'Exploraremos também ferramentas de big data como Apache Hadoop e Spark, permitindo que você processe e análise dados massivos de forma eficiente e em tempo real']::text[]
where id = 415 and cardinality(topics) = 1 and md5(topics[1]) = '34d831f84317345f202248227ca46567'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 415);

update public.disciplines set topics = array['A visão computacional está revolucionando indústrias, permitindo automação avançada e inteligência em sistemas', 'Nesta disciplina, você aprenderá a desenvolver soluções de visão computacional utilizando OpenCV e TensorFlow', 'Aplicaremos esses conhecimentos em cenários de automação industrial, como inspeção de qualidade e robótica, integrando a visão computacional em sistemas da Indústria 4.0']::text[]
where id = 416 and cardinality(topics) = 1 and md5(topics[1]) = '2c06b8de98735a27213f1072a29d0ffe'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 416);

update public.disciplines set topics = array['O futuro da tecnologia está na interconexão de dispositivos e sistemas inteligentes', 'Aqui, você aprenderá a desenvolver soluções IoT, desde a criação de dispositivos conectados até a integração com sistemas de nuvem', 'Exploraremos plataformas como Arduino, Raspberry Pi e ESP8266, permitindo que você crie soluções embarcadas eficientes e seguras, que possam ser aplicadas em diversos setores da economia']::text[]
where id = 417 and cardinality(topics) = 1 and md5(topics[1]) = 'b630b7cc4a9363c5696d61f051b4b551'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 417);

update public.disciplines set topics = array['Com o aumento das ameaças digitais, a segurança cibernética tornou-se uma prioridade global', 'Nesta disciplina, você aprenderá a proteger sistemas e redes contra ataques, utilizando ferramentas como Wireshark, Metasploit e firewalls avançados', 'Exploraremos também técnicas de criptografia e gestão de identidades, preparando você para atuar na linha de frente da defesa cibernética']::text[]
where id = 418 and cardinality(topics) = 1 and md5(topics[1]) = '02f43596970fb07b12022db44d7329e5'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 418);

update public.disciplines set topics = array['A blockchain está transformando a economia digital, oferecendo segurança e transparência sem precedentes', 'Nesta disciplina, você aprenderá a construir e gerenciar blockchains utilizando plataformas como Ethereum e Hyperledger', 'Exploraremos também o impacto das criptomoedas e contratos inteligentes, preparando você para participar e inovar na nova economia digital']::text[]
where id = 419 and cardinality(topics) = 1 and md5(topics[1]) = 'c4877e568b4e7a76fd41fc63b36ddc45'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 419);

update public.disciplines set topics = array['Nesta disciplina, você se aprofundará em estruturas de dados e algoritmos complexos, essenciais para otimização de software', 'Exploraremos árvores AVL, heaps e grafos, bem como algoritmos de busca e ordenação avançados', 'Ferramentas como Git para versionamento e IDEs como CLion serão utilizadas para desenvolver e testar soluções que maximizem a eficiência e performance dos sistemas']::text[]
where id = 420 and cardinality(topics) = 1 and md5(topics[1]) = '60512df5a98c6b107051f35054bcd0a4'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 420);

update public.disciplines set topics = array['O processamento de linguagem natural (NLP) permite que sistemas compreendam e interajam com a linguagem humana', 'Você aprenderá a construir modelos NLP utilizando bibliotecas como NLTK, spaCy e Transformers, aplicando-os em tarefas como análise de sentimentos, tradução automática e chatbots', 'Exploraremos também a integração dessas soluções em sistemas maiores, aprimorando a experiência do usuário final']::text[]
where id = 421 and cardinality(topics) = 1 and md5(topics[1]) = '9735970344447e2b374a7939e0ab7fb6'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 421);

update public.disciplines set topics = array['A evolução dos algoritmos de aprendizado de máquina está permitindo avanços em áreas como predição e automação inteligente', 'Nesta disciplina, você aprenderá a desenvolver e otimizar algoritmos avançados, como ensemble methods e reinforcement learning, utilizando frameworks como TensorFlow e Scikit-learn', 'Exploraremos também técnicas de tuning e validação, garantindo que seus modelos sejam precisos e eficientes em cenários complexos']::text[]
where id = 422 and cardinality(topics) = 1 and md5(topics[1]) = '0c2d6fd66e16928b71f0391b2305586b'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 422);

update public.disciplines set topics = array['Os sistemas autônomos estão na vanguarda da inovação tecnológica, desde veículos autônomos até robôs industriais', 'Aqui, você aprenderá a desenvolver e controlar sistemas autônomos, utilizando plataformas como ROS (Robot Operating System) e simuladores como Gazebo', 'Exploraremos também técnicas de navegação, controle de movimento e tomada de decisão, preparando você para criar soluções que operem de forma independente e segura']::text[]
where id = 423 and cardinality(topics) = 1 and md5(topics[1]) = 'fed015c80a212401a95ccf65e3b842ec'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 423);

update public.disciplines set topics = array['A computação quântica representa a próxima grande revolução na computação, oferecendo um salto exponencial em capacidade de processamento', 'Nesta disciplina, você aprenderá os fundamentos da computação quântica, utilizando plataformas como IBM Q Experience para desenvolver algoritmos quânticos básicos', 'Exploraremos também a arquitetura dos supercomputadores e seu papel na resolução de problemas complexos, preparando você para a próxima era da computação']::text[]
where id = 424 and cardinality(topics) = 1 and md5(topics[1]) = '878c59ec7c7eb4947785e1e7a383d75b'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 424);

update public.disciplines set topics = array['A experiência do usuário (UX) e a experiência do consumidor (UC) são cruciais para o sucesso de qualquer produto digital', 'Nesta disciplina, você aprenderá a criar interfaces intuitivas e agradáveis, utilizando ferramentas como Figma e Adobe XD', 'Exploraremos também testes de usabilidade e métodos de design centrados no usuário, garantindo que suas soluções atendam às necessidades dos usuários finais']::text[]
where id = 425 and cardinality(topics) = 1 and md5(topics[1]) = 'a11c6649284c3a67443e64a3d11c249d'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 425);

update public.disciplines set topics = array['Com a crescente sofisticação dos ataques cibernéticos, a necessidade de testar e proteger sistemas nunca foi tão grande', 'Nesta disciplina, você aprenderá técnicas de hacking ético e pen testing, utilizando ferramentas como Metasploit, Burp Suite e Nmap', 'Exploraremos também o desenvolvimento de estratégias de defesa e mitigação, capacitando você a proteger infraestruturas críticas de forma proativa']::text[]
where id = 426 and cardinality(topics) = 1 and md5(topics[1]) = '8c204177c3b22cf8cfe2bfa545f25e66'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 426);

update public.disciplines set topics = array['A robótica cognitiva está unindo a inteligência artificial com a robótica para criar sistemas que podem aprender e adaptar-se', 'Aqui, você aprenderá a desenvolver robôs que utilizam inteligência de dados para tomar decisões autônomas, utilizando plataformas como ROS e TensorFlow', 'Exploraremos também a integração com sensores avançados e técnicas de machine learning para criar robôs mais inteligentes e eficientes']::text[]
where id = 427 and cardinality(topics) = 1 and md5(topics[1]) = '1f6d10e017e2f73f56c85ea78ebaa8f2'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 427);

update public.disciplines set topics = array['A performance de sistemas de dados é essencial para a eficiência e escalabilidade das soluções tecnológicas', 'Nesta disciplina, você aprenderá técnicas avançadas de tuning e otimização de bancos de dados, utilizando SQL, NoSQL e ferramentas como PostgreSQL e MongoDB', 'Exploraremos também a análise de desempenho e monitoramento em tempo real, garantindo que suas soluções sejam rápidas e confiáveis']::text[]
where id = 428 and cardinality(topics) = 1 and md5(topics[1]) = '8ed0d82f380afb47e2e46b2ab681a88d'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 428);

update public.disciplines set topics = array['O sucesso de uma startup depende de sua capacidade de tomar decisões baseadas em dados', 'Nesta disciplina, você aprenderá a desenvolver soluções de Business Intelligence (BI), utilizando ferramentas como Power BI, Tableau e Qlik', 'Exploraremos também os fundamentos de desenvolvimento de startups, desde a concepção da ideia até a execução, incluindo práticas de pitch, prototipagem e escalabilidade']::text[]
where id = 429 and cardinality(topics) = 1 and md5(topics[1]) = '779a9697e6b7d3d13f02597e2c5865d9'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 429);

update public.disciplines set topics = array['Discussão dos novos modelos de produção e negócios, em especial aos relacionados à indústria 4.0 e à sociedade 5.0', 'Integração entre automação, robótica, IOT, big data e análise de dados na tomada de decisão', 'Interoperacionalidade, transparência da informação, decisões descentralizadas e sistemas de assistência computacionais e cyberfísicos', 'Tecnologias emergentes para as áreas de negócios de uma empresa', 'Sistemas de Informação e Gestão por Processos', 'Fundamentos da sociedade 5.0 e o papel da tecnologia']::text[]
where id = 430 and cardinality(topics) = 1 and md5(topics[1]) = 'e1b2ee51eb82102ef06a4fce5c5e23eb'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 430);

update public.disciplines set topics = array['Entender como analisar e resolver problemas computacionais em um nível de abstração que está além de qualquer linguagem de programação particular, permitindo aos alunos construírem soluções mais simples e eficientes para problemas computacionais diversos', 'Linguagens de programação e programação aplicada, incluindo Python']::text[]
where id = 431 and cardinality(topics) = 1 and md5(topics[1]) = 'cdba932eb4969aaa323117fec551698e'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 431);

update public.disciplines set topics = array['Conceitos matemáticos aplicados à linguagem das funções de forma clara, contextualizada e com a resolução de problemas aplicados', 'Estudo do cálculo infinitesimal, derivadas e integrais e suas aplicações na engenharia']::text[]
where id = 432 and cardinality(topics) = 1 and md5(topics[1]) = '23cd0ff9ce6126fb26d35b27354faaaa'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 432);

update public.disciplines set topics = array['Utilização de ferramentas computacionais para criação de objetos bidimensionais e tridimensionais e estudo das técnicas de desenho e representação gráfica em engenharia', 'Desenvolvimento gráfico de projetos, esquemas tridimensionais e utilização do makerlab para criação das peças']::text[]
where id = 433 and cardinality(topics) = 1 and md5(topics[1]) = 'ebfd584e48f03b5508def4045ae20db3'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 433);

update public.disciplines set topics = array['Mecânica com aplicações em problemas de Engenharia', 'Sistemas de Medidas, Leis de Newton, trabalho e energia, potência e momento', 'Estudo dos fenômenos ondulatórios e suas aplicações']::text[]
where id = 434 and cardinality(topics) = 1 and md5(topics[1]) = '4c7083a4220714e6cceeff384221db8b'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 434);

update public.disciplines set topics = array['A disciplina introduz conceitos fundamentais da lógica computacional, álgebra de boole, conceitos e projetos de circuitos digitais', 'Também apresenta conceitos de comunicação digital']::text[]
where id = 435 and cardinality(topics) = 1 and md5(topics[1]) = '82159092d8262bbe69d3c5eaa31ce603'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 435);

update public.disciplines set topics = array['Estudo das principais Arquiteturas de Computadores e sistemas, Tablets e outros dispositivos de Hardware', 'Projeto e análise de sistemas eletrônicos', 'Desenvolvimento de Robôs Autônomos e integração de seus sistemas', 'Programação na plataforma Arduino e dispositivos atuadores eletrônicos', 'Sensoriamento']::text[]
where id = 436 and cardinality(topics) = 1 and md5(topics[1]) = 'cb80339d7ce02b7fad975d53c84dc7aa'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 436);

update public.disciplines set topics = array['Desenvolvimento de habilidades no projeto e análise de circuitos elétricos, montagens experimentais e resolução de circuitos', 'Estudo dos sinais e sua natureza', 'Técnicas de medição elétricas e auxílio na construção de robôs autônomos e soluções eletrônicas']::text[]
where id = 437 and cardinality(topics) = 1 and md5(topics[1]) = '1dbe5923dacaf4cf92230d3b993931db'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 437);

update public.disciplines set topics = array['Construção de programas que envolvam sustentabilidade e explorem a gestão no respeito e convivência com as diferenças sociais e culturais']::text[]
where id = 438 and cardinality(topics) = 1 and md5(topics[1]) = 'd9060a3a32480dfa2b3e1965cb32dc5a'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 438);

update public.disciplines set topics = array['Estudo dos sistemas de inteligência artificial', 'Aprendizado de máquina, árvores de decisão e redes neurais', 'Modelos de Deep learning e IA Generativa', 'Utilização da computação evolutiva e processamento de linguagem natural na resolução de problemas.Estudo dos LLMs e outros sistemas de IA Generativa']::text[]
where id = 439 and cardinality(topics) = 1 and md5(topics[1]) = '5cb4eb375e63839ff5f64ea68910cb11'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 439);

update public.disciplines set topics = array['Estudo dos bancos de dados e seu projeto', 'Modelagem relacional, estruturas de armazenamento em bancos de dados relacionais e manipulação de dados utilizando linguagem SQL', 'Programação PL/SQL e Transact SQL', 'SGBD Oracle e SQL server']::text[]
where id = 440 and cardinality(topics) = 1 and md5(topics[1]) = '0b9b7b2bdba846bfbae405628fd526ed'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 440);

update public.disciplines set topics = array['Estudo mais avançado da matemática com cálculos de funções e equações com múltiplas variáveis e suas utilizações no campo da Engenharia', 'Uso de equações diferenciais para representação de fenômenos físicos', 'Análise de séries e transformadas como ferramentas para processamento de sinais e imagens', 'Fundamentos do Cálculo Numérico']::text[]
where id = 441 and cardinality(topics) = 1 and md5(topics[1]) = '97fec3d400908ae23ac48c8d43042cb7'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 441);

update public.disciplines set topics = array['Técnicas estatísticas na análise de dados relacionados à área de engenharia', 'A importância do tratamento matemático estatístico nas tomadas de decisão', 'Definição de eventos, Espaços Amostrais, Variáveis Aleatórias Discretas e Contínuas', 'Testes de Hipóteses e cenários para tomadas de decisão']::text[]
where id = 442 and cardinality(topics) = 1 and md5(topics[1]) = 'a9e8e33b5d902172fcff3cab097716ce'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 442);

update public.disciplines set topics = array['Projeto e análise de circuitos eletrônicos com diodos, transistores e amplificadores operacionais', 'Utilização de componentes eletrônicos em circuitos práticos e no projeto de dispositivos']::text[]
where id = 443 and cardinality(topics) = 1 and md5(topics[1]) = '080d3f59db21daeea7b0b53c4dca9144'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 443);

update public.disciplines set topics = array['Utilização de ferramentas computacionais para construção de circuitos e placas eletrônicas', 'Técnicas de posicionamento, roteamento e layout', 'Estudo dos processos de fabricação industriais e das tecnologias como Through-Hole Technology e Surface Mount Technology']::text[]
where id = 444 and cardinality(topics) = 1 and md5(topics[1]) = '0beb43a00ad768651fb81f4b3e195aae'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 444);

update public.disciplines set topics = array['Estudo de linguagens de programação orientadas a objeto, em especial a linguagem Java', 'Desenvolvimento de programas e projetos de software utilizando a linguagem orientada a objetos Java (JSE, JEE)', 'Manipulação de Banco de Dados (JDBC)', 'Design patterns', 'Desenvolvimento de soluções Mobile.Tecnologias como React entre outras']::text[]
where id = 445 and cardinality(topics) = 1 and md5(topics[1]) = '01bf08b614ccdaebe192a0efc750afd0'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 445);

update public.disciplines set topics = array['Leis da termodinâmica e suas aplicações no projeto de supercomputadores', 'Estudo da eletricidade, sua natureza e seu comportamento, com aplicações desses conceitos em problemas relativos à área de engenharia', 'Carga elétrica, condutores e isolantes, lei de Coulomb, campo elétrico, movimento de cargas nos campos elétricos, potencial elétrico, energia eletrostática e capacitância, corrente elétrica', 'Circuitos em corrente contínua e alternada, potência e energia elétrica', 'Fenômenos magnéticos e suas implicações']::text[]
where id = 446 and cardinality(topics) = 1 and md5(topics[1]) = '81ef2d319d5092f48bf7338b85ac9494'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 446);

update public.disciplines set topics = array['Estudo do funcionamento dos Microprocessadores e Microcontroladores e sua utilização', 'Desenvolvimento de soluções e projetos integrados de Eletrônica, Automação e Programação']::text[]
where id = 447 and cardinality(topics) = 1 and md5(topics[1]) = '94948258d4a81f0fba2867ceb24814ab'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 447);

update public.disciplines set topics = array['Trata dos aspectos de administração do banco de dados, como segurança de acesso, rotinas de manutenção como expansão e backup do banco, carga de dados além de conceitos de gerência de banco de dados multiusuário, gerenciamento de transações, controle de concorrência, recuperação de falhas, segurança e integridade de dados', 'O estudante também aprende sobre gestão, documentação e monitoração de ambiente de BD']::text[]
where id = 448 and cardinality(topics) = 1 and md5(topics[1]) = 'fb27d29bc206b8d12acbae29f5ee0172'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 448);

update public.disciplines set topics = array['A disciplina tem por objetivo fornecer ao aluno uma visão fundamental dos conceitos envolvidos na concepção e funcionamento de sistemas operacionais', 'Além disso, o aluno aprende como um Sistema Operacional gerencia o processador, a memória e aloca recursos']::text[]
where id = 449 and cardinality(topics) = 1 and md5(topics[1]) = 'e4b27d00c9dc0ea5d25f3d7417affada'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 449);

update public.disciplines set topics = array['Desenvolvimento de algoritmos de alta performance, utilizando ponteiros, listas, pilhas, filas e árvores', 'Tabelas Hash', 'Estudo de algoritmos de pesquisa e ordenação', 'Algoritmos recursivos', 'Árvores', 'Árvores binárias', 'Métodos de percursos em árvores', 'Critérios de medida de eficiência', 'Análise de complexidade de problemas e estudo das classes P, NP NP-Completo e NP-difícil']::text[]
where id = 450 and cardinality(topics) = 1 and md5(topics[1]) = 'f047dbf60d1d5511816798b540f2244a'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 450);

update public.disciplines set topics = array['Apresenta o projeto e concepção de softwares a partir de estudo de Casos de Uso, UML, CMMI, levantamento de requisitos de software', 'Apresenta as métricas de processo e projeto de software, discutindo o planejamento, análise e gestão de riscos além da garantia de qualidade em softwares']::text[]
where id = 451 and cardinality(topics) = 1 and md5(topics[1]) = '975d9f0b35c5d9c74d3cce9f292a27c8'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 451);

update public.disciplines set topics = array['Tipos de redes, protocolos, dispositivos de redes, roteadores, switches, armazenamento de dados, roteamento de dados', 'Introdução aos conceitos de segurança da Informação', 'Modelo CIDA de segurança', 'Uso de simuladores para a construção de redes e a configuração dos elementos da rede e seus protocolos']::text[]
where id = 452 and cardinality(topics) = 1 and md5(topics[1]) = 'b469913b5150f13e2d43a371ae13a7ff'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 452);

update public.disciplines set topics = array['Compreensão do ciclo de desenvolvimento de hardware e software para dispositivos inteligentes', 'Análise de casos de smart devices para diferentes indústrias (saúde, agricultura, varejo etc)', 'Técnicas de digital twiins para elaboração de dispositivo eletromecânicos', 'Prototipação 3D e produção de protótipos']::text[]
where id = 453 and cardinality(topics) = 1 and md5(topics[1]) = '9950208cfe1ed2898689489bbf886721'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 453);

update public.disciplines set topics = array['Estudo e aplicação dos conceitos de Segurança, Criptografia e Firewall', 'Protocolos de roteamento avançado, OSPF, RIP, EIGRP', 'Segurança da informação aplicada, criação de ACLs, VLANs, configuração de Firewall, Proxy e VPN', 'Ferramentas de defesa', 'Ferramentas de Ataque', 'Pentest e outros recursos']::text[]
where id = 454 and cardinality(topics) = 1 and md5(topics[1]) = '02a486248209e73a3e608b60463757c2'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 454);

update public.disciplines set topics = array['Sistemas de Telecom e Triple Play: VoIP, Videoconferência e Dados', 'Sistemas móveis celulares de Telefonia: GSM, 3G, 4G e 5G', 'Análise da infraestrutura de operação dos sistemas 3G, 4G e 5G', 'Sistemas Cyber físicos estão transformando o jeito como as pessoas interagem com os sistemas de engenharia, pela incorporação simbiótica de hardware/software e sistemas inteligentes, com tomadas de decisão pelas máquinas', 'Alguns dos setores de estudo são a agricultura, transporte, saúde, energia e manufatura']::text[]
where id = 455 and cardinality(topics) = 1 and md5(topics[1]) = '14d5f0d7221c4def17c1e4884fb15865'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 455);

update public.disciplines set topics = array['Modelagem dos mais variados sistemas dinâmicos, como os térmicos, elétricos, mecânicos e biológicos', 'Emprego de malhas de controle para otimização de sistemas']::text[]
where id = 456 and cardinality(topics) = 1 and md5(topics[1]) = '2f7507f29835515cee353ad81f5baebf'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 456);

update public.disciplines set topics = array['Conhecer e projetar os sistemas de controle inteligente, automação industrial e comercial, envolvendo engenharia de controle e controle de máquinas em processos industriais', 'Automação de processos industriais contínuos e discretos e robótica', 'Uso de sensores e atuadores, controladores, CLPS, sistemas scada e automação em rede', 'Levantamento de requisitos robóticos em linhas de produção industriais']::text[]
where id = 457 and cardinality(topics) = 1 and md5(topics[1]) = '6c9c36b63572d80af84948517436552e'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 457);

update public.disciplines set topics = array['Realidade Virtual e Aumentada', 'Uso das transformações geométricas em duas e três dimensões para representação virtual de objetos', 'Elementos da percepção visual humana e suas relações com a computação', 'Técnicas computacionais de compressão e restauração de imagens', 'Reconhecimento de padrões e extração de informações em imagens estáticas e dinâmicas']::text[]
where id = 458 and cardinality(topics) = 1 and md5(topics[1]) = 'd2402db968c3547fdae6c8692b85e84b'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 458);

update public.disciplines set topics = array['Integração hardware/software', 'Verificação e Validação do sistema', 'Desenvolvimento de projeto de sistema embarcado com limitação de recursos (energia, comunicação, processamento, armazenamento)', 'Estudo da confiabilidade, segurança de informações e desenvolvimento a partir de requisitos', 'Características dos sistemas em tempo real']::text[]
where id = 459 and cardinality(topics) = 1 and md5(topics[1]) = 'aa34b4520c747c8c34f8504ffe93dc4d'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 459);

update public.disciplines set topics = array['Adição do poder de diversos computadores interligados por uma rede para compartilhar a execução de tarefas', 'Computação nômade, pervasiva e ubíqua', 'Modelos de interação, comunicação', 'Estudos dos tipos de falhas por omissão, temporização, sincronismo e arbitrárias do sistema de comunicação']::text[]
where id = 460 and cardinality(topics) = 1 and md5(topics[1]) = 'f59f46cfe3c8aae891289f713df4563e'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 460);

update public.disciplines set topics = array['Estudo e desenvolvimento de sistemas de energia sustentável e renovável, incluindo o projeto, controle e automação de fontes de energia alternativas', 'Exploração das tecnologias de conversão de energia solar, eólica, hidráulica e biomassa, além de sistemas híbridos', 'Uso de sensores, atuadores, sistemas de controle distribuído e gerenciamento de energia em redes inteligentes (smart grids)', 'Implementação e integração de sistemas de armazenamento de energia e microgrids em processos industriais e comerciais', 'Levantamento de requisitos para a adoção de tecnologias sustentáveis em diferentes setores e análise de impacto ambiental', 'Simulação e otimização de sistemas energéticos sustentáveis']::text[]
where id = 461 and cardinality(topics) = 1 and md5(topics[1]) = '198fe81df6847ebd237fd8f478cd748c'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 461);

update public.disciplines set topics = array['Utilização de técnicas de inteligência competitiva para desenvolver soluções reais para problemas do dia a dia, entendendo o conceito de start-up', 'Oferece a base para o despertar de novos negócios promissores e para que a prática do projeto saia do papel, tornando-se real', 'Estudo das interfaces homem-máquina e formas de interação homem computador', 'Análise e uso de ferramentas para User Experience', 'Prototipação, documentação e gestão de equipes']::text[]
where id = 462 and cardinality(topics) = 1 and md5(topics[1]) = 'e4eee6080842142d3b7f1bf742e2780a'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 462);

update public.disciplines set topics = array['Os algoritmos estão inseridos em quase todas as áreas da nossa vida', 'Podemos encontrá-los em computadores, notebooks, tablets, smartphones, TVs inteligentes, robôs e muitos outros equipamentos', 'Entenda como construir soluções eficientes para diversos problemas computacionais em uma das principais linguagens da atualidade: Python', 'Domine a base necessária para programar em outras linguagens como: Java, C#, C e muitas outras', 'Crie programas e aplicativos que interajam com os usuários e os auxiliem no seu dia a dia', 'E ainda desenvolva seu conhecimento com o aprendizado orientado a dados']::text[]
where id = 463 and cardinality(topics) = 1 and md5(topics[1]) = '7bc53dda9fcc6f3552e449050ef5636a'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 463);

update public.disciplines set topics = array['Conceitos matemáticos aplicados à linguagem das funções de forma clara, contextualizada e com a resolução de problemas aplicados', 'Estudo do cálculo infinitesimal, derivadas e integrais e suas aplicações']::text[]
where id = 464 and cardinality(topics) = 1 and md5(topics[1]) = 'e00cfabb9ebd4c0816001c0ce2b3cc89'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 464);

update public.disciplines set topics = array['Entenda o funcionamento de Sistemas Computacionais, elementos de hardware e o impacto em softwares', 'Nessa matéria você aprenderá como aplicar computação de borda para coleta de dados, processamento e sensoriamento remoto', 'Instrumentos básicos de medição, microcontroladores e sensores', 'Você se desenvolverá para estar em interação direta com os times ágeis e DevOps, colaborando com as entregas de valor agregado para o cliente']::text[]
where id = 465 and cardinality(topics) = 1 and md5(topics[1]) = 'cbf3fd32a00e3cb020c47d95b9f7b279'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 465);

update public.disciplines set topics = array['Construção de programas que envolvam sustentabilidade e gestão na convivência com as diferenças sociais e culturais, além de aspectos éticos que envolvem as empresas de TI']::text[]
where id = 466 and cardinality(topics) = 1 and md5(topics[1]) = 'ab6efb031efb0933cc99591b50298258'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 466);

update public.disciplines set topics = array['Nessa disciplina você será preparado para ser um Front-End Developer com skills para atender o Customer Experience do projeto e fazer o desenvolvimento Hands On de páginas web e Marketplaces de forma responsiva', 'Com o movimento Mobile First, a larga utilização de smartphones, tamanhos de telas diferenciados e vários navegadores disponíveis, é essencial que suas páginas web tenham um funcionamento responsivo para as mais diferentes plataformas', 'Nesta parte do curso, você aprenderá como desenvolver web sites responsivos que atendam as diversas plataformas disponíveis para usuários, através de linguagens semânticas como HTML 5, CSS e Javascript, além de trabalhar com bibliotecas como Jquery e frameworks', 'Atendendo as atuais exigências do mercado de desenvolvedor web']::text[]
where id = 467 and cardinality(topics) = 1 and md5(topics[1]) = '4c0beac407019651ce88afb6932232f5'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 467);

update public.disciplines set topics = array['Aprenda a explorar requisitos para um projeto de software, criar modelos de integrados', 'Gerencie projetos de forma ágil, mobilizando equipes full stack para a realização dos trabalhos do ciclo de vida de planejamento, desenvolvimento, avaliação e entrega de software', 'Crie protótipos funcionais com base nas melhores práticas de UX/UI', 'Tudo integrado à Total Experience (TX) que engloba a experiência completa da empresa, do funcionário ao cliente e ao usuário, fornecendo um ambiente de excelência para todos', 'Torne-se um profissional de projetos especialista no mapeamento de requisitos e entrega de valor agregado para o cliente']::text[]
where id = 468 and cardinality(topics) = 1 and md5(topics[1]) = '44e6b5b30706e503f3c8f3b70289378d'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 468);

update public.disciplines set topics = array['Não basta apenas desenvolver boas soluções', 'O engenheiro de software deve apoiar as estratégias de negócios e aprender a utilizar dados com técnicas de storytelling para vender uma ideia, produto ou serviço, com apresentações marcantes, humanizando empresas, gerando identificação, engajando e emocionando o público', 'Inspirações empreendedoras para quebrar os padrões convencionais, conquistando clientes e investidores por meio de UX Writing']::text[]
where id = 469 and cardinality(topics) = 1 and md5(topics[1]) = '9a42f58aa808d4f2f82c0a09bc33a4b2'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 469);

update public.disciplines set topics = array['Você vai desenvolver aplicações web com arquitetura MVC utilizando os padrões da W3C, web semântica e SEO', 'Através das tecnologias: HTML 5, CSS 3, Javascript, React e Jquery, preparando-se para ser Fullstack Developer através dos conhecimentos de Front-End, fazendo a integração do front com o Back-End']::text[]
where id = 470 and cardinality(topics) = 1 and md5(topics[1]) = 'd631e0622824fab1c7aae3dd13a1767e'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 470);

update public.disciplines set topics = array['Gerenciar projetos com técnicas de gestão ágil com foco no Scrum e aprendizado do XP e Kanban', 'Essa matéria levará você a uma imersão de conceitos e boas práticas utilizadas por grandes empresas que adotam agilidade em sua cultura, como Spotify, Netflix e Google, realizando entregas em curtos espaços de tempo, priorizando as etapas e superando as expectativas dos seus clientes através do método ágil e com os Squads Frameworks, formando o Agile Master']::text[]
where id = 471 and cardinality(topics) = 1 and md5(topics[1]) = 'a4711c26cb6ad284674ae482c52f550f'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 471);

update public.disciplines set topics = array['Entenda as tecnologias para o desenvolvimento das soluções em Realidade Virtual e aumentada usando engines como Unreal e Unity, e utilizando a criação de modelos tridimensionais e interações virtuais', 'No tocante ao aumento exponencial dessa necessidade, devido à expansão da nossa nova realidade de vida com a utilização do metaverso, este conteúdo é fundamental e sua absorção e prática com conhecimentos hands on, ainda mais']::text[]
where id = 472 and cardinality(topics) = 1 and md5(topics[1]) = '6e872ae11e64a851f337436f78411a31'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 472);

update public.disciplines set topics = array['A programação dinâmica é um método para resolver eficientemente uma ampla gama de problemas de busca e otimização que exibem a propriedade de subproblemas sobrepostos e subestrutura ótima', 'Em termos mais simples, é uma técnica de otimização usada para resolver problemas, dividindo-os em subproblemas mais simples e armazenando as soluções desses subproblemas para que não precisem ser recalculados', 'Este método é particularmente útil quando um problema pode ser dividido em subproblemas sobrepostos, o que significa que os mesmos subproblemas são resolvidos várias vezes']::text[]
where id = 473 and cardinality(topics) = 1 and md5(topics[1]) = 'c9379fa2485d937aca36f76b52166dcf'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 473);

update public.disciplines set topics = array['Aprenda conceitos de estatística e probabilidade a partir de grandes bases de dados', 'Neste curso, aprenderemos os fundamentos matemáticos que permeiam a cultura Data Driven que toma conta do mercado nos dias de hoje', 'e todos os fundamentos do statistical learning, como definição de eventos, espaços amostrais, variáveis aleatórias (discretas e contínuas), testes de hipótese e cenários para tomadas de decisões', 'Será feito uso extenso de frameworks de Data Science e bibliotecas específicas']::text[]
where id = 474 and cardinality(topics) = 1 and md5(topics[1]) = 'a2670787f98339dcea5e65bf076c36d0'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 474);

update public.disciplines set topics = array['Aprenda a ser um DBA com estudo de banco de dados ao seu projeto', 'Modelagem relacional, estruturas de armazenamento em bancos de dados relacionais e manipulação de dados utilizando linguagem SQL', 'Programação PL/SQL e Transact SQL', 'SGBD Oracle, SQL server e tudo isso em uma imersão orientada a dados', 'Além de apoiar as estratégias de negócios estruturando dados com modelagem dimensional e processo de ETL']::text[]
where id = 475 and cardinality(topics) = 1 and md5(topics[1]) = '9c509e597da73485ed3a4cbd2636d6f8'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 475);

update public.disciplines set topics = array['Trabalhe com os principais frameworks de mercado das plataformas Java e estudo de linguagens de programação orientadas a objeto (POO) com a sintaxe de uma linguagem que é de distribuição de multiplataforma universal', 'E, assim, torne-se preparado para os melhores e mais desafiantes projetos de tecnologia, alocando POO e conexão a banco de dados em alta performance e orientação a dados']::text[]
where id = 476 and cardinality(topics) = 1 and md5(topics[1]) = '3f50622c9f10b4dbfb847d4a3253f15a'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 476);

update public.disciplines set topics = array['Aprenda noções de infraestrutura de rede para disponibilizar as informações 100% do tempo para todos os usuários do mundo', 'Planificação dos endereços IPV4 e IPV6', 'Projetos de Redes de Computadores, utilizando Virtualização, fundamentos de Cloud Computing, Simulações, Roteadores, Switches e aplicação de projeto para o 5G, um tema de grande demanda de profissionais para essa década']::text[]
where id = 477 and cardinality(topics) = 1 and md5(topics[1]) = '992878d0ce541eba433d9ffb34a89355'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 477);

update public.disciplines set topics = array['Conceitos relacionados à web services e à Arquitetura Orientada a Serviços (SOA)', 'Os principais serviços e protocolos de Web Services como UDDI, SOAP, WSDL e APIs para processamento de arquivos XML', 'Desenvolvimentos de aplicações SOA utilizando diferentes linguagens', 'BPM e BPEL', 'Disponibilidade de infraestrutura para webservices e SOA', 'Aplicações JEE com EJB sendo cliente e provedor do serviço', 'APIs com J2ME e RESTful Web Services']::text[]
where id = 478 and cardinality(topics) = 1 and md5(topics[1]) = '5f0547b98e9112ceb77a0f5048adf21a'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 478);

update public.disciplines set topics = array['Você aprenderá como aplicar uma abordagem dinâmica à resposta a incidentes', 'Usando indicadores de comprometimento, você praticará as etapas para responder efetivamente a violações que afetam plataformas Windows, Linux e em nuvem, desenvolvendo a capacidade de levar as habilidades e experiência prática adquiridas no curso de volta para o escritório e aplicá-las imediatamente', 'Compreender as etapas para conduzir efetivamente a resposta a incidentes é apenas uma parte da equação', 'Para compreender totalmente as ações que os invasores realizam contra uma organização, desde o comprometimento inicial até a articulação interna da rede, você fará uma imersão em todas as etapas que envolvem a cybersecurity para entender efetivamente suas ferramentas e técnicas']::text[]
where id = 479 and cardinality(topics) = 1 and md5(topics[1]) = 'cd25ddb4c4e50795dfbe5cc3fa722dc6'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 479);

update public.disciplines set topics = array['Você aprenderá, na prática, a realizar o desenvolvimento orientado a objetos na linguagem C#, podendo desenvolver as melhores soluções para as melhores plataformas, ganhando a possibilidade de criar sistemas e pensar em arquiteturas de software baseadas nesta linguagem de alta performance']::text[]
where id = 480 and cardinality(topics) = 1 and md5(topics[1]) = '933c93f612c7daeea4f0d315a7b6d598'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 480);

update public.disciplines set topics = array['Esta disciplina apresenta os fundamentos da inteligência artificial e suas aplicações', 'São discutidas as formas de representação do conhecimento e os modelos interativos de previsão', 'Fundamentos dos sistemas especialistas', 'Técnicas de Aprendizagem', 'Agentes Inteligentes', 'Machine Learning', 'Regressão, Classificação', 'Clustering, Naive Bayes, árvores de decisão', 'Algoritmos Genéticos, Redes Neurais artificiais, Deep learning, Visão computacional, Processamento de Linguagem Natural', 'Self organizing maps, análise das componentes principais (PCA) e Support vector machines']::text[]
where id = 481 and cardinality(topics) = 1 and md5(topics[1]) = '82bcdfe6d298f6d20a9ff51f851e8ae6'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 481);

update public.disciplines set topics = array['A utilização do uso de soluções para mobile gera o aumento constante da demanda para o desenvolvimento de aplicações multiplaforma', 'Nesta matéria você será capacitado como um Mobile Developer, atendendo a crescente busca por profissionais com esse perfil', 'Isso significa ter o controle de múltiplas funções na palma da sua mão entendendo a fundo o conteúdo de desenvolvimento mobile & IoT, e integrando o melhor da sociedade 5.0 com os resultados obtidos da evolução da indústria 4.0']::text[]
where id = 482 and cardinality(topics) = 1 and md5(topics[1]) = 'f179a2031c8167a621fe1c70737743f8'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 482);

update public.disciplines set topics = array['O conceito da utilização de virtualização é algo que já é utilizado há algum tempo em servidores, para aproveitar ao máximo a performance disponível em um hardware', 'Porém, agora, a necessidade passa a ser local', 'E conseguir diferenciar um sistema operacional Linux, Windows ou outras plataformas é o que será ensinado com atividades hands on']::text[]
where id = 483 and cardinality(topics) = 1 and md5(topics[1]) = '78480b866122479c245552ce7c6f807a'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 483);

update public.disciplines set topics = array['Aprendizado das novas tendências tecnológicas envolvendo Internet das Coisas (IoT), Internet do Comportamento (IoB) e Inteligência Artificial (IA)', 'Placas de desenvolvimento: Arduino e Raspberry', 'Tecnologias de Conectividade: Wi-fi, Bluetooth, RFID', 'Arquitetura M2M com MQTT', 'Conexão com assistentes pessoais', 'Embedded Systems', 'Estudos de sistemas de inteligência artificial', 'Conhecimento facial e localização', 'Machine Learning']::text[]
where id = 484 and cardinality(topics) = 1 and md5(topics[1]) = '57d1901d0b812f7024c25d5ba8cb3dfd'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 484);

update public.disciplines set topics = array['Realizar entrega com a qualidade esperada pelo cliente depende de saber planejar, aplicar, controlar e automatizar testes sobre software e dados', 'Pois isso traz inteligência e agilidade para entregar novidades de forma continuada, alimentando as pessoas e as empresas com novas aplicações que modificam, simplificam e aprimoram sua vida', 'Conheça os fundamentos da qualidade de software e descubra como colocar as melhores práticas de testes para funcionar, melhorando a sua produtividade no trabalho e os resultados para você e para a sua organização, destacando-se pela entrega com qualidade']::text[]
where id = 485 and cardinality(topics) = 1 and md5(topics[1]) = '3797f4467684a88aed56d454e51d7fc4'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 485);

update public.disciplines set topics = array['A disciplina de Inteligência Artificial Generativa para Engenharia apresenta os conceitos fundamentais da Inteligência Artificial Generativa, abordando desde modelos de geração de texto e imagem até aplicações avançadas com sistemas multiagentes e retrieval augmented generation (RAG)', 'O conteúdo combina teoria e prática, utilizando frameworks populares como TensorFlow, PyTorch, LangChain e CrewAI']::text[]
where id = 486 and cardinality(topics) = 1 and md5(topics[1]) = '95bd9e42148f743dd720fafba59ae034'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 486);

update public.disciplines set topics = array['Entenda as principais arquiteturas para ingestão, processamento e análise de grandes volumes de dados', 'Conheça as principais ferramentas open-source de Big Data como Hadoop, Spark, Sqoop, NiFi, Flume, Kafka, Zookeeper, HBase e Hive e as integre com as ferramentas de extração, transformação e carga de dados em modelos dimensionais', 'Entenda conceitos sobre computação paralela e distribuída, como MapReduce, aplicação do Hadoop e bases Apache, e arquiteturas serverless e desacopladas', 'Veja como visualizar os dados estruturados ou não estruturados com ferramentas de Self-Service Business Intelligence como PowerBI, utilizando as melhores práticas de visualização de dados']::text[]
where id = 487 and cardinality(topics) = 1 and md5(topics[1]) = 'b8965bb368c0563e96e3d627c9090aa4'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 487);

update public.disciplines set topics = array['Seja um business analytics com a utilização de técnicas de inteligência competitiva para desenvolver soluções reais para problemas do dia a dia, entendendo o conceito de startup', 'Este conteúdo oferece a base para que você possa despertar novos negócios promissores e para que a prática do projeto saia do papel, tornando-se real', 'Desenvolva negócios sustentados não somente pela tecnologia, mas também unindo a TI com o BI através da apresentação de relatórios, gerando insights preditivos, e tendo assim maior alcance de mercado, até mesmo onde os pequenos e novos players não costumam encontrar espaço']::text[]
where id = 488 and cardinality(topics) = 1 and md5(topics[1]) = '6964654f4ff352b35a71a772f0cf5766'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 488);

update public.disciplines set topics = array['A disciplina de Visão Computacional Aplicada visa capacitar os alunos com conhecimentos teóricos e práticos sobre técnicas de visão computacional e suas aplicações em sistemas de software', 'Os alunos aprenderão a trabalhar com algoritmos de processamento de imagem, reconhecimento de padrões e análise visual, desenvolvendo projetos que aplicam essas tecnologias em áreas como inteligência artificial, automação e interação homem-máquina em cenários do mundo real']::text[]
where id = 489 and cardinality(topics) = 1 and md5(topics[1]) = 'a7c99579c36b959e2f43e404841aea47'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 489);

update public.disciplines set topics = array['A disciplina Robotic Process Automation (RPA) explora conceitos, ferramentas e aplicações da automação de processos com robôs de software', 'Seu objetivo é ensinar como otimizar tarefas repetitivas, integrar sistemas e aumentar a eficiência operacional por meio de tecnologias avançadas', 'A disciplina abrange desde os fundamentos do RPA até sua implementação prática, integração com inteligência artificial e governança']::text[]
where id = 490 and cardinality(topics) = 1 and md5(topics[1]) = '539a70ed680f4b60b857bfeaf041372b'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 490);

update public.disciplines set topics = array['Para sobreviver nessa nova era digital, em que a exigência é agilidade, flexibilidade e escalabilidade da infraestrutura para resolver problemas simples e complexos, as organizações estão migrando rapidamente para a computação em nuvem, que vai muito além da adoção de um ambiente remoto para uso computacional', 'Esta matéria tem como objetivo criar uma base sólida e alinhada com o mundo corporativo, para que você se torne qualificado em preparar e monitorar plataformas de virtualização em nuvem', 'Isso significa aprender na prática como implementar projetos estratégicos de TI de forma rápida e segura, integrando as equipes de desenvolvimento de sistemas, infraestrutura e operação com o uso de métodos ágeis e inúmeras tecnologias embarcadas em cloud computing', 'Entender os serviços sob demanda fornecidos pela Cloud (IaaS, SaaS e PaaS)', 'Implantar e monitorar o comportamento da sua aplicação de maneira automatizada']::text[]
where id = 491 and cardinality(topics) = 1 and md5(topics[1]) = '937fe52d8f4bf79c70d606ba45e4a59d'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 491);

update public.disciplines set topics = array['O laboratório de habilidades apresenta as técnicas para concepção de projetos de engenharia, medições físicas (mecânicas e elétricas), uso do espaço Maker e suas ferramentas (cortadora laser, impressoras 3D)', 'Conceitos de metrologia, leitura de projetos e análise de peças mecânicas', 'Ferramentas e instrumentos de fabricação', 'Os alunos também têm contato com plataformas de prototipação como arduino e raspberry para construção de soluções com leitores de ondas cerebrais, motores, atuadores e outros instrumentos, preparando-os para o Startup One', 'Os alunos terão contato com Scrum para gerenciar seus projetos e conceitos de indústria 4.0']::text[]
where id = 492 and cardinality(topics) = 1 and md5(topics[1]) = 'd524f4607e886f541f30709118bc0bfb'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 492);

update public.disciplines set topics = array['Primeiros passos para compreender o mundo da programação de computadores', 'Desenvolvimento do raciocínio lógico através de uma linguagem de programação do mercado, como o Python']::text[]
where id = 493 and cardinality(topics) = 1 and md5(topics[1]) = 'f32808fe1c25c5082ee60b526b5d1a28'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 493);

update public.disciplines set topics = array['Utilização de ferramentas computacionais para criação de objetos bidimensionais e tridimensionais e estudo das técnicas de desenho e representação gráfica em engenharia', 'Desenvolvimento gráfico de projetos']::text[]
where id = 494 and cardinality(topics) = 1 and md5(topics[1]) = 'c5a57d2001fd5d3afa6fd8874b82d688'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 494);

update public.disciplines set topics = array['Mecânica com aplicações em problemas de engenharia', 'Sistemas de medidas, leis de Newton, trabalho e energia, potência e momento', 'Estudo dos fenômenos ondulatórios e suas aplicações']::text[]
where id = 495 and cardinality(topics) = 1 and md5(topics[1]) = 'f816baca11afa0e48145492a5ee4d2b9'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 495);

update public.disciplines set topics = array['Construção de soluções que envolvam sustentabilidade e explorem a gestão no respeito e convivência com as diferenças sociais e culturais']::text[]
where id = 496 and cardinality(topics) = 1 and md5(topics[1]) = 'ed2e8a95a9c234515df39cdf2df1a120'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 496);

update public.disciplines set topics = array['Conceitos matemáticos aplicados à linguagem das funções de forma clara, contextualizada e com a resolução de problemas aplicados', 'Estudo do cálculo infinitesimal, derivadas e integrais e suas aplicações na engenharia']::text[]
where id = 497 and cardinality(topics) = 1 and md5(topics[1]) = '23cd0ff9ce6126fb26d35b27354faaaa'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 497);

update public.disciplines set topics = array['O laboratório de habilidades apresentará as técnicas para concepção de projetos de engenharia, medições físicas (mecânicas e elétricas), uso do espaço Maker e suas ferramentas (cortadora laser e impressoras 3D)', 'Os alunos também terão contato com plataformas arduino para construção de soluções com leitores de ondas cerebrais, motores, atuadores e outros instrumentos, de acordo com a competição do primeiro ano']::text[]
where id = 498 and cardinality(topics) = 1 and md5(topics[1]) = 'e3ba457d99336f6a04957620a5b8a66f'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 498);

update public.disciplines set topics = array['Nesta disciplina, serão desenvolvidos protótipos funcionais integrando hardware, software e sensoriamento por meio de plataformas amplamente utilizadas no mercado, como Arduino, Raspberry Pi e ESP32, explorando a prototipagem rápida de sistemas capazes de coletar, processar e responder a dados do ambiente físico', 'Ao longo das atividades práticas, serão utilizados sensores e atuadores para monitoramento de variáveis como temperatura, umidade, luminosidade, gases e movimento, além de módulos de comunicação e interfaces físicas, permitindo a validação de soluções reais', 'Ao final, você estará apto(a) a projetar e testar sistemas embarcados aplicáveis à automação, Internet das Coisas, cidades inteligentes e soluções voltadas à sustentabilidade']::text[]
where id = 499 and cardinality(topics) = 1 and md5(topics[1]) = 'd8e776fa31b10b461e060b26d01456ac'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 499);

update public.disciplines set topics = array['Esta disciplina fornecerá a base técnica essencial para a engenharia mecatrônica, abordando os fundamentos da eletricidade, a análise de circuitos analógicos e digitais e o funcionamento dos principais componentes eletrônicos', 'Você aprenderá a projetar, analisar e testar circuitos utilizando resistores, capacitores, indutores, diodos, transistores e circuitos integrados, além de sistemas digitais baseados em portas lógicas e lógica combinacional', 'Por meio de simulações e atividades práticas, serão desenvolvidas competências fundamentais para a atuação em automação, sistemas embarcados, robótica e dispositivos inteligentes']::text[]
where id = 500 and cardinality(topics) = 1 and md5(topics[1]) = '371cc1074044c92f7ca2829749e3d576'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 500);

update public.disciplines set topics = array['Nesta disciplina, serão estudados os fundamentos e aplicações dos sistemas de movimento utilizados na engenharia mecatrônica, abordando motores de corrente contínua, motores de passo, servomotores e motores de corrente alternada, além de seus respectivos drivers e sistemas de acionamento', 'Serão explorados conceitos de torque, velocidade, aceleração, eficiência energética e controle de movimento, integrando sensores de posição e velocidade', 'Por meio de simulações e aplicações práticas, serão desenvolvidas soluções voltadas à robótica, automação industrial, veículos elétricos e sistemas de posicionamento de alta precisão']::text[]
where id = 501 and cardinality(topics) = 1 and md5(topics[1]) = 'c59022928e883a33f7ef9e80f0fd1396'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 501);

update public.disciplines set topics = array['Estudo mais avançado da matemática com cálculos de funções e equações com múltiplas variáveis e suas utilizações no campo da engenharia', 'Uso de equações diferenciais para representação de fenômenos físicos', 'Análise de séries e transformadas como ferramentas para processamento de sinais e imagens']::text[]
where id = 502 and cardinality(topics) = 1 and md5(topics[1]) = '48742758c9fa28ea5eca977334c18fc6'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 502);

update public.disciplines set topics = array['Técnicas estatísticas na análise de dados relacionados à área de engenharia', 'A importância do tratamento matemático estatístico nas tomadas de decisão', 'Definição de eventos, Espaços Amostrais, Variáveis Aleatórias Discretas e Contínuas', 'Testes de Hipóteses e cenários para tomadas de decisão', 'Programação Python e R']::text[]
where id = 503 and cardinality(topics) = 1 and md5(topics[1]) = '868a9b2ba0d021eaddba129e874a3909'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 503);

update public.disciplines set topics = array['Estudo dos processos químicos industriais e as características físico-químicas dos materiais', 'Processos de obtenção de metais e processos de conformação', 'Engenharia de superfície', 'Técnicas de polimerização, caracterização de materiais e segurança química']::text[]
where id = 504 and cardinality(topics) = 1 and md5(topics[1]) = '7f5dc73133d029143adeed5856ab692a'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 504);

update public.disciplines set topics = array['Estudo de linguagens de programação orientadas a objeto, em especial a linguagem Java', 'Desenvolvimento de programas e projetos de software utilizando a linguagem orientada a objetos Java (JSE, JEE)', 'Manipulação de Banco de Dados (JDBC)', 'Design patterns']::text[]
where id = 505 and cardinality(topics) = 1 and md5(topics[1]) = '5d523c26346239946fa6304abf71d1ca'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 505);

update public.disciplines set topics = array['Leis da termodinâmica e suas aplicações no projeto de supercomputadores', 'Estudo da eletricidade, sua natureza e seu comportamento, com aplicações desses conceitos em problemas relativos à área de engenharia', 'Carga elétrica, condutores e isolantes, lei de Coulomb, campo elétrico, movimento de cargas nos campos elétricos, potencial elétrico, energia eletrostática e capacitância, corrente elétrica', 'Circuitos em corrente contínua e alternada, potência e energia elétrica', 'Fenômenos magnéticos e suas implicações']::text[]
where id = 506 and cardinality(topics) = 1 and md5(topics[1]) = '81ef2d319d5092f48bf7338b85ac9494'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 506);

update public.disciplines set topics = array['Nesta disciplina, será aprofundado o desenvolvimento de circuitos eletrônicos e a fabricação de placas de circuito impresso (PCB), conectando o projeto ao produto final', 'Você trabalhará com esquemáticos, layout e roteamento de PCBs utilizando ferramentas gratuitas e open-source, considerando integridade de sinal, alimentação, aterramento e compatibilidade eletromagnética', 'O processo inclui desde a concepção do circuito até a validação do hardware, preparando você para desenvolver sistemas embarcados e eletrônicos aplicáveis à automação, IoT e produtos tecnológicos de nível profissional']::text[]
where id = 507 and cardinality(topics) = 1 and md5(topics[1]) = 'd50f1a44e5ce91726f41f7682acd5c61'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 507);

update public.disciplines set topics = array['Nesta disciplina, serão desenvolvidas aplicações de software modernas voltadas à integração com sistemas mecatrônicos e embarcados', 'O foco está na programação estruturada e orientada a objetos, no desenvolvimento de APIs, na comunicação com dispositivos físicos e na criação de aplicações móveis para monitoramento e controle de sistemas', 'Serão utilizados ambientes e frameworks gratuitos, permitindo a construção de interfaces funcionais e conectadas', 'Ao final, você estará preparado(a) para integrar software, hardware e conectividade em soluções completas e escaláveis']::text[]
where id = 508 and cardinality(topics) = 1 and md5(topics[1]) = '1c469708501e23f65d1eb4341a54786c'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 508);

update public.disciplines set topics = array['Nesta disciplina, será abordada a análise do comportamento mecânico dos materiais e estruturas utilizados em sistemas mecatrônicos, explorando conceitos de tensão, deformação, elasticidade, fadiga e critérios de falha', 'Você aprenderá a avaliar e dimensionar componentes estruturais por meio de métodos analíticos e simulações computacionais, considerando segurança, desempenho e otimização de materiais', 'Esses conhecimentos são essenciais para o desenvolvimento de estruturas mecânicas aplicadas à robótica, automação, máquinas industriais e produtos de engenharia']::text[]
where id = 509 and cardinality(topics) = 1 and md5(topics[1]) = '89caf92d2eea5cb51211097f7683c607'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 509);

update public.disciplines set topics = array['Modelagem dos mais variados sistemas dinâmicos, como os térmicos, elétricos, mecânicos e biológicos', 'Emprego de malhas de controle para otimização de sistemas', 'Critério de estabilidade', 'Controladores PID']::text[]
where id = 510 and cardinality(topics) = 1 and md5(topics[1]) = 'fa2b152c8d5cbaccd33ddb6b85a05de6'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 510);

update public.disciplines set topics = array['Quantidade de movimento, transporte de calor e massa', 'Estática dos fluidos', 'Formulação integral: continuidade, quantidade de movimento e energia', 'Perda de carga em escoamentos internos', 'Medidores de vazão e velocidade', 'Transferência do calor', 'Condução e convecção', 'Trocadores de calor', 'Sistemas aerodinâmicos e o comportamento de estruturas imersos em fluidos', 'Simulações computacionais de modelos por elementos finitos']::text[]
where id = 511 and cardinality(topics) = 1 and md5(topics[1]) = '452d46742aa72c3662d64a1387134fa5'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 511);

update public.disciplines set topics = array['Projeto e desenvolvimento de máquinas eletromecânicas com softwares de simulação, modelagem, ensaios e testes', 'União por chavetas, ranhuradas, interferência', 'Fadiga em componentes mecânicos', 'Parafusos, engrenagens, mancais, correntes e polias']::text[]
where id = 512 and cardinality(topics) = 1 and md5(topics[1]) = '3c9858209dddd622e4ca0eb8f7bcd133'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 512);

update public.disciplines set topics = array['Aspectos gerais e os princípios de funcionamento dos sistemas hidráulicos e pneumáticos, suas vantagens e limitações de aplicação', 'Conhecer os componentes empregados nos sistemas hidráulicos e nos sistemas pneumáticos, suas formas construtivas e aplicação', 'Estudar e interpretar a simbologia usada em circuitos hidráulicos e pneumáticos', 'Conhecer e dimensionar compressores de ar, seu armazenamento, distribuição e tratamento para aplicação do ar comprimido em máquinas e equipamentos industriais', 'Projetar sistemas pneumáticos ou hidráulicos em projetos de automação industrial']::text[]
where id = 513 and cardinality(topics) = 1 and md5(topics[1]) = 'fd02896ef8924c80af67aae278fc61f3'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 513);

update public.disciplines set topics = array['Nesta disciplina, os(as) participantes aprenderão a projetar e implementar sistemas de comando elétrico aplicados a ambientes industriais e residenciais, abordando acionamento, proteção e controle de motores elétricos', 'Serão estudados métodos de partida direta, estrela-triângulo (Y-Δ), soft starters e inversores de frequência, além do dimensionamento elétrico de circuitos e do desenvolvimento de diagramas elétricos', 'A disciplina também contemplará a montagem de painéis de comando e a aplicação de normas técnicas, preparando você para atuar no projeto e na implementação de sistemas elétricos seguros, robustos e alinhados à realidade industrial']::text[]
where id = 514 and cardinality(topics) = 1 and md5(topics[1]) = '95dae85d84974f5573bb67e79dc1e1fc'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 514);

update public.disciplines set topics = array['Nesta disciplina, serão desenvolvidos sistemas embarcados a partir do estudo da arquitetura e programação de microcontroladores amplamente utilizados no mercado', 'Serão abordados periféricos, temporizadores, interrupções, comunicação serial e integração com sensores e atuadores, utilizando plataformas como Arduino e ESP32', 'Ao longo das atividades práticas, você criará firmwares capazes de interagir com o mundo físico em tempo real, preparando-se para atuar em projetos de automação, robótica, dispositivos inteligentes e IoT']::text[]
where id = 515 and cardinality(topics) = 1 and md5(topics[1]) = '9274da960e723ec7013b3ba70e39cb56'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 515);

update public.disciplines set topics = array['Nesta disciplina, serão desenvolvidas soluções conectadas para Internet das Coisas (IoT) e Internet Industrial das Coisas (IIoT), integrando sensores inteligentes, sistemas embarcados e comunicação de dados', 'Serão explorados protocolos de comunicação, coleta e processamento de dados em tempo real e integração com plataformas em nuvem utilizando ferramentas gratuitas', 'Ao final, você estará apto(a) a desenvolver sistemas inteligentes de monitoramento e controle aplicáveis à indústria, cidades inteligentes e soluções sustentáveis']::text[]
where id = 516 and cardinality(topics) = 1 and md5(topics[1]) = '16b49743c6cd64e36dfdbe44ac9ba71b'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 516);

update public.disciplines set topics = array['Nesta disciplina, você aprenderá a projetar e aplicar sistemas de instrumentação para medição de grandezas físicas em ambientes industriais e tecnológicos', 'O conteúdo abordará sensores, transdutores, condicionamento de sinais, aquisição de dados e calibração, garantindo precisão e confiabilidade nas medições', 'Por meio de atividades práticas, você desenvolverá soluções aplicáveis ao controle de processos, automação industrial, pesquisa tecnológica e sistemas de monitoramento inteligente']::text[]
where id = 517 and cardinality(topics) = 1 and md5(topics[1]) = 'e23af65281aff1bdda117513fce4960e'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 517);

update public.disciplines set topics = array['Apresentação dos processos de fabricação modernos', 'Elementos de usinagem, pintura e montagem', 'Metalurgia da conformação', 'Junção, soldagem, estamparia, extrusão, fundição e outros processos', 'Análise das máquinas, requisitos e aplicações']::text[]
where id = 518 and cardinality(topics) = 1 and md5(topics[1]) = 'c109938cd7c1816af2d08653e6dbebaa'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 518);

update public.disciplines set topics = array['Esta disciplina explorará o conceito de gêmeos digitais aplicados à engenharia mecatrônica, permitindo a simulação, análise e otimização de sistemas físicos antes de sua implementação real', 'Você trabalhará com modelagem matemática e simulações computacionais utilizando ferramentas gratuitas, analisando o comportamento de sistemas mecânicos, elétricos e automatizados', 'Ao final, estará apto(a) a integrar o mundo físico e digital para reduzir riscos, otimizar desempenho e apoiar a tomada de decisão em ambientes industriais']::text[]
where id = 519 and cardinality(topics) = 1 and md5(topics[1]) = '9d374907c7623fec874299204810ca5d'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 519);

update public.disciplines set topics = array['Nesta disciplina, será utilizado o Python como linguagem estratégica para integração, automação e análise de dados em sistemas embarcados', 'O conteúdo abordará: comunicação entre dispositivos, processamento de dados, controle de hardware e integração com sensores e atuadores', 'Por meio de aplicações práticas, você desenvolverá soluções flexíveis e escaláveis, conectando sistemas embarcados a aplicações de maior nível e preparando-se para atuar em automação, IoT e sistemas inteligentes']::text[]
where id = 520 and cardinality(topics) = 1 and md5(topics[1]) = '04658050bf5b8109013b45d8eb7cef30'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 520);

update public.disciplines set topics = array['Nesta disciplina, serão aplicadas técnicas de inteligência artificial no desenvolvimento de sistemas autônomos, com foco em veículos autônomos', 'O conteúdo abordará: percepção do ambiente, tomada de decisão, planejamento e integração com sensores e sistemas embarcados', 'Utilizando ferramentas e frameworks gratuitos, você desenvolverá soluções capazes de interpretar dados do ambiente e operar de forma autônoma, alinhadas às tecnologias utilizadas na indústria de mobilidade avançada']::text[]
where id = 521 and cardinality(topics) = 1 and md5(topics[1]) = '8ceca978cc63f3dc4503eab519011525'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 521);

update public.disciplines set topics = array['Nesta disciplina, serão estudados os fundamentos e aplicações das redes neurais artificiais e do deep learning, explorando arquiteturas modernas e técnicas de treinamento de modelos', 'Serão utilizados frameworks gratuitos para desenvolvimento de soluções aplicadas à classificação, regressão, reconhecimento de padrões e análise de dados', 'Ao final, você estará apto a aplicar modelos de inteligência artificial em contextos reais da engenharia, integrando IA a sistemas mecatrônicos e industriais']::text[]
where id = 522 and cardinality(topics) = 1 and md5(topics[1]) = '5e619728243719f474be10bf19e17211'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 522);

update public.disciplines set topics = array['Nesta disciplina, será aprofundado o estudo da modelagem e do controle de sistemas dinâmicos aplicados à engenharia mecatrônica, abordando a representação matemática de sistemas físicos, análise de estabilidade e resposta dinâmica', 'Você trabalhará com o projeto, a sintonia e a implementação de controladores PID, amplamente utilizados em automação industrial, controle de motores e sistemas de movimento', 'A partir de simulações e aplicações práticas em plataformas embarcadas, você será capaz de desenvolver soluções de controle que garantam precisão, estabilidade e desempenho em sistemas reais']::text[]
where id = 523 and cardinality(topics) = 1 and md5(topics[1]) = 'a9e06f50d3b4e389852bd0a1c7605d5b'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 523);

update public.disciplines set topics = array['Nesta disciplina, você aprenderá a desenvolver sistemas capazes de interpretar informações visuais do ambiente, utilizando técnicas de processamento de imagens e visão computacional', 'O conteúdo abordará: aquisição de imagens, extração de características, reconhecimento de objetos e percepção espacial, utilizando bibliotecas gratuitas amplamente adotadas no mercado', 'Essas competências são aplicadas à robótica, automação industrial, inspeção visual e sistemas autônomos']::text[]
where id = 524 and cardinality(topics) = 1 and md5(topics[1]) = '4c521596ee179cba8cdb19f0c37fe85a'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 524);

update public.disciplines set topics = array['Estudo dos principais componentes e projeto de robôs para operações em ambientes extremos, como em minas, reatores nucleares, desastres', 'Análise de sistemas e sistemas automatizados na indústria aeroespacial']::text[]
where id = 525 and cardinality(topics) = 1 and md5(topics[1]) = '95068d0140bf397e0348cad5731b56a3'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 525);

update public.disciplines set topics = array['Conceitos de BI aplicados à engenharia mecatrônica', 'KPIs e análise de indicadores', 'Dashboards', 'Técnicas em Big Data para tomada de decisão']::text[]
where id = 526 and cardinality(topics) = 1 and md5(topics[1]) = 'e91f39e14afea919396935e896ebcc9d'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 526);

update public.disciplines set topics = array['Adição do poder de diversos computadores interligados por uma rede para compartilhar a execução de tarefas', 'Computação nômade, pervasiva e ubíqua', 'Modelos de interação, comunicação', 'Estudos dos tipos de falhas por omissão, temporização, sincronismo e arbitrárias do sistema de comunicação', 'Computação em nuvem', 'Plataform as a Service', 'Machine as a Service']::text[]
where id = 527 and cardinality(topics) = 1 and md5(topics[1]) = 'e1f18fe8d140c62d08ab9008723a2892'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 527);

update public.disciplines set topics = array['Tipos de robôs industriais, suas estruturas mecânicas, transmissões, elementos terminais e sensores para robótica', 'Desta forma, o aluno estará apto a dimensionar e selecionar robôs industriais para uma aplicação real', 'Estudo da cinemática, cinemática inversa e dinâmica de robôs, de forma a mostrar ao aluno toda a complexidade matemática no sistema de controle de robôs industriais', 'Esta disciplina também faz uso de laboratório de robótica para prática de programação e simulação de atividades industriais']::text[]
where id = 528 and cardinality(topics) = 1 and md5(topics[1]) = '899bd70cbe3337ade1cad2e81310453c'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 528);

update public.disciplines set topics = array['Nesta disciplina, serão estudados os fundamentos da automação industrial aplicada à manufatura, com foco no uso de computadores industriais como CLPs e sistemas digitais de controle distribuído (SDCD), responsáveis pelo controle de processos no chão de fábrica', 'Você aprenderá a programar sistemas industriais utilizando linguagens como Ladder e Grafcet, além de compreender arquiteturas de automação, integração de máquinas e confiabilidade operacional', 'Ao final, estará preparado(a) para desenvolver e operar soluções de automação robustas, alinhadas às práticas e tecnologias adotadas pela indústria']::text[]
where id = 529 and cardinality(topics) = 1 and md5(topics[1]) = 'a48283ef03983ad0b7ac4526f72524bf'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 529);

update public.disciplines set topics = array['Nesta disciplina, será estudada a integração entre sistemas físicos, computação e comunicação em tempo real, explorando arquiteturas cyber-físicas e processamento na borda (edge computing)', 'Foca-se no desenvolvimento de soluções distribuídas capazes de operar com baixa latência e alta confiabilidade, integrando sensores, sistemas embarcados e processamento local', 'Ao final, você estará preparado(a) para atuar em ambientes industriais conectados e sistemas inteligentes de grande escala']::text[]
where id = 530 and cardinality(topics) = 1 and md5(topics[1]) = '50668d80a3d46807a84c83ec42a34c54'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 530);

update public.disciplines set topics = array['Nesta disciplina, serão desenvolvidas soluções tecnológicas voltadas à geração, monitoramento e otimização de sistemas de energias renováveis', 'O conteúdo abordará: sistemas solares e eólicos, armazenamento de energia, monitoramento inteligente e eficiência energética, integrando sensores, sistemas embarcados e análise de dados', 'Ao final, você estará preparado(a) para desenvolver soluções alinhadas à sustentabilidade, à transição energética e aos desafios tecnológicos do futuro']::text[]
where id = 531 and cardinality(topics) = 1 and md5(topics[1]) = '12f82a267643ff3063261dc98f27fb53'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 531);

update public.disciplines set topics = array['Desvende a maestria da persuasão e da conexão emocional utilizando Técnicas de Apresentação', 'Ao explorar o poder do Storytelling, você aprenderá a criar identificação e engajamento impactantes', 'Além disso, nossa abordagem inovadora, que inclui o poder do UX Writing e desenvolvimento das Soft Slills, irá equipá-lo para conquistar não apenas clientes, mas também investidores, enquanto desafia os limites convencionais da comunicação']::text[]
where id = 532 and cardinality(topics) = 1 and md5(topics[1]) = '927402f48f67eee8b9f8e06afc530928'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 532);

update public.disciplines set topics = array['Aprenda a criar sites e aplicações web incríveis, dominando as principais linguagens front-end do mercado: HTML, CSS e Javascript', 'Desenvolva sites responsivos com interfaces inovadoras e totalmente acessíveis, aproveitando ao máximo, os recursos que essas fantásticas linguagens oferecem', 'Você aprenderá também, um dos frameworks mais utilizados no desenvolvimento front-end, o Bootstrap', 'Ele é composto por muitos componentes que darão muito mais vida e interação à sua aplicação web', 'Venha se encantar com o desenvolvimento front-end e o mundo maravilhoso de recursos e opções, que ele oferece']::text[]
where id = 533 and cardinality(topics) = 1 and md5(topics[1]) = '9ec35215f568eb0862a08992a8865499'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 533);

update public.disciplines set topics = array['Proporcionar uma formação sólida sobre os principais conceitos, ferramentas e aplicações da Inteligência Artificial no cenário empresarial e tecnológico, capacitando futuros profissionais a explorar o potencial da IA na tomada de decisões estratégicas, automação de processos e criação de soluções inovadoras', 'Destaca-se o estudo e a prática de agentes autônomos de IA, chatbots inteligentes, plataformas no-code integradas à IA com foco em soluções reais, alinhado às transformações digitais e às exigências do mercado']::text[]
where id = 534 and cardinality(topics) = 1 and md5(topics[1]) = '34b52e074e1d18d4528d2f6f08903b2e'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 534);

update public.disciplines set topics = array['Construção de programas que envolvam sustentabilidade e gestão na convivência com as diferenças sociais e culturais, além de aspectos éticos que envolvem as empresas de TI']::text[]
where id = 535 and cardinality(topics) = 1 and md5(topics[1]) = 'ab6efb031efb0933cc99591b50298258'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 535);

update public.disciplines set topics = array['A lógica de programação é fundamental na criação de um algoritmo', 'Na computação o algoritmo é essencial', 'Aprenda a desenvolver soluções algorítmicas eficazes para diversos problemas computacionais por meio da linguagem Java', 'Tenha domínio completo dos princípios de lógica de programação, desde os conceitos elementares até abordagens avançadas']::text[]
where id = 536 and cardinality(topics) = 1 and md5(topics[1]) = '6e29017983eab3942c594dd8197878e6'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 536);

update public.disciplines set topics = array['Utilização da modelagem matemática na resolução de problemas e empregar funções para fundamentar as decisões ligadas aos negócios empresariais']::text[]
where id = 537 and cardinality(topics) = 1 and md5(topics[1]) = 'f48d8f4f1b6e9588b69d3a6e48ea470c'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 537);

update public.disciplines set topics = array['Aplicações de Internet das Coisas (IoT), automação, dados, computação em nuvem e inteligência artificial orientam o desenvolvimento de projetos que integram hardware e software, da eletrônica básica a sistemas automatizados e ciberfísicos capazes de apoiar a tomada de decisão e automatizar processos', 'Com uma abordagem prática e orientada a projetos, a disciplina prepara o aluno para criar soluções conectadas às demandas atuais do mercado, com foco em eficiência, escala e impacto real']::text[]
where id = 538 and cardinality(topics) = 1 and md5(topics[1]) = '9111792e22a7b1bd6c98951aec7feb3c'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 538);

update public.disciplines set topics = array['Aborda as relações entre negócios e tecnologia para contribuir para a elaboração de projetos bem-sucedidos de sistemas', 'Traduz para o estudante da área as contribuições de casos e situações reais com base em métodos quantitativos com suporte de softwares']::text[]
where id = 539 and cardinality(topics) = 1 and md5(topics[1]) = '116ac294ddb5fb4ad4f7bb7bf9b0728f'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 539);

update public.disciplines set topics = array['Conseguir processar um grande volume de dados com eficiência esse é objetivo dessa disciplina', 'Para atingir essa meta é necessário aprender formas avançadas de estruturação dos dados em algoritmos a fim de torná-los mais eficientes tanto em termos de tempo de processamento quanto no rápido acesso em um grande volume de dados', 'Organizar em estruturas de dados adequadas para cada tipo de problema a ser resolvido computacionalmente, garante que nossos códigos se tornem de alta performance']::text[]
where id = 540 and cardinality(topics) = 1 and md5(topics[1]) = '2602034e5381438ab5b8eb5e8dcbeea4'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 540);

update public.disciplines set topics = array['Criação de projetos e modelagem de banco de dados relacionais', 'Gerando interação com SGBD (Sistema Gerenciador de Banco de Dados) Oracle usando linguagem SQL para criação, transação de dados e geração de relatórios']::text[]
where id = 541 and cardinality(topics) = 1 and md5(topics[1]) = '29d5aba44b0f1252f4f848ee1a9b9ca2'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 541);

update public.disciplines set topics = array['O propósito de qualquer solução de TI é atender a uma necessidade humana, auxiliando pessoas em sua vida social ou nos seus trabalhos em corporações', 'Descubra como identificar e desenvolver oportunidades de projetos de sistemas para atender essas necessidades', 'Aprenda como funcionam os processos de produção e software e desenvolva um plano de projeto dentro da abordagem ágil (Scrum), entregando valor rapidamente para os patrocinadores e usuários do sistema de informação em desenvolvimento', 'Crie modelos de especificação de engenharia de software usando uma forma de representação universal que esclareça detalhes de como o software deve funcionar, permitindo traduzir as demandas de negócio em diretivas de programação do software, as quais podem ser repassadas e usadas por equipes em qualquer lugar do mundo']::text[]
where id = 542 and cardinality(topics) = 1 and md5(topics[1]) = '3faac0fe2d28e728475aa78349c57fbd'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 542);

update public.disciplines set topics = array['Contextualização e Aplicação da Estatística Descritiva e Inferencial para Tratamento da Informação e Análise de Dados de maneira precisa, para orientar e otimizar a tomada de decisões fundamentadas a partir do uso de ferramentas estatísticas, tendo em vista o aprimoramento da performance e eficiência dos dados em TI']::text[]
where id = 543 and cardinality(topics) = 1 and md5(topics[1]) = 'ac33fbc3309edf626081a7cbf41712e6'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 543);

update public.disciplines set topics = array['A tecnologia está cada vez mais presente em nosso mundo e os processos de gestão se tornam cada dia mais importantes, conheça os softwares que revolucionaram o mundo corporativo, atrelados aos processos de gestão de negócio, com apoio de novas metodologias aplicadas aos novos modelos negócios', 'Você vai conhecer as ferramentas e frameworks que dão suporte à gestão de projetos dando a devida importância para a governança de TI, contextualizando a Tecnologia da Informação como suporte e alavancagem do negócio, vendo assim, as tecnologias promissoras para o design de soluções de negócio']::text[]
where id = 544 and cardinality(topics) = 1 and md5(topics[1]) = '6b6a849b52988539784fe2e92b6e9aa0'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 544);

update public.disciplines set topics = array['Compreensão dos fundamentos de conectividade da infraestrutura de comunicação da Internet e das redes locais de comunicação', 'Desenvolvimento de projetos de conectividade para melhoria do desempenho e da segurança na Internet, incluindo análise e avaliação de sistemas, protocolos como IPv4 e IPv6, equipamentos e serviços']::text[]
where id = 545 and cardinality(topics) = 1 and md5(topics[1]) = '25bb7ed3d5bc2ecc31e9cab213858620'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 545);

update public.disciplines set topics = array['Com o objetivo de fornecer uma base sólida de orientação a objetos, bem como prover os primeiros passos em aplicações full-stack', 'Conheça toda a abrangência de um sistema, desde conexão com banco de dados a páginas web, tudo isso com as melhores práticas e ferramentas de mercado']::text[]
where id = 546 and cardinality(topics) = 1 and md5(topics[1]) = 'f75576bdac8e6ff0260c6fb01f0a4b42'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 546);

update public.disciplines set topics = array['Tenha uma visão abrangente e prática de desenvolvimento de apps Android nativos com Kotlin, você terá a oportunidade de criar projetos reais, se equipando com habilidades em linguagem Kotlin, UI Architecture, Jetpack Libraries, Consumo de APIs com Retrofit e Corrotinas, e tantas outras que o mercado exige atualmente', 'Podendo integrar todo seu aprendizado com wearable techs, internet of things e cloud computing']::text[]
where id = 547 and cardinality(topics) = 1 and md5(topics[1]) = 'd0f5595a9dc473f2e8c2bbbc793dc133'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 547);

update public.disciplines set topics = array['Conheça ferramentas capazes de gerar produtos para dispositivos móveis nas principais plataformas, identifique quando um projeto pode ser criado utilizando Cross Platform', 'Com Flutter um framework criado pela Google e de código aberto, desenvolva aplicativos multiplataforma']::text[]
where id = 548 and cardinality(topics) = 1 and md5(topics[1]) = '583d8a7df1bf4e7cc07ba590b29a8cbf'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 548);

update public.disciplines set topics = array['Todo consumidor de um produto ou serviço almeja a qualidade naquilo que compra e usa, e com software não é diferente', 'Entenda quais são as dimensões de avaliação de qualidade e como essa qualidade influencia na governança de um projeto, levando maior transparência sobre planos, ações e resultados nos projetos de sistemas', 'Conheça os principais guias e normas da qualidade e governança de projetos de TI que implicam em certificações as quais diferenciam empresas e negócios', 'Desenvolva a arquitetura de soluções tecnológicas para negócios e utilize essa arquitetura para orientar o planejamento de projeto ágil, a engenharia, a construção e a validação do produto final', 'Aprenda a estimar o esforço, tempo e custo para desenvolver um projeto de sistema de informação, aplicando modelos científicos', 'Trabalhe na prática com uma plataforma integrada de planejamento e produção de software, ampliando o controle sobre os projetos e suas entregas', 'Estude e aplique técnicas e ferramentas automatizadas para criar e aplicar diversos tipos de testes de software, assegurando a qualidade final do produto, antes da sua entrega para uso', 'Descubra os cuidados necessários com a segurança de informação no desenvolvimento e pós-entrega de sistemas, respeitando a LGPD, tornando-se um profissional com amplos conhecimentos sobre práticas gerenciais aplicadas nos projetos de TI']::text[]
where id = 549 and cardinality(topics) = 1 and md5(topics[1]) = 'd15b1e506463920d7fd5a0b5c1f513a7'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 549);

update public.disciplines set topics = array['Aprenda e construa softwares com as melhores práticas de mercado para suportar o negócio de forma escalável, robusta e adaptável a mudanças por meio da engenharia de microsserviços e web']::text[]
where id = 550 and cardinality(topics) = 1 and md5(topics[1]) = 'f1229b38dc59dd0f33680ca0502e51c6'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 550);

update public.disciplines set topics = array['Projetos de roteamento, switching e firewall', 'Processos de gerenciamento e monitoramento de redes', 'Interconexão de redes de longa distância (tecnologia WAN)', 'Projetos de segurança e disponibilidade em: infraestrutura de redes, cloud computing e ambientes wireless']::text[]
where id = 551 and cardinality(topics) = 1 and md5(topics[1]) = '1f10ff8cd2ff1b5a73372e08c81070c2'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 551);

update public.disciplines set topics = array['Como extrair o máximo de desempenho do hardware por meio dos controles que o sistema operacional utiliza, compreender as características internas de processos, programas e componentes do sistema operacional, além de implementar chatbots com processamento de linguagem natural (NLP) e cognição']::text[]
where id = 552 and cardinality(topics) = 1 and md5(topics[1]) = '9e32ca365da4d5521a560d3c15f928ef'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 552);

update public.disciplines set topics = array['Programação em Banco de Dados com PL/SQL, otimização de desempenho, gerenciamento de transações e mecanismos de controle de concorrência e recuperação', 'Documentação e monitoramento de ambiente']::text[]
where id = 553 and cardinality(topics) = 1 and md5(topics[1]) = '12147909eaa69ff8c982f50c2041552c'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 553);

update public.disciplines set topics = array['Introdução às Técnicas de inteligência artificial e visão computacional para resolução de problemas voltadas aos mais diversos setores: de reconhecimento facial a aplicações para internet das coisas – IoT', 'Produtos e serviços disponíveis em plataformas móveis e em nuvem de forma eficiente para atender as mais diversas demandas corporativas', 'Modelos de aprendizado de máquina em Python baseados em conceitos matemáticos']::text[]
where id = 554 and cardinality(topics) = 1 and md5(topics[1]) = 'b5a1aad677e7f1202265f90fa485486b'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 554);

update public.disciplines set topics = array['Entenda os novos negócios e segmentos apoiados fortemente por TI, em caráter de inovação, e descubra os caminhos para criar e favorecer seu negócio com objetivos de torná-lo escalável e sustentável']::text[]
where id = 555 and cardinality(topics) = 1 and md5(topics[1]) = 'a67ece90dc1a86621c80ad9c89ab1e94'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 555);

update public.disciplines set topics = array['Funcionamento, finalidade, aplicações, limitações, gerência de recursos, proteção, segurança e desempenho dos sistemas computacionais paralelos e distribuídos']::text[]
where id = 556 and cardinality(topics) = 1 and md5(topics[1]) = '0254efa84e6a9ceedf791f7819868596'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 556);

update public.disciplines set topics = array['O mundo é mobile, capacitação no desenvolvimento de soluções para dispositivos da Apple para o mercado corporativo, faça uso dos mais diversos componentes, integre sua aplicação com web service utilizando Json, armazene dados, crie mapa com rotas, conheça o ecossistema de sensores e multimídia, tudo isso utilizando a linguagem nativa Swift']::text[]
where id = 557 and cardinality(topics) = 1 and md5(topics[1]) = 'e087cd05f9bc0ca427d6f2143e17abb7'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 557);

update public.disciplines set topics = array['Os sistemas de DW (data warehousing) e BI (business intelligence) continuam sendo os projetos de TI mais complexos, desafiadores e interessantes', 'A nuvem trouxe mais um componente de desafio', 'Este curso prepara você para implementar, com sucesso, soluções analíticas apresentando os elementos essenciais de arquiteturas, modelagem dimensional, ETL, processos de qualidade de dados chegando até a implementação física', 'O seu paralelo com sistemas de Big Data e definição de DB NoSQL estão contidos neste conteúdo tornando a experiência ainda mais interessante em um mundo onde as soluções são cada vez mais diferenciadas para atender os requisitos cada vez mais exigentes de performance e capacidade de armazenamento']::text[]
where id = 558 and cardinality(topics) = 1 and md5(topics[1]) = '7106e23098459c659368aa6450b59b33'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 558);

update public.disciplines set topics = array['O mundo de hoje funciona com aplicativos, desde bancos on-line e aplicativos de trabalho remoto até a entrega de entretenimento pessoal e comércio eletrônico', 'Com o surgimento de novas tecnologias desenvolvidas nas aplicações web foram introduzidas novas possibilidades de exploração', 'Os ataques mais significativos a aplicativos da Web são aqueles que: expõem dados confidenciais, obtêm acesso não autorizado ao servidor Web ou até mesmo aqueles que executam outros componentes no aplicativo', 'O principal objetivo desta disciplina é fornecer informações e habilidades necessárias para entender o ponto de vista da segurança de aplicativo web, por exemplo, a OWASP TOP 10 vulnerabilities e OWASP Top 10 mobile risks', 'Durante o curso, terão exemplos da vida real que ajudarão nas suas habilidades para descobrir, explorar e mitigar várias vulnerabilidades, bem como aprender ferramentas automatizadas para personalizar ataques']::text[]
where id = 559 and cardinality(topics) = 1 and md5(topics[1]) = '5a52079b530fea333e6c5fc9ecd7005a'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 559);

update public.disciplines set topics = array['Registro da experiência na cidade real e sua leitura crítica em caderno de vivências', 'a paisagem urbana para o arquiteto-urbanista, morfologia e panorama', 'introdução à apreensão objetiva e subjetiva da cidade, ao pensamento propositivo e prática de projeto', 'conceber novas cidades, com diferentes linguagens e representações', 'Caracterizar as Cidades Vividas, a partir das experiências dos estudantes com a cidade real, introduzindo questões próprias ao olhar do arquiteto-urbanista sobre a paisagem urbana, lugares e edificações', 'a seguir propor alternativas em diversas escalas da arquitetura e do urbanismo, estimulando criatividade e visões de futuro com a imaginação de novas cidades (ou pós-cidades)']::text[]
where id = 560 and cardinality(topics) = 1 and md5(topics[1]) = '40514158172404090736d3a29be732b4'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 560);

update public.disciplines set topics = array['Relacionar a produção da cultura, em suas diversas formas de manifestação, e os processos de urbanização da cidade de São Paulo', 'Estudo de obras artísticas que retratam a transformação da cidade, da formação e desenvolvimento de movimentos culturais e das políticas públicas culturais', 'Cultura como mediadora entre o vivido e a obra de arte', 'discussão e problematização da arte como expressão de tempos históricos e contextos geográficos ao mesmo tempo em que nos auxilia na compreensão do fenômeno urbano']::text[]
where id = 561 and cardinality(topics) = 1 and md5(topics[1]) = 'cef091dc6da3056257671de61157814c'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 561);

update public.disciplines set topics = array['Introdução de aspectos econômicos, sociais e políticos relacionados à produção do espaço, a partir de temas como Sociedade e Natureza', 'Cidade, Natureza e História', 'Sistema-mundo capitalista', 'Divisão social, divisão técnica e divisão territorial do trabalho', 'Classes, capital e Estado', 'Cultura, modernidade e cidade', 'Modernidade e transmodernidade', 'Colonialidade, decolonialidade e contracolonialidade', 'Direito à cidade, direito à natureza, direitos humanos e não humanos', 'Povos tradicionais, ameríndios, diáspora negra', 'Reconhecimento de experiências contemporâneas de arquitetura e urbanismo em relação a questões ambientais e de sustentabilidade']::text[]
where id = 562 and cardinality(topics) = 1 and md5(topics[1]) = '90301837eca29b4b34324b7ec84a1e28'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 562);

update public.disciplines set topics = array['Introdução ao projeto de arquitetura, explorando a relação entre o corpo humano e o espaço, a partir de noções de usos contemplativos e práticos, de atividades relacionadas à permanência e à passagem, dimensões do individual e do coletivo', 'Apreensão sensível da cidade, modos de conceber, perceber e viver e espaço no cotidiano', 'exercícios de composição e de criatividade', 'uso de linguagens artísticas, de experimentação plástica, volumetrias, escalas, luz, sombra, ritmos']::text[]
where id = 563 and cardinality(topics) = 1 and md5(topics[1]) = 'affb5dae61889669a85e3db90253d76c'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 563);

update public.disciplines set topics = array['Reconhecer a materialidade do ambiente construído, a matemática, tamanhos, proporções e geometria dos seus espaços e objetos tridimensionais, os princípios básicos dos seus sistemas estruturais infraestruturais e seus funcionamentos', 'Dinâmicas sociais, políticas, econômicas, tecnológicas e ambientais na materialidade da cidade', 'funcionamento de uma cidade, seus fluxos, estruturas e infraestruturas', 'relação entre códigos de obras, leis de uso e ocupação do solo e tridimensionalidades resultantes', 'ação humana na transformação do sítio original']::text[]
where id = 564 and cardinality(topics) = 1 and md5(topics[1]) = '12d9b9697d42f0557e8d1c8a7e83b879'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 564);

update public.disciplines set topics = array['Observação de campo (trabalho de campo)', 'Exercício de observação e sistematização de processos fazendo uso de categorias estruturais do método tais como: espaço, paisagem, lugar, território, fronteira, sítio, situação entre outros']::text[]
where id = 565 and cardinality(topics) = 1 and md5(topics[1]) = '3e183729ecf08ae6ef1e990cc3986c34'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 565);

update public.disciplines set topics = array['Uma das maiores invenções da humanidade, as cidades propiciaram progresso científico e avanço tecnológico', 'No entanto, as grandes metrópoles da contemporaneidade se transformaram em uma experiência de sofrimento e solidão', 'Partindo desses pressupostos, este curso pretende estimular a análise e o reconhecimento das experiências urbanas dos estudantes e as de seus familiares', 'Também pretende debater como podem ser as cidades que queremos no futuro', 'No segundo momento do curso, pretende-se estimular a imaginação e o planejamento de cidades possíveis por meio da análise de obras sociológicas, históricas e literárias que reconstruíram cidades e espaços reais e fictícios']::text[]
where id = 566 and cardinality(topics) = 1 and md5(topics[1]) = 'd32e3c89c42e9b6ef69a0663ce51710e'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 566);

update public.disciplines set topics = array['Os discursos dos geógrafos e licenciados sobre a cidade e as escolas no passado e no presente', 'Interlocução entre bachareland os e licenciandos', 'Espaços públicos de educação', 'Reflexão sobre as diferentes possibilidades de práticas profissionais do professor de geografia e do geógrafo', 'Apresentação do Memorial do percurso formativo']::text[]
where id = 567 and cardinality(topics) = 1 and md5(topics[1]) = '1e41f2f7dcc5a54f76bd66faa0072926'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 567);

update public.disciplines set topics = array['Interações entre sociedade e natureza em múltiplas escalas, com enfoque no contexto brasileiro', 'produção do espaço e desigualdades socioespaciais nas cidades brasileiras', 'estudo dos sistemas naturais (relevo, clima, hidrografia, cobertura vegetal) como condicionantes e produtos das dinâmicas sociais', 'a segregação ambiental urbana, acesso desigual a infraestrutura ecológica e passivos ambientais em diferentes territórios', 'reflexões sobre o papel da Geografia na construção de estratégias de ordenamento territorial, recuperação ambiental e resiliência socioambiental frente aos conflitos territoriais e aos efeitos das mudanças climáticas, com foco nas metrópoles brasileiras']::text[]
where id = 568 and cardinality(topics) = 1 and md5(topics[1]) = '2b02dfd8676dc7c2142dd4cb8142cfc5'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 568);

update public.disciplines set topics = array['A Cidade como forma, função, processo e estrutura', 'A cidade e a divisão social e territorial do trabalho', 'Os discursos políticos sobre a cidade, ideologias geográficas urbanas', 'Crescimento urbano, fluxos migratórios, meio ambiente, segregação socioespacial']::text[]
where id = 569 and cardinality(topics) = 1 and md5(topics[1]) = 'd92d8a4334c864e724e4e442992cba3c'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 569);

update public.disciplines set topics = array['Observação de campo (trabalho de campo)', 'Exercício de observação e sistematização de processos fazendo uso de categorias estruturais do método tais como: espaço, paisagem, lugar, território, fronteira, sítio, situação entre outros']::text[]
where id = 570 and cardinality(topics) = 1 and md5(topics[1]) = 'e3134685bc2a6b3a8085183dfa265b2a'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 570);

update public.disciplines set topics = array['Uma das maiores invenções da humanidade, as cidades propiciaram progresso científico e avanço tecnológico', 'No entanto, as grandes metrópoles da contemporaneidade se transformaram em uma experiência de sofrimento e solidão', 'Partindo desses pressupostos, este curso pretende estimular a análise e o reconhecimento das experiências urbanas dos estudantes e as de seus familiares', 'Também pretende debater como podem ser as cidades que queremos no futuro', 'No segundo momento do curso, pretende-se estimular a imaginação e o planejamento de cidades possíveis por meio da análise de obras sociológicas, históricas e literárias que reconstruíram cidades e espaços reais e fictícios']::text[]
where id = 571 and cardinality(topics) = 1 and md5(topics[1]) = 'd32e3c89c42e9b6ef69a0663ce51710e'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 571);

update public.disciplines set topics = array['Os discursos dos geógrafos e licenciados sobre a cidade e as escolas no passado e no presente', 'Interlocução entre bachareland os e licenciandos', 'Espaços públicos de educação', 'Reflexão sobre as diferentes possibilidades de práticas profissionais do professor de geografia e do geógrafo', 'Apresentação do Memorial do percurso formativo']::text[]
where id = 572 and cardinality(topics) = 1 and md5(topics[1]) = '5565d5e459d018c28f2597b2826856d6'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 572);

update public.disciplines set topics = array['Interações entre sociedade e natureza em múltiplas escalas, com enfoque no contexto brasileiro', 'produção do espaço e desigualdades socioespaciais nas cidades brasileiras', 'estudo dos sistemas naturais (relevo, clima, hidrografia, cobertura vegetal) como condicionantes e produtos das dinâmicas sociais', 'a segregação ambiental urbana, acesso desigual a infraestrutura ecológica e passivos ambientais em diferentes territórios', 'reflexões sobre o papel da Geografia na construção de estratégias de ordenamento territorial, recuperação ambiental e resiliência socioambiental frente aos conflitos territoriais e aos efeitos das mudanças climáticas, com foco nas metrópoles brasileiras']::text[]
where id = 573 and cardinality(topics) = 1 and md5(topics[1]) = '2b02dfd8676dc7c2142dd4cb8142cfc5'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 573);

update public.disciplines set topics = array['A Cidade como forma, função, processo e estrutura', 'A cidade e a divisão social e territorial do trabalho', 'Os discursos políticos sobre a cidade, ideologias geográficas urbanas', 'Crescimento urbano, fluxos migratórios, meio ambiente, segregação socioespacial']::text[]
where id = 574 and cardinality(topics) = 1 and md5(topics[1]) = 'd92d8a4334c864e724e4e442992cba3c'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 574);

update public.disciplines set topics = array['Introdução ao estudo da anatomia humana', 'conceitos gerais', 'estudo teórico e prático referente a todos os sistemas constituintes do corpo humano', 'Atividades de extensão']::text[]
where id = 575 and cardinality(topics) = 1 and md5(topics[1]) = 'ae100fb17ea0966720d15513de35cf7d'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 575);

update public.disciplines set topics = array['Membrana celular e suas especializações', 'Síntese e secreção celular', 'Organização estrutural e funcional do citoesqueleto', 'Matriz extracelular', 'Sistema endossômico-lisossômico', 'Mitocôndria', 'Núcleo e ciclo celular', 'Microscopia convencional', 'Microscopia de fluorescência em imunolocalização', 'Microscopia eletrônica de transmissão', 'Noções sobre clonagem', 'Atividade de Extensão: conhecimento sobre células e doenças que as afetam']::text[]
where id = 576 and cardinality(topics) = 1 and md5(topics[1]) = '15cf044bfa2ad9e9c32715eaec200b0b'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 576);

update public.disciplines set topics = array['Radiações e estrutura da matéria', 'Introdução às radiações', 'Tipos de radiação e seus decaimentos', 'Conceitos de atividade, meia vida, vida média', 'Interação da radiação com a matéria', 'Efeitos biológicos das radiações', 'Proteção radiológica', 'Uso de radiações na pesquisa e na medicina', 'Bioenergética: Energia, calor, trabalho, temperatura', 'Princípios da Termodinâmica', 'Entropia, probabilidade e microestados', 'Energia livre de Gibbs, reações químicas constante de equilíbrio', 'Potencial químico e eletroquímico aplicado a transporte de substâncias através da membrana', 'Equação de Nernst', 'Atividades de extensão']::text[]
where id = 577 and cardinality(topics) = 1 and md5(topics[1]) = '9cdac062190561fae394366fe4195a0a'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 577);

update public.disciplines set topics = array['Funções trigonométricas, exponenciais, logaritmos, derivadas, derivadas das funções compostas, máximos e mínimos através de derivadas, derivadas parciais, cálculo de áreas através de integrais, integração numérica, integração por substituição, integração por partes e funções racionais, equação diferencial', 'Atividades de extensão']::text[]
where id = 578 and cardinality(topics) = 1 and md5(topics[1]) = '51066164993b73e42e5e59719dd04610'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 578);

update public.disciplines set topics = array['Noções de grandezas e unidades', 'Algarismos significativos', 'Segurança no Laboratório', 'Soluções', 'Dissociação Eletrolítica', 'Ácidos, Bases e Sais', 'Constante de Dissociação. pH', 'Tampões', 'Oxi-redução', 'Produto de Solubilidade', 'Íons Complexos', 'Titulações', 'Radioatividade']::text[]
where id = 579 and cardinality(topics) = 1 and md5(topics[1]) = 'dbf56dd9245dba12f0a023e86a569e40'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 579);

update public.disciplines set topics = array['Química dos compostos do carbono', 'Hidrocarbonetos saturados e insaturados', 'Compostos cíclicos e heterocíclicos', 'Compostos aromáticos, alcoóis, éteres, cetonas, aldeídos, ácidos carboxílicos, ésteres, aminas e amidas', 'Ataque nucleofílico aos compostos carbonílicos', 'Ataque eletrofílico em compostos insaturados', 'Ação enzimática']::text[]
where id = 580 and cardinality(topics) = 1 and md5(topics[1]) = '62b53d40c7f4d4f3725424a65666502c'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 580);

update public.disciplines set topics = array['Princípios fundamentais de construção de programas', 'Construção de algoritmos e sua representação em pseudocódigo e linguagens de alto nível', 'Noções de abstração', 'Especificação de variáveis e funções', 'Noções de programação estruturada', 'Identificadores e tipos', 'Operadores e expressões', 'Estruturas de controle: condicional e repetição', 'Entrada e saída de dados', 'Estruturas de dados estáticas: agregados homogêneos e heterogêneos', 'Iteração e recursão', 'Noções de análise de custo e complexidade', 'Estruturação, depuração, testes e documentação de programas']::text[]
where id = 581 and cardinality(topics) = 1 and md5(topics[1]) = '9166a75a3025ce0b74d60ab73af70af0'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 581);

update public.disciplines set topics = array['Estruturas anatômicas e a contextualização de suas relações topográficas', 'Aplicação clínica da anatomia macroscópica na atuação profissional']::text[]
where id = 582 and cardinality(topics) = 1 and md5(topics[1]) = 'f9d6d7062af2e99aa172e36b07ddb8ce'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 582);

update public.disciplines set topics = array['"Conjuntos numéricos e funções', 'Funções de primeiro e segundo grau', 'Funções exponenciais e logarítmicas', 'Coordenadas cartesianas e gráficos de funções', 'Derivadas e regras de derivação', 'Estudo da variação das funções, pontos críticos, máximos e mínimos', 'Primitivas e integrais definidas', 'Teorema Fundamental do Cálculo', 'Aplicações da integral."']::text[]
where id = 583 and cardinality(topics) = 1 and md5(topics[1]) = '2100f6216c2e929f75a2e2bda35d3861'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 583);

update public.disciplines set topics = array['"Células e organelas', 'Tecidos epitelial, conjuntivo e suas variedades, muscular e nervoso', 'Sistemas circulatórios, digestório e respiratório', 'Relação estrutura-função"']::text[]
where id = 584 and cardinality(topics) = 1 and md5(topics[1]) = '1fd10a8a71a10f722c78dd52527cb889'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 584);

update public.disciplines set topics = array['História da informática em saúde e demonstração das aplicações em serviços de saúde', 'Definições e conceitos da informática em saúde', 'Informação científica na internet e em bases de dados bibliográficas', 'Recursos de tecnologia da informação e comunicação no contexto hospitalar e atenção primária', 'Telemedicina/Telessaúde', 'Prontuário eletrônico do paciente', 'Sistemas de apoio à decisão', 'Sistemas de informação em saúde', 'Tecnologias educacionais, como simulações, ensino a distância, realidade aumentada, realidade virtual', 'Demonstração dos recursos da tecnologia da informação e informática aplicadas em saúde', 'Discussão e reflexão sobre a ciência da computação, ciência da informação e da saúde na identificação, coleta, processamento e gerenciamento de dados e informações']::text[]
where id = 585 and cardinality(topics) = 1 and md5(topics[1]) = '26a2425d455338a719af9f1abfce7d65'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 585);

update public.disciplines set topics = array['Segurança em laboratório', 'Estrutura da Matéria', 'Ligações Químicas', 'Estados físicos da matéria e Forças Intermoleculares', 'A linguagem química: símbolos, fórmulas e equações', 'Estequiometria', 'Soluções: propriedades e reações em solução', 'Equilíbrio Ácido-base: solução tampão e pH', 'Cinética de reações', 'Principais classes de compostos orgânicos: propriedades e reatividade', 'Hidrocarbonetos: alcanos, alcenos, alcinos e aromáticos', 'Álcoois e Éteres', 'Aldeídos e cetonas', 'Ácidos carboxílicos e seus derivados (amidas e ésteres)', 'Aminas']::text[]
where id = 586 and cardinality(topics) = 1 and md5(topics[1]) = '348e25c857165e14a3a9a11e5611126d'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 586);

update public.disciplines set topics = array['A unidade curricular apresenta-se em dois módulos, sendo que o primeiro tem como meta fundamental o reconhecimento das estruturas anatômicas e a contextualização de suas relações topográficas para permitir a aplicação clínica da anatomia macroscópica na atuação profissional', 'o segundo módulo aborda os eventos morfológicos, estruturais e principais processos genético-moleculares da gametogênese ao desenvolvimento dos sistemas e aparelhos orgânicos do embrião e do feto humano normal', 'Serão também abordados aspectos básicos sobre biologia evolutiva do desenvolvimento e teratogenia, relacionando alguns tópicos a aplicação prática nos âmbitos clínico e experimental']::text[]
where id = 587 and cardinality(topics) = 1 and md5(topics[1]) = 'b25646387af096dc745edd6e2a3f18e0'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 587);

update public.disciplines set topics = array['Conscientização crítica por meio da reflexão dos fenômenos que emergem na área da Bioética', 'Reflexão e posicionamento sobre grandes dilemas éticos']::text[]
where id = 588 and cardinality(topics) = 1 and md5(topics[1]) = 'db758f595b949ac63f06933ddffb7754'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 588);

update public.disciplines set topics = array['Análise processos e confiabilidade no uso de tecnologias médicas', 'Tipos revisão da literatura Estudos clínicos', 'Segurança, eficácia, efetividade, eficiência, custos, custo-efetividade, equidade e incerteza aplicados na DATS', 'Órgãos e entidades nacionais e internacionais que atuam em DATS', 'Organização e elaboração de relatório de DATS Registro de divulgação tecnológica']::text[]
where id = 589 and cardinality(topics) = 1 and md5(topics[1]) = 'd1c8f182fc87c0709c695e6b85d534f0'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 589);

update public.disciplines set topics = array['O conteúdo é apresentado a partir do simples para o complexo', 'evoluindo da célula para os tipos básicos de tecido que compõe os órgãos do corpo humano', 'Constitue preocupação constante das aulas a relação estrutura-função através da qual o estudante compreende que um órgão é organizado para desempenhar determinadas funções fisiológicas e assim tem a suas peculiaridades histológicas', 'Além disso, no decorrer do curso, os alunos são familiarizados com imagens e vocabulários próprios do assunto']::text[]
where id = 591 and cardinality(topics) = 1 and md5(topics[1]) = '825b446d9ae4328331a5deb887390da7'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 591);

update public.disciplines set topics = array['Ementa Informática em Saúde/Informática Médica e principais aplicações em serviços de saúde, especificamente na área da oftalmologia', 'Definições e conceitos da Informática em Saúde', 'Informação científica na Internet e em Bases de Dados Bibliográficas', 'Ciência da informação e da saúde: análise, identificação, coleta, processamento e gerenciamento de dados em serviços de saúde', 'Recursos de TDIC no contexto hospitalar e na Atenção Primária à Saúde: Saúde Digital/Telemedicina / Telessaúde', 'Prontuário Eletrônico do Paciente', 'Sistemas de Apoio à Decisão', 'Sistemas de Informação em Saúde', 'Tecnologias Móveis na prática e na área da oftalmologia', 'Realidade Aumentada', 'Realidade Virtual', 'Inteligência Artificial, Mineração de Dados e Modelagem 3D']::text[]
where id = 592 and cardinality(topics) = 1 and md5(topics[1]) = '621383e5aa7d4bc06418a93c5bcc3699'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 592);

update public.disciplines set topics = array['Órgãos e células do sistema imune humano, imunidade inata e adaptativa (celular e humoral)', 'Hipersensibilidade a compostos usados na clínica', 'Resposta imune contra patógenos', 'Características gerais e classificação de bactérias, fungos, vírus, protozoários e helmintos de importância clínica', 'Doenças causadas por bactérias, fungos, vírus, protozoários e helmintos', 'Vias de disseminação e controle dos microrganismos']::text[]
where id = 593 and cardinality(topics) = 1 and md5(topics[1]) = 'c014902b716efaf2cbe3179e877e0e07'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 593);

update public.disciplines set topics = array['Observação e análise da prática tecnológica nos diferentes níveis de complexidade dos serviços públicos de saúde', 'Relação paciente-tecnólogo', 'Condições socioeconômicas da população e saúde', 'Uso da tecnologia médica e as tecnologias disponíveis no mercado', 'Acesso aos serviços de saúde', 'Trabalho em equipe multidisciplinar', 'Compreensão dos aspectos psicológicos e integração à prática clínica']::text[]
where id = 594 and cardinality(topics) = 1 and md5(topics[1]) = 'b2df309076ca2a317da6282a080fd79e'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 594);

update public.disciplines set topics = array['História da Política de Saúde no Brasil do início do século XX', 'Princípios e diretrizes do SUS e legislação sanitária', 'Determinantes sociais da saúde', 'A doença e seus significados culturais', 'Tecnologia, Corpo e Saúde', 'Aspectos socioculturais da construção do corpo e do processo saúde-doença', 'Concepções de Corpo, Saúde e Doença', 'Corpo, Saúde e desigualdade social', 'Diferença, Corpo e Saúde', 'Corpo, Saúde e Doença como conceitos ligados ao contexto histórico/político de cada sociedade e à experiência concreta de cada sujeito', 'Diálogos entre o biológico e o social (natureza/cultura)', 'Corpo, Saúde, Tecnologias e o contexto sociocultural']::text[]
where id = 595 and cardinality(topics) = 1 and md5(topics[1]) = '5dae3c4937b447018eb6c0b7820e2b80'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 595);

update public.disciplines set topics = array['Noções básicas sobre os principais riscos a saúde ocupacional, infecções relacionadas à assistência à saúde e principais medidas de prevenção e controle', 'Fundamentos da questão ambiental no Brasil e no mundo']::text[]
where id = 596 and cardinality(topics) = 1 and md5(topics[1]) = 'df0c880d390e3a3054dca0af3d624a26'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 596);

update public.disciplines set topics = array['A disciplina tem como meta fundamental o reconhecimento das estruturas anatômicas e a contextualização de suas relações topográficas para permitir a aplicação clínica da anatomia macroscópica na atuação profissional']::text[]
where id = 597 and cardinality(topics) = 1 and md5(topics[1]) = '00185dbd710e164882b745196b421fca'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 597);

update public.disciplines set topics = array['Ondas eletromagnéticas', 'Reflexão e refração da luz', 'Imagens e Instrumentos ópticos', 'Interferência e difração', 'Olho humano', 'Membranas biológicas', 'Bioeletrogênese', 'Canais iônicos e excitabilidade celular']::text[]
where id = 598 and cardinality(topics) = 1 and md5(topics[1]) = '85a662cdefbfa0420fe62a44f820a309'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 598);

update public.disciplines set topics = array['Conscientização crítica por meio da reflexão dos fenômenos que emergem na área da Bioética', 'Reflexão e posicionamento sobre dilemas éticos', 'Apresentar e discutir as medidas de prevenção e controle de infecções, segurança do paciente e as normas reguladoras e legislação pertinente a saúde ocupacional e biossegurança']::text[]
where id = 599 and cardinality(topics) = 1 and md5(topics[1]) = '39ef35fae0230bfeaa17da2eaf0b3a31'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 599);

update public.disciplines set topics = array['Sistemas Nervoso, Cardiovascular, Respiratório, Renal, Digestivo e Endócrino']::text[]
where id = 600 and cardinality(topics) = 1 and md5(topics[1]) = '53139951eb54119561f3e53fa077a18a'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 600);

update public.disciplines set topics = array['Ligações químicas e forças intermoleculares', 'Soluções', 'Equilíbrio ácido-base', 'Principais funções orgânicas', 'Aminoácidos', 'Proteínas: estrutura e funções', 'Biomoléculas: componentes das células e macronutrientes', 'Principais vias metabólicas', 'Integração metabólica']::text[]
where id = 601 and cardinality(topics) = 1 and md5(topics[1]) = '707107a73fe37e92fdf2f18c1bd7bd15'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 601);

update public.disciplines set topics = array['Proporcionar ao aluno o conhecimento sobre a organização do genoma humano, controle da expressão gênica e sua importância para processos fisiológicos e patológicos, causas e tipos de variantes genéticas, estudo dos padrões de herança, doenças genéticas, métodos de investigação das doenças genéticas e terapia gênica nas oftalmopatias', 'A UC também abordará os conhecimentos básicos sobre eventos morfológicos, estruturais e principais processos genético-moleculares observados na gametogênese, na fertilização e desenvolvimento embrionário pré e pós-implantação', 'derivação dos folhetos embrionários', 'Neurulação primária e secundária', 'Desenvolvimento embrionário da face e globo ocular e malformações congênitas de importância oftalmológica', 'Tipos de células-tronco e terapia celular, considerando seus aspectos éticos']::text[]
where id = 602 and cardinality(topics) = 1 and md5(topics[1]) = 'e139c683764b9084c2af7c2b6c2d3213'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 602);

update public.disciplines set topics = array['O conteúdo é apresentado a partir do simples para o complexo', 'evoluindo da célula para os tipos básicos de tecido que compõem os órgãos do corpo humano', 'Constitui preocupação constante das aulas a relação estrutura-função através da qual o estudante compreende que um órgão é organizado para desempenhar determinadas funções fisiológicas e assim tem a suas peculiaridades histológicas', 'Além disso, no decorrer do curso, os alunos são familiarizados com imagens e vocabulários próprios do assunto']::text[]
where id = 603 and cardinality(topics) = 1 and md5(topics[1]) = 'fc1152ae7fdad82875c3311c1d1b68d1'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 603);

update public.disciplines set topics = array['Informática em Saúde/Informática Médica e principais aplicações em serviços de saúde, especificamente na área da oftalmologia', 'Definições e conceitos da Informática em Saúde', 'Informação científica na Internet e em Bases de Dados Bibliográficas', 'Ciência da informação e da saúde: análise, identificação, coleta, processamento e gerenciamento de dados em serviços de saúde', 'Recursos de TDIC no contexto hospitalar e na Atenção Primária à Saúde: Saúde Digital/Telemedicina / Telessaúde', 'Prontuário Eletrônico do Paciente', 'Sistemas de Apoio à Decisão', 'Sistemas de Informação em Saúde', 'Tecnologias Móveis na prática e na área da oftalmologia', 'Realidade Aumentada', 'Realidade Virtual', 'Inteligência Artificial, Mineração de Dados e Modelagem 3D']::text[]
where id = 604 and cardinality(topics) = 1 and md5(topics[1]) = 'a834f3025a0a84e5fb7900c46bb56096'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 604);

update public.disciplines set topics = array['Órgãos e células do sistema imune humano, imunidade inata e adaptativa (celular e humoral)', 'Hipersensibilidade a compostos usados na clínica', 'Resposta imune contra patógenos', 'Características gerais e classificação de bactérias, fungos, vírus, protozoários e helmintos de importância clínica', 'Doenças causadas por bactérias, fungos, vírus, protozoários e helmintos', 'Vias de disseminação e controle dos microrganismos']::text[]
where id = 605 and cardinality(topics) = 1 and md5(topics[1]) = 'c014902b716efaf2cbe3179e877e0e07'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 605);

update public.disciplines set topics = array['Observação e análise da prática tecnológica nos diferentes níveis de complexidade dos serviços públicos de saúde', 'Relação paciente-tecnólogo', 'Condições socioeconômicas da população e saúde', 'Uso da tecnologia médica e as tecnologias disponíveis no mercado', 'Acesso aos serviços de saúde', 'Trabalho em equipe multidisciplinar', 'Compreensão dos aspectos psicológicos e integração à prática clínica']::text[]
where id = 606 and cardinality(topics) = 1 and md5(topics[1]) = 'b2df309076ca2a317da6282a080fd79e'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 606);

update public.disciplines set topics = array['História da Política de Saúde no Brasil do início do século XX', 'Princípios e diretrizes do SUS e legislação sanitária', 'Determinantes sociais da saúde', 'A doença e seus significados culturais', 'Tecnologia, Corpo e Saúde', 'Aspectos socioculturais da construção do corpo e do processo saúde-doença', 'Concepções de Corpo, Saúde e Doença', 'Corpo, Saúde e desigualdade social', 'Diferença, Corpo e Saúde', 'Corpo, Saúde e Doença como conceitos ligados ao contexto histórico/político de cada sociedade e à experiência concreta de cada sujeito', 'Diálogos entre o biológico e o social (natureza/cultura)', 'Corpo, Saúde, Tecnologias e o contexto sociocultural']::text[]
where id = 607 and cardinality(topics) = 1 and md5(topics[1]) = '5dae3c4937b447018eb6c0b7820e2b80'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 607);

update public.disciplines set topics = array['Generalidades sobre anatomia humana', 'Aparelho locomotor', 'Sistema nervoso', 'Sistema circulatório', 'Sistema respiratório', 'Sistema digestório', 'Sistema urinário', 'Sistema genital masculino', 'Sistema genital feminino']::text[]
where id = 608 and cardinality(topics) = 1 and md5(topics[1]) = '97a4aa2d0f4f17b63f2fd7a4334b92c3'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 608);

update public.disciplines set topics = array['Química da célula', 'Introdução à bioenergética', 'Abordagem da energética da hidratação de solutos polares e apolares', 'Análise da estrutura e função das membranas biológicas', 'Abordagem do transporte através das membranas', 'Fundamentação de bioeletrogênese', 'Canais iônicos e excitabilidade celular', 'Acoplamento excitação contração', 'Contração muscular', 'Fundamentos do eletrocardiograma', 'Transporte dos gases respiratórios no sangue', 'Tamponamento dos sistemas biológicos', 'Avaliação do equilíbrio ácido-base']::text[]
where id = 609 and cardinality(topics) = 1 and md5(topics[1]) = '3f8dad7d4c7e0ce7b76d0595df7a1dff'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 609);

update public.disciplines set topics = array['Abordar os eventos morfológicos, estruturais e principais processos genético-moleculares observados na gametogênese, na fertilização, na formação das fases embrionárias pré e pós-implantação e no desenvolvimento dos sistemas e aparelhos orgânicos, correlacionando malformações congênitas de importância clínica', 'Incentivo, via projeto de extensão, à divulgação de parte dos conhecimentos relacionados à preservação da saúde do concepto e da fertilidade']::text[]
where id = 610 and cardinality(topics) = 1 and md5(topics[1]) = '3636ce29449c605d73f9a1ef9be808ab'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 610);

update public.disciplines set topics = array['Noções básicas de biologia celular', 'Estrutura e função de biomoléculas: Aminoácidos, Proteínas, Enzimas, Carboidratos, Lipídeos e Nucleotídeos', 'Biologia Molecular da Célula: Replicação e reparo de DNA', 'Transcrição de RNA', 'Síntese de proteínas e Tecnologias de manipulação genômica', 'Metabolismo celular: Vias anabólicas e catabólicas das biomoléculas, Integração do metabolismo', 'Erros inatos do metabolismo e outras doenças relacionadas com os diferentes processos metabólicos abordados']::text[]
where id = 611 and cardinality(topics) = 1 and md5(topics[1]) = '7d81922fab92dd400555db0013c3fdfb'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 611);

update public.disciplines set topics = array['Determinantes das doenças e agravos em populações humanas', 'Eixo estrutural da Saúde Coletiva', 'Epidemiologia e Saúde', 'Modelos de saúde doença', 'Bases conceituais', 'Medidas de frequência de doenças e agravos na população, fonte de dados, variáveis de exposição: sistemas de informações de saúde, Indicadores de saúde', 'Determinação social, história natural das doenças, critérios de risco e vulnerabilidade, Diagnóstico do perfil de saúde da população brasileira', 'Variáveis relacionadas ao ambiente, sociais e biológicas']::text[]
where id = 612 and cardinality(topics) = 1 and md5(topics[1]) = '30d10cf3839e545d51bcaa74b15df5ad'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 612);

update public.disciplines set topics = array['Fundamentos Filosóficos Clássicos', 'Formação universitária', 'Desenvolvimento da Pessoa, reflexão filosófica', 'Questões existenciais da Enfermagem, liberdade, felicidade, ética, dor, sofrimento, cuidado, morte e transcendência', 'Bases da formação humanística', 'Filosofia no âmbito do trabalho de enfermagem', 'Estabelecimento das relações entre o trabalho do profissional da saúde e o conhecimento dos conceitos filosóficos']::text[]
where id = 613 and cardinality(topics) = 1 and md5(topics[1]) = 'd8f1be910558418930dbce82bd3d29b9'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 613);

update public.disciplines set topics = array['Fisiologia Humana', 'Ciências da Saúde, Construção do conhecimento', 'Processo saúde-doença-cuidado']::text[]
where id = 614 and cardinality(topics) = 1 and md5(topics[1]) = '3380c975ce2df21a564de4babcca6816'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 614);

update public.disciplines set topics = array['Educação em saúde e Ações Extensionistas', 'Educação na saúde em Enfermagem', 'Modelos de Educação em Saúde', 'Tecnologia em Saúde', 'Teorias de ensino e aprendizagem', 'Inclusão no ensino']::text[]
where id = 615 and cardinality(topics) = 1 and md5(topics[1]) = '2d492e72be99e2d510c05c79f3db6098'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 615);

update public.disciplines set topics = array['Reconhecimento de quadros sindrômicos em decorrência de alterações cromossômicas', 'Bases genéticas envolvidas nas principais doenças monogênicas', 'Bases moleculares envolvidas nas doenças multifatoriais e na genética do câncer', 'Interpretação dos exames oriundos da análise citogenética e da análise da genética molecular']::text[]
where id = 616 and cardinality(topics) = 1 and md5(topics[1]) = 'b55d89378d95a299768e95f70a997f23'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 616);

update public.disciplines set topics = array['Células, Tecidos e sistemas do corpo', 'Funcionamento normal, morfologia e função, correlações', 'Processos normais ou anormais do organismo humano']::text[]
where id = 617 and cardinality(topics) = 1 and md5(topics[1]) = '46d4ed58bb3df00ee8ef50f0ffc43582'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 617);

update public.disciplines set topics = array['Trajetória histórica da Enfermagem: Enfermagem e práticas de saúde, Modelo Nightingaleano, História da Enfermagem brasileira', 'Enfermagem como prática social', 'Origem da Profissão', 'A evolução da assistência à Saúde nos períodos históricos', 'As práticas de saúde instintivas e a Enfermagem', 'As práticas de saúde mágico-sacerdotais e a Enfermagem', 'As práticas de saúde no alvorecer da Ciência e a Enfermagem', 'As práticas de saúde monástica-medievais e a Enfermagem', 'As práticas de saúde pós-monásticas e a Enfermagem', 'As práticas de saúde no Mundo Moderno e a Enfermagem', 'Primeiras Escolas de Enfermagem, História de Enfermagem no Brasil', 'Entidade de Classes', 'A Enfermagem no Brasil Moderno']::text[]
where id = 618 and cardinality(topics) = 1 and md5(topics[1]) = 'ea0a0c591bf0f2ee7c3123c7afd65cc8'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 618);

update public.disciplines set topics = array['Relacionar o processo de trabalho da enfermagem com os princípios da Ética e Bioética', 'Aspectos éticos do Processo de Cuidar', 'Legislação do exercício profissional', 'Código de ética dos profissionais de Enfermagem', 'Estudo da compreensão da ética como dimensão fundamental do ser, das relações entre os seres humanos e do ser no mundo na dimensão do cuidar', 'Resoluções e Portarias do COFEN', 'Entidades de Classe e Sociedades Profissionais']::text[]
where id = 619 and cardinality(topics) = 1 and md5(topics[1]) = '2730680581a8e6c0bd2e02903e588fc1'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 619);

update public.disciplines set topics = array['Método científico', 'Busca, organização, leitura e interpretação de publicações científicas']::text[]
where id = 620 and cardinality(topics) = 1 and md5(topics[1]) = '6c8d5436588b104deb9c32f969372445'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 620);

update public.disciplines set topics = array['Bactérias, fungos, vírus e parasitas: importância, taxonomia, aspectos morfológicos e patologias causadas por estes', 'Estudo dos mecanismos de resposta imune humoral e celular', 'Envolvimento dos mecanismos com a saúde e a doença']::text[]
where id = 621 and cardinality(topics) = 1 and md5(topics[1]) = 'bb8fee27c63759f3e3c1c107c4dc1f3a'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 621);

update public.disciplines set topics = array['Fundamentos e marcos conceituais da saúde e doença', 'Processo saúde, doença e cuidado', 'Determinantes do processo saúde doença', 'Princípios e diretrizes do SUS', 'Promoção à saúde', 'Educação popular e educação em saúde', 'Saúde Ambiental (conceitos básicos)', 'Educação ambiental como estratégia para o desenvolvimento sustentável', 'Prática em saúde coletiva em equipamentos sociais de ensino e de saúde']::text[]
where id = 622 and cardinality(topics) = 1 and md5(topics[1]) = '1e1f0456b6739e2188a2a0ad26b82f00'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 622);

update public.disciplines set topics = array['Atendimento às vítimas de trauma e emergências clínicas no contexto extra-hospitalar', 'PACIENTE ADULTO Avaliação Primária e Secundária da Vítima Parada Cardíaca e Reanimação Obstrução das Vias Aéreas Ferimentos e Hemorragias Fraturas e Imobilizações Queimaduras Intoxicações Animais Peçonhentos Estado de Mal Súbito: Dor Torácica, Convulsão e Desmaio Transporte de vítimas PACIENTE PEDIÁTRICO Epidemiologia e Prevenção de acidentes na Infância Avaliação de sinais de Insufici6enciaa respiratória e Circulatória Reanimação Cárdio-respiratória: Suporte Básico de Vida no Lactente Suporte Básico de Vida na Criança Desobstrução de Vias Aéreas']::text[]
where id = 623 and cardinality(topics) = 1 and md5(topics[1]) = '1e4a589f7b85e69bca63e39d355efd4d'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 623);

update public.disciplines set topics = array['Noções de acústica e psicoacústica', 'Bases físicas da audição e fonação', 'Desenvolvimento da capacidade de atuar em projetos de produtos de educação em saúde', 'Criar relações de conceitos teóricos, o desenvolvimento de produtos e a transmissão de conhecimento em saúde', 'Nesta UC, parte do conteúdo será trabalhado em atividade de extensão']::text[]
where id = 624 and cardinality(topics) = 1 and md5(topics[1]) = '0ea09745e882a7e06b81b47bed3bf5cc'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 624);

update public.disciplines set topics = array['A UC aborda o conhecimento dos diferentes sistemas do corpo humano, juntamente com a visualização das estruturas anatômicas em laboratório, para permitir que os alunos tenham subsídios reais para exercer sua função de Fonoaudiólogo', 'Constitui disciplina de integração com Fisiologia, Histologia e Genética']::text[]
where id = 625 and cardinality(topics) = 1 and md5(topics[1]) = '8dbe6ba3d36e4558abc2a0d4946a83f2'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 625);

update public.disciplines set topics = array['Substrato morfológico das patologias da comunicação humana']::text[]
where id = 626 and cardinality(topics) = 1 and md5(topics[1]) = 'f51a17660a95235245c4d0313d0bcbd1'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 626);

update public.disciplines set topics = array['A química da célula', 'Bioenergética', 'Energética da hidratação de solutos polares e apolares', 'Membranas biológicas: estrutura e função', 'Transporte através das membranas', 'Bioeletrogênese', 'Canais iônicos e Excitabilidade celular', 'Biofísica da visão', 'Biofísica da Audição']::text[]
where id = 627 and cardinality(topics) = 1 and md5(topics[1]) = '0a33cd830c602eee10679aac98246dd5'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 627);

update public.disciplines set topics = array['A Biologia do Desenvolvimento envolve o estudo dos eventos morfológicos e dos processos genético-moleculares principais observados durante as primeiras semanas do desenvolvimento embrionário e fetal, tais como: gametogênese masculina e feminina, fertilização, segmentação do zigoto, implantação embrionária, gastrulação e inflexão, neurulação, além da formação dos anexos embrionários', 'desenvolvimento de órgãos e sistemas do embrião/feto humano normal, que participam do complexo fonoaudiológico humano (Sistemas Nervoso, Sensorial, Digestório e Respiratório), além do desenvolvimento das orelhas', 'O papel de xenobióticos e teratogenia no desenvolvimento destas estruturas e uma introdução sobre aspectos práticos e legais do uso de células-tronco também são abordados', 'Nesta UC, parte do conteúdo será trabalhado em atividade de extensão']::text[]
where id = 628 and cardinality(topics) = 1 and md5(topics[1]) = '0546f802746bf96b05b62583313cede4'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 628);

update public.disciplines set topics = array['Introdução ao estudo da fisiologia dos sistemas nervoso, cardiovascular, respiratório, digestório, renal e endócrino']::text[]
where id = 629 and cardinality(topics) = 1 and md5(topics[1]) = 'c298d25ca4604f53c3df16d9d6358c2b'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 629);

update public.disciplines set topics = array['Análise do fenômeno educativo em sua complexidade, considerando a relação estreita entre cultura, sociedade e educação, entendendo a educação como campo de pesquisa e de produção de conhecimento']::text[]
where id = 630 and cardinality(topics) = 1 and md5(topics[1]) = '31fec3cc4b879cca8b76825fbf576208'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 630);

update public.disciplines set topics = array['As características do material genético, as bases da transmissão hereditária, seus padrões de herança, mecanismos citogenéticos e moleculares de estudo e diagnóstico']::text[]
where id = 632 and cardinality(topics) = 1 and md5(topics[1]) = '900e1a4bb0c343f67464918c6c920009'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 632);

update public.disciplines set topics = array['O conteúdo é apresentado a partir do simples para o complexo', 'evoluindo da célula para os tipos básicos de tecidos e então para a estrutura dos órgãos e dos vários sistemas', 'Dois aspectos constituem preocupação constante das aulas: um, a relação estrutura e função pela qual o estudante compreende que um órgão é “projetado” para desempenhar uma determinada tarefa fisiológica e assim tem a suas peculiaridades histológicas e outro, o papel que os diferentes sistemas desempenham para a manutenção da vida', 'Além disso, no decorrer do curso, os alunos são familiarizados com imagens e vocabulários próprios do assunto', 'Os seguintes assuntos serão abordados: células e organelas, os tecidos epitelial, conjuntivo e suas variedades, muscular, nervoso, os sistemas: respiratório, circulatório, a orelha e o olho']::text[]
where id = 633 and cardinality(topics) = 1 and md5(topics[1]) = 'f8b41212e6551b63e71fecfd858679c5'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 633);

update public.disciplines set topics = array['Informática em saúde e suas aplicações nas ciências e práticas da fonoaudiologia']::text[]
where id = 634 and cardinality(topics) = 1 and md5(topics[1]) = 'de0c4b620a7af0e29386d89a6851db5e'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 634);

update public.disciplines set topics = array['As diferentes áreas de conhecimento da Fonoaudiologia', 'A Fonoaudiologia e a interface com outras Ciências', 'O futuro da Fonoaudiologia', 'O profissional do futuro']::text[]
where id = 636 and cardinality(topics) = 1 and md5(topics[1]) = '0cd05c49ae2df7b799e8abb909b79bda'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 636);

update public.disciplines set topics = array['Conceitos de Linguística: definição, divisões e teorias', 'transcrições e análise de enunciado']::text[]
where id = 637 and cardinality(topics) = 1 and md5(topics[1]) = 'ec53178258c97ea5394f5dfb5e67fcfa'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 637);

update public.disciplines set topics = array['A importância do método científico na prática fonoaudiológica', 'O processo de pesquisa (do planejamento á comunicação dos resultados)', 'Desenhos de pesquisa na área da saúde', 'Selecionando um tema de interesse', 'Importância da revisão e organização da literatura', 'Etapas do método científico', 'Elementos da comunicação científica', 'Princípios éticos da produção acadêmica e na pesquisa em saúde']::text[]
where id = 638 and cardinality(topics) = 1 and md5(topics[1]) = '10226ccfe573212e68b6d4e1c693f355'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 638);

update public.disciplines set topics = array['Introdução à neuroanatomia', 'Os métodos de estudo em neuroanatomia', 'As estruturas dos diferentes sistemas']::text[]
where id = 639 and cardinality(topics) = 1 and md5(topics[1]) = 'a7555555f35dea7f47fed366cbc48114'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 639);

update public.disciplines set topics = array['História e campo de atuação da Psicologia', 'Principais teorias em Psicologia', 'Processos psicológicos básicos e inteligência', 'Conceito e modelos de personalidade', 'Abordagens em Terapia Psicológica']::text[]
where id = 640 and cardinality(topics) = 1 and md5(topics[1]) = 'aabb8d010793b924d75c6183a230bd62'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 640);

update public.disciplines set topics = array['Discutir o conceito de saúde - processo saúde-doença/determinantes e condicionantes da saúde', 'Reconhecer a saúde como direito humano', 'Distinguir Saúde Pública, Saúde Coletiva e Ações em Saúde (promoção, proteção, recuperação e reabilitação)', 'Conhecer diferentes Sistemas de Saúde, especialmente, o Sistema Único de Saúde (SUS) - Brasil', 'Discutir conceitos de planejamento em saúde – bases da territorialização', 'Analisar as variações e inequidades culturais e socioeconômicas que interferem nos diferentes ciclos de vida e respectivas Políticas Públicas de Saúde', 'Carga horária total curricularizada (bases teóricas para ações nos diferntes ciclos vitais e níveis de atenção à saúde)', 'Nesta UC, o conteúdo será trabalhado em atividade de extensão']::text[]
where id = 641 and cardinality(topics) = 1 and md5(topics[1]) = 'ba253da53d4079f6a85223dd5867aacb'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 641);

update public.disciplines set topics = array['Morfologia macroscópica e microscópica, biologia estrutural e do desenvolvimento dos sistemas corporais humano', 'Nomenclatura anatômica, planos e eixos de delimitação e posicionamento do corpo humano', 'Técnicas citológicas e histológicas', 'Organização morfofuncional dos tecidos e sistemas', 'Mecanismos morfogenéticos do desenvolvimento embriofetal', 'Placenta e Membranas Fetais', 'Anomalias Congênitas', 'Teratologia', 'Correlação das Ciências Morfológicas ao conhecimento médico à prática clínica-cirúrgica', 'Parte do conteúdo será desenvolvido em atividades de extensão']::text[]
where id = 642 and cardinality(topics) = 1 and md5(topics[1]) = 'fc5ba132ecc028833983a8852199a777'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 642);

update public.disciplines set topics = array['Aspectos biofísicos celulares e sistêmicos que regem a função dos diferentes tecidos, órgãos e sistemas do corpo humano', 'Parte do conteúdo será desenvolvido em atividades de extensão']::text[]
where id = 643 and cardinality(topics) = 1 and md5(topics[1]) = '0da24beacd661093cd728b3244bea705'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 643);

update public.disciplines set topics = array['Organização dos genomas', 'Fluxo da informação genética', 'Controle da expressão gênica', 'Comunicação celular', 'Mecanismos moleculares da proliferação celular, neoplasia e morte celular', 'Bases moleculares dos erros inatos do metabolismo', 'Parte do conteúdo será desenvolvido em atividades de extensão']::text[]
where id = 644 and cardinality(topics) = 1 and md5(topics[1]) = 'c4dc0179b61aab8281926f379277a1cf'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 644);

update public.disciplines set topics = array['Estrutura e função das principais biomoléculas, degradação e biossíntese desses compostos em diferentes tecidos e órgãos', 'Parte do conteúdo será desenvolvido em atividades de extensão']::text[]
where id = 645 and cardinality(topics) = 1 and md5(topics[1]) = 'c20a05c1658011e98cde36072345005e'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 645);

update public.disciplines set topics = array['Estrutura e função dos diferentes órgãos e sistemas, assim como suas características e funções fisiológicas', 'Parte do conteúdo será desenvolvido em atividades de extensão']::text[]
where id = 646 and cardinality(topics) = 1 and md5(topics[1]) = '537cd41ed0d4443851e349cdfd9d7559'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 646);

update public.disciplines set topics = array['História e filosofia da ciência', 'Construção de projetos de pesquisa em saúde (introdução, pergunta de pesquisa, objetivos, metodologia)', 'Estratégias de busca em bases de dados bibliográficas e internet', 'Redação científica', 'Integridade acadêmica', 'Parte do conteúdo será desenvolvido em atividades de extensão']::text[]
where id = 647 and cardinality(topics) = 1 and md5(topics[1]) = '8a748165fce0edf77f92d36d00942353'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 647);

update public.disciplines set topics = array['Observação e análise da prática médica nos diferentes níveis de complexidade dos serviços públicos de saúde', 'A prática, a aprendizagem e o ensino da medicina centrados na pessoa', 'Narrativas em saúde', 'Relação médico-paciente', 'Doença e experiência da doença', 'Trabalho em equipe multidisciplinar e comunicação', 'Acesso e prestação de serviços em saúde', 'Condições socioeconômicas da população e Letramento em saúde', 'Parte do conteúdo será desenvolvido em atividades de extensão']::text[]
where id = 648 and cardinality(topics) = 1 and md5(topics[1]) = '7d6df6f72fd89bf1a38ad2b2ff2f6728'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 648);

update public.disciplines set topics = array['Tem como objetivo aprender o manejo do paciente de emergência, ensinando procedimentos básicos', 'Parte do conteúdo será desenvolvido em atividades de extensão']::text[]
where id = 649 and cardinality(topics) = 1 and md5(topics[1]) = '38cab68f20ea7f1819274068187d3c42'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 649);

update public.disciplines set topics = array['Concepções sobre saúde', 'Conceituação de doença', 'Concepção sobre cura e curador', 'Impacto da diversidade social, sexual e subjetiva sobre a doença e a percepção da saúde', 'Impacto da desigualdade social e da diversidade sociocultural no processo de cura e adoecimento', 'Parte do conteúdo será desenvolvido em atividades de extensão']::text[]
where id = 650 and cardinality(topics) = 1 and md5(topics[1]) = 'afba330a8ddb9ffdaeeb8eee5df90b9c'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 650);

update public.disciplines set topics = array['Autoconhecimento', 'Ciência da Felicidade aplicada a jornada pessoal, acadêmica e profissional', 'Autogestão da Carreira', 'Estratégias para conquistar o mercado de trabalho', 'Mentalidade Empreendedora e Digital', 'Oportunidades, resolução de problemas e inovação', 'Propósito', 'Protagonismo social e cidadania ativa', 'Pensamento científico na carreira em pesquisa']::text[]
where id = 869 and cardinality(topics) = 1 and md5(topics[1]) = '6ccf38d3700edc88f27f96fef616a253'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 869);

update public.disciplines set topics = array['Fundamentos da administração', 'Planejamento estratégico', 'Economia', 'Macroeconomia', 'Desemprego e inflação', 'Empreendedorismo', 'Estatística Descritiva', 'Estatística Inferencial Aplicada']::text[]
where id = 870 and cardinality(topics) = 1 and md5(topics[1]) = 'a1fd3c8e05c0d8469d85e19471340562'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 870);

update public.disciplines set topics = array['Introdução à farmacologia aplicada à Odontologia', 'Formas farmacêuticas', 'Prescrição medicamentosa', 'Vias de administração', 'Farmacologia da dor e inflamação (fisiopatologia)', 'Analgésicos, anti-inflamatórios em clínica odontológica', 'Antimicrobianos mais utilizados em odontologia e Profilaxia antimicrobiana', 'Tratamento medicamentoso da ansiedade no paciente odontológico', 'Interações medicamentosas', 'Hemostáticos e coagulantes', 'Antivirais', 'Planejamento terapêutico com embasamento técnico-científico e legal para a utilização de fármacos', 'Neurofisiologia da dor e conceitos de anestesiologia', 'Sais anestésicos e vasoconstritores', 'Cálculo de dose máxima', 'Anatomia aplicada à Anestesiologia', 'Técnicas anestésicas para maxila e mandíbula', 'Complicações anestésicas', 'Restrições sistêmicas ao uso de anestésicos locais - hipertensos, cardiopatas, diabéticos']::text[]
where id = 871 and cardinality(topics) = 1 and md5(topics[1]) = '0a2c43f09f10868a394b7fa91299c8b7'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 871);

update public.disciplines set topics = array['Potência instantânea e média', 'Máxima transferência de potência', 'Valor RMS ou eficaz', 'Potência aparente e fator de potência', 'Potência complexa', 'Correção do fator de potência', 'Circuitos trifásicos equilibrados', 'Circuitos de acoplamento magnético e energia em circuito acoplado']::text[]
where id = 872 and cardinality(topics) = 1 and md5(topics[1]) = '9413ebb404134f6205ec60dc2645622f'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 872);

update public.disciplines set topics = array['Conceitos fundamentais de sistemas de unidades, carga e corrente, tensão, potência e energia, elementos de circuitos', 'Leis básicas como lei de Ohm, leis de Kirchhoff, associação de resistores, divisor de tensão, divisor de corrente e transformações Y-Delta', 'Métodos de análise como análise nodal e análise de malhas', 'Teoremas de circuitos incluindo propriedade da linearidade, princípio da superposição, transformação de fontes, teorema de Thévenin, teorema de Norton e máxima transferência de potência', 'Capacitores e indutores com associação série e paralelo', 'Análise de circuitos de primeira e segunda ordem', 'Introdução a fasores', 'Aplicações práticas de circuitos elétricos em sistemas reais']::text[]
where id = 873 and cardinality(topics) = 1 and md5(topics[1]) = '6c8ab5f61d78fb9a8886bbae26a6b566'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 873);

update public.disciplines set topics = array['Sistemas de tempo contínuo e de tempo discreto', 'Sinais de tempo contínuo e de tempo discreto', 'Sinais periódicos', 'Transformações da variável independente', 'Sinais com simetria par e com simetria ímpar', 'Energia e potência de um sinal', 'Sinais senoidais e exponenciais', 'Função de transferência']::text[]
where id = 874 and cardinality(topics) = 1 and md5(topics[1]) = '4cb41006857ffe3eda80a00c42f44f00'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 874);

update public.disciplines set topics = array['Fundamentos da análise e da ciência de dados', 'Métodos de coleta, limpeza e transformação de dados', 'Estatística descritiva e inferencial aplicada à análise de dados', 'Introdução ao big data e suas dimensões de volume, variedade, velocidade, veracidade e valor', 'Armazenamento distribuído em bancos SQL e NoSQL', 'Ferramentas e frameworks para análise de dados em larga escala', 'Visualização de dados com dashboards e gráficos interativos para apoio à tomada de decisões', 'Ética, privacidade e governança de dados']::text[]
where id = 875 and cardinality(topics) = 1 and md5(topics[1]) = '0395d3322c5345276530eb65890850f2'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 875);

update public.disciplines set topics = array['Decupagem como Operação Crítica', 'Cinema e Poder', 'Escutar o cinema: som, voz e silêncio como discurso político', 'Formas do olhar: enquadramento, movimento e duração como pensamento', 'Caminhos para uma crítica policêntrica', 'História e métodos da crítica cinematográfica', 'Crítica e criação em audiovisual', 'Cinema e Tecnologia e o estatuto da imagem']::text[]
where id = 876 and cardinality(topics) = 1 and md5(topics[1]) = '72f6854cf84e240f26c1b719029cd178'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 876);

update public.disciplines set topics = array['Utilização de números adimensionais na análise de processos químicos', 'Técnicas de simulação, análise e otimização de processos com enfoque em eficiência energética e sustentabilidade ambiental', 'Formulação e solução numérica de equações diferenciais ordinárias e parciais em sistemas de engenharia', 'Dedução dos balanços fenomenológicos de massa e energia em regime estacionário e dinâmico', 'Fundamentos dos balanços globais de massa e energia aplicados a processos químicos', 'Interpretação e validação de resultados de simulações computacionais', 'Introdução e aplicação de simuladores de processos comerciais para estudo de casos industriais', 'Implementação computacional de modelos matemáticos fenomenológicos de processos industriais']::text[]
where id = 878 and cardinality(topics) = 1 and md5(topics[1]) = 'fe2fbcaf7a097e49e092007c518024c7'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 878);

update public.disciplines set topics = array['Conceitos e aplicações de equilíbrio químico em sistemas homogêneos e heterogêneos', 'Equilíbrio ácido-base e cálculos de pH em diferentes soluções', 'Métodos volumétricos e técnicas de padronização de soluções', 'Estudo da reversibilidade de reações químicas e sua influência nos processos analíticos', 'Estudo dos métodos gravimétricos e suas aplicações em análise quantitativa', 'Equilíbrio de oxirredução e determinação de espécies redox em amostras químicas', 'Introdução aos fundamentos e importância da química analítica', 'Equilíbrio de complexação e suas aplicações em titulações complexométricas']::text[]
where id = 880 and cardinality(topics) = 1 and md5(topics[1]) = 'c5a4c7a6a7d8614d1b24f546a127e2ab'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 880);

update public.disciplines set topics = array['Procedimentos de avaliação audiológica básica, incluindo anamnese, audiometria tonal liminar, logoaudiometria e medidas de imitância acústica', 'Interpretação dos resultados da avaliação audiológica básica', 'Aspectos transversais e situação- problema integradora envolvendo cognição, tecnologia, cultura, comunicação, trabalho colaborativo, análise de exames audiológicos e formulação de hipótese diagnóstica inicial', 'Aparelho de amplificação sonora individual: histórico, tipos, componentes, características eletroacústicas, adaptação, verificação e validação', 'Fundamentos da audiologia, organização do sistema auditivo, anatomia e fisiologia da audição', 'Classificação, sinais, características e principais etiologias das perdas auditivas', 'Avaliação audiológica em diferentes contextos, com ênfase na audiologia infantil e ocupacional', 'Processos de detecção, condução, transmissão e interpretação dos sons']::text[]
where id = 882 and cardinality(topics) = 1 and md5(topics[1]) = 'fbe29651d321be8fb05015339629f663'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 882);

update public.disciplines set topics = array['A opinião e crônica audiovisual', 'A palavra e as imagens: O texto para o audiovisual', 'História do jornalismo audiovisual', 'Ética, sensacionalismo e espetacularização', 'Relação entre notícias, noticiabilidade e imagens', 'Formatos do jornalismo audiovisual: Telejornal, ancoragem, stand-up, reportagem e entrevistas', 'Planos e composição: processo de produção audiovisual', 'captação de imagens', 'edição de imagens e finalização', 'O audiovisual em contexto mobile, vivo, edição e plataformas, imagem, representação e relação étnico-racial nas notícias por imagem audiovisual']::text[]
where id = 883 and cardinality(topics) = 1 and md5(topics[1]) = 'abc6497d5181af67ad8e88b8cb2460d2'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 883);

update public.disciplines set topics = array['Introdução ao Audiovisual', 'Roteiro Publicitário e Storytelling', 'Pós-produção e Distribuição', 'Criação e Produção de Peças Publicitárias Audiovisuais', 'Construção de Identidade Sonora', 'Domínio da Linguagem Visual e Audiovisual', 'Pré-produção e Produção', 'Diversidade Étnico-Racial e Cultural na Produção Audiovisual']::text[]
where id = 884 and cardinality(topics) = 1 and md5(topics[1]) = 'c21761faea1d9754d9bb24465278d645'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 884);

update public.disciplines set topics = array['Estrutura e funcionamento de sistemas supervisórios', 'Fundamentos e arquitetura dos controladores lógico- programáveis', 'Integração entre CLPs e sistemas supervisórios em ambientes industriais', 'Integração de processos produtivos com sistemas de controle e supervisão', 'Tecnologias de automação aplicadas à manufatura digital', 'Linguagens de programação de CLPs conforme normas IEC', 'Tendências em manufatura inteligente e Indústria 4.0', 'Conceitos e aplicações de sistemas integrados de manufatura']::text[]
where id = 885 and cardinality(topics) = 1 and md5(topics[1]) = 'f132a99ef34d8b171f0c33892a25a292'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 885);

update public.disciplines set topics = array['Fundamentos de sistemas de automação e controle', 'Modelagem de sistemas físicos e representações matemáticas', 'Análise de estabilidade e desempenho de sistemas dinâmicos', 'Projeto de controladores clássicos e modernos', 'Acionamentos elétricos e conversores de potência', 'Controladores lógicos programáveis e integração com sensores e atuadores', 'Redes industriais e sistemas supervisórios', 'Eficiência energética e práticas sustentáveis aplicadas à automação']::text[]
where id = 886 and cardinality(topics) = 1 and md5(topics[1]) = 'a56324a31283e55b7f6e3fe33b10eae9'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 886);

update public.disciplines set topics = array['Avaliação, indicadores e diagnóstico de estado nutricional', 'Inquéritos dietéticos de consumo alimentar', 'Semiologia nutricional', 'antropometria', 'avaliação física', 'exames complementares ao diagnóstico clínico', 'triagem nutricional de indivíduos e coletividades', 'Aspectos do estado fisiológico', 'Considerações sobre raça/etnia, identidade de gênero, e dimensões culturais, sociais e econômicas']::text[]
where id = 887 and cardinality(topics) = 1 and md5(topics[1]) = 'd687be4ed778a7be158c2b26411ead0c'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 887);

update public.disciplines set topics = array['Fundamentos de sistemas de banco de dados e de gerenciamento da informação', 'Modelagem conceitual utilizando diagramas entidade-relacionamento', 'Modelagem lógica e física de dados', 'Linguagem SQL abrangendo DDL, DML e DQL', 'Normalização e integridade referencial em projetos de bases de dados', 'Transações, concorrência e recuperação de dados', 'Introdução a bancos de dados NoSQL e big data', 'Administração, desempenho e segurança de bases de dados']::text[]
where id = 888 and cardinality(topics) = 1 and md5(topics[1]) = '4059e8530a98efcafe215b5ef4c8c93c'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 888);

update public.disciplines set topics = array['Fungos', 'Relações Étnico-Raciais', 'Plantas Vasculares', 'Plantas e povos tradicionais: etnobotânica e conservação cultural', 'Sistemática Vegetal e Nomenclatura', 'Plantas com flores e frutos', 'Endossimbiose e evolução do cloroplasto', 'Plantas Avasculares']::text[]
where id = 889 and cardinality(topics) = 1 and md5(topics[1]) = '41acfea3a620b38f127a6e55ff04d699'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 889);

update public.disciplines set topics = array['Embriologia e desenvolvimento humano', 'Aspectos morfológicos do desenvolvimento', 'Aspectos funcionais do desenvolvimento', 'Análise morfofuncional dos sistemas corporais', 'Processos de controle homeostático', 'Circulação', 'Respiração', 'Digestão', 'Secreção', 'Reprodução', 'Regulação e controle dos fenômenos físico químicos', 'Regulação e controle das funções vitais', 'Características histológicas dos tecidos epiteliais', 'Características histológicas dos tecidos conjuntivos', 'Características histológicas dos tecidos muscular e nervoso', 'Relação das estruturas órgãos e sistemas com distúrbios observados no corpo humano']::text[]
where id = 890 and cardinality(topics) = 1 and md5(topics[1]) = 'f5f8840fe2d2be38feecb9f9dfab111c'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 890);

update public.disciplines set topics = array['Estratégias Integradas de Branding Sustentável', 'Estratégias de Construção de Marca Gráfica', 'Aspectos Legais, Ética e Responsabilidade Social no Branding', 'Criação de Marca, Identidade e Estratégia de Gestão de Marca', 'Gestão, Avaliação e Resultados', 'Estratégias e Aplicações da Marca nos Pontos de Contato', 'Comunicação, Aplicação e Experiência de Marca', 'Fundamentos de Branding e Identidade Visual']::text[]
where id = 891 and cardinality(topics) = 1 and md5(topics[1]) = '67ba83c154645f738126971cc2fa9c66'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 891);

update public.disciplines set topics = array['Ditaduras, Censura e Estratégias de Subversão', 'Políticas do contemporâneo', 'Cinema e Contextos Coloniais', 'Industrialização, Estúdios e Nacionalismos Populares', 'Festivais, Cineclubes e Redes de Circulação', 'Redemocratização, Mercado e Crise', 'Cinemas regionais e cartografias do Brasil', 'Revoluções Estéticas e Cinemas de Libertação']::text[]
where id = 892 and cardinality(topics) = 1 and md5(topics[1]) = 'e6752971b88c7091d7060eb3471fb435'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 892);

update public.disciplines set topics = array['Transformações Estéticas e Experimentações Formais', 'Revisões Historiográficas do Cinema', 'Origens Policêntricas do Cinema e Disputas de Representação', 'Indústria Cinematográfica e Cultura Cinematográfica Popular', 'Expansões do Cinematográfico', 'Crítica da Representação', 'Formas Narrativas no Cinema Mundial', 'Materialidades, Suportes e Tecnologias do Audiovisual']::text[]
where id = 893 and cardinality(topics) = 1 and md5(topics[1]) = '2af0f6cafdb3bdf0f4fc766bdf809da7'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 893);

update public.disciplines set topics = array['Conceitos fundamentais: sistemas de unidades, carga elétrica, corrente, tensão, potência e energia', 'Leis básicas de circuitos: lei de Ohm, incluindo associação de resistores e leis de Kirchhoff', 'Métodos de análise de circuitos: análise nodal e análise de malhas', 'Teoremas de circuitos: superposição, Thévenin, Norton e máxima transferência de potência', 'Elementos reativos: capacitores e indutores e análise de circuitos', 'Propriedades dos materiais semicondutores e funcionamento de diodos em fontes de alimentação CC', 'Transistores bipolares e técnicas de polarização para amplificação', 'Aplicações de amplificadores operacionais em circuitos lineares e não lineares']::text[]
where id = 894 and cardinality(topics) = 1 and md5(topics[1]) = '3813344406f85e1d54e0e07f4c981184'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 894);

update public.disciplines set topics = array['Propriedades da matéria e estados físicos', 'Ligações químicas e geometria molecular', 'Reatividade química e degradação', 'Propriedades físico-químicas e misturas', 'Introdução à ciência dos materiais e classificação', 'Estrutura e defeitos cristalinos', 'Propriedades mecânicas e impacto ambiental', 'Aplicações e desempenho tecnológico']::text[]
where id = 895 and cardinality(topics) = 1 and md5(topics[1]) = 'ae67a4a96739eeac020a0503f89bb58d'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 895);

update public.disciplines set topics = array['Biofísica da Matéria Viva e Processos Moleculares', 'Energia, Termodinâmica e Transformações Químicas', 'Ondas, Eletricidade e Instrumentação Científica', 'Estrutura da Matéria e Propriedades dos Materiais', 'Educação Ambiental', 'Medidas, Análise de Dados e Estatística Básica', 'Energia limpa e materiais sustentáveis como base para a justiça ambiental', 'Modelagem, Quantificação e Solução Integrada de Problemas']::text[]
where id = 896 and cardinality(topics) = 1 and md5(topics[1]) = 'f9408d48c4bc5254e29113d668aa2559'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 896);

update public.disciplines set topics = array['Filosofia e metodologia da ciência', 'Bioética e bem-estar animal como dimensões da dignidade e dos direitos humanos', 'Fundamentos de sociologia e antropologia', 'Ecologia comportamental', 'Fundamentos do comportamento animal', 'Métodos de estudo e análise de ecologia comportamental animal', 'Aspectos éticos e legais do exercício profissional', 'Direitos Humanos']::text[]
where id = 897 and cardinality(topics) = 1 and md5(topics[1]) = 'e235b3ef3ea3876355f12556053d5965'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 897);

update public.disciplines set topics = array['Psicologia do Consumo', 'Tendências', 'Futuros, Sinais e Antecipação de Mudanças', 'Pesquisa de Mercado', 'Abordagem Qualitativa em Pesquisa', 'Fundamentos do Comportamento do Consumidor', 'Relatório de Tendências', 'Estatística Aplicada em Pesquisa']::text[]
where id = 898 and cardinality(topics) = 1 and md5(topics[1]) = '015952a25d8e6bfecc43295f3922e2e4'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 898);

update public.disciplines set topics = array['Fundamentos da computação paralela e concorrente', 'Arquiteturas e modelos de alto desempenho', 'Programação concorrente e distribuída com técnicas de paralelização', 'Avaliação e métricas de desempenho em sistemas paralelos', 'Fundamentos da computação quântica e seus princípios', 'Estudo de algoritmos quânticos básicos', 'Simulação de computação quântica em ambientes computacionais', 'Aplicações emergentes de computação de alto desempenho e quântica']::text[]
where id = 899 and cardinality(topics) = 1 and md5(topics[1]) = 'eae141302c6169279d043ef172873762'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 899);

update public.disciplines set topics = array['Fundamentos da computação gráfica e da visualização computacional', 'Modelagem geométrica e transformações em duas e três dimensões', 'Técnicas de renderização gráfica em 2D e 3D', 'Processamento e manipulação de imagens digitais', 'Conceitos e aplicações de realidade virtual e realidade aumentada', 'Utilização de motores gráficos e bibliotecas especializadas', 'Dispositivos e interfaces para interação imersiva', 'Aplicações em jogos digitais, simulação e design interativo']::text[]
where id = 900 and cardinality(topics) = 1 and md5(topics[1]) = '1ed1f460b6bf0f3ae2995bc65e7f55e5'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 900);

update public.disciplines set topics = array['A Comunicação no Contexto das Organizações', 'Cultura Organizacional e Públicos', 'Plano de Comunicação Integrada', 'Estruturação do Mix da Comunicação Integrada: interna e administrativa', 'Comunicação Intercultural e Relações Étnico-Raciais', 'O Planejamento da Comunicação Integrada: visão estratégica, implantação e monitoramento', 'Estruturação do Mix da Comunicação Integrada: institucional e mercadológica', 'Relacionamento com a Imprensa e Gestão da Imagem e Reputação']::text[]
where id = 901 and cardinality(topics) = 1 and md5(topics[1]) = '1e500be335113e05cf9388ea5da0162b'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 901);

update public.disciplines set topics = array['Estado, Democracia e Comunicação', 'Comunicação Pública, Interesse Público e Direito à Comunicação', 'Planejamento, Projetos e Práticas em Comunicação Pública', 'Direitos Humanos e Cidadania', 'Estado, Governo, Mídia e Processos Comunicacionais', 'Relações Governamentais, Advocacy e Lobby', 'Comunicação Pública, Participação Social e Sustentabilidade', 'Projeto de Comunicação Pública']::text[]
where id = 902 and cardinality(topics) = 1 and md5(topics[1]) = '0b909a9337a3dd15909b24f6e814eba6'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 902);

update public.disciplines set topics = array['Dinâmicas de Mercado', 'Medidas de Atividade Econômica', 'Inflação e Política Monetária', 'Política Fiscal e o Papel do Setor Público', 'Economia Internacional e o Relação do Brasil com o Mundo', 'Globalização e Fluxos Internacionais', 'Desenvolvimento Econômico e Sustentabilidade Ambiental', 'Análise de Conjuntura Econômica para Tomada de Decisão Empresarial']::text[]
where id = 903 and cardinality(topics) = 1 and md5(topics[1]) = '033d9088c4a08e97d13602767f0b769f'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 903);

update public.disciplines set topics = array['Manejo e conservação de recursos naturais', 'Justiça ambiental e participação social no licenciamento e conservação', 'Métricas e modelagem da biodiversidade', 'Educação Ambiental', 'Métodos e estratégias de recuperação de áreas degradadas', 'Noções de legislação ambiental', 'Pagamentos de serviços ambientais', 'Etapas do licenciamento Ambiental']::text[]
where id = 904 and cardinality(topics) = 1 and md5(topics[1]) = '73da9ab178179cd7d8c2f54a8129737a'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 904);

update public.disciplines set topics = array['Organização do Poder: princípios, estrutura, funcionamento e atribuições do Legislativo, Executivo, Judiciário e Ministério Público', 'mecanismos de controle e equilíbrio', 'Da Defesa do Estado e Das Instituições Democráticas: teorias do Estado, Estado de Direito, democracias contemporâneas e democracia no Brasil', 'Controle de Constitucionalidade: conceitos, evolução histórica, espécies (preventivo, repressivo, difuso, concentrado) e sistema brasileiro', 'Remédios Constitucionais: conceitos, cabimento, procedimentos e jurisprudência de Habeas Corpus, Mandado de Segurança, Habeas Data, Ação Popular, Mandado de Injunção e outros instrumentos', 'Introdução ao Direito Ambiental: relação entre Estado, desenvolvimento sustentável, direitos humanos, evolução, princípios e normas constitucionais ambientais', 'Competências Constitucionais e Sistema Nacional do Meio Ambiente (SISNAMA): distribuição federativa, estrutura e funcionamento', 'Estudo de Impacto Ambiental, Responsabilidade Ambiental e Tutela Processual: responsabilidades civil, penal, administrativa e instrumentos de proteção ambiental', 'Legislação Específica e Temas Ambientais: resíduos sólidos, recursos hídricos, energia, biodiversidade, biossegurança, patrimônio genético e regulamentação de agrotóxicos']::text[]
where id = 905 and cardinality(topics) = 1 and md5(topics[1]) = '14418c4eca727e271e847a81327a0335'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 905);

update public.disciplines set topics = array['Fundamentos Historiográficos das Relações Internacionais Sistemas Internacionais Pré-Modernos: métodos, fontes, análise diplomática, abordagem crítica da historiografia, povos, civilizações, sistemas diplomáticos pré-westfalianos e perspectivas não-eurocêntricas', 'Guerras Mundiais e Reconfiguração Global (1914-1945): impactos das guerras, ascensão dos EUA e reestruturação internacional', 'Formação do Sistema Internacional Moderno (1648-1815): Paz de Westfália, diplomacia moderna, Revolução Francesa e Congresso de Viena', 'Ordem Bipolar e Guerra Fria (1945-1991): Descolonização, blocos de poder, diplomacia bipolar e dinâmicas globais', 'Relações Étnico-Raciais na história global: impactos do colonialismo, escravatura e racismo nas relações internacionais', 'Mundo Pós-Guerra Fria e Novas Potências (1991-presente): multipolaridade, desafios contemporâneos e reascensão asiática', 'Hegemonia Europeia e Expansão Imperial (1815-1914): Concerto Europeu, imperialismo, formação de Estados nacionais e mundialização', 'Pesquisa científica em História das Relações Internacionais: aplicação dos métodos historiográficos à investigação acadêmica nas Relações Internacionais']::text[]
where id = 906 and cardinality(topics) = 1 and md5(topics[1]) = '479774c199103d99558219249ee67939'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 906);

update public.disciplines set topics = array['Fundamentos dos sistemas de controle analógico e digital aplicados a equipamentos e processos industriais', 'Modelagem matemática de sistemas dinâmicos lineares e não lineares', 'Introdução ao controle moderno baseado em variáveis de estado', 'Projeto de controladores analógicos e digitais utilizando técnicas clássicas', 'Análise de estabilidade, resposta temporal e frequência de sistemas de controle', 'Representação de sistemas no espaço de estados', 'Aplicações industriais de controle moderno em sistemas automatizados', 'Controlabilidade, observabilidade e projeto de controladores por realimentação de estados']::text[]
where id = 907 and cardinality(topics) = 1 and md5(topics[1]) = 'c526487735329ffa473eba7dda3ccc5d'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 907);

update public.disciplines set topics = array['Valor Aduaneiro, Origem e Cálculo do Custo de Importação', 'Câmbio, Margem e Análise de Viabilidade Econômica', 'Custos Logísticos Nacionais e Análise Operacional', 'Custos Logísticos e Precificação Internacional', 'Fundamentos e Estrutura dos Custos Logísticos', 'Formação de Preço e Precificação em Exportações', 'Tributos, Taxas e Benefícios Fiscais no Comércio Exterior', 'Custos Logísticos Internacionais e Malhas Complexas']::text[]
where id = 909 and cardinality(topics) = 1 and md5(topics[1]) = '07141921a1d0420739f2cb63bf97d598'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 909);

update public.disciplines set topics = array['Projeto e avaliação de reatores isotérmicos e não isotérmicos aplicados a processos industriais sustentáveis', 'Análise e tratamento de dados experimentais de reatores', 'Teoria de adsorção física e química em catalisadores heterogêneos', 'Estimativa de parâmetros cinéticos e validação de modelos', 'Tipos e características dos reatores químicos ideais e reais', 'Teoria da velocidade de reações homogêneas', 'Análise de reatores ideais com reações simples e múltiplas considerando rendimento e seletividade', 'Balanço de massa em reatores ideais e definição de grau de conversão']::text[]
where id = 910 and cardinality(topics) = 1 and md5(topics[1]) = 'dc31dc2f4f02793ff1856a6c9abb80eb'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 910);

update public.disciplines set topics = array['Resolução de sistemas lineares em diferentes aplicações', 'Propriedades e aplicações de matrizes e determinantes', 'Vetores, operações e aplicações geométricas', 'Representação e interpretação gráfica de funções matemáticas diversas', 'Derivadas em modelagens matemáticas', 'Integrais em modelagens matemáticas', 'Equações diferenciais', 'Equações diferenciais aplicada']::text[]
where id = 911 and cardinality(topics) = 1 and md5(topics[1]) = '37d23cd58680f7f9315e8d26a125377a'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 911);

update public.disciplines set topics = array['Resolução de sistemas lineares em diferentes aplicações', 'Propriedades e aplicações de matrizes e determinantes', 'Vetores, operações e aplicações geométricas', 'Representação e interpretação gráfica de funções matemáticas diversas', 'Derivadas em modelagens matemáticas', 'Integrais em modelagens matemáticas', 'Equações diferenciais', 'Equações diferenciais aplicada']::text[]
where id = 912 and cardinality(topics) = 1 and md5(topics[1]) = '37d23cd58680f7f9315e8d26a125377a'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 912);

update public.disciplines set topics = array['Estrutura, mecanismos de defesa e reparação dos tecidos dentários', 'Cárie dentária: aspectos microbiológicos, diagnóstico e progressão', 'Materiais e técnicas de prevenção em dentística', 'Preparos cavitários e proteção do complexo dentino-pulpar', 'Restaurações diretas: seleção de materiais e aplicação clínica', 'Práticas de biossegurança e sustentabilidade na dentística', 'Exame clínico e planejamento de tratamento restaurador', 'Educação em saúde e estratégias de controle microbiológico na clínica odontológica']::text[]
where id = 913 and cardinality(topics) = 1 and md5(topics[1]) = 'bde8a1ff89f341e42efb0da2f8e9107c'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 913);

update public.disciplines set topics = array['Materiais e Técnicas de Desenho Técnico', 'Normas Técnicas e Convenções Gráficas', 'Projeções no Desenho Técnico', 'Desenho Auxiliado por Computador (CAD 2D)', 'Modelagem Tridimensional (CAD 3D)']::text[]
where id = 914 and cardinality(topics) = 1 and md5(topics[1]) = '1d0f81d9957dfd20a82646f8ac8c3d03'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 914);

update public.disciplines set topics = array['Fundamentos do desenvolvimento humano', 'Teorias do desenvolvimento humano', 'Ciclo vital e desenvolvimento biopsicossocial', 'Contextos de desenvolvimento', 'Fatores de risco e proteção', 'Resiliência, institucionalização e direitos', 'Pesquisa em Psicologia do Desenvolvimento', 'Desenvolvimento Humano e Relações Étnico-Raciais']::text[]
where id = 915 and cardinality(topics) = 1 and md5(topics[1]) = '68cd43f231f03350c776403fb63831bc'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 915);

update public.disciplines set topics = array['Arquitetura de aplicações para web e dispositivos móveis', 'Fundamentos de front-end com HTML, CSS e JavaScript', 'Utilização de frameworks modernos como React, Angular e Vue', 'Desenvolvimento back-end com APIs REST e integração a bancos de dados', 'Padrões de projeto para aplicações responsivas, escaláveis e seguras', 'Ambientes de execução mobile em Android, iOS e plataformas híbridas', 'Testes, implantação e publicação de aplicações', 'Segurança e boas práticas no desenvolvimento web e mobile']::text[]
where id = 916 and cardinality(topics) = 1 and md5(topics[1]) = 'cb8a3cbcd54ba2aea591d4ea9796961e'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 916);

update public.disciplines set topics = array['Estudo dos fundamentos teóricos, técnicos e expressivos da linguagem audiovisual aplicada ao design', 'Fundamentos dos estudos semióticos do design audiovisual com base na teoria das matrizes de linguagem e pensamento', 'Inter-relações entre os elementos gráficos da linguagem visual e sonora, a partir de fundamentos estéticos e comunicacionais', 'Abordagem das etapas da criação do design audiovisual, desde a concepção narrativa até a finalização, passando por roteiro, pré-produção, captação, montagem e pós-produção', 'Análise e desenvolvimento de narrativas visuais e sonoras para mídias digitais e multimidiáticas', 'Exploração das estruturas narrativas e das tipologias de roteiro (storyline, sinopse,argumento, escaleta, roteiros literário e técnico), com ênfase na criação e decupagem de cenas e no uso do storyboard como ferramenta de planificação visual', 'Estudo da linguagem sonora enquanto dimensão expressiva da mensagem, incluindo trilha, folley, diálogos e técnicas de mixagem', 'Introdução à animação e à estrutura do olhar no design em movimento', 'Aplicação da Gestalt em movimento, tipografia animada e princípios do motion graphic, com uso de ferramentas digitais, em produções de design audiovisuais experimentais', 'Reflexão crítica sobre acessibilidade e inclusão e suas possibilidades em projetos de design audiovisual']::text[]
where id = 917 and cardinality(topics) = 1 and md5(topics[1]) = '65a00cfe79a50e0a5e7d0590edebd71a'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 917);

update public.disciplines set topics = array['Aplicação prática em projetos editoriais, de games e animação, integrando personagens, cenários e interfaces gráficas', 'Criação e redesign de personagens: aspectos visuais, arquétipos, papéis narrativos e narrativa visual', 'Introdução a direção de arte: estratégias visuais, diversidade de representações étnico e raciais, codificação de objetivos e metas, pesquisa de referências e elaboração de bíblias ou art-books', 'Técnicas de ilustração aplicadas ao design de personagens e cenários', 'Design de cenários: construção, caracterização, tipos de cenários, ambientação e integração com narrativa', 'Composição visual: princípios de organização de elementos visuais considerando equilíbrio, cores, tipografia aplicada, luz e sombra aplicadas a personagens e cenários', 'Fundamentos do desenho para design de personagens e cenários: observação, figura humana, perspectiva e ambiente', 'Anatomia, indumentária, acessórios e caracterização da figura humana']::text[]
where id = 918 and cardinality(topics) = 1 and md5(topics[1]) = '0edb5de6f1c076dbedd188bf5f63acdd'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 918);

update public.disciplines set topics = array['Aplicação de técnicas de captação de som direto e uso de diferentes tipos de microfones', 'Exploração das tecnologias avançadas de mixagem multicanal (5.1, 7.1, Dolby Atmos, DTS, Virtual:X) e das práticas de criação de foley, efeitos e ambientação sonora', 'Introdução às técnicas básicas de edição, montagem e mixagem sonora', 'Investigação do papel do som na narrativa audiovisual, considerando a decupagem, a trilha sonora e a articulação entre imagem e som', 'Estudo dos fundamentos da linguagem e da semiótica sonora, compreendendo a construção de sentidos e a dramaturgia por meio do som', 'Análise da evolução histórica dos sistemas de gravação, reprodução e sincronismo de áudio', 'Estudo da estrutura e das funções da equipe de som e da construção das camadas sonoras de um projeto', 'Abordagem histórica, técnica e estética do desenho de som (sound design) e das paisagens sonoras (soundscapes)']::text[]
where id = 919 and cardinality(topics) = 1 and md5(topics[1]) = '435cad4bc793fcc03cd99ede50e7bc45'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 919);

update public.disciplines set topics = array['Biogeografia', 'Direitos Humanos', 'Formação do Planeta', 'Terra como patrimônio comum: geodiversidade, memória e acesso à ciência', 'Modificação da Paisagem dos planetas', 'Processos Transformadores do Planeta', 'Processos de Formação de Fósseis', 'Formação de Rochas e Minerais']::text[]
where id = 920 and cardinality(topics) = 1 and md5(topics[1]) = '5d1c63e77d70b2b4649a7cd9964fafa4'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 920);

update public.disciplines set topics = array['Análise e construção de cenários internacionais: métodos e técnicas para projeção estratégica e avaliação de riscos globais', 'Modelos de decisão em política externa: política burocrática, jogos de dois níveis, processo decisório e implementação', 'Metodologias em Relações Internacionais aplicadas à APE e cooperação', 'Atores internos e Grupos de Interesse: Participação de coalizões domésticas, lobby e ação coletiva em decisões internacionais', 'Cooperação Internacional para o desenvolvimento, negociação internacional e simulação diplomática: atores, modalidades, mensuração, estratégias da cooperação Sul-Sul e Norte-Sul, dinâmicas de representação e posicionamento estratégico de grupos de interesse', 'Direitos Humanos em projetos de cooperação internacional: inserção de raça, gênero e diversidade em políticas externas e projetos multilaterais', 'Fundamentos da Análise de Política Externa (APE): abordagens teóricas estruturais, racionais e cognitivas sobre a formulação da política externa', 'Gestão de projetos com impacto internacional: planejamento, execução e avaliação de projetos sociais em contextos globais']::text[]
where id = 921 and cardinality(topics) = 1 and md5(topics[1]) = '22a0981d5ab0656a32652780ff8c9114'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 921);

update public.disciplines set topics = array['7- Direitos Transversais e Proteção Integral nas Relações de Trabalho Contemporâneas: Novas formas de trabalho e impacto tecnológico', 'Responsabilidade social corporativa', 'Educação Relações Étnico-raciais e Histórias e Culturas afrobrasileiras, africana e indígenas', 'Meio Ambiente do Trabalho, Sistema de Cotas', 'Educação em Políticas de Gênero', 'Efeitos conexos do contrato de trabalho']::text[]
where id = 922 and cardinality(topics) = 1 and md5(topics[1]) = '63e0b21a96fcf83fa533542317c95782'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 922);

update public.disciplines set topics = array['Teoria das obrigações: Conceito e classificação', 'Execução, inexecução e consequências', 'Responsabilidade Civil: noções fundamentais, culpa, nexo de causalidade, dano, responsabilidade objetiva e excludentes', 'Responsabilidade civil contratual e regimes especiais', 'Teoria Geral dos Contratos: conceito, evolução histórica, função social, requisitos de validade e princípios', 'Formação, classificação, efeitos e extinção dos contratos']::text[]
where id = 923 and cardinality(topics) = 1 and md5(topics[1]) = 'bc8ec058297eb96703eec9fa42b3531d'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 923);

update public.disciplines set topics = array['Fundamentos, princípios e estrutura normativa do Direito Internacional Público', 'Tratados internacionais como instrumentos jurídicos de cooperação entre sujeitos de direito internacional', 'Sujeitos reconhecidos pelo Direito Internacional e sua capacidade jurídica nas relações internacionais', 'Organizações internacionais como entes jurídicos autônomos e mecanismos de governança global', 'Proteção internacional dos direitos humanos e regime jurídico da migração, refúgio e asilo', 'Direito Internacional Privado como regulador das relações jurídicas com elementos estrangeiros', 'Critérios e limites para a aplicação do direito estrangeiro no ordenamento jurídico nacional', 'Integração regional, direito comunitário e mecanismos de solução pacífica de controvérsias internacionais']::text[]
where id = 924 and cardinality(topics) = 1 and md5(topics[1]) = '6e62779d5eea7b0cb7e1eeda8865a17d'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 924);

update public.disciplines set topics = array['Crimes contra a Pessoa (CP) e a Lei de Tortura (Lei 9.455/97)', 'Crimes contra o Patrimônio (CP) e a Lei de Lavagem de Dinheiro (Lei 9.613/98)', 'Crimes contra a Administração Pública (CP)', 'Crimes contra a Dignidade Sexual (CP) e o Estatuto da Criança e do Adolescente (ECA - Lei 8.069/90)', 'Crimes de falsidade e Lei de Drogas (Lei 11.343/06)', 'Crimes Contra a Ordem Econômica e Financeira: Lei de Crimes Hediondos (Lei 8.072/90) e Lei de Organizações Criminosas (Lei 12.850/13)', 'Crimes Ambientais (Lei 9.605/98)', 'Crimes de Trânsito (Lei 9.503/97 - CTB) e sua Intersecção com o Código Penal']::text[]
where id = 925 and cardinality(topics) = 1 and md5(topics[1]) = 'e4e0b37d0199c8f5e7e90141d8599d4a'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 925);

update public.disciplines set topics = array['Introdução ao direito penal: características, missão e princípios', 'Teoria e aplicação da norma penal', 'Teoria do crime: noções introdutórias, conduta humana, tipicidade, antijuridicidade e culpabilidade', 'Teorias da pena e punibilidade: fundamentos discursivos, sanções penais em espécie e sua respectiva aplicação. causas extintivas de punibilidade']::text[]
where id = 926 and cardinality(topics) = 1 and md5(topics[1]) = '5123c367e5def37aadcd435103a5dec6'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 926);

update public.disciplines set topics = array['Teoria dos Conflitos', 'Métodos autocompositivos de resolução de conflitos', 'Métodos heterocompositivos de resolução de conflitos', 'Teoria da ação', 'Teoria do processo', 'Teoria da jurisdição', 'Competência e sujeitos processuais', 'Atos processuais']::text[]
where id = 927 and cardinality(topics) = 1 and md5(topics[1]) = '815fbb8c43af70af85d9843026ccd693'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 927);

update public.disciplines set topics = array['Fundamentos e princípios dos recursos cíveis', 'Recursos em espécie no processo civil', 'Execução no processo civil', 'Defesa do executado e incidentes na execução', 'Procedimentos especiais de jurisdição contenciosa', 'Procedimentos especiais de jurisdição voluntária', 'Acesso à justiça e efetividade processual em contextos de vulnerabilidade', 'Estratégias processuais em conflito de execução e recursos']::text[]
where id = 928 and cardinality(topics) = 1 and md5(topics[1]) = '1adc2e7e919369abe99d4d5829ca52c5'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 928);

update public.disciplines set topics = array['Fundamentos e Fontes do Processo Penal', 'Princípios Constitucionais e Processuais Penais', 'Direitos Humanos e Processo Penal', 'Investigação Criminal e Ação Penal', 'Medidas Cautelares e Jurisdição', 'Procedimentos e Atos Processuais', 'Provas e Sentença Penal', 'Recursos e Ações Autônomas de Impugnação']::text[]
where id = 929 and cardinality(topics) = 1 and md5(topics[1]) = '4f7ac1e4bb02258dc26a3b33e9734105'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 929);

update public.disciplines set topics = array['Teoria geral do direito do fundamentos, princípios e fontes do processo do trabalho', 'Jurisdição trabalhista organização da justiça do trabalho e competência', 'Teoria da ação trabalhista (partes, sujeitos e formação do processo fase postulatória)', 'Audiência', 'Sistema recursal trabalhista', 'Execução trabalhista e procedimentos especiais', 'Temas transversais e acesso a solução de conflitos', 'Processo em cena: imersão na resolução de conflitos trabalhistas']::text[]
where id = 930 and cardinality(topics) = 1 and md5(topics[1]) = 'a968b45d4801200b0ea9f459a1812cf9'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 930);

update public.disciplines set topics = array['Direito Tributário, Conceito de tributo e espécies', 'Teoria Constitucional da Tributação', 'Teoria Geral da Norma Tributária – CTN', 'Crédito Tributário – CTN', 'Garantias e privilégios do crédito Tributário, administração tributária e o procedimento de cobrança', 'Teoria geral da sujeição Passiva Tributária', 'Impostos em espécie', 'Contribuições em Espécie']::text[]
where id = 931 and cardinality(topics) = 1 and md5(topics[1]) = 'cb339d2c53a3d684ad0228eb816ccd42'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 931);

update public.disciplines set topics = array['4- Flexibilização, Desregulamentação, Terceirização e novas formas de trabalho: Reforma Trabalhista', 'Flexibilização', 'Desregulamentação', 'Novas Formas de trabalho e impacto tecnológico', 'Teletrabalho', 'Trabalho Intermitente, contratos híbridos e flexibilização de jornada', 'Terceirização']::text[]
where id = 932 and cardinality(topics) = 1 and md5(topics[1]) = '087ae6812538345ec8a0003c128852d3'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 932);

update public.disciplines set topics = array['Teoria Geral do Direito do Trabalho: História e Evolução do Direito do Trabalho', 'Fontes', 'Princípios', 'Hermenêutica', 'Relação de Trabalho e Relações de Trabalho', 'Sujeitos da relação de emprego', 'Responsabilidade do Empregador']::text[]
where id = 933 and cardinality(topics) = 1 and md5(topics[1]) = 'fa2804a15a264ed97586e88c4f294d66'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 933);

update public.disciplines set topics = array['Direito Empresarial e Societário', 'Direito do Trabalho, Relações Trabalhistas e Previdenciárias', 'Direito Tributário e Direito Internacional aplicado aos negócios', 'Compliance: fundamentos', 'conformidades regulatórias e normativas', 'Sistema de Gestão em Compliance', 'Governança Corporativa e Processos Éticos Empresariais', 'Educação em Direitos Humanos e Práticas de ESG no contexto do Mundo dos Negócios', 'Pesquisa Aplicada em Governança e Compliance Organizacional']::text[]
where id = 934 and cardinality(topics) = 1 and md5(topics[1]) = 'dc24c55598fedacd1f60b862f006218b'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 934);

update public.disciplines set topics = array['Fundamentos do Direito das Coisas e Direitos Reais', 'Posse: Conceito, Classificações e Efeitos Jurídicos', 'Propriedade: Modalidades, Função Social e Limitações', 'Direitos de Vizinhança e Condomínio', 'Direitos Reais sobre Coisa Alheia', 'Garantias Reais: Penhor, Hipoteca, Anticrese e Propriedade Fiduciária', 'Constitucionalização do Direito Privado e Princípios Contratuais', 'Contratos em Espécie: Formação, Execução e Extinção']::text[]
where id = 935 and cardinality(topics) = 1 and md5(topics[1]) = '2a3539ad6a81f5a26bb7d9a74c345b1d'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 935);

update public.disciplines set topics = array['Direitos autorais e relações étnico-raciais, bem como metodologias criativas para o desenvolvimento de projetos autorais no campo do cinema e do audiovisual', 'Pesquisa e metodologia na criação audiovisual', 'Planejamento conceitual e criativo', 'Roteiro conceitual, registro de experimentações e plano de execução', 'Colaboração criativa, práticas de decupagem, ensaio, experimentação visual e elaboração de planos de filmagem', 'Relação entre direção e autoria, direção e equipe e direção e ética', 'Técnicas e processos de direção de atores e construção de personagem', 'Funções e atribuições da direção cinematográfica em suas dimensões estética, técnica e autoral', 'Análise de gêneros e estilos cinematográficos e suas relação com a direção', 'Estudo da mise-en-scène e da linguagem cinematográfica']::text[]
where id = 936 and cardinality(topics) = 1 and md5(topics[1]) = 'fa3fd2591ea87ee60f30ff42bb529f04'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 936);

update public.disciplines set topics = array['Análise das relações entre forma, sentido e tecnologia na produção de imagens fotográficas e audiovisuais', 'Recursos Técnicos da Produção da Imagem Estática e em Movimento', 'A fotografia cinematográfica como prática artística, industrial e política', 'Processos contemporâneos de criação de imagens em contextos digitais, híbridos e algorítmicos', 'Estudo da fotografia cinematográfica como linguagem estética, técnica e cultural', 'Leitura crítica e interpretação do mundo por meio das imagens', 'História e transformações dos dispositivos de captação da imagem estática e em movimento', 'Inserção profissional, ética e mercado de trabalho na fotografia e no audiovisual']::text[]
where id = 937 and cardinality(topics) = 1 and md5(topics[1]) = '3b3d3e684c1af793dfbb94a139442e86'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 937);

update public.disciplines set topics = array['Organização e funções da equipe de arte', 'legalidade e ética em Direção de Arte', 'Projetos práticos em Direção de Arte com ênfase em inclusão de repertórios de diferentes tradições visuais e diálogo intercultural', 'Integração da ambientação e caracterização de personagens (figurino, maquiagem e adereços)', 'Metodologias, processos e ferramentas na pré-produção: desenho de produção e cenografia', 'Sustentabilidade, Representação, diversidade racial e cultural na construção visual', 'A direção de arte no processo de realização audiovisual: criação de mundos por meio da materialidade e plástica no audiovisual', 'Estudo da mise-en-scène no cinema histórico e contemporâneo', 'Concepção estética e práticas da direção de arte', 'Relações entre sociedade, estética e espaço: abordagem das múltiplas estéticas, incluindo repertórios interculturais e artivismos', 'Metodologias, processos e ferramentas na produção e pós: contrarregragem, efeitos de set, colaboração em set e com pós/VFX']::text[]
where id = 938 and cardinality(topics) = 1 and md5(topics[1]) = '803b4bb0b54248174fdb1d886f2df42f'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 938);

update public.disciplines set topics = array['Processos Criativos', 'Direção de Fotografia, Estilo Visual', 'Narrativa Visual Textual', 'Linguagem, Composição e Teoria da Cor', 'Criação de campanhas multiplataforma', 'Ética e Legislação relacionada à Imagem', 'Introdução a Linguagem Fotográfica', 'Ferramentas Práticas de Criação']::text[]
where id = 939 and cardinality(topics) = 1 and md5(topics[1]) = '0125609817acd83e4dfff09b208fd0f9'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 939);

update public.disciplines set topics = array['Criação de documentários: ideação, projeto, produção e pós-produção para diversas mídias', 'Ética, mediação e relações de alteridade no campo documental', 'Fundamentos estéticos e narrativos do documentário', 'Formas contemporâneas e híbridas da não ficção', 'Planejamento e pesquisa para documentários: ideação, argumento e projeto', 'Documentário na história do cinema e na cultura audiovisual', 'Estratégias de registro: imagens, sujeitos-personagens e suas vozes', 'Tipologias e modos narrativos predominantes do documentário']::text[]
where id = 940 and cardinality(topics) = 1 and md5(topics[1]) = 'cd4fa6443484810ccc2d89adaa266b70'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 940);

update public.disciplines set topics = array['Equações simultâneas', 'Álgebra matricial em econometria', 'XXXXXXXXXXXXXXXXXX', 'Problemas de regressão', 'Técnicas adicionais de análise de regressão', 'Análise econométrica com variáveis macroeconômica', 'Análise de regressão simples e múltipla', 'Economia da Felicidade']::text[]
where id = 941 and cardinality(topics) = 1 and md5(topics[1]) = 'af30c91710b57b5419cbc1fdd601dd27'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 941);

update public.disciplines set topics = array['A economia brasileira do período colonial à origem da indústria', 'Estabilização, desequilíbrios macroeconômicos e as reformas', 'Desenvolvimento econômico e sustentabilidade ambiental', 'Análise de conjuntura econômica para tomada de decisão empresarial', 'Setor externo: o balanço de pagamento e a crise da dívida externa', 'As mudanças recentes na economia brasileira', 'Processo de Industrialização por substituição de importações', 'Abertura comercial, privatização e os planos de estabilização']::text[]
where id = 942 and cardinality(topics) = 1 and md5(topics[1]) = '43fddc404eccd420ebf15530490b6547'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 942);

update public.disciplines set topics = array['Teorias e estratégias de desenvolvimento: desenvolvimentismo, dependência, estruturalismo, neoliberalismo e alternativas contemporâneas', 'Economia política da sustentabilidade: transição energética, soberania alimentar, conflitos ambientais e financiamento climático', 'Sistema financeiro e monetário global: Bretton Woods, crises financeiras, câmbio, financeirização e moedas digitais', 'Sistema de Comércio Internacional e Blocos Econômicos: OMC, disputas comerciais, acordos regionais e fragmentação multilateral', 'Governança econômica global: instituições internacionais, multipolaridade, G20, BRICS e novas formas de cooperação', 'Pesquisa em crises e futuro da economia global: métodos de análise crítica e elaboração de estudos aplicados à economia global, abrangendo pandemias, protecionismo, nacionalismo econômico e debates sobre alternativas ao neoliberalismo', 'Teorias e história da Economia Política Internacional: escolas teóricas (liberal, realista, marxista, construtivista), autores clássicos e críticas pós/decoloniais', 'Fundamentos da Economia Internacional: conceitos clássicos do comércio, vantagens comparativas e estrutura do comércio global']::text[]
where id = 943 and cardinality(topics) = 1 and md5(topics[1]) = '63b90693e74f8b5b286153e809df1d90'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 943);

update public.disciplines set topics = array['Orçamento público, planejamento governamental e regras fiscais (PPA, LDO, LOA e LRF)', 'Fundamentos da Economia do Setor Público, Teoria do Estado e Direito Econômico', 'Evolução do pensamento econômico e desenvolvimento: estruturalismo, CEPAL e contexto brasileiro', 'Falhas de mercado: externalidades, bens públicos e regulação estatal', 'Teoria da tributação e sistema tributário brasileiro', 'As funções econômicas do setor público: alocativa, distributiva e estabilizadora', 'Finanças públicas e política fiscal: receitas, despesas, dívida pública e seus impactos socioeconômicos', 'Pesquisa científica aplicada à Economia do Setor Público com enfoque em Direitos Humanos, Sustentabilidade Ambiental e Relações Étnico- Raciais']::text[]
where id = 944 and cardinality(topics) = 1 and md5(topics[1]) = '70d10e6a055029cd4153798d56ffc561'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 944);

update public.disciplines set topics = array['Análise de falhas mecânicas em regime estático e dinâmico', 'Compreensão das teorias de falha por fadiga e da caracterização dos ciclos de tensão', 'Elementos de trasmissão, força e potência', 'Análise e dimensionamento de eixos ranhurados, perfilados e uniões por interferência', 'Projeto e dimensionamento de chavetas e ligações entre cubo e eixo', 'Seleção e aplicação de mancais, polias, correias e engrenagens na transmissão de movimento', 'Aplicação de princípios sustentáveis no dimensionamento de sistemas mecânicos com foco ambiental', 'Resolução de um problema real de falha em sistema de transmissão mecânica com base em critérios técnicos e sustentáveis']::text[]
where id = 945 and cardinality(topics) = 1 and md5(topics[1]) = '5a601f9c32735aa4303ebba4ce913f7f'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 945);

update public.disciplines set topics = array['Medições elétricas e análise de circuitos resistivos', 'Aplicação das Leis de Kirchhoff em circuitos diversos', 'Estudo dos circuitos em corrente alternada', 'Eletrostática: Força elétrica, Campo elétrico e Potencial elétrico', 'Magnetostática: Campo magnético, Força magnética, Torque magnético e Campos magnéticos produzidos por correntes', 'Indução eletromagnética: fundamentos e aplicações', 'Aplicações eletromagnéticas e responsabilidade ambiental', 'Integração conceitual em desafios energéticos']::text[]
where id = 946 and cardinality(topics) = 1 and md5(topics[1]) = 'a14a5d5ca8de0c57bc10467a879f0d47'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 946);

update public.disciplines set topics = array['Conceitos fundamentais de circuitos elétricos', 'Propriedades dos materiais semicondutores', 'Funcionamento e aplicações de diodos em fontes de alimentação CC', 'Transistores bipolares em corte, saturação e amplificação de pequenos sinais', 'Técnicas de polarização de transistores', 'Aplicações de amplificadores operacionais em circuitos lineares e não lineares', 'Componentes utilizados em eletrônica de potência como diodos, tiristores e transistores', 'Retificadores de potência controlados e não controlados com diferentes tipos de carga e configurações monofásicas e trifásicas']::text[]
where id = 947 and cardinality(topics) = 1 and md5(topics[1]) = '61b52413922036d811deac565a0b5b0b'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 947);

update public.disciplines set topics = array['Anatomia interna dos dentes e estruturas periapicais', 'Diagnóstico clínico e radiográfico em endodontia e planejamento do tratamento', 'Materiais, instrumentais e técnicas utilizadas em procedimentos endodônticos', 'Etapas do tratamento endodôntico: acesso, instrumentação, irrigação e obturação', 'Retratamento endodôntico e abordagem dos casos de insucesso', 'Manejo de traumatismos dentários e tratamento de dentes com ápice incompleto', 'Interpretação de imagens e diagnóstico diferencial em endodontia', 'Biossegurança e inovações tecnológicas aplicadas à prática endodôntica']::text[]
where id = 948 and cardinality(topics) = 1 and md5(topics[1]) = '3d5a4166c926e2932e4e4b82320d81df'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 948);

update public.disciplines set topics = array['Fundamentos de matemática financeira: juros simples, compostos e descontos aplicados a decisões econômicas', 'Critérios de análise de investimentos: payback, valor presente líquido e taxa interna de retorno', 'Tomada de decisão em risco e incerteza', 'Análise de balanços e demonstrações de resultados: indicadores de liquidez, rentabilidade e endividamento', 'Fundamentos de contabilidade de custos: classificação de custos, distinção entre custos e despesas', 'Métodos de custeio e análise de margem de contribuição: custeio por absorção, direto e baseado em atividades', 'Estruturas de mercado', 'Concorrência perfeita: curvas de oferta e demanda individuais e de mercado', 'Elasticidade', 'Ponto de equilibrio e situações de mercado', 'Monopólio', 'Custos e receitas totais, médias e marginais', 'Maximização do lucro', 'Estruturas econômicas e sociais: mercado, políticas públicas, meio ambiente e direitos humanos', 'Resolução de desafios econômicos: tomada de decisão em investimentos e sustentabilidade organizacional']::text[]
where id = 949 and cardinality(topics) = 1 and md5(topics[1]) = '0fbcab0416d3936d3e20d9c606c69c82'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 949);

update public.disciplines set topics = array['Comportamento organizacional', 'Gestão de pessoas', 'Gestão de competências', 'Mapeamento da visão e missão em metas e estratégias', 'Mapeamento de processos e técnicas para solução de problemas', 'A organização, práticas ESG e alinhamento com ODS', 'Mapeamento organizacional', 'Implementação de práticas ESG']::text[]
where id = 950 and cardinality(topics) = 1 and md5(topics[1]) = '1963e546b10d1a50ac2159f5079ae95e'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 950);

update public.disciplines set topics = array['Ergonomia: conceitos gerais', 'Áreas de atuação', 'Ergonomia fisica, cognitiva e organizacional', 'Ergonomia fisica: metodos ergonômicos e ergonomia cognitiva', 'Métodos ergonômicos', 'Projetos de posto de trabalho e tecnologia 4.0', 'Higiene ocupacional, agentes ambientais, avaliação ambiental e programas de prevenção', 'Segurança, prevenção de acidentes, análise de riscos, segurança em máquins e equipamentos', 'Normas regulamentadoras (NRs) e normas ISO', 'Aplicação da Norma ERG BR 1001 e competências profissionais do ergonomista', 'Interação entre cognição, organização do trabalho e bem-estar']::text[]
where id = 951 and cardinality(topics) = 1 and md5(topics[1]) = 'a880fc4b545ec6ae54385a37249de252'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 951);

update public.disciplines set topics = array['Natureza dos dados', 'Exploração inicial dos dados', 'Visualização dos dados', 'Probabilidade e variabilidade em processos', 'Inferência estatistica para processos', 'Análise de regressão linear e correlação', 'Controle Estatístico de Processos', 'Introdução a Análise Multivariada', 'Aspectos Transversais da Estatística – Estatística e Realidade', 'Estatística Aplicada à Resolução de Problemas Reais']::text[]
where id = 952 and cardinality(topics) = 1 and md5(topics[1]) = 'c0a6aa07246926faafbbc60559a172ae'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 952);

update public.disciplines set topics = array['Cultura Data-Driven e Inteligência em Dados', 'Plano de Estratégia Digital', 'Produção de Conteúdo e Estratégia Digital', 'Fundamentos da Estratégia Digital e Comportamento do Consumidor Online', 'Métricas, KPIs e Monitoramento em Mídias Digitais', 'Responsabilidade Estratégica e Gestão de Riscos no Digital', 'SEO, Tráfego Pago e Orgânico', 'Gestão de Social Media']::text[]
where id = 953 and cardinality(topics) = 1 and md5(topics[1]) = '5d11feda4e4bd8c741af9506e0e351d1'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 953);

update public.disciplines set topics = array['Listas lineares: simples, duplamente encadeadas e circulares.Pilhas e filas: conceitos e implementações', 'Árvores binárias e balanceadas (AVL, B, B+)', 'Tabelas de dispersão (hashing)', 'Representações e algoritmos em grafos', 'Métodos de ordenação e busca', 'Complexidade de algoritmos aplicada às estruturas', 'Aplicações práticas no desenvolvimento de sistemas']::text[]
where id = 954 and cardinality(topics) = 1 and md5(topics[1]) = 'f6fbc6685c5e9550ba3cb4ffa39ab96f'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 954);

update public.disciplines set topics = array['Educação Ambiental', 'Como o funcionamento vegetal sustenta serviços ecossistêmicos essenciais à vida humana?', 'Organização do Corpo Vegetal', 'Morfologia e Anatomia da Folha', 'Fisiologia do Crescimento e Desenvolvimento', 'Morfologia e Anatomia de Órgãos Reprodutivos', 'Fisiologia Vegetal: Processos Energéticos e Transporte', 'Morfologia e Anatomia da Raiz e do Caule']::text[]
where id = 955 and cardinality(topics) = 1 and md5(topics[1]) = '7428103c0bf4bed0a549fabcc616a97e'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 955);

update public.disciplines set topics = array['Inserção profissional em campos de atuação do bacharel em Ciências Biológicas', 'Análise crítica das práticas profissionais e dos contextos institucionais', 'Natureza e objetivos do Estágio Curricular Obrigatório', 'Ética, bioética, legislação profissional e responsabilidade socioambiental', 'Elaboração de relatórios técnicos e socialização das experiências de estágio', 'Planejamento, execução e acompanhamento das atividades de estágio', 'Integração entre teoria e prática profissional', 'Atuação interdisciplinar e trabalho em equipe multiprofissional']::text[]
where id = 956 and cardinality(topics) = 1 and md5(topics[1]) = '758c68f13f6a71da78348d30809c4e5d'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 956);

update public.disciplines set topics = array['Introdução às práticas clínicas supervisionadas em Fonoaudiologia', 'Observação de procedimentos clínicos, instrumentos e condutas profissionais', 'Vivência de situação-problema orientada para compreensão do processo terapêutico', 'Registro, organização e análise básica de informações clínicas', 'Desenvolvimento das competências iniciais de avaliação fonoaudiológica']::text[]
where id = 957 and cardinality(topics) = 1 and md5(topics[1]) = '9251bf54f6bff9bb4c9d26ef7c4aa0e3'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 957);

update public.disciplines set topics = array['Ética, responsabilidade profissional e trabalho em equipe no contexto do estágio', 'Atuação supervisionada em diferentes áreas da Fonoaudiologia', 'Identificação de achados clínicos e suas implicações funcionais', 'Organização e elaboração de registros e documentos clínicos', 'Aplicação de instrumentos e protocolos de triagem e avaliação', 'Prática supervisionada em avaliação fonoaudiológica básica', 'Desenvolvimento do raciocínio clínico inicial', 'Situação-problema envolvendo avaliação e definição de conduta inicial']::text[]
where id = 958 and cardinality(topics) = 1 and md5(topics[1]) = 'f46ee99617359ffb646f0a660efaddeb'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 958);

update public.disciplines set topics = array['Planejamento terapêutico individualizado baseado em evidências', 'Consolidação do raciocínio clínico intermediário', 'Interpretação de achados avaliativos e elaboração de hipóteses diagnósticas', 'Atuação supervisionada em diagnóstico e intervenção fonoaudiológica', 'Atuação interprofissional e comunicação clínica com pacientes, famílias e equipes', 'Situação- problema envolvendo manejo terapêutico e tomada de decisão clínica', 'Execução de intervenções fonoaudiológicas supervisionadas', 'Registro e monitoramento da evolução terapêutica']::text[]
where id = 959 and cardinality(topics) = 1 and md5(topics[1]) = 'f369b455ffb8627ae0531bffeab5fdc5'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 959);

update public.disciplines set topics = array['Situação-problema envolvendo gestão do cuidado e decisões terapêuticas complexas', 'Elaboração de documentos clínicos, pareceres e relatórios integrados', 'Planejamento, execução e monitoramento de intervenções avançadas', 'Gestão de casos clínicos complexos em Fonoaudiologia', 'Comunicação profissional com equipes, pacientes e familiares', 'Consolidação da autonomia profissional supervisionada', 'Tomada de decisão clínica fundamentada em evidências', 'Atuação clínica avançada supervisionada em diferentes contextos de atenção à saúde']::text[]
where id = 960 and cardinality(topics) = 1 and md5(topics[1]) = '83e45997dd22044ccbcff35f4857c6c9'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 960);

update public.disciplines set topics = array['Ética, Alteridade e Direitos Humanos', 'Empreendedorismo, Inovação e Gestão de Projetos', 'Liderança e relações de poder', 'Vivência prática em ambientes profissionais de comunicação', 'Gestão de Dados e Curadoria Crítica', 'Gestão, planejamento e execução de atividades jornalísticas']::text[]
where id = 961 and cardinality(topics) = 1 and md5(topics[1]) = '5bb6bb2ffa5e8387f6ed9aa906731deb'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 961);

update public.disciplines set topics = array['Orientação e supervisão do estagiário, com foco no suporte ao desenvolvimento de atividades profissionais com rigor técnico e aderência aos preceitos éticos da profissão', 'Exercício profissional em empresas públicas e/ou privadas, assessorias, movimentos sociais e instituições, além do terceiro setor', 'Aprimoramento técnico, cultural, científico e de relações humanas do profissional de Relações Públicas, com foco em sua empregabilidade e preparação profissional', 'Consolidação de competências, habilidades e atitudes diante dos desafios profissionais do campo da comunicação organizacional e das Relações Públicas', 'Papel estratégico do Relações Públicas para a evolução das organizações em sua estratégia, sua gestão e seus relacionamentos e processos']::text[]
where id = 962 and cardinality(topics) = 1 and md5(topics[1]) = '272dc13707af40fd11ffc05341c4cb37'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 962);

update public.disciplines set topics = array['Inserção supervisionada em campos de prática da Terapia Ocupacional', 'Atuação em prevenção, tratamento e reabilitação de disfunções em crianças, adultos e idosos', 'Avaliação do cliente em diferentes contextos de vida e saúde', 'Reavaliação contínua dos processos de intervenção e análise de resultados obtidos', 'Prescrição, planejamento e aplicação de métodos, técnicas e recursos terapêuticos ocupacionais', 'Desenvolvimento de postura ética, crítica e reflexiva nos cenários de prática', 'Vivência prática em instituições diversas articulando teoria e prática', 'Registro, documentação e comunicação profissional em Terapia Ocupacional']::text[]
where id = 963 and cardinality(topics) = 1 and md5(topics[1]) = '40dee859969bc5f8cb62ebcc9d52381f'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 963);

update public.disciplines set topics = array['Integração entre conhecimentos teóricos e práticos no campo profissional', 'Aplicação de competências técnicas e socioemocionais desenvolvidas no curso', 'Desenvolvimento de habilidades de relacionamento humano no exercício profissional', 'Consolidação da formação técnica-cultural por meio da experiência de estágio', 'Responsabilidade cidadã e análise crítica do contexto de atuação']::text[]
where id = 964 and cardinality(topics) = 1 and md5(topics[1]) = '0edcc2fc2e4094b98790ea0033bd98af'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 964);

update public.disciplines set topics = array['Inserção supervisionada em campos de prática da Terapia Ocupacional', 'Atuação em prevenção, tratamento e reabilitação de disfunções em crianças, adultos e idosos', 'Avaliação do cliente em diferentes contextos de vida e saúde', 'Reavaliação contínua dos processos de intervenção e análise de resultados obtidos', 'Prescrição, planejamento e aplicação de métodos, técnicas e recursos terapêuticos ocupacionais', 'Desenvolvimento de postura ética, crítica e reflexiva nos cenários de prática', 'Vivência prática em instituições diversas articulando teoria e prática', 'Registro, documentação e comunicação profissional em Terapia Ocupacional']::text[]
where id = 965 and cardinality(topics) = 1 and md5(topics[1]) = '40dee859969bc5f8cb62ebcc9d52381f'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 965);

update public.disciplines set topics = array['Prática crítico-analítica, global, humanista e ética na nutrição clínica', 'Avaliação e promoção da atenção dietoterápica individual considerando fisiopatologia, interação droga-nutriente e exames laboratoriais em unidades hospitalares e clínicas', 'Planejamento dietoterápico adequado considerando condições socioeconômicas e sustentabilidade, com aproveitamento integral dos alimentos', 'Diversidade e direitos humanos à alimentação']::text[]
where id = 966 and cardinality(topics) = 1 and md5(topics[1]) = 'c51102d7c479d6acb625f4f223b199ee'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 966);

update public.disciplines set topics = array['Prática profissional tutelada em unidades de alimentação e nutrição', 'Desenvolvimento de atividades técnicas e administrativas do setor', 'Planejamento administrativo, econômico e de cardápio', 'Segurança alimentar e nutricional', 'Gestão de pessoas nas unidades de alimentação e nutrição']::text[]
where id = 967 and cardinality(topics) = 1 and md5(topics[1]) = '858522183b1cb278c46d69ce2cd87508'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 967);

update public.disciplines set topics = array['Atividades assistenciais, administrativas, educativas e de investigação na nutrição coletiva', 'Competências e habilidades do nutricionista nas diversas modalidades de atuação', 'Conhecimento teórico-prático da área', 'Aspectos técnicos, econômicos e administrativos da saúde coletiva', 'Percepção crítico-analítica, visão global e humanista, conhecimentos técnico-científicos e éticos em Nutrição, considerando relações étnico-raciais e direitos humanos', 'Perfil populacional e políticas públicas na atenção básica', 'Pesquisa em nutrição e avaliação/diagnóstico nutricional', 'Planejamento e orientação alimentar e nutricional individual e coletiva']::text[]
where id = 968 and cardinality(topics) = 1 and md5(topics[1]) = '48389ffa11b38cc40d8500c842e67d2d'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 968);

update public.disciplines set topics = array['Atendimento clínico odontológico integral voltado para as diferentes fases do ciclo vital: infância, adolescência, vida adulta e terceira idade', 'Atendimento odontológico a gestantes e bebês', 'Cuidados específicos na saúde bucal do idoso', 'Manejo clínico e abordagem humanizada a grupos em situação de vulnerabilidade social, como pessoas em privação de liberdade, em situação de rua, indígenas e pessoas com deficiência', 'Promoção e prevenção da saúde bucal em diferentes fases da vida, considerando os agravos bucais mais comuns em cada grupo', 'Aplicação dos princípios da interprofissionalidade no cuidado odontológico, com atuação junto a equipes de saúde multidisciplinares', 'Organização do cuidado em redes de atenção à saúde e estratégias de referência e contrarreferência dentro do SUS']::text[]
where id = 969 and cardinality(topics) = 1 and md5(topics[1]) = '05ddf1c65d0d4559a948cbd5caf6efc3'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 969);

update public.disciplines set topics = array['Atuação clínica supervisionada com foco no desenvolvimento de habilidades básicas em procedimentos odontológicos', 'Ênfase no atendimento inicial ao paciente, incluindo anamnese, exame clínico, diagnóstico e planejamento terapêutico', 'Princípios de biossegurança, ergonomia e humanização no atendimento odontológico', 'Práticas em odontologia preventiva e restauradora, incluindo controle do biofilme, profilaxia, aplicação de flúor, selantes e restaurações diretas em dentes anteriores e posteriores', 'Isolamento do campo operatório e técnicas anestésicas básicas', 'Abordagem de pacientes de diferentes faixas etárias e condições sistêmicas dentro do nível de complexidade adequado à fase inicial da formação clínica', 'Desenvolvimento do raciocínio clínico e da conduta profissional ética no ambiente odontológico']::text[]
where id = 970 and cardinality(topics) = 1 and md5(topics[1]) = 'd58e71afc40f0196c4c6251168cb0e96'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 970);

update public.disciplines set topics = array['Atuação clínica supervisionada com ênfase no desenvolvimento de habilidades intermediárias em procedimentos odontológicos', 'Abordagem ampliada no atendimento ao paciente, incluindo anamnese detalhada, exame clínico e exames complementares para diagnóstico e planejamento terapêutico mais complexo', 'Aplicação de técnicas anestésicas avançadas e isolamentos do campo operatório', 'Abordagem restauradora com ênfase em procedimentos indiretos, ajustes oclusais e proteção do complexo dentino-pulpar', 'Introdução ao planejamento de casos clínicos reabilitadores envolvendo próteses parciais removíveis, prótese total e prótese fixa', 'Atendimento a pacientes com necessidades odontológicas mais complexas, considerando aspectos sistêmicos, estéticos e funcionais', 'Aplicação da odontologia baseada em evidências no processo de tomada de decisão clínica']::text[]
where id = 971 and cardinality(topics) = 1 and md5(topics[1]) = 'd9a2b17f393196086d5ab3cf43706e23'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 971);

update public.disciplines set topics = array['"Atendimento clínico-cirúrgico em estomatopatologia, com ênfase no diagnóstico diferencial das lesões bucais e na realização de procedimentos cirúrgicos ambulatoriais', 'Anamnese e exame clínico voltados às lesões de cavidade oral', 'Interpretação de exames complementares, incluindo exames laboratoriais e de imagem', 'Bópsias: indicação, técnicas e encaminhamento histopatológico', 'Diagnóstico e manejo das alterações potencialmente malignas e das neoplasias orais', 'Cirurgia oral menor: exodontias simples e complexas, frenectomias, bópsias excisionais e incisionais', 'Condutas frente a complicações pós-operatórias e emergências cirúrgicas', 'Biossegurança em procedimentos estomatológicos e cirúrgicos', 'Aspectos legais e éticos no diagnóstico e tratamento das patologias orais. "']::text[]
where id = 972 and cardinality(topics) = 1 and md5(topics[1]) = 'cc51efa1ee2b76f4588d5e7554175ecc'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 972);

update public.disciplines set topics = array['Vivência prática no Sistema Único de Saúde (SUS), abrangendo os três níveis de atenção: primária, secundária e terciária', 'Atuação na Atenção Básica, incluindo Unidades de Saúde da Família (USF) e Centros de Especialidades Odontológicas (CEO)', 'Atendimento clínico em serviços especializados de média complexidade, como centros de referência em odontologia, unidades de pronto atendimento (UPA) e ambulatórios hospitalares', 'Atuação na alta complexidade, em hospitais com atendimento odontológico hospitalar, cirurgias de alta complexidade e atendimento a pacientes com necessidades especiais', 'Compreensão das políticas públicas de saúde, do financiamento do SUS e da gestão dos serviços odontológicos', 'Trabalho interdisciplinar e multiprofissional no cuidado integral ao paciente', 'Aplicação dos princípios da vigilância em saúde e promoção da saúde bucal']::text[]
where id = 973 and cardinality(topics) = 1 and md5(topics[1]) = 'd5e7441e7528c114a0b9e6e4150b1818'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 973);

update public.disciplines set topics = array['Estudo crítico das manifestações artísticas desde a pré-história até a contemporaneidade, abrangendo os principais movimentos artísticos e teorias estéticas', 'Compreensão dos fundamentos e da configuração dos campos da estética e da semiótica e sua contribuição para o estudo da linguagem, do significado e do sentido nas artes', 'Movimentos cíclicos e interpretação das artes em suas transformações tecnológicas, culturais e sociais, considerando os períodos históricos e a diversidade dos contextos socioculturais', 'Estudos sobre as artes, arquitetura e design na Europa, Américas, África, Ásia e Oceania', 'Artes, arquitetura e design no contexto brasileiro: colonialismo, relações interculturais afro-brasileiras e influências da cultura ameríndia na produção cultural e artística brasileira', 'Interpretação dos fenômenos históricos e estéticos que fundamentam a compreensão das práticas artísticas e possibilitem a leitura de obras contemporâneas', 'Manifestações artísticas contemporâneas e relações estéticas e suas associações às pautas de direitos humanos e lutas por representação social', 'Desenvolvimento de repertório acerca da história das artes, arquitetura e design por meio da análise, interpretação e contextualização de manifestações artísticas em diferentes períodos e culturas']::text[]
where id = 974 and cardinality(topics) = 1 and md5(topics[1]) = '7292476a9b06f6d22e097acd3ce92a60'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 974);

update public.disciplines set topics = array['Tecnologias cotidianas como redes sociais, aplicativos, comércio eletrônico, mobilidade e automações', 'Panorama da computação e transformação digital na sociedade', 'Infraestrutura digital básica envolvendo nuvem, redes, conectividade e dispositivos', 'Funcionamento de empresas digitais e seus sistemas de informação, como ERP, CRM e fluxo de dados', 'Noções iniciais de inteligência artificial e automação', 'Prática com ferramentas no-code e inteligência artificial generativa para criação e experimentação', 'Ecossistemas de inovação e empreendedorismo digital', 'Ética, segurança da informação e cidadania digital']::text[]
where id = 975 and cardinality(topics) = 1 and md5(topics[1]) = '5716f8c5e1d7e7a05c5e53a0e0aac1e6'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 975);

update public.disciplines set topics = array['Fundamentos e conceitos de Direito Digital', 'Inteligência Artificial e o ecossistema tecnológico', 'Marcos legais nacionais e internacionais sobre tecnologia e IA', 'Proteção de dados pessoais e Lei Geral de Proteção de Dados (LGPD)', 'Responsabilidade civil, penal e ética em ambientes digitais', 'Inovação jurídica, regulação inteligente e LawTechs']::text[]
where id = 976 and cardinality(topics) = 1 and md5(topics[1]) = '1d0892709e5362eafc1a2e9243a5b065'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 976);

update public.disciplines set topics = array['Fundamentos constitucionais do Direito Econômico e Financeiro', 'Intervenção do Estado na economia', 'Sistema financeiro nacional e orçamento público', 'Princípios da ordem econômica e financeira', 'Tributos e justiça fiscal', 'Direitos fundamentais, relações étnico-raciais e educação ambiental no contexto econômico', 'Responsabilidade fiscal, controle social e políticas públicas', 'Desenvolvimento sustentável e inclusão econômica']::text[]
where id = 977 and cardinality(topics) = 1 and md5(topics[1]) = '89b85831e6c6dc65f4dd2d189b7b3d9b'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 977);

update public.disciplines set topics = array['Princípios constitucionais da seguridade social', 'Estrutura e financiamento da previdência social', 'Regimes previdenciários: RGPS, RPPS e regimes complementares', 'Benefícios e serviços previdenciários', 'Reforma da previdência e seus impactos sociais', 'Judicialização do Direito Previdenciário', 'Educação previdenciária e cidadania', 'Projetos extensionistas voltados à inclusão e proteção social']::text[]
where id = 978 and cardinality(topics) = 1 and md5(topics[1]) = '84c44b7e75c52ba9480ed3ff0de0a950'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 978);

update public.disciplines set topics = array['Fundamentos e princípios do Direito do Consumidor', 'Código de Defesa do Consumidor (CDC) e sua aplicação prática', 'Relações de consumo na era digital: comércio eletrônico, marketplaces e proteção de dados', 'Práticas abusivas e publicidade enganosa', 'Mecanismos de resolução de conflitos: Procon, mediação, conciliação e judicialização', 'Educação para o consumo e cidadania', 'Inovação jurídica e proteção do consumidor em ambientes digitais']::text[]
where id = 979 and cardinality(topics) = 1 and md5(topics[1]) = '908a31026ecb8d4229b4a6b91ecb269b'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 979);

update public.disciplines set topics = array['Fundamentos históricos, filosóficos e constitucionais dos direitos humanos', 'Marcos normativos nacionais e internacionais', 'Multiculturalismo, diversidade cultural e identidade', 'Universalismo e relativismo cultural', 'Cidadania diferenciada, ações afirmativas e políticas públicas', 'Interseccionalidade e justiça social', 'Educação em direitos humanos e práticas de extensão crítica', 'Projetos colaborativos e intervenções com base na escuta ativa, diagnóstico social e transformação comunitária']::text[]
where id = 980 and cardinality(topics) = 1 and md5(topics[1]) = 'c64d66f4d168878a58e267c10a968346'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 980);

update public.disciplines set topics = array['Processos de fundição e conformação mecânica: características, aplicações e limitações', 'Usinagem convencional e não convencional: princípios, parâmetros e materiais aplicáveis', 'Processos de soldagem e manufatura aditiva: integração produtiva e avanços tecnológicos', 'Técnicas de conformação e moldagem de materiais cerâmicos e poliméricos', 'Manutenção industrial', 'Estatistica de confiabilidade, disponibilidade e manutenibilidade', 'Processos de fabricação e impacto ambiental', 'Aplicação de processos no desenvolvimento de produto']::text[]
where id = 981 and cardinality(topics) = 1 and md5(topics[1]) = '21a4b113d9e96f7f813c2aade2482230'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 981);

update public.disciplines set topics = array['Cinética do crescimento celular', 'Biorreatores', 'Esterilização', 'Noções de microbiologia', 'Tecnologia de alimentos processamento conservação, aditivos e análise sensorial', 'Gestão integrada de resíduos orgânicos e reaproveitamento de materiais para produção de biomateriais, utilizando digestão de resíduos sólidos e promovendo a economia circular', 'Estrutura geral e função de proteínas carboidratos lipídios e ácidos nucléicos', 'Estequiometria da atividade celular', 'Enzimas cinética e regulação']::text[]
where id = 982 and cardinality(topics) = 1 and md5(topics[1]) = '7d6a04e3edf448a0470032579d9d3eb5'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 982);

update public.disciplines set topics = array['Camada limite térmica', 'Fundamentos de transferência de calor por condução, convecção e radiação', 'Mecanismos de transferência de calor por condução em regime transiente', 'Transferência de calor por condução, convecção e radiação térmica em equipamentos e instalações industriais', 'Convecção forçada', 'Dimensionamento de equipamentos térmicas típicos em unidades industriais', 'Análise da influência dos grupos adimensionais', 'Mecanismos de transferência de calor por condução em regime permanente']::text[]
where id = 983 and cardinality(topics) = 1 and md5(topics[1]) = 'c6e65b2eecd932aac74d6c5d7b3cbb9d'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 983);

update public.disciplines set topics = array['Fundamentos do Sistema Financeiro Nacional e Produtos Financeiros', 'Mercado de Capitais e Governança Corporativa', 'Análise Técnica e Estratégias de Trading', 'Análise Fundamentalista e Avaliação de Ativos', 'Plataformas de Trading e Simulações Práticas', 'Produtos Bancários e Inovações em Banking Digital', 'Carreira e Certificações Profissionais no Setor Financeiro', 'Estratégias de Investimentos e Decisões de Portfólio']::text[]
where id = 984 and cardinality(topics) = 1 and md5(topics[1]) = '2a37c13536480b5ee151dcc44177f350'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 984);

update public.disciplines set topics = array['Disfagia orofaríngea: conceitos, etiologias, sinais clínicos e implicações funcionais', 'Principais alterações de comunicação no ambiente hospitalar e estratégias de comunicação clínica', 'Fundamentos da atuação fonoaudiológica no contexto hospitalar e materno-infantil', 'Distúrbios oromiofuncionais associados a condições clínicas e cirúrgicas e suas repercussões no cuidado hospitalar', 'Avaliação oromiofuncional em diferentes níveis de complexidade clínica e perfis de pacientes hospitalizados', 'Biossegurança, primeiros socorros e práticas seguras no ambiente hospitalar', 'Manejo terapêutico fonoaudiológico no hospital e situação-problema integradora envolvendo análise de caso e decisão terapêutica inicial', 'Organização do cuidado interdisciplinar, fluxos de atendimento e protocolos assistenciais']::text[]
where id = 985 and cardinality(topics) = 1 and md5(topics[1]) = 'd6c29dcd75af38fb7d31c3f4f53ca153'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 985);

update public.disciplines set topics = array['Contenção, erradicação e recuperação pós-incidente', 'Análise forense em sistemas de arquivos, discos e dispositivos móveis', 'Fundamentos técnicos, jurídicos e metodológicos da forense digital', 'Forense de redes, análise de tráfego e rastreamento de invasões', 'Estruturação do processo de resposta a incidentes (CSIRT e Frameworks)', 'Perícia volátil: aquisição e análise de memória RAM (Live Forensics)', 'Cadeia de custódia e técnicas de isolamento e espelhamento', 'Elaboração de relatórios técnicos, post-mortem e laudos periciais legais']::text[]
where id = 986 and cardinality(topics) = 1 and md5(topics[1]) = '369eb3f2baa39a524960d7c87889b711'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 986);

update public.disciplines set topics = array['Aspectos transversais de cognição, tecnologia, comunicação e cultura aplicados à análise da motricidade orofacial', 'Anatomia funcional e biomecânica das estruturas orofaciais', 'Processos fisiológicos envolvidos nas funções de respiração, mastigação, deglutição, fala e sucção', 'Situação-problema integradora envolvendo diagnóstico funcional inicial e proposição de intervenção miofuncional', 'Fundamentos da motricidade orofacial e sua relação com o sistema estomatognático', 'Fisiopatologias relacionadas às disfunções miofuncionais orofaciais', 'Implicações clínicas das alterações funcionais no desenvolvimento e na comunicação', 'Avaliação funcional das estruturas e funções orofaciais']::text[]
where id = 987 and cardinality(topics) = 1 and md5(topics[1]) = '84265bf249bf2f0a27debeae43b2021d'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 987);

update public.disciplines set topics = array['Situação-problema integradora envolvendo identificação de alterações vocais e proposição de intervenção inicial', 'Implicações funcionais dos distúrbios da voz no desempenho comunicativo e ocupacional', 'Avaliação funcional da voz e identificação de parâmetros vocais', 'Aspectos transversais envolvendo cognição, tecnologia, comunicação, cultura e habilidades colaborativas aplicadas à análise vocal', 'Anatomia funcional e biomecânica das estruturas envolvidas na voz', 'Fisiopatologias laríngeas e distúrbios vocais', 'Fisiologia da fonação e mecanismos de ajuste vocal', 'Fundamentos da produção vocal e sua relação com o sistema fonatório']::text[]
where id = 988 and cardinality(topics) = 1 and md5(topics[1]) = '7e0df6f278df04546354de05613dbb42'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 988);

update public.disciplines set topics = array['Estrutura e funcionamento dos sistemas respiratório, fonatório e estomatognático', 'Situação-problema integradora envolvendo análise, diagnóstico inicial e proposta de intervenção fonoaudiológica com base em fundamentos anatomofuncionais', 'Integração anatomofuncional dos sistemas envolvidos na comunicação humana', 'Neuroanatomia funcional relacionada às funções comunicativas', 'Aspectos transversais que envolvem habilidades cognitivas, comunicacionais, tecnológicas e socioculturais aplicadas à compreensão anatomofuncional', 'Conceitos básicos de anatomia e fisiologia humana aplicados à Fonoaudiologia', 'Anatomia e fisiologia dos órgãos da fala, da fonação, da mastigação e deglutição', 'Sistema auditivo: anatomia, fisiologia e processos de audição']::text[]
where id = 989 and cardinality(topics) = 1 and md5(topics[1]) = '43dda38faabafea18f49372e9d7fa286'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 989);

update public.disciplines set topics = array['Fatores ecológicos e estrutura dos ecossistemas', 'Educação Ambiental', 'Fundamentos e princípios da Ecologia', 'Ecossistemas e funcionamento ecológico', 'Ecossistemas, impacto humano e educação ambiental na conservação', 'Dinâmica ecológica de populações, comunidades e interações biológicas', 'Ciclos biogeoquímicos e fluxo de energia nos sistemas naturais', 'Educação formal e Gestão Educacional']::text[]
where id = 990 and cardinality(topics) = 1 and md5(topics[1]) = 'a71f48e5debcf8fc3b20f7fa378be64f'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 990);

update public.disciplines set topics = array['Conceitos de metrologia, grandezas físicas e sistemas de unidades', 'Erros de medição e análise de incertezas', 'Instrumentos de medição', 'Leis fundamentais do movimento e suas aplicações práticas', 'Representações gráficas e funções horárias no estudo de movimentos', 'Estudo da composição e decomposição de forças em diferentes contextos', 'Análise da energia mecânica e suas transformações', 'Propriedades e equilíbrio de corpos rígidos', 'Integração entre ciência, tecnologia e sustentabilidade', 'Aplicação dos conceitos mecânicos na resolução de problemas reais']::text[]
where id = 991 and cardinality(topics) = 1 and md5(topics[1]) = '42a3c6765d0001f37d17e9bfcf9ef84b'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 991);

update public.disciplines set topics = array['Fundamentos de qualidade de software e ciclo de vida de testes', 'Técnicas e estratégias de teste: caixa branca, caixa preta, testes de regressão.Desenvolvimento orientado a testes (TDD): princípios e prática', 'Especificação de testes unitários, de integração e de aceitação', 'Frameworks e ferramentas para automação de testes (JUnit, pytest, etc.)', 'Métricas de qualidade e cobertura de testes', 'Gestão de defeitos, versionamento e integração contínua (CI)', 'Processos e modelos de qualidade (ISO, MPS.BR, CMMI)']::text[]
where id = 992 and cardinality(topics) = 1 and md5(topics[1]) = '2a93a242c43ab06d9694e07b57d05fbc'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 992);

update public.disciplines set topics = array['Migrações, identidades e poder global: diásporas, fronteiras móveis, diversidade cultural e novas formas de poder transnacional, articuladas a pesquisas em Geopolítica contemporânea, incluindo abordagens metodológicas, uso de fontes estratégicas e análise crítica', 'Fundamentos e evolução da Geopolítica: origens clássicas, pensadores-chave e transição para abordagens críticas', 'Geopolítica clássica e conflitos globais: grandes guerras, Guerra Fria, teorias do Heartland, Rimland e ordens internacionais', 'Geopolítica digital e tecnologia: soberania digital, colonialismo de dados, inteligência artificial, ciberativismo e vigilância', 'Geopolítica brasileira e integração regional: pensamento estratégico nacional e o papel do Brasil na América do Sul', 'Geopolítica e Direitos Humanos: conflitos geopolíticos, deslocamentos forçados e violação de direitos fundamentais', 'Geopolítica do Sul global e ascensão de potências emergentes: Brasil, China, Índia e os desafios à ordem tradicional', 'Geopolítica crítica e Pós-Colonial: narrativas contra-hegemónicas, geopolítica feminista, decolonial e epistemologias do Sul']::text[]
where id = 993 and cardinality(topics) = 1 and md5(topics[1]) = 'fef55a90b217230f97d57f86c2c7851f'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 993);

update public.disciplines set topics = array['Visão geral do sistema elétrico: geração, transmissão e distribuição, história e estrutura do setor', 'Organização e regulação do Setor Elétrico Brasileiro: concessões, permissões, condições gerais de fornecimento e legislação ANEEL', 'Mercado de energia elétrica: funcionamento, regras, compra e venda, análise tarifária e modelos de comercialização', 'Fontes de geração: hidrelétricas, termoelétricas, eólicas, fotovoltaicas, biomassa, geração distribuída e cogeração, impactos e educação ambiental', 'Aspectos tecnológicos do SEP: redes inteligentes, curvas de carga, tipos de cargas e previsão de demanda', 'Qualidade de energia e eficiência energética: normas, interrupções, variações de tensão, sobretensões, harmônicos, medições e monitoramento', 'Operação, confiabilidade e manutenção: indicadores de continuidade, regulação de tensão, subestações, linhas de transmissão e tópicos de manutenção', 'Planejamento e expansão de T&D: critérios de planejamento, aspectos construtivos, projetos de redes e linhas e princípios de HVDC']::text[]
where id = 994 and cardinality(topics) = 1 and md5(topics[1]) = '4fefad32356cb53a8d74bf7ce08933fc'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 994);

update public.disciplines set topics = array['Experiência do Cliente', 'CRM, Automação e Métricas de Desempenho', 'Gestão Estratégica de Preços', 'Gestão do Processo de Venda: prospecção e funil', 'Gestão do Processo de Venda: fechamento e pós-venda', 'Fundamentos e Estratégias de Vendas', 'Plano de Vendas Integrado', 'Tendências Emergentes em Vendas Estratégicas']::text[]
where id = 995 and cardinality(topics) = 1 and md5(topics[1]) = '362c1f018198a273f3a762abe84b2603'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 995);

update public.disciplines set topics = array['Matemática Financeira Aplicada à Gestão', 'Análise de Investimentos e Viabilidade Econômica', 'Estrutura de Capital e Custo de Capital', 'Fontes de Financiamento e Avaliação de Empresas', 'Gestão e Automação de Fluxo Financeiro Empresarial (Pagar, Receber e Tesouraria)', 'Gestão de Riscos e Estratégias de Portfólio', 'Educação Financeira como Ferramenta de Cidadania e Sustentabilidade Econômica', 'Diagnóstico e Solução Estratégica em Finanças']::text[]
where id = 996 and cardinality(topics) = 1 and md5(topics[1]) = 'ea912b62d5dc5005a4a2272519468246'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 996);

update public.disciplines set topics = array['Fundamentos e evolução da qualidade: conceitos, aplicações e importância para a competitividade', 'Custos da qualidade e análise de desempenho em sistemas produtivos', 'Métodos de melhoria contínua e gestão da performance organizacional', 'Sistemas de gestão integrada e sua relação com eficiência e sustentabilidade', 'Normas e certificações em gestão da qualidade', 'Gestão ambiental e impactos das atividades produtivas', 'Políticas e práticas para desenvolvimento sustentável e responsabilidade organizacional', 'Instrumentos legais e técnicos para avaliação e licenciamento ambiental']::text[]
where id = 997 and cardinality(topics) = 1 and md5(topics[1]) = 'fadbab75bb11845d0956afe81f6cd85c'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 997);

update public.disciplines set topics = array['Plano de gerenciamento de crises', 'Competências socioemocionais para atuação sob pressão', 'Ciclo de crises, riscos e vulnerabilidades', 'Mapeamento e segmentação de Stakeholders', 'Desenvolvimento e simulação de um Plano de Gerenciamento de Crises', 'Ética, governança e posicionamento em crises', 'Fundamentos da crise e a reputação organizacional', 'Táticas de comunicação e resposta no momento de crise']::text[]
where id = 998 and cardinality(topics) = 1 and md5(topics[1]) = '2bab5db1afff97e16c59d35571635f63'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 998);

update public.disciplines set topics = array['Fundamentos Estratégicos de Marketing', 'Comportamento do Consumidor e Segmentação', 'Gestão de Produtos e Serviços', 'Gestão de Preço e Distribuição', 'Gestão da Comunicação Integrada', 'Branding e Marketing Digital', 'Marketing com Propósito: Ética, Inclusão e Impacto Social nas Estratégias Contemporâneas', 'Plano de Marketing na Prática']::text[]
where id = 999 and cardinality(topics) = 1 and md5(topics[1]) = '88f6611e3c050005a025443635d5c090'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 999);

update public.disciplines set topics = array['Estudo do exercício profissional do produtor e da história da produção audiovisual no Brasil e no mundo, abrangendo aspectos de profissionalização, regulamentação e ética da atuação', 'Investigação da economia criativa, das indústrias criativas e das práticas de inovação e pitch no setor', 'Desenvolvimento de modelos de negócio e de planejamento estratégico aplicados ao audiovisual', 'Análise de mercado e planejamento de distribuição, com foco em custo-efetividade e posicionamento competitivo de obras audiovisuais', 'Sustentabilidade no setor de audiovisual', 'Abordagem dos princípios e práticas de administração e gestão de projetos audiovisuais, com ênfase em empreendedorismo, inovação, financiamento e autogestão', 'Análise da estrutura e da dinâmica do mercado audiovisual contemporâneo, considerando remuneração, flexibilização profissional e tendências setoriais', 'Aplicação de técnicas de produção executiva, criação e formatação de projetos, análise de editais e gestão integrada de recursos humanos, técnicos, artísticos, financeiros e materiais para a realização de produtos audiovisuais', 'Estudo das oportunidades e desafios em ambientes digitais e de rede, incluindo políticas de incentivo e fomento público e privado']::text[]
where id = 1000 and cardinality(topics) = 1 and md5(topics[1]) = '1f8fb843f2c9111d47f289f11af0c0e5'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1000);

update public.disciplines set topics = array['Fundamentos de gestão de projetos e liderança', 'Estrutura e aplicação do PMBOK em ambientes organizacionais', 'Técnicas de organização, escopo e controle de projetos', 'Gestão de tempo e recursos em projetos', 'Planejamento de manutenção', 'Fundamentos da engenharia de manutenção', 'Confiabilidade e indicadores de desempenho', 'Aplicação prática de métodos integrados na resolução de desafios técnicos']::text[]
where id = 1001 and cardinality(topics) = 1 and md5(topics[1]) = '1d792997b5ec91d5e213d58f9909beae'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1001);

update public.disciplines set topics = array['Fundamentos da logística e o papel estratégico da supply chain nas organizações modernas', 'Estruturação de redes logísticas e os fluxos entre os diferentes elos da cadeia', 'Gestão de estoques: classificação, previsões, métodos e indicadores de desempenho', 'Sistemas e operações logísticas internas: armazenagem, unitização e endereçamento', 'Integração produção- logística e estratégias JIT com foco na eficiência operacional', 'Soluções tecnológicas aplicadas à gestão da cadeia de suprimentos', 'Sustentabilidade e tecnologia na cadeia de suprimentos', 'Análise e resolução de problemas logísticos complexos em cadeias de suprimento']::text[]
where id = 1002 and cardinality(topics) = 1 and md5(topics[1]) = 'bfa69affc40c3c19fbc21e8a2af8d3e8'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1002);

update public.disciplines set topics = array['Introdução à gestão em engenharia de software', 'Estratégia e governança em engenharia de software', 'Conceitos de gerenciamento de serviços e gestão ágil', 'Sistemas de informações gerenciais e transformação digital', 'Visão organizacional e metodologias de implantação e integração de sistemas', 'Conceitos de processos logísticos, produção e operações', 'Automação de processos e impacto na eficiência organizacional', 'Legislação e ética aplicadas à Tecnologia da Informação e Computação']::text[]
where id = 1003 and cardinality(topics) = 1 and md5(topics[1]) = '076a39c8c6b1c38432b2a7598ae3ea49'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1003);

update public.disciplines set topics = array['Políticas, Normas e Controles de Segurança da Informação', 'Conformidade, Compliance', 'LGPD e Protenção de Dados', 'Fundamentos de Governança Corporativa, Governança de TI e Governança de Dados', 'Auditoria, Métricas e Indicadores de Segurança', 'Gestão de Riscos em Segurança da Informação e em Ativos de Dados', 'Ética, Responsabilidade Profissional e Tomada de Decisão em Segurança da Informação', 'Governança da Segurança da Informação e dos Dados', 'Gestão de Incidentes e Continuidade de Negócios']::text[]
where id = 1004 and cardinality(topics) = 1 and md5(topics[1]) = '229efda364e62d55287e2d55bc6f928c'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1004);

update public.disciplines set topics = array['Fundamentos e história da narrativa e da imagem: narrar no jornalismo, marcos do jornalismo literário e função social do fotojornalismo', 'Formatos e gêneros em profundidade: livro-reportagem, dossiês, séries, jornalismo em quadrinhos e ensaios fotográficos', 'A grande reportagem multimídia: planejamento, convergência de mídias e de linguagens, arquitetura da informação e experiência do usuário (UX)', 'Ética e alteridade: relacionamento, responsabilidade e cuidados com as fontes', 'desinformação, veracidade e outros desafios contemporâneos no jornalismo', 'O projeto de uma grande reportagem multimídia', 'Investigação e técnicas jornalísticas: pesquisa, apuração, redação, edição e checagem', 'estratégias narrativas e autoria na grande reportagem multimídia', 'Linguagem e técnicas visuais: composição, iluminação, equipamentos e gêneros do fotojornalismo', 'Grande reportagem e Direitos Humanos, Educação Ambiental, Relações Étnico-Raciais']::text[]
where id = 1005 and cardinality(topics) = 1 and md5(topics[1]) = '8b052e9ab45b013537cfd7b2459692c7'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1005);

update public.disciplines set topics = array['A política externa na formação do Estado Nacional: Independência, Império e República Velha', 'paradigma Rio Branco', 'Relações Étnico-Raciais e política externa: representação racial e diplomacia no Brasil', 'Reconfiguração pós-ditadura: abertura económica, crises e reorientações estratégicas nos governos Sarney a FHC', 'PEB durante o Regime Militar: do retorno ao americanismo à busca por autonomia estratégica (1964–1985)', 'Política externa e desenvolvimento: relações internacionais, políticas econômicas e inserção estratégica do Brasil articuladas à Pesquisa em História da Política Externa Brasileira, envolvendo fontes, métodos e abordagens para o estudo da PEB', 'Desenvolvimentismo e universalismo: a Revolução de 1930, Segunda Guerra Mundial e a Política Externa Independente', 'Fundamentos da política externa brasileira: conceitos básicos, paradigmas históricos e a subárea de história da PEB', 'Brasil emergente no Século XXI: atuação internacional dos governos Lula, Dilma, Temer, Bolsonaro e novo governo Lula']::text[]
where id = 1006 and cardinality(topics) = 1 and md5(topics[1]) = '8301ba7b895d28a025de2ed999a92744'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1006);

update public.disciplines set topics = array['Industrialização retardatária e a segunda revolução', 'Sociedade, economia feudal e transição para o capitalismo', 'O pós Segunda Guerra e o Estado de Bem-Estar', 'Direitos Humanos e Pensamento Econômico', 'Crise dos anos 70, Globalização e Neoliberalismo', 'Panorama do Pensamento Econômico Atual', 'A Pesquisa científica na história do pensamento econômico', 'O capital industrial e primeira revolução']::text[]
where id = 1007 and cardinality(topics) = 1 and md5(topics[1]) = '675262feda19c79b0f4a956a66e49b37'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1007);

update public.disciplines set topics = array['Introdução aos conceitos e técnicas para a criação de imagens digitais no design', 'Representação gráfica bidimensional e tridimensional de espaços: desenho geométrico e perspectivas axonométricas', 'Geometria descritiva e projeções ortogonais', 'Exploração dos fundamentos da composição digital e computação gráfica: cor, forma, imagens raster e vetoriais, resolução, formatos de imagem e o fluxo de construção digital', 'Utilização das ferramentas digitais, com foco na manipulação de imagens bitmap e vetoriais', 'Experimentações em motion design com o uso de ferramentas manuais e/ou digitais', 'Debate sobre tecnologias emergentes, como inteligência artificial, e reflexão crítica sobre autoria, originalidade e diversidade nas produções gráficas, visando incentivar práticas inclusivas e inovadoras nos projetos', 'Desenvolvimento de projeto gráfico e/ou audiovisual digital experimental']::text[]
where id = 1008 and cardinality(topics) = 1 and md5(topics[1]) = 'bdf5da9440c43898f7a74661396f1366'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1008);

update public.disciplines set topics = array['Criação Colaborativa e Engajamento', 'Otimização, Métricas e Crescimento', 'Gestão de Conteúdo, Branding e Marketing', 'Planejamento Estratégico para Produção de Conteúdo', 'Linguagens e Formatos para Mídias Digitais', 'Fundamentos da Influência Digital', 'Projeto Integrador: Estratégia de Influência e Conteúdo', 'Influência Digital, Diversidade e Relações Étnico- Raciais']::text[]
where id = 1009 and cardinality(topics) = 1 and md5(topics[1]) = 'e6a76a6aae27abbdc832d2784bdc608a'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1009);

update public.disciplines set topics = array['Produção Textual na Comunicação Empresarial', 'O Texto Informativo: premissas, gêneros e estruturas', 'Criatividade e Escrita Criativa', 'Produção Textual Experimental nas Mídias', 'Aplicações Textuais nas Profissões em Comunicação', 'Linguagem, Texto e Discurso: normas, tipologias e estruturas do texto', 'O Texto Publicitário: retórica, persuasão e técnicas de escrita', 'Ética e Integridade na Produção Textual para os Meios de Comunicação']::text[]
where id = 1010 and cardinality(topics) = 1 and md5(topics[1]) = 'e4c728c0c873aeb60831b9ff64c5714b'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1010);

update public.disciplines set topics = array['Planejamento Logístico Internacional', 'Transportes Internacionais', 'Tecnologia, Sistemas e Fontes de Informação', 'Gestão de Documentação e Conformidade Regulatória', 'Fundamentos da Infraestrutura Logística Internacional', 'Sustentabilidade e Inovação na Logística Internacional', 'INCOTERMS', 'Logística Aduaneira']::text[]
where id = 1011 and cardinality(topics) = 1 and md5(topics[1]) = 'c2c44b19b66c735f57e146aeea06f475'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1011);

update public.disciplines set topics = array['Prospecção de Fornecedores, Clientes e Negociação Internacional', 'FormaEstudo da língua inglesa aplicada ao contexto do Comércio Internacional: Terminologia Técnica Fundamental', 'Logística, Frete, Seguro e Incoterms', 'Apresentação e redação de relatórios em inglês: Simulação de Operação Internacional']::text[]
where id = 1012 and cardinality(topics) = 1 and md5(topics[1]) = '01dccbe8023180645ce2a35d273076fa'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1012);

update public.disciplines set topics = array['Fundamentos de inovação e criatividade aplicados a projetos digitais', 'Processos de ideação e geração de soluções inovadoras', 'Design Thinking e metodologias ágeis para desenvolvimento de projetos', 'Ferramentas digitais para prototipagem e validação de ideias', 'Estratégias de inovação aberta e colaboração em ecossistemas digitais', 'Análise de tendências tecnológicas e impacto nos negócios', 'Gestão da criatividade e cultura de inovação em equipes', 'Sustentabilidade e responsabilidade social em projetos digitais']::text[]
where id = 1013 and cardinality(topics) = 1 and md5(topics[1]) = 'bbe2bc4ed0aa844ed44c2ba06c2483ea'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1013);

update public.disciplines set topics = array['Desenvolvimento de Portfólio e Comunicação Profissional', 'Gestão da Inovação e Empreendedorismo em Economia Criativa', 'Práticas de captação de recursos, financiamento, apoio e incentivo a Projetos na área de Economia Criativa', 'Gestão de Escritórios e Projetos na área de Economia Criativa', 'Ética, Responsabilidade Social e Sustentabilidade em Economia Criativa', 'Pesquisa de tendências e consumo para aplicação em projetos na área de Economia Criativa', 'Ferramentas e Tecnologias para a Profissionalização na área de Economia Criativa', 'Direitos Autorais, Propriedade Intelectual e Licenciamento']::text[]
where id = 1014 and cardinality(topics) = 1 and md5(topics[1]) = '6f6d0c2524dd7e2dda7e37c8696c92c7'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1014);

update public.disciplines set topics = array['Seleção, análise e utilização de atividades terapêuticas no contexto das práticas integrativas', 'Tendências contemporâneas e inovações no campo da Terapia Ocupacional', 'Abordagens corpo-mente e suas relações com o desempenho e a participação ocupacional', 'Integração de tecnologias leves e tecnologias relacionais no cuidado terapêutico ocupacional', 'Recursos terapêuticos complementares e estratégias de intervenção em Terapia Ocupacional', 'Avaliação e planejamento terapêutico em práticas integrativas fundamentadas em evidências', 'Construção da trajetória profissional do terapeuta ocupacional e seu alinhamento com práticas inovadoras e integrativas', 'Fundamentos e aplicabilidades das Práticas Integrativas e Complementares em Saúde na atuação terapêutica ocupacional']::text[]
where id = 1015 and cardinality(topics) = 1 and md5(topics[1]) = '06a2d06ea6223ef428fbfeb060361cff'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1015);

update public.disciplines set topics = array['Conceitos fundamentais de eletricidade, potência, energia e fator de potência', 'Introdução ao projeto elétrico predial, simbologia e previsão de cargas', 'Tipos de fornecimento, divisão da instalação e layout dos pontos', 'Traçado de eletrodutos, esquemas de ligação e diagrama unifilar', 'Dimensionamento de condutores elétricos, proteção dos circuitos e alimentadores', 'Dimensionamento de eletrodutos, aterramento e proteção contra choques e surtos', 'Luminotécnica, levantamento de materiais e instalações para acionamento de motores', 'Subestações abaixadoras de média tensão, sistemas complementares e elaboração de projeto final']::text[]
where id = 1016 and cardinality(topics) = 1 and md5(topics[1]) = '7c6c155591dd47d245e7d1a1e4d12974'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1016);

update public.disciplines set topics = array['Sistemas de aquisição de dados e integração com plataformas computacionais', 'Tipos de sensores, atuadores e transdutores utilizados em sistemas automatizados', 'Arquitetura de redes industriais e topologias de comunicação', 'Fundamentos das redes industriais de comunicação', 'Técnicas de condicionamento de sinais e conversão analógico-digital', 'Princípios de instrumentação industrial aplicados à medição de grandezas físicas', 'Protocolos de comunicação utilizados em automação, como Modbus, Profibus, CAN e Ethernet Industrial', 'Aplicações práticas de instrumentação e redes industriais em sistemas de controle e supervisão']::text[]
where id = 1017 and cardinality(topics) = 1 and md5(topics[1]) = 'ddb602670d4d53f6e5fe68aed1a63d94'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1017);

update public.disciplines set topics = array['Métodos ópticos de análise, colorimetria e espectroscopia nas regiões ultravioleta, visível e infravermelho', 'Modelagem matemática de sistemas químicos por equações diferenciais e transformada de Laplace', 'Fundamentos e técnicas de medição de temperatura, pressão, nível, massa, força, fluxo e umidade', 'Medições eletroquímicas e físico-químicas incluindo pH, condutividade, densidade e viscosidade', 'Linearização, funções de transferência e análise de estabilidade de sistemas de controle', 'Tipos de controladores', 'Análise instrumental avançada com espectrometria de absorção atômica, plasma, calorimetria e difração de raios X', 'Operação e aplicação de válvulas de controle e sensores em processos industriais']::text[]
where id = 1018 and cardinality(topics) = 1 and md5(topics[1]) = '9464802292e2dd47d91fedcecc26c013'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1018);

update public.disciplines set topics = array['Estudo integrado dos mecanismos fisiopatológicos e farmacológicos envolvidos nas doenças prevalentes da população, correlacionando saúde e doença com processos etiológicos, patogênicos e terapêuticos', 'Análise das lesões celulares reversíveis e irreversíveis, mecanismos inflamatórios e reparativos, além das alterações patológicas hemodinâmicas, cardiovasculares, infecciosas e metabólicas', 'Exploração das bases da farmacologia, incluindo princípios de farmacocinética e farmacodinâmica, além do uso clínico de fármacos aplicados ao tratamento de doenças do sistema nervoso central, cardiovascular, inflamatórias e infecciosas', 'Discussão sobre o uso racional de medicamentos e a segurança no cuidado ao paciente']::text[]
where id = 1019 and cardinality(topics) = 1 and md5(topics[1]) = '8d116f9b7ae5198d703ace34f89fc0ce'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1019);

update public.disciplines set topics = array['Visualidades expandidas: figurino e cenografia como escultura corporal e instalação habitável', 'Arte integrada, descolonização estética e representação étnico-racial', 'Processos colaborativos, dramaturgia coletiva e planejamento básico de produção', 'Performance art: ação, presença e partitura como práticas de criação em tempo real', 'Sistemas imersivos: poéticas da interação, espacialidade sonora e narrativas não-lineares', 'Corpo, estética e semiologia na confluência das linguagens artísticas', 'Finalização, apresentação pública, documentação e análise crítica de projetos integrados', 'Animação: princípios do movimento e técnicas de construção de narrativas visuais híbridas']::text[]
where id = 1020 and cardinality(topics) = 1 and md5(topics[1]) = 'af591f788661e76cb14fd262729ac196'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1020);

update public.disciplines set topics = array['Fundamentos da inteligência artificial, incluindo conceitos, histórico e principais áreas de aplicação', 'Representação do conhecimento e raciocínio lógico em sistemas inteligentes', 'Algoritmos de busca heurística e técnicas de tomada de decisão', 'Aprendizado de máquina com classificação, regressão, agrupamento e avaliação de modelos', 'Redes neurais artificiais e introdução ao deep learning', 'Inteligência artificial generativa e fundamentos de modelos generativos', 'Aplicações de IA generativa em geração de texto, imagem e código', 'Questões éticas e sociais da IA, incluindo viés algorítmico, privacidade e uso responsável']::text[]
where id = 1021 and cardinality(topics) = 1 and md5(topics[1]) = 'd8c68e9ebf5184861fad06eb575b55ab'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1021);

update public.disciplines set topics = array['Plano de Análise e Prospecção de Mercado Internacional', 'Análise de Mercados-Alvo', 'Estratégias de Entrada em Mercados Internacionais', 'Prospecção de Mercados Digitais', 'Análise Prospectiva e Construção de Cenários Globais', 'Direitos Humanos no Comércio Internacional', 'Identificação de Oportunidades Comerciais', 'Fundamentos da Inteligência de Mercado e Internacionalização Empresarial']::text[]
where id = 1022 and cardinality(topics) = 1 and md5(topics[1]) = 'd88e712a732ccac65e7ec1b73ce6cee7'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1022);

update public.disciplines set topics = array['Fundamentos e conceitos de interação humano-computador', 'Usabilidade, acessibilidade e experiência do usuário', 'Ergonomia aplicada ao design de sistemas digitais', 'Projeto centrado no usuário', 'Métodos e ferramentas de prototipagem de interfaces', 'Avaliação e testes de usabilidade em ambientes simulados', 'Interfaces gráficas para desktop, web e dispositivos móveis', 'Tendências em design de interação e tecnologias emergentes']::text[]
where id = 1023 and cardinality(topics) = 1 and md5(topics[1]) = '89cd4b0b8416ae78cbed682517850c40'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1023);

update public.disciplines set topics = array['Curadoria, tratamento e interpretação de dados', 'Extração, estruturação e análise de dados web', 'Fundamentos do jornalismo guiado por dados públicos', 'Fundamentos da estatística para contar histórias com números', 'Jornalismo de Dados e Direitos Humanos, Educação Ambiental, Relações Étnico-Raciais', 'Visualização de dados, design da informação e infografia', 'Dados abertos, fiscalização e narrativas humanizadas', 'Reportagem baseada em dados']::text[]
where id = 1024 and cardinality(topics) = 1 and md5(topics[1]) = '5eb0b50aeeb39d1c12aaa786b3de8dec'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1024);

update public.disciplines set topics = array['Do rádio aos novos produtos sonoros: processos de produção, apuração, edição e finalização', 'Texto para rádio e novos produtos sonoros', 'Distribuição: da lógica radiofônica às plataformas digitais', 'Contexto histórico e teorias das linguagens, tecnologias e sistemas no jornalismo sonoro', 'Programação, audiência e planejamento de programas para rádio e ambiente digital: notícia, sonorização e sonoplastia', 'Apresentação e reportagem na linguagem sonora', 'Narrativas e paisagens sonoras', 'Características de gêneros e formatos radiofônicos e digitais', 'Podcast, gêneros e formatos jornalísticos: a relação informação- entretenimento na comunicação em áudio']::text[]
where id = 1025 and cardinality(topics) = 1 and md5(topics[1]) = 'f112e34ee07963203de2f9c501a20162'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1025);

update public.disciplines set topics = array['Curadoria, tratamento e interpretação de dados', 'Extração, estruturação e análise de dados web', 'Fundamentos do jornalismo guiado por dados públicos', 'Fundamentos da estatística para contar histórias com números', 'Jornalismo de Dados e Direitos Humanos, Educação Ambiental, Relações Étnico-Raciais', 'Visualização de dados, design da informação e infografia', 'Dados abertos, fiscalização e narrativas humanizadas', 'Reportagem baseada em dados']::text[]
where id = 1026 and cardinality(topics) = 1 and md5(topics[1]) = '5eb0b50aeeb39d1c12aaa786b3de8dec'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1026);

update public.disciplines set topics = array['Desenvolvimento e Prototipação do Produto', 'Validação, Avaliação e Evolução do Projeto', 'Ideação e Proposta de Valor', 'Definição do Problema e Contextualização do Projeto', 'Planejamento e Concepção da Solução Tecnológica', 'Aspectos Éticos, Legais e de Responsabilidade Profissional', 'Modelo de Negócio e Viabilidade da Solução', 'Pitch e Apresentação']::text[]
where id = 1027 and cardinality(topics) = 1 and md5(topics[1]) = 'bb777e4c557df3385a0ad80f9f108ab3'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1027);

update public.disciplines set topics = array['Conceitos básicos Dimensão e unidades temperatura, pressão, trabalho, energia, potência e calor Propriedades de substâncias puras: massa e volume específico, densidade relativa, diagrama de fases, calor sensível, calor latente Propriedades dos gases ideais', 'Fronteiras da termodinâmica, sistemas aberto, fechado e isolado Lei zero da termodinâmica Primeira Lei da Termodinâmica ( calor, trabalho e variação da energia interna) para sistema e volume de controle Segunda Lei da Termodinâmica Entropia Ciclo de Carnot', 'Ciclo de máquinas térmicas', 'Balanço de energia Propriedades termodinâmicas de soluções ideais Conceitos de fugacidade, coeficiente de fugacidade e de atividade Termodinâmica de Equilíbrio químico Termoquímica (calor de formação, de reação e de combustão, lei de Hess)']::text[]
where id = 1028 and cardinality(topics) = 1 and md5(topics[1]) = '8ae6a6f901febabfbc4c71fef9563621'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1028);

update public.disciplines set topics = array['Conceito de Inclusão e Movimentos Internacionais de Direitos Humanos', 'Promoção da diversidade, acessibilidade e equidade no contexto educacional', 'Diretrizes Curriculares de Direitos Humanos e Educação Especial', 'Política Nacional de Educação Especial na Perspectiva Inclusiva', 'Atendimento Educacional Especializado (AEE)', 'Tecnologias Assistivas', 'Diversidades', 'Libras e Cultura Surda no ambiente educacional', 'Modelos de Educação para Surdos', 'Práticas Inclusivas em LIBRAS', 'Direitos humanos na educação: garantindo a inclusão e a dignidade para todos']::text[]
where id = 1029 and cardinality(topics) = 1 and md5(topics[1]) = 'c8afd4712536907d79c3d190f914d61e'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1029);

update public.disciplines set topics = array['Principais protocolos de avaliação de linguagem oral e implicações funcionais dos transtornos da comunicação no cotidiano e no desenvolvimento global', 'Fundamentos da linguagem oral e seus componentes estruturais e funcionais', 'Marcos do neurodesenvolvimento relacionados às habilidades comunicativas', 'Aspectos transversais de comunicação, tecnologia, cognição, cultura e relações sociais aplicados à compreensão dos transtornos da comunicação', 'Classificação e caracterização dos transtornos específicos da linguagem (atraso de linguagem, distúrbio específico de linguagem, distúrbio fonológico e outros quadros associados às alterações de linguagem)', 'Processos típicos de aquisição e desenvolvimento da linguagem oral', 'Situação-problema integradora envolvendo análise clínica, interpretação de sinais e elaboração de proposta inicial de intervenção fonoaudiológica', 'Avaliação clínica básica da linguagem oral e identificação de sinais de alteração']::text[]
where id = 1030 and cardinality(topics) = 1 and md5(topics[1]) = '40fe5a44ab5ea98ab5812512a50d8a16'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1030);

update public.disciplines set topics = array['Atuação fonoaudiológica no contexto educacional e práticas colaborativas com equipes escolares', 'Fundamentos da linguagem escrita e seus componentes cognitivo-linguísticos', 'Transtornos específicos da aprendizagem e suas manifestações na leitura e escrita', 'Avaliação fonoaudiológica voltada à linguagem escrita e identificação de dificuldades', 'Situação-problema integradora envolvendo análise de dificuldades escolares e proposta inicial de intervenção fonoaudiológica', 'Processos envolvidos na alfabetização e letramento', 'Desenvolvimento típico da leitura e da escrita', 'Aspectos transversais relacionados à comunicação, tecnologia, cultura, cognição e relações sociais aplicados ao ambiente educacional']::text[]
where id = 1031 and cardinality(topics) = 1 and md5(topics[1]) = 'd406f1ee50e05111fa662dfc6e22cda4'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1031);

update public.disciplines set topics = array['Estética, Representação, Interseccionalidade e Diversidade Étnico-Racial e Cultural', 'Estética: Conceitos e Manifestações Sociais', 'Estética e Produção de Sentidos', 'História da linguagem e da expressão', 'Análise Crítica, Criação e Experimentação em Linguagens Contemporâneas', 'Semiótica e Análise do Discurso', 'Configuração dos Campos da Linguagem, Estética e Mídia', 'Arte Contemporânea: estética como expressão de caráter social, cultural e político']::text[]
where id = 1032 and cardinality(topics) = 1 and md5(topics[1]) = 'b03205ebf55bfe589e976218fd175cc1'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1032);

update public.disciplines set topics = array['O que é direito? Cientificidade do Direito e Teoria Geral das Técnicas do Direito', 'Norma Jurídica.Estática jurídica e Ordenamento jurídico', 'Dinâmica Jurídica e Fontes do Direito', 'Antinomias Jurídicas', 'Lacunas jurídicas', 'Hermenêutica Jurídica', 'Argumentação Jurídica', 'Lei de introdução as normas Brasileiras', 'Sujeitos de Direito', 'Capacidade Jurídica', 'Personalidade Jurídica', 'Direitos da Personalidade', 'Ausência', 'Estatuto da Pessoa com deficiência', 'Grupos e Entes despersonalizados', 'Domicílio', 'Regime jurídico e classificação dos bens', 'Negócio Jurídico', 'Prescrição e decadência', 'Da prova']::text[]
where id = 1033 and cardinality(topics) = 1 and md5(topics[1]) = '314fd3d212b3c9bb33bf9f237c566cfa'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1033);

update public.disciplines set topics = array['Modelo Keynesiano: modelo IS-LM', 'Análise de conjuntura econômica para tomada de decisão empresarial', 'Contabilidade nacional', 'Modelo clássico', 'Desenvolvimento Econômico e Sustentabilidade Ambiental', 'Modelo Keynesiano: OA e DA', 'Economia Política', 'Modelo Keynesiano']::text[]
where id = 1034 and cardinality(topics) = 1 and md5(topics[1]) = '64888698733942635c595a03b469252d'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1034);

update public.disciplines set topics = array['Ciclos reais de negócios e novos keynesianos', 'Macroeconomia para os novos clássicos', 'Relação de indicadores de pobreza e a conjuntura macroeconômica', 'Críticas e avanços da macroeconomia', 'Modelos de crescimento econômico', 'Análise conjuntural da macroeconomia brasileira', 'Modelo de Kalecki', 'Nova síntese neoclássica']::text[]
where id = 1035 and cardinality(topics) = 1 and md5(topics[1]) = '2cdd8d8bffc889178a3595b1978b0c71'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1035);

update public.disciplines set topics = array['Interpretação e aplicação de sistemas de coordenadas em contextos de usinagem CNC', 'Estrutura e características operacionais das máquinas CNC', 'Linguagem ISO e comandos básicos para programação de usinagem', 'Criação de trajetórias de usinagem em ambientes CAM', 'Planejamento de etapas do processo produtivo com uso de CAM', 'Seleção de ferramentas, parâmetros e pós-processamento', 'Transmissão de códigos e integração com sistemas de produção', 'Aplicação prática de usinagem CNC a partir de desafio real']::text[]
where id = 1036 and cardinality(topics) = 1 and md5(topics[1]) = 'f0d4cd498eea1123cf48fc36d202043d'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1036);

update public.disciplines set topics = array['Fundamentos de conjuntos, relações e funções', 'Proposições lógicas, tabelas-verdade e equivalências na formulação de raciocínios formais', 'Álgebra booleana e suas aplicações em circuitos digitais e sistemas computacionais', 'Princípios de contagem e combinatória aplicados a problemas computacionais', 'Estruturas matemáticas como matrizes, grafos e árvores na modelagem de dados', 'Indução matemática e recorrência na construção e prova de propriedades', 'Modelagem matemática de problemas computacionais em diferentes domínios', 'Aplicações em algoritmos e estruturas de dados para solução de problemas']::text[]
where id = 1037 and cardinality(topics) = 1 and md5(topics[1]) = 'd954f3da0de7f0d6e30b39caab494c42'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1037);

update public.disciplines set topics = array['Estudo dos agentes patogênicos (vírus, fungos, bactérias, protozoários, helmintos e seus vetores), sua morfologia, fisiologia e papel na microbiota humana', 'Compreensão dos mecanismos de virulência e resistência aos antimicrobianos, bem como da participação de agentes biológicos nos processos infecciosos', 'Análise das interações entre infecção e inflamação, caracterizando a resposta imune humana e os mecanismos de defesa inata e adquirida', 'Exploração da relação entre os mecanismos de agressão dos patógenos e a resposta imunológica do hospedeiro, além de estratégias de biossegurança e profilaxia', 'Estudo da imunoprofilaxia (vacinas e soroterapia) e abordagens imunoterapêuticas na prevenção e tratamento de doenças infecciosas']::text[]
where id = 1038 and cardinality(topics) = 1 and md5(topics[1]) = '997b21be7574c7ce122c8a100770abe2'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1038);

update public.disciplines set topics = array['Apresentação dos conceitos básicos de transporte de quantidade de movimento e aplicação destes conceitos para análise e resolução de problemas envolvendo escoamento de fluidos', 'Estática de fluidos', 'Reologia de fluidos', 'Escoamento de fluidos em regime laminar e turbulento', 'Balanços globais de massa, energia e quantidade de movimento', 'Cálculos de potência de agitadores e misturadores', 'Equações de projeto de sistemas de escoamento', 'Agitação e mistura: propriedades que influenciam na mistura']::text[]
where id = 1039 and cardinality(topics) = 1 and md5(topics[1]) = '68be2a2e39dbb1f54b15acea4f5faeab'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1039);

update public.disciplines set topics = array['Fundamentos de Metrologia e Grandezas Elétricas', 'Teoria de Erros em Medições', 'Instrumentos de Medição e Técnicas de Conexão', 'Osciloscópio e Análise de Sinais', 'Medição de Resistência, Indutância e Capacitância', 'Medição de Potência e Energia Elétrica', 'Sensores de Temperatura, Deformação, Posição, Pressão, Nível e Vazão', 'Sistemas Eletrônicos para Instrumentação e Aquisição de Dados']::text[]
where id = 1040 and cardinality(topics) = 1 and md5(topics[1]) = 'bce25229ee511e5498ef4e6484078cbf'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1040);

update public.disciplines set topics = array['Fase de pré-desenvolvimento de produtos', 'Fases de desenvolvimento e pós desenvolvimento', 'Engenharia reversa, simultanea e dfx', 'Design Thinking', 'Inovação', 'Sustentabilidade, familia 14000 e ISO 14006', 'Desenvolvimento centrado no usuário', 'Acompanhamento do fluxo de informações durante o processo de desenvolvimento']::text[]
where id = 1041 and cardinality(topics) = 1 and md5(topics[1]) = '2fdc1cb7531c7f82927c77aa86ac3273'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1041);

update public.disciplines set topics = array['Fundamentos da Pesquisa Científica – Conceitos, tipos de pesquisa e estruturação do conhecimento científico', 'Formulação do Problema de Pesquisa e Hipóteses – Definição, delimitação do tema e justificativa', 'Métodos e Técnicas de Pesquisa – Revisão bibliográfica, pesquisa empírica e documental', 'Normas Técnicas e Formatação Acadêmica – Padrões ABNT, APA e Vancouver', 'Redação Científica e Argumentação Acadêmica – Estruturação de artigos, monografias e dissertações', 'Tecnologias Aplicadas à Pesquisa – Softwares de referências, análise de dados e ferramentas digitais para escrita acadêmica', 'Ética na Pesquisa e Integridade Acadêmica – Plágio, direitos autorais e boas práticas científicas. 8 Apresentação e Defesa de Trabalhos Científicos – Técnicas de comunicação oral e escrita para bancas e eventos acadêmicos']::text[]
where id = 1042 and cardinality(topics) = 1 and md5(topics[1]) = '8d4c1b5467b14f3834ea7c6c82e67424'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1042);

update public.disciplines set topics = array['Arquitetura e funcionamento de microcontroladores aplicados à automação e controle de sistemas', 'Gerenciamento de tarefas, interrupções e temporização em ambientes embarcados', 'Interfaces de comunicação e periféricos em sistemas embarcados', 'Integração de sensores e atuadores com microcontroladores', 'Técnicas de programação embarcada em linguagens de baixo e alto nível', 'Considerações de desempenho, segurança e sustentabilidade em projetos embarcados', 'Estrutura e desenvolvimento de sistemas em tempo real', 'Aplicações práticas de sistemas embarcados em controle de processos, robótica e dispositivos inteligentes']::text[]
where id = 1043 and cardinality(topics) = 1 and md5(topics[1]) = '8d3d54ab25aae227d8171ab4d551981b'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1043);

update public.disciplines set topics = array['Estratégia, jogos e discriminação de preços', 'Estruturas de mercado', 'Estratégia de Concorrência e Inovação', 'Equilíbrio geral e bem-estar social', 'Teoria do consumidor', 'Mercados com falhas de mercado e informações assimétricas', 'Externalidades Ambientais e Regulação Econômica', 'Teoria da firma']::text[]
where id = 1044 and cardinality(topics) = 1 and md5(topics[1]) = 'b3bdbe47c1a6343255624b4659353113'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1044);

update public.disciplines set topics = array['Matemática para Negócios', 'Modelagem Matemática Aplicada', 'Estatística para Gestores', 'Decisão com Probabilidade e Testes Estatísticos', 'Coleta, Organização e Análise de Dados Empresariais', 'Data Driven: Gestão orientada por dados', 'Indicadores Sociais e Equidade Organizacional', 'Metodologia da Pesquisa Aplicada: abordagem quantitativa com dados secundários']::text[]
where id = 1046 and cardinality(topics) = 1 and md5(topics[1]) = 'cf55d8f37f865bacc6b502326416f0b7'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1046);

update public.disciplines set topics = array['Fundamentos de Design Gráfico e Concepção do Produto Virtual', 'Prototipagem Virtual: Conceitos, Análise e Validação', 'Processos e Tecnologias de Prototipagem', 'Tecnologias e Ferramentas Computacionais para Modelagem Virtual', 'Modelagem Paramétrica de Protótipos', 'Simulação e Análise Estrutural', 'Elementos Finitos e Modelagem Computacional', 'Prática com Softwares de Modelagem 3D e Simulação']::text[]
where id = 1047 and cardinality(topics) = 1 and md5(topics[1]) = '545913044b140c95bed1e8a3c3f00fb4'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1047);

update public.disciplines set topics = array['Técnicas de modelagem por espaço de estados', 'Análise de estabilidade, resposta temporal e frequência de sistemas dinâmicos', 'Ferramentas de simulação e ambientes computacionais para análise de desempenho', 'Métodos de simulação computacional aplicados à engenharia', 'Fundamentos da identificação e modelagem de sistemas dinâmicos físicos e industriais', 'Técnicas de modelagem por equações diferenciais', 'Técnicas de modelagem por funções de transferência', 'Representações matemáticas de sistemas contínuos e discretos']::text[]
where id = 1048 and cardinality(topics) = 1 and md5(topics[1]) = '6c793c6dfb148f6db06de71634f8db19'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1048);

update public.disciplines set topics = array['Modelagem Matemática de Problemas de Otimização Aplicados a Processos Produtivos e Logísticos', 'Formulação, Solução e Análise de Problemas de Programação Linear', 'Formulação e Solução de Modelos de Programação Inteira para Problemas de Decisão Discreta', 'Modelagem e Resolução de Problemas de Programação Dinâmica e Otimização em Redes', 'Fundamentos e Aplicações da Teoria das Filas e da Simulação de Eventos Discretos', 'Modelagem e Análise de Processos Estocásticos através de Cadeias de Markov', 'Relação entre modelos matemáticos e decisões com impacto humano', 'Ética e responsabilidade social na formulação e resolução de modelos.Modelagem combinada em problemas reais']::text[]
where id = 1049 and cardinality(topics) = 1 and md5(topics[1]) = '7b6fdc149abc9870cea898fc77e9a0da'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1049);

update public.disciplines set topics = array['Movimento e ação do corpo humano', 'Estruturas neurológicas', 'Bases anatômicas e fisiológicas do movimento e ação do corpo humano', 'Neurofisiologia e estudo dos sistemas motores', 'Neurofisiologia do motoneurônio e da medula', 'Processamento do controle motor', 'Aprendizagem e coordenação motora', 'Instrumentação biomecânica para análise do movimento humano', 'Ponto de equilíbrio', 'Interface entre comportamento motor e hipótese do ponto de equilíbrio', 'Comportamento motor, controle da marcha e postura']::text[]
where id = 1050 and cardinality(topics) = 1 and md5(topics[1]) = '4fbe8e0a52d8c990d016760ad24da1fa'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1050);

update public.disciplines set topics = array['Inteligência de mercado e pesquisa aplicada', 'Integral', 'Finance Analitycs', 'Derivadas aplicadas à teoria econômica', 'Padrões globais de responsabilidade Socioambiental', 'Pesquisa Operacional e Analytics', 'Aplicação da integral definida em economia', 'Implementação de soluções em Inteligência de Negócios']::text[]
where id = 1051 and cardinality(topics) = 1 and md5(topics[1]) = '26909b0f464165d8cb9d6f71f998671c'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1051);

update public.disciplines set topics = array['Elaborar planos de mídia completos a partir de briefing, integrando definição de objetivos, público-alvo, seleção de meios, cronogramas, orçamento e reflexão ética e social sobre a veiculação publicitária', 'Aplicar métricas, indicadores e cálculos fundamentais do planejamento de mídia, em ambientes offline e online, para embasar decisões orientadas por dados e indicadores de performance', 'Analisar criticamente meios, veículos e formatos publicitários, comparando suas características e potencialidades para diferentes objetivos de comunicação e estratégias de campanha', 'Compreender os fundamentos, a evolução e o papel estratégico da mídia no contexto organizacional de anunciantes, agências e veículos, considerando sua relevância para o planejamento de campanhas']::text[]
where id = 1052 and cardinality(topics) = 1 and md5(topics[1]) = 'a61285147310f751783404d74b489804'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1052);

update public.disciplines set topics = array['Concepção, Planejamento e Criação de Narrativas Transmidiáticas', 'Narrativas: o que, como e por que narramos', 'Narrar a si, narrar o Outro: ética das narrativas, poder e histórias únicas', 'Estruturas e Modelos Narrativos Tradicionais', 'Ideação, Bíblia e Roteiro: criação de universos e histórias', 'Crítica e políticas contemporâneas do digital', 'Narrativas Transmidiáticas: concepção, arquitetura e consumo', 'Sociedade Digital e Cultura da Convergência']::text[]
where id = 1053 and cardinality(topics) = 1 and md5(topics[1]) = '532e339b6967fef5ae2e3617d0fe5dd2'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1053);

update public.disciplines set topics = array['Áreas de atuação e atribuições do nutricionista em nutrição clínica', 'Fisiopatologia e avaliação do estado nutricional', 'Diagnóstico nutricional e prescrição dietoterápica', 'Triagem nutricional hospitalar', 'Doenças do trato gastrointestinal e glândulas anexas', 'Doenças crônicas não transmissíveis (DCNT)', 'Doenças renais, endócrinas, reumáticas, neurológicas e oncológicas.Terapia nutricional, cuidados paliativos e interações fármaco-nutriente']::text[]
where id = 1054 and cardinality(topics) = 1 and md5(topics[1]) = '74ffe0ff53150167b4d39d6563dc2164'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1054);

update public.disciplines set topics = array['Introdução à nutrição e cultura alimentar', 'História da alimentação e nutrição no mundo e no Brasil', 'Antropologia da alimentação e nutrição', 'Macronutrientes e fibras: digestão, absorção, metabolismo', 'Micronutrientes: funções, carências, biodisponibilidade', 'Água: funções e recomendações', 'Prescrição dietética e recomendações nutricionais', 'Educação alimentar, sustentabilidade e comportamento alimentar']::text[]
where id = 1055 and cardinality(topics) = 1 and md5(topics[1]) = 'a93370cf9001de79832891d91bd3cb3b'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1055);

update public.disciplines set topics = array['Atribuições e Código de Ética do nutricionista em saúde coletiva', 'Sistematização do cuidado e atuação nos níveis de atenção à saúde', 'Transição nutricional e epidemiologia aplicada à nutrição', 'Evolução das políticas públicas de alimentação e nutrição no Brasil', 'SISVAN, DHAA e soberania alimentar', 'Sistemas agroalimentares e sustentabilidade', 'Políticas de produção e abastecimento alimentar (PAAS, PAT, PNAE)', 'Educação alimentar e nutricional e segurança alimentar considerando diversidade cultural e étnico-racial']::text[]
where id = 1056 and cardinality(topics) = 1 and md5(topics[1]) = '7d8a9e3bf64806b04b814b71497f55b2'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1056);

update public.disciplines set topics = array['Atuação do nutricionista em nutrição esportiva e estética', 'Demandas metabólicas e fisiológicas de atletas e desportistas', 'Avaliação nutricional e planejamento dietético para modalidades esportivas', 'Hidratação e equilíbrio hidroeletrolítico', 'Compostos bioativos e condutas nutricionais nas desordens estéticas', 'Suplementação, recursos ergogênicos e doping', 'Transtornos alimentares, envelhecimento cutâneo e cirurgias plásticas', 'Educação alimentar e padrões culturais e éticos de beleza']::text[]
where id = 1057 and cardinality(topics) = 1 and md5(topics[1]) = '20a59b426327e78b1ef9593aa27f619f'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1057);

update public.disciplines set topics = array['Conceitos e características dos ciclos da vida: mulher, gestante, lactante, lactente, criança, adolescente, adulto e idoso', 'Necessidades nutricionais específicas por fase da vida', 'Aspectos fisiológicos, culturais e biopsicossociais', 'Planejamento alimentar para indivíduos sadios e enfermos', 'Aleitamento materno, artificial e alimentação complementar', 'Guia alimentar para crianças menores de 2 anos e banco de leite humano', 'Avaliação e diagnóstico nutricional por ciclo da vida', 'Seletividade alimentar, transtornos e doenças comuns na infância, adolescência e gestação']::text[]
where id = 1058 and cardinality(topics) = 1 and md5(topics[1]) = '95b05e9c3381552ea27234b7c51d81a6'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1058);

update public.disciplines set topics = array['Extração líquido/líquido', 'Equilíbrio de fases, equilíbrio líquido vapor', 'Operações envolvendo transporte de calor e massa (psicrometria, umidificação, secagem, evaporação, cristalização)', 'Operações em estágios', 'Absorção de gases', 'Fluidodinâmica de colunas de recheio e de pratos', 'Adsorção e troca iônica', 'Destilação de equilíbrio, diferencial, fracionada e extrativa']::text[]
where id = 1059 and cardinality(topics) = 1 and md5(topics[1]) = '1968da4383c59c604d82420ad4ab7967'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1059);

update public.disciplines set topics = array['Aspectos transversais envolvendo habilidades cognitivas, tecnologias, comunicação, cultura e trabalho colaborativo na análise otoneurológica e auditiva', 'Avaliação otoneurológica e principais testes clínicos', 'Situação-problema integradora envolvendo análise de caso clínico e formulação de hipótese diagnóstica inicial', 'Anatomia e fisiologia do equilíbrio e das vias auditivas centrais', 'Processamento auditivo central e suas implicações clínicas', 'Alterações vestibulares e distúrbios do equilíbrio', 'Processos neurofisiológicos envolvidos na integração auditiva e vestibular', 'Fundamentos da otoneurologia e organização funcional do sistema vestibular e auditivo']::text[]
where id = 1061 and cardinality(topics) = 1 and md5(topics[1]) = '311a4bfbc0c75ca7efe2d24f247c92c8'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1061);

update public.disciplines set topics = array['Pensamento projetual, processo criativo e métodos para transformar ideias em realidade', 'Apresentação e discussão de metodologias projetuais para reconhecimento e seleção de métodos em design', 'Realização de leitura e análise sistêmica do contexto e das necessidades, aspirações e expectativas individuais e coletivas, considerando aspectos éticos, sociais e ambientais', 'Síntese criativa e conceituação de projeto a partir das pesquisas e análises sistêmicas do problema', 'Registros Gráficos e modelos da estruturação do pensamento projetual e criativo', 'Ideação de soluções projetuais em design por meio de estudos formais e funcionais (bi e tridimensionais)', 'Estratégias de prototipação de projetos em design', 'Gestão de projetos criativos e facilitação do processo de criação']::text[]
where id = 1062 and cardinality(topics) = 1 and md5(topics[1]) = '3a531be5668e47f17d9069e2dffd1d37'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1062);

update public.disciplines set topics = array['Estudo das estruturas periodontais normais e sua inter-relação com os processos de saúde e doença periodontal', 'Fundamentação das doenças biofilme-dependentes e seus aspectos microbiológicos, etiológicos e patogênicos', 'Diagnóstico e prognóstico das condições periodontais, por meio do exame clínico e radiográfico', 'Planejamento do tratamento periodontal, incluindo técnicas de controle mecânico e químico do biofilme, terapêutica medicamentosa e manejo das urgências periodontais', 'Abordagem das lesões traumáticas periodontais e indicação de cirurgias periodontais para diferentes finalidades terapêuticas', 'Estudo da Medicina Periodontal e sua relação com condições sistêmicas', 'Aplicação dos princípios de bioética e biossegurança na prática clínica periodontal']::text[]
where id = 1063 and cardinality(topics) = 1 and md5(topics[1]) = 'de06835d40728d90ce9cf22b5eb59c6c'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1063);

update public.disciplines set topics = array['Os conceitos de comportamento, público, massa e multidão', 'A formação da opinião pública em contextos democráticos e sociedades industrializadas', 'A circulação social da opinião pública e seus impactos', 'Esfera pública, espaço público e deliberação na contemporaneidade', 'O impacto das tecnologias digitais nos espaços deliberativos', 'Epistemologia, ciência e conhecimento', 'O papel da pesquisa científica, seus métodos e interfaces com a pesquisa de mercado', 'A cultura da convergência e suas dimensões de participação, conexão e inteligência coletiva', 'Relações das organizações e seus stakeholders e ferramentas de mensuração de impacto, relações, posicionamento e reputação', 'Formadores de opinião na atualidade', 'A comunicação e o seu papel na formação da opinião pública', 'Institutos de pesquisa', 'Técnicas de pesquisa de opinião pública: coordenação e planejamento', 'Planos de ação e desdobramentos de pesquisas de opinião pública', 'Pesquisa de opinião e integração com as demais pesquisas', 'Pesquisa institucional e pesquisa de mercado: técnicas, ferramentas, vantagens, resultados', 'Código de ética digital (ética e privacidade dos dados)', 'Pesquisas em meio digital Pesquisas mercadológicas', 'Augmented Analytics (o futuro da análise de dados)', 'Decisões baseadas em dados X senso comum']::text[]
where id = 1064 and cardinality(topics) = 1 and md5(topics[1]) = '557ec9fb1f04920a1b50df11cf65b5aa'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1064);

update public.disciplines set topics = array['Relações Públicas e comunicação institucional no contexto organizacional e da comunicação', 'Paradigmas das relações públicas e da comunicação institucional na história das organizações', 'Comunicação organizacional e suas interfaces sociais', 'Planejamento sob enfoques estratégico, tático e operacional', 'Plano, projeto e programa: conceitos e reflexos', 'Planejamento, pensamento e gestão estratégica', 'Processo do planejamento estratégico: diretrizes organizacionais, análise de ambientes, formulação e implantação da estratégia', 'Planos tático e operacional', 'Fases do processo do planejamento de comunicação das organizações', 'Modelos de planejamento BSC, PNQ, Matriz de Valor (canvas business aplicado à comunicação), Design Thinking, metododogias ágeis e outras para a elaboração do diagnóstico empresarial', 'Big Data e estratégias de comunicação direcionadas à inovação e tecnologia', 'Competências e habilidades do profissional de relações públicas e comunicação organizacional']::text[]
where id = 1065 and cardinality(topics) = 1 and md5(topics[1]) = '664206a303067b08af952913a9d6e8e5'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1065);

update public.disciplines set topics = array['Estrutura do desenvolvimento de campanhas publicitárias', 'Otimização de comunicação com o mercado', 'Informação e pesquisa em publicidade, propaganda e marketing', 'Dados e suas análises', 'Diagnóstico da situação do produto/marca/ideia no mercado', 'Briefing e análise de cenário macro e micro', 'Objetivos, metas, estratégias e ferramentas', 'Definição de verba e cronograma', 'A relação da campanha com o planejamento de mídia', 'Criação e relação com estratégia de planejamento', 'Análise crítica de informações e estratégias', 'Gestão de contas', 'Atendimento ao anunciante', 'Relação entre agências, clientes e stakeholders', 'Prospecção de oportunidades', 'Apresentação de campanhas e técnicas de argumentação e defesa oral', 'Análise e mensuração de resultados', 'Gestão de póscampanha', 'Gestão de projetos e relacionamento']::text[]
where id = 1066 and cardinality(topics) = 1 and md5(topics[1]) = '57b51150043740ff4070a499258af0d0'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1066);

update public.disciplines set topics = array['Técnicas de localização industrial com foco em critérios econômicos e estratégicos', 'Caracterização e estudo de modelos de leiaute e projeto de leiaute por processo', 'Técnicas de descrição de processos e medida de trabalho: amostragem, técnicas de cronometragem e observação para otimização de processos', 'Projetos de leiaute com foco na eficiência operacional', 'Cálculo de postos de trabalho', 'Análise da desempenho do sistema fabril (OEE) e de produtividade', 'Teoria das restrições', 'Gestão de transporte', 'Modais', 'Métricas', 'Custos', 'Processo de entrega', 'Caracterização de indústrias até 4.0 e 5.0', 'Aplicação de conceitos tecnológicos e sociais na indústria para sustentabilidade e inovação', 'Análise e solução de gargalos em ambientes produtivos reais']::text[]
where id = 1067 and cardinality(topics) = 1 and md5(topics[1]) = '047f94ddc1c38ea7c79af27d75802f6f'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1067);

update public.disciplines set topics = array['Planejamento de vendas e operações', 'Sistemas produtivos e fundamentos de PCP', 'Ferramentas aplicadas ao planejamento e controle da produção', 'Plano agregado de produção e planejamento mestre de produção', 'Gestão e controle de estoques na cadeia produtiva', 'Sistemas MRP e gestão da capacidade de produção', 'Metodologias enxutas de produção', 'Integração de fluxo de informações de vendas e processo produtivo', 'Técnicas integradas e resolução de desafios produtivos contemporâneos']::text[]
where id = 1068 and cardinality(topics) = 1 and md5(topics[1]) = '789a952756805810144c6b9915f929c2'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1068);

update public.disciplines set topics = array['Processo Criativo na Produção de Eventos e Ativações', 'Acessibilidade e Inclusão no Planejamento de Eventos', 'Introdução a Eventos e Ativações: tipos e etapas', 'Realização de Evento', 'Regulamentação, Cerimonial e Protocolo', 'Gestão e Operações de Eventos', 'Estratégia do Evento', 'Avaliação de Resultados e Mensuração de Impacto']::text[]
where id = 1069 and cardinality(topics) = 1 and md5(topics[1]) = 'd4b496985b56fd1259bbe24b8cc4a292'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1069);

update public.disciplines set topics = array['Introdução à nutrição e cultura alimentar', 'História da alimentação e atuação do nutricionista em UAN e lactários', 'Sustentabilidade, educação ambiental e direitos humanos', 'Perfil gestor e modelos de gestão em UAN', 'Legislação em alimentação e nutrição', 'Planejamento e fluxogramas de UAN e lactário', 'Gestão do processo produtivo, suprimentos e pessoas', 'Planejamento físico-funcional, ergonomia, qualidade e marketing em UAN']::text[]
where id = 1070 and cardinality(topics) = 1 and md5(topics[1]) = '7dd84ce3769ad414b554d8b174f6e42b'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1070);

update public.disciplines set topics = array['Diversidade humana e ciência: desmistificando o racismo biológico', 'Genética e Biotecnologia', 'Genética de Populações - equilíbrio de Hardy-Weinberg', 'História da Evolução', 'Direitos Humanos', 'Tipos de Seleção Natural, Seleção Sexual', 'Mutação, Migração e Deriva Genética', 'Evidências da Evolução', 'A genética depois de Mendel']::text[]
where id = 1071 and cardinality(topics) = 1 and md5(topics[1]) = 'a06f7a1614e2c8ddf7d311a17e9080da'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1071);

update public.disciplines set topics = array['Origem, estrutura, função e evolução das células', 'Membranas, citoplasma, organelas e estruturas subcelulares', 'Organização estrutural e funcional de procariontes e eucariontes, tipos celulares com ênfase na especificidade e caracterização funcional', 'Propriedades físico-químicas da água, ácidos, bases, pH e tampões fisiológicos', 'Estrutura e organização do genoma, estrutura do núcleo e dos ácidos nucleicos (DNA e RNA)', 'Transmissão das informações genéticas', 'Replicação, transcrição e tradução e a importância biológica das mutações', 'Hereditariedade, genética mendeliana e padrões de herança', 'Anomalias cromossômicas', 'Ciclo celular e apoptose', 'Caracterização bioquímica, estrutural e funcional dos aminoácidos, proteínas, carboidratos e lipídios', 'Rotas bioquímicas catabólicas e anabólicas que envolvem carboidratos, lipídios e proteínas no estado de jejum e alimentado', 'Bioenergética e termodinâmica das vias bioquímicas', 'Integração das rotas metabólicas']::text[]
where id = 1072 and cardinality(topics) = 1 and md5(topics[1]) = 'ec24bd307db9dd8e4169dcc12807c4ef'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1072);

update public.disciplines set topics = array['Fundamentos e aplicações de ferramentas de corte e movimentos de usinagem', 'Análise das variáveis de corte: velocidade, avanço, profundidade e forças envolvidas', 'Critérios de seleção de parâmetros de corte e usinabilidade dos materiais', 'Processos de conformação mecânica: laminação, forjamento, trefilação, extrusão e estampagem', 'Estudo dos processos de usinagem: torneamento, fresamento, furação, rosqueamento e retificação', 'Fundamentos de soldagem, brasagem e processos de fundição de ligas metálicas', 'Integração de práticas sustentáveis e escolha consciente de materiais nos processos de fabricação', 'Desenvolvimento de uma solução para otimizar um processo de fabricação com foco em desempenho e sustentabilidade']::text[]
where id = 1073 and cardinality(topics) = 1 and md5(topics[1]) = '1b6a75b55dd1ee21a75ec5c96a67ce26'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1073);

update public.disciplines set topics = array['Referencial teórico e levantamento bibliográfico', 'Introdução ao TCC, delimitação de tema e escolha do objeto de estudo', 'Execução e entrega do projeto de TCC', 'Metodologias de pesquisa']::text[]
where id = 1074 and cardinality(topics) = 1 and md5(topics[1]) = '42e050bf756ffd0bccc2438041cafbeb'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1074);

update public.disciplines set topics = array['Introdução ao processo de gerenciamento de projetos', 'Processos de desenvolvimento de software: tradicionais e ágeis', 'Análise e especificação de requisitos', 'Modelagem de sistemas com UML e implementação retomando os conceitos de orientação a objetos (herança, polimorfismo e encapsulamento)', 'Projeto e arquitetura de software', 'Ciclo de vida e manutenção de sistemas', 'Gerência de configuração e controle de versões', 'Documentação técnica e práticas colaborativas']::text[]
where id = 1075 and cardinality(topics) = 1 and md5(topics[1]) = 'e426060e12245fd30ee459ef76841834'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1075);

update public.disciplines set topics = array['Seleção criteriosa de elementos de máquinas aplicados a diferentes contextos de engenharia.Funcionamento e interação entre grupos de elementos em dispositivos mecânicos', 'Análise de falhas estáticas considerando materiais dúcteis e frágeis', 'Aplicações estruturais, térmicas e de vibração em projetos mecânicos', 'Integração de ferramentas de CAD e CAE em processos projetuais', 'Estratégias de desenvolvimento de produtos com apoio de modelagem 3D', 'Metodologias colaborativas e sustentáveis na engenharia de dispositivos', 'Planejamento e execução de projeto mecânico para solução de problema real']::text[]
where id = 1076 and cardinality(topics) = 1 and md5(topics[1]) = 'e2d77610eaf04806b96a4ced5ac10bba'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1076);

update public.disciplines set topics = array['Atendimento clínico-cirúrgico em estomatopatologia, com ênfase no diagnóstico diferencial das lesões bucais e na realização de procedimentos cirúrgicos ambulatoriais', 'Anamnese e exame clínico voltados às lesões de cavidade oral', 'Interpretação de exames complementares, incluindo exames laboratoriais e de imagem', 'Bópsias: indicação, técnicas e encaminhamento histopatológico', 'Diagnóstico e manejo das alterações potencialmente malignas e das neoplasias orais', 'Cirurgia oral menor: exodontias simples e complexas, frenectomias, bópsias excisionais e incisionais', 'Condutas frente a complicações pós-operatórias e emergências cirúrgicas', 'Biossegurança em procedimentos estomatológicos e cirúrgicos', 'Aspectos legais e éticos no diagnóstico e tratamento das patologias orais']::text[]
where id = 1078 and cardinality(topics) = 1 and md5(topics[1]) = '9550d0d227a14c53b2328633921966ae'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1078);

update public.disciplines set topics = array['proporcionar ao estudante uma experiência prática intensiva no atendimento odontológico infantil e de pessoas com deficiência', 'Os principais eixos dessa prática envolvem a identificação e manejo dos agravos em saúde relacionados ao ciclo de vida, garantindo um atendimento humanizado e baseado em evidências']::text[]
where id = 1079 and cardinality(topics) = 1 and md5(topics[1]) = 'b886d574a787bac53b3a310bf4cc86f8'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1079);

update public.disciplines set topics = array['reabilitação oral de pacientes com edentulismo total ou parcial, enfatizando a relação entre agravos em saúde e os ciclos de vida', 'Engloba o exame clínico, planejamento protético, técnicas de moldagem, confecção e adaptação de próteses totais e removíveis, ajustes oclusais, reembasamento, reparos e orientações para manutenção', 'Aborda o impacto da perda dentária na qualidade de vida, a adaptação do paciente ao uso das próteses e os princípios de biossegurança na prática clínica', 'Também são contemplados os aspectos funcionais, estéticos e psicológicos da reabilitação protética']::text[]
where id = 1080 and cardinality(topics) = 1 and md5(topics[1]) = '28fbd61bfba0454a9c9b39ebbb30cf80'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1080);

update public.disciplines set topics = array['Reabilitação protética em diferentes ciclos de vida e seus agravos em saúde bucal', 'O estudante desenvolverá competências para realizar anamnese, exame clínico e radiográfico, planejamento e execução de próteses fixas, respeitando princípios biomecânicos, estéticos e funcionais', 'Serão aplicadas técnicas de preparo dental, moldagem, confecção e cimentação de próteses fixas, bem como análise da oclusão e sua relação com a função mastigatória e dor orofacial', 'A unidade enfatiza a prática clínica supervisionada e a relação entre prótese fixa, agravos à saúde e qualidade de vida do paciente']::text[]
where id = 1081 and cardinality(topics) = 1 and md5(topics[1]) = '08789f2318a07a91480df3be949a3e66'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1081);

update public.disciplines set topics = array['A unidade curricular propõe uma imersão inicial na prática clínica odontológica, integrando conhecimentos de saúde coletiva, ética profissional e deontologia', 'O estudante será preparado para os primeiros atendimentos a pacientes, desenvolvendo habilidades essenciais, como anamnese, escuta qualificada e aplicação do método clínico centrado na pessoa', 'Serão abordados aspectos legais e bioéticos da profissão, bem como a importância da odontologia no contexto do sistema de saúde', 'O componente curricular enfatiza a formação de um profissional crítico, capaz de compreender os determinantes sociais da saúde bucal e de atuar de forma responsável e humanizada na atenção primária']::text[]
where id = 1082 and cardinality(topics) = 1 and md5(topics[1]) = '72c723fbb4314843039ccfc514b7e9e8'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1082);

update public.disciplines set topics = array['Estrutura do sistema de justiça criminal e elaboração de petições iniciais', 'Atuação prática na fase investigativa e elaboração de petições pré-processuais', 'Ação penal: espécies, requisitos e elaboração da denúncia ou queixa-crime', 'Defesa técnica: resposta à acusação, exceções e peças defensivas iniciais', 'Atuação prática em audiências criminais: instrução, debates e julgamento', 'Elaboração de recursos no processo penal e petições na execução penal', 'Ética profissional, direitos humanos e garantias fundamentais na prática penal', 'Resolução de caso prático envolvendo todas as etapas da prática criminal']::text[]
where id = 1083 and cardinality(topics) = 1 and md5(topics[1]) = 'dc51c844c94b751916ac7d3940d57a27'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1083);

update public.disciplines set topics = array['Simulações orientadas de prática jurídica cível, abrangendo a elaboração de peças processuais típicas (petição inicial, contestação, réplica, recursos)', 'Estudo da atuação dos profissionais do Direito em procedimentos judiciais e extrajudiciais', 'Prática forense e não forense', 'Introdução à estrutura dos atos jurídicos e à argumentação técnica', 'Produção de documentos jurídicos']::text[]
where id = 1084 and cardinality(topics) = 1 and md5(topics[1]) = '59fcc142c3b1f1a625a43e33cc725fc6'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1084);

update public.disciplines set topics = array['Princípios e Normas do Direito Processual do Trabalho – Estrutura da Justiça do Trabalho, princípios específicos e normas aplicáveis', 'Petição Inicial e Contestação – Estruturação e requisitos formais das peças iniciais no processo trabalhista', 'Produção de Provas e Audiências Trabalhistas – Estratégias para instrução processual, depoimentos, ônus da prova e participação em audiências simuladas', 'Recursos no Processo do Trabalho – Interposição de Recurso Ordinário, Agravo, Embargos e Recurso de Revista', 'Meios Extrajudiciais de Solução de Conflitos – Aplicação da mediação e conciliação trabalhista como alternativa ao litígio', 'Execução Trabalhista e Cálculo de Liquidação – Procedimentos executórios, liquidação de sentença e cálculos trabalhistas', 'Tecnologia Aplicada ao Processo Trabalhista – Uso do PJe, jurisprudência digital e inteligência artificial na advocacia trabalhista', 'Atuação Prática e Inserção no Mercado de Trabalho – Estágio supervisionado, visitas técnicas e participação em audiências reais']::text[]
where id = 1086 and cardinality(topics) = 1 and md5(topics[1]) = '3cc8ab7f801f81a12618218708b82f43'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1086);

update public.disciplines set topics = array['Estrutura da Justiça Fiscal e competências tributárias', 'Procedimentos administrativos fiscais e defesas no âmbito da Receita', 'Lançamento tributário e impugnação administrativa', 'Execução fiscal e defesa do contribuinte em juízo', 'Ações tributárias: anulatória, declaratória e mandado de segurança', 'Recursos e estratégias processuais em matéria tributária', 'Ética profissional e cidadania fiscal na atuação tributária', 'Estudo de caso prático com elaboração de peças e simulação de defesa']::text[]
where id = 1087 and cardinality(topics) = 1 and md5(topics[1]) = '74db1440df7711389657d707c2f5a12f'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1087);

update public.disciplines set topics = array['Mercado, Segmentação e Posicionamento', 'Panorama do Mercado Publicitário e o Profissional de Publicidade e Propaganda', 'Projeto de Atuação Profissional em Comunicação', 'Empreender na Comunicação: da Ideia ao Negócio', 'Marketing Verde/Ecomarketing e ESG', 'Estratégias de Produtos, Preços e Distribuição', 'Fundamentos e Ambiente de Marketing', 'Regimes e Dinâmicas do Trabalho na Publicidade']::text[]
where id = 1088 and cardinality(topics) = 1 and md5(topics[1]) = '49f43f2d2f85468871c7badb70ae552e'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1088);

update public.disciplines set topics = array['A Pós-produção no Universo Audiovisual: Conceitos e Transformações', 'Estudo dos processos, conceitos e práticas da pós-produção audiovisual, com ênfase na montagem como operação estética, narrativa e política', 'Tipos de Montagem: Clássica, Moderna e Não Clássica', 'Organização e construção da mensagem audiovisual a partir da articulação entre imagem, som, ritmo, cor e efeitos visuais', 'Relações entre montagem, cultura, história e modos de recepção', 'Fluxos de trabalho contemporâneos, softwares e tecnologias emergentes', 'Fluxos de Trabalho Contemporâneos em Cinema e Produção Audiovisual', 'Análise das etapas da pós-produção, do gerenciamento de materiais ao acabamento final da obra', 'O color grading, a finalização e os diferentes regimes de montagem em contextos clássicos e não clássicos']::text[]
where id = 1089 and cardinality(topics) = 1 and md5(topics[1]) = 'c6382fc2507822584da26e3a4c845bab'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1089);

update public.disciplines set topics = array['Propriedades e aplicações dos compostos de coordenação em processos industriais', 'Conceitos e fundamentos da química orgânica e suas funções', 'Fundamentos da química inorgânica e propriedades das substâncias simples e compostas', 'Noções básicas de síntese orgânica e métodos de obtenção de compostos', 'Avaliação da toxicidade e impactos ambientais de substâncias inorgânicas', 'Estudo da tabela periódica e das funções inorgânicas', 'Reatividade e propriedades físico-químicas dos compostos orgânicos', 'Aplicações da química orgânica e inorgânica em processos e produtos industriais']::text[]
where id = 1090 and cardinality(topics) = 1 and md5(topics[1]) = '217eb22a752943d96a68ee898d5a24c4'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1090);

update public.disciplines set topics = array['Reações químicas e fundamentos de estequiometria', 'Cinética das reações químicas', 'Dinâmica dos gases: leis, propriedades e modelos', 'Introdução à termodinâmica: leis fundamentais e energia', 'Segunda lei da termodinâmica: entropia e processos irreversíveis', 'Fenômenos de transporte e comportamento térmico', 'Conexões entre ciência, sociedade e sustentabilidade', 'Resolução de desafios aplicados à modelagem físico-química']::text[]
where id = 1091 and cardinality(topics) = 1 and md5(topics[1]) = '0c388ebf83a24ed81338599fe924ae77'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1091);

update public.disciplines set topics = array['Avaliação clínica do paciente desdentado total e parcialmente desdentado', 'Princípios físicos relacionados à retenção, suporte e estabilidade das próteses totais e parciais removíveis', 'Procedimentos de moldagem anatômica e funcional para confecção de próteses', 'Planejamento e execução das etapas clínicas das próteses totais e parciais removíveis, incluindo confecção de moldeiras individuais, registro de relações maxilo-mandibulares, prova estética, instalação, ajustes e manutenção das próteses', 'Utilização de articuladores semi-ajustáveis', 'Classificação dos arcos parcialmente desdentados e indicações e contraindicações das próteses parciais removíveis', 'Elementos constituintes e planejamento das próteses', 'Princípios de biossegurança aplicados à reabilitação oral']::text[]
where id = 1092 and cardinality(topics) = 1 and md5(topics[1]) = '2fda0f5053d8de0ee9a63c477f236ada'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1092);

update public.disciplines set topics = array['Realização de produção de obra cinematográfica, orientada por docente do curso, a partir de tema de escolha dos discentes que se insira nas áreas de concentração compreendidas nas atribuições e competências profissionais do Cinema e Audiovisual', 'Integração crítica dos fundamentos éticos e técnicos do cinema com a realização da obra cinematográfica, incluindo implicações sociais e ambientais a partir da diversidade de contextos', 'Edição, montagem e finalização de produtos audiovisuais', 'Plano de veiculação, plano de marketing e divulgação considerando os mecanismos de distribuição e questões de público alvo e segmentação', 'Direção de arte cinematográfica', 'Domínio de recursos adequados para apresentar e defender a obra cinematográfica diante de uma banca examinadora composta por profissionais da área de Cinema e/ou áreas correlatas, com clareza e persuasão', 'Pós-produção audiovisual e trilha sonora', 'Decupagem e planejamento de filmagem']::text[]
where id = 1093 and cardinality(topics) = 1 and md5(topics[1]) = 'e428d2997a4f21fda477039060e74f50'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1093);

update public.disciplines set topics = array['Fundamentos da crise da empresa no Direito brasileiro', 'Recuperação Judicial e Extrajudicial', 'Processo de Falência', 'Princípios norteadores da recuperação e falência', 'Aspectos procedimentais e práticos', 'Atualizações doutrinárias e jurisprudenciais', 'Teoria Geral dos Títulos de Crédito', 'Aplicações práticas dos Títulos de Crédito em contexto de crise empresarial']::text[]
where id = 1094 and cardinality(topics) = 1 and md5(topics[1]) = '905de7973885dda6e7a63f08fa987160'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1094);

update public.disciplines set topics = array['Produção Textual na Comunicação Empresarial', 'O Texto Informativo: premissas, gêneros e estruturas', 'Criatividade e Escrita Criativa', 'Produção Textual Experimental nas Mídias', 'Aplicações Textuais nas Profissões em Comunicação', 'Linguagem, Texto e Discurso: normas, tipologias e estruturas do texto', 'O Texto Publicitário: retórica, persuasão e técnicas de escrita', 'Ética e Integridade na Produção Textual para os Meios de Comunicação']::text[]
where id = 1095 and cardinality(topics) = 1 and md5(topics[1]) = 'e4c728c0c873aeb60831b9ff64c5714b'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1095);

update public.disciplines set topics = array['Fundamentos de redes de computadores: modelos OSI e TCP/IP', 'Meios de transmissão, dispositivos de rede e topologias', 'Protocolos de comunicação: IP, TCP, UDP, DNS, HTTP, etc', 'Endereçamento e roteamento de pacotes', 'Arquiteturas cliente-servidor e serviços de rede', 'Segurança da informação: confidencialidade, integridade, disponibilidade', 'Ameaças e vulnerabilidades em redes: ataques, firewalls, criptografia', 'Boas práticas e normas em segurança cibernética (ISO, LGPD, NIST)']::text[]
where id = 1096 and cardinality(topics) = 1 and md5(topics[1]) = '42694e066e59951dd2c91dcf913a257d'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1096);

update public.disciplines set topics = array['Análise de substâncias refrigerantes e propriedades termoquímicas associadas', 'Estudo dos ciclos termodinâmicos de refrigeração por compressão e absorção', 'Dimensionamento e operação de sistemas de isolamento térmico e equipamentos de refrigeração', 'Componentes de sistemas: válvulas, compressores, tubos capilares e sua aplicação', 'Processos de condicionamento de ar e qualidade do ar interior em ambientes diversos', 'Sistemas de ventilação industrial, componentes, redes de dutos e eficiência operacional', 'Integração entre sustentabilidade ambiental e práticas em refrigeração e climatização', 'Resolução de desafios reais envolvendo o projeto e operação de sistemas térmicos']::text[]
where id = 1097 and cardinality(topics) = 1 and md5(topics[1]) = '68a1f09c51d1435f94783459c76016c2'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1097);

update public.disciplines set topics = array['Operações Não Convencionais e Comércio Internacional de Serviços', 'Gestão Cambial e Riscos Financeiros', 'Classificação Fiscal de Mercadorias', 'Financiamento e Meios de Pagamento Internacionais', 'Fundamentos e Regulamentação do Comércio Exterior', 'Regimes Aduaneiros e Gestão Tributária', 'Processos Administrativos Aduaneiros', 'Processos Aduaneiros']::text[]
where id = 1098 and cardinality(topics) = 1 and md5(topics[1]) = '955163059f52ed849dfacb39753eff16'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1098);

update public.disciplines set topics = array['Planejamento e execução de ações de assessoria de imprensa e de influência', 'Diversidade, responsabilidade socioambiental e transparência nas relações com influenciadores digitais e com a imprensa', 'Estratégias de comunicação para lidar com situações adversas na imprensa e com influenciadores', 'Plano de relacionamento com a imprensa e com influenciadores digitais', 'Análise dos processos de mediação entre organizações, jornalistas e criadores de conteúdo como forma de construção de imagem, reputação e legitimidade pública', 'Treinamento, media training e workshops', 'Identificação e gestão de influenciadores', 'Estudo das práticas e estratégias de relacionamento com a imprensa e influenciadores digitais']::text[]
where id = 1099 and cardinality(topics) = 1 and md5(topics[1]) = 'ffbbf28a49548d430985ab2e3ba74729'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1099);

update public.disciplines set topics = array['Sistema de forças e equilíbrio dos corpos rígidos', 'Centróides e centros de gravidade no plano bidimensional', 'Momento de inércia de área e cargas internas solicitantes', 'Tensão, deformação e propriedades mecânicas dos materiais', 'Torção, flexão e cisalhamento em elementos estruturais', 'Projeto e análise de vigas, eixos e deflexão', 'Estabilidade estrutural e sustentabilidade ambiental', 'Aplicação prática de conceitos de resistência em estruturas sustentáveis']::text[]
where id = 1100 and cardinality(topics) = 1 and md5(topics[1]) = '64efc303ddf5a79330d7d1f2acd1cd9d'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1100);

update public.disciplines set topics = array['Integração entre roteiro e direção de arte, utilizando elementos visuais – cor, textura, luz e espaço – como recursos narrativos expressivos', 'Discussão sobre narrativas e representações culturais, contemplando diversidade, inclusão e perspectivas periféricas e insurgentes', 'Exploração dos gêneros e formatos narrativos, suas especificidades e adaptações entre diferentes mídias', 'Prática de escrita de diálogos, ritmo e linguagem cinematográfica, articulando texto e imagem na composição do discurso audiovisual', 'Desenvolvimento do processo criativo na escrita de roteiros individuais e coletivos, com uso de ferramentas digitais de escrita e revisão', 'Concepção e apresentação de projeto final de roteiro, com avaliação crítica e reflexão sobre o processo criativo e suas potencialidades expressivas e profissionais', 'Estudo dos fundamentos do roteiro e da narrativa audiovisual, abordando os elementos estruturais da narrativa – trama, personagem, conflito e ambiente – e os modelos clássicos e contemporâneos de construção dramática', 'Análise e aplicação de estruturas narrativas, como o modelo em três atos e a jornada do herói, e dos princípios de desenvolvimento de personagens complexos e arcos relacionais']::text[]
where id = 1101 and cardinality(topics) = 1 and md5(topics[1]) = 'ebeaebdfd376497227f80a2b8f363f47'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1101);

update public.disciplines set topics = array['Fundamentos de Segmentação de Mercado', 'Canais de Distribuição e Entrega de Valor', 'Mercado-Alvo e Criação de Personas', 'Posicionamento Estratégico no Mercado', 'Projeto Estratégico de STP + Canais', 'Estratégias Integradas de Segmentação, Posicionamento e Canais', 'Jornada do consumidor, UX (User Experience) e Gestão Omnichannel', 'E-commerce e Transformação Digital']::text[]
where id = 1102 and cardinality(topics) = 1 and md5(topics[1]) = 'b741f47123ba3e8dab82352c11b5a60d'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1102);

update public.disciplines set topics = array['Anatomia e função do sistema estomatognático', 'Desenvolvimento embrionário da face e odontogênese', 'Vascularização, drenagem e inervação da cabeça e da cavidade oral', 'Fundamentos da radiologia odontológica e proteção radiológica', 'Técnicas radiográficas intrabucais, extrabucais e métodos de localização', 'Interpretação radiográfica de estruturas anatômicas e alterações patológicas', 'Inovações tecnológicas em imagenologia odontológica', 'Papel dos exames de imagem no diagnóstico e na tomada de decisão clínica']::text[]
where id = 1104 and cardinality(topics) = 1 and md5(topics[1]) = 'dcb756a8d2cb9b1f6e7708bcb64b1cd6'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1104);

update public.disciplines set topics = array['Conceito de sinal digital', 'Sistema de numeração e codificação', 'Portas lógicas', 'Álgebra booleana', 'Simplificação lógica e Teoremas de DeMorgan', 'Circuitos lógicos combinatórios: multiplexador, demultiplexador, codificador e decodificador', 'Circuitos lógicos sequenciais: flip-flops, registradores, contadores e memórias', 'Sistemas embarcados']::text[]
where id = 1105 and cardinality(topics) = 1 and md5(topics[1]) = 'c5a16a2ae7fe3cff9a76b1e9dcf282ec'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1105);

update public.disciplines set topics = array['Fundamentos de sistemas digitais e lógica computacional', 'Arquitetura e organização de computadores', 'Estrutura, funcionamento e serviços de sistemas operacionais', 'Programação em plataformas de sistemas embarcados', 'Integração entre hardware e software em soluções computacionais', 'Redes e conectividade em sistemas embarcados', 'Dispositivos e plataformas embarcadas aplicadas à computação', 'Aplicações em automação e sistemas de controle']::text[]
where id = 1106 and cardinality(topics) = 1 and md5(topics[1]) = '5f29c4027585cbb9a88bed2339c063f9'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1106);

update public.disciplines set topics = array['Conceitos fundamentais de sistemas distribuídos e paralelos', 'Modelos de comunicação e sincronização entre processos', 'Arquiteturas de sistemas distribuídos e paralelos', 'Algoritmos para coordenação e consenso em ambientes distribuídos', 'Técnicas de escalonamento e balanceamento de carga', 'Programação paralela e distribuída com bibliotecas e frameworks', 'Tolerância a falhas e mecanismos de recuperação', 'Aplicações práticas em computação de alto desempenho e ambientes em nuvem']::text[]
where id = 1107 and cardinality(topics) = 1 and md5(topics[1]) = '8458dc7bd6f62f0fa96628fea0fddc17'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1107);

update public.disciplines set topics = array['Fundamentos e propriedades dos fluidos', 'Equilíbrio estático dos fluidos', 'Dinâmica dos fluidos em escoamento', 'Princípios da conservação de energia e quantidade de movimento', 'Máquinas de fluxo e seu funcionamento', 'Sistemas hidráulicos e pneumáticos industriais', 'Sustentabilidade em sistemas fluidomecânicos', 'Integração de sistemas fluidomecânicos em um cenário industrial']::text[]
where id = 1108 and cardinality(topics) = 1 and md5(topics[1]) = '3e910c59a333730f49ceb1b93cac002d'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1108);

update public.disciplines set topics = array['Fundamentos dos sistemas integrados de manufatura', 'Processos digitais de manufatura e virtualização industrial', 'Estratégias de engenharia reversa e desenvolvimento simultâneo de produtos', 'Tecnologias emergentes e inteligência integrada na indústria 4.0', 'Estruturas e movimentos dos robôs manipuladores e autônomos', 'Programação aplicada e controle seguro em ambientes industriais automatizados', 'Aplicações sustentáveis e tecnológicas no contexto da automação e da inovação', 'Planejamento, modelagem e resolução de problemas com sistemas integrados']::text[]
where id = 1109 and cardinality(topics) = 1 and md5(topics[1]) = '1f214b457985bc67864a9ca40860124a'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1109);

update public.disciplines set topics = array['Ecnologias sociais e inovação sustentável com base em saberes tradicionais', 'Climatologia', 'Tecnologias aplicadas à sustentabilidade', 'Sistemas agroecológicos', 'Educação ambiental', 'Relações Étnico-Raciais', 'Botânica econômica e etnobotânica', 'Energias renováveis']::text[]
where id = 1110 and cardinality(topics) = 1 and md5(topics[1]) = '9c9bcc3d8b5074dd4d6d4de428aefabf'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1110);

update public.disciplines set topics = array['Fundamentos das leis da termodinâmica e suas aplicações em sistemas de energia', 'Análise de sistemas termodinâmicos ideais e reais, considerando a eficiência isentrópica de equipamentos', 'Estudo dos ciclos termodinâmicos: Rankine, Joule-Brayton e Ciclo Combinado', 'Entropia e irreversibilidade nos processos termodinâmicos', 'Mecanismos fundamentais de transferência de calor: condução, convecção e radiação', 'Trocadores de calor e dimensionamento térmico de sistemas', 'Integração ambiental nos sistemas térmicos e energéticos', 'Aplicação de sistemas térmicos na resolução de desafios energéticos industriais']::text[]
where id = 1111 and cardinality(topics) = 1 and md5(topics[1]) = '1cef7108491fb40630fff843581a808e'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1111);

update public.disciplines set topics = array['Tipos de partidas, controle de velocidade e frenagem de motores elétricos', 'Estudo dos princípios de funcionamento das máquinas elétricas rotativas e estáticas', 'Características construtivas e aplicações das máquinas elétricas', 'Introdução aos sistemas de automação com acionamentos elétricos', 'Componentes, simbologia e montagem de circuitos pneumáticos e hidráulicos', 'Princípios físicos e operacionais dos sistemas pneumáticos e hidráulicos', 'Fundamentos dos sistemas de acionamento elétrico com motores de corrente alternada', 'Fundamentos dos sistemas de acionamento elétrico com motores de corrente contínua']::text[]
where id = 1112 and cardinality(topics) = 1 and md5(topics[1]) = 'b429a7e1921e0acf13bdb19af8076bcd'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1112);

update public.disciplines set topics = array['Fundamentos dos acionamentos elétricos e classificação dos sistemas de acionamento', 'Princípios de funcionamento dos motores de corrente contínua e corrente alternada', 'Métodos de partida, controle de velocidade e frenagem de motores elétricos', 'Conversores estáticos de potência: inversores, retificadores e choppers', 'Controladores lógicos programáveis (CLPs): arquitetura, programação e integração', 'Sensores, transdutores e atuadores aplicados em sistemas automatizados', 'Redes industriais e comunicação entre dispositivos de automação', 'Aplicações integradas: sistemas supervisórios, eficiência energética e manutenção preditiva']::text[]
where id = 1113 and cardinality(topics) = 1 and md5(topics[1]) = '129b6a4c5450ccdd6e6d03aeff14392e'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1113);

update public.disciplines set topics = array['Conceitos fundamentais sobre sistemas e sistemas de controle', 'Diagrama de blocos e classificação de sistemas', 'Modelagem de sistemas físicos mecânicos, elétricos, eletrônicos, térmicos e hidráulicos por meio de equações diferenciais', 'Representações matemáticas como resposta ao impulso, espaço de estados e função de transferência', 'Linearização de sistemas e diagrama de fluxo de sinal', 'Análise de sistemas lineares invariantes no tempo com enfoque por espaço de estados: solução das equações de estado, desacoplamento de estados, controlabilidade e observabilidade', 'Análise de sistemas lineares invariantes no tempo com enfoque no domínio do tempo: estabilidade, desempenho em regime permanente e sensibilidade de parâmetros', 'Projeto de controladores no domínio do tempo: lugar das raízes, contorno das raízes, controladores P, PI, PD, PID, controladores de avanço e atraso de fase, cancelamento de polos e realimentação de estados']::text[]
where id = 1114 and cardinality(topics) = 1 and md5(topics[1]) = '26d5988f5682822f53b5351bc052d57b'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1114);

update public.disciplines set topics = array['Fundamentos e princípios de sistemas distribuídos', 'Conceitos, modelos e serviços de computação em nuvem', 'Arquiteturas orientadas a serviços e microsserviços', 'Virtualização, containers e orquestração', 'Escalabilidade, tolerância a falhas e balanceamento de carga', 'Ferramentas e plataformas de computação em nuvem', 'Segurança em sistemas distribuídos e ambientes em nuvem', 'Casos de uso e aplicações práticas em diferentes contextos']::text[]
where id = 1115 and cardinality(topics) = 1 and md5(topics[1]) = '97163d11d6b7f0a0f83cdde52c125bd8'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1115);

update public.disciplines set topics = array['Fundamentos do método científico e sua aplicação na Odontologia, com ênfase na construção de estudos baseados em evidências', 'Exploração dos principais desenhos de pesquisa aplicados à área da saúde e odontologia, incluindo estudos observacionais, experimentais e revisões sistemáticas', 'Desenvolvimento de projetos de pesquisa fundamentados em abordagem quantitativa, qualitativa ou mista, com atenção à coleta e análise de dados', 'Normas e ética em pesquisa envolvendo seres humanos, incluindo os procedimentos da Plataforma Brasil', 'Aplicação do conhecimento científico na elaboração de um estudo de caso clínico odontológico a ser desenvolvido ao longo dos estágios supervisionados e apresentado no último semestre do curso', 'Levantamento e análise crítica da literatura científica utilizando bases de dados indexadas e ferramentas bibliográficas', 'Redação científica e formatação do trabalho acadêmico conforme normas técnicas e orientações institucionais', 'Planejamento e desenvolvimento das competências comunicativas para apresentação oral e defesa pública do Trabalho de Conclusão de Curso']::text[]
where id = 1116 and cardinality(topics) = 1 and md5(topics[1]) = '2c37f8af465ffd3747b8512f49dd125c'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1116);

update public.disciplines set topics = array['Integração de temas transversais à pesquisa em Ciências Econômicas', 'A importância e a função do Trabalho de Conclusão de Curso na formação do economista', 'Produção e entrega do TCC nos formatos artigo científico ou monografia, em grupo, seguindo critérios acadêmicos e metodológicos', 'Aplicação das normas da ABNT e do RUNA para elaboração de monografias e artigos científicos']::text[]
where id = 1117 and cardinality(topics) = 1 and md5(topics[1]) = '5ba29d4bc4cb9533d67c012bfcb82969'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1117);

update public.disciplines set topics = array['Delimitação e redefinição do objeto de Estudo: ajuste do problema de pesquisa, hipóteses e objetivos conforme o andamento do TCC', 'Discussão e interpretação de resultados: relação entre dados empíricos, referencial teórico e conclusões críticas', 'Finalização e preparação para defesa: revisão final, apresentação oral e estratégias de comunicação científica', 'Ética e integridade na pesquisa: responsabilidade ética, plágio, uso de fontes e consentimento informado', 'Redação científica: coerência textual, argumentação, linguagem técnica e clara científica', 'Coleta e análise de dados: estratégias quantitativas e qualitativas aplicadas ao campo das Relações Internacionais', 'Formatação e Normas Técnicas (ABNT): aplicação das normas na estruturação do TCC (citações, referências, formatação)', 'Fundamentos da pesquisa Científica em Relações Internacionais: epistemologia, métodos e áreas temáticas de investigação']::text[]
where id = 1118 and cardinality(topics) = 1 and md5(topics[1]) = 'b38ef256782f6c77fb2216fd0adcca1b'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1118);

update public.disciplines set topics = array['Metodologia Científica', 'Elaboração e entrega do Projeto de Pesquisa em Ciências Econômicas', 'Integração da pesquisa com um tema transversal', 'Formatação aplicadas ao projeto']::text[]
where id = 1119 and cardinality(topics) = 1 and md5(topics[1]) = '80c45b9a3d1e6989c288aa36e5d00178'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1119);

update public.disciplines set topics = array['Construção do problema de pesquisa: formulação da pergunta central, delimitação temática e relevância científica', 'Hipóteses e referencial teórico: formulação de hipóteses e estruturação do embasamento teórico coerente', 'Justificativa e objetivos da pesquisa: redação fundamentada da justificativa e definição clara de objetivos gerais e específicos', 'Elaboração e redação do projeto: estrutura formal do projeto de pesquisa e escrita científica', 'Metodologia e técnicas de pesquisa: abordagens qualitativas, quantitativas e mistas aplicadas às RI', 'Fundamentos da pesquisa em Relações Internacionais: conceitos e particularidades da investigação científica na área', 'Ética na pesquisa científica: princípios éticos, integridade académica e responsabilidade investigativa']::text[]
where id = 1120 and cardinality(topics) = 1 and md5(topics[1]) = 'faafd44854d65ed65219a5dab72b1af1'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1120);

update public.disciplines set topics = array['Tecnologia e Análise de Alimentos', 'Novos ingredientes e diversidade alimentar', 'Embalagens sustentáveis e acessíveis', 'Legislação e rotulagem nutricional', 'Fatores que influenciam a conservação dos alimentos', 'Testes sensoriais e diversidade alimentar', 'Composição centesimal dos alimentos', 'Desenvolvimento ético de novos produtos', 'Análises físico-químicas e microbiológicas']::text[]
where id = 1121 and cardinality(topics) = 1 and md5(topics[1]) = 'a01ebba6583d604121a16d24b5261687'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1121);

update public.disciplines set topics = array['Introdução ao design automotivo e ergonomia', 'Sistemas de suspensão: conceitos e aplicações', 'Sistemas de direção: fundamentos e aplicações', 'Estruturas de carroceria e chassi: fundamentos', 'Freios veiculares', 'Motores de combustão, híbridos e elétricos', 'Integração de tecnologias veiculares e impactos ambientais', 'Situação-problema: normas e projeto de mobilidade sustentável']::text[]
where id = 1122 and cardinality(topics) = 1 and md5(topics[1]) = 'eaf0550aed1ee6f1e40ffffdbdc9b511'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1122);

update public.disciplines set topics = array['Fundamentos da Ciência e Filosofia Política', 'Teoria Geral do Estado e Elementos Constitutivos', 'Fundamentos da Teoria Constitucional', 'Poder Constituinte e Hermenêutica Constitucional', 'Princípios Fundamentais da Constituição de 1988', 'Direitos e Garantias Fundamentais', 'Organização do Estado e dos Poderes', 'Ordem Social na Constituição de 1988']::text[]
where id = 1123 and cardinality(topics) = 1 and md5(topics[1]) = '3c9a921b4228afb9f37b247b96843e86'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1123);

update public.disciplines set topics = array['Fundamentos do Direito Empresarial', 'Evolução histórica, Teoria dos Atos de Comércio e Teoria da Empresa no ordenamento jurídico brasileiro', 'Empresário e Sociedade Empresária', 'Definição, requisitos legais, registro e capacidade empresarial', 'Diferenças entre sociedade simples e empresária', 'Tipos Societários e Regimes Jurídicos', 'Estruturas e características das sociedades empresárias, incluindo sociedade limitada (Ltda.), sociedade anônima (S.A.) e novas formas societárias, como as Sociedades Anônimas do Futebol (SAF)', 'Governança Corporativa e Compliance Empresarial', 'Princípios da transparência e responsabilidade corporativa, boas práticas de gestão, impacto da agenda ESG e normas regulatórias', 'Acordos de Sócios e Conflitos Societários', 'Direitos e deveres dos sócios, cláusulas contratuais estratégicas, resolução de conflitos e proteção da minoria societária', 'Transformação, Incorporação, Cisão e Fusão de Sociedades', 'Procedimentos, implicações jurídicas e desafios econômicos na reorganização empresarial', 'Contratos Empresariais e Documentação Societária', 'Estatutos sociais, atas, acordos de quotistas e contratos societários essenciais à formalização de empresas', 'Novas Perspectivas do Direito Societário – Impacto das startups, economia digital, Lei Geral de Proteção de Dados (LGPD) e inovações tecnológicas na estruturação empresarial']::text[]
where id = 1124 and cardinality(topics) = 1 and md5(topics[1]) = 'cbb9ad24a909e3578cbabb4469886b35'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1124);

update public.disciplines set topics = array['Fundamentos da teoria da computação e sua aplicação em linguagens formais', 'Estudo de autômatos e gramáticas regulares', 'Expressões regulares e reconhecimento de padrões', 'Máquinas de Turing e conceitos de decidibilidade', 'Construção de analisadores léxicos', 'Desenvolvimento de analisadores sintáticos', 'Técnicas de geração e otimização de código', 'Implementação de compiladores simplificados para experimentação prática']::text[]
where id = 1125 and cardinality(topics) = 1 and md5(topics[1]) = 'd9661495bea35af0fa69633008be0f8d'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1125);

update public.disciplines set topics = array['Teorias do poder e da dominação: legitimidade, autoridade e dominação legítima em Max Weber', 'Pensamento político contemporâneo: Escola de Frankfurt, Arendt, Foucault, Rawls, Levinas e críticas decoloniais', 'Filosofia política clássica e medieval: ideias fundamentais de Platão, Aristóteles, Santo Agostinho e Tomás de Aquino', 'Pesquisa em teoria política: métodos de investigação e produção científica aplicada ao pensamento político', 'Correntes do pensamento político ocidental: liberalismo, conservadorismo e socialismo em autores como Burke, Tocqueville, Mill, Marx e Hegel', 'Relações étnico-raciais e pensamento político: Crítica racial ao contrato social e à teoria política tradicional', 'Política comparada e desafios contemporâneos: sistemas políticos, mídias e atores, democracia digital, pós-verdade, populismos, vigilância e lutas identitárias', 'Fundamentos do Estado Moderno: contrato social, razão de Estado, soberania e direitos naturais nas teorias modernas']::text[]
where id = 1126 and cardinality(topics) = 1 and md5(topics[1]) = '8525588a523b0182f62e478ffa56b5cb'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1126);

update public.disciplines set topics = array['Teorias do poder e da dominação: legitimidade, autoridade e dominação legítima em Max Weber', 'Pensamento político contemporâneo: Escola de Frankfurt, Arendt, Foucault, Rawls, Levinas e críticas decoloniais', 'Filosofia política clássica e medieval: ideias fundamentais de Platão, Aristóteles, Santo Agostinho e Tomás de Aquino', 'Pesquisa em teoria política: métodos de investigação e produção científica aplicada ao pensamento político', 'Correntes do pensamento político ocidental: liberalismo, conservadorismo e socialismo em autores como Burke, Tocqueville, Mill, Marx e Hegel', 'Relações étnico-raciais e pensamento político: Crítica racial ao contrato social e à teoria política tradicional', 'Política comparada e desafios contemporâneos: sistemas políticos, mídias e atores, democracia digital, pós-verdade, populismos, vigilância e lutas identitárias', 'Fundamentos do Estado Moderno: contrato social, razão de Estado, soberania e direitos naturais nas teorias modernas']::text[]
where id = 1127 and cardinality(topics) = 1 and md5(topics[1]) = '8525588a523b0182f62e478ffa56b5cb'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1127);

update public.disciplines set topics = array['Teorias emergentes: Green Theory e Teoria Queer: sustentabilidade, direitos humanos e inclusão nas teorias internacionais', 'Pós-modernismo e realidades discursivas: desconstrução das teorias tradicionais e análise crítica do discurso nas RI', 'Teorias normativas em RI: justiça, ética, moralidade e os fundamentos normativos da política internacional', 'Estudos Críticos de raça e branquitude: racismo estrutural, linha global de cor e exclusão epistemológica nas RI', 'Feminismo nas Relações Internacionais: críticas feministas às teorias dominantes e perspectivas de gênero na segurança e poder', 'Teorias Pós-coloniais e Sul global: orientalismo, subalternidade e crítica à marginalização epistémica', 'Construtivismo e normas internacionais: a construção social da anarquia e o papel das ideias na política global', 'Teoria crítica e hegemonia nas Relações Internacionais: influência de Gramsci em Cox', 'conceito de hegemonia e crítica ao status quo']::text[]
where id = 1128 and cardinality(topics) = 1 and md5(topics[1]) = '8645c1991123d1836fba8dda668bb886'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1128);

update public.disciplines set topics = array['Mass Communication Research e Escola Norte-Americana', 'Os estudos culturais e a pesquisa sobre recepção, mediações e resistências nas mídias', 'Teoria crítica, materialismo histórico e a questão da cultura de massa', 'Comunicação contemporânea e dinâmicas de subjetividade e identidade', 'Ética da comunicação e estudos sobre comunicação não hegemônica', 'Métodos e técnicas da pesquisa em comunicação e mídias', 'Estudos midialógicos, de persuasão e dos efeitos de longo prazo das mídias', 'A comunicação, o saber científico e a cultura midiática']::text[]
where id = 1129 and cardinality(topics) = 1 and md5(topics[1]) = '5cdc4dd4b84077e36e93f60beab6382d'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1129);

update public.disciplines set topics = array['Públicos, Relacionamento e Gestão', 'Identidade, Imagem e Reputação', 'Tendências, Atualidades e Transformações nas Relações Públicas', 'Processos, Funções e Planejamento em RP', 'Diversidade, Acessibilidade e Inclusão', 'Técnicas e Instrumentos de Relações Públicas', 'Projeto de intervenção comunicacional relacionado a diversidade, engajamento, reputação ou participação social', 'Fundamentos, Teorias e Origem das Relações Públicas']::text[]
where id = 1130 and cardinality(topics) = 1 and md5(topics[1]) = '6a1a876ef1578543359b84699483548b'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1130);

update public.disciplines set topics = array['Fundamentos da terapia ocupacional em contextos hospitalares', 'Avaliação e intervenções centradas no paciente considerando diferentes contextos socioculturais', 'Integração de práticas integrativas e complementares ao plano terapêutico ocupacional', 'Processos patológicos e repercussões funcionais no desempenho ocupacional', 'Análise das atividades de vida diária e participação ocupacional em ambiente hospitalar', 'Abordagens teóricas e práticas integrativas e complementares aplicadas ao cuidado hospitalar', 'ambiente hospitalar', 'Processos patológicos e repercussões funcionais no desempenho ocupacional', 'Estudo das alterações sensório-motoras, perceptivas e cognitivas em pacientes hospitalizados', 'Estratégias terapêuticas baseadas em recursos e atividades voltadas à reabilitação']::text[]
where id = 1131 and cardinality(topics) = 1 and md5(topics[1]) = '3b48e105d9cf654e9718c33477338d07'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1131);

update public.disciplines set topics = array['Avaliação e intervenção centradas no sujeito, considerando diversidade sociocultural e evidências científicas', 'Abordagens cognitiva-comportamental, psicodinâmica, sistêmica e psicossocial aplicadas à prática terapêutica', 'Fundamentos da Terapia Ocupacional em saúde mental e atenção psicossocial', 'Historicidade da doença mental e transformações nos modelos de cuidado', 'Processos patológicos, repercussões funcionais e alterações cognitivas e psicossociais', 'Análise das atividades de vida diária, trabalho, lazer e brincar em sujeitos com adoecimento psíquico', 'Recursos terapêuticos e práticas expressivas voltadas à promoção de autonomia e participação social', 'Linguagens e processos criativos como recursos terapêuticos na reabilitação psicossocial']::text[]
where id = 1132 and cardinality(topics) = 1 and md5(topics[1]) = '7922534739aa774c50af34d597f40fe5'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1132);

update public.disciplines set topics = array['Práticas integradoras entre saúde, território, redes de serviços, políticas públicas e comunidade', 'Cotidiano como eixo estruturante das práticas terapêuticas ocupacionais', 'Processos patológicos prevalentes e impactos no desempenho ocupacional na Atenção Básica e no campo social', 'Planejamento, monitoramento e avaliação das ações e grupos terapêuticos ocupacionais em diferentes contextos socioculturais', 'Recursos terapêuticos e estratégias centradas no cotidiano para promoção de saúde, prevenção de agravos e inclusão social', 'Abordagens das atividades de vida diária, trabalho, lazer e participação social em diferentes contextos socioculturais', 'Fundamentos da Terapia Ocupacional na Atenção Básica, no cuidado territorial e no contexto social', 'Intervenções terapêuticas individuais e grupais voltadas a alterações sensório-motoras, cognitivas, perceptivas e psicossociais. 7']::text[]
where id = 1133 and cardinality(topics) = 1 and md5(topics[1]) = '51aa80358260309436876580b147f886'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1133);

update public.disciplines set topics = array['Recursos terapêuticos e estratégias de intervenção para promoção de participação, autonomia e inclusão escolar', 'Desenvolvimento físico, sensório-motor, cognitivo, psicossocial e suas repercussões no desempenho ocupacional', 'Fundamentos da atenção integral à saúde da criança e do adolescente em diferentes contextos de vida', 'O brincar e o lúdico como eixos centrais das práticas terapêuticas ocupacionais no desenvolvimento infantojuvenil', 'Planejamento e avaliação das intervenções terapêuticas ocupacionais em contextos domiciliares, comunitários, escolares e de saúde', 'Transtornos psíquicos, psicossociais, cognitivos e alterações sensório-perceptuais e do movimento na infância e adolescência', 'Atividades de vida diária, lazer, brincar e participação escolar em diferentes realidades socioculturais', 'Abordagens neuroevolutivas e biomecânicas aplicadas à intervenção terapêutica ocupacional']::text[]
where id = 1134 and cardinality(topics) = 1 and md5(topics[1]) = 'b854856756f9d68fe8a87f0720b7cc74'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1134);

update public.disciplines set topics = array['Analisar como a tecnologia assistiva contribui para autonomia, funcionalidade e participação ocupacional', 'Planejar intervenções baseadas em evidências voltadas à reabilitação profissional e inclusão social', 'Selecionar e aplicar métodos, órteses e recursos terapêuticos adequados ao perfil e necessidades da pessoa com deficiência', 'Compreender os fundamentos da atuação da Terapia Ocupacional na saúde da pessoa com deficiência']::text[]
where id = 1135 and cardinality(topics) = 1 and md5(topics[1]) = '4930b50b36462ab70f480b540610c195'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1135);

update public.disciplines set topics = array['Perspectivas contemporâneas e tendências futuras na Terapia Ocupacional', 'Fundamentos históricos da Terapia Ocupacional e seus paradigmas constitutivos', 'Relação entre ciência, profissão e práticas emergentes em Terapia Ocupacional', 'Deontologia e responsabilidade profissional na Terapia Ocupacional', 'Conceitos estruturantes da prática terapêutica ocupacional e seus modelos teóricos', 'Fundamentos éticos da prática profissional', 'Bases científicas e epistemológicas da Terapia Ocupacional', 'Aspectos legais e regulamentação da profissão no Brasil']::text[]
where id = 1136 and cardinality(topics) = 1 and md5(topics[1]) = '00704974dd84e84c41ebe34d69e9aacb'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1136);

update public.disciplines set topics = array['Tipos, estilos e níveis de tomada de decisão', 'Níveis de tomada de decisão em uma organização', 'Abordagem da economia comportamental envolvendo processos decisórios, heurísticos e vieses e impactos', 'Etapas do processo decisório', 'Ferramentas para mapeamento e diagnóstico de um problema', 'Ferramentas quantitativas', 'Estatística descritiva', 'Ferramentas qualitativas', 'Dado, informação e conhecimento', 'Gestão do conhecimento e seu papel para a tomada de decisão', 'Business intelligence, big data, data mining e sistema de informações gerenciais', 'A importância da informação e da comunicação no ambiente da tomada de decisão', 'Ferramentas para selecionar e avaliar', 'Gestão de riscos para a tomada de decisão', 'Processo de negociação', 'Teoria da agência', 'Principais indicadores de desempenho organizacional', 'BSC como ferramenta para a avaliação de desempenho organizacional', 'Governança corporativa e de informações']::text[]
where id = 1137 and cardinality(topics) = 1 and md5(topics[1]) = '6c3ab6e31b8188296b1fb0d3847fb380'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1137);

update public.disciplines set topics = array['Integração de conteúdos transversais relacionados à ética, aos Direitos Humanos', 'Consolidação metodológica e desenvolvimento do Trabalho de Conclusão de Curso', 'Preparação, apresentação e defesa do Trabalho de Conclusão de Curso de Jornalismo', 'Coleta de dados, análise crítica, execução e finalização do trabalho']::text[]
where id = 1138 and cardinality(topics) = 1 and md5(topics[1]) = '169a40a89551efb2b98579c0f55f3718'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1138);

update public.disciplines set topics = array['Problema de pesquisa, definição de hipóteses e objetivos e delimitação de tema e objeto de estudo alinhado ao campo da Comunicação', 'Os Direitos Humanos atrelados à pesquisa e/ou na construção de objetos comunicacionais', 'Execução e entrega do projeto com fundamentação teórica, justificativa, metodologia e planejamento preliminar para execução', 'A natureza do trabalho de conclusão de curso (TCC) e sua regulamentação para o curso de Jornalismo']::text[]
where id = 1139 and cardinality(topics) = 1 and md5(topics[1]) = '49dd223b42e02ad09276569985619122'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1139);

update public.disciplines set topics = array['Desenvolver um projeto de pesquisa', 'Interpretar de forma crítica artigos, monografia e dissertações', 'Redigir um trabalho escrito com base nos conceitos científicos e rigor metodológico', 'Empregar os princípios da ética e da bioética em pesquisa', 'Elaborar projetos de pesquisa bibliográfica, laboratorial ou clínica', 'Empregar métodos e técnicas de investigação científica', 'Apresentar trabalho de pesquisa para uma banca julgadora', 'Realizar levantamento de base literária que se relacione com a pesquisa']::text[]
where id = 1140 and cardinality(topics) = 1 and md5(topics[1]) = '9e2f83fc13a5977405002163a9b18634'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1140);

update public.disciplines set topics = array['Fases da elaboração de trabalho científico e/ou tecnológico', 'Tipos de pesquisa e delineamento do método', 'Seleção de referências e formas de citação', 'Regras para formatação de trabalho científico', 'Comunicação científica: publicação e apresentação']::text[]
where id = 1141 and cardinality(topics) = 1 and md5(topics[1]) = '2e3b42ef632c7bc231aa6d04f81fc860'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1141);

update public.disciplines set topics = array['Planejamento e Investigação', 'Processos Criativos da Produção', 'Desenvolvimento da Produção', 'Produção Científica e Produção Experimental']::text[]
where id = 1142 and cardinality(topics) = 1 and md5(topics[1]) = '5b9b0333da069099e6bbf79acd12c2a1'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1142);

update public.disciplines set topics = array['Públicos, Relacionamento e Gestão', 'Identidade, Imagem e Reputação', 'Tendências, Atualidades e Transformações nas Relações Públicas', 'Processos, Funções e Planejamento em RP', 'Diversidade, Acessibilidade e Inclusão', 'Técnicas e Instrumentos de Relações Públicas', 'Projeto de intervenção comunicacional relacionado a diversidade, engajamento, reputação ou participação social', 'Fundamentos, Teorias e Origem das Relações Públicas']::text[]
where id = 1143 and cardinality(topics) = 1 and md5(topics[1]) = '6a1a876ef1578543359b84699483548b'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1143);

update public.disciplines set topics = array['Empregar os princípios da ética e da bioética em pesquisa', 'Empregar métodos e técnicas de investigação científica', 'Realizar levantamento de base literária que se relacione com a pesquisa', 'Apresentar trabalho de pesquisa para uma banca julgadora', 'Interpretar de forma crítica artigos, monografia e dissertações', 'Elaborar projetos de pesquisa bibliográfica, laboratorial ou clínica', 'Desenvolver um projeto de pesquisa', 'Redigir um trabalho escrito com base nos conceitos científicos e rigor metodológico']::text[]
where id = 1144 and cardinality(topics) = 1 and md5(topics[1]) = 'bedaed664f2c639545315d9df629f8d1'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1144);

update public.disciplines set topics = array['Processos de transferência de massa por convecção em diferentes regimes de escoamento', 'Transferência de massa entre fases em sistemas gás-líquido, líquido-líquido e sólido-fluido', 'Mecanismos de transferência de massa por difusão molecular e turbulenta', 'Integração dos princípios de transferência de massa a processos industriais sustentáveis e eficientes', 'Modelos de resistência em série e de equilíbrio de fases', 'Introdução aos conceitos fundamentais de transferência de massa e suas aplicações na engenharia', 'Aplicação de números adimensionais na análise e correlação de fenômenos de transporte', 'Equações diferenciais da difusão e soluções analíticas e numéricas']::text[]
where id = 1145 and cardinality(topics) = 1 and md5(topics[1]) = '75219c84b4514404df8958226b6febd9'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1145);

update public.disciplines set topics = array['Fundamentos da biossegurança e controle de infecção aplicados à prática cirúrgica odontológica', 'Técnicas de paramentação e montagem da mesa cirúrgica', 'Avaliação pré-operatória e exame clínico para planejamento de procedimentos cirúrgicos', 'Princípios e manobras fundamentais da cirurgia odontológica - diérese, exérese, hemostasia e síntese - associados às exodontias simples e complexas e outros tratamentos cirúrgicos em odontologia', 'Prescrição farmacológica com ênfase no controle da dor pós-operatória, infecções odontogênicas', 'Manejo farmacológico e não farmacológico de emergências médicas em odontologia', 'Abordagem de acidentes e complicações em cirurgia oral, infecções odontogênicas, cistos e tumores odontogênicos e traumatologia bucomaxilofacial .pré-protéticas reconstrutivas e fundamentos de implantodontia', 'Considerações éticas e legais em cirurgias odontológicas', 'Atendimento clínico-cirúrgico ambulatorial de baixa complexidade', 'Diagnóstico e planejamento cirúrgico a partir de exames de imagem']::text[]
where id = 1146 and cardinality(topics) = 1 and md5(topics[1]) = '93451da1617551fe0f2be33082e60bf4'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1146);

update public.disciplines set topics = array['Procedimentos gerais de avaliação: entrevistas, testes, relógios de atividades, histórico ocupacional e observação', 'Avaliação do indivíduo em atividade considerando fases do desenvolvimento humano e contextos socioculturais', 'Análise de atividade e ocupação humana', 'Conceitos de testar, avaliar e medir na prática da Terapia Ocupacional', 'Raciocínio Clínico em Terapia Ocupacional fundamentado em evidências científicas', 'Finalidades dos testes e análise das propriedades psicométricas dos instrumentos avaliativos', 'Aplicação e seleção de instrumentos para subsidiar o raciocínio clínico e tomada de decisão na Terapia Ocupacional', 'Prática clínica e estudos de caso com ênfase em testes e instrumentos para avaliação das AVDs, trabalho, lazer e brincar']::text[]
where id = 1148 and cardinality(topics) = 1 and md5(topics[1]) = '3ec31ec2bb4fd166311d970fdf51729d'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1148);

update public.disciplines set topics = array['Fundamentos da Análise de Dados', 'Estatística Descritiva e Análise Exploratória de Dados', 'Visualização de Dados e Ferramentas Interativas', 'Machine Learning para Predição e Séries Temporais', 'Machine Learning para Classificação e Agrupamento', 'Teoria da Decisão e Métodos Multicritério', 'Análise de Risco e Simulação de Incertezas', 'Ética e Desafios na Tomada de Decisão com Dados']::text[]
where id = 1149 and cardinality(topics) = 1 and md5(topics[1]) = 'f0c04ebd88a959b03059f4239031c829'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1149);

update public.disciplines set topics = array['Procedimentos de Manejo de Cordados', 'Espécies de Interesse em Saúde', 'Fisiologia Comparada de Cordados Aplicada ao Manejo', 'Estratégias de Conservação da Fauna', 'Zoologia e Impactos Socioambientais', 'Educação Ambiental', 'Fauna urbana, impacto humano e práticas sustentáveis de manejo', 'História da Pesquisa em Zoologia']::text[]
where id = 1150 and cardinality(topics) = 1 and md5(topics[1]) = 'c0aa0c9ccb4559d4d5daea06e29ec800'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1150);

update public.disciplines set topics = array['Ecdysozoa: diversidade e adaptações evolutivas', 'Invertebrados Basais: morfologia e fisiologia comparada', 'Protozoa e origens dos Metazoários', 'Relações Étnico-Raciais', 'Cordados Amniota: anatomia, fisiologia e embriologia comparada', 'Cordados Basais: evolução e características gerais', 'A fauna na perspectiva afro-indígena: etnozoologia e saberes ancestrais', 'Princípios de Filogenia e Sistemática Zoológica']::text[]
where id = 1151 and cardinality(topics) = 1 and md5(topics[1]) = '6d8129543b5d88b8d413d341b82a54f2'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1151);

update public.disciplines set topics = array['Conceitos fundamentais e princípios da deontologia jurídica', 'Ética na advocacia e o papel social do advogado', 'Estatuto da Advocacia e da OAB (Lei nº 8.906/1994)', 'Código de Ética e Disciplina da OAB', 'Regulamento Geral do Estatuto da Advocacia e da OAB', 'Ética, deveres e funções da magistratura', 'Lei Orgânica da Magistratura Nacional (LOMAN) e a ética judicial', 'Ética no Ministério Público e a Lei Orgânica do Ministério Público']::text[]
where id = 1152 and cardinality(topics) = 1 and md5(topics[1]) = '39ce0e912cbe93df0932f3c41f8d1dd9'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1152);

update public.disciplines set topics = array['Introdução aos conceitos básicos de física, estabelecendo um nivelamento de conteúdo de grandezas escalares e vetoriais, termologia, teoria eletricidade e do magnetismo relacionando o ponto de vista teó- rico com o prático', 'Fundamentação dos métodos matemáticos associados aos fenômenos físicos e quí- micos']::text[]
where id = 1153 and cardinality(topics) = 1 and md5(topics[1]) = '3fc9ebe43adb6579e222e67109ba844b'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1153);

update public.disciplines set topics = array['Funções químicas inorgânicas', 'Ligações químicas', 'Geometria molecular', 'Teorias de ligação', 'Forças intermoleculares']::text[]
where id = 1154 and cardinality(topics) = 1 and md5(topics[1]) = 'f64d3b7634fe8db55799965fa16ed5f5'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1154);

update public.disciplines set topics = array['Estudo dos conceitos de ética, moral, cidadania e suas inter-relações, bem como das relações étnico- raciais', 'Discussão dos temas fundamentais da ética norteada pelos princípios da cosmovisão calvi- nista', 'Reflexão e análise crítica das teorias ético-normativas mais sublinhadas na atualidade e suas implicações práticas', 'Estabelecimento e identificação de pontos de contato entre a ética calvinista e as demais áreas do conhecimento']::text[]
where id = 1156 and cardinality(topics) = 1 and md5(topics[1]) = 'e5a1d93c26fc844b60065e2b03a6a738'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1156);

update public.disciplines set topics = array['Definição de Marketing', 'Necessidades e Desejos', 'Valor, Custo e Satisfação do cliente', 'Variáveis Incontroláveis', 'Análise do ambiente Interno e Externo', 'Stakeholders', 'Composto Mercadológico (4ps)', 'Funções do Marketing', 'Controle de Marketing']::text[]
where id = 1157 and cardinality(topics) = 1 and md5(topics[1]) = '63646802c1c2201739da64aad3114f6b'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1157);

update public.disciplines set topics = array['Definições de empreendedorismo e inovação', 'A importância socioeconômica do empreendedorismo inovador', 'Tipos de inovação (incremental e de ruptura) e impactos nas atividades empresariais e na economia', 'Mudanças, crises e riscos de negócio', 'Características do empreendedor de sucesso', 'Processo comportamental', 'Fatores que influenciam o empreendedorismo', 'Fases da evolução das empresas', 'Empresas de pequeno, médio e grande porte', 'Como alavancar e estruturar negócios inovadores']::text[]
where id = 1158 and cardinality(topics) = 1 and md5(topics[1]) = '3c7483ddf0495887c26b49bb452761a8'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1158);

update public.disciplines set topics = array['Abordagem básica do Pensamento Administrativo: teorias clássicas da administração até teoria dos sistemas', 'Funções do administrador', 'Processos principais e de apoio, fluxograma, ferramentas e indicadores de desempenho', 'Estudo de Caso']::text[]
where id = 1159 and cardinality(topics) = 1 and md5(topics[1]) = 'e7869f6063919362b5fc62b73e43940b'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1159);

update public.disciplines set topics = array['Conjuntos Numéricos', 'Regras de Três', 'Frações', 'Porcentagem', 'Potenciação e Notação Científica', 'Radiciação', 'Logaritmos', 'Polinômios', 'Fatoração e Produtos Notáveis', 'Equações e inequações do 1o. e 2o. Graus']::text[]
where id = 1160 and cardinality(topics) = 1 and md5(topics[1]) = 'af5c83cb190c4b492d98cded5bc263d9'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1160);

update public.disciplines set topics = array['Ortografia, acentuação gráfica, sintaxe e semântica', 'Mecanismos de coesão e coerência, tipologia textual e gêneros textuais', 'Comunicação interna e externa, formal e informal nas organizações', 'Variações linguísticas', 'Gêneros primários e secundários: definição, particularidades, veículos de circulação, público-alvo, finalidade, intencionalidade, textualidade e intertextualidade']::text[]
where id = 1161 and cardinality(topics) = 1 and md5(topics[1]) = 'febdfe55ae683757c1ebb9a9beb750aa'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1161);

update public.disciplines set topics = array['Introdução às habilidades de compreensão e produção oral e escrita por meio de funções comunicativas e estruturas simples da língua', 'Ênfase na oralidade, atendendo às especificidades da área e abordando aspectos sócio-culturais']::text[]
where id = 1162 and cardinality(topics) = 1 and md5(topics[1]) = '56119d5c6a07c3d724e19b2d3815d4d0'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1162);

update public.disciplines set topics = array['Princípios de sistemas computacionais, representação binária, memória e endereçamento, compiladores', 'Tipos de dados básicos e representações gráficas dos principais comandos nas linguagens procedurais', 'Conceitos básicos sobre algoritmos e métodos para sua construção', 'Tipos de dados e variáveis', 'Operadores lógicos', 'Estruturas fundamentais de programas: sequencial, condicional e com repetição', 'Estilo de codificação, indentação, legibilidade, comentários', 'Testes de mesa e unitários', 'Funções', 'Variáveis compostas homogêneas: vetores e matrizes', 'Conceitos de controle de versão e gestão de código fonte', 'Criação de repositórios locais e remotos', 'Envio (Commit) e resgate de versões, Checkin e Checkout']::text[]
where id = 1163 and cardinality(topics) = 1 and md5(topics[1]) = 'b55fb985c3c5c0179810f9749323888f'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1163);

update public.disciplines set topics = array['Linguagem de marcação de hipertexto para estruturação de conteúdo', 'Tecnologias para estilização de conteúdo', 'Esquemas de posicionamento', 'Construção de layout', 'Framework para desenvolvimento responsivo e página única', 'Noções de linguagens de script aplicadas à interatividade do usuário com um Front-End', 'Processamento script lado cliente/servidor', 'Biblioteca Javascript cross-browser', 'Sistemas de gestão de configuração de código-fonte', 'Utilização de servidores de desenvolvimento para implantação local de sistemas web', 'Controle de versionamento']::text[]
where id = 1164 and cardinality(topics) = 1 and md5(topics[1]) = 'd2b87b5b2797dd1cf002a650ef4f6ba8'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1164);

update public.disciplines set topics = array['Conceitos de Design Gráfico aplicado à construção de aplicativos e sites', 'Softwares para edição e tratamento de imagens estáticas e em movimento', 'Teoria das Cores', 'Composição', 'Tipografia', 'Definição de formatos, resolução, tamanho de imagens', 'Recursos para a criação/manipulação de imagens para a construção de botões, banners, logomarca', 'Direitos Autorais e Direitos de Uso de elementos visuais (imagem, desenho, animação, vídeo, áudio, entre outros.)', 'Planejamento visual e layout', 'Desenvolvimento do layout', 'Grid (grade) de meios impressos e digitais']::text[]
where id = 1165 and cardinality(topics) = 1 and md5(topics[1]) = '382bd76a58c2946dc7378189c4e39130'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1165);

update public.disciplines set topics = array['Introdução à Análise de Sistemas', 'Modelos de Ciclo de Vida de Software', 'Modelos de Processos de Desenvolvimento de Software (Modelo em Cascata, Espiral e Prototipagem)', 'Definição e classificação de Requisitos de Software (funcionais e não funcionais)', 'Técnicas de Levantamento de Requisitos', 'Modelo de Negócios aplicado ao levantamento de Requisitos (Canvas)', 'Estudo de Viabilidade', 'Técnicas de documentação', 'Metodologias para desenvolvimento de sistemas']::text[]
where id = 1166 and cardinality(topics) = 1 and md5(topics[1]) = 'f9c0947659f438ab1a2dfc7e5f0f0973'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1166);

update public.disciplines set topics = array['Evolução dos sistemas de informação e dos bancos de dados', 'Modelos de dados: Redes, Hierárquicos, Relacional, Orientado a objetos e Objeto-relacional', 'Conceitos de Base de Dados', 'Objetivos dos bancos de dados', 'Estudo dos modelos de dados Conceitual, lógico e físico', 'Projeto de Banco de Dados Relacional com uso da abordagem Entidade-Relacionamento', 'Álgebra Relacional', 'Introdução à Linguagem de declaração e manipulação de dados', 'Teoria relacional: dependências funcionais e formas normais (1ª, 2ª e 3ª forma normal)', 'Conceitos de Sistemas Gerenciadores de Banco de Dados']::text[]
where id = 1167 and cardinality(topics) = 1 and md5(topics[1]) = 'b9ca54cd17c04138e137ce03ff82743a'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1167);

update public.disciplines set topics = array['Introdução ao projeto de concepção e manufatura de produtos', 'Princípios de desenvolvimento integrado de produtos', 'Etapas do desenvolvimento de produtos: Projeto informacional, projeto conceitual e projeto detalhado', 'Fundamentos de planejamento, acompanhamento e controle de projetos (MS Project: Estrutura Analítica de Projeto, Diagrama de Grantt, recursos)', 'Introdução às técnicas e ferramentas para a concepção de produtos (conceitos de Fablab e Movimento Maker)', 'Processos de fabricação utilizando ferramentas manuais e prototipagem rápida (Impressora 3D)', 'Desenvolvimento de projeto integrado: Desenvolver projeto multidisciplinar, utilizando ferramentas manuais, dispositivos e ferramentas do Movimento Maker e criação ou melhoria de um produto, utilizando as abordagens apresentadas ao longo do semestre']::text[]
where id = 1168 and cardinality(topics) = 1 and md5(topics[1]) = '08a23af6dfffb9fa4aa745480535d364'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1168);

update public.disciplines set topics = array['Conjuntos numéricos', 'Equações e inequações', 'Operações com frações', 'Potenciação e Radiciação', 'Funções', 'Tipos de funções', 'Funções lineares', 'Funções Exponenciais', 'Funções Logarítmicas', 'Funções Trigonométricas', 'Funções Quadráticas', 'Funções Periódicas', 'Representação gráfica de funções', 'Matrizes e determinantes']::text[]
where id = 1169 and cardinality(topics) = 1 and md5(topics[1]) = '0e4e00d40e5a381da29d648dd7e19b5a'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1169);

update public.disciplines set topics = array['Introdução ao desenho técnico e desenho geométrico', 'Normas técnicas de desenho', 'Papéis para Desenho: tipos, gramatura, formato, matéria-prima', 'Instrumentos para a confecção de desenhos: réguas, gabaritos, esquadros, compasso', 'Como dobrar um desenho técnico', 'Construções Geométricas: perpendiculares e paralelas, mediatriz, bissetriz, divisão em partes iguais, polígonos, tangente e concordância, elipse, divisão de circunferência, planificação, figuras e sólidos geométricos', 'Caligrafia técnica', 'Sistemas de representação', 'Desenho projetivo', 'Projeção cilíndrica ortogonal', 'Cotagem', 'Escala', 'Sinais convencionais e supressão de vistas', 'Desenho em esboço', 'Tolerâncias dimensionais', 'Desenho de Conjuntos', 'Leitura e interpretação de desenhos']::text[]
where id = 1170 and cardinality(topics) = 1 and md5(topics[1]) = '8a1a003f84973240027ad3888ec1dc0a'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1170);

update public.disciplines set topics = array['Visão geral sobre aplicativos de informática', 'Utilização de recursos avançados de planilhas eletrônicas (macros, funções, fórmulas, taxas, formulários, gráficos avançados e tabelas dinâmicas) e suas aplicações na indústria']::text[]
where id = 1171 and cardinality(topics) = 1 and md5(topics[1]) = '89a47d7356cef44c62078c440138e29a'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1171);

update public.disciplines set topics = array['As Funções da Linguagem na Expressão e na Comunicação', 'Linguagem e Comunicação: Problemas Gerais', 'Desenvolvimento de Relatório Técnico: estrutura básica', 'tipos de relatório', 'normatização de trabalhos escritos de acordo com as normas da ABNT', 'Editor de textos e de apresentações gráficas: regras de estruturação', 'Técnicas de Apresentação']::text[]
where id = 1172 and cardinality(topics) = 1 and md5(topics[1]) = '7b4e112af5389c08d75b8b3d8e02552f'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1172);

update public.disciplines set topics = array['Introdução às habilidades de compreensão e produção oral e escrita por meio de funções sociais e estruturas simples da língua', 'Ênfase na oralidade, atendendo às especificidades acadêmico-profissionais da área e abordando aspectos socioculturais da língua inglesa']::text[]
where id = 1173 and cardinality(topics) = 1 and md5(topics[1]) = 'd632f5f635dfa7702c90ab9d7706e537'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1173);

update public.disciplines set topics = array['Teoria atômico-molecular', 'Periodicidade química', 'Estados físicos da matéria, transformações e propriedades', 'Ligações químicas, Teorias ácido-base', 'Principais funções inorgânicas', 'Reações químicas', 'Oxirredução', 'Estudo dos gases', 'Estequiometria de reações', 'Dispersões e soluções']::text[]
where id = 1174 and cardinality(topics) = 1 and md5(topics[1]) = '7da562b6a7e669d6f0c5ede6379c5048'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1174);

update public.disciplines set topics = array['Fundamentos da administração: conceito e importância para o curso', 'Teoria geral da administração: conceitos e métodos', 'A administração contemporânea', 'Funções da administração: planejamento, organização, direção e controle', 'Planejamento: estratégico, tático e operacional', 'Estruturas organizacionais', 'Liderança, comunicação e motivação', 'Cultura organizacional', 'Mudanças organizacionais', 'Ética e responsabilidade socioambiental', 'Fundamentos de empreendedorismo', 'Novos modelos de negócio']::text[]
where id = 1175 and cardinality(topics) = 1 and md5(topics[1]) = '3417945f13932792ee3fa3dbbfb949cc'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1175);

update public.disciplines set topics = array['Fundamentos da administração: conceito e importância para o curso', 'Teoria geral da administração: conceitos e métodos', 'A administração contemporânea', 'Funções da administração: planejamento, organização, direção e controle', 'Planejamento: estratégico, tático e operacional', 'Estruturas organizacionais', 'Liderança, comunicação e motivação', 'Cultura organizacional', 'Mudanças organizacionais', 'Ética e responsabilidade socioambiental', 'Fundamentos de empreendedorismo', 'Novos modelos de negócio']::text[]
where id = 1176 and cardinality(topics) = 1 and md5(topics[1]) = '3417945f13932792ee3fa3dbbfb949cc'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1176);

update public.disciplines set topics = array['Conceituação de Língua, Linguagem e Competências Comunicativas', 'Elementos da Comunicação e Funções da Linguagem', 'Conceitos e aplicações da Informação e Comunicação no contexto da área de atuação do curso', 'A noção de texto e a importância da leitura e da escrita na construção da comunicação', 'Tipologias e gêneros textuais', 'Produção textual em plataformas digitais', 'Técnicas de apresentação oral', 'Comunicação visual e intercultural', 'Princípios da comunicação empática, da ética e do respeito às diferenças']::text[]
where id = 1177 and cardinality(topics) = 1 and md5(topics[1]) = 'f18600bf219d0fff9daf629bd303206f'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1177);

update public.disciplines set topics = array['Ciência do direito, estatuto teórico', 'Fontes do direito', 'Interpretação', 'Direito constitucional', 'Direito administrativo', 'Direito civil', 'Teoria geral do direito empresarial e relação laboral (atividade empresarial', 'regime jurídico da livre iniciativa', 'registro de empresa', 'livros comerciais', 'estabelecimento empresarial', 'nome empresarial', 'propriedade industrial', 'o empresário e os direitos do consumidor)', 'Direito societário (teoria geral do direito societário', 'constituição das sociedades contratuais', 'sócio da sociedade contratual', 'sociedades contratuais menores', 'sociedade limitada', 'dissolução de sociedade contratual', 'sociedades por ações', 'tratamento tributário)', 'Direito cambiário (teoria geral do direito cambiário', 'letra de câmbio', 'constituição do crédito cambiário', 'exigibilidade do crédito cambiário', 'nota promissória', 'cheque', 'duplicatas', 'títulos de crédito impróprios e títulos de crédito eletrônicos)', 'Noções de Direito Falimentar', 'Contratos mercantis (teoria geral dos contratos', 'compra e venda mercantil', 'contratos de colaboração', 'contratos bancários', 'contratos intelectuais', 'seguro)', 'Noções de propriedade intelectual']::text[]
where id = 1178 and cardinality(topics) = 1 and md5(topics[1]) = '73b804dd8af41cc0946b4be1f536f310'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1178);

update public.disciplines set topics = array['Introdução às habilidades de compreensão e produção oral e escrita por meio de funções comunicativas e estruturas léxico-gramaticais simples da língua e apropriação de estratégias de aprendizagem (estratégias de leitura, compreensão e de produção oral e escrita) visando à comunicação nos contextos pessoal, acadêmico e profissional, considerando aspectos socioculturais dos falantes da língua']::text[]
where id = 1179 and cardinality(topics) = 1 and md5(topics[1]) = '3bd85635cc6f8a948282d9fa49f84fdd'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1179);

update public.disciplines set topics = array['Relações e Funções', 'Operações com expressões numéricas e algébricas', 'Razão, proporção e porcentagem', 'Operações aplicadas ao comércio exterior', 'Matemática Financeira: juros simples e compostos', 'Séries de pagamentos, equivalência de capitais, taxas, descontos e sistemas de amortização de empréstimos', 'Noções intuitivas de limites e derivadas']::text[]
where id = 1180 and cardinality(topics) = 1 and md5(topics[1]) = '05fd09fd1286474edfe7f5e42ffbf460'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1180);

update public.disciplines set topics = array['O Papel da ciência e da tecnologia', 'Tipos de conhecimento', 'Método e técnica', 'Planejamento e desenvolvimento da pesquisa: coleta das informações, organização e análise', 'Trabalhos acadêmicos: tipos, características e composição estrutural', 'O projeto de pesquisa experimental e não-experimental', 'Pesquisa científica e tecnológica, pesquisa qualitativa e quantitativa', 'Pesquisas e pensamentos inter, multi e transdisciplinar', 'Ferramentas de produção em processador de textos', 'Apresentação gráfica dos diferentes trabalhos', 'Normas da ABNT, citações e bibliografias', 'Valores éticos e princípios de direitos autorais', 'Ferramentas para identificação de plágio']::text[]
where id = 1181 and cardinality(topics) = 1 and md5(topics[1]) = '6a5b21285537a4cadafb6cf6cb2e4b3c'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1181);

update public.disciplines set topics = array['Características das operações logísticas essenciais, incluindo armazenagem e transporte', 'Principais impactos sociais e desafios logísticos relacionados às demandas regionais e suas possíveis soluções']::text[]
where id = 1182 and cardinality(topics) = 1 and md5(topics[1]) = '603e82e5e62de99726d649fa6a6595b1'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1182);

update public.disciplines set topics = array['Introdução aos conceitos e definições básicas da logística', 'História e objetivo da logística', 'Introdução nas áreas de atuação: compras, armazenagem, embalagem, transporte e tráfego, gestão da cadeia de suprimentos', 'Custos Logísticos', 'Logística e sua relação com o serviço ao cliente', 'Logística Humanitária', 'Logística internacional', 'Logística Reversa', 'Logística Enxuta', 'Logística como diferencial competitivo', 'Os canais de distribuição física, características e suas funções', 'Logística de primeira milha', 'Logística de média milha', 'Logística de última milha', 'Introdução às tendências em Logística, Introdução aos Impactos da Logística na Sustentabilidade']::text[]
where id = 1183 and cardinality(topics) = 1 and md5(topics[1]) = '6e1f12d8619a71f96e60dc5d7789b8b2'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1183);

update public.disciplines set topics = array['Conceitos e funções Administrativas', 'Métodos de análise de problemas, aplicabilidade de estudos de caso para tomada de decisão', 'Governança das organizações']::text[]
where id = 1184 and cardinality(topics) = 1 and md5(topics[1]) = 'eb3dceb9a855c0f33a312459401fc1f4'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1184);

update public.disciplines set topics = array['Conceitos de cálculos numéricos', 'Relações e Funções', 'Álgebra Linear: Matrizes e Determinantes', 'Sistemas Lineares', 'Aplicação de razões, proporções, áreas e volumes em situações práticas']::text[]
where id = 1185 and cardinality(topics) = 1 and md5(topics[1]) = 'e0574d5ddf8da2b7d8be42b6ae3e864d'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1185);

update public.disciplines set topics = array['O Papel da ciência e da tecnologia', 'Tipos de conhecimento', 'Método e técnica', 'Planejamento e desenvolvimento da pesquisa: coleta das informações, organização e análise', 'Trabalhos acadêmicos: tipos, características e composição estrutural', 'O projeto de pesquisa experimental (desenvolvimento de experimento), pesquisa aplicada, pesquisa científica e tecnológica, pesquisa qualitativa e quantitativa', 'Pesquisas e pensamentos multi, trans e interdisciplinar', 'Editores eletrônicos de textos', 'Apresentação gráfica dos diferentes trabalhos', 'Normas da ABNT, citações e bibliografias', 'Valores éticos e princípios de direitos autorais', 'Leis e ferramentas antiplágio']::text[]
where id = 1186 and cardinality(topics) = 1 and md5(topics[1]) = '4a6eadbd1a2e7da23f23efdae0014e4d'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1186);

update public.disciplines set topics = array['Introdução ao editor de texto e ao editor de apresentação', 'Planilhas eletrônicas, criação e gerenciamento de planilhas, gráficos e dados, uso de operadores, funções, fórmulas e tabelas dinâmicas', 'Ferramentas de Fluxogramas e Diagramas para situações empresariais']::text[]
where id = 1187 and cardinality(topics) = 1 and md5(topics[1]) = 'b44f6097cd62abee645a3933627e8aad'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1187);

update public.disciplines set topics = array['Informação e Comunicação: conceitos e aplicações no contexto comunicativo da área de atuação do curso', 'Conceituação de Língua, Linguagem e Competências Comunicativas', 'Elementos da Comunicação e Funções da Linguagem', 'Reconhecimento de diferentes contextos de uso da língua no processo de leitura e produção textual', 'Técnicas de apresentação Oral', 'Princípios da comunicação empática, da ética e do respeito às diferenças', 'Tipologias e gêneros textuais: definições, contextos, finalidades, textualização, intertextualização, multissemiose, multimodalidade, transmidiatismo e multiletramento, voltados à área de formação']::text[]
where id = 1188 and cardinality(topics) = 1 and md5(topics[1]) = '4a651f7206b999d141546fc2b05555f3'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1188);

update public.disciplines set topics = array['Introdução às habilidades de compreensão e produção oral e escrita voltadas para a área de logística, por meio de funções comunicativas e estruturas simples da língua', 'Ênfase nas habilidades comunicativas necessárias para o desenvolvimento de tarefas relacionadas à atuação profissional']::text[]
where id = 1189 and cardinality(topics) = 1 and md5(topics[1]) = '6d048f5de34bd5c183300a1dc8dad414'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1189);

update public.disciplines set topics = array['O estudo do comportamento humano nas organizações', 'Percepção, personalidade, atitude e comportamento do indivíduo', 'Formação de grupos e trabalho em equipe', 'Cultura Organizacional', 'Poder, comprometimento, estrutura e tecnologia', 'Motivação', 'Liderança e tomada de decisão', 'Processos e tipos de liderança', 'Mudança Organizacional', 'Diversidade Cultural', 'Inteligência Emocional', 'Dominância Cerebral']::text[]
where id = 1190 and cardinality(topics) = 1 and md5(topics[1]) = 'bdad80db0ecdef209584767b5bb884e0'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1190);

update public.disciplines set topics = array['Abordar os conceitos das teorias da administração, novas formas organizacionais e os fenômenos da gestão modernas', 'A formação de conceitos da teoria da administração, racionalidade, dominação, poder e política', 'Teoria crítica e tópicos avançado de administração', 'Características da sociedade contemporânea, processos organizacionais, novas perspectivas e tomada de decisão', 'Teoria administrativa e as metáforas organizacionais', 'Sustentabilidade, ecologia, patologias organizacionais, diversidade e globalização', 'Cultura, modelos de administração e conhecimento moderno', 'Novas tendências, compartilhamento, ruptura e flexibilização']::text[]
where id = 1192 and cardinality(topics) = 1 and md5(topics[1]) = 'dcec4ce9971bc3ddda393b349ed5ab98'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1192);

update public.disciplines set topics = array['Noções de linguagem e de língua', 'Distinção entre língua falada e língua escrita', 'A variante coloquial', 'A variante culta', 'Texto: considerações gerais', 'Leitura e produção de gêneros textuais', 'Mecanismos de textualidade: coesão e coerência textuais', 'Discurso e ideologia', 'Polifonia textual', 'Comunicação e novas tecnologias']::text[]
where id = 1193 and cardinality(topics) = 1 and md5(topics[1]) = '07de83d4a5adf4fecfa2d3c616c419b0'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1193);

update public.disciplines set topics = array['Noções sobre Conjuntos Numéricos', 'Operações com os números racionais na forma fracionária e decimal', 'Cálculos de Porcentagem', 'Potenciação e Radiciação', 'Operações Algébricas como Polinômios, Fatoração e Produtos Notáveis', 'Equações e Inequações com representação algébricas e Gráficas do 1º e 2º graus, Logaritmos', 'Funções do 1º e 2º graus, logarítmicas e Progressões Aritméticas e Geométricas']::text[]
where id = 1194 and cardinality(topics) = 1 and md5(topics[1]) = 'a2d1f3d2da15a0371364888ed2fc3d07'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1194);

update public.disciplines set topics = array['Conceitos básicos de informática, Softwares, Hardwares, mobilidade (celulares e tablets)', 'Formatação de trabalhos acadêmicos com o uso de editor de texto', 'Utilização de recursos avançados de planilhas eletrônicas relacionados à administração de recursos humanos (macros, funções, fórmulas, taxas, formulários, gráficos avançados e tabelas dinâmicas)', 'PowerPoint (/Prezi), intranet, internet e suas interfaces com gestão de pessoas', 'E-mail como ferramenta de produtividade']::text[]
where id = 1195 and cardinality(topics) = 1 and md5(topics[1]) = '67b6bcb58c4a49efdb4f403c35225b24'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1195);

update public.disciplines set topics = array['Introdução às habilidades de compreensão e produção oral e escrita por meio de funções comunicativas e estruturas simples da língua', 'Ênfase na oralidade, atendendo às especificidades da área e abordando aspectos socioculturais']::text[]
where id = 1196 and cardinality(topics) = 1 and md5(topics[1]) = 'a78b02f1eeb0ee9fb7f722c9c0a6c6ec'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1196);

update public.disciplines set topics = array['Características das principais operações logísticas (armazenagem e transporte)', 'tipos de organograma de uma organização de logística e dos seus cargos e funções']::text[]
where id = 1197 and cardinality(topics) = 1 and md5(topics[1]) = '36067ed153c92fdf38fd1937f4860227'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1197);

update public.disciplines set topics = array['Introdução aos conceitos e definições básicas da logística', 'História e objetivo da logística', 'Introdução nas áreas de atuação: compras, armazenagem, embalagem, transporte e tráfego, gestão da cadeia de suprimentos', 'Custos Logísticos', 'Logística e sua relação com o serviço ao cliente', 'Logística Humanitária', 'Logística internacional', 'Logística Reversa', 'Logística Enxuta', 'Logística como diferencial competitivo', 'Os canais de distribuição física, características e suas funções', 'Logística de primeira milha', 'Logística de média milha', 'Logística de última milha', 'Introdução às tendências em Logística, Introdução aos Impactos da Logística na Sustentabilidade']::text[]
where id = 1198 and cardinality(topics) = 1 and md5(topics[1]) = '6e1f12d8619a71f96e60dc5d7789b8b2'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1198);

update public.disciplines set topics = array['Conceitos e funções Administrativas', 'Métodos de análise de problemas, aplicabilidade de estudos de caso para tomada de decisão', 'Governança das organizações']::text[]
where id = 1199 and cardinality(topics) = 1 and md5(topics[1]) = 'eb3dceb9a855c0f33a312459401fc1f4'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1199);

update public.disciplines set topics = array['Conceitos de cálculos numéricos', 'Relações e Funções', 'Álgebra Linear: Matrizes e Determinantes', 'Sistemas Lineares', 'Aplicação de razões, proporções, áreas e volumes em situações práticas']::text[]
where id = 1200 and cardinality(topics) = 1 and md5(topics[1]) = 'e0574d5ddf8da2b7d8be42b6ae3e864d'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1200);

update public.disciplines set topics = array['O Papel da ciência e da tecnologia', 'Tipos de conhecimento', 'Método e técnica', 'Planejamento e desenvolvimento da pesquisa: coleta das informações, organização e análise', 'Trabalhos acadêmicos: tipos, características e composição estrutural', 'O projeto de pesquisa experimental (desenvolvimento de experimento), pesquisa aplicada, pesquisa científica e tecnológica, pesquisa qualitativa e quantitativa', 'Pesquisas e pensamentos multi, trans e interdisciplinar', 'Editores eletrônicos de textos', 'Apresentação gráfica dos diferentes trabalhos', 'Normas da ABNT, citações e bibliografias', 'Valores éticos e princípios de direitos autorais', 'Leis e ferramentas antiplágio']::text[]
where id = 1201 and cardinality(topics) = 1 and md5(topics[1]) = '4a6eadbd1a2e7da23f23efdae0014e4d'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1201);

update public.disciplines set topics = array['Introdução ao editor de texto e ao editor de apresentação', 'Planilhas eletrônicas, criação e gerenciamento de planilhas, gráficos e dados, uso de operadores, funções, fórmulas e tabelas dinâmicas', 'Ferramentas de Fluxogramas e Diagramas para situações empresariais']::text[]
where id = 1202 and cardinality(topics) = 1 and md5(topics[1]) = 'b44f6097cd62abee645a3933627e8aad'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1202);

update public.disciplines set topics = array['Informação e Comunicação: conceitos e aplicações no contexto comunicativo da área de atuação do curso', 'Conceituação de Língua, Linguagem e Competências Comunicativas', 'Elementos da Comunicação e Funções da Linguagem', 'Reconhecimento de diferentes contextos de uso da língua no processo de leitura e produção textual', 'Técnicas de apresentação Oral', 'Princípios da comunicação empática, da ética e do respeito às diferenças', 'Tipologias e gêneros textuais: definições, contextos, finalidades, textualização, intertextualização, multissemiose, multimodalidade, transmidiatismo e multiletramento, voltados à área de formação']::text[]
where id = 1203 and cardinality(topics) = 1 and md5(topics[1]) = '4a651f7206b999d141546fc2b05555f3'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1203);

update public.disciplines set topics = array['Introdução às habilidades de compreensão e produção oral e escrita voltadas para a área de logística, por meio de funções comunicativas e estruturas simples da língua', 'Ênfase nas habilidades comunicativas necessárias para o desenvolvimento de tarefas relacionadas à atuação profissional']::text[]
where id = 1204 and cardinality(topics) = 1 and md5(topics[1]) = '23e65609375ec6b71bb720180e0a6069'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1204);

update public.disciplines set topics = array['Os trabalhos serão propostos e direcionados pelos professores dos componentes curriculares, conforme planejamento didático semestral para o planejamento e organização de portfólios']::text[]
where id = 1205 and cardinality(topics) = 1 and md5(topics[1]) = '12c732111acb3a72388ce5e3c324b939'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1205);

update public.disciplines set topics = array['Análise do Ambiente Interno: Capacitação, Recursos, Fatores Críticos de Sucesso', 'Análise do Ambiente Externo: Ameaças, Oportunidades, Concorrência, Parcerias e Alianças', 'Análise SWOT', 'Estratégia de Negociação', 'Estratégia Competitiva e Posicionamento', 'Estratégia de Fusões e Aquisições', 'Governança Corporativa', 'Gestão da informação', 'Processo decisório', 'Gestão do conhecimento', 'Processos organizacionais', 'Tipos de sistemas de informação', 'Inteligência competitiva', 'Planejamento Estratégico da Tecnologia da Informação', 'Métodos de desenvolvimento de sistemas de informação', 'Legislação e ética']::text[]
where id = 1206 and cardinality(topics) = 1 and md5(topics[1]) = '5d707f2a58f71a37ca1224c063b889f7'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1206);

update public.disciplines set topics = array['Paradigmas de programação', 'Introdução ao conceito e uso de algoritmos', 'Introdução à linguagem de programação Python', 'Estruturas condicionais e de seleção', 'Estrutura de repetição', 'Vetores e matrizes', 'Listas, dicionários e tuplas', 'Modularização e uso de funções', 'Técnicas e prática de construção de algoritmos', 'Recursividade', 'Criação e leitura de arquivos', 'Operações com Strings', 'Implementação de Interface Gráfica de Usuário usando PyQT', 'Testes unitários', 'Depuração de código']::text[]
where id = 1207 and cardinality(topics) = 1 and md5(topics[1]) = '24b819ec578d85fbd7a393197cfed8a5'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1207);

update public.disciplines set topics = array['Introdução ao Business Intelligence e Big Data', 'Vantagens e softwares para análise e extração de dados', 'Informação x Dados', 'Tipos e armazenamento de dados e informações', 'Visão abrangente da arquitetura e tecnologias de Big Data']::text[]
where id = 1208 and cardinality(topics) = 1 and md5(topics[1]) = '64e06b5e41e550489ae43bf2d2b9f491'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1208);

update public.disciplines set topics = array['Visão geral de organização empresarial e administração', 'As Organizações e suas Estruturas: conceito de organização, estruturas organizacionais tradicionais e inovativas com organogramas', 'Funções do administrador', 'Processos principais e de apoio, fluxograma, ferramentas e indicadores de desempenho', 'Modelos de Gestão', 'Modelos de negócio']::text[]
where id = 1209 and cardinality(topics) = 1 and md5(topics[1]) = '7daf0b1b6f746ecca898f91de010b262'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1209);

update public.disciplines set topics = array['Teoria dos conjuntos', 'Relações e Funções', 'Matrizes e Determinantes', 'Álgebra Linear', 'Lógica Proposicional', 'Tabelas Verdade', 'Equivalências Lógicas (Leis de Morgan)', 'Teoria dos Números']::text[]
where id = 1210 and cardinality(topics) = 1 and md5(topics[1]) = '417f2ed967ceea04dcc1ba9e3cf04aeb'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1210);

update public.disciplines set topics = array['Introdução às habilidades de compreensão e produção oral e escrita por meio de funções comunicativas e estruturas simples da língua', 'Ênfase nas habilidades comunicativas necessárias para o desenvolvimento de tarefas relacionadas à atuação profissional']::text[]
where id = 1211 and cardinality(topics) = 1 and md5(topics[1]) = '3cd4ec20da993abc8e0bbb6cc5cf89e5'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1211);

update public.disciplines set topics = array['Introdução, Normas técnicas, Traçados geométricos, Tangências e concordâncias de retas e curvas Sistemas de projeção, Colocação de cotas, Perspectivas, Projeções cilíndricas ortogonais']::text[]
where id = 1212 and cardinality(topics) = 1 and md5(topics[1]) = '85d333ffa0c904d0253c3e790661a9ae'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1212);

update public.disciplines set topics = array['Conceitos básicos: Corrente', 'Tensão', 'Resistência', 'Potência e Energia', 'Elementos dos circuitos: Fontes de tensão e de corrente', 'Resistência elétrica', 'Circuitos resistivos: Série', 'Paralelo', 'Divisor de tensão', 'Divisor de corrente', 'Medição de tensão, corrente e resistência', 'Ponte de Wheatstone', 'Transformações triângulo-estrela e estrela-triângulo', 'Análise de circuitos CC: Kirchhoff', 'Transformação de fontes', 'Thévenin', 'Norton', 'Superposição e Máxima transferência de potência', 'Análise de circuitos CA: Tensão alternada senoidal', 'Capacitor em CC e CA', 'Indutor em CC e CA', 'Circuito RC e RL em série', 'Potência CA', 'Fator de potência']::text[]
where id = 1213 and cardinality(topics) = 1 and md5(topics[1]) = 'dd6e8082d162c012af7a01bfd6600453'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1213);

update public.disciplines set topics = array['Visão geral da noção de texto', 'Diferenças entre oralidade e escrita, leitura, análise e produção de textos de interesse técnico-científico', 'Formas de comunicação escrita e oral nas organizações', 'Coesão e coerência do texto em diferentes gêneros discursivos']::text[]
where id = 1214 and cardinality(topics) = 1 and md5(topics[1]) = '0a63c23d5d4216be710e40aa763f6efc'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1214);

update public.disciplines set topics = array['Algoritmos, tipos primitivos: constantes, variáveis, expressões, comandos', 'estruturas de controle sequencial, de seleção e repetição', 'estruturas de dados, variáveis compostas, arquivos, modularização', 'Técnicas Básicas de programação', 'Programação estruturada, conceitos e tipos de linguagens de programação', 'Exemplo de uma linguagem estruturada']::text[]
where id = 1215 and cardinality(topics) = 1 and md5(topics[1]) = '17d9b613294ff45d20f5496765680d6e'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1215);

update public.disciplines set topics = array['Geometria plana e espacial', 'Lógica e raciocínio lógico', 'Noções Básicas de Álgebra e Aritmética']::text[]
where id = 1216 and cardinality(topics) = 1 and md5(topics[1]) = '8e17f3141f49f7b2edb4fdb1a3da436b'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1216);

update public.disciplines set topics = array['Conjuntos, funções, limites e derivadas']::text[]
where id = 1217 and cardinality(topics) = 1 and md5(topics[1]) = '1898913c041209dd0b6e5ad4003eaf3b'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1217);

update public.disciplines set topics = array['Introdução à compreensão e produção escrita por meio da integração das habilidades lingüístico-comunicativas', 'Ênfase na leitura, atendendo às especificidades acadêmico-profissionais da área']::text[]
where id = 1218 and cardinality(topics) = 1 and md5(topics[1]) = 'a2bfefbbe60625f990db437f7b93e8a7'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1218);

update public.disciplines set topics = array['Classificação e propriedades dos materiais', 'Introdução aos materiais de construção mecânica', 'Estrutura dos materiais', 'Cristalizações dos metais e diagramas de equilíbrio de ligas ferrosas e não ferrosas', 'Deformação dos metais', 'Constituição das ligas metálicas', 'Sistemas isomorfos e sistemas eutéticos', 'Constituição das ligas não ferrosas', 'Estudo das propriedades mecânicas e da dureza dos materiais por meio de ensaios mecânicos destrutivos de tração, dobramento e impacto', 'Introdução aos tratamentos térmicos dos materiais metálicos']::text[]
where id = 1219 and cardinality(topics) = 1 and md5(topics[1]) = '5ce121610ed97c7e698d3dcb21657857'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1219);

update public.disciplines set topics = array['Introdução ao desenho técnico mecânico: tipos de desenhos, instrumentos para desenho, elementos de geometria descritiva e de desenho geométrico', 'Normas técnicas', 'Representação de peças em perspectivas e em projeções cilíndricas ortogonais em esboço e por instrumental de desenho', 'Uso de cotas e de escalas', 'Representação de cortes e seções', 'Representação de elementos de fixação']::text[]
where id = 1220 and cardinality(topics) = 1 and md5(topics[1]) = '7e7290583dd6aa762b945466b1db03e7'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1220);

update public.disciplines set topics = array['Introdução à tecnologia de produção', 'Processos de fabricação mecânica', 'Fundição: moldes, modelos, processos de vazamentos, processos de moldagem, machos, areias e suas propriedades, limpeza dos fundidos', 'Processos de conformações mecânicas: equipamentos, operações, cálculos de esforços e parâmetros', 'Metalurgia do pó: processo e campo de aplicação', 'Aspectos ambientais e legais']::text[]
where id = 1221 and cardinality(topics) = 1 and md5(topics[1]) = '31136c434351ae14fca65f753d1154cd'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1221);

update public.disciplines set topics = array['Conceitos básicos de funções (função linear, polinomial de segunda ordem ou maior, exponencial, logarítmica e raiz), limites e derivadas de funções de uma ou mais variáveis', 'Estudo de funções de uma ou mais variáveis: monotonicidade, concavidade, máximos e mínimos, pontos de inflexão, assíntotas', 'Construção de gráficos de funções']::text[]
where id = 1222 and cardinality(topics) = 1 and md5(topics[1]) = '38d272784c579fa4a02156990cf86950'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1222);

update public.disciplines set topics = array['Geometria plana e espacial', 'Trigonometria básica', 'Vetores: operações com vetores', 'Sistemas de equações lineares']::text[]
where id = 1223 and cardinality(topics) = 1 and md5(topics[1]) = '34b39364b7de0bd8751eaf94344f3505'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1223);

update public.disciplines set topics = array['Informação e comunicação: conceitos e aplicações no contexto comunicativo da área de atuação do curso', 'conceituação de língua, linguagem e competências comunicativas', 'elementos da comunicação e funções da linguagem', 'reconhecimento de diferentes contextos de uso da língua no processo de leitura e produção textual', 'técnicas de apresentação oral', 'princípios da comunicação empática, da ética e do respeito às diferenças', 'tipologias e gêneros textuais: definições, contextos, finalidades, textualização, intertextualização, multissemiose, multimodalidade, transmidiatismo e multiletramento voltados à área de formação']::text[]
where id = 1224 and cardinality(topics) = 1 and md5(topics[1]) = 'd8879a4cbe58935b98409f4de37abd77'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1224);

update public.disciplines set topics = array['Introdução aos conceitos de sociedade, tecnologia e inovação', 'Estudo das relações entre tecnologia e sociedade, incluindo impactos sociais, ambientais, econômicos e nas relações do trabalho', 'Análise de processos de inovação tecnológica e sua relação com o desenvolvimento econômico e social', 'Discussão sobre as políticas públicas relacionadas a tecnologia e inovação']::text[]
where id = 1225 and cardinality(topics) = 1 and md5(topics[1]) = 'd9e09115b86fd6423d31dcb41c18b264'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1225);

update public.disciplines set topics = array['Leis e regulamentações relacionadas ao meio ambiente e ao trabalho', 'Direito ambiental: responsabilidade ambiental, prevenção e controle da poluição', 'Direitos e relações trabalhistas', 'saúde ocupacional', 'Noções do Direito empresarial']::text[]
where id = 1226 and cardinality(topics) = 1 and md5(topics[1]) = 'd152ad59d0f1caccfd8199b78e9196fe'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1226);

update public.disciplines set topics = array['Terminologia (VIM – Vocabulário Internacional de Metrologia)', 'Conceitos fundamentais de metrologia: grandeza, sistema de grandezas, unidade de medida, unidade de base, unidade derivada, sistema de unidades, teoria dos erros: algarismos significativos, incerteza e erro, regras de arredondamento', 'Sistema Internacional de Unidades', 'Sistema Inglês de Unidades', 'Conversão de unidades', 'Réguas, paquímetros, micrômetros, blocos-padrão, verificadores, calibradores, traçador de altura, relógio comparador, goniômetro, régua de seno, mesa de seno e rugosímetro', 'Controle dimensional de juntas soldadas', 'Tolerância dimensional, tolerância geométrica e sistemas de ajustes']::text[]
where id = 1227 and cardinality(topics) = 1 and md5(topics[1]) = 'bde1d3de2742c62539cf81accbdc2f27'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1227);

update public.disciplines set topics = array['Conceitos gerais', 'Desenho técnico por instrumentos', 'Normas técnicas ABNT', 'Tipos de traçados e caligrafia técnica', 'Escalas', 'Concordâncias', 'Projeções ortogonais e perspectivas', 'Corte', 'Cotagem', 'Simbologia', 'Representações especiais', 'Esboço e croquis']::text[]
where id = 1228 and cardinality(topics) = 1 and md5(topics[1]) = '108de513020d040664330c1d81946d99'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1228);

update public.disciplines set topics = array['Conjuntos Numéricos', 'Regras de Três', 'Frações', 'Porcentagem', 'Potenciação e Notação Científica', 'Radiciação', 'Logaritmos', 'Fatoração e Produtos Notáveis', 'Equações e inequações do 1o. e 2o. Graus', 'Funções do 1o. e 2o. Graus, Exponencial, Logaritmica e Trigonométrica', 'Matrizes', 'Determinantes', 'Sistemas Lineares']::text[]
where id = 1229 and cardinality(topics) = 1 and md5(topics[1]) = 'df11587286510f58a113207b0d94c03a'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1229);

update public.disciplines set topics = array['Conceitos e Componentes de Informática: História do computador, Hardware, Software, Periféricos, Programas e aplicativos', 'Sistema Operacional e Aplicativos: O que é o sistema operacional, Características do Windows, Configurações, Pastas e arquivos, Gerenciamento de arquivos', 'Conceitos sobre internet: Provedores, Conexões, Navegação, Tipos de sites, Protocolos, Pesquisa, Downloads, Segurança', 'Comunicação Digital: O que é comunicação digital, Tipos de comunicação digital, Redes sociais, Comércio eletrônico, Segurança nas redes sociais.Processador de Texto: Função do processador de texto, elaboração de documento de texto, formatação de fonte, parágrafo, criação de um documento de texto, mala direta e tabelas', 'Criação de Apresentações: Softwares utilizados, layouts e designs, vídeos, áudios, narração, hiperlink, slide mestre e formatação', 'Planilhas Eletrônicas: fórmulas, funções, impressão, formatação e validação de dados']::text[]
where id = 1230 and cardinality(topics) = 1 and md5(topics[1]) = 'ce10a872dd0ba2a4fb2738a592fd306c'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1230);

update public.disciplines set topics = array['Conceituação de Segurança e Higiene do Trabalho', 'Histórico', 'Legislação Ocupacional Brasileira', 'Acidente, definição prevencionista e legal, equiparações', 'Ato inseguro e condição insegura', 'Incidente crítico', 'Classificação dos Riscos Ocupacionais', 'Análise de Riscos', 'CIPA, NR-5', 'Estatísticas de Acidentes, Custo dos Acidentes', 'Conceito de fogo', 'Métodos de extinção', 'Medidas preventivas gerais', 'Riscos Elétricos', 'Riscos na soldagem', 'Medidas específicas', 'Radiações', 'Ruído', 'Dose de ruído', 'Medidas de controle', 'Gases, Vapores e Aerodispersóides na soldagem', 'Fumos de solda, Ventilação industrial, proteção individual', 'Ergonomia', 'Fatores de risco', 'LER/DORT', 'Controle dos riscos', 'Sistemas de Gestão de Segurança e Saúde Ocupacional', 'Normas BS8800 e OHSAS 18001']::text[]
where id = 1231 and cardinality(topics) = 1 and md5(topics[1]) = 'ab3036caf568cd087f34f90ae0032c62'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1231);

update public.disciplines set topics = array['Sintaxe e conceitos de semântica', 'Mecanismos de coesão e coerência, tipologia textual e gêneros textuais', 'Variações linguísticas', 'Gêneros primários e secundários: definição, particularidades, veículos de circulação, público-alvo, finalidade, intencionalidade, textualidade e intertextualidade']::text[]
where id = 1232 and cardinality(topics) = 1 and md5(topics[1]) = 'd2a87440b3987555beef385127a2a7eb'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1232);

update public.disciplines set topics = array['Estrutura Atômica, Famílias Químicas, Ligações Químicas, Compostos Iônicos, Covalentes e Metálicos, Reações Químicas, Número de Oxidação, Tratamento de Superfícies, Reações de Oxido-Redução e Corrosão, Princípios de Eletroquímica: Pilhas Eletroquímicas e Células Eletrolíticas, Processos Eletrolíticos de formação de Camada Protetores, Corrosão, Processos de proteção oxidação por barreira e metal de sacrifício']::text[]
where id = 1233 and cardinality(topics) = 1 and md5(topics[1]) = 'cdcf8c767ef6d4ea8a900b112253de59'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1233);

update public.disciplines set topics = array['Classificação e seleção dos processos de fabricação', 'Fundição: fundamentos', 'Tipos de fundição (em areia, em casca ou Shell, em matriz por gravidade, sob pressão, por centrifugação, de precisão)', 'Conformação plástica: fundamentos', 'Laminação', 'Forjamento', 'Extrusão', 'Trefilação', 'Conformação de chapas finas (corte, dobramento, estampagem profunda ou embutimento)', 'Fundamentos de usinagem', 'Torneamento', 'Fresamento', 'Aplainamento', 'Furação', 'Retificação', 'Serramento', 'Usinagem por CNC', 'Metalurgia do pó: fundamentos', 'Pós metálicos', 'Mistura', 'Compactação', 'Sinterização']::text[]
where id = 1234 and cardinality(topics) = 1 and md5(topics[1]) = 'c8ad9a389adcb2948ef7077c3dce240e'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1234);

update public.disciplines set topics = array['Introdução às habilidades de compreensão e produção oral e escrita por meio de funções comunicativas e estruturas simples da língua', 'Ênfase na oralidade, atendendo às especificidades da área e abordando aspectos sócioculturais']::text[]
where id = 1235 and cardinality(topics) = 1 and md5(topics[1]) = '361a341a26d5f34bae713730407cadfa'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1235);

update public.disciplines set topics = array['Desenho técnico como linguagem gráfica', 'Aplicação de Normas técnicas', 'Caligrafia e formatos de papel', 'Aplicação e tipos de linhas', 'Traçados geométricos e concordâncias', 'Esboço e Croquis', 'Desenho definitivo com instrumentos', 'Escalas', 'Sistema de representação no 1º e 3º diedros', 'Cotagem e simbologia', 'Cortes, seções, vistas auxiliares', 'Perspectivas', 'Leitura e Interpretação de Desenho técnico', 'Introdução às ferramentas computacionais']::text[]
where id = 1236 and cardinality(topics) = 1 and md5(topics[1]) = 'efb8b5446dd1ca1d94371b549c0d45bb'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1236);

update public.disciplines set topics = array['Introdução à eletricidade básica: eletrostática, eletrodinâmica e eletromagnetismo', 'Resolução de circuitos elétricos em corrente contínua e alternada', 'Circuitos monofásicos e trifásicos', 'Circuitos magnéticos e eletromagnéticos', 'Geradores e motores de corrente continua e corrente alternada', 'Transformadores', 'Máquinas elétricas rotativas', 'Instalações industriais', 'Utilização de sala ambiente para as aulas de teóricas e práticas']::text[]
where id = 1237 and cardinality(topics) = 1 and md5(topics[1]) = '74afa70bee616c0c4f448337eba6ba67'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1237);

update public.disciplines set topics = array['Sistemas de medida', 'Grandezas físicas e vetores', 'Equilíbrio de uma partícula', 'Força e Movimento', 'As leis de Newton', 'Gravitação', 'Trabalho', 'Energia', 'Momento', 'Equilíbrio', 'Rotação', 'Introdução a Eletromagnetismo', 'Abordagens específicas ao contexto do curso']::text[]
where id = 1239 and cardinality(topics) = 1 and md5(topics[1]) = '2492d84e5b950577d810da857b94fe20'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1239);

update public.disciplines set topics = array['Funções de uma variável', 'Limites e Continuidade', 'Derivadas', 'Aplicações de Derivadas', 'Uso de softwares e aplicativos como ferramentas auxiliares à resolução de problemas']::text[]
where id = 1240 and cardinality(topics) = 1 and md5(topics[1]) = 'f5e441982f7d02ce5cc20d1127ea3c30'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1240);

update public.disciplines set topics = array['Sintaxe e conceitos de semântica', 'Mecanismos de coesão e coerência, tipologia textual e gêneros textuais', 'Variações linguísticas', 'Gêneros primários e secundários: definição, particularidades, veículos de circulação, público-alvo, finalidade, intencionalidade, textualidade e intertextualidade']::text[]
where id = 1241 and cardinality(topics) = 1 and md5(topics[1]) = 'd2a87440b3987555beef385127a2a7eb'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1241);

update public.disciplines set topics = array['Introdução às habilidades de compreensão e produção oral e escrita por meio de funções sociais e estruturas simples da língua', 'Ênfase na oralidade, atendendo às especificidades acadêmico-profissionais da área e abordando aspectos sócio-culturais da língua inglesa']::text[]
where id = 1242 and cardinality(topics) = 1 and md5(topics[1]) = 'c2bd0d2fda5c5bd59d8585aade1277c8'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1242);

update public.disciplines set topics = array['Desenho técnico como linguagem gráfica', 'Aplicação de Normas técnicas', 'Caligrafia e formatos de papel', 'Aplicação e tipos de linhas', 'Traçados geométricos e concordâncias', 'Esboço e Croquis', 'Desenho definitivo com instrumentos', 'Escalas', 'Sistema de representação no 1º e 3º diedros', 'Cotagem e simbologia', 'Cortes, seções, vistas auxiliares', 'Perspectivas', 'Leitura e Interpretação de Desenho técnico', 'Introdução às ferramentas computacionais']::text[]
where id = 1243 and cardinality(topics) = 1 and md5(topics[1]) = 'efb8b5446dd1ca1d94371b549c0d45bb'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1243);

update public.disciplines set topics = array['Introdução à eletricidade básica: eletrostática, eletrodinâmica e eletromagnetismo', 'Resolução de circuitos elétricos em corrente contínua e alternada', 'Circuitos monofásicos e trifásicos', 'Circuitos magnéticos e eletromagnéticos', 'Geradores e motores de corrente continua e corrente alternada', 'Transformadores', 'Máquinas elétricas rotativas', 'Instalações industriais', 'Utilização de sala ambiente para as aulas de teóricas e práticas']::text[]
where id = 1244 and cardinality(topics) = 1 and md5(topics[1]) = '74afa70bee616c0c4f448337eba6ba67'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1244);

update public.disciplines set topics = array['Sistemas de medida', 'Grandezas físicas e vetores', 'Equilíbrio de uma partícula', 'Força e Movimento', 'As leis de Newton', 'Gravitação', 'Trabalho', 'Energia', 'Momento', 'Equilíbrio', 'Rotação', 'Introdução a Eletromagnetismo', 'Abordagens específicas ao contexto do curso']::text[]
where id = 1246 and cardinality(topics) = 1 and md5(topics[1]) = '2492d84e5b950577d810da857b94fe20'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1246);

update public.disciplines set topics = array['Funções de uma variável', 'Limites e Continuidade', 'Derivadas', 'Aplicações de Derivadas', 'Uso de softwares e aplicativos como ferramentas auxiliares à resolução de problemas']::text[]
where id = 1247 and cardinality(topics) = 1 and md5(topics[1]) = 'f5e441982f7d02ce5cc20d1127ea3c30'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1247);

update public.disciplines set topics = array['Sintaxe e conceitos de semântica', 'Mecanismos de coesão e coerência, tipologia textual e gêneros textuais', 'Variações linguísticas', 'Gêneros primários e secundários: definição, particularidades, veículos de circulação, público-alvo, finalidade, intencionalidade, textualidade e intertextualidade']::text[]
where id = 1248 and cardinality(topics) = 1 and md5(topics[1]) = 'd2a87440b3987555beef385127a2a7eb'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1248);

update public.disciplines set topics = array['Introdução às habilidades de compreensão e produção oral e escrita por meio de funções sociais e estruturas simples da língua', 'Ênfase na oralidade, atendendo às especificidades acadêmico-profissionais da área e abordando aspectos sócio-culturais da língua inglesa']::text[]
where id = 1249 and cardinality(topics) = 1 and md5(topics[1]) = 'c2bd0d2fda5c5bd59d8585aade1277c8'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1249);

update public.disciplines set topics = array['Classificação e propriedades dos materiais', 'Introdução aos materiais de construção mecânica', 'Estrutura dos materiais', 'Cristalizações dos metais e diagramas de equilíbrio de ligas ferrosas e não ferrosas', 'Deformação dos metais', 'Constituição das ligas metálicas', 'Sistemas isomorfos e sistemas eutéticos', 'Constituição das ligas não ferrosas', 'Estudo das propriedades mecânicas e da dureza dos materiais por meio de ensaios mecânicos destrutivos de tração, dobramento e impacto', 'Introdução aos tratamentos térmicos dos materiais metálicos']::text[]
where id = 1250 and cardinality(topics) = 1 and md5(topics[1]) = '5ce121610ed97c7e698d3dcb21657857'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1250);

update public.disciplines set topics = array['Introdução ao desenho técnico mecânico: tipos de desenhos, instrumentos para desenho, elementos de geometria descritiva e de desenho geométrico', 'Normas técnicas', 'Representação de peças em perspectivas e em projeções cilíndricas ortogonais em esboço e por instrumental de desenho', 'Uso de cotas e de escalas', 'Representação de cortes e seções', 'Representação de elementos de fixação']::text[]
where id = 1251 and cardinality(topics) = 1 and md5(topics[1]) = '7e7290583dd6aa762b945466b1db03e7'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1251);

update public.disciplines set topics = array['Introdução à tecnologia de produção', 'Processos de fabricação mecânica', 'Fundição: moldes, modelos, processos de vazamentos, processos de moldagem, machos, areias e suas propriedades, limpeza dos fundidos', 'Processos de conformações mecânicas: equipamentos, operações, cálculos de esforços e parâmetros', 'Metalurgia do pó: processo e campo de aplicação', 'Aspectos ambientais e legais']::text[]
where id = 1252 and cardinality(topics) = 1 and md5(topics[1]) = '31136c434351ae14fca65f753d1154cd'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1252);

update public.disciplines set topics = array['Conceitos básicos de funções (função linear, polinomial de segunda ordem ou maior, exponencial, logarítmica e raiz), limites e derivadas de funções de uma ou mais variáveis', 'Estudo de funções de uma ou mais variáveis: monotonicidade, concavidade, máximos e mínimos, pontos de inflexão, assíntotas', 'Construção de gráficos de funções']::text[]
where id = 1253 and cardinality(topics) = 1 and md5(topics[1]) = '38d272784c579fa4a02156990cf86950'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1253);

update public.disciplines set topics = array['Geometria plana e espacial', 'Trigonometria básica', 'Vetores: operações com vetores', 'Sistemas de equações lineares']::text[]
where id = 1254 and cardinality(topics) = 1 and md5(topics[1]) = '34b39364b7de0bd8751eaf94344f3505'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1254);

update public.disciplines set topics = array['Informação e comunicação: conceitos e aplicações no contexto comunicativo da área de atuação do curso', 'conceituação de língua, linguagem e competências comunicativas', 'elementos da comunicação e funções da linguagem', 'reconhecimento de diferentes contextos de uso da língua no processo de leitura e produção textual', 'técnicas de apresentação oral', 'princípios da comunicação empática, da ética e do respeito às diferenças', 'tipologias e gêneros textuais: definições, contextos, finalidades, textualização, intertextualização, multissemiose, multimodalidade, transmidiatismo e multiletramento voltados à área de formação']::text[]
where id = 1255 and cardinality(topics) = 1 and md5(topics[1]) = 'd8879a4cbe58935b98409f4de37abd77'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1255);

update public.disciplines set topics = array['Introdução aos conceitos de sociedade, tecnologia e inovação', 'Estudo das relações entre tecnologia e sociedade, incluindo impactos sociais, ambientais, econômicos e nas relações do trabalho', 'Análise de processos de inovação tecnológica e sua relação com o desenvolvimento econômico e social', 'Discussão sobre as políticas públicas relacionadas a tecnologia e inovação']::text[]
where id = 1256 and cardinality(topics) = 1 and md5(topics[1]) = 'd9e09115b86fd6423d31dcb41c18b264'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1256);

update public.disciplines set topics = array['Leis e regulamentações relacionadas ao meio ambiente e ao trabalho', 'Direito ambiental: responsabilidade ambiental, prevenção e controle da poluição', 'Direitos e relações trabalhistas', 'saúde ocupacional', 'Noções do Direito empresarial']::text[]
where id = 1257 and cardinality(topics) = 1 and md5(topics[1]) = 'd152ad59d0f1caccfd8199b78e9196fe'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1257);

update public.disciplines set topics = array['História e teoria do design', 'Fundamentos sociais do design', 'Movimentos que influenciaram o design', 'Revoluções industriais', 'Produção em massa', 'Produtos de design que marcaram época', 'História da Arte como referencial teórico para a compreensão do design']::text[]
where id = 1258 and cardinality(topics) = 1 and md5(topics[1]) = '91398f6f623b07e5085d411f76f612e0'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1258);

update public.disciplines set topics = array['Principais atividades do designer industrial', 'áreas de atuação', 'introdução às principais']::text[]
where id = 1259 and cardinality(topics) = 1 and md5(topics[1]) = 'dae803604587bc261e2103cca689f8cc'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1259);

update public.disciplines set topics = array['Desenho a mão livre', 'Desenho de memória e de observação', 'Desenho instrumental', 'Técnicas e estratégias de desenho', 'Noções de perspectiva, proporção, composição, luz e sombras, textura e volume e cor']::text[]
where id = 1260 and cardinality(topics) = 1 and md5(topics[1]) = 'a05e1c2033ec80c93762d3a45062e34d'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1260);

update public.disciplines set topics = array['Introdução aos sistemas informacionais', 'Utilização da tecnologia de sistemas eletrônicos no cotidiano', 'Evolução das interfaces com o usuário', 'Dispositivos eletrônicos portáteis (gadgets)', 'Aplicativos de uso geral', 'Software livre no contexto do design de produto']::text[]
where id = 1261 and cardinality(topics) = 1 and md5(topics[1]) = '2853a29107afc201e53fe1ce7abb374e'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1261);

update public.disciplines set topics = array['Introdução à Ciência e Tecnologia dos Materiais', 'Estrutura e ligação atômica', 'Estruturas cristalinas e geometria dos cristais, solidificação e defeitos cristalinos', 'Análise das propriedades mecânicas e elétricas dos materiais metálicos', 'Introdução ao estudo do Diagrama de Fases', 'Materiais Poliméricos', 'Materiais compósitos', 'Materiais magnéticos']::text[]
where id = 1262 and cardinality(topics) = 1 and md5(topics[1]) = '145c1e0c158fbe90dfb2964139a52ebb'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1262);

update public.disciplines set topics = array['O aluno deverá ser capaz de redimensionar objetos a várias escalas, ter noções de proporção, de trigonometria, de funções de uma e várias variáveis, de geometria plana e espacial simples, resolver equações e sistemas de equações polinomiais e trigonométricas, analisar gráfico de funções, representar de forma bidimensional dados em sistemas de coordenadas cartesianas, calcular derivadas e integrais de funções de uma variável, inclusive com análise através de software, determinar área sob a curva utilizando integrais e também regras numéricas como a Regra dos Trapézios, determinar volume, comprimento de curva e área de superfície utilizando técnicas de integração, ajustar curvas e resolver problemas elementares de Design como o cálculo de áreas, volumes e proporção']::text[]
where id = 1263 and cardinality(topics) = 1 and md5(topics[1]) = 'aa3d46847d93f8e9facabd80b0a59ace'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1263);

update public.disciplines set topics = array['Técnicas de apresentação comercial', 'técnicas de montagem de portfólio físico e digital', 'oratória', 'postura corporal', 'etiqueta corporativa e empresarial', 'utilização de redes sociais profissionais', 'utilização de sites de hospedagem para portfólio digital', 'utilização de tipografias e cores adequadas para apresentações com projeção e uso em portfólios', 'trabalho individual', 'trabalho em grupo']::text[]
where id = 1264 and cardinality(topics) = 1 and md5(topics[1]) = 'f2bff5ca4c116bc37452bf5645524164'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1264);

update public.disciplines set topics = array['Introdução às habilidades de compreensão e produção oral e escrita por meio de funções comunicativas e estruturas simples da língua', 'Ênfase na oralidade, atendendo às especificidades da área e abordando aspectos socioculturais']::text[]
where id = 1265 and cardinality(topics) = 1 and md5(topics[1]) = 'c113f1f5c47b94219b0ea20ea1d3c28c'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1265);

update public.disciplines set topics = array['História e teoria do design', 'Fundamentos sociais do design', 'Movimentos que influenciaram o design', 'Revoluções industriais', 'Produção em massa', 'Produtos de design que marcaram época', 'História da Arte como referencial teórico para a compreensão do design']::text[]
where id = 1266 and cardinality(topics) = 1 and md5(topics[1]) = '91398f6f623b07e5085d411f76f612e0'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1266);

update public.disciplines set topics = array['Principais atividades do designer industrial', 'áreas de atuação', 'introdução às principais']::text[]
where id = 1267 and cardinality(topics) = 1 and md5(topics[1]) = 'dae803604587bc261e2103cca689f8cc'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1267);

update public.disciplines set topics = array['Desenho a mão livre', 'Desenho de memória e de observação', 'Desenho instrumental', 'Técnicas e estratégias de desenho', 'Noções de perspectiva, proporção, composição, luz e sombras, textura e volume e cor']::text[]
where id = 1268 and cardinality(topics) = 1 and md5(topics[1]) = 'a05e1c2033ec80c93762d3a45062e34d'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1268);

update public.disciplines set topics = array['Introdução aos sistemas informacionais', 'Utilização da tecnologia de sistemas eletrônicos no cotidiano', 'Evolução das interfaces com o usuário', 'Dispositivos eletrônicos portáteis (gadgets)', 'Aplicativos de uso geral', 'Software livre no contexto do design de produto']::text[]
where id = 1269 and cardinality(topics) = 1 and md5(topics[1]) = '2853a29107afc201e53fe1ce7abb374e'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1269);

update public.disciplines set topics = array['Introdução à Ciência e Tecnologia dos Materiais', 'Estrutura e ligação atômica', 'Estruturas cristalinas e geometria dos cristais, solidificação e defeitos cristalinos', 'Análise das propriedades mecânicas e elétricas dos materiais metálicos', 'Introdução ao estudo do Diagrama de Fases', 'Materiais Poliméricos', 'Materiais compósitos', 'Materiais magnéticos']::text[]
where id = 1270 and cardinality(topics) = 1 and md5(topics[1]) = '145c1e0c158fbe90dfb2964139a52ebb'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1270);

update public.disciplines set topics = array['O aluno deverá ser capaz de redimensionar objetos a várias escalas, ter noções de proporção, de trigonometria, de funções de uma e várias variáveis, de geometria plana e espacial simples, resolver equações e sistemas de equações polinomiais e trigonométricas, analisar gráfico de funções, representar de forma bidimensional dados em sistemas de coordenadas cartesianas, calcular derivadas e integrais de funções de uma variável, inclusive com análise através de software, determinar área sob a curva utilizando integrais e também regras numéricas como a Regra dos Trapézios, determinar volume, comprimento de curva e área de superfície utilizando técnicas de integração, ajustar curvas e resolver problemas elementares de Design como o cálculo de áreas, volumes e proporção']::text[]
where id = 1271 and cardinality(topics) = 1 and md5(topics[1]) = 'aa3d46847d93f8e9facabd80b0a59ace'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1271);

update public.disciplines set topics = array['Técnicas de apresentação comercial', 'técnicas de montagem de portfólio físico e digital', 'oratória', 'postura corporal', 'etiqueta corporativa e empresarial', 'utilização de redes sociais profissionais', 'utilização de sites de hospedagem para portfólio digital', 'utilização de tipografias e cores adequadas para apresentações com projeção e uso em portfólios', 'trabalho individual', 'trabalho em grupo']::text[]
where id = 1272 and cardinality(topics) = 1 and md5(topics[1]) = 'f2bff5ca4c116bc37452bf5645524164'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1272);

update public.disciplines set topics = array['Introdução às habilidades de compreensão e produção oral e escrita por meio de funções comunicativas e estruturas simples da língua', 'Ênfase na oralidade, atendendo às especificidades da área e abordando aspectos socioculturais']::text[]
where id = 1273 and cardinality(topics) = 1 and md5(topics[1]) = 'c113f1f5c47b94219b0ea20ea1d3c28c'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1273);

update public.disciplines set topics = array['Introdução ao desenho técnico à mão livre: Normas para o desenho e técnicas fundamentais de traçado a mão livre', 'Sistemas de representação: 1º e 3º diedros', 'Projeção ortogonal de peças simples', 'Vistas omitidas', 'Cotas e proporções', 'Perspectivas axonométricas, isométricas, bimétrica, trimétrica', 'Perspectiva cavaleira', 'Esboços cotados', 'Sombras próprias', 'Esboços sombreados']::text[]
where id = 1274 and cardinality(topics) = 1 and md5(topics[1]) = '36142eef83b0b90fc044ef00e719428a'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1274);

update public.disciplines set topics = array['Noções de cartografia e topografia', 'Uso de equipamentos topográficos (teodolito, estação total, nível e GPS)', 'Medição linear', 'Orientação dos alinhamentos', 'Processo de levantamento planialtimétrico', 'Aplicação da cartografia e da topografia para a construção de rodovias, ferrovias e dutovias']::text[]
where id = 1275 and cardinality(topics) = 1 and md5(topics[1]) = '1431880e9b8bca7d27b632b16811e60c'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1275);

update public.disciplines set topics = array['Medição, Vetores, Movimento em uma dimensão, Movimento no plano, Dinâmica', 'Trabalho e energia, Conservação de energia, Conservação do momento linear, Colisões, Conservação da quantidade de movimento e conservação de energia cinética, Movimento circular, Rotação, Movimento periódico, Estudo de molas, Dilatação linear de sólidos, A lei de Coulomb, Campo elétrico e Lei de Gauss, Capacitância e propriedade dos dielétricos, Corrente, resistência e força eletromotriz, Circuitos elétricos, Eletrostática, Medidas elétricas e Noções de Eletrônica de circuitos']::text[]
where id = 1276 and cardinality(topics) = 1 and md5(topics[1]) = '2083f0ed65498a87896b3eee6f9c7f18'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1276);

update public.disciplines set topics = array['Funções reais de variável real', 'Noções de limite e continuidade', 'Derivadas', 'Integral definida e indefinida', 'Métodos de integração', 'Função real a mais de uma variável real', 'Derivadas parciais', 'Elementos de equações diferenciais']::text[]
where id = 1277 and cardinality(topics) = 1 and md5(topics[1]) = '7bd92e5f11f148634c1e8bc1aaa10067'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1277);

update public.disciplines set topics = array['Funções polinomiais, racionais, trigonométricas, exponenciais e logarítmicas', 'Lógica Proposicional', 'Tabelas Verdade', 'Equivalências Lógicas (Leis de Morgan)', 'Álgebra Linear: Matrizes e Determinantes']::text[]
where id = 1278 and cardinality(topics) = 1 and md5(topics[1]) = '976ad6040c06cca10e72971f9d5a373e'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1278);

update public.disciplines set topics = array['Visão geral da noção de texto', 'Diferenças entre oralidade e escrita, leitura, análise e produção de textos de interesse geral e da administração: cartas, relatórios, correios eletrônicos e outras formas de comunicação escrita e oral nas organizações', 'Coesão e coerência do texto e diferentes gêneros discursivos']::text[]
where id = 1279 and cardinality(topics) = 1 and md5(topics[1]) = '74eff8c5fd20d5d5b9937d5c07eb3884'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1279);

update public.disciplines set topics = array['Introdução às habilidades de compreensão e produção oral e escrita por meio de funções sociais e estruturas simples da língua', 'Ênfase na oralidade, atendendo às especificidades acadêmico-profissionais da área e abordando aspectos sócio-culturais da língua inglesa']::text[]
where id = 1280 and cardinality(topics) = 1 and md5(topics[1]) = 'c2bd0d2fda5c5bd59d8585aade1277c8'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1280);

update public.disciplines set topics = array['Noções de geometria descritiva', 'Escala', 'Convenções arquitetônicas', 'Plantas, cortes, fachadas', 'Introdução à computação gráfica', 'Representação gráfica em 2d']::text[]
where id = 1281 and cardinality(topics) = 1 and md5(topics[1]) = '47f9febc200c768582a643440c2349ee'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1281);

update public.disciplines set topics = array['Revisão de conceitos básicos de Química', 'Propriedades Químicas de Materiais utilizados em Construção Civil', 'Reações Químicas', 'Equilíbrio Químico', 'Estudo de Casos']::text[]
where id = 1282 and cardinality(topics) = 1 and md5(topics[1]) = '82c08da538f143c9c81e7f5da70b39be'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1282);

update public.disciplines set topics = array['Grandezas físicas', 'Equilíbrio de partícula e de sólido', 'Cinemática do ponto', 'Movimento no plano', 'Princípios de dinâmica', 'Trabalho, energia, potência', 'Máquinas e elasticidade', 'Dinâmica do sólido', 'Hidrostática e hidrodinâmica', 'Calor', 'Gás perfeito, transformações', 'Termodinâmica', 'primeira e segunda lei', 'Ciclos de transformação', 'Ciclo de Carnot']::text[]
where id = 1283 and cardinality(topics) = 1 and md5(topics[1]) = '01d70a188c0dc38dc0b6148c401cb74a'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1283);

update public.disciplines set topics = array['Desenvolvimento verbal', 'Organização do pensamento', 'Linguagem escrita e falada', 'Redação de textos técnicos e científicos', 'Elaboração de Relatório', 'Regras de tratamento e utilização de tempos verbais']::text[]
where id = 1284 and cardinality(topics) = 1 and md5(topics[1]) = '1423f34149818d880aec932d0114b2ad'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1284);

update public.disciplines set topics = array['Noções sobre vetores e aplicações à geometria analítica', 'Curvas no plano, superfície e sólidos de revolução', 'Vetores no R2 e no R3', 'Produto Escalar e Vetorial', 'A Reta', 'O Plano', 'Distâncias', 'Cônicas e Quádricas', 'Dependência e Independência Linear', 'Espaço Vetorial Real', 'Transformações Lineares', 'Autovalores e Autovetores']::text[]
where id = 1285 and cardinality(topics) = 1 and md5(topics[1]) = '49d6224eb22562b9c6936f0c4b4e8b3e'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1285);

update public.disciplines set topics = array['Noções sobre conjuntos', 'Trigonometria', 'Função de variável real: Limites', 'Derivadas', 'Estudo das funções: Monotonicidade, concavidade, máximos e mínimos, pontos de inflexão, assíntotas', 'construção de gráfico', 'Solução gráfica e analítica das equações numéricas']::text[]
where id = 1286 and cardinality(topics) = 1 and md5(topics[1]) = 'c7e95dcaf37817ca6b8cbd990a6eaaa8'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1286);

update public.disciplines set topics = array['Introdução às habilidades de compreensão e produção oral e escrita por meio de funções sociais e estruturas simples da língua', 'Ênfase na oralidade, atendendo às especificidades acadêmico-profissionais da área e abordando aspectos sócio-culturais da língua inglesa']::text[]
where id = 1287 and cardinality(topics) = 1 and md5(topics[1]) = 'c2bd0d2fda5c5bd59d8585aade1277c8'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1287);

update public.disciplines set topics = array['Noções de geometria descritiva', 'Escala', 'Convenções arquitetônicas', 'Plantas, cortes, fachadas', 'Introdução à computação gráfica', 'Representação gráfica em 2d']::text[]
where id = 1288 and cardinality(topics) = 1 and md5(topics[1]) = '47f9febc200c768582a643440c2349ee'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1288);

update public.disciplines set topics = array['Revisão de conceitos básicos de Química', 'Propriedades Químicas de Materiais utilizados em Construção Civil', 'Reações Químicas', 'Equilíbrio Químico', 'Estudo de Casos']::text[]
where id = 1289 and cardinality(topics) = 1 and md5(topics[1]) = '82c08da538f143c9c81e7f5da70b39be'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1289);

update public.disciplines set topics = array['Grandezas físicas', 'Equilíbrio de partícula e de sólido', 'Cinemática do ponto', 'Movimento no plano', 'Princípios de dinâmica', 'Trabalho, energia, potência', 'Máquinas e elasticidade', 'Dinâmica do sólido', 'Hidrostática e hidrodinâmica', 'Calor', 'Gás perfeito, transformações', 'Termodinâmica', 'primeira e segunda lei', 'Ciclos de transformação', 'Ciclo de Carnot']::text[]
where id = 1290 and cardinality(topics) = 1 and md5(topics[1]) = '01d70a188c0dc38dc0b6148c401cb74a'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1290);

update public.disciplines set topics = array['Desenvolvimento verbal', 'Organização do pensamento', 'Linguagem escrita e falada', 'Redação de textos técnicos e científicos', 'Elaboração de Relatório', 'Regras de tratamento e utilização de tempos verbais']::text[]
where id = 1291 and cardinality(topics) = 1 and md5(topics[1]) = '1423f34149818d880aec932d0114b2ad'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1291);

update public.disciplines set topics = array['Noções sobre vetores e aplicações à geometria analítica', 'Curvas no plano, superfície e sólidos de revolução', 'Vetores no R2 e no R3', 'Produto Escalar e Vetorial', 'A Reta', 'O Plano', 'Distâncias', 'Cônicas e Quádricas', 'Dependência e Independência Linear', 'Espaço Vetorial Real', 'Transformações Lineares', 'Autovalores e Autovetores']::text[]
where id = 1292 and cardinality(topics) = 1 and md5(topics[1]) = '49d6224eb22562b9c6936f0c4b4e8b3e'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1292);

update public.disciplines set topics = array['Noções sobre conjuntos', 'Trigonometria', 'Função de variável real: Limites', 'Derivadas', 'Estudo das funções: Monotonicidade, concavidade, máximos e mínimos, pontos de inflexão, assíntotas', 'construção de gráfico', 'Solução gráfica e analítica das equações numéricas']::text[]
where id = 1293 and cardinality(topics) = 1 and md5(topics[1]) = 'c7e95dcaf37817ca6b8cbd990a6eaaa8'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1293);

update public.disciplines set topics = array['Introdução às habilidades de compreensão e produção oral e escrita por meio de funções sociais e estruturas simples da língua', 'Ênfase na oralidade, atendendo às especificidades acadêmico-profissionais da área e abordando aspectos sócio-culturais da língua inglesa']::text[]
where id = 1294 and cardinality(topics) = 1 and md5(topics[1]) = 'c2bd0d2fda5c5bd59d8585aade1277c8'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1294);

update public.disciplines set topics = array['História e teoria do design', 'Fundamentos sociais do design', 'Movimentos que influenciaram o design', 'Revoluções industriais', 'Produção em massa', 'Produtos de design que marcaram época', 'História da Arte como referencial teórico para a compreensão do design']::text[]
where id = 1295 and cardinality(topics) = 1 and md5(topics[1]) = '4c3616091cdcbbb4122fb8ba88a4e102'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1295);

update public.disciplines set topics = array['Principais atividades do designer industrial', 'áreas de atuação', 'introdução às principais']::text[]
where id = 1296 and cardinality(topics) = 1 and md5(topics[1]) = 'c789dd65310959479c08057098761339'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1296);

update public.disciplines set topics = array['Desenho a mão livre', 'Desenho de memória e de observação', 'Desenho instrumental', 'Técnicas e estratégias de desenho', 'Noções de perspectiva, proporção, composição, luz e sombras, textura e volume e cor']::text[]
where id = 1297 and cardinality(topics) = 1 and md5(topics[1]) = '8c0292b011c383c9e2ec28d1a8055cdf'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1297);

update public.disciplines set topics = array['Introdução aos sistemas informacionais', 'Utilização da tecnologia de sistemas eletrônicos no cotidiano', 'Evolução das interfaces com o usuário', 'Dispositivos eletrônicos portáteis (gadgets)', 'Aplicativos de uso geral', 'Software livre no contexto do design de produto']::text[]
where id = 1298 and cardinality(topics) = 1 and md5(topics[1]) = 'e15a5869a135d144232e37bb3001accd'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1298);

update public.disciplines set topics = array['Introdução à Ciência e Tecnologia dos Materiais', 'Estrutura e ligação atômica', 'Estruturas cristalinas e geometria dos cristais, solidificação e defeitos cristalinos', 'Análise das propriedades mecânicas e elétricas dos materiais metálicos', 'Introdução ao estudo do Diagrama de Fases', 'Materiais Poliméricos', 'Materiais compósitos', 'Materiais magnéticos']::text[]
where id = 1299 and cardinality(topics) = 1 and md5(topics[1]) = 'ee5e3e4870b5288b20efc54081bdd01a'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1299);

update public.disciplines set topics = array['O aluno deverá ser capaz de redimensionar objetos a várias escalas, ter noções de proporção, de trigonometria, de funções de uma e várias variáveis, de geometria plana e espacial simples, resolver equações e sistemas de equações polinomiais e trigonométricas, analisar gráfico de funções, representar de forma bidimensional dados em sistemas de coordenadas cartesianas, calcular derivadas e integrais de funções de uma variável, inclusive com análise através de software, determinar área sob a curva utilizando integrais e também regras numéricas como a Regra dos Trapézios, determinar volume, comprimento de curva e área de superfície utilizando técnicas de integração, ajustar curvas e resolver problemas elementares de Design como o cálculo de áreas, volumes e proporção']::text[]
where id = 1300 and cardinality(topics) = 1 and md5(topics[1]) = '9ea47460ff2032679b3c7cda8d81047e'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1300);

update public.disciplines set topics = array['Técnicas de apresentação comercial', 'técnicas de montagem de portfólio físico e digital', 'oratória', 'postura corporal', 'etiqueta corporativa e empresarial', 'utilização de redes sociais profissionais', 'utilização de sites de hospedagem para portfólio digital', 'utilização de tipografias e cores adequadas para apresentações com projeção e uso em portfólios', 'trabalho individual', 'trabalho em grupo']::text[]
where id = 1301 and cardinality(topics) = 1 and md5(topics[1]) = '7e6f702820ed2cd9a288d76edbf05930'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1301);

update public.disciplines set topics = array['Reconhecer, fornecer e retransmitir informações pessoais e familiares, sobre locais, datas e horários, como em mensagens, avisos ou e-mails', 'Compreender e produzir instruções e comandos simples e familiares', 'Falar brevemente sobre si e descrever sentimentos', 'Perguntar e fornecer informações sobre rotina pessoal e de trabalho, apresentar-se e cumprimentar', 'Preencher formulários, de forma presencial ou on-line', 'Identificar aspectos socioculturais e interculturais das comunidades falantes da língua-alvo']::text[]
where id = 1302 and cardinality(topics) = 1 and md5(topics[1]) = '45f8f4574d1bdeaa67dfce88d33749cb'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1302);

update public.disciplines set topics = array['Meios de representação do espaço', 'Instrumentos de desenho e construção', 'Escalas de projeto', 'Fundamentos do raciocínio espacial em arquitetura e suas representações', 'O desenho como suporte para a percepção e configuração do espaço', 'Introdução às convenções para o desenho arquitetônico']::text[]
where id = 1306 and cardinality(topics) = 1 and md5(topics[1]) = 'e1cc6a0e0e40cc0498937b7d32bd9078'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1306);

update public.disciplines set topics = array['Sistemas de representação numérica: bases binária, octal e hexadecimal, conversão entre bases, aritmética com números binários', 'Noções de circuitos lógicos: funções lógicas, tabelas-verdade, portas lógicas', 'Álgebra booleana: propriedades, exemplos, relação de ordem parcial, decomposição canônica', 'Expressões e funções booleanas: formas canônicas e sua formas minimais, mapas de Karnaugh e outros métodos para minimização de expressões booleanas', 'PLA e circuitos combinacionais: somadores, subtratores, verificadores de paridade, codificadores, decodificadores, multiplexadores, demultiplexadores, comparadores, conversores de códigos', 'Circuitos sequenciais: flip flops, registradores, memória, contadores, noções de análise e projeto de circuitos sequenciais', 'Noções de organização de computadores']::text[]
where id = 1310 and cardinality(topics) = 1 and md5(topics[1]) = '6e912e6d97844af15581da59a6e6cf8f'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1310);

update public.disciplines set topics = array['FISIOLOGIA GERAL', 'Introdução à Fisiologia', 'Transporte através de membranas biológicas', 'Potencial de membrana', 'Condução do impulso nervoso', 'Transmissão sináptica', 'Sinalização celular. FISIOLOGIA DO SISTEMA NERVOSO', 'Sistemas sensoriais e motores', 'Motricidade esquelética', 'Motricidade e secreção viscerais', 'Sensibilidade álgica', 'Sensibilidade visual', 'Sensibilidade gustativa e olfativa', 'Ajustes internos. Comportamento', 'Sensibilidade interna e motivação', 'Sensibilidade às acelerações', 'Ritmos biológicos. Ciclo vigília-sono', 'Aprendizagem e memória', 'Recuperação de função', 'Comunicação não verbal. Linguagem. Atividade mental. FISIOLOGIA ENDÓCRINA', 'Princípios da Endocrinologia', 'Mecanismos de ação hormonal', 'Síntese e processamento hormonal', 'Secreção transporte e degradação hormonal', 'Funções dos hormônios: crescimento, desenvolvimento, termorregulação, metabolismo, balanço hídrico, osmótico e de cálcio']::text[]
where id = 1326 and cardinality(topics) = 1 and md5(topics[1]) = '27bc7cdc080955fdd6369b76f1a5fa33'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1326);

update public.disciplines set topics = array['Água e tampões biológicos', 'Estrutura e propriedades de aminoácidos, proteínas, enzimas, lipídios, carboidratos e membranas biológicas', 'Visão geral e integrada do metabolismo celular', 'Glicólise', 'Fermentações lática e alcoólica', 'Gliconeogênese', 'Beta-oxidação de ácidos graxos', 'Acetil-CoA: formação e destino', 'Ciclo de Krebs', 'Cadeia de transporte de elétrons e fosforilação oxidativa', 'Metabolismo do Glicogênio e Via das Pentoses-Fosfato', 'Síntese de ácidos graxos', 'Metabolismo de aminoácidos', 'Regulação metabólica, ação hormonal no controle do metabolismo (insulina, glucagon e epinefrina)', 'Integração e alterações metabólicas fisiológicas e patológicas']::text[]
where id = 1329 and cardinality(topics) = 1 and md5(topics[1]) = '5b93d6f551ab798b977d7f9d43b8a86d'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1329);

update public.disciplines set topics = array['Padrões de herança monogênica', 'Estrutura e funcionamento de genes', 'Bases moleculares das doenças genéticas mutações', 'Variabilidade genética humana e mecanismo multifatorial', 'Farmacogenética e Teratogênese', 'Organização do genoma humano', 'Cromossomos humanos e anomalias numéricas e estruturais', 'Cromossomos sexuais e determinação do sexo', 'Aconselhamento genético: aspectos éticos e psicológicos', 'Bases genéticas de características complexas, incluindo transtornos de neurodesenvolvimento e condições genéticas', 'Epigenética']::text[]
where id = 1339 and cardinality(topics) = 1 and md5(topics[1]) = '17ce9f2d0c3ba581906288a66b18574d'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1339);

update public.disciplines set topics = array['Humanos como primatas', 'Seleção sexual em humanos', 'Paleoantropologia', 'Arte, cultura e linguagem', 'Evolução recente de Homo sapiens', 'O Antropoceno']::text[]
where id = 1340 and cardinality(topics) = 1 and md5(topics[1]) = 'ec082e537d200e313fa9444f631f9660'
  and not exists (select 1 from public.chapter_contents cc where cc.discipline_id = 1340);
