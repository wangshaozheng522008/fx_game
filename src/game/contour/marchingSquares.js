import { interpolate } from './geometry.js';

function readBounds(bounds = {}) {
  if (Array.isArray(bounds) && bounds.length === 4) {
    const [minX, minY, maxX, maxY] = bounds;
    return { minX, minY, maxX, maxY };
  }

  if (bounds && bounds.x && bounds.y) {
    const [minX, maxX] = bounds.x;
    const [minY, maxY] = bounds.y;
    return { minX, minY, maxX, maxY };
  }

  if (bounds && bounds.min && bounds.max) {
    return {
      minX: bounds.min.x,
      maxX: bounds.max.x,
      minY: bounds.min.y,
      maxY: bounds.max.y,
    };
  }

  if (bounds && bounds.left !== undefined) {
    return {
      minX: bounds.left,
      maxX: bounds.right,
      minY: bounds.bottom,
      maxY: bounds.top,
    };
  }

  return {
    minX: bounds.minX,
    maxX: bounds.maxX,
    minY: bounds.minY,
    maxY: bounds.maxY,
  };
}

function finite(value) {
  return Number.isFinite(value);
}

function addSegment(segments, edgePoints, first, second) {
  const a = edgePoints[first];
  const b = edgePoints[second];
  if (!a || !b || (a.x === b.x && a.y === b.y)) return;
  segments.push({ a, b });
}

function cellSegments(mask, centerValue, edgePoints, segments) {
  switch (mask) {
    case 1:
      addSegment(segments, edgePoints, 3, 0);
      break;
    case 2:
      addSegment(segments, edgePoints, 0, 1);
      break;
    case 3:
      addSegment(segments, edgePoints, 3, 1);
      break;
    case 4:
      addSegment(segments, edgePoints, 1, 2);
      break;
    case 5:
      if (centerValue > 0) {
        addSegment(segments, edgePoints, 0, 1);
        addSegment(segments, edgePoints, 2, 3);
      } else {
        addSegment(segments, edgePoints, 3, 0);
        addSegment(segments, edgePoints, 1, 2);
      }
      break;
    case 6:
      addSegment(segments, edgePoints, 0, 2);
      break;
    case 7:
      addSegment(segments, edgePoints, 3, 2);
      break;
    case 8:
      addSegment(segments, edgePoints, 2, 3);
      break;
    case 9:
      addSegment(segments, edgePoints, 0, 2);
      break;
    case 10:
      if (centerValue > 0) {
        addSegment(segments, edgePoints, 3, 0);
        addSegment(segments, edgePoints, 1, 2);
      } else {
        addSegment(segments, edgePoints, 0, 1);
        addSegment(segments, edgePoints, 2, 3);
      }
      break;
    case 11:
      addSegment(segments, edgePoints, 1, 2);
      break;
    case 12:
      addSegment(segments, edgePoints, 3, 1);
      break;
    case 13:
      addSegment(segments, edgePoints, 0, 1);
      break;
    case 14:
      addSegment(segments, edgePoints, 3, 0);
      break;
    default:
      break;
  }
}

export function marchingSquares({ evaluate, level = 0, bounds, resolution = 72 }) {
  if (typeof evaluate !== 'function') throw new TypeError('marchingSquares requires evaluate');
  const { minX, minY, maxX, maxY } = readBounds(bounds);
  const n = Number.isFinite(resolution) ? Math.max(1, Math.floor(resolution)) : 72;
  if (![minX, minY, maxX, maxY].every(finite) || maxX <= minX || maxY <= minY) {
    return [];
  }

  const dx = (maxX - minX) / n;
  const dy = (maxY - minY) / n;
  const grid = [];
  for (let j = 0; j <= n; j += 1) {
    const row = [];
    const y = maxY - j * dy;
    for (let i = 0; i <= n; i += 1) {
      const x = minX + i * dx;
      const value = evaluate(x, y);
      row.push(finite(value) ? value - level : NaN);
    }
    grid.push(row);
  }

  const segments = [];
  for (let j = 0; j < n; j += 1) {
    const yTop = maxY - j * dy;
    const yBottom = yTop - dy;
    for (let i = 0; i < n; i += 1) {
      const xLeft = minX + i * dx;
      const xRight = xLeft + dx;
      const values = [
        grid[j][i],
        grid[j][i + 1],
        grid[j + 1][i + 1],
        grid[j + 1][i],
      ];
      if (!values.every(finite)) continue;

      const mask = values.reduce((result, value, index) => (
        result | (value > 0 ? (1 << index) : 0)
      ), 0);
      if (mask === 0 || mask === 15) continue;

      const points = [
        { x: xLeft, y: yTop },
        { x: xRight, y: yTop },
        { x: xRight, y: yBottom },
        { x: xLeft, y: yBottom },
      ];
      const edgePoints = {
        0: interpolate(points[0], values[0], points[1], values[1]),
        1: interpolate(points[1], values[1], points[2], values[2]),
        2: interpolate(points[2], values[2], points[3], values[3]),
        3: interpolate(points[3], values[3], points[0], values[0]),
      };
      const center = evaluate((xLeft + xRight) / 2, (yTop + yBottom) / 2);
      const centerValue = finite(center) ? center - level : (values.reduce((sum, value) => sum + value, 0) / 4);
      cellSegments(mask, centerValue, edgePoints, segments);
    }
  }
  return segments;
}
