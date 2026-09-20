import { HIT_TOLERANCE, WORLD_RANGE } from './constants.js';
import { getDifficulty } from './difficulties.js';
import { distanceToPolyline, polylineLength } from './contour/geometry.js';
import { marchingSquares } from './contour/marchingSquares.js';
import { stitchSegments } from './contour/stitchSegments.js';
import { sampleActors } from './generator/actorSampler.js';

const MIN_R = 2.3;
const MAX_R = WORLD_RANGE - 0.9;

const generationStats = {
  rounds: 0,
  attempts: 0,
  fallbacks: 0,
  byType: {},
};

export function resetGenerationStats() {
  generationStats.rounds = 0;
  generationStats.attempts = 0;
  generationStats.fallbacks = 0;
  generationStats.byType = {};
}

export function getGenerationStats() {
  return {
    rounds: generationStats.rounds,
    attempts: generationStats.attempts,
    fallbacks: generationStats.fallbacks,
    byType: Object.fromEntries(
      Object.entries(generationStats.byType).map(([id, stats]) => [id, { ...stats }]),
    ),
  };
}

function typeGenerationStats(id) {
  if (!generationStats.byType[id]) {
    generationStats.byType[id] = { attempts: 0, successes: 0 };
  }
  return generationStats.byType[id];
}

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

export function resolveLevel(fn, player) {
  if (fn.type.getLevel) {
    return fn.type.getLevel(fn.params, player);
  }
  return fn.type.F(fn.params, player.x, player.y);
}

function levelOf(fn, player) {
  if (fn.level === undefined) fn.level = resolveLevel(fn, player);
  return fn.level;
}

