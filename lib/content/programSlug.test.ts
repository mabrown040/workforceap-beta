import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  canonicalizeProgramSlug,
  programSlugReadCandidates,
  programSlugsEquivalent,
} from './programSlug';

describe('canonicalizeProgramSlug', () => {
  it('maps the discovered CompTIA key to the WAP catalog slug', () => {
    assert.equal(
      canonicalizeProgramSlug('comptia-a-plus'),
      'comptia-a-professional-certificate',
    );
  });

  it('normalizes and is idempotent on canonical slugs', () => {
    assert.equal(
      canonicalizeProgramSlug('  COMPTIA-A-PROFESSIONAL-CERTIFICATE '),
      'comptia-a-professional-certificate',
    );
  });

  it('treats alias and canonical values as equivalent', () => {
    assert.equal(
      programSlugsEquivalent(
        'comptia-a-plus',
        'comptia-a-professional-certificate',
      ),
      true,
    );
  });

  it('expands a canonical read to every stored alias', () => {
    assert.deepEqual(
      new Set(programSlugReadCandidates('ai-practitioner-professional-certificate-aws')),
      new Set([
        'ai-practitioner-professional-certificate-aws',
        'ai-practitioner-professional-certificate',
        'ai-professional-practitioner-certificate',
        'ai-professional-developer-certificate-ibm',
      ]),
    );
  });

  it('returns the same complete read set when the input is already an alias', () => {
    assert.deepEqual(
      new Set(programSlugReadCandidates('AI-PROFESSIONAL-PRACTITIONER-CERTIFICATE')),
      new Set(programSlugReadCandidates('ai-practitioner-professional-certificate-aws')),
    );
  });
});
