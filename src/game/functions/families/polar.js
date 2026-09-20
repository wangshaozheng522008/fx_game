import { equation, fmtN, generation, getEvaluationKey, smoothTransforms } from '../helpers.js';

const common = {
  family: 'polar',
  complexity: 4,
  tags: ['open', 'piecewise-smooth', 'multi-component'],
  generation: generation(2.5, 16),
  transforms: smoothTransforms,
};

export const atan2 = {
  ...common,
  id: 'atan2',
  tags: ['open', 'smooth', 'single-component'],
  domain(x, y) {
    return Math.hypot(x, y) > 0.4;
  },
  [getEvaluationKey()](_params, x, y) {
    return Math.atan2(y, x);
  },
  createParams() {
    return {};
  },
  format(_params, level) {
    return equation('atan2(y, x)', level);
  },
};

export const polarRT = {
  ...common,
  id: 'polarRT',
  domain(x, y) {
    return Math.hypot(x, y) > 0.5;
  },
  [getEvaluationKey()](_params, x, y) {
    return Math.hypot(x, y) * Math.atan2(y, x);
  },
  createParams() {
    return {};
  },
  format(_params, level) {
    return equation('r · θ', level);
  },
};

export const cardioid = {
  ...common,
  id: 'cardioid',
  tags: ['closed', 'piecewise-smooth', 'single-component'],
  domain(x, y) {
    return Math.hypot(x, y) > 0.2;
  },
  [getEvaluationKey()](params, x, y) {
    const radius = Math.hypot(x, y);
    return radius - params.a * (1 - x / radius);
  },
  getLevel() {
    return 0;
  },
  createParams() {
    return { a: Math.round((2.8 + Math.random() * 1.4) * 100) / 100 };
  },
  format(params) {
    return `r = ${fmtN(params.a)}(1 − cos θ)`;
  },
};
