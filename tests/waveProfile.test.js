import { describe, expect, it } from 'vitest';
import { getDifficulty } from '../src/game/difficulties.js';
import { getWaveProfile } from '../src/game/generator/waveProfile.js';

describe('wave generation profile', () => {
  const difficulty = {
    baseComplexity: 3,
    maxComplexity: 5,
  };

  it('keeps the teaching waves simple', () => {
    expect(getWaveProfile(difficulty, 1)).toEqual({
      maxComplexity: 3,
      transformChance: 0,
      hardDistractorChance: 0.05,
      parameterTier: 1,
    });
  });

  it('opens complexity and transformations in stages', () => {
    expect(getWaveProfile(difficulty, 4)).toMatchObject({
      maxComplexity: 4,
      transformChance: 0.15,
      parameterTier: 2,
    });
    expect(getWaveProfile(difficulty, 7)).toMatchObject({
      maxComplexity: 5,
      transformChance: 0.35,
      parameterTier: 3,
    });
  });

  it('raises late-wave pressure without exceeding the transform cap', () => {
    const profile = getWaveProfile(difficulty, 100);
    expect(profile.transformChance).toBe(0.7);
    expect(profile.hardDistractorChance).toBeLessThanOrEqual(0.95);
    expect(profile.parameterTier).toBe(6);
  });

  it('uses the difficulty template as the complexity ceiling', () => {
    const euclid = getWaveProfile(getDifficulty('euclid'), 10);
    expect(euclid.maxComplexity).toBe(2);
  });
});
