import { describe, expect, it } from 'vitest';
import { marchingSquares } from '../src/game/contour/marchingSquares.js';
import { stitchSegments } from '../src/game/contour/stitchSegments.js';

const bounds = { minX: -8, maxX: 8, minY: -8, maxY: 8 };

function contour(evaluate, level, resolution = 72) {
  const segments = marchingSquares({ evaluate, level, bounds, resolution });
  return { segments, polylines: stitchSegments(segments) };
}

describe('marching-squares contours', () => {
  it('stitches a circle into one closed polyline', () => {
    const result = contour((x, y) => x * x + y * y, 25);
    expect(result.segments.length).toBeGreaterThan(100);
    expect(result.polylines).toHaveLength(1);

    const [circle] = result.polylines;
    expect(circle[0]).toEqual(circle.at(-1));
    circle.forEach((point) => {
      expect(Math.hypot(point.x, point.y)).toBeCloseTo(5, 1);
    });
  });

  it('keeps the two branches of a hyperbola separate', () => {
    const { polylines } = contour((x, y) => x * x - y * y, 1);
    expect(polylines).toHaveLength(2);
    polylines.forEach((polyline) => {
      const signs = new Set(polyline.map((point) => Math.sign(point.x)));
      expect(signs.size).toBe(1);
    });
  });

  it('resolves saddle cells using the center value', () => {
    const positiveCenter = contour((x, y) => (x - 0.2) * (y - 0.2), 0, 1);
    const negativeCenter = contour((x, y) => (x - 0.2) * (y + 0.2), 0, 1);
    expect(positiveCenter.segments).toHaveLength(2);
    expect(negativeCenter.segments).toHaveLength(2);

    const positivePairs = positiveCenter.segments.map((segment) => [segment.a, segment.b]);
    const negativePairs = negativeCenter.segments.map((segment) => [segment.a, segment.b]);
    expect(positivePairs).not.toEqual(negativePairs);
  });

  it('supports a cardioid and a periodic angular field without broken points', () => {
    const cardioid = contour((x, y) => {
      const r = Math.hypot(x, y);
      return r > 0.2 ? r - 3 * (1 - x / r) : NaN;
    }, 0);
    const angular = contour((x, y) => Math.atan2(y, x), 2.8);

    expect(cardioid.polylines.length).toBeGreaterThan(0);
    expect(angular.polylines.length).toBeGreaterThan(0);
    [...cardioid.polylines, ...angular.polylines].forEach((polyline) => {
      polyline.forEach((point) => {
        expect(Number.isFinite(point.x)).toBe(true);
        expect(Number.isFinite(point.y)).toBe(true);
      });
    });
  });
});
