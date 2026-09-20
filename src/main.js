import './styles/app.css';
import { showToast } from './lib/toast.js';
import { BEAM_MS, MAX_LIVES, SETTLE_MS } from './game/constants.js';
import { DEFAULT_DIFFICULTY_ID, getDifficulty } from './game/difficulties.js';
import { createRound, hitsAllTargets, sampleIsoline } from './game/mathFns.js';
import { createRenderer } from './game/render.js';
import { readBest, writeBest } from './game/storage.js';
import { sfxHit, sfxMiss, sfxSelect, sfxTick, unlockAudio } from './game/audio.js';

const app = document.querySelector('#app');
const screens = {
  title: document.querySelector('#screen-title'),
  help: document.querySelector('#screen-help'),
  play: document.querySelector('#screen-play'),
  over: document.querySelector('#screen-over'),
};

const livesEl = document.querySelector('#lives');
const waveEl = document.querySelector('#wave');
const scoreEl = document.querySelector('#score');
const tierLabel = document.querySelector('#tier-label');
const timerBar = document.querySelector('#timer-bar');
const timerText = document.querySelector('#timer-text');
const targetEl = document.querySelector('#target');
const choiceBtns = Array.from(document.querySelectorAll('.choice'));
const titleBest = document.querySelector('#title-best');
const overScore = document.querySelector('#over-score');
const overBest = document.querySelector('#over-best');
const overWave = document.querySelector('#over-wave');
const shareBtn = document.querySelector('#btn-share');
const canvas = document.querySelector('#game');
const renderer = createRenderer(canvas);
const diffCards = Array.from(document.querySelectorAll('.diff-card'));

let raf = 0;
let game = null;
let selectedDifficulty = getDifficulty(DEFAULT_DIFFICULTY_ID);

function canShare() {
  return Boolean(window.xhs && window.xhs.miniTool && window.xhs.miniTool.postNote);
}

function showScreen(name) {
  Object.keys(screens).forEach((key) => {
    screens[key].hidden = key !== name;
  });
}

function roundPoints(round) {
  if (!round) return [];
  if (Array.isArray(round.points) && round.points.length) return round.points;
  return round.point ? [round.point] : [];
}

function formatHud(round) {
  if (!round || !round.player) return '角色 (?, ?)  目标';
  const p = round.player;
  const targets = roundPoints(round)
    .map((point) => `(${point.x.toFixed(2)}, ${point.y.toFixed(2)})`)
    .join(' ');
  return `角色 (${p.x.toFixed(2)}, ${p.y.toFixed(2)})  目标 ${targets}`;
}

function applyTheme(difficulty) {
  app.setAttribute('data-diff', difficulty.id);
}

function refreshTitleBest() {
  titleBest.textContent = String(readBest(selectedDifficulty.id));
}

function selectDifficulty(id) {
  selectedDifficulty = getDifficulty(id);
  diffCards.forEach((card) => {
    card.classList.toggle('is-on', card.getAttribute('data-id') === selectedDifficulty.id);
  });
  applyTheme(selectedDifficulty);
  refreshTitleBest();
}

function setChoicesEnabled(enabled) {
  choiceBtns.forEach((btn) => {
    btn.disabled = !enabled;
  });
}

function paintChoices(round, reveal) {
  choiceBtns.forEach((btn, index) => {
    const fn = round.options[index];
    btn.textContent = fn.label;
    btn.classList.remove('is-correct', 'is-wrong', 'is-picked');
    if (reveal) {
      if (fn.correct) btn.classList.add('is-correct');
      if (index === reveal.picked && !fn.correct) btn.classList.add('is-wrong');
      if (index === reveal.picked) btn.classList.add('is-picked');
    }
  });
}

function spawnBurst(round, hit) {
  const points = [round.player].concat(roundPoints(round)).filter(Boolean);
  const colors = hit ? ['#ffe566', '#ffffff', '#7ce7ff'] : ['#ff3b5c', '#ff8fa0', '#9b1d32'];
  const per = points.length > 2 ? 8 : 14;
  const particles = [];
  points.forEach((point) => {
    const origin = renderer.worldToPix(point.x, point.y);
    for (let i = 0; i < per; i += 1) {
      const angle = (Math.PI * 2 * i) / per;
      const speed = 0.6 + Math.random() * 1.4;
      particles.push({
        px: origin.px,
        py: origin.py,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        color: colors[i % colors.length],
      });
    }
  });
  return particles;
}

function refreshHud() {
  livesEl.querySelectorAll('.heart').forEach((heart, index) => {
    heart.classList.toggle('is-empty', index >= game.lives);
  });
  tierLabel.textContent = game.difficulty.title;
  waveEl.textContent = `W${game.wave}`;
  scoreEl.textContent = String(game.score);
  targetEl.textContent = formatHud(game.round);
}

function updateTimer(remain) {
  const total = game.difficulty.seconds;
  const ratio = Math.max(0, remain / total);
  timerBar.style.transform = `scaleX(${ratio})`;
  timerBar.classList.toggle('is-low', remain <= 5);
  timerText.textContent = remain.toFixed(1);
}

