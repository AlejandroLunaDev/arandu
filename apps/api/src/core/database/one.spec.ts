import { one } from './one.js';

describe('one', () => {
  it('returns the first row', () => {
    expect(one([{ a: 1 }, { a: 2 }])).toEqual({ a: 1 });
  });

  it('throws on no rows', () => {
    expect(() => one([])).toThrow('Expected the query to return a row');
  });
});
