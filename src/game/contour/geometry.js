export function interpolate(p0, d0, p1, d1) {
  if (d0 === 0) return { x: p0.x, y: p0.y };
  if (d1 === 0) return { x: p1.x, y: p1.y };

  const denominator = d0 - d1;
  if (denominator === 0) {
    return {
      x: (p0.x + p1.x) / 2,
      y: (p0.y + p1.y) / 2,
    };
  }

  const t = Math.max(0, Math.min(1, d0 / denominator));
  return {
    x: p0.x + (p1.x - p0.x) * t,
    y: p0.y + (p1.y - p0.y) * t,
  };
}

export function endpointKey(point, eps = 1e-3) {
  return `${Math.round(point.x / eps)}:${Math.round(point.y / eps)}`;
}

function distanceSquaredToSegment(point, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) {
    const px = point.x - a.x;
    const py = point.y - a.y;
    return px * px + py * py;
  }

  const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSquared));
  const px = a.x + dx * t - point.x;
  const py = a.y + dy * t - point.y;
  return px * px + py * py;
}

export function distanceToPolyline(point, polyline) {
  if (!polyline || polyline.length === 0) return Infinity;
  if (polyline.length === 1) {
    return Math.hypot(point.x - polyline[0].x, point.y - polyline[0].y);
  }

  let best = Infinity;
  for (let i = 1; i < polyline.length; i += 1) {
    best = Math.min(best, distanceSquaredToSegment(point, polyline[i - 1], polyline[i]));
  }
  return Math.sqrt(best);
}

export function polylineLength(polyline) {
  let length = 0;
  for (let i = 1; i < polyline.length; i += 1) {
    length += Math.hypot(
      polyline[i].x - polyline[i - 1].x,
      polyline[i].y - polyline[i - 1].y,
    );
  }
  return length;
}
