import { lessonCards, lessonOpen } from './lessons.logic.js';

describe('lessonOpen', () => {
  it.each([
    [1, []],
    [2, []],
    [1, [2]],
    [3, [1, 2]],
    [3, [2, 1, 3]],
  ])('opens lesson %i with %j done', (lesson, done) => {
    expect(lessonOpen(lesson, new Set(done))).toBe(true);
  });

  it.each([
    [3, []],
    [3, [1]],
    [3, [2]],
  ])('keeps lesson %i locked with %j done', (lesson, done) => {
    expect(lessonOpen(lesson, new Set(done))).toBe(false);
  });
});

describe('lessonCards', () => {
  const split = (n: number) => {
    const cards = Array.from({ length: n }, (_, i) => i);
    return [1, 2, 3].map((lesson) => lessonCards(cards, lesson));
  };

  it.each([
    [3, [[0], [1], [2]]],
    [4, [[0, 1], [2], [3]]],
    [5, [[0, 1], [2, 3], [4]]],
  ])('splits %i cards across the lessons, earlier ones first', (n, lessons) => {
    expect(split(n)).toEqual(lessons);
  });

  it.each([1, 2])(
    'shows all %i cards in every lesson when there are fewer than 3',
    (n) => {
      const all = Array.from({ length: n }, (_, i) => i);
      expect(split(n)).toEqual([all, all, all]);
    },
  );
});
