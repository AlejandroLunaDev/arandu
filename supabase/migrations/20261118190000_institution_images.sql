-- Logos and photos of the institutions the profession books show (ADR-0004): Wikimedia Commons files only, each read
-- on its File page on 2026-11-18 for licence, author and description, and checked by eye to depict that institution.
-- Institutions without a fitting file keep null: Anhembi Morumbi, the smaller Fatecs, the USJT logo (an "own work"
-- upload of a trademark) and the IFSP photo (no file of the Salto campus, where its book course is).
-- shortcut: a data fix by INEP code, so a fresh database without the census rows updates nothing; reload it after the census.
update public.institutions i
set logo_url = v.logo_url, logo_license = v.logo_license, logo_source_url = v.logo_source_url,
  photo_url = v.photo_url, photo_credit = v.photo_credit, photo_license = v.photo_license, photo_source_url = v.photo_source_url
from (
  values
    (852, 'https://upload.wikimedia.org/wikipedia/commons/d/d4/Fiap-logo-novo.jpg', 'CC BY-SA 4.0', 'https://commons.wikimedia.org/wiki/File:Fiap-logo-novo.jpg',
      'https://upload.wikimedia.org/wikipedia/commons/4/4a/Fiap-aclimacao-predio.jpg', 'Germanoparra', 'CC BY 3.0', 'https://commons.wikimedia.org/wiki/File:Fiap-aclimacao-predio.jpg'), -- FIAP
    (55, 'https://upload.wikimedia.org/wikipedia/commons/4/4b/Webysther_20160310_-_Logo_USP.svg', 'Public domain', 'https://commons.wikimedia.org/wiki/File:Webysther_20160310_-_Logo_USP.svg',
      'https://upload.wikimedia.org/wikipedia/commons/b/b7/Cidade_Universit%C3%A1ria%2C_USP%2C_Rel%C3%B3gio.JPG', 'Dornicke', 'CC BY 3.0', 'https://commons.wikimedia.org/wiki/File:Cidade_Universit%C3%A1ria%2C_USP%2C_Rel%C3%B3gio.JPG'), -- USP
    (591, 'https://upload.wikimedia.org/wikipedia/commons/e/e7/Logo_Unifesp_quadrado.png', 'CC BY-SA 4.0', 'https://commons.wikimedia.org/wiki/File:Logo_Unifesp_quadrado.png',
      'https://upload.wikimedia.org/wikipedia/commons/1/12/Campus_S%C3%A3o_Paulo_da_Unifesp.jpg', 'Alex Reipert', 'CC BY-SA 4.0', 'https://commons.wikimedia.org/wiki/File:Campus_S%C3%A3o_Paulo_da_Unifesp.jpg'), -- Unifesp
    (22, 'https://upload.wikimedia.org/wikipedia/commons/7/71/UPM.2_horizontal_vermelho.png', 'Public domain', 'https://commons.wikimedia.org/wiki/File:UPM.2_horizontal_vermelho.png',
      'https://upload.wikimedia.org/wikipedia/commons/e/ef/Edif%C3%ADcio_Jo%C3%A3o_Calvino.JPG', 'Victor Lopes', 'CC BY-SA 4.0', 'https://commons.wikimedia.org/wiki/File:Edif%C3%ADcio_Jo%C3%A3o_Calvino.JPG'), -- Mackenzie
    (7, 'https://upload.wikimedia.org/wikipedia/commons/2/2a/Ufscar-logo.png', 'CC BY-SA 4.0', 'https://commons.wikimedia.org/wiki/File:Ufscar-logo.png',
      'https://upload.wikimedia.org/wikipedia/commons/b/b7/Entrada_Sul_UFSCar.jpg', 'Melobozoga', 'Public domain', 'https://commons.wikimedia.org/wiki/File:Entrada_Sul_UFSCar.jpg'), -- UFSCar
    (203, null, null, null,
      'https://upload.wikimedia.org/wikipedia/commons/6/64/Universidade_S%C3%A3o_Judas_Tadeu%2C_campus_Jabaquara%2C_SP_-_2020.jpg', 'Vn.reis', 'CC BY-SA 4.0', 'https://commons.wikimedia.org/wiki/File:Universidade_S%C3%A3o_Judas_Tadeu%2C_campus_Jabaquara%2C_SP_-_2020.jpg'), -- USJT
    (1810, 'https://upload.wikimedia.org/wikipedia/commons/7/78/Instituto_Federal_de_S%C3%A3o_Paulo_-_Marca_Vertical_2015.svg', 'Public domain', 'https://commons.wikimedia.org/wiki/File:Instituto_Federal_de_S%C3%A3o_Paulo_-_Marca_Vertical_2015.svg',
      null, null, null, null), -- IFSP
    (4026, 'https://upload.wikimedia.org/wikipedia/commons/e/ef/FATEC_ZONA_LESTE.png', 'CC BY-SA 4.0', 'https://commons.wikimedia.org/wiki/File:FATEC_ZONA_LESTE.png',
      null, null, null, null) -- Fatec Zona Leste
) as v (inep_code, logo_url, logo_license, logo_source_url, photo_url, photo_credit, photo_license, photo_source_url)
where i.inep_code = v.inep_code;
