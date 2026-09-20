import { endpointKey } from './geometry.js';

function otherEndpoint(segment, atKey) {
  if (endpointKey(segment.a) === atKey) return segment.b;
  return segment.a;
}

function nextSegment(endpointMap, segments, used, point) {
  const refs = endpointMap.get(endpointKey(point)) || [];
  for (const ref of refs) {
    if (!used[ref.index]) return ref;
  }
  return null;
}

function extendForward(path, endpointMap, segments, used) {
  let current = path[path.length - 1];
  const startKey = endpointKey(path[0]);
  while (true) {
    const ref = nextSegment(endpointMap, segments, used, current);
    if (!ref) return false;
    used[ref.index] = true;
    const next = otherEndpoint(segments[ref.index], endpointKey(current));
    if (endpointKey(next) === startKey) {
      path.push(path[0]);
      return true;
    }
    path.push(next);
    current = next;
  }
}

function extendBackward(path, endpointMap, segments, used) {
  let current = path[0];
  while (true) {
    const ref = nextSegment(endpointMap, segments, used, current);
    if (!ref) return;
    used[ref.index] = true;
    const next = otherEndpoint(segments[ref.index], endpointKey(current));
    path.unshift(next);
    current = next;
  }
}

export function stitchSegments(input = []) {
  const segments = input.filter((segment) => (
    segment && segment.a && segment.b
      && Number.isFinite(segment.a.x)
      && Number.isFinite(segment.a.y)
      && Number.isFinite(segment.b.x)
      && Number.isFinite(segment.b.y)
      && endpointKey(segment.a) !== endpointKey(segment.b)
  ));
  const endpointMap = new Map();
  segments.forEach((segment, index) => {
    [segment.a, segment.b].forEach((point) => {
      const key = endpointKey(point);
      if (!endpointMap.has(key)) endpointMap.set(key, []);
      endpointMap.get(key).push({ index });
    });
  });

  const used = new Array(segments.length).fill(false);
  const polylines = [];
  for (let index = 0; index < segments.length; index += 1) {
    if (used[index]) continue;
    used[index] = true;
    const segment = segments[index];
    const path = [segment.a, segment.b];
    const closed = extendForward(path, endpointMap, segments, used);
    if (!closed) extendBackward(path, endpointMap, segments, used);
    if (path.length >= 2) polylines.push(path);
  }
  return polylines;
}
