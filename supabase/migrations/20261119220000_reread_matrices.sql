-- The UFSCar and Mackenzie grade readers now drop total and label rows ('Sub-Total', 'Carga-horária do Período',
-- '2°', 'Período(s) Oferecido(s):') and read UFSCar's shifted name cells. A source is parsed only when its digest
-- changes, so the hashes are cleared: the next ufscar_curriculum and mackenzie_curriculum runs re-read every grade.
update public.sources set last_content_hash = null
where adapter in ('ufscar_curriculum', 'mackenzie_curriculum') and last_content_hash is not null;
