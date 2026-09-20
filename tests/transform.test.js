import { describe, expect, it } from 'vitest';
import { getDifficulty } from '../src/game/difficulties.js';
import { createRound } from '../src/game/mathFns.js';
import { getFunction } from '../src/game/functions/registry.js';
import {
  evaluateFunction,
  formatLocalCoordinates,
  worldToLocal,
} from '../src/game/functions/transform.js';

describe('coordinate transform system', () => {
  it('maps world coordinates back to local coordinates', () => {
    const transform = {
      tx: 2,
      ty: -1,
      rotation: Math.PI / 2,
      sx: 2,
      sy: 1,
    };
    expect(worldToLocal(0, 1, transform).x).toBeCloseTo(1);
    expect(worldToLocal(0, 1, transform).y).toBeCloseTo(2);
  });

  it('evaluates registry functions in transformed local space', () => {
    const affine = getFunction('affine');
    const instance = {
      params: { a: 2, b: 3 },
      transform: { tx: 2, ty: -1, rotation: Math.PI / 2, sx: 2, sy: 1 },
    };
    expect(evaluateFunction(affine, instance, 0, 1)).toBeCloseTo(8);
  });

  it('formats the local u/v coordinate system for transformed equations', () => {
    const label = formatLocalCoordinates({
      tx: 2,
      ty: -1,
      rotation: Math.PI / 4,
      sx: 1,
      sy: 1,
    });
    expect(label).toContain('u=');
    expect(label).toContain('v=');
    expect(label).toContain('x − 2.00');
    expect(label).toContain('y + 1.00');
  });

  it('generates flat, bounded transform instances for round functions', () => {
    let transformed = null;
    for (let attempt = 0; attempt < 100 && !transformed; attempt += 1) {
      const round = createRound(12, getDifficulty('gauss'));
      transformed = round.options.find((fn) => (
        fn.transform.tx !== 0
        || fn.transform.ty !== 0
        || fn.transform.rotation !== 0
        || fn.transform.sx !== 1
        || fn.transform.sy !== 1
      ));
    }
    expect(transformed).toBeTruthy();
    expect(Math.abs(transformed.transform.tx)).toBeLessThanOrEqual(2);
    expect(Math.abs(transformed.transform.ty)).toBeLessThanOrEqual(2);
    expect(transformed.transform.sx / transformed.transform.sy).toBeLessThan(1.8);
    expect(transformed.transform.sy / transformed.transform.sx).toBeLessThan(1.8);
    expect(transformed.label).toContain('u=');
    expect(transformed.label).toContain('v=');
  });
});
