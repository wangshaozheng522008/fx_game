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

export const sinSum = {
  ...common,
  id: 'sinSum',
  complexity: 2,
  tags: ['open', 'smooth', 'multi-component'],
  domain() {
    return true;
  },
  [getEvaluationKey()](_params, x, y) {
    return Math.sin(x) + Math.sin(y);
  },
  createParams() {
    return {};
  },
  format(_params, level) {
    return equation('sin(x) + sin(y)', level);
  },
};

export const trigProduct = {
  ...common,
  id: 'trigProduct',
  tags: ['open', 'smooth', 'multi-component'],
  domain() {
    return true;
  },
  [getEvaluationKey()](_params, x, y) {
    return Math.sin(x) * Math.cos(y);
  },
  createParams() {
    return {};
  },
  format(_params, level) {
    return equation('sin(x) cos(y)', level);
  },
};

export const radialWave = {
  ...common,
  id: 'radialWave',
  tags: ['closed', 'smooth', 'multi-component'],
  generation: generation(2.5, 16),
  domain() {
    return true;
  },
  [getEvaluationKey()](_params, x, y) {
    return Math.sin(Math.hypot(x, y));
  },
  createParams() {
    return {};
  },
  format(_params, level) {
    return equation('sin(√(x² + y²))', level);
  },
};
