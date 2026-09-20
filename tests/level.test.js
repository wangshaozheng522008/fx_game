import { describe, it, expect } from 'vitest';
import { createRound, hitsAllTargets, hitsTarget, sampleIsoline, resolveLevel } from '../src/game/mathFns.js';
import { getDifficulty } from '../src/game/difficulties.js';

const gauss = getDifficulty('gauss');

// Same tiered precision as fmtN in mathFns.js
function fmtN(n) {
  const abs = Math.abs(n);
  if (abs >= 100) return n.toFixed(0);
  if (abs >= 10) return n.toFixed(1);
  return n.toFixed(2);
}

function correctOption(round, id) {
  return round.options.find((fn) => fn.id === id && fn.correct);
}

function wrongOption(round, id) {
  return round.options.find((fn) => fn.id === id && !fn.correct);
}

describe('unified function level evaluation', () => {
  it('ellipse correct option hits player and monsters, label matches beam', () => {
    let round = null;
    for (let i = 0; i < 200 && !round; i += 1) {
      const candidate = createRound(i + 1, gauss);
      if (correctOption(candidate, 'ellipse')) round = candidate;
    }
    expect(round).toBeTruthy();
    const fn = correctOption(round, 'ellipse');
    const { player, points } = round;

    expect(resolveLevel(fn, player)).toBe(1);
    expect(fn.level).toBe(1);

    // Display: equation must use level === 1
    expect(fn.label).toBe(
      `x²/${fmtN(fn.params.a * fn.params.a)} + y²/${fmtN(fn.params.b * fn.params.b)} = ${fmtN(1)}`,
    );

    // Hit test: beam samples must cover player and all monsters
    expect(hitsAllTargets(fn, player, points)).toBe(true);
    const beam = sampleIsoline(fn, player).primary;
    expect(beam.length).toBeGreaterThan(20);
    const near = (pt, dist) => beam.some((p) => Math.hypot(p.x - pt.x, p.y - pt.y) <= dist);
    expect(near(player, 0.3)).toBe(true);
    points.forEach((pt) => expect(near(pt, 0.3)).toBe(true));
  });

  it('ellipse wrong option: displayed equation and beam are the same level-1 curve', () => {
    let round = null;
    for (let i = 0; i < 200; i += 1) {
      const candidate = createRound(i + 100, gauss);
      if (wrongOption(candidate, 'ellipse')) {
        round = candidate;
        break;
      }
    }
    expect(round).toBeTruthy();
    const fn = wrongOption(round, 'ellipse');
    const { player, points } = round;

    // Fixed-curve level is always 1, independent of where the player stands
    expect(resolveLevel(fn, player)).toBe(1);
    expect(fn.level).toBe(1);

    // Display: equation reads "= 1"
    expect(fn.label).toBe(
      `x²/${fmtN(fn.params.a * fn.params.a)} + y²/${fmtN(fn.params.b * fn.params.b)} = ${fmtN(1)}`,
    );

    // Beam: every sample lies on this option's own level-1 ellipse
    const beam = sampleIsoline(fn, player).primary;
    expect(beam.length).toBeGreaterThan(20);
    beam.forEach((p) => {
      const v = p.x * p.x / (fn.params.a * fn.params.a) + p.y * p.y / (fn.params.b * fn.params.b);
      expect(v).toBeCloseTo(1, 1);
    });

    // Consistency: hit test uses the same level, and the player is off this curve
    expect(hitsAllTargets(fn, player, points)).toBe(false);
  });

  it('circleFixed correct option: beam radius equals params.r', () => {
    let round = null;
    for (let i = 0; i < 200 && !round; i += 1) {
      const candidate = createRound(i + 1, gauss);
      if (correctOption(candidate, 'circleFixed')) round = candidate;
    }
    expect(round).toBeTruthy();
    const fn = correctOption(round, 'circleFixed');
    const { player, points } = round;

    expect(fn.level).toBe(fn.params.r2);
    expect(fn.label).toBe(`x² + y² = ${fmtN(fn.params.r2)}`);


    expect(hitsAllTargets(fn, player, points)).toBe(true);
    const beam = sampleIsoline(fn, player).primary;
    expect(beam.length).toBeGreaterThan(20);
    beam.forEach((p) => {
      expect(Math.hypot(p.x, p.y)).toBeCloseTo(fn.params.r, 1);
    });
  });

  it('circleFixed wrong option: level is params.r2, never the player radius', () => {
    let round = null;
    for (let i = 0; i < 200; i += 1) {
      const candidate = createRound(i + 100, gauss);
      if (wrongOption(candidate, 'circleFixed')) {
        round = candidate;
        break;
      }
    }
    expect(round).toBeTruthy();
    const fn = wrongOption(round, 'circleFixed');
    const { player, points } = round;

    const playerR2 = player.x * player.x + player.y * player.y;
    expect(fn.params.r2).not.toBeCloseTo(playerR2, 2);

    // Level is the fixed circle, not the player's radius
    expect(resolveLevel(fn, player)).toBe(fn.params.r2);
    expect(fn.level).toBe(fn.params.r2);
    expect(fn.label).toBe(`x² + y² = ${fmtN(fn.params.r2)}`);


    const beam = sampleIsoline(fn, player).primary;
    expect(beam.length).toBeGreaterThan(20);
    beam.forEach((p) => {
      expect(Math.hypot(p.x, p.y)).toBeCloseTo(fn.params.r, 1);
    });

    // Player is off the circle, so the beam does not hit player/monsters
    expect(hitsAllTargets(fn, player, points)).toBe(false);
  });

  it('level is cached once per round and shared by display/hit/render', () => {
    const round = createRound(1, gauss);
    round.options.forEach((fn) => {
      const cached = fn.level;
      expect(typeof cached).toBe('number');
      expect(Number.isFinite(cached)).toBe(true);

      // resolveLevel, hitsTarget and sampleIsoline all agree with the cached level
      expect(resolveLevel(fn, round.player)).toBe(cached);
      if (fn.correct) expect(hitsTarget(fn, round.player, round.player)).toBe(true);
      const contour = sampleIsoline(fn, round.player);
      if (contour.primary && contour.primary.length) {
        const worst = Math.min(...contour.primary.map((p) => {
          const v = fn.type.F(fn.params, p.x, p.y);
          return Math.abs(v - cached) - 0.02;
        }));
        expect(worst).toBeLessThanOrEqual(0);
      }
    });
  });

  it('atan2 keeps the selected ray and drops the antipodal branch cut', () => {
    let round = null;
    for (let i = 0; i < 200 && !round; i += 1) {
      const candidate = createRound(i + 500, gauss);
      if (candidate.options.some((fn) => fn.id === 'atan2')) round = candidate;
    }
    const fn = round.options.find((item) => item.id === 'atan2');
    const contour = sampleIsoline(fn, round.player);
    expect(contour.polylines).toHaveLength(1);
    contour.primary.forEach((point) => {
      const delta = Math.atan2(
        Math.sin(Math.atan2(point.y, point.x) - fn.level),
        Math.cos(Math.atan2(point.y, point.x) - fn.level),
      );
      expect(Math.abs(delta)).toBeLessThan(0.2);
    });
  });
});
