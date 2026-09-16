import { HIT_TOLERANCE, MIN_ABS_X, MIN_ABS_Y, WORLD_RANGE } from './constants.js';

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function shuffle(list) {
  const next = list.slice();
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = next[i];
    next[i] = next[j];
    next[j] = tmp;
  }
  return next;
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

export function formatCoeff(n) {
  if (!Number.isFinite(n)) return '?';
  if (Math.abs(n - 1) < 1e-9) return '';
  if (Math.abs(n + 1) < 1e-9) return '-';
  const abs = Math.abs(n);
  const digits = abs >= 1 ? 2 : abs >= 0.1 ? 2 : abs >= 0.01 ? 3 : 4;
  let text = n.toFixed(digits);
  text = text.replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
  return text;
}

function quantize(n) {
  const abs = Math.abs(n);
  const digits = abs >= 1 ? 2 : abs >= 0.1 ? 2 : abs >= 0.01 ? 3 : 4;
  const factor = 10 ** digits;
  return Math.round(n * factor) / factor;
}

const TYPES = {
  linear: {
    id: 'linear',
    inDomain() {
      return true;
    },
    valueAt(params, x) {
      return params.k * x;
    },
    label(params) {
      return `y = ${formatCoeff(params.k)}x`;
    },
    fit(point) {
      return { k: point.y / point.x };
    },
    valid(point) {
      return Math.abs(point.x) >= MIN_ABS_X;
    },
  },
  quadratic: {
    id: 'quadratic',
    inDomain() {
      return true;
    },
    valueAt(params, x) {
      return params.a * x * x;
    },
    label(params) {
      return `y = ${formatCoeff(params.a)}x²`;
    },
    fit(point) {
      return { a: point.y / (point.x * point.x) };
    },
    valid(point) {
      return Math.abs(point.x) >= 2 && Math.abs(point.y) >= MIN_ABS_Y;
    },
  },
  cubic: {
    id: 'cubic',
    inDomain() {
      return true;
    },
    valueAt(params, x) {
      return params.a * x * x * x;
    },
    label(params) {
      return `y = ${formatCoeff(params.a)}x³`;
    },
    fit(point) {
      return { a: point.y / (point.x * point.x * point.x) };
    },
    valid(point) {
      return Math.abs(point.x) >= 2.2;
    },
  },
  abs: {
    id: 'abs',
    inDomain() {
      return true;
    },
    valueAt(params, x) {
      return params.k * Math.abs(x);
    },
    label(params) {
      const c = formatCoeff(params.k);
      return c ? `y = ${c}|x|` : 'y = |x|';
    },
    fit(point) {
      return { k: point.y / Math.abs(point.x) };
    },
    valid(point) {
      return Math.abs(point.x) >= MIN_ABS_X;
    },
  },
  sqrt: {
    id: 'sqrt',
    inDomain(x) {
      return x >= 0;
    },
    valueAt(params, x) {
      if (x < 0) return NaN;
      return params.k * Math.sqrt(x);
    },
    label(params) {
      const c = formatCoeff(params.k);
      return c ? `y = ${c}√x` : 'y = √x';
    },
    fit(point) {
      return { k: point.y / Math.sqrt(point.x) };
    },
    valid(point) {
      return point.x >= 2 && Math.abs(point.y) >= MIN_ABS_Y;
    },
  },
  sine: {
    id: 'sine',
    inDomain() {
      return true;
    },
    valueAt(params, x) {
      return params.a * Math.sin(x);
    },
    label(params) {
      const c = formatCoeff(params.a);
      return c ? `y = ${c}sin(x)` : 'y = sin(x)';
    },
    fit(point) {
      return { a: point.y / Math.sin(point.x) };
    },
    valid(point) {
      return Math.abs(point.x) >= MIN_ABS_X && Math.abs(Math.sin(point.x)) >= 0.38;
    },
  },
};

function typesForWave(wave) {
  if (wave <= 2) return ['linear'];
  if (wave <= 4) return ['linear', 'abs'];
  if (wave <= 7) return ['linear', 'abs', 'quadratic', 'sqrt'];
  return ['linear', 'abs', 'quadratic', 'cubic', 'sqrt', 'sine'];
}

export function computeY(fn, x) {
  if (!fn.type.inDomain(x)) return NaN;
  return fn.type.valueAt(fn.params, x);
}

export function hitsTarget(fn, point) {
  const predicted = computeY(fn, point.x);
  if (!Number.isFinite(predicted)) return false;
  const scale = Math.max(Math.hypot(point.x, point.y), 1);
  return Math.abs(predicted - point.y) <= HIT_TOLERANCE * scale;
}

