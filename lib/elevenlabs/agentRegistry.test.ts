import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import {
  ELEVENLABS_AGENT_KEYS,
  ELEVENLABS_AGENT_REGISTRY,
  LILLEY_STUDENT_COACH_AGENT_ID,
  RESUME_COACH_REVIEWED_AGENT_ID,
  type ElevenLabsAgentId,
  getElevenLabsAgentIdFromRegistry,
  isElevenLabsAgentId,
  resolveElevenLabsAgent,
} from './agentRegistry';

const root = process.cwd();

test('registry is exhaustive and environment override names are unique', () => {
  assert.deepEqual(Object.keys(ELEVENLABS_AGENT_REGISTRY), [...ELEVENLABS_AGENT_KEYS]);

  const environmentKeys = ELEVENLABS_AGENT_KEYS.map(
    (key) => ELEVENLABS_AGENT_REGISTRY[key].environmentKey,
  );
  assert.equal(new Set(environmentKeys).size, environmentKeys.length);
});

test('registry keeps member, staff, and public exposure boundaries explicit', () => {
  assert.deepEqual(ELEVENLABS_AGENT_REGISTRY.counselor.audiences, ['member']);
  assert.deepEqual(ELEVENLABS_AGENT_REGISTRY.counselor_staff.audiences, ['staff']);
  assert.equal(ELEVENLABS_AGENT_REGISTRY.counselor.exposure, 'private');
  assert.equal(ELEVENLABS_AGENT_REGISTRY.counselor_staff.exposure, 'private');

  assert.equal(ELEVENLABS_AGENT_REGISTRY.wioa_prequal.exposure, 'public');
  assert.deepEqual(ELEVENLABS_AGENT_REGISTRY.wioa_prequal.audiences, [
    'member',
    'anonymous',
  ]);

  for (const key of ELEVENLABS_AGENT_KEYS.filter((key) => key !== 'wioa_prequal')) {
    assert.equal(ELEVENLABS_AGENT_REGISTRY[key].exposure, 'private');
  }
});

test('only member Lilley roles receive the three read-only gateway tools', () => {
  assert.deepEqual(ELEVENLABS_AGENT_REGISTRY.counselor.allowedMemberTools, [
    'get_my_next_step',
    'get_training_status',
    'get_coursera_progress',
  ]);
  assert.deepEqual(
    ELEVENLABS_AGENT_REGISTRY.career_business.allowedMemberTools,
    ELEVENLABS_AGENT_REGISTRY.counselor.allowedMemberTools,
  );

  for (const key of ELEVENLABS_AGENT_KEYS.filter(
    (key) => key !== 'counselor' && key !== 'career_business',
  )) {
    assert.deepEqual(ELEVENLABS_AGENT_REGISTRY[key].allowedMemberTools, []);
  }
});

test('every reviewed runtime fallback is a valid, checked-in agent patch', () => {
  for (const key of ELEVENLABS_AGENT_KEYS) {
    const entry = ELEVENLABS_AGENT_REGISTRY[key];

    for (const patchAgentId of entry.checkedInPatchAgentIds) {
      assert.equal(isElevenLabsAgentId(patchAgentId), true, `${key} patch ID is malformed`);
      assert.ok(
        existsSync(join(root, `scripts/elevenlabs/patches/${patchAgentId}.patch.json`)),
        `${key} lists missing patch evidence ${patchAgentId}`,
      );
    }

    if (entry.resolution.mode === 'env-only') {
      assert.equal(entry.resolution.reviewedFallbackAgentId, null);
      assert.equal(entry.resolution.failClosed, true);
      continue;
    }

    const fallback = entry.resolution.reviewedFallbackAgentId;
    assert.equal(isElevenLabsAgentId(fallback), true, `${key} fallback is malformed`);
    assert.ok(
      (entry.checkedInPatchAgentIds as readonly ElevenLabsAgentId[]).includes(fallback),
      `${key} fallback is not listed as checked-in evidence`,
    );
    assert.ok(
      existsSync(join(root, `scripts/elevenlabs/patches/${fallback}.patch.json`)),
      `${key} fallback has no checked-in patch`,
    );

    if (entry.environmentOverridePolicy.kind === 'reviewed-agent-ids') {
      assert.ok(
        entry.environmentOverridePolicy.agentIds.includes(fallback),
        `${key} rejects its own reviewed fallback as an environment override`,
      );
    }
  }
});

test('staff counselor is env-only and fails closed when missing or invalid', () => {
  assert.deepEqual(resolveElevenLabsAgent('counselor_staff', {}), {
    ok: false,
    key: 'counselor_staff',
    environmentKey: 'ELEVENLABS_COUNSELOR_STAFF_AGENT_ID',
    reason: 'missing-required-environment',
  });

  assert.deepEqual(
    resolveElevenLabsAgent('counselor_staff', {
      ELEVENLABS_COUNSELOR_STAFF_AGENT_ID: 'not-an-agent-id',
    }),
    {
      ok: false,
      key: 'counselor_staff',
      environmentKey: 'ELEVENLABS_COUNSELOR_STAFF_AGENT_ID',
      reason: 'invalid-environment-agent-id',
    },
  );
  assert.equal(getElevenLabsAgentIdFromRegistry('counselor_staff', {}), undefined);

  const configuredStaffId = 'agent_1234567890abcdefghijklmnopqr';
  assert.equal(configuredStaffId.length, 34);
  assert.deepEqual(
    resolveElevenLabsAgent('counselor_staff', {
      ELEVENLABS_COUNSELOR_STAFF_AGENT_ID: configuredStaffId,
    }),
    {
      ok: true,
      key: 'counselor_staff',
      agentId: configuredStaffId,
      source: 'environment',
      environmentKey: 'ELEVENLABS_COUNSELOR_STAFF_AGENT_ID',
    },
  );
});

