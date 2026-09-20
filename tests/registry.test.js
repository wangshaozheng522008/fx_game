import { describe, expect, it } from 'vitest';
import { getFunction, getFunctions, validateRegistry } from '../src/game/functions/registry.js';

describe('function registry', () => {
  it('validates all definitions and difficulty references', () => {
    expect(validateRegistry()).toBe(true);
    expect(getFunctions()).toHaveLength(27);
    expect(getFunctions({ includeDisabled: true })).toHaveLength(28);
  });

  it('filters by metadata', () => {
    const closed = getFunctions({ tags: ['closed'] });
    expect(closed.length).toBeGreaterThan(0);
    closed.forEach((fn) => expect(fn.tags).toContain('closed'));

    const simple = getFunctions({ maxComplexity: 1 });
    expect(simple.map((fn) => fn.id)).toEqual(expect.arrayContaining(['affine', 'axisX', 'axisY']));
    simple.forEach((fn) => expect(fn.complexity).toBeLessThanOrEqual(1));

    const conics = getFunctions({ families: ['conic'] });
    expect(conics.length).toBeGreaterThan(0);
    conics.forEach((fn) => expect(fn.family).toBe('conic'));
  });

  it('exposes the evaluation and compatibility interfaces', () => {
    const affine = getFunction('affine');
    expect(affine).toBeTruthy();
    expect(affine.eval({ a: 2, b: 3 }, 4, 5)).toBe(23);
    expect(affine.F({ a: 2, b: 3 }, 4, 5)).toBe(23);
    expect(affine.domain(0, 0)).toBe(true);
    expect(affine.inDomain(0, 0)).toBe(true);
    expect(getFunction('not-a-function')).toBeUndefined();
  });

  it('keeps disabled definitions out of the default question pool', () => {
    expect(getFunctions({ family: 'polar' }).map((fn) => fn.id)).not.toContain('spiral');
    expect(getFunction('spiral')).toBeTruthy();
  });

  it('reports unknown difficulty function ids', () => {
    expect(() => validateRegistry({
      difficulties: [{ id: 'test', types: ['missing-function'] }],
    })).toThrow(/unknown function id/);
  });
});
