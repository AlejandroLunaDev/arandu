import { NotFoundException } from '@nestjs/common';
import { id, param } from './params.js';

describe('param', () => {
  const notFound = () => new NotFoundException({ code: 'x_not_found' });
  const pipe = param(id, notFound);
  const meta = { type: 'param' as const };

  it('passes the parsed value', () => {
    expect(pipe.transform('7', meta)).toBe(7);
  });

  it.each(['0', 'abc', '-1', '2147483648'])(
    'throws the given notFound for %s',
    (v) => {
      expect(() => pipe.transform(v, meta)).toThrow(NotFoundException);
    },
  );
});