function equationFor(fn, player) {
  const level = levelOf(fn, player);
  if (fn.type.format) return fn.type.format(fn.params, level);
  return `${fn.type.label(fn.params)} = ${fmtN(level)}`;
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

function fieldAt(fn, x, y) {
  if (!fn.type.inDomain(x, y)) return NaN;
  return fn.type.F(fn.params, x, y);
}

function levelTol(C) {
  return HIT_TOLERANCE * Math.max(Math.abs(C), 1);
}

export function hitsTarget(fn, player, point) {
  const c = levelOf(fn, player);
  const v = fieldAt(fn, point.x, point.y);
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
    createParams() {
      return { a: quantize(rand(0.4, 1.8) * (Math.random() < 0.5 ? -1 : 1)), b: quantize(rand(0.4, 1.8) * (Math.random() < 0.5 ? -1 : 1)) };
    },
  },
  radialQuad: {
    id: 'radialQuad',
    inDomain() {
      return true;
    },
    F(_p, x, y) {
      return x * x + y * y;
    },
    label() {
      return 'x² + y²';
    },
    createParams() {
      return {};
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
    createParams() {
      return {};
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
    createParams() {
      return {};
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
    createParams() {
      return {};
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
    createParams() {
      return {};
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
    createParams() {
      return {};
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
    createParams() {
      return {};
    },
  },
  ellipse: {
    id: 'ellipse',
    inDomain() {
      return true;
    },
    F(p, x, y) {
      return (x * x) / (p.a * p.a) + (y * y) / (p.b * p.b);
    },
    getLevel() {
      return 1;
    },
    label(p) {
      return `x²/${fmtN(p.a * p.a)} + y²/${fmtN(p.b * p.b)}`;
    },
    format(p, level) {
      return `${this.label(p)} = ${fmtN(level)}`;
    },
    createParams() {
      return { a: quantize(rand(3.4, 6.8)), b: quantize(rand(2.6, 5.8)) };
    },
  },
  circleFixed: {
    id: 'circleFixed',
    inDomain() {
      return true;
    },
    F(_p, x, y) {
      return x * x + y * y;
    },
    getLevel(params) {
      return params.r2;
    },
    label() {
      return 'x² + y²';
    },
    format(p, level) {
      return `x² + y² = ${fmtN(level)}`;
    },
    createParams() {
      const r = quantize(rand(3.6, 6.4));
      return { r: r, r2: round2(r * r) };
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
    createParams() {
      return {};
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
    createParams() {
      return {};
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
    createParams() {
      return {};
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
    createParams() {
      return {};
    },
  },
  cardioid: {
    id: 'cardioid',
    inDomain(x, y) {
      return hypot(x, y) > 0.2;
    },
    F(p, x, y) {
      const r = hypot(x, y);
      const c = x / r;
      return r - p.a * (1 - c);
    },
    getLevel() {
      return 0;
    },
    label(p) {
      return `r − ${fmtN(p.a)}(1 − cos θ)`;
    },
    format(p) {
      return `r = ${fmtN(p.a)}(1 − cos θ)`;
    },
    createParams() {
      return { a: quantize(rand(2.8, 4.2)) };
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
    createParams() {
      return {};
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
    createParams() {
      return {};
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
    createParams() {
      return {};
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
    fn.level = resolveLevel(fn, player);
    fn.label = equationFor(fn, player);
  });
  return { player, points, point: points[0], options, answerIndex: 0 };
}

export function createRound(wave, difficultyInput) {
  generationStats.rounds += 1;
  const difficulty = typeof difficultyInput === 'string'
    ? getDifficulty(difficultyInput)
    : difficultyInput || getDifficulty();
  const pool = difficulty.types;
  const actorCount = 1 + difficulty.monsterCount;

  for (let attempt = 0; attempt < 70; attempt += 1) {
    const typeId = pick(pool);
    const type = TYPES[typeId];
    generationStats.attempts += 1;
    typeGenerationStats(typeId).attempts += 1;
    const correct = makeFn(typeId, type.createParams(), true);
    const seedPlayer = randomBoardPoint();
    const level = resolveLevel(correct, seedPlayer);
    if (!Number.isFinite(level)) continue;
    correct.level = level;
    const contour = sampleIsoline(correct, seedPlayer);
    const actors = sampleActors({
      fn: correct,
      level,
      polylines: contour.polylines,
      actorCount,
    });
    if (!actors || actors.length !== actorCount) continue;
    const player = actors[0];
    const points = actors.slice(1);
    // The contour level for a dynamic function belongs to the actual player,
    // not merely to the seed point used to find a usable contour.
    correct.level = resolveLevel(correct, player);
    if (!hitsAllTargets(correct, player, points)) continue;

    const used = new Set([correct.id]);
    const options = [correct];
    for (let i = 0; i < 40 && options.length < 3; i += 1) {
      const otherId = pick(pool.filter((id) => !used.has(id)));
      if (!otherId) break;
      const otherType = TYPES[otherId];
      const wrong = makeFn(otherId, otherType.createParams(), false);
      if (hitsAllTargets(wrong, player, points)) continue;
      used.add(otherId);
      options.push(wrong);
    }
    if (options.length < 3) continue;
    options.forEach((fn) => {
      fn.level = resolveLevel(fn, player);
      fn.label = equationFor(fn, player);
    });
    const shuffled = shuffle(options);
    typeGenerationStats(typeId).successes += 1;
    return {
      player,
      points,
      point: points[0],
      options: shuffled,
      answerIndex: shuffled.findIndex((item) => item.correct),
    };
  }
  generationStats.fallbacks += 1;
  return fallbackRound(actorCount);
}

function fieldDelta(fn, x, y, c) {
  if (!fn.type.inDomain(x, y)) return NaN;
  const v = fieldAt(fn, x, y);
  if (!Number.isFinite(v)) return NaN;
  if (fn.id === 'atan2') {
    let d = v - c;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return d;
  }
  return v - c;
}

function angularDelta(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export function sampleIsoline(fn, player) {
  const c = levelOf(fn, player);
  if (!Number.isFinite(c)) return { polylines: [], primary: null };

  let segments = marchingSquares({
    evaluate: (x, y) => fieldDelta(fn, x, y, c),
    level: 0,
    bounds: {
      minX: -WORLD_RANGE,
      maxX: WORLD_RANGE,
      minY: -WORLD_RANGE,
      maxY: WORLD_RANGE,
    },
    resolution: 72,
  });
  if (fn.id === 'atan2') {
    // The wrapped angular delta also changes sign on the antipodal branch cut.
    // Those crossings are discontinuities, not points on atan2(y, x) = level.
    segments = segments.filter((segment) => {
      const x = (segment.a.x + segment.b.x) / 2;
      const y = (segment.a.y + segment.b.y) / 2;
      return Math.abs(angularDelta(Math.atan2(y, x), c)) < Math.PI / 2;
    });
  }
  const polylines = stitchSegments(segments);
  if (!polylines.length) return { polylines, primary: null };

  let primary = polylines[0];
  if (fn.type.getLevel) {
    if (hitsTarget(fn, player, player)) {
      primary = polylines.reduce((closest, polyline) => (
        distanceToPolyline(player, polyline) < distanceToPolyline(player, closest)
          ? polyline
          : closest
      ), polylines[0]);
    } else {
      primary = polylines.reduce((longest, polyline) => (
        polylineLength(polyline) > polylineLength(longest) ? polyline : longest
      ), polylines[0]);
    }
  } else {
    primary = polylines.reduce((closest, polyline) => (
      distanceToPolyline(player, polyline) < distanceToPolyline(player, closest)
        ? polyline
        : closest
    ), polylines[0]);
  }
  return { polylines, primary };
}
