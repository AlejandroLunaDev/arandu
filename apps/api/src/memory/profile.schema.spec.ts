import { boundProfile, profileInput } from './profile.schema.js';

const clean = {
  situation: 'Estou no 3º ano',
  likedSubjects: ['Matemática', 'Física'],
  hardSubjects: ['Química'],
  interests: ['música'],
  workStyle: ['em grupo'],
  admired: ['Marie Curie'],
  careerIdea: 'Engenharia',
  covered: ['situation', 'interests'] as ('situation' | 'interests')[],
};

describe('boundProfile', () => {
  const messy = {
    ...clean,
    situation: '   ',
    careerIdea: '',
    likedSubjects: ['  Matemática  ', '', '   ', 'a'.repeat(250)],
    interests: Array.from({ length: 12 }, (_, i) => `i${i}`),
    covered: ['situation', 'interests', 'situation'] as (
      'situation' | 'interests'
    )[],
  };

  it('trims, caps, drops empties, limits to 10 and dedupes covered', () => {
    const out = boundProfile(messy);

    expect(out.situation).toBeNull();
    expect(out.careerIdea).toBeNull();
    expect(out.likedSubjects).toEqual(['Matemática', 'a'.repeat(200)]);
    expect(out.interests).toEqual(messy.interests.slice(0, 10));
    expect(out.covered).toEqual(['situation', 'interests']);
  });

  it('always yields something profileInput accepts', () => {
    expect(profileInput.safeParse(messy).success).toBe(false);
    expect(profileInput.safeParse(boundProfile(messy)).success).toBe(true);
  });

  it('leaves a clean profile unchanged', () => {
    expect(boundProfile(clean)).toEqual(clean);
  });
});
