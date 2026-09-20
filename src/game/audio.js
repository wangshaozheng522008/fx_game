let ctx = null;
let unlocked = false;

function getCtx() {
  if (ctx) return ctx;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  } catch {
    ctx = null;
  }
  return ctx;
}

export function unlockAudio() {
  try {
    const audio = getCtx();
    if (!audio) return;
    if (audio.state === 'suspended') {
      audio.resume().catch(() => {});
    }
    unlocked = true;
  } catch {
    unlocked = false;
  }
}

function tone(freq, duration, type, gainValue) {
  const audio = getCtx();
  if (!audio || !unlocked) return;
  try {
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = gainValue;
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + duration);
    osc.connect(gain);
    gain.connect(audio.destination);
    osc.start();
    osc.stop(audio.currentTime + duration);
  } catch {
    /* ignore audio failures in restricted containers */
  }
}

export function sfxSelect() {
  tone(520, 0.07, 'square', 0.05);
}

export function sfxHit() {
  tone(880, 0.08, 'square', 0.07);
  window.setTimeout(() => tone(1175, 0.12, 'square', 0.05), 70);
}

export function sfxMiss() {
  tone(180, 0.22, 'sawtooth', 0.06);
}

export function sfxTick() {
  tone(740, 0.04, 'square', 0.03);
}