function makeFn(typeId, params, correct) {
  const type = TYPES[typeId];
  return {
    id: typeId,
    type,
    params,
    label: type.label(params),
    correct: Boolean(correct),
  };
}

function fitFn(typeId, point) {
  const type = TYPES[typeId];
  if (!type.valid(point)) return null;
  const raw = type.fit(point);
  const params = {};
  Object.keys(raw).forEach((key) => {
    params[key] = quantize(raw[key]);
  });
  const fn = makeFn(typeId, params, true);
  if (!hitsTarget(fn, point)) {
    Object.keys(raw).forEach((key) => {
      params[key] = raw[key];
    });
    fn.params = params;
    fn.label = type.label(params);
    if (!hitsTarget(fn, point)) return null;
  }
  return fn;
}

function spawnPoint(typeId) {
  const type = TYPES[typeId];
  for (let i = 0; i < 40; i += 1) {
    const x = round2(rand(-7.2, 7.2));
    const y = round2(rand(-7.2, 7.2));
    if (Math.abs(x) < MIN_ABS_X || Math.abs(y) < MIN_ABS_Y) continue;
    if (Math.hypot(x, y) > WORLD_RANGE - 0.7) continue;
    const point = { x, y };
    if (!type.valid(point)) continue;
    return point;
  }
  if (typeId === 'sqrt') return { x: 4.0, y: 2.4 };
  if (typeId === 'sine') return { x: 2.5, y: 1.8 };
  return { x: 4.0, y: 2.0 };
}

function scaleParams(fn, factor) {
  const params = {};
  Object.keys(fn.params).forEach((key) => {
    params[key] = quantize(fn.params[key] * factor);
  });
  return makeFn(fn.id, params, false);
}

function shiftParams(fn, delta) {
  const params = {};
  Object.keys(fn.params).forEach((key) => {
    params[key] = quantize(fn.params[key] + delta);
  });
  return makeFn(fn.id, params, false);
}

function randomWrong(point, usedLabels) {
  const typeId = pick(Object.keys(TYPES));
  const type = TYPES[typeId];
  const params = {};
  if (typeId === 'linear' || typeId === 'abs' || typeId === 'sqrt') {
    params.k = quantize(rand(-2.4, 2.4) || 0.8);
  } else {
    params.a = quantize(rand(-0.8, 0.8) || 0.2);
  }
  const fn = makeFn(typeId, params, false);
  if (usedLabels.has(fn.label) || hitsTarget(fn, point) || !type.inDomain(point.x)) {
    return null;
  }
  return fn;
}

function makeDistractor(correct, point, usedLabels) {
  const factories = [
    () => scaleParams(correct, pick([0.45, 0.5, 1.5, 2, -1, -0.5])),
    () => shiftParams(correct, pick([0.4, 0.8, -0.4, -0.75, 1.2])),
    () => randomWrong(point, usedLabels),
  ];
  for (let i = 0; i < 12; i += 1) {
    const candidate = pick(factories)();
    if (!candidate) continue;
    if (usedLabels.has(candidate.label)) continue;
    if (hitsTarget(candidate, point)) continue;
    return candidate;
  }
  return null;
}

function fallbackRound() {
  const point = { x: 4, y: 2 };
  const options = [
    makeFn('linear', { k: 0.5 }, true),
    makeFn('linear', { k: 1.2 }, false),
    makeFn('quadratic', { a: 0.4 }, false),
  ];
  return { point, options, answerIndex: 0 };
}

export function createRound(wave) {
  const pool = typesForWave(wave);
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const typeId = pick(pool);
    const point = spawnPoint(typeId);
    const correct = fitFn(typeId, point);
    if (!correct) continue;
    const used = new Set([correct.label]);
    const options = [correct];
    for (let i = 0; i < 30 && options.length < 3; i += 1) {
      const wrong = makeDistractor(correct, point, used);
      if (!wrong) continue;
      used.add(wrong.label);
      options.push(wrong);
    }
    if (options.length < 3) continue;
    const shuffled = shuffle(options);
    return {
      point,
      options: shuffled,
      answerIndex: shuffled.findIndex((item) => item.correct),
    };
  }
  return fallbackRound();
}

export function sampleCurve(fn, point, samples = 96) {
  const points = [];
  const toward = point.x >= 0 ? 1 : -1;
  const xEnd = toward * (WORLD_RANGE + 0.4);
  for (let i = 0; i <= samples; i += 1) {
    const x = (i / samples) * xEnd;
    if (!fn.type.inDomain(x)) continue;
    const y = fn.type.valueAt(fn.params, x);
    if (!Number.isFinite(y)) continue;
    if (Math.abs(y) > WORLD_RANGE + 1.2) continue;
    points.push({ x, y });
  }
  return points;
}
