import { DIFFICULTIES } from '../difficulties.js';
import * as conic from './families/conic.js';
import * as exotic from './families/exotic.js';
import * as exponential from './families/exponential.js';
import * as linear from './families/linear.js';
import * as polar from './families/polar.js';
import * as trig from './families/trig.js';
import { getEvaluationKey } from './helpers.js';

const evaluationKey = getEvaluationKey();

const definitions = [
  ...Object.values(linear),
  ...Object.values(conic),
  ...Object.values(trig),
  ...Object.values(exponential),
  ...Object.values(polar),
  ...Object.values(exotic),
];

function runtimeDefinition(definition) {
  return Object.freeze({
    ...definition,
    // Compatibility aliases for the current game code and old consumers.
    F: definition[evaluationKey],
    inDomain: definition.domain,
    label(params) {
      return definition.format(params, undefined);
    },
  });
}

const runtimeDefinitions = definitions.map(runtimeDefinition);
const registry = new Map(runtimeDefinitions.map((definition) => [definition.id, definition]));

export function getFunction(id) {
  return registry.get(id);
}

export function getFunctions(filter = {}) {
  const tags = Array.isArray(filter.tags) ? filter.tags : [];
  const families = Array.isArray(filter.families) ? filter.families : [];
  return runtimeDefinitions.filter((definition) => {
    if (filter.family && definition.family !== filter.family) return false;
    if (families.length && !families.includes(definition.family)) return false;
    if (filter.maxComplexity !== undefined && definition.complexity > filter.maxComplexity) return false;
    if (filter.minComplexity !== undefined && definition.complexity < filter.minComplexity) return false;
    if (filter.id && definition.id !== filter.id) return false;
    if (filter.ids && !filter.ids.includes(definition.id)) return false;
    return tags.every((tag) => definition.tags.includes(tag));
  });
}

function validateDefinitions(errors) {
  const seen = new Map();
  definitions.forEach((definition, index) => {
    if (!definition || typeof definition !== 'object') {
      errors.push(`definition[${index}] is not an object`);
      return;
    }
    if (!definition.id) {
      errors.push(`definition[${index}] is missing id`);
    } else if (seen.has(definition.id)) {
      errors.push(`duplicate function id: ${definition.id}`);
    } else {
      seen.set(definition.id, true);
    }
    if (typeof definition[evaluationKey] !== 'function') errors.push(`${definition.id || index} is missing eval`);
    if (typeof definition.domain !== 'function') errors.push(`${definition.id || index} is missing domain`);
    if (!Number.isInteger(definition.complexity) || definition.complexity < 1 || definition.complexity > 5) {
      errors.push(`${definition.id || index} has invalid complexity`);
    }
    if (typeof definition.createParams !== 'function') errors.push(`${definition.id || index} is missing createParams`);
    if (typeof definition.format !== 'function') errors.push(`${definition.id || index} is missing format`);
    if (!definition.family) errors.push(`${definition.id || index} is missing family`);
    if (!Array.isArray(definition.tags)) errors.push(`${definition.id || index} is missing tags`);
    if (!definition.generation || !Number.isFinite(definition.generation.minContourLength)) {
      errors.push(`${definition.id || index} is missing generation.minContourLength`);
    }
    if (!definition.generation || !Number.isInteger(definition.generation.maxComponents)) {
      errors.push(`${definition.id || index} is missing generation.maxComponents`);
    }
    const transforms = definition.transforms;
    if (!transforms || !['translate', 'rotate', 'scale'].every((key) => typeof transforms[key] === 'boolean')) {
      errors.push(`${definition.id || index} is missing transforms metadata`);
    }
  });
}

function validateDifficultyReferences(errors, difficulties) {
  const knownFamilies = new Set(runtimeDefinitions.map((definition) => definition.family));
  difficulties.forEach((difficulty) => {
    if (Array.isArray(difficulty.families)) {
      difficulty.families.forEach((family) => {
        if (!knownFamilies.has(family)) {
          errors.push(`difficulty ${difficulty.id} references unknown function family: ${family}`);
        }
      });
    } else {
      errors.push(`difficulty ${difficulty.id} is missing families`);
    }
    // Keep this check for callers still using the pre-registry difficulty shape.
    if (Array.isArray(difficulty.types)) {
      difficulty.types.forEach((id) => {
        if (!registry.has(id)) errors.push(`difficulty ${difficulty.id} references unknown function id: ${id}`);
      });
    }
  });
}

export function validateRegistry({ difficulties = DIFFICULTIES } = {}) {
  const errors = [];
  validateDefinitions(errors);
  validateDifficultyReferences(errors, difficulties);
  if (errors.length) {
    throw new Error(`Function registry validation failed:\n- ${errors.join('\n- ')}`);
  }
  return true;
}

export { definitions };