test('invalid ordinary overrides fall back while reviewed-only agents reject drift', () => {
  const interview = resolveElevenLabsAgent('interview', {
    ELEVENLABS_INTERVIEW_AGENT_ID: 'broken',
  });
  assert.deepEqual(interview, {
    ok: true,
    key: 'interview',
    agentId: 'agent_4601kqfjaz5rf09bya66s9gg1wvc',
    source: 'reviewed-fallback',
    environmentKey: 'ELEVENLABS_INTERVIEW_AGENT_ID',
    ignoredEnvironmentReason: 'invalid-environment-agent-id',
  });

  const unreviewedMemberId = 'agent_1234567890abcdefghijklmnopqr';
  assert.deepEqual(
    resolveElevenLabsAgent('counselor', {
      ELEVENLABS_COUNSELOR_AGENT_ID: unreviewedMemberId,
    }),
    {
      ok: true,
      key: 'counselor',
      agentId: LILLEY_STUDENT_COACH_AGENT_ID,
      source: 'reviewed-fallback',
      environmentKey: 'ELEVENLABS_COUNSELOR_AGENT_ID',
      ignoredEnvironmentReason: 'unreviewed-environment-agent-id',
    },
  );
  assert.equal(
    getElevenLabsAgentIdFromRegistry('resume_coach', {
      ELEVENLABS_RESUME_COACH_AGENT_ID: unreviewedMemberId,
    }),
    RESUME_COACH_REVIEWED_AGENT_ID,
  );
});

test('valid ordinary env overrides preserve current behavior', () => {
  const configuredInterviewId = 'agent_1234567890abcdefghijklmnopqr';
  assert.deepEqual(
    resolveElevenLabsAgent('interview', {
      ELEVENLABS_INTERVIEW_AGENT_ID: `  ${configuredInterviewId}  `,
    }),
    {
      ok: true,
      key: 'interview',
      agentId: configuredInterviewId,
      source: 'environment',
      environmentKey: 'ELEVENLABS_INTERVIEW_AGENT_ID',
    },
  );
});

test('nonprofit cutover preserves April evidence and explicitly reviews each active target', () => {
  const expectedMigrationIds = {
    interview: 'agent_4601kqfjaz5rf09bya66s9gg1wvc',
    counselor_staff: 'agent_1101kqfjfm8retm8j6md467wzxdb',
    employer: 'agent_6301kqfjfpexew9bnd64vs8nr7ak',
    readiness: 'agent_9201kqfjfrkyex086d2cb706xsb0',
    resume_coach: 'agent_9101kqfjg2z8ew5r3ad4fz6323yr',
    partner: 'agent_3701kqfjfxxjfm88pgh40h2ca4bs',
    wioa_prequal: 'agent_7801kqfjg0qwfy68btrqh6jg87kf',
    career_business: 'agent_5701kqfjg48rf30a8a0gehze8war',
  } as const;

  for (const [key, migrationId] of Object.entries(expectedMigrationIds)) {
    const entry = ELEVENLABS_AGENT_REGISTRY[key as keyof typeof expectedMigrationIds];
    assert.equal(entry.historicalMigration?.migratedAgentId, migrationId);
    if (entry.resolution.mode === 'env-with-reviewed-fallback' && key !== 'career_business') {
      assert.equal(entry.resolution.reviewedFallbackAgentId, migrationId);
    }
  }

  assert.equal(ELEVENLABS_AGENT_REGISTRY.counselor.historicalMigration, null);
  assert.equal(LILLEY_STUDENT_COACH_AGENT_ID, 'agent_1101kqfjfm8retm8j6md467wzxdb');
  assert.equal(ELEVENLABS_AGENT_REGISTRY.career_business.resolution.reviewedFallbackAgentId,
    LILLEY_STUDENT_COACH_AGENT_ID);
  assert.equal(ELEVENLABS_AGENT_REGISTRY.resume_coach.historicalMigration.sourceAgentId,
    'agent_6601kmznw90ffxkbk7mpbym73vh9');
});

test('repurposed nonprofit Lilley fails closed when configured as the staff counselor', () => {
  assert.deepEqual(resolveElevenLabsAgent('counselor_staff', {
    ELEVENLABS_COUNSELOR_STAFF_AGENT_ID: LILLEY_STUDENT_COACH_AGENT_ID,
  }), {
    ok: false, key: 'counselor_staff', environmentKey: 'ELEVENLABS_COUNSELOR_STAFF_AGENT_ID',
    reason: 'unreviewed-environment-agent-id',
  });
});

test('retired personal Lilley and resume overrides resolve to reviewed nonprofit agents', () => {
  for (const key of ['counselor', 'career_business'] as const) {
    const result = resolveElevenLabsAgent(key, {
      [ELEVENLABS_AGENT_REGISTRY[key].environmentKey]: 'agent_2001kv8wn1zhepm9x4tjfdzwm6v8',
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.agentId, LILLEY_STUDENT_COACH_AGENT_ID);
      assert.equal(result.ignoredEnvironmentReason, 'unreviewed-environment-agent-id');
    }
  }
  assert.equal(getElevenLabsAgentIdFromRegistry('resume_coach', {
    ELEVENLABS_RESUME_COACH_AGENT_ID: 'agent_6601kmznw90ffxkbk7mpbym73vh9',
  }), RESUME_COACH_REVIEWED_AGENT_ID);
});
