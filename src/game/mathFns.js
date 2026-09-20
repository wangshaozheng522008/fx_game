import { HIT_TOLERANCE, WORLD_RANGE } from './constants.js';
import { getDifficulty } from './difficulties.js';
import { distanceToPolyline, polylineLength } from './contour/geometry.js';
import { marchingSquares } from './contour/marchingSquares.js';
import { stitchSegments } from './contour/stitchSegments.js';
import { sampleActors } from './generator/actorSampler.js';
import { getEvaluationKey } from './functions/helpers.js';
import { getFunction, getFunctions } from './functions/registry.js';
import { getWaveProfile } from './generator/waveProfile.js';

const MIN_R = 2.3;
const MAX_R = WORLD_RANGE - 0.9;
const evaluationKey = getEvaluationKey();

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
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function round2(value) {
  return Math.round(value * 100) / 100;
}

function hypot(x, y) {
  return Math.hypot(x, y);
}

function inBoard(point) {
  const radius = hypot(point.x, point.y);
  return radius >= MIN_R
    && radius <= MAX_R
    && Math.abs(point.x) <= 7.4
    && Math.abs(point.y) <= 7.4;
}

function angularDifference(a, b) {
  let delta = a - b;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  return Math.abs(delta);
}

function makePoint(x, y) {
  return { x: round2(x), y: round2(y) };
}

export function resolveLevel(fn, player) {
  if (fn.type.getLevel) return fn.type.getLevel(fn.params, player);
  return evaluateFunction(fn, player.x, player.y);
}

function levelOf(fn, player) {
  if (fn.level === undefined) fn.level = resolveLevel(fn, player);
  return fn.level;
}

function equationFor(fn, player) {
  const equation = fn.type.format(fn.params, levelOf(fn, player));
  if (!fn.transform) return equation;
  const { translate, rotate, scale } = fn.transform;
  const parts = [];
  if (translate.x || translate.y) {
    parts.push(`T(${translate.x >= 0 ? '+' : ''}${translate.x.toFixed(2)},${translate.y >= 0 ? '+' : ''}${translate.y.toFixed(2)})`);
  }
  if (rotate) parts.push(`R(${rotate >= 0 ? '+' : ''}${rotate.toFixed(2)})`);
  if (scale !== 1) parts.push(`S(${scale.toFixed(2)})`);
  return parts.length ? `${equation} · ${parts.join(' ')}` : equation;
}

function fieldAt(fn, x, y) {
  if (!isInDomain(fn, x, y)) return NaN;
  return evaluateFunction(fn, x, y);
}

function localPoint(fn, x, y) {
  const transform = fn.transform;
  if (!transform) return { x, y };
  const dx = x - transform.translate.x;
  const dy = y - transform.translate.y;
  const cos = Math.cos(transform.rotate);
  const sin = Math.sin(transform.rotate);
  return {
    x: (cos * dx + sin * dy) / transform.scale,
    y: (-sin * dx + cos * dy) / transform.scale,
  };
}

function evaluateFunction(fn, x, y) {
  const point = localPoint(fn, x, y);
  return fn.type[evaluationKey](fn.params, point.x, point.y);
}

function isInDomain(fn, x, y) {
  const point = localPoint(fn, x, y);
  return fn.type.domain(point.x, point.y);
}

function levelTolerance(level) {
  return HIT_TOLERANCE * Math.max(Math.abs(level), 1);
}

export function hitsTarget(fn, player, point) {
  const level = levelOf(fn, player);
  const value = fieldAt(fn, point.x, point.y);
  if (!Number.isFinite(level) || !Number.isFinite(value)) return false;
  if (fn.id === 'atan2') return angularDifference(value, level) <= 0.08;
  return Math.abs(value - level) <= levelTolerance(level);
}

export function hitsAllTargets(fn, player, points) {
  return Boolean(player) && points.length > 0 && points.every((point) => hitsTarget(fn, player, point));
}

function randomBoardPoint() {
  for (let i = 0; i < 40; i += 1) {
    const point = makePoint(rand(-7.1, 7.1), rand(-7.1, 7.1));
    if (inBoard(point)) return point;
  }
  return makePoint(3.2, 2.4);
}

function makeFn(id, params, correct, transform = null) {
  const type = getFunction(id);
  if (!type) throw new Error(`Unknown function id: ${id}`);
  const fn = {
    id,
    type,
    params,
    label: type.format(params, undefined),
    correct: Boolean(correct),
    transform,
  };
  fn.evaluate = (x, y) => evaluateFunction(fn, x, y);
  fn.isInDomain = (x, y) => isInDomain(fn, x, y);
  return fn;
}

