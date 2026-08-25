'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { isBenignMigrateResolveError } = require('./lib/prisma-resolve-benign.cjs');

describe('isBenignMigrateResolveError', () => {
  it('treats Prisma P3012 (not in a failed state) as benign', () => {
    const stderr = `Error: P3012

Migration \`20260614180000_s2_compliance_guc_nullif_xapi_org\` cannot be rolled back because it is not in a failed state.
`;
    assert.equal(isBenignMigrateResolveError('', stderr), true);
  });

  it('treats P3012 code alone as benign', () => {
    assert.equal(isBenignMigrateResolveError('Error: P3012', ''), true);
  });

  it('treats already-resolved / not-found messages as benign', () => {
    assert.equal(isBenignMigrateResolveError('Migration already resolved', ''), true);
    assert.equal(isBenignMigrateResolveError('', 'migration not found in the migrations table'), true);
    assert.equal(isBenignMigrateResolveError('', 'does not exist'), true);
  });

  it('does not treat unrelated prisma failures as benign', () => {
    assert.equal(
      isBenignMigrateResolveError('', 'Error: P1001\nCannot reach database server'),
      false,
    );
    assert.equal(isBenignMigrateResolveError('Error: P3009', 'migrate found failed migrations'), false);
  });
});
