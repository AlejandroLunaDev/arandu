-- These 40 sources fail on every run and none ever stored a row in public (owner, 2026-11-25): 36 Fatec PPCs their
-- reader cannot parse, two USP subject pages of Educação física linked to another habilitação of the course, a
-- Mackenzie grid that answers HTTP 500 and an Anhembi Morumbi Pedagogia grid. Every career they name keeps the grid it
-- has from another source, except Manutenção industrial: it has none, and its two Fatec Itaquera PPCs set their text in
-- fonts with no unicode map, so only OCR could read them. Their staging rows (staging.fatec_documents,
-- staging.curriculum_courses) go with them.
delete from public.sources
where last_fetched_at is null
  and url in (
  'https://estaticos.animaeducacao.com.br/medias/1337027c-2847-4ec7-ae3b-36be2ac1257f.pdf',
  'https://bkpsitecpsnew.blob.core.windows.net/uploadsitecps/sites/137/2024/08/MATRIZGRHZONALESTE.pdf',
  'https://bkpsitecpsnew.blob.core.windows.net/uploadsitecps/sites/137/2024/08/PPC-Polimeros-ZL.pdf',
  'https://bkpsitecpsnew.blob.core.windows.net/uploadsitecps/sites/137/2024/08/Versao-final-do-PPC_2021_2_ZL-COMEX.pdf',
  'https://bkpsitecpsnew.blob.core.windows.net/uploadsitecps/sites/137/2025/02/PPC-atualizado-LOGISITCA-NOVO-2023.pdf',
  'https://bkpsitecpsnew.blob.core.windows.net/uploadsitecps/sites/137/2026/07/PPC-DesenvolvimentoSoftwareMultiplataformaFatecZLCesu-V1_2-2026.pdf',
  'https://bkpsitecpsnew.blob.core.windows.net/uploadsitecps/sites/181/2023/10/MATRIZ-CURRICULAR-GNI-com-capa-e-assinado-1.pdf',
  'https://bkpsitecpsnew.blob.core.windows.net/uploadsitecps/sites/181/2025/03/MATRIZ-CURRICULAR-CDN-com-capa-e-assinado-VERSAO-PARA-ALUNOS.pdf',
  'https://bkpsitecpsnew.blob.core.windows.net/uploadsitecps/sites/181/2025/03/PPC_Ciencia_de_Dados_para_Negocios_FatecSebrae_2025_1_Oficial.pdf',
  'https://bkpsitecpsnew.blob.core.windows.net/uploadsitecps/sites/250/2025/06/PPC-Design-do-Produto-versao-08-2020.pdf',
  'https://bkpsitecpsnew.blob.core.windows.net/uploadsitecps/sites/250/2026/04/PPC_CST_Transporte_Terrestre_Fatec_Tatuape_versao_dez2025.pdf',
  'https://bkpsitecpsnew.blob.core.windows.net/uploadsitecps/sites/250/2026/11/PPC_Graducacao_em_Arquitetura_e_Urbanismo_UE250.pdf',
  'https://bkpsitecpsnew.blob.core.windows.net/uploadsitecps/sites/251/2025/09/PPC_MNI_2025_1.pdf',
  'https://bkpsitecpsnew.blob.core.windows.net/uploadsitecps/sites/251/2025/09/PPC_MPS_2026_1_anual.pdf',
  'https://bkpsitecpsnew.blob.core.windows.net/uploadsitecps/sites/251/2026/02/PPC_CST_Manutencao_Industrial_Fatec_Itaquera_2025_1.pdf',
  'https://bkpsitecpsnew.blob.core.windows.net/uploadsitecps/sites/251/2026/02/PPC_CST_Mecanica_Processos_de_Soldagem_Fatec_Itaquera_2026_1__anual_.pdf',
  'https://bkpsitecpsnew.blob.core.windows.net/uploadsitecps/sites/70/2024/04/GE-MatrizCurricular.pdf',
  'https://bkpsitecpsnew.blob.core.windows.net/uploadsitecps/sites/70/2024/04/PPC-2014-v5-GE.pdf',
  'https://bkpsitecpsnew.blob.core.windows.net/uploadsitecps/sites/70/2025/11/PPCGestao-de-Recursos-Humanos-IP_2022.pdf',
  'https://fateczonasul.edu.br/wp-content/uploads/2022/02/GRADE-HORÁRIA_Multiplataforma_01.2022.pdf',
  'https://fateczonasul.edu.br/wp-content/uploads/2026/02/ADS_Grade_2022_2026-1_editais-1.pdf',
  'https://fateczonasul.edu.br/wp-content/uploads/2026/02/ADS_Grade_2022_2026-1_editais.pdf',
  'https://fateczonasul.edu.br/wp-content/uploads/2026/02/ADS_Grade_2026_2026-1_editais-1.pdf',
  'https://fateczonasul.edu.br/wp-content/uploads/2026/02/ADS_Grade_2026_2026-1_editais-2.pdf',
  'https://fateczonasul.edu.br/wp-content/uploads/2026/02/ADS_Grade_2026_2026-1_editais.pdf',
  'https://fateczonasul.edu.br/wp-content/uploads/2026/03/ADS_Grade_2022_2026-1_editais-1.pdf',
  'https://fateczonasul.edu.br/wp-content/uploads/2026/03/ADS_Grade_2022_2026-1_editais.pdf',
  'https://fateczonasul.edu.br/wp-content/uploads/2026/03/ADS_Grade_2026_2026-1_editais-2.pdf',
  'https://fateczonasul.edu.br/wp-content/uploads/2026/03/ADS_Grade_2026_2026-1_editais.pdf',
  'https://fateczonasul.edu.br/wp-content/uploads/2026/08/ADS_Grade-Antiga_2022_2026-2_Versao_01.08-2COMINSTRUCAO.pdf',
  'https://fateczonasul.edu.br/wp-content/uploads/2026/08/ADS_Grade-Antiga_2022_2026-2_Versao_14.08-1.pdf',
  'https://fateczonasul.edu.br/wp-content/uploads/2026/08/ADS_Grade-Antiga_2022_2026-2_Versao_14.08.pdf',
  'https://fateczonasul.edu.br/wp-content/uploads/2026/08/ADS_Grade-Nova_2026_2026-2_Versao_01.08-2COMINSTRUCAO.pdf',
  'https://fateczonasul.edu.br/wp-content/uploads/2026/08/ADS_Grade-Nova_2026_2026-2_Versao_01.08.2026-1.pdf',
  'https://fateczonasul.edu.br/wp-content/uploads/2026/08/ADS_Grade-Nova_2026_2026-2_Versao_14.08-1.pdf',
  'https://fateczonasul.edu.br/wp-content/uploads/2026/08/ADS_Grade-Nova_2026_2026-2_Versao_14.08.pdf',
  'https://fateczonasul.edu.br/wp-content/uploads/2026/08/PPC_ADS_FATEC-Zona-Sul_02.04.pdf',
  'https://www.mackenzie.br/graduacao/sao-paulo-higienopolis/ciencias-economicas/matriz-curricular',
  'https://uspdigital.usp.br/jupiterweb/obterDisciplina?sgldis=BMC0111&codcur=39041&codhab=100',
  'https://uspdigital.usp.br/jupiterweb/obterDisciplina?sgldis=QBQ0102&codcur=39041&codhab=100'
  );
