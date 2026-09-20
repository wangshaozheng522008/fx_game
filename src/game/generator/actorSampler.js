import { WORLD_RANGE } from '../constants.js';
import { polylineLength } from '../contour/geometry.js';

export const MIN_COMPONENT_LENGTH = 2.5;
export const MIN_WORLD_DISTANCE = 2.1;
export const MIN_ARC_DISTANCE = 2.5;

const MIN_BOARD_RADIUS = 2.3;
const MAX_BOARD_RADIUS = WORLD_RANGE - 0.9;
const MAX_BOARD_ABS = 7.4;
const SAMPLE_ATTEMPTS = 180;
const DISTANCE_ATTEMPTS = 80;
const LEVEL_TOLERANCE = 0.08;

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function random(min, max) {
  return min + Math.random() * (max - min);
}

function shuffle(items) {
  const result = items.slice();
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function isClosed(polyline) {
  return polyline.length > 2 && distance(polyline[0], polyline[polyline.length - 1]) <= 1e-3;
}

function makeArcTable(polyline) {
  const distances = [0];
  for (let i = 1; i < polyline.length; i += 1) {
    distances.push(distances[i - 1] + distance(polyline[i - 1], polyline[i]));
  }
  return {
    polyline,
    distances,
    length: polylineLength(polyline),
    closed: isClosed(polyline),
  };
}

export function sampleAtDistance(polylineOrTable, distanceAlong) {
  const table = Array.isArray(polylineOrTable)
    ? makeArcTable(polylineOrTable)
    : polylineOrTable;
  if (!table || !table.polyline || table.polyline.length === 0) return null;
  if (table.length === 0) {
    return { ...table.polyline[0] };
  }

  let target = distanceAlong;
  if (table.closed) {
    target = ((target % table.length) + table.length) % table.length;
  } else {
    target = Math.max(0, Math.min(table.length, target));
  }

  let right = 1;
  while (right < table.distances.length && table.distances[right] < target) right += 1;
  if (right >= table.distances.length) return { ...table.polyline.at(-1) };

  const left = right - 1;
  const span = table.distances[right] - table.distances[left];
  if (span === 0) return { ...table.polyline[right] };
  const t = (target - table.distances[left]) / span;
  const a = table.polyline[left];
  const b = table.polyline[right];
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
  };
}

function arcDistance(a, b, table) {
  const delta = Math.abs(a - b);
  return table.closed ? Math.min(delta, table.length - delta) : delta;
}

function isBoardPoint(point) {
  const radius = distance(point, { x: 0, y: 0 });
  return radius >= MIN_BOARD_RADIUS
    && radius <= MAX_BOARD_RADIUS
    && Math.abs(point.x) <= MAX_BOARD_ABS
    && Math.abs(point.y) <= MAX_BOARD_ABS;
}

function angularDistance(a, b) {
  let delta = a - b;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  return Math.abs(delta);
}

function isOnLevel(fn, level, point) {
  if (!isBoardPoint(point)) return false;
  if (fn?.isInDomain && !fn.isInDomain(point.x, point.y)) return false;
  if (!fn?.isInDomain && fn?.type?.inDomain && !fn.type.inDomain(point.x, point.y)) return false;
  if (!fn?.evaluate && !fn?.type?.F || !Number.isFinite(level)) return true;

  const value = fn.evaluate
    ? fn.evaluate(point.x, point.y)
    : fn.type.F(fn.params, point.x, point.y);
  if (!Number.isFinite(value)) return false;
  if (fn.id === 'atan2') return angularDistance(value, level) <= 0.2;
  return Math.abs(value - level) <= LEVEL_TOLERANCE * Math.max(Math.abs(level), 1);
}

function canAdd(candidate, candidateDistance, selected, selectedDistances, table) {
  return selected.every((point, index) => (
    distance(point, candidate) >= MIN_WORLD_DISTANCE
      && arcDistance(selectedDistances[index], candidateDistance, table) >= MIN_ARC_DISTANCE
  ));
}

function tryComponent(fn, level, table, actorCount, minComponentLength) {
  if (table.length < minComponentLength) return null;
  if (!table.closed && table.length < (actorCount - 1) * MIN_ARC_DISTANCE) return null;
  if (table.closed && table.length < actorCount * MIN_ARC_DISTANCE) return null;

  for (let attempt = 0; attempt < SAMPLE_ATTEMPTS; attempt += 1) {
    const selected = [];
    const selectedDistances = [];
    const firstDistance = random(0, table.length);
    const first = sampleAtDistance(table, firstDistance);
    if (!first || !isOnLevel(fn, level, first)) continue;
    selected.push(first);
    selectedDistances.push(firstDistance);

    let complete = true;
    for (let actorIndex = 1; actorIndex < actorCount; actorIndex += 1) {
      let added = false;
      for (let candidateAttempt = 0; candidateAttempt < DISTANCE_ATTEMPTS; candidateAttempt += 1) {
        const candidateDistance = random(0, table.length);
        const candidate = sampleAtDistance(table, candidateDistance);
        if (!candidate || !isOnLevel(fn, level, candidate)) continue;
        if (!canAdd(candidate, candidateDistance, selected, selectedDistances, table)) continue;
        selected.push(candidate);
        selectedDistances.push(candidateDistance);
        added = true;
        break;
      }
      if (!added) {
        complete = false;
        break;
      }
    }
    if (complete) return selected;
  }
  return null;
}

export function sampleActors({ fn, level, polylines, actorCount }) {
  if (!Number.isInteger(actorCount) || actorCount < 1 || !Array.isArray(polylines)) return null;
  const generation = fn?.type?.generation || fn?.generation;
  const minComponentLength = Number.isFinite(generation?.minContourLength)
    ? generation.minContourLength
    : MIN_COMPONENT_LENGTH;
  const tables = polylines
    .map((polyline) => makeArcTable(polyline))
    .filter((table) => table.polyline.length >= 2 && table.length >= minComponentLength);

  for (const table of shuffle(tables)) {
    const actors = tryComponent(fn, level, table, actorCount, minComponentLength);
    if (actors) return actors;
  }
  return null;
}

export { distance, makeArcTable };
