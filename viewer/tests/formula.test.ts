import { describe, it, expect } from 'vitest';
import { evaluate, resolveFormulas } from '../src/formula';
describe('Seamly arithmetic', () => {
  it('handles precedence, powers, unary signs and degree-based trig', () => {
    expect(evaluate('-2^2 + sqrt(25) + sin(30)')).toBeCloseTo(1.5);
    expect(evaluate('2^3^2')).toBe(512);
    expect(evaluate('#hip/4 + @ease', { '#hip': 96, '@ease': 2 })).toBe(26);
    expect(evaluate('1e-3 + .5')).toBe(.501);
  });
  it('resolves forward references and reports cyclic or missing inputs', () => {
    const result = resolveFormulas([{name:'#width',formula:'#hip/4'}, {name:'#hip',formula:'96'}, {name:'#bad',formula:'#missing'}]);
    expect(result.values['#width']).toBe(24); expect(result.errors['#bad']).toContain('#missing');
    expect(resolveFormulas([{name:'a',formula:'b'}, {name:'b',formula:'a'}]).errors.a).toBeDefined();
  });
  it('never evaluates code or non-finite arithmetic', () => {
    for (const input of ['globalThis.alert(1)', 'constructor(1)', '1/0', 'sqrt(-1)', '2;3', '2**3']) expect(() => evaluate(input)).toThrow();
  });
});
