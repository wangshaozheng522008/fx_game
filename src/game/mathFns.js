import { HIT_TOLERANCE, WORLD_RANGE } from './constants.js';
import { getDifficulty } from './difficulties.js';

const MIN_R = 2.3;
const MAX_R = WORLD_RANGE - 0.9;
const MIN_SEP = 2.1;

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

function hypot(x, y) {
  return Math.hypot(x, y);
}

function inBoard(p) {
  const r = hypot(p.x, p.y);
  return r >= MIN_R && r <= MAX_R && Math.abs(p.x) <= 7.4 && Math.abs(p.y) <= 7.4;
}

function farFrom(p, others) {
  return others.every((q) => hypot(p.x - q.x, p.y - q.y) >= MIN_SEP);
}

function angDiff(a, b) {
  let d = Math.abs(a - b) % (Math.PI * 2);
  if (d > Math.PI) d = Math.PI * 2 - d;
  return d;
}

function fmtN(n) {
  if (!Number.isFinite(n)) return '?';
  const abs = Math.abs(n);
  if (abs >= 100) return n.toFixed(0);
  if (abs >= 10) return n.toFixed(1);
  return n.toFixed(2);
}

function term(coef, name) {
  const n = fmtN(coef);
  if (n === '1.00' || n === '1.0' || n === '1') return name;
  if (n === '-1.00' || n === '-1.0' || n === '-1') return `-${name}`;
  return `${n}${name}`;
}

function joinTerms(left, right) {
  if (right.startsWith('-')) return `${left} − ${right.slice(1)}`;
  return `${left} + ${right}`;
}

function equationFor(fn, player) {
  if (fn.type.closed) return fn.type.label(fn.params);
  const c = fieldValue(fn, player);
  return `${fn.type.label(fn.params)} = ${fmtN(c)}`;
}

function quantize(n) {
  const abs = Math.abs(n);
  const digits = abs >= 1 ? 2 : abs >= 0.1 ? 2 : 3;
  const factor = 10 ** digits;
  return Math.round(n * factor) / factor;
}

function makePoint(x, y) {
  return { x: round2(x), y: round2(y) };
}

function fieldValue(fn, p) {
  if (!fn.type.inDomain(p.x, p.y)) return NaN;
  return fn.type.F(fn.params, p.x, p.y);
}

function levelTol(C) {
  return HIT_TOLERANCE * Math.max(Math.abs(C), 1);
}

export function hitsTarget(fn, player, point) {
  const c = fieldValue(fn, player);
  const v = fieldValue(fn, point);
  if (!Number.isFinite(c) || !Number.isFinite(v)) return false;
  if (fn.id === 'atan2') return angDiff(v, c) <= 0.08;
  return Math.abs(v - c) <= levelTol(c);
}

export function hitsAllTargets(fn, player, points) {
  return Boolean(player) && points.length > 0 && points.every((p) => hitsTarget(fn, player, p));
}

