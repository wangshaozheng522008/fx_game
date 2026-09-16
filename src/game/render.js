import { VIEW, WORLD_RANGE } from './constants.js';
import { MONSTER, PLAYER, drawSprite, spriteSize } from './sprites.js';

function worldToPix(x, y) {
  const px = ((x / WORLD_RANGE + 1) / 2) * VIEW;
  const py = (1 - (y / WORLD_RANGE + 1) / 2) * VIEW;
  return { px, py };
}

function pix(n) {
  return Math.round(n);
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
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
    ctx.font = '8px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('x', VIEW - 10, pix(origin.py) + 4);
    ctx.fillText('y', pix(origin.px) + 4, 4);
  }

  function drawActor(map, x, y, bob) {
    const size = spriteSize(map, 1);
    const pos = worldToPix(x, y);
    drawSprite(ctx, map, pix(pos.px - size.w / 2), pix(pos.py - size.h / 2 + bob), 1);
  }

  function drawBeam(samples, t, hit) {
    if (!samples.length) return;
    const count = Math.max(1, Math.floor(samples.length * t));
    for (let i = 0; i < count; i += 1) {
      const p = worldToPix(samples[i].x, samples[i].y);
      const pulse = i % 4 === 0;
      ctx.fillStyle = pulse ? '#ffffff' : hit === false ? '#ff8fa0' : '#ffe566';
      ctx.fillRect(pix(p.px) - 1, pix(p.py) - 1, pulse ? 3 : 2, pulse ? 3 : 2);
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
    ctx.fillStyle = 'rgba(10, 6, 18, 0.72)';
    ctx.fillRect(28, 72, 124, 28);
    ctx.fillStyle = color;
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, VIEW / 2, 86);
  }

  function render(state) {
    clear();
    drawGrid();
    if (state.beamSamples) {
      drawBeam(state.beamSamples, state.beamT, state.hit);
    }
    drawActor(PLAYER, 0, 0, 0);
    if (state.point) {
      const bob = Math.round(Math.sin(state.now / 180) * 1);
      drawActor(MONSTER, state.point.x, state.point.y, state.hit === true ? 0 : bob);
    }
    drawParticles(state.particles);
    if (state.banner) {
      drawBanner(state.banner.text, state.banner.color);
    }
  }

  return { render, worldToPix };
}
