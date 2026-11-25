import { describe, expect, it } from 'vitest';
import { CalcError, evaluate, variablesOf } from './calc.js';

describe('evaluate', () => {
  it.each([
    ['(a + b + c) / 3', { a: 4, b: 7, c: 10 }, 7],
    ['2 + 3 * 4', {}, 14],
    ['(2 + 3) * 4', {}, 20],
    ['2 ^ 3 ^ 2', {}, 512],
    ['-2 ^ 2', {}, -4],
    ['10 % 4', {}, 2],
    ['sqrt(16) + abs(-3)', {}, 7],
    ['round(2.345, 2)', {}, 2.35],
    ['max(1, x, 3)', { x: 9 }, 9],
    ['c * (1 + i) ^ n', { c: 1000, i: 0.1, n: 2 }, 1210.0000000000002],
    ['1.5e3 + .5', {}, 1500.5],
  ])('%s = %s', (expression, variables, expected) => {
    expect(evaluate(expression, variables)).toBe(expected);
  });

  it.each([
    ['p and not q', { p: true, q: false }, true],
    ['p -> q', { p: true, q: false }, false],
    ['p -> q', { p: false, q: false }, true],
    ['p <-> q', { p: false, q: false }, true],
    ['p || q && false', { p: false, q: true }, false],
    ['!p', { p: true }, false],
    ['x > 3 and x <= 5', { x: 5 }, true],
    ['x == 2', { x: 2 }, true],
  ])('%s with %o is %s', (expression, variables, expected) => {
    expect(evaluate(expression, variables)).toBe(expected);
  });

  it.each([
    ['an unknown name', 'a + z', { a: 1 }],
    ['an unknown character', 'a ; b', { a: 1, b: 2 }],
    ['an unclosed parenthesis', '(a + 1', { a: 1 }],
    ['extra text', 'a b', { a: 1, b: 2 }],
    ['a number where a boolean goes', 'a and true', { a: 1 }],
    ['a boolean where a number goes', 'p + 1', { p: true }],
    ['code', 'process.exit(1)', {}],
    ['an inherited constant name', 'constructor', {}],
    ['an inherited variable name', 'toString + 1', {}],
    ['an inherited function name', 'hasOwnProperty(1)', {}],
  ])('throws CalcError on %s', (_, expression, variables) => {
    expect(() => evaluate(expression, variables)).toThrow(CalcError);
  });
});

describe('variablesOf', () => {
  it('lists the variables, not the functions or constants', () => {
    expect(variablesOf('round(a * pi + b, 2) + sqrt(a)')).toEqual(['a', 'b']);
  });

  it('throws CalcError on a formula that does not parse', () => {
    expect(() => variablesOf('a +')).toThrow(CalcError);
  });
});
