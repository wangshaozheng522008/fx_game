import { getEvaluationKey } from './helpers.js';

const evaluationKey = getEvaluationKey();

export const IDENTITY_TRANSFORM = Object.freeze({
  tx: 0,
  ty: 0,
  rotation: 0,
  sx: 1,
  sy: 1,
});

function safeScale(value) {
  return Number.isFinite(value) && Math.abs(value) > 1e-6 ? value : 1;
}

export function worldToLocal(x, y, transform = IDENTITY_TRANSFORM) {
  const tx = Number.isFinite(transform?.tx) ? transform.tx : 0;
  const ty = Number.isFinite(transform?.ty) ? transform.ty : 0;
  const rotation = Number.isFinite(transform?.rotation) ? transform.rotation : 0;
  const sx = safeScale(transform?.sx);
  const sy = safeScale(transform?.sy);
  const dx = x - tx;
  const dy = y - ty;
  const c = Math.cos(-rotation);
  const s = Math.sin(-rotation);
  const rx = dx * c - dy * s;
  const ry = dx * s + dy * c;
  return {
    x: rx / sx,
    y: ry / sy,
  };
}

export function evaluateFunction(definition, instance, x, y) {
  const local = worldToLocal(x, y, instance?.transform);
  return definition[evaluationKey](instance.params, local.x, local.y);
}

export function isInDomain(definition, instance, x, y) {
  const local = worldToLocal(x, y, instance?.transform);
  return definition.domain(local.x, local.y);
}

export function isIdentityTransform(transform) {
  if (!transform) return true;
  return transform.tx === 0
    && transform.ty === 0
    && transform.rotation === 0
    && transform.sx === 1
    && transform.sy === 1;
}

function fmt(value) {
  return value.toFixed(2);
}

function shifted(variable, offset) {
  if (offset === 0) return variable;
  return `${variable}${offset > 0 ? ' − ' : ' + '}${fmt(Math.abs(offset))}`;
}

function coefficient(value, variable) {
  if (Math.abs(value) < 0.005) return '';
  const grouped = variable.includes(' ') ? `(${variable})` : variable;
  if (Math.abs(value - 1) < 0.005) return variable;
  if (Math.abs(value + 1) < 0.005) return `−${grouped}`;
  return `${fmt(value)}${grouped}`;
}

function joinCoordinateTerms(left, right) {
  if (!left) return right;
  if (!right) return left;
  if (right.startsWith('−')) return `${left} − ${right.slice(1)}`;
  if (right.startsWith('+')) return `${left} + ${right.slice(1)}`;
  return `${left} + ${right}`;
}

export function formatLocalCoordinates(transform) {
  if (isIdentityTransform(transform)) return '';
  const rotation = transform.rotation || 0;
  const c = Math.cos(-rotation);
  const s = Math.sin(-rotation);
  const x = shifted('x', transform.tx || 0);
  const y = shifted('y', transform.ty || 0);
  const u = joinCoordinateTerms(
    coefficient(c, x),
    coefficient(-s, y),
  );
  const v = joinCoordinateTerms(
    coefficient(s, x),
    coefficient(c, y),
  );
  return `u=(${u})/${fmt(transform.sx)}; v=(${v})/${fmt(transform.sy)}`;
}
