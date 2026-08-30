import assert from 'node:assert/strict';
import test from 'node:test';
import { isUnauthenticatedBrowserNavigationApiPath } from './tenantApiNavigation';

test('Coursera launch GET delegates signed-out browser recovery to the route handler', () => {
  assert.equal(
    isUnauthenticatedBrowserNavigationApiPath('GET', '/api/member/coursera/launch'),
    true,
  );
});

test('tenant API mutations and unrelated reads keep the JSON 401 backstop', () => {
  assert.equal(
    isUnauthenticatedBrowserNavigationApiPath('POST', '/api/member/coursera/launch'),
    false,
  );
  assert.equal(
    isUnauthenticatedBrowserNavigationApiPath('GET', '/api/member/profile'),
    false,
  );
  assert.equal(
    isUnauthenticatedBrowserNavigationApiPath('GET', '/api/admin/coursera/mappings'),
    false,
  );
});
