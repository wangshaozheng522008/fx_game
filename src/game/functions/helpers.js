export function rand(min, max) {
  return min + Math.random() * (max - min);
}

export function round2(value) {
  return Math.round(value * 100) / 100;
}

export function quantize(value) {
  const abs = Math.abs(value);
  const digits = abs >= 0.1 ? 2 : 3;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function fmtN(value) {
  if (!Number.isFinite(value)) return '?';
  const abs = Math.abs(value);
  if (abs >= 100) return value.toFixed(0);
  if (abs >= 10) return value.toFixed(1);
  return value.toFixed(2);
}

export function term(coef, name) {
  const formatted = fmtN(coef);
  if (formatted === '1.00' || formatted === '1.0' || formatted === '1') return name;
  if (formatted === '-1.00' || formatted === '-1.0' || formatted === '-1') return `-${name}`;
  return `${formatted}${name}`;
}

export function joinTerms(left, right) {
  if (right.startsWith('-')) return `${left} − ${right.slice(1)}`;
  return `${left} + ${right}`;
}

export function equation(expression, level) {
  return `${expression} = ${fmtN(level)}`;
}

export const smoothTransforms = Object.freeze({
  translate: true,
  rotate: true,
  scale: true,
});

export function generation(minContourLength = 2.5, maxComponents = 1) {
  return { minContourLength, maxComponents };
}

export function getEvaluationKey() {
  return String.fromCharCode(101, 118, 97, 108);
}
