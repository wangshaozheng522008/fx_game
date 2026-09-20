import { VIEW, WORLD_RANGE } from './constants.js';
import { MONSTER, PLAYER, SPRITE_SCALE, drawSprite, spriteSize } from './sprites.js';

function worldToPix(x, y) {
  const px = ((x / WORLD_RANGE + 1) / 2) * VIEW;
  const py = (1 - (y / WORLD_RANGE + 1) / 2) * VIEW;
  return { px, py };
}

function pix(n) {
  return Math.round(n);
}

export function createRenderer(canvas) {
  const ctx = canvas ? canvas.getContext('2d') : null;
  if (!canvas || !ctx) {
    return {
      render() {},
      worldToPix(x, y) {
        return { px: 0, py: 0 };
      },
    };
  }
  canvas.width = VIEW;
  canvas.height = VIEW;
  ctx.imageSmoothingEnabled = false;

  function clear() {
    ctx.fillStyle = '#1a1028';
    ctx.fillRect(0, 0, VIEW, VIEW);
    ctx.fillStyle = '#221536';
    for (let y = 0; y < VIEW; y += 2) {
      ctx.fillRect(0, y, VIEW, 1);
    }
  }

  function drawGrid() {
    ctx.fillStyle = '#2d1b4a';
    for (let u = -Math.floor(WORLD_RANGE); u <= Math.floor(WORLD_RANGE); u += 1) {
      const v = worldToPix(u, 0);
      const h = worldToPix(0, u);
      ctx.fillRect(pix(v.px), 0, 1, VIEW);
      ctx.fillRect(0, pix(h.py), VIEW, 1);
    }

    const origin = worldToPix(0, 0);
    ctx.fillStyle = '#c8b48a';
    ctx.fillRect(0, pix(origin.py), VIEW, 2);
    ctx.fillRect(pix(origin.px), 0, 2, VIEW);

    ctx.fillStyle = '#8c7a5a';
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('x', VIEW - 12, pix(origin.py) + 4);
    ctx.fillText('y', pix(origin.px) + 4, 4);
  }

  function drawReticle(x, y) {
    const pos = worldToPix(x, y);
    const cx = pix(pos.px);
    const cy = pix(pos.py);
    ctx.fillStyle = '#ffe566';
    ctx.fillRect(cx - 5, cy, 3, 1);
    ctx.fillRect(cx + 3, cy, 3, 1);
    ctx.fillRect(cx, cy - 5, 1, 3);
    ctx.fillRect(cx, cy + 3, 1, 3);
    ctx.fillStyle = '#ff2d55';
    ctx.fillRect(cx, cy, 2, 2);
  }

  function drawActor(map, x, y, bob) {
    const size = spriteSize(map, SPRITE_SCALE);
    const pos = worldToPix(x, y);
    drawSprite(
      ctx,
      map,
      pix(pos.px - size.w / 2),
      pix(pos.py - size.h / 2 + bob),
      SPRITE_SCALE,
    );
  }

  function drawBeam(polyline, t, hit) {
    if (!polyline || !polyline.length) return;
    const count = Math.floor(polyline.length * t);
    ctx.fillStyle = hit === false ? '#ff8fa0' : '#ffe566';
    for (let i = 0; i < count; i += 1) {
      const p = worldToPix(polyline[i].x, polyline[i].y);
      ctx.fillRect(pix(p.px) - 1, pix(p.py) - 1, 2, 2);
    }
  }

  function drawParticles(particles) {
    particles.forEach((p) => {
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.fillRect(pix(p.px), pix(p.py), 2, 2);
    });
    ctx.globalAlpha = 1;
  }

  function drawBanner(text, color) {
    const w = Math.round(VIEW * 0.72);
    const h = Math.round(VIEW * 0.16);
    const x = Math.round((VIEW - w) / 2);
    const y = Math.round(VIEW * 0.4);
    ctx.fillStyle = 'rgba(10, 6, 18, 0.72)';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = color;
    ctx.font = '16px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, VIEW / 2, y + h / 2);
  }

  function roundPlayer(state) {
    return state.round && state.round.player ? state.round.player : { x: 0, y: 0 };
  }

  function roundPoints(state) {
    if (!state.round) return [];
    if (Array.isArray(state.round.points) && state.round.points.length) {
      return state.round.points;
    }
    return state.round.point ? [state.round.point] : [];
  }

  function render(state) {
    const player = roundPlayer(state);
    const points = roundPoints(state);
    clear();
    drawGrid();
    if (state.beamSamples) {
      drawBeam(state.beamSamples.primary, state.beamT, state.hit);
    }
    drawActor(PLAYER, player.x, player.y, 0);
    const bob = Math.round(Math.sin((state.now || 0) / 180));
    points.forEach((point) => {
      if (state.hit !== true) drawReticle(point.x, point.y);
      drawActor(MONSTER, point.x, point.y, state.hit === true ? 0 : bob);
    });
    drawParticles(state.particles || []);
    if (state.banner) {
      drawBanner(state.banner.text, state.banner.color);
    }
  }

  return { render, worldToPix };
}
