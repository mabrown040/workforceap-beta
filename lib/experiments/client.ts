/** Browser-safe experiment helpers (no node:crypto). */

export {
  EXPERIMENTS,
  getExperimentVariantClient as getExperimentVariant,
  readExperimentOverrideFromSearch,
} from './shared';

export type {
  ExperimentDefinition,
  ExperimentOverride,
  ExperimentSubject,
  Variant,
} from './shared';
