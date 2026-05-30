import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

test('member export audit failures are not swallowed before CSV response', () => {
  const source = readFileSync(join(process.cwd(), 'app/api/admin/members/export/route.ts'), 'utf8');
  const auditCall = source.indexOf('await auditLog({');
  const csvResponse = source.indexOf('return csvDownloadResponse', auditCall);
  const auditBlock = source.slice(auditCall, csvResponse);

  assert.notEqual(auditCall, -1);
  assert.notEqual(csvResponse, -1);
  assert.equal(auditBlock.includes('.catch('), false);
});
