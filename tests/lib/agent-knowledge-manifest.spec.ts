import { readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  AgentKnowledgeValidationError,
  computeKnowledgeContentHash,
  loadAgentKnowledgeManifest,
  resolveTrustedProgramKnowledge,
  validateAgentKnowledgeManifest,
  type AgentKnowledgeManifest,
} from '@/lib/agents/knowledge';
import { computeCanonicalTextSha256 } from '@/lib/agents/knowledge/manifest';

const VERIFIED_AT = new Date('2026-08-31T12:00:00-04:00');

async function readManifest(): Promise<AgentKnowledgeManifest> {
  return JSON.parse(
    await readFile('config/agent-knowledge/manifest.v1.json', 'utf8'),
  ) as AgentKnowledgeManifest;
}

function declaredSourceProofs(manifest: AgentKnowledgeManifest): Record<string, string> {
  return Object.fromEntries(
    manifest.entries.flatMap((entry) =>
      entry.sourcePath ? [[entry.sourcePath, entry.sourceSha]] : [],
    ),
  );
}

function rejectionIssues(action: () => unknown): readonly string[] {
  try {
    action();
  } catch (error) {
    expect(error).toBeInstanceOf(AgentKnowledgeValidationError);
    return (error as AgentKnowledgeValidationError).issues;
  }
  throw new Error('Expected agent knowledge validation to reject');
}

describe('governed agent knowledge manifest', () => {
  it('computes the same source proof for LF and CRLF text', () => {
    const lfSource = 'export const curriculum = true;\n// governed source\n';
    const crlfSource = lfSource.replace(/\n/g, '\r\n');

    expect(computeCanonicalTextSha256(crlfSource)).toBe(
      computeCanonicalTextSha256(lfSource),
    );
    expect(computeCanonicalTextSha256(Buffer.from(crlfSource, 'utf8'))).toBe(
      computeCanonicalTextSha256(Buffer.from(lfSource, 'utf8')),
    );
  });

  it('keeps every runtime evidence source in the Next serverless trace', () => {
    const nextConfig = readFileSync(join(process.cwd(), 'next.config.ts'), 'utf8');
    for (const source of [
      './config/agent-knowledge/manifest.v1.json',
      './shared/programSyllabi.ts',
      './lib/content/programCurriculumManifest.ts',
      './docs/coursera/approved-curriculum-api-validation-2026-08-30.md',
    ]) {
      expect(nextConfig).toContain(`'${source}'`);
    }
    expect(nextConfig).toContain("'/api/agent-tools/v1/*'");
  });
  it('loads only after independently hashing every local provenance source', async () => {
    const manifest = await loadAgentKnowledgeManifest({ asOf: VERIFIED_AT });

    expect(manifest.entries).toHaveLength(3);
    expect(Object.isFrozen(manifest)).toBe(true);
    expect(Object.isFrozen(manifest.entries[0]?.content)).toBe(true);
  });

  it('keeps approved curriculum separate from blocked Coursera operations', async () => {
    const manifest = await loadAgentKnowledgeManifest({ asOf: VERIFIED_AT });
    const ux = resolveTrustedProgramKnowledge(
      manifest,
      'ux-design-professional-certificate-google',
    );

    expect(ux?.approval.title).toBe(
      'User Experience & Interface Design Professional Certificate',
    );
    expect(ux?.approval.courses).toHaveLength(8);
    expect(ux?.coursera).toMatchObject({
      availabilityState: 'blocked',
      launchable: false,
      approvedProviderCourseCount: 7,
      exactApiMatchCount: 6,
      missingProviderCourseCount: 1,
      assignmentMode: 'disabled',
      collectionId: null,
    });
    expect(
      ux?.coursera.providerCourses.find(
        (course) => course.courseraSlug === 'responsive-web-design-adobe-xd',
      )?.availableInCatalogSnapshot,
    ).toBe(false);
  });

  it('fails closed when an approved program has no governed operational mapping', async () => {
    const manifest = await loadAgentKnowledgeManifest({ asOf: VERIFIED_AT });
    const itSupport = resolveTrustedProgramKnowledge(
      manifest,
      'it-support-professional-certificate-ibm',
    );

    expect(itSupport?.approval.state).toBe('approved');
    expect(itSupport?.coursera).toMatchObject({
      availabilityState: 'not_governed',
      launchable: false,
      approvedProviderCourseCount: null,
      snapshotAsOf: null,
    });
  });

  it('rejects a stale operational snapshot', async () => {
    await expect(
      loadAgentKnowledgeManifest({
        asOf: new Date('2026-09-07T04:00:00Z'),
      }),
    ).rejects.toThrow(/stale after 2026-09-06/);
  });

  it('rejects validation without independent source proofs', async () => {
    const manifest = await readManifest();
    const issues = rejectionIssues(() =>
      validateAgentKnowledgeManifest(manifest, { asOf: VERIFIED_AT }),
    );

    expect(issues.filter((issue) => issue.includes('missing an independently computed source proof')))
      .toHaveLength(3);
  });

  it('rejects content tampering even when the JSON remains structurally valid', async () => {
    const manifest = structuredClone(await readManifest());
    const snapshot = manifest.entries.find(
      (entry) => entry.content.kind === 'coursera_operational_snapshot',
    );
    if (!snapshot || snapshot.content.kind !== 'coursera_operational_snapshot') {
      throw new Error('Missing operational fixture');
    }
    snapshot.content.exactApiMatchCount = 16;

    const issues = rejectionIssues(() =>
      validateAgentKnowledgeManifest(manifest, {
        asOf: VERIFIED_AT,
        sourceShaByPath: declaredSourceProofs(manifest),
      }),
    );

    expect(issues.some((issue) => issue.includes('contentHash mismatch'))).toBe(true);
  });

  it('rejects PII-shaped content even if its content hash is recomputed', async () => {
    const manifest = structuredClone(await readManifest());
    const catalog = manifest.entries.find(
      (entry) => entry.content.kind === 'approved_program_catalog',
    );
    if (!catalog || catalog.content.kind !== 'approved_program_catalog') {
      throw new Error('Missing approved catalog fixture');
    }
    catalog.content.programs[0]!.title = 'member@example.com';
    catalog.contentHash = computeKnowledgeContentHash(catalog.content);

    const issues = rejectionIssues(() =>
      validateAgentKnowledgeManifest(manifest, {
        asOf: VERIFIED_AT,
        sourceShaByPath: declaredSourceProofs(manifest),
      }),
    );

    expect(issues.some((issue) => issue.includes('contains an email address'))).toBe(true);
  });

  it('cannot relabel incomplete provider coverage as operational', async () => {
    const manifest = structuredClone(await readManifest());
    const snapshot = manifest.entries.find(
      (entry) => entry.content.kind === 'coursera_operational_snapshot',
    );
    if (!snapshot || snapshot.content.kind !== 'coursera_operational_snapshot') {
      throw new Error('Missing operational fixture');
    }
    snapshot.content.activationState = 'enabled';
    snapshot.contentHash = computeKnowledgeContentHash(snapshot.content);

    const issues = rejectionIssues(() =>
      validateAgentKnowledgeManifest(manifest, {
        asOf: VERIFIED_AT,
        sourceShaByPath: declaredSourceProofs(manifest),
      }),
    );

    expect(
      issues.some((issue) => issue.includes('must remain blocked while provider bindings are missing')),
    ).toBe(true);
  });
});
