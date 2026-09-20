import { equation, fmtN, generation, getEvaluationKey, parameterTier, pick, quantize, smoothTransforms, tierRange } from '../helpers.js';

const common = {
  family: 'conic',
  complexity: 2,
  tags: ['smooth', 'single-component'],
  generation: generation(5, 1),
  transforms: smoothTransforms,
};

export const radialQuad = {
  ...common,
  id: 'radialQuad',
  tags: ['closed', 'smooth', 'single-component'],
  domain() {
    return true;
  },
  [getEvaluationKey()](_params, x, y) {
    return x * x + y * y;
  },
  createParams() {
    return {};
  },
  format(_params, level) {
    return equation('x² + y²', level);
  },
};

export const ellipse = {
  ...common,
  id: 'ellipse',
  tags: ['closed', 'smooth', 'single-component'],
  domain() {
    return true;
  },
  [getEvaluationKey()](params, x, y) {
    return (x * x) / (params.a * params.a) + (y * y) / (params.b * params.b);
  },
  getLevel() {
    return 1;
  },
  createParams(ctx) {
    return {
      a: quantize(tierRange(ctx, [[3.8, 4.8], [3.4, 6.8], [2.8, 7.2]])),
      b: quantize(tierRange(ctx, [[3.0, 4.2], [2.6, 5.8], [2.2, 6.5]])),
    };
  },
  format(params, level) {
    return `x²/${fmtN(params.a * params.a)} + y²/${fmtN(params.b * params.b)} = ${fmtN(level)}`;
  },
};

export const circleFixed = {
  ...common,
  id: 'circleFixed',
  tags: ['closed', 'smooth', 'single-component'],
  domain() {
    return true;
  },
  [getEvaluationKey()](_params, x, y) {
    return x * x + y * y;
  },
  getLevel(params) {
    return params.r2;
  },
  createParams(ctx) {
    const r = quantize(tierRange(ctx, [[4.2, 5.0], [3.6, 6.4], [3.0, 6.8]]));
    return { r, r2: Math.round(r * r * 100) / 100 };
  },
  format(_params, level) {
    return equation('x² + y²', level);
  },
};

export const diamond = {
  ...common,
  id: 'diamond',
  tags: ['closed', 'piecewise-smooth', 'single-component'],
  domain() {
    return true;
  },
  [getEvaluationKey()](_params, x, y) {
    return Math.abs(x) + Math.abs(y);
  },
  createParams() {
    return {};
  },
  format(_params, level) {
    return equation('|x| + |y|', level);
  },
};

export const stretchRad = {
  ...common,
  id: 'stretchRad',
  tags: ['closed', 'smooth', 'single-component'],
  domain() {
    return true;
  },
  [getEvaluationKey()](_params, x, y) {
    return Math.sqrt(x * x + 4 * y * y);
  },
  createParams() {
    return {};
  },
  format(_params, level) {
    return equation('√(x² + 4y²)', level);
  },
};

export const superellipse = {
  ...common,
  id: 'superellipse',
  complexity: 3,
  tags: ['closed', 'smooth', 'single-component'],
  domain() {
    return true;
  },
  [getEvaluationKey()](params, x, y) {
    return (Math.abs(x) / params.a) ** params.p + (Math.abs(y) / params.b) ** params.p;
  },
  createParams(ctx) {
    const tier = parameterTier(ctx);
    const powers = tier <= 2 ? [2] : tier === 3 ? [1.5, 2, 3] : [1.5, 2, 3, 4];
    return {
      a: quantize(tierRange(ctx, [[4, 4.8], [3.4, 5.8], [3, 6]])),
      b: quantize(tierRange(ctx, [[3, 3.8], [2.6, 4.8], [2, 5]])),
      p: pick(powers),
    };
  },
  format(params, level) {
    return `|x/${fmtN(params.a)}|^${params.p} + |y/${fmtN(params.b)}|^${params.p} = ${fmtN(level)}`;
  },
};

export const lemniscate = {
  ...common,
  id: 'lemniscate',
  complexity: 5,
  tags: ['closed', 'self-intersecting', 'single-component'],
  generation: generation(4.5, 2),
  // Keep the singular crossing canonical; transforming it can clip both lobes
  // before the four-actor sampler finds a valid separation.
  transforms: { translate: false, rotate: false, scale: false },
  domain() {
    return true;
  },
  [getEvaluationKey()](params, x, y) {
    const radiusSquared = x * x + y * y;
    return radiusSquared * radiusSquared - params.a * params.a * (x * x - y * y);
  },
  getLevel() {
    return 0;
  },
  createParams(ctx) {
    return { a: tierRange(ctx, [[8, 8.2], [8, 8.4], [8, 8.6]]) };
  },
  format(params) {
    return `(x² + y²)² − ${fmtN(params.a * params.a)}(x² − y²) = 0`;
  },
};