function createTransform(type, profile) {
  if (Math.random() >= profile.transformChance) return null;
  const transform = {
    translate: { x: 0, y: 0 },
    rotate: 0,
    scale: 1,
  };
  if (type.transforms.translate) {
    transform.translate = { x: round2(rand(-0.55, 0.55)), y: round2(rand(-0.55, 0.55)) };
  }
  if (type.transforms.rotate) transform.rotate = rand(-Math.PI / 6, Math.PI / 6);
  if (type.transforms.scale) transform.scale = rand(0.88, 1.14);
  return transform;
}

function fallbackRound(actorCount) {
  const radius = 5;
  const actors = [];
  for (let i = 0; i < actorCount; i += 1) {
    const angle = (i * 2 * Math.PI) / Math.max(actorCount, 3) + 0.4;
    actors.push(makePoint(radius * Math.cos(angle), radius * Math.sin(angle)));
  }
  const player = actors[0];
  const points = actors.slice(1);
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
  const profile = getWaveProfile(difficulty, wave);
  const candidates = getFunctions({
    families: difficulty.families,
    maxComplexity: profile.maxComplexity,
  });
  const actorCount = 1 + difficulty.monsterCount;

  for (let attempt = 0; attempt < 70; attempt += 1) {
    const type = pick(candidates);
    const typeId = type?.id;
    generationStats.attempts += 1;
    if (!typeId) continue;
    typeGenerationStats(typeId).attempts += 1;

    const context = { parameterTier: profile.parameterTier, wave, difficulty, profile };
    const correct = makeFn(
      typeId,
      type.createParams(context),
      true,
      createTransform(type, profile),
    );
    const seedPlayer = randomBoardPoint();
    const seedLevel = resolveLevel(correct, seedPlayer);
    if (!Number.isFinite(seedLevel)) continue;
    correct.level = seedLevel;

    const contour = sampleIsoline(correct, seedPlayer);
    const actors = sampleActors({
      fn: correct,
      level: seedLevel,
      polylines: contour.polylines,
      actorCount,
    });
    if (!actors || actors.length !== actorCount) continue;

    const player = actors[0];
    const points = actors.slice(1);
    // Dynamic levels are ultimately defined by the actual player selected on
    // the rasterized contour, rather than the seed used to discover it.
    correct.level = resolveLevel(correct, player);
    if (!hitsAllTargets(correct, player, points)) continue;

    const used = new Set([correct.id]);
    const options = [correct];
    for (let optionAttempt = 0; optionAttempt < 40 && options.length < 3; optionAttempt += 1) {
      const sameFamily = candidates.filter((candidate) => (
        candidate.family === type.family && !used.has(candidate.id)
      ));
      const available = candidates.filter((candidate) => !used.has(candidate.id));
      const pool = sameFamily.length && Math.random() < profile.hardDistractorChance
        ? sameFamily
        : available;
      const otherType = pick(pool);
      if (!otherType) break;
      const wrong = makeFn(
        otherType.id,
        otherType.createParams(context),
        false,
        createTransform(otherType, profile),
      );
      if (hitsAllTargets(wrong, player, points)) continue;
      used.add(otherType.id);
      options.push(wrong);
    }
    if (options.length < 3) continue;

    options.forEach((fn) => {
      fn.level = resolveLevel(fn, player);
      fn.label = equationFor(fn, player);
    });
    typeGenerationStats(typeId).successes += 1;
    const shuffled = shuffle(options);
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

function fieldDelta(fn, x, y, level) {
  if (!isInDomain(fn, x, y)) return NaN;
  const value = fieldAt(fn, x, y);
  if (!Number.isFinite(value)) return NaN;
  if (fn.id === 'atan2') {
    let delta = value - level;
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
    return delta;
  }
  return value - level;
}

export function sampleIsoline(fn, player) {
  const level = levelOf(fn, player);
  if (!Number.isFinite(level)) return { polylines: [], primary: null };

  let segments = marchingSquares({
    evaluate: (x, y) => fieldDelta(fn, x, y, level),
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
    segments = segments.filter((segment) => {
      const x = (segment.a.x + segment.b.x) / 2;
      const y = (segment.a.y + segment.b.y) / 2;
      return Math.abs(fieldDelta(fn, x, y, level)) < Math.PI / 2;
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
