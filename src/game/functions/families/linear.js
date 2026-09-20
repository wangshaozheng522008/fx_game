import {
  equation,
  generation,
  getEvaluationKey,
  joinTerms,
  quantize,
  rand,
  smoothTransforms,
  term,
} from '../helpers.js';

const common = {
  family: 'linear',
  complexity: 1,
  tags: ['open', 'smooth', 'single-component'],
  generation: generation(5, 1),
  transforms: smoothTransforms,
};

export const affine = {
  ...common,
  id: 'affine',
  domain() {
    return true;
  },
  [getEvaluationKey()](params, x, y) {
    return params.a * x + params.b * y;
  },
  createParams() {
    return {
      a: quantize(rand(0.4, 1.8) * (Math.random() < 0.5 ? -1 : 1)),
      b: quantize(rand(0.4, 1.8) * (Math.random() < 0.5 ? -1 : 1)),
    };
  },
  format(params, level) {
    return equation(joinTerms(term(params.a, 'x'), term(params.b, 'y')), level);
  },
};

export const axisX = {
  ...common,
  id: 'axisX',
  [getEvaluationKey()](_params, x) {
    return x;
  },
  domain() {
    return true;
  },
  createParams() {
    return {};
  },
  format(_params, level) {
    return equation('x', level);
  },
};

export const axisY = {
  ...common,
  id: 'axisY',
  [getEvaluationKey()](_params, _x, y) {
    return y;
  },
  domain() {
    return true;
  },
  createParams() {
    return {};
  },
  format(_params, level) {
    return equation('y', level);
  },
};