const TYPES = {
  affine: {
    id: 'affine',
    inDomain() {
      return true;
    },
    F(p, x, y) {
      return p.a * x + p.b * y;
    },
    label(p) {
      return joinTerms(term(p.a, 'x'), term(p.b, 'y'));
    },
    randomParams() {
      return { a: quantize(rand(0.4, 1.8) * (Math.random() < 0.5 ? -1 : 1)), b: quantize(rand(0.4, 1.8) * (Math.random() < 0.5 ? -1 : 1)) };
    },
    sample(params, count) {
      const player = randomBoardPoint();
      if (!player) return null;
      const len = hypot(params.a, params.b) || 1;
      const dx = -params.b / len;
      const dy = params.a / len;
      return fillAlong((t) => makePoint(player.x + dx * t, player.y + dy * t), count, [player]);
    },
  },
  radialQuad: {
    id: 'radialQuad',
    closed: false,
    inDomain() {
      return true;
    },
    F(_p, x, y) {
      return x * x + y * y;
    },
    label() {
      return 'x² + y²';
    },
    randomParams() {
      return {};
    },
    sample(_params, count) {
      const r = rand(3.0, 6.6);
      return fillAngles(count, (ang) => makePoint(r * Math.cos(ang), r * Math.sin(ang)));
    },
  },
  axisX: {
    id: 'axisX',
    inDomain() {
      return true;
    },
    F(_p, x) {
      return x;
    },
    label() {
      return 'x';
    },
    randomParams() {
      return {};
    },
    sample(_params, count) {
      const x = rand(2.4, 6.2) * (Math.random() < 0.5 ? -1 : 1);
      return fillAlong((t) => makePoint(x, t), count, [], rand(-6, 6));
    },
  },
  axisY: {
    id: 'axisY',
    inDomain() {
      return true;
    },
    F(_p, _x, y) {
      return y;
    },
    label() {
      return 'y';
    },
    randomParams() {
      return {};
    },
    sample(_params, count) {
      const y = rand(2.4, 6.2) * (Math.random() < 0.5 ? -1 : 1);
      return fillAlong((t) => makePoint(t, y), count, [], rand(-6, 6));
    },
  },
  sinxy: {
    id: 'sinxy',
    inDomain() {
      return true;
    },
    F(_p, x, y) {
      return Math.sin(x * y);
    },
    label() {
      return 'sin(xy)';
    },
    randomParams() {
      return {};
    },
    sample(_params, count) {
      const alpha = rand(0.4, 2.6) * (Math.random() < 0.5 ? -1 : 1);
      return fillProduct(count, alpha);
    },
  },
  cosSum: {
    id: 'cosSum',
    inDomain() {
      return true;
    },
    F(_p, x, y) {
      return Math.cos(x) + Math.cos(y);
    },
    label() {
      return 'cos(x) + cos(y)';
    },
    randomParams() {
      return {};
    },
    sample(_params, count) {
      const c = rand(-1.2, 1.2);
      const pts = [];
      for (let i = 0; i < 80 && pts.length < count; i += 1) {
        const x = rand(-6.5, 6.5);
        const rest = c - Math.cos(x);
        if (Math.abs(rest) > 1) continue;
        const y = Math.acos(rest) * (Math.random() < 0.5 ? -1 : 1);
        const p = makePoint(x, y);
        if (inBoard(p) && farFrom(p, pts)) pts.push(p);
      }
      return pts.length === count ? pts : null;
    },
  },
  expSum: {
    id: 'expSum',
    inDomain() {
      return true;
    },
    F(_p, x, y) {
      return Math.exp(x + y);
    },
    label() {
      return 'e^{x+y}';
    },
    randomParams() {
      return {};
    },
    sample(_params, count) {
      const s = rand(-2.5, 2.5);
      const dir = Math.SQRT1_2;
      const mid = rand(-2, 2);
      return fillAlong((t) => makePoint((mid + t) * dir, s - (mid + t) * dir), count, []);
    },
  },
  bilinear: {
    id: 'bilinear',
    inDomain() {
      return true;
    },
    F(_p, x, y) {
      return x * y;
    },
    label() {
      return 'xy';
    },
    randomParams() {
      return {};
    },
    sample(_params, count) {
      const c = rand(2.2, 8) * (Math.random() < 0.5 ? -1 : 1);
      const pts = [];
      for (let i = 0; i < 60 && pts.length < count; i += 1) {
        const x = rand(1.6, 6.4) * (Math.random() < 0.5 ? -1 : 1);
        const p = makePoint(x, c / x);
        if (inBoard(p) && farFrom(p, pts)) pts.push(p);
      }
      return pts.length === count ? pts : null;
    },
  },
  ellipse: {
    id: 'ellipse',
    closed: true,
    inDomain() {
      return true;
    },
    F(p, x, y) {
      return (x * x) / (p.a * p.a) + (y * y) / (p.b * p.b);
    },
    label(p) {
      return `x²/${fmtN(p.a * p.a)} + y²/${fmtN(p.b * p.b)} = 1`;
    },
    randomParams() {
      return { a: quantize(rand(3.4, 6.8)), b: quantize(rand(2.6, 5.8)) };
    },
    sample(params, count) {
      return fillAngles(count, (ang) => makePoint(params.a * Math.cos(ang), params.b * Math.sin(ang)));
    },
  },
  circleFixed: {
    id: 'circleFixed',
    closed: true,
    inDomain() {
      return true;
    },
    F(_p, x, y) {
      return x * x + y * y;
    },
    label(p) {
      return `x² + y² = ${fmtN(p.r2)}`;
    },
    randomParams() {
      const r = quantize(rand(3.6, 6.4));
      return { r: r, r2: round2(r * r) };
    },
    sample(params, count) {
      return fillAngles(count, (ang) => makePoint(params.r * Math.cos(ang), params.r * Math.sin(ang)));
    },
  },
  diamond: {
    id: 'diamond',
    inDomain() {
      return true;
    },
    F(_p, x, y) {
      return Math.abs(x) + Math.abs(y);
    },
    label() {
      return '|x| + |y|';
    },
    randomParams() {
      return {};
    },
    sample(_params, count) {
      const c = rand(3.4, 6.8);
      const pts = [];
      const corners = [
        [c, 0],
        [0, c],
        [-c, 0],
        [0, -c],
        [c * 0.6, c * 0.4],
        [-c * 0.5, c * 0.5],
        [c * 0.45, -c * 0.55],
        [-c * 0.7, -c * 0.3],
      ];
      for (let i = 0; i < corners.length && pts.length < count; i += 1) {
        const p = makePoint(corners[i][0], corners[i][1]);
        if (inBoard(p) && farFrom(p, pts)) pts.push(p);
      }
      return pts.length === count ? pts : null;
    },
  },
  atan2: {
    id: 'atan2',
    inDomain(x, y) {
      return hypot(x, y) > 0.4;
    },
    F(_p, x, y) {
      return Math.atan2(y, x);
    },
    label() {
      return 'atan2(y, x)';
    },
    randomParams() {
      return {};
    },
    sample(_params, count) {
      const ang = rand(-Math.PI + 0.3, Math.PI - 0.3);
      const pts = [];
      for (let i = 0; i < 40 && pts.length < count; i += 1) {
        const r = rand(2.6, 7.0);
        const p = makePoint(r * Math.cos(ang), r * Math.sin(ang));
        if (inBoard(p) && farFrom(p, pts)) pts.push(p);
      }
      return pts.length === count ? pts : null;
    },
  },
  stretchRad: {
    id: 'stretchRad',
    inDomain() {
      return true;
    },
    F(_p, x, y) {
      return Math.sqrt(x * x + 4 * y * y);
    },
    label() {
      return '√(x² + 4y²)';
    },
    randomParams() {
      return {};
    },
    sample(_params, count) {
      const c = rand(3.2, 6.4);
      return fillAngles(count, (ang) => {
        const x = c * Math.cos(ang);
        const y = (c * Math.sin(ang)) / 2;
        return makePoint(x, y);
      });
    },
  },
  gaussian: {
    id: 'gaussian',
    inDomain() {
      return true;
    },
    F(_p, x, y) {
      return Math.exp(-(x * x + y * y));
    },
    label() {
      return 'e^{-(x²+y²)}';
    },
    randomParams() {
      return {};
    },
    sample(_params, count) {
      const r = rand(2.6, 5.8);
      return fillAngles(count, (ang) => makePoint(r * Math.cos(ang), r * Math.sin(ang)));
    },
  },
  cardioid: {
    id: 'cardioid',
    closed: true,
    inDomain(x, y) {
      return hypot(x, y) > 0.2;
    },
    F(p, x, y) {
      const r = hypot(x, y);
      const c = x / r;
      return r - p.a * (1 - c);
    },
    label(p) {
      return `r = ${fmtN(p.a)}(1 − cos θ)`;
    },
    randomParams() {
      return { a: quantize(rand(2.8, 4.2)) };
    },
    sample(params, count) {
      const pts = [];
      for (let i = 0; i < 70 && pts.length < count; i += 1) {
        const th = rand(0.45, Math.PI * 2 - 0.45);
        const r = params.a * (1 - Math.cos(th));
        const p = makePoint(r * Math.cos(th), r * Math.sin(th));
        if (inBoard(p) && farFrom(p, pts)) pts.push(p);
      }
      return pts.length === count ? pts : null;
    },
  },
  saddle: {
    id: 'saddle',
    inDomain() {
      return true;
    },
    F(_p, x, y) {
      return x * x - y * y;
    },
    label() {
      return 'x² − y²';
    },
    randomParams() {
      return {};
    },
    sample(_params, count) {
      const c = rand(2, 10) * (Math.random() < 0.5 ? -1 : 1);
      const pts = [];
      for (let i = 0; i < 80 && pts.length < count; i += 1) {
        const x = rand(2.2, 6.6) * (Math.random() < 0.5 ? -1 : 1);
        const d = x * x - c;
        if (d < 0.8) continue;
        const y = Math.sqrt(d) * (Math.random() < 0.5 ? -1 : 1);
        const p = makePoint(x, y);
        if (inBoard(p) && farFrom(p, pts)) pts.push(p);
      }
      return pts.length === count ? pts : null;
    },
  },
  expCos: {
    id: 'expCos',
    inDomain() {
      return true;
    },
    F(_p, x, y) {
      return Math.exp(x) * Math.cos(y);
    },
    label() {
      return 'e^{x} cos(y)';
    },
    randomParams() {
      return {};
    },
    sample(_params, count) {
      const c = rand(-0.7, 0.7) || 0.35;
      const pts = [];
      for (let i = 0; i < 90 && pts.length < count; i += 1) {
        const x = rand(-1.6, 1.4);
        const amp = Math.exp(x);
        if (Math.abs(c) > amp) continue;
        const y = Math.acos(c / amp) * (Math.random() < 0.5 ? -1 : 1);
        const p = makePoint(x, y);
        if (inBoard(p) && farFrom(p, pts)) pts.push(p);
      }
      return pts.length === count ? pts : null;
    },
  },
  polarRT: {
    id: 'polarRT',
    inDomain(x, y) {
      return hypot(x, y) > 0.5;
    },
    F(_p, x, y) {
      return hypot(x, y) * Math.atan2(y, x);
    },
    label() {
      return 'r · θ';
    },
    randomParams() {
      return {};
    },
    sample(_params, count) {
      const c = rand(2.5, 8) * (Math.random() < 0.5 ? -1 : 1);
      const pts = [];
      for (let i = 0; i < 80 && pts.length < count; i += 1) {
        const th = rand(0.5, 2.5) * Math.sign(c || 1);
        if (Math.abs(th) < 0.35) continue;
        const r = c / th;
        const p = makePoint(r * Math.cos(th), r * Math.sin(th));
        if (inBoard(p) && farFrom(p, pts)) pts.push(p);
      }
      return pts.length === count ? pts : null;
    },
  },
};

