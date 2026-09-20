import { equation, generation, getEvaluationKey, smoothTransforms } from '../helpers.js';

const common = {
  family: 'exotic',
  complexity: 4,
  tags: ['open', 'smooth', 'multi-component'],
  generation: generation(2.5, 8),
  transforms: smoothTransforms,
};

export const bilinear = {
  ...common,
  id: 'bilinear',
  domain() {
    return true;
  },
  [getEvaluationKey()](_params, x, y) {
    return x * y;
  },
  createParams() {
    return {};
  },
  format(_params, level) {
    return equation('xy', level);
  },
};

export const saddle = {
  ...common,
  id: 'saddle',
  tags: ['open', 'smooth', 'two-component'],
  domain() {
    return true;
  },
  [getEvaluationKey()](_params, x, y) {
    return x * x - y * y;
  },
  createParams() {
    return {};
  },
  format(_params, level) {
    return equation('x² − y²', level);
  },
};

export const cubicHarmonic = {
  ...common,
  id: 'cubicHarmonic',
  tags: ['open', 'smooth', 'multi-component'],
  [getEvaluationKey()](_params, x, y) {
    return x * x * x - 3 * x * y * y;
  },
  domain() {
    return true;
  },
  createParams() {
    return {};
  },
  format(_params, level) {
    return equation('x³ − 3xy²', level);
  },
};

export const reciprocalSum = {
  ...common,
  id: 'reciprocalSum',
  complexity: 4,
  tags: ['open', 'piecewise-smooth', 'multi-component'],
  generation: generation(2.5, 4),
  domain(x, y) {
    return Math.abs(x) > 0.35 && Math.abs(y) > 0.35;
  },
  [getEvaluationKey()](_params, x, y) {
    return 1 / x + 1 / y;
  },
  createParams() {
    return {};
  },
  format(_params, level) {
    return equation('1/x + 1/y', level);
  },
};
