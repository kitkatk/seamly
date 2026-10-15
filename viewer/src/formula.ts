// A deliberately small arithmetic parser. Pattern files never execute JavaScript.
const functions: Record<string, (...args: number[]) => number> = {
  sqrt: Math.sqrt, abs: Math.abs, min: Math.min, max: Math.max,
  floor: Math.floor, ceil: Math.ceil, round: Math.round,
  sin: x => Math.sin(x * Math.PI / 180), cos: x => Math.cos(x * Math.PI / 180),
  tan: x => Math.tan(x * Math.PI / 180),
  asin: x => Math.asin(x) * 180 / Math.PI, acos: x => Math.acos(x) * 180 / Math.PI,
  atan: x => Math.atan(x) * 180 / Math.PI,
};

export function evaluate(formula: string, values: Record<string, number> = {}): number {
  const tokens = formula.match(/(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?|[#@]?[\p{L}_][\p{L}\p{N}_]*|[^\s]/gu) ?? [];
  let index = 0;
  const take = () => tokens[index++];
  function primary(): number {
    const token = take();
    if (token === '+' || token === '-') return (token === '-' ? -1 : 1) * expression(3);
    if (token === '(') {
      const value = expression(0);
      if (take() !== ')') throw new Error('Missing closing parenthesis');
      return value;
    }
    if (token && /^(?:\d|\.\d)/.test(token)) return Number(token);
    if (tokens[index] === '(' && Object.hasOwn(functions, token)) {
      take();
      const args = [expression(0)];
      while (tokens[index] === ',') { take(); args.push(expression(0)); }
      if (take() !== ')') throw new Error('Missing function parenthesis');
      return functions[token](...args);
    }
    if (token === 'pi' || token === 'PI') return Math.PI;
    if (Object.hasOwn(values, token)) return values[token];
    throw new Error(`Unknown formula input: ${token ?? '(empty)'}`);
  }
  function expression(minimum: number): number {
    let left = primary();
    const precedence: Record<string, number> = { '+': 1, '-': 1, '*': 2, '/': 2, '^': 4 };
    while (index < tokens.length) {
      const operator = tokens[index], level = precedence[operator] ?? -1;
      if (level < minimum) break;
      take();
      const right = expression(level + (operator === '^' ? 0 : 1));
      if (operator === '+') left += right;
      else if (operator === '-') left -= right;
      else if (operator === '*') left *= right;
      else if (operator === '/') left /= right;
      else left **= right;
    }
    return left;
  }
  const result = expression(0);
  if (index !== tokens.length) throw new Error(`Unexpected token: ${tokens[index]}`);
  if (!Number.isFinite(result) || Math.abs(result) > 1e9) throw new Error('Formula result is outside the supported range');
  return result;
}

export function resolveFormulas(items: { name: string; formula: string }[], initial: Record<string, number> = {}) {
  const values = { ...initial }, errors: Record<string, string> = {};
  let pending = [...items];
  for (let pass = 0; pending.length && pass <= items.length; pass++) {
    const next = [];
    for (const item of pending) {
      try { values[item.name] = evaluate(item.formula, values); delete errors[item.name]; }
      catch (error) { errors[item.name] = (error as Error).message; next.push(item); }
    }
    if (next.length === pending.length) break;
    pending = next;
  }
  return { values, errors };
}
