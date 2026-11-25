-- Clears every row loaded or produced while testing (owner, 2026-11-25): the catalog is reloaded from scratch and
-- checked against its sources before anything is built on it again. Kept: the sources registry and the Fatec unit map
-- the migrations seeded (the engine starts from them), the game settings, the landing's story, and the institutions
-- with their logos and photos (the census reload upserts them by INEP code and leaves the images alone).
-- No CASCADE: if a kept table referenced a cleared one, this fails instead of emptying it.

truncate table
  public.admission_cutoffs, public.arandu_facts, public.arandu_memories, public.arandu_messages,
  public.arandu_sessions, public.book_reflections, public.caixas, public.cine_areas, public.courses,
  public.curriculum_subjects, public.disciplines, public.journeys, public.lesson_results,
  public.owned_items, public.players, public.professions, public.scrape_runs, public.season_claims,
  public.session_refresh_tokens, public.sessions, public.stop_cards, public.stop_contents, public.stop_questions,
  public.stop_rereads, public.stop_results, public.users, public.wallets,
  staging.curriculum_courses, staging.curriculum_subjects, staging.inep_courses, staging.inep_ies,
  staging.mec_offers, staging.usp_cutoffs
restart identity;

-- Every source is fetched and parsed again on the next run.
update public.sources set last_content_hash = null, last_fetched_at = null;