function randomBoardPoint() {
  for (let i = 0; i < 40; i += 1) {
    const p = makePoint(rand(-7.1, 7.1), rand(-7.1, 7.1));
    if (inBoard(p)) return p;
  }
  return makePoint(3.2, 2.4);
}

function fillAlong(atT, count, seed, startT) {
  const pts = seed.slice();
  for (let i = 0; i < 50 && pts.length < count; i += 1) {
    const t = (startT || 0) + rand(-6.5, 6.5);
    const p = atT(t);
    if (inBoard(p) && farFrom(p, pts)) pts.push(p);
  }
  return pts.length === count ? pts : null;
}

function fillAngles(count, atAng) {
  const pts = [];
  const offset = rand(0, Math.PI * 2);
  for (let k = 0; k < 12 && pts.length < count; k += 1) {
    const ang = offset + (k * Math.PI * 2) / 12 + rand(-0.12, 0.12);
    const p = atAng(ang);
    if (inBoard(p) && farFrom(p, pts)) pts.push(p);
  }
  return pts.length === count ? pts : null;
}

function fillProduct(count, alpha) {
  const pts = [];
  for (let i = 0; i < 50 && pts.length < count; i += 1) {
    const x = rand(1.5, 6.2) * (Math.random() < 0.5 ? -1 : 1);
    const p = makePoint(x, alpha / x);
    if (inBoard(p) && farFrom(p, pts)) pts.push(p);
  }
  return pts.length === count ? pts : null;
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

function fallbackRound(count) {
  const r = 5;
  const pts = [];
  for (let i = 0; i < count; i += 1) {
    const ang = (i * 2 * Math.PI) / Math.max(count, 3) + 0.4;
    pts.push(makePoint(r * Math.cos(ang), r * Math.sin(ang)));
  }
  const player = pts[0];
  const points = pts.slice(1);
  const options = [
    makeFn('radialQuad', {}, true),
    makeFn('affine', { a: 1, b: 0.4 }, false),
    makeFn('axisY', {}, false),
  ];
  options.forEach((fn) => {
    fn.label = equationFor(fn, player);
  });
  return { player, points, point: points[0], options, answerIndex: 0 };
}

export function createRound(wave, difficultyInput) {
  const difficulty = typeof difficultyInput === 'string'
    ? getDifficulty(difficultyInput)
    : difficultyInput || getDifficulty();
  const pool = difficulty.types;
  const actorCount = 1 + difficulty.monsterCount;

  for (let attempt = 0; attempt < 70; attempt += 1) {
    const typeId = pick(pool);
    const type = TYPES[typeId];
    const correct = makeFn(typeId, type.randomParams(), true);
    const actors = type.sample(correct.params, actorCount);
    if (!actors || actors.length !== actorCount) continue;
    const player = actors[0];
    const points = actors.slice(1);
    if (!hitsAllTargets(correct, player, points)) continue;

    const used = new Set([correct.id]);
    const options = [correct];
    for (let i = 0; i < 40 && options.length < 3; i += 1) {
      const otherId = pick(pool.filter((id) => !used.has(id)));
      if (!otherId) break;
      const otherType = TYPES[otherId];
      const wrong = makeFn(otherId, otherType.randomParams(), false);
      if (hitsAllTargets(wrong, player, points)) continue;
      used.add(otherId);
      options.push(wrong);
    }
    if (options.length < 3) continue;
    options.forEach((fn) => {
      fn.label = equationFor(fn, player);
    });
    const shuffled = shuffle(options);
    return {
      player,
      points,
      point: points[0],
      options: shuffled,
      answerIndex: shuffled.findIndex((item) => item.correct),
    };
  }
  return fallbackRound(actorCount);
}

function fieldDelta(fn, x, y, c) {
  if (!fn.type.inDomain(x, y)) return NaN;
  const v = fn.type.F(fn.params, x, y);
  if (!Number.isFinite(v)) return NaN;
  if (fn.id === 'atan2') {
    let d = v - c;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return d;
  }
  return v - c;
}

function lerpZero(x0, y0, d0, x1, y1, d1) {
  const t = d0 / (d0 - d1);
  return {
    x: x0 + (x1 - x0) * t,
    y: y0 + (y1 - y0) * t,
  };
}

export function sampleIsoline(fn, player) {
  const c = fieldValue(fn, player);
  if (!Number.isFinite(c)) return [];
  const n = 72;
  const delta = (2 * WORLD_RANGE) / n;
  const grid = [];
  for (let j = 0; j <= n; j += 1) {
    const row = [];
    const y = WORLD_RANGE - j * delta;
    for (let i = 0; i <= n; i += 1) {
      const x = -WORLD_RANGE + i * delta;
      row.push(fieldDelta(fn, x, y, c));
    }
    grid.push(row);
  }
  const pts = [];
  function addEdge(i0, j0, i1, j1) {
    const d0 = grid[j0][i0];
    const d1 = grid[j1][i1];
    if (!Number.isFinite(d0) || !Number.isFinite(d1) || d0 * d1 > 0) return;
    if (d0 === 0 && d1 === 0) return;
    const x0 = -WORLD_RANGE + i0 * delta;
    const y0 = WORLD_RANGE - j0 * delta;
    const x1 = -WORLD_RANGE + i1 * delta;
    const y1 = WORLD_RANGE - j1 * delta;
    pts.push(d0 === 0 ? { x: x0, y: y0 } : lerpZero(x0, y0, d0, x1, y1, d1));
  }
  for (let j = 0; j < n; j += 1) {
    for (let i = 0; i < n; i += 1) {
      addEdge(i, j, i + 1, j);
      addEdge(i, j, i, j + 1);
    }
  }
  pts.forEach((p) => {
    p.d = hypot(p.x - player.x, p.y - player.y);
  });
  pts.sort((a, b) => a.d - b.d);
  return pts;
}
