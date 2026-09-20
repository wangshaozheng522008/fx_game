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
