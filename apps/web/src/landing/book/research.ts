// The research book's pages: the problem Arandu comes to solve, each figure with its source.
// Verified at each source on 2026-11-18.

export type Fact = { figure: string; text: string; source: { label: string; url: string } };

export const FACTS: Fact[] = [
  {
    figure: "1 em 4",
    text: "estudantes de cursos presenciais deixou o curso em 2024 (24,8%). No ensino a distância, 41,6%.",
    source: { label: "Semesp, Mapa do Ensino Superior, 16ª ed.", url: "https://www.semesp.org.br/mapa/edicao-16/brasil/" },
  },
  {
    figure: "7.370.879",
    text: "matrículas no ensino médio no Brasil, em 2025.",
    source: {
      label: "INEP, Censo Escolar 2025",
      url: "https://www.gov.br/inep/pt-br/centrais-de-conteudo/noticias/censo-escolar/inep-apresenta-os-grandes-numeros-da-educacao-basica",
    },
  },
  {
    figure: "Projeto de vida",
    text: "A lei assegura aos estudantes oportunidades de construir seus projetos de vida.",
    source: {
      label: "Lei 14.945/2024, LDB art. 35-B, § 2º",
      url: "https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2024/lei/l14945.htm",
    },
  },
];

export const ANSWER = {
  title: "Viver antes de escolher",
  lines: [
    "Com o Arandu, você experimenta uma carreira por dentro: matérias reais do primeiro semestre, com fonte.",
    "Família e escola acompanham a jornada junto com você.",
  ],
};
