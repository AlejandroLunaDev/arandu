/**
 * A small calculator for the formulas the model writes in a problem piece. It parses the text itself and never runs it
 * as code (no eval, no Function): numbers, booleans, variables, + - * / % ^, comparisons, and/or/not/->/<->, and a few
 * functions. Anything else throws CalcError.
 */
export type Value = number | boolean;

export class CalcError extends Error {}

const FUNCTIONS: Record<string, (...args: number[]) => number> = {
  sqrt: Math.sqrt,
  abs: Math.abs,
  floor: Math.floor,
  ceil: Math.ceil,
  ln: Math.log,
  log10: Math.log10,
  exp: Math.exp,
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  min: Math.min,
  max: Math.max,
  round: (x, digits = 0) => {
    const f = 10 ** digits;
    return Math.round(x * f) / f;
  },
};
const CONSTANTS: Record<string, Value> = {
  pi: Math.PI,
  e: Math.E,
  true: true,
  false: false,
};
const WORDS = new Set(['and', 'or', 'not']);

/** A name a variable cannot take: a function, a constant or an operator word would shadow it. */
export const reserved = (name: string) =>
  Object.hasOwn(FUNCTIONS, name) ||
  Object.hasOwn(CONSTANTS, name) ||
  WORDS.has(name);

type Token =
  | { type: 'number'; value: number }
  | { type: 'name'; value: string }
  | { type: 'op'; value: string };

const OPS = [
  '<->',
  '->',
  '<=',
  '>=',
  '==',
  '!=',
  '&&',
  '||',
  '+',
  '-',
  '*',
  '/',
  '%',
  '^',
  '(',
  ')',
  ',',
  '<',
  '>',
  '!',
];

function tokens(text: string): Token[] {
  const out: Token[] = [];
  let i = 0;
  while (i < text.length) {
    const rest = text.slice(i);
    const space = /^\s+/.exec(rest);
    if (space) {
      i += space[0].length;
      continue;
    }
    const number = /^(\d+(\.\d+)?|\.\d+)([eE][+-]?\d+)?/.exec(rest);
    if (number) {
      out.push({ type: 'number', value: Number(number[0]) });
      i += number[0].length;
      continue;
    }
    const name = /^[A-Za-z_][A-Za-z0-9_]*/.exec(rest);
    if (name) {
      const word = name[0];
      out.push(
        WORDS.has(word)
          ? { type: 'op', value: word }
          : { type: 'name', value: word },
      );
      i += word.length;
      continue;
    }
    const op = OPS.find((o) => rest.startsWith(o));
    if (!op) throw new CalcError(`Unexpected "${rest[0]}"`);
    out.push({ type: 'op', value: op });
    i += op.length;
  }
  return out;
}

const num = (v: Value): number => {
  if (typeof v !== 'number') throw new CalcError('A number was expected');
  return v;
};
const bool = (v: Value): boolean => {
  if (typeof v !== 'boolean') throw new CalcError('A true/false was expected');
  return v;
};

/** The names a formula reads, functions and constants aside. Throws CalcError when it does not parse. */
export function variablesOf(expression: string): string[] {
  const names = new Set<string>();
  parse(
    expression,
    (name) => {
      names.add(name);
      return 0;
    },
    true,
  );
  return [...names];
}

/** The formula's value with these variables. Throws CalcError on a parse error, an unknown name or a type mix. */
export function evaluate(
  expression: string,
  variables: Record<string, Value>,
): Value {
  return parse(expression, (name) => {
    if (!Object.hasOwn(variables, name))
      throw new CalcError(`Unknown name "${name}"`);
    return variables[name]!;
  });
}

function parse(
  expression: string,
  lookup: (name: string) => Value,
  // When only collecting names, types are not checked (every variable reads as 0).
  loose = false,
): Value {
  const list = tokens(expression);
  let at = 0;
  const peek = () => list[at];
  const isOp = (...ops: string[]) => {
    const t = peek();
    return t?.type === 'op' && ops.includes(t.value);
  };
  const take = () => {
    const t = list[at++];
    if (!t) throw new CalcError('The formula ends too early');
    return t;
  };
  const expect = (op: string) => {
    const t = take();
    if (t.type !== 'op' || t.value !== op)
      throw new CalcError(`"${op}" was expected`);
  };
  const n = (v: Value) => (loose ? Number(v) : num(v));
  const b = (v: Value) => (loose ? Boolean(v) : bool(v));

  // Lowest precedence first: <-> , -> , or , and , not , comparison , + - , * / % , unary - , ^ , atom.
  const iff = (): Value => {
    let left = implies();
    while (isOp('<->')) {
      take();
      const right = implies();
      left = b(left) === b(right);
    }
    return left;
  };
  const implies = (): Value => {
    const left = or();
    if (!isOp('->')) return left;
    take();
    const right = implies();
    return !b(left) || b(right);
  };
  const or = (): Value => {
    let left = and();
    while (isOp('or', '||')) {
      take();
      const right = and();
      left = b(left) || b(right);
    }
    return left;
  };
  const and = (): Value => {
    let left = not();
    while (isOp('and', '&&')) {
      take();
      const right = not();
      left = b(left) && b(right);
    }
    return left;
  };
  const not = (): Value => {
    if (isOp('not', '!')) {
      take();
      return !b(not());
    }
    return compare();
  };
  const compare = (): Value => {
    const left = sum();
    if (!isOp('==', '!=', '<', '<=', '>', '>=')) return left;
    const op = take().value;
    const right = sum();
    if (op === '==') return left === right;
    if (op === '!=') return left !== right;
    const [x, y] = [n(left), n(right)];
    return op === '<'
      ? x < y
      : op === '<='
        ? x <= y
        : op === '>'
          ? x > y
          : x >= y;
  };
  const sum = (): Value => {
    let left = product();
    while (isOp('+', '-')) {
      const op = take().value;
      const right = product();
      left = op === '+' ? n(left) + n(right) : n(left) - n(right);
    }
    return left;
  };
  const product = (): Value => {
    let left = unary();
    while (isOp('*', '/', '%')) {
      const op = take().value;
      const right = unary();
      left =
        op === '*'
          ? n(left) * n(right)
          : op === '/'
            ? n(left) / n(right)
            : n(left) % n(right);
    }
    return left;
  };
  const unary = (): Value => {
    if (isOp('-')) {
      take();
      return -n(unary());
    }
    if (isOp('+')) {
      take();
      return n(unary());
    }
    return power();
  };
  const power = (): Value => {
    const base = atom();
    if (!isOp('^')) return base;
    take();
    // Right-associative, and binds tighter than a unary minus on its left: -2^2 is -4.
    return n(base) ** n(unary());
  };
  const atom = (): Value => {
    const t = take();
    if (t.type === 'number') return t.value;
    if (t.type === 'op') {
      if (t.value !== '(') throw new CalcError(`Unexpected "${t.value}"`);
      const inner = iff();
      expect(')');
      return inner;
    }
    // Own keys only: an inherited name ("constructor", "toString") is never a function, constant or variable.
    const fn = Object.hasOwn(FUNCTIONS, t.value)
      ? FUNCTIONS[t.value]
      : undefined;
    if (fn && isOp('(')) {
      take();
      const args = [n(iff())];
      while (isOp(',')) {
        take();
        args.push(n(iff()));
      }
      expect(')');
      return fn(...args);
    }
    if (Object.hasOwn(CONSTANTS, t.value)) return CONSTANTS[t.value]!;
    return lookup(t.value);
  };

  const value = iff();
  if (at < list.length) throw new CalcError('The formula has extra text');
  return value;
}
