import { equation, generation, getEvaluationKey, smoothTransforms } from '../helpers.js';

const common = {
  family: 'trig',
  complexity: 3,
  tags: ['open', 'smooth', 'multi-component'],
  generation: generation(2.5, 128),
  transforms: smoothTransforms,
};

export const sinxy = {
  ...common,
  id: 'sinxy',
  domain() {
    return true;
  },
  [getEvaluationKey()](_params, x, y) {
    return Math.sin(x * y);
  },
  createParams() {
    return {};
  },
  format(_params, level) {
    return equation('sin(xy)', level);
  },
};

export const cosSum = {
  ...common,
  id: 'cosSum',
  domain() {
    return true;
  },
  [getEvaluationKey()](_params, x, y) {
    return Math.cos(x) + Math.cos(y);
  },
  createParams() {
    return {};
  },
  format(_params, level) {
    return equation('cos(x) + cos(y)', level);
  },
};
