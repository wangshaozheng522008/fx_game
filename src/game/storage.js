import { STORAGE_BEST } from './constants.js';

export function readBest() {
  try {
    const n = Number(localStorage.getItem(STORAGE_BEST));
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
  } catch {
    return 0;
  }
}

export function writeBest(n) {
  try {
    localStorage.setItem(STORAGE_BEST, String(Math.max(0, Math.floor(n))));
  } catch {
    /* quota / private mode */
  }
}
