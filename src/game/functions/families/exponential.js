import { equation, generation, getEvaluationKey, smoothTransforms } from '../helpers.js';

const common = {
  family: 'exponential',
  complexity: 3,
  tags: ['open', 'smooth', 'multi-component'],
  generation: generation(2.5, 64),
  transforms: smoothTransforms,
};

export const expSum = {
  ...common,
  id: 'expSum',
  tags: ['open', 'smooth', 'single-component'],
  domain() {
    return true;
  },
  [getEvaluationKey()](_params, x, y) {
    return Math.exp(x + y);
  },
  createParams() {
    return {};
  },
  format(_params, level) {
    return equation('e^{x+y}', level);
  },
};

export const expCos = {
  ...common,
  id: 'expCos',
  domain() {
    return true;
  },
  [getEvaluationKey()](_params, x, y) {
    return Math.exp(x) * Math.cos(y);
  },
  createParams() {
    return {};
  },
  format(_params, level) {
    return equation('e^{x} cos(y)', level);
  },
};

export const gaussian = {
  ...common,
  id: 'gaussian',
  tags: ['closed', 'smooth', 'single-component'],
  domain() {
    return true;
  },
  [getEvaluationKey()](_params, x, y) {
    return Math.exp(-(x * x + y * y));
  },
  createParams() {
    return {};
  },
  format(_params, level) {
    return equation('e^{-(x²+y²)}', level);
  },
};

export const logSumExp = {
  ...common,
  id: 'logSumExp',
  complexity: 4,
  tags: ['open', 'smooth', 'single-component'],
  domain() {
    return true;
  },
  [getEvaluationKey()](_params, x, y) {
    const max = Math.max(x, y);
    return max + Math.log(Math.exp(x - max) + Math.exp(y - max));
  },
  createParams() {
    return {};
  },
  format(_params, level) {
    return equation('log(eˣ + eʸ)', level);
  },
};
