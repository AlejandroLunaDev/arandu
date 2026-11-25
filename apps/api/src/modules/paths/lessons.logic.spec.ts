import {
  EARLIER_MISSES,
  REVIEW_WHEN_CLEAN,
  reviewRefs,
  shuffled,
  splitLessons,
} from './lessons.logic.js';

describe('splitLessons', () => {
  it('gives the same split for the same seed', () => {
    expect(splitLessons(11, 'u:1:0')).toEqual(splitLessons(11, 'u:1:0'));
    expect(shuffled(11, 'x')).toEqual(shuffled(11, 'x'));
  });

  it('usually gives a different split for a different seed', () => {
    const splits = new Set(
      Array.from({ length: 10 }, (_, i) =>
        JSON.stringify(splitLessons(11, `user-${i}:1:0`)),
      ),
    );

    expect(splits.size).toBeGreaterThan(5);
  });

  it.each([
    [11, [4, 4, 3]],
    [8, [3, 3, 2]],
  ])('partitions 0..%i-1 into groups of %j, larger first', (n, sizes) => {
    const groups = splitLessons(n, 'seed');

    expect(groups.map((g) => g.length)).toEqual(sizes);
    expect(groups.flat().sort((a, b) => a - b)).toEqual(
      Array.from({ length: n }, (_, i) => i),
    );
  });
});

describe('reviewRefs', () => {
  const ref = (topic: number, index: number) => ({ topic, index });

  it("holds this chapter's misses once each", () => {
    const refs = reviewRefs(2, [ref(2, 5), ref(2, 1), ref(2, 5)], [], 11, 's');

    expect(refs).toEqual([ref(2, 5), ref(2, 1)]);
  });

  it('ignores refs of another topic among the misses of this chapter', () => {
    const refs = reviewRefs(2, [ref(2, 5), ref(1, 3)], [], 11, 's');

    expect(refs).toEqual([ref(2, 5)]);
  });

  it('takes a few stable exercises of the chapter when nothing was missed', () => {
    const refs = reviewRefs(2, [], [], 11, 's');

    expect(refs).toHaveLength(REVIEW_WHEN_CLEAN);
    expect(refs.every((r) => r.topic === 2)).toBe(true);
    expect(new Set(refs.map((r) => r.index)).size).toBe(REVIEW_WHEN_CLEAN);
    expect(reviewRefs(2, [], [], 11, 's')).toEqual(refs);
  });

  it('adds at most two earlier misses, from other topics, each once', () => {
    const refs = reviewRefs(
      2,
      [ref(2, 5)],
      [ref(2, 9), ref(0, 1), ref(0, 1), ref(1, 2), ref(1, 3)],
      11,
      's',
    );

    expect(EARLIER_MISSES).toBe(2);
    expect(refs).toEqual([ref(2, 5), ref(0, 1), ref(1, 2)]);
  });
});