function endGame() {
  game.phase = 'over';
  const best = Math.max(readBest(game.difficulty.id), game.score);
  writeBest(game.difficulty.id, best);
  overScore.textContent = String(game.score);
  overBest.textContent = String(best);
  overWave.textContent = `${game.difficulty.title} · 坚持到第 ${game.wave} 波`;
  shareBtn.hidden = !canShare();
  refreshTitleBest();
  showScreen('over');
}

function beginRound() {
  game.round = createRound(game.wave, game.difficulty);
  game.phase = 'choice';
  game.deadline = performance.now() + game.difficulty.seconds * 1000;
  game.picked = -1;
  game.hit = null;
  game.beamT = 0;
  game.beamSamples = null;
  game.banner = null;
  game.particles = [];
  game.warnTick = 6;
  paintChoices(game.round, null);
  setChoicesEnabled(true);
  refreshHud();
  updateTimer(game.difficulty.seconds);
}

function startGame() {
  unlockAudio();
  applyTheme(selectedDifficulty);
  game = {
    difficulty: selectedDifficulty,
    lives: MAX_LIVES,
    wave: 1,
    score: 0,
    now: 0,
    phase: 'choice',
    round: null,
    deadline: 0,
    picked: -1,
    hit: null,
    beamT: 0,
    beamSamples: null,
    banner: null,
    particles: [],
    warnTick: 6,
    settleAt: 0,
  };
  showScreen('play');
  beginRound();
  if (!raf) raf = window.requestAnimationFrame(loop);
}

function resolvePick(index, timedOut) {
  if (!game || game.phase !== 'choice') return;
  const points = roundPoints(game.round);
  const fn = timedOut ? null : game.round.options[index];
  const hit = Boolean(fn && hitsAllTargets(fn, game.round.player, points));
  game.picked = timedOut ? -1 : index;
  game.hit = hit;
  setChoicesEnabled(false);
  paintChoices(game.round, { picked: game.picked });
  if (timedOut) {
    game.banner = { text: 'TIME UP', color: '#ff8fa0' };
    game.beamSamples = { polylines: [], primary: null };
    game.beamT = 1;
    finishBeam();
    return;
  }
  sfxSelect();
  game.phase = 'beam';
  game.beamT = 0;
  game.beamStarted = performance.now();
  game.beamSamples = sampleIsoline(fn, game.round.player);
}

function finishBeam() {
  const hit = game.hit;
  game.phase = 'settle';
  game.settleAt = performance.now() + SETTLE_MS;
  game.particles = spawnBurst(game.round, hit);
  if (hit) {
    const remain = Math.max(0, (game.deadline - performance.now()) / 1000);
    const gained = Math.round((100 + Math.floor(remain * 8)) * game.difficulty.scoreMul);
    game.score += gained;
    game.banner = { text: `HIT +${gained}`, color: '#7CFF6B' };
    sfxHit();
  } else {
    game.lives -= 1;
    if (!game.banner) game.banner = { text: 'MISS', color: '#ff8fa0' };
    sfxMiss();
  }
  refreshHud();
}

function afterSettle() {
  if (game.lives <= 0) {
    endGame();
    return;
  }
  if (game.hit) game.wave += 1;
  beginRound();
}

function loop(now) {
  raf = window.requestAnimationFrame(loop);
  if (!game || game.phase === 'over') return;
  game.now = now;
  game.particles = game.particles
    .map((p) => ({
      ...p,
      px: p.px + p.vx,
      py: p.py + p.vy,
      life: p.life - 0.03,
    }))
    .filter((p) => p.life > 0);

  if (game.phase === 'choice') {
    const remain = Math.max(0, (game.deadline - now) / 1000);
    updateTimer(remain);
    if (remain <= game.warnTick && remain > 0) {
      sfxTick();
      game.warnTick -= 1;
    }
    if (remain <= 0) resolvePick(-1, true);
  } else if (game.phase === 'beam') {
    game.beamT = Math.min(1, (now - game.beamStarted) / BEAM_MS);
    if (game.beamT >= 1) finishBeam();
  } else if (game.phase === 'settle') {
    game.beamT = 1;
    if (now >= game.settleAt) afterSettle();
  }

  renderer.render(game);
}

function shareScore() {
  if (!canShare() || !game) return;
  window.xhs.miniTool.postNote({
    title: '函数射线',
    content: `我在函数射线「${game.difficulty.title}」打出了 ${game.score} 分，坚持到第 ${game.wave} 波！`,
  });
}

diffCards.forEach((card) => {
  card.addEventListener('click', () => {
    selectDifficulty(card.getAttribute('data-id'));
  });
});

document.querySelector('#btn-start').addEventListener('click', startGame);
document.querySelector('#btn-help').addEventListener('click', () => showScreen('help'));
document.querySelector('#btn-help-back').addEventListener('click', () => showScreen('title'));
document.querySelector('#btn-retry').addEventListener('click', startGame);
document.querySelector('#btn-home').addEventListener('click', () => {
  applyTheme(selectedDifficulty);
  showScreen('title');
});
shareBtn.addEventListener('click', shareScore);

choiceBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    const index = Number(btn.getAttribute('data-index'));
    resolvePick(index, false);
  });
});

selectDifficulty(DEFAULT_DIFFICULTY_ID);
shareBtn.hidden = !canShare();
showToast('先选难度，再发射像素射线');
