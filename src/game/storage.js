import { STORAGE_BEST } from './constants.js';
import { DEFAULT_DIFFICULTY_ID } from './difficulties.js';

function keyFor(id) {
  return `${STORAGE_BEST}-${id || DEFAULT_DIFFICULTY_ID}`;
}

export function readBest(id) {
  try {
    const n = Number(localStorage.getItem(keyFor(id)));
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
  } catch {
    return 0;
  }
}

export function writeBest(id, n) {
  try {
    localStorage.setItem(keyFor(id), String(Math.max(0, Math.floor(n))));
  } catch {
    /* quota / private mode */
  }
}
