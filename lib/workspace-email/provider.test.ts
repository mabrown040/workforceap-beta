import test from 'node:test';
import assert from 'node:assert/strict';
import { getWorkspaceEmailProvider } from './provider';

test('getWorkspaceEmailProvider defaults to noop when WORKSPACE_EMAIL_PROVIDER is absent', () => {
  const previousProvider = process.env.WORKSPACE_EMAIL_PROVIDER;
  delete process.env.WORKSPACE_EMAIL_PROVIDER;

  try {
    assert.equal(getWorkspaceEmailProvider().id, 'noop');
  } finally {
    if (previousProvider === undefined) {
      delete process.env.WORKSPACE_EMAIL_PROVIDER;
    } else {
      process.env.WORKSPACE_EMAIL_PROVIDER = previousProvider;
    }
  }
});

test('getWorkspaceEmailProvider rejects invalid WORKSPACE_EMAIL_PROVIDER values', () => {
  const previousProvider = process.env.WORKSPACE_EMAIL_PROVIDER;
  process.env.WORKSPACE_EMAIL_PROVIDER = 'googl';

  try {
    assert.throws(
      () => getWorkspaceEmailProvider(),
      /Invalid WORKSPACE_EMAIL_PROVIDER: googl\. Expected google, microsoft, or noop\./,
    );
  } finally {
    if (previousProvider === undefined) {
      delete process.env.WORKSPACE_EMAIL_PROVIDER;
    } else {
      process.env.WORKSPACE_EMAIL_PROVIDER = previousProvider;
    }
  }
});
