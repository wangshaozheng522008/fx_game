import { describe, expect, it } from 'vitest';
import { getFunction } from '../src/game/functions/registry.js';

const additions = [
  ['superellipse', 3],
  ['sinSum', 2],
  ['trigProduct', 3],
  ['radialWave', 3],
  ['cubicHarmonic', 4],
  ['lemniscate', 5],
  ['rose', 5],
  ['spiral', 5],
  ['logSumExp', 4],
  ['reciprocalSum', 4],
];

describe('expanded mathematical function library', () => {
  it('registers all new functions with the requested complexity', () => {
    additions.forEach(([id, complexity]) => {
      const definition = getFunction(id);
      expect(definition).toBeTruthy();
      expect(definition.complexity).toBe(complexity);
      expect(definition.createParams({ parameterTier: 4 })).toBeTruthy();
    });
  });

  it('keeps the log-sum-exp evaluation finite for large inputs', () => {
    const logSumExp = getFunction('logSumExp');
    expect(logSumExp.eval({}, 1000, 999)).toBeCloseTo(1000.3133, 3);
    expect(Number.isFinite(logSumExp.eval({}, -1000, -999))).toBe(true);
  });

  it('enforces reciprocal-sum domain exclusions', () => {
    const reciprocalSum = getFunction('reciprocalSum');
    expect(reciprocalSum.domain(0.2, 1)).toBe(false);
    expect(reciprocalSum.domain(1, -0.2)).toBe(false);
    expect(reciprocalSum.domain(1, -1)).toBe(true);
  });

  it('uses the squared implicit rose equation for negative-radius petals', () => {
    const rose = getFunction('rose');
    expect(rose.eval({ a: 2, k: 2 }, 0, -2)).toBeCloseTo(0);
    expect(rose.format({ a: 2, k: 2 }, 0)).toBe('r² = 4.00cos²(2θ)');
  });

  it('disables transforms for polar equations except atan2', () => {
    ['cardioid', 'polarRT', 'rose', 'spiral'].forEach((id) => {
      expect(getFunction(id).transforms).toEqual({
        translate: false,
        rotate: false,
        scale: false,
      });
    });
    expect(getFunction('atan2').transforms).toEqual({
      translate: true,
      rotate: true,
      scale: true,
    });
  });
});
