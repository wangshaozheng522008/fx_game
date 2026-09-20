import { equation, fmtN, generation, getEvaluationKey, quantize, smoothTransforms } from '../helpers.js';

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
  createParams() {
    return { a: quantize(3.4 + Math.random() * 3.4), b: quantize(2.6 + Math.random() * 3.2) };
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
  createParams() {
    const r = quantize(3.6 + Math.random() * 2.8);
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
