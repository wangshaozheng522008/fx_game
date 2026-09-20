import { describe, expect, it } from 'vitest';
import { buildBeamPaths } from '../src/game/beamPath.js';

function circlePoints(count = 8) {
  const points = [];
  for (let i = 0; i < count; i += 1) {
    const angle = (Math.PI * 2 * i) / count;
    points.push({ x: Math.cos(angle), y: Math.sin(angle) });
  }
  return points.concat([{ ...points[0] }]);
}

describe('beam paths', () => {
  it('starts at the player and splits closed curves by shortest direction', () => {
    const player = { x: 1, y: 0 };
    const points = circlePoints();
    const paths = buildBeamPaths(points, player, [points[2], points[6]]);

    expect(paths).toHaveLength(2);
    expect(paths[0][0]).toEqual(player);
    expect(paths[0].at(-1)).toEqual(points[2]);
    expect(paths[1][0]).toEqual(player);
    expect(paths[1].at(-1)).toEqual(points[6]);
    expect(paths.map((path) => path.length)).toEqual([3, 3]);
  });

  it('keeps targets on either side of a player on an open curve', () => {
    const points = [0, 1, 2, 3, 4].map((x) => ({ x, y: 0 }));
    const player = points[2];
    const paths = buildBeamPaths(points, player, [points[4], points[0]]);

    expect(paths).toHaveLength(2);
    expect(paths[0]).toEqual([points[2], points[3], points[4]]);
    expect(paths[1]).toEqual([points[2], points[1], points[0]]);
  });
});
