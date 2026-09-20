function distanceSquared(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

function nearestIndex(points, target) {
  let bestIndex = 0;
  let bestDistance = Infinity;

  for (let i = 0; i < points.length; i += 1) {
    const distance = distanceSquared(points[i], target);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = i;
    }
  }

  return bestIndex;
}

function isClosed(polyline) {
  if (!polyline || polyline.length < 3) return false;
  const first = polyline[0];
  const last = polyline.at(-1);
  return Math.hypot(first.x - last.x, first.y - last.y) < 1e-3;
}

function walk(points, start, direction, steps, closed) {
  const result = [];
  const n = points.length;

  for (let i = 0; i <= steps; i += 1) {
    let index = start + direction * i;
    if (closed) {
      index = ((index % n) + n) % n;
    } else if (index < 0 || index >= n) {
      break;
    }
    result.push(points[index]);
  }

  return result;
}

export function buildBeamPaths(polyline, player, targets = []) {
  if (!polyline || polyline.length < 2 || !player) return [];

  const closed = isClosed(polyline);
  const curve = closed ? polyline.slice(0, -1) : polyline.slice();
  if (curve.length < 2) return [];

  const playerIndex = nearestIndex(curve, player);
  const forwardTargets = [];
  const backwardTargets = [];

  targets.forEach((target) => {
    if (!target) return;
    const targetIndex = nearestIndex(curve, target);

    if (closed) {
      const forwardSteps = (targetIndex - playerIndex + curve.length) % curve.length;
      const backwardSteps = (playerIndex - targetIndex + curve.length) % curve.length;
      const targetInfo = { target, steps: Math.min(forwardSteps, backwardSteps) };
      if (forwardSteps <= backwardSteps) forwardTargets.push(targetInfo);
      else backwardTargets.push(targetInfo);
    } else if (targetIndex >= playerIndex) {
      forwardTargets.push({ target, steps: targetIndex - playerIndex });
    } else {
      backwardTargets.push({ target, steps: playerIndex - targetIndex });
    }
  });

  const paths = [];
  const addPath = (items, direction) => {
    if (!items.length) return;
    const farthest = items.reduce((a, b) => (a.steps > b.steps ? a : b));
    const path = walk(curve, playerIndex, direction, farthest.steps, closed);
    if (path.length >= 2) {
      path[0] = { ...player };
      paths.push(path);
    }
  };

  addPath(forwardTargets, 1);
  addPath(backwardTargets, -1);
  return paths;
}
