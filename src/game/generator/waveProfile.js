export function getWaveProfile(difficulty, wave) {
  const currentWave = Math.max(1, Math.floor(Number(wave) || 1));
  const baseComplexity = difficulty.baseComplexity ?? 1;
  const maxDifficultyComplexity = difficulty.maxComplexity ?? baseComplexity;

  if (currentWave <= 3) {
    return {
      maxComplexity: Math.min(maxDifficultyComplexity, baseComplexity),
      transformChance: 0,
      hardDistractorChance: 0.05,
      parameterTier: 1,
    };
  }

  if (currentWave <= 6) {
    return {
      maxComplexity: Math.min(maxDifficultyComplexity, baseComplexity + 1),
      transformChance: 0.15,
      hardDistractorChance: 0.4,
      parameterTier: 2,
    };
  }

  if (currentWave <= 10) {
    return {
      maxComplexity: maxDifficultyComplexity,
      transformChance: 0.35,
      hardDistractorChance: 0.7,
      parameterTier: 3,
    };
  }

  const extra = Math.floor((currentWave - 10) / 3);
  return {
    maxComplexity: maxDifficultyComplexity,
    transformChance: Math.min(0.7, 0.35 + extra * 0.05),
    hardDistractorChance: Math.min(0.95, 0.7 + extra * 0.05),
    parameterTier: Math.min(6, 3 + extra),
  };
}
