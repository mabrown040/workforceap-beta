import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

function read(path: string): string {
  return readFileSync(path, 'utf8');
}

test('placement-survey admin readers and counters exclude pre-acceptance rows', () => {
  const page = read('app/admin/placement-surveys/page.tsx');
  assert.match(page, /findMany\(\{[\s\S]*?where: \{ sentAt: \{ not: null \}/);
  assert.match(page, /count\(\{ where: \{ sentAt: \{ not: null \}/);

  const api = read('app/api/admin/placement-surveys/route.ts');
  assert.match(api, /const where = \{[\s\S]*?sentAt: \{ not: null \}/);
  assert.match(api, /globalCompleted[\s\S]*?sentAt: \{ not: null \}/);

  const pipeline = read('app/api/admin/pipeline/surveys/route.ts');
  assert.match(pipeline, /totalSent[\s\S]*?sentAt: \{ not: null \}/);
  assert.match(pipeline, /totalCompleted[\s\S]*?sentAt: \{ not: null \}/);
});

test('member export represents pre-acceptance survey state as null instead of epoch sent truth', () => {
  const source = read('lib/member/exportData.ts');
  assert.match(source, /sentAt: ps\.sentAt\?\.toISOString\(\) \?\? null/);
  assert.doesNotMatch(source, /new Date\(0\)|1970-01-01/);
});

test('schema and migration use nullable sentAt with persisted delivery-attempt identity', () => {
  const schema = read('prisma/schema.prisma');
  assert.match(schema, /sentAt\s+DateTime\? @map\("sent_at"\)/);
  assert.match(schema, /tokenExpiresAt\s+DateTime @map\("token_expires_at"\)/);
  assert.match(schema, /deliveryAttempt\s+Int @default\(1\)/);
  assert.match(schema, /acceptedAttempt\s+Int @default\(0\)/);
  assert.match(schema, /deliveryPayload\s+Json\? @map\("delivery_payload"\)/);

  const migration = read('prisma/migrations/20260912130000_placement_survey_nullable_sent_at/migration.sql');
  assert.match(migration, /SET "sent_at" = NULL/);
  assert.ok(
    migration.indexOf('ALTER COLUMN "sent_at" DROP NOT NULL')
      < migration.indexOf('SET "sent_at" = NULL'),
    'sent_at must be nullable before epoch rows are backfilled to NULL',
  );
  assert.match(migration, /ADD COLUMN "delivery_attempt" INTEGER NOT NULL DEFAULT 1/);
  assert.match(migration, /ADD COLUMN "accepted_attempt" INTEGER NOT NULL DEFAULT 0/);
  assert.match(migration, /ADD COLUMN "delivery_payload" JSONB/);
});
