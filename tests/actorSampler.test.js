import { describe, expect, it } from 'vitest';
import {
  MIN_ARC_DISTANCE,
  MIN_COMPONENT_LENGTH,
  MIN_WORLD_DISTANCE,
  sampleActors,
  sampleAtDistance,
} from '../src/game/generator/actorSampler.js';

function circlePolyline(radius, count = 160) {
  const points = [];
  for (let i = 0; i <= count; i += 1) {
    const angle = (i * Math.PI * 2) / count;
    points.push({ x: radius * Math.cos(angle), y: radius * Math.sin(angle) });
  }
  return points;
}

function circleArc(radius, start, end, count = 80) {
  const points = [];
  for (let i = 0; i <= count; i += 1) {
    const angle = start + ((end - start) * i) / count;
    points.push({ x: radius * Math.cos(angle), y: radius * Math.sin(angle) });
  }
  return points;
}

const circleFn = {
  id: 'circle',
  params: {},
  type: {
    inDomain() {
      return true;
    },
    F(_params, x, y) {
      return x * x + y * y;
    },
  },
};

describe('generic contour actor sampler', () => {
  it('interpolates arbitrary arc distances', () => {
    const line = [{ x: 0, y: 0 }, { x: 3, y: 0 }, { x: 3, y: 4 }];
    expect(sampleAtDistance(line, 1.5)).toEqual({ x: 1.5, y: 0 });
    expect(sampleAtDistance(line, 5)).toEqual({ x: 3, y: 2 });
  });

  it('samples actors on one component with both distance constraints', () => {
    const actors = sampleActors({
      fn: circleFn,
      level: 25,
      polylines: [circlePolyline(5)],
      actorCount: 4,
    });
    expect(actors).toHaveLength(4);
    for (let i = 0; i < actors.length; i += 1) {
      expect(actors[i].x ** 2 + actors[i].y ** 2).toBeCloseTo(25, 1);
      for (let j = i + 1; j < actors.length; j += 1) {
        expect(Math.hypot(actors[i].x - actors[j].x, actors[i].y - actors[j].y))
          .toBeGreaterThanOrEqual(MIN_WORLD_DISTANCE);
        const angle = Math.abs(Math.atan2(actors[i].y, actors[i].x) - Math.atan2(actors[j].y, actors[j].x));
        const wrappedAngle = Math.min(angle, Math.PI * 2 - angle);
        expect(wrappedAngle * 5).toBeGreaterThanOrEqual(MIN_ARC_DISTANCE - 1e-6);
      }
    }
  });

  it('rejects components that cannot hold the requested actors', () => {
    const short = [{ x: 2.5, y: 0 }, { x: 2.5 + MIN_COMPONENT_LENGTH / 2, y: 0 }];
    expect(sampleActors({
      fn: circleFn,
      level: 6.25,
      polylines: [short],
      actorCount: 2,
    })).toBeNull();
  });

  it('rejects actors spread across separate components', () => {
    const actors = sampleActors({
      fn: circleFn,
      level: 25,
      polylines: [
        circleArc(5, 0, 0.8),
        circleArc(5, Math.PI, Math.PI + 0.8),
      ],
      actorCount: 4,
    });
    expect(actors).toBeNull();
  });
});
