import postgres from 'postgres';
import type { Sql } from '../platform/database/database.module.js';
import { DisciplinesRepository } from './disciplines.repository.js';

// Needs a scratch Postgres with every migration applied, never the real database:
// TEST_DATABASE_URL=postgresql://postgres:scratch@127.0.0.1:54399/postgres npm test -- disciplines.repository
const url = process.env.TEST_DATABASE_URL;
const MODEL = 'test/model-a';
const DIM = 1024;

/** A 1024-dim vector with `weights` on the given axes. */
const vec = (weights: Record<number, number>) =>
  Array.from({ length: DIM }, (_, i) => weights[i] ?? 0);

describe.skipIf(!url)('DisciplinesRepository on a scratch database', () => {
  let sql: Sql;
  let repo: DisciplinesRepository;
  let ids: { cell: string; civil: string; none: string; genetics: string };

  beforeAll(async () => {
    sql = postgres(url!, { max: 2 });
    repo = new DisciplinesRepository(sql);
    const [{ n }] =
      await sql`select count(*)::int as n from public.disciplines`;
    if (n > 0) throw new Error('Refusing to run: disciplines is not empty');

    const [{ id: source }] = await sql`
      insert into public.sources (adapter, label, url) values ('test', 'fixture', 'https://example.test') returning id`;
    const [{ id: inst }] = await sql`
      insert into public.institutions (inep_code, kind, name, short_name, source_id)
      values (999001, 'public', 'Instituição de Teste', 'IT', ${source}) returning id`;
    await sql`insert into public.cine_areas (code, name) values ('0511', 'Teste'), ('0421', 'Teste') on conflict do nothing`;
    const [{ id: bio }] = await sql`
      insert into public.professions (slug, name, cine_code) values ('teste-biologia', 'Biologia', '0511A01') returning id`;
    const [{ id: law }] = await sql`
      insert into public.professions (slug, name, cine_code) values ('teste-direito', 'Direito', '0421A01') returning id`;
    const course = async (inep: number, profession: number) =>
      (
        await sql`
        insert into public.courses (inep_code, institution_id, profession_id, name, city, source_id)
        values (${inep}, ${inst}, ${profession}, 'Curso', 'Cidade', ${source}) returning id`
      )[0].id as string;
    const cBio = await course(990001, bio);
    const cLaw = await course(990002, law);
    const discipline = async (
      code: string,
      name: string,
      topics: string[] | null,
    ) =>
      (
        await sql`
        insert into public.disciplines (institution_id, code, name, topics, source_id)
        values (${inst}, ${code}, ${name}, ${topics}, ${source}) returning id::text as id`
      )[0].id as string;
    ids = {
      cell: await discipline('T1', 'Citologia', ['célula', 'membrana']),
      civil: await discipline('T2', 'Direito Civil', [
        'contratos',
        'obrigações',
      ]),
      none: await discipline('T3', 'Sem tópicos', null),
      genetics: await discipline('T4', 'Genética', ['DNA', 'herança']),
    };
    const link = (
      course: string,
      discipline: string,
      year: number | null,
      term: number | null,
    ) =>
      sql`insert into public.curriculum_subjects (course_id, name, year, term, discipline_id, source_id)
        values (${course}, 'x', ${year}, ${term}, ${discipline}, ${source})`;
    await link(cBio, ids.cell, 1, 1); // first term: counts
    await link(cLaw, ids.cell, 2, 3); // later term: ignored
    await link(cLaw, ids.civil, 1, null); // year 1 without term: counts
    await link(cBio, ids.genetics, 1, 2); // year 1 but second term: ignored
  });

  beforeEach(async () => {
    await sql`delete from public.discipline_embeddings`;
  });

  afterAll(async () => {
    if (!sql) return;
    await sql`delete from public.curriculum_subjects where name = 'x'`;
    await sql`delete from public.disciplines where code like 'T_'`;
    await sql`delete from public.courses where inep_code in (990001, 990002)`;
    await sql`delete from public.professions where slug like 'teste-%'`;
    await sql`delete from public.cine_areas where name = 'Teste'`;
    await sql`delete from public.institutions where inep_code = 999001`;
    await sql`delete from public.sources where adapter = 'test'`;
    await sql.end();
  });

  const saveAll = async (model = MODEL) => {
    const pending = await repo.pending(model);
    await repo.save(
      model,
      pending.map((d, i) => ({ ...d, embedding: vec({ [i]: 1 }) })),
    );
  };

  it('lists only disciplines with topics as pending, with the embedded text', async () => {
    const pending = await repo.pending(MODEL);

    expect(pending.map((d) => d.id).sort()).toEqual(
      [ids.cell, ids.civil, ids.genetics].sort(),
    );
    expect(pending.find((d) => d.id === ids.cell)?.text).toBe(
      'Citologia: célula; membrana',
    );
  });

  it('has nothing pending after save', async () => {
    await saveAll();

    expect(await repo.pending(MODEL)).toEqual([]);
  });

  it('is pending again when the topics change, or when the model does', async () => {
    await saveAll();

    await sql`update public.disciplines set topics = array['célula','organelas'] where id = ${ids.cell}`;
    expect((await repo.pending(MODEL)).map((d) => d.id)).toEqual([ids.cell]);
    await sql`update public.disciplines set topics = array['célula','membrana'] where id = ${ids.cell}`;
    expect(await repo.pending(MODEL)).toEqual([]);

    expect(await repo.pending('test/model-b')).toHaveLength(3);
  });

  it('is pending again when the name changes', async () => {
    await saveAll();

    await sql`update public.disciplines set name = 'Biologia Celular' where id = ${ids.cell}`;
    expect((await repo.pending(MODEL)).map((d) => d.id)).toEqual([ids.cell]);
    await sql`update public.disciplines set name = 'Citologia' where id = ${ids.cell}`;
  });

  it('upserts: saving twice keeps one row and the latest model and vector', async () => {
    const row = { id: ids.cell, text: 'Citologia: célula; membrana' };
    await repo.save(MODEL, [{ ...row, embedding: vec({ 0: 1 }) }]);
    await repo.save('test/model-b', [{ ...row, embedding: vec({ 1: 1 }) }]);

    const rows =
      await sql`select model, embedding::text as e from public.discipline_embeddings where discipline_id = ${ids.cell}`;
    expect(rows).toHaveLength(1);
    expect(rows[0].model).toBe('test/model-b');
    expect(rows[0].e.startsWith('[0,1,0')).toBe(true);
  });

  it('saves nothing for an empty list', async () => {
    await repo.save(MODEL, []);

    expect(await sql`select 1 from public.discipline_embeddings`).toHaveLength(
      0,
    );
  });

  describe('nearest', () => {
    beforeEach(async () => {
      await repo.save(MODEL, [
        {
          id: ids.cell,
          text: 'Citologia: célula; membrana',
          embedding: vec({ 0: 1 }),
        },
        {
          id: ids.civil,
          text: 'Direito Civil: contratos; obrigações',
          embedding: vec({ 1: 1 }),
        },
        {
          id: ids.genetics,
          text: 'Genética: DNA; herança',
          embedding: vec({ 0: 1, 2: 1 }),
        },
      ]);
    });

    it('orders by cosine similarity and honours the limit', async () => {
      const all = await repo.nearest(MODEL, vec({ 0: 1 }), 10);
      const two = await repo.nearest(MODEL, vec({ 0: 1 }), 2);

      expect(all.map((m) => m.id)).toEqual([ids.cell, ids.genetics, ids.civil]);
      expect(all[0].similarity).toBeCloseTo(1, 2);
      expect(all[1].similarity).toBeCloseTo(Math.SQRT1_2, 2);
      expect(all[2].similarity).toBeCloseTo(0, 2);
      expect(two.map((m) => m.id)).toEqual([ids.cell, ids.genetics]);
    });

    it('returns the discipline, its institution, and careers from the first semester only', async () => {
      const byId = Object.fromEntries(
        (await repo.nearest(MODEL, vec({ 0: 1 }), 10)).map((m) => [m.id, m]),
      );

      expect(byId[ids.cell]).toMatchObject({
        name: 'Citologia',
        topics: ['célula', 'membrana'],
        institution: 'IT',
        careers: ['teste-biologia'], // its term-3 row in Direito is ignored
      });
      expect(byId[ids.civil].careers).toEqual(['teste-direito']); // year 1, no term
      expect(byId[ids.genetics].careers).toEqual([]); // only a second-term row
    });

    it('ignores vectors of another model', async () => {
      expect(await repo.nearest('test/model-b', vec({ 0: 1 }), 10)).toEqual([]);
    });
  });

  describe('table', () => {
    it('cascades when a discipline is deleted', async () => {
      await saveAll();
      const [{ id }] = await sql`
        insert into public.disciplines (institution_id, code, name, topics, source_id)
        select institution_id, 'T9', 'Efêmera', array['a'], source_id from public.disciplines where id = ${ids.cell}
        returning id::text as id`;
      await repo.save(MODEL, [
        { id, text: 'Efêmera: a', embedding: vec({ 5: 1 }) },
      ]);

      await sql`delete from public.disciplines where id = ${id}`;

      expect(
        await sql`select 1 from public.discipline_embeddings where discipline_id = ${id}`,
      ).toHaveLength(0);
      expect(
        await sql`select 1 from public.discipline_embeddings`,
      ).toHaveLength(3);
    });

    it('has row level security on and no access for anon or authenticated', async () => {
      const [{ relrowsecurity }] =
        await sql`select relrowsecurity from pg_class where oid = 'public.discipline_embeddings'::regclass`;
      expect(relrowsecurity).toBe(true);

      for (const role of ['anon', 'authenticated']) {
        const read = sql.begin(async (tx) => {
          await tx.unsafe(`set local role ${role}`);
          await tx`select * from public.discipline_embeddings`;
        });
        await expect(read).rejects.toMatchObject({ code: '42501' });
      }
    });
  });
});
