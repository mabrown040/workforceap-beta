/**
 * A/B experiment framework — server- and client-friendly feature flags.
 *
 * Browser components should import from `@/lib/experiments/client` so
 * `node:crypto` is never pulled into the client bundle.
 */

import {
  type ExperimentDefinition,
  type ExperimentOverride,
  type ExperimentSubject,
  type Variant,
  EXPERIMENTS,
  getExperimentVariantClient,
  readExperimentOverrideFromSearch,
} from './shared';

export type { ExperimentDefinition, ExperimentOverride, ExperimentSubject, Variant };
export { EXPERIMENTS, readExperimentOverrideFromSearch };

function parseOverride(exp: string): { name: string; variant: string } | null {
  const idx = exp.indexOf(':');
  if (idx < 1 || idx === exp.length - 1) return null;
  return { name: exp.slice(0, idx), variant: exp.slice(idx + 1) };
}

/**
 * Assigns a variant for a named experiment (server or isomorphic).
 * Signed `_exp` overrides require this async entry point on the server.
 */
export async function getExperimentVariant<V extends string = Variant>(
  definition: ExperimentDefinition<V>,
  subject?: ExperimentSubject,
  override?: ExperimentOverride,
): Promise<V> {
  if (override?.exp && override.signature) {
    const parsed = parseOverride(override.exp);
    if (parsed && parsed.name === definition.name) {
      const matchesKnownVariant = (definition.variants as readonly string[]).includes(
        parsed.variant,
      );
      if (matchesKnownVariant) {
        const { verifyOverrideSignature } = await import('./verify-override.server');
        const signed = await verifyOverrideSignature(override.exp, override.signature);
        if (signed) {
          return parsed.variant as V;
        }
      }
    }
  }

  return getExperimentVariantClient(definition, subject, override);
}

export async function signExperimentOverride(exp: string): Promise<string | null> {
  const { signExperimentOverride: sign } = await import('./verify-override.server');
  return sign(exp);
}
