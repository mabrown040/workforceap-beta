import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { signupEmailRedirectTo } from './signupEmailRedirect';

describe('signupEmailRedirectTo', () => {
  it('omits the override on loopback so local signup can use hosted Auth', () => {
    assert.equal(signupEmailRedirectTo('http://localhost:3000'), undefined);
    assert.equal(signupEmailRedirectTo('http://127.0.0.1:3000'), undefined);
    assert.equal(signupEmailRedirectTo('http://[::1]:3000'), undefined);
  });

  it('keeps the public origin callback on hosted requests', () => {
    assert.equal(
      signupEmailRedirectTo('https://workforceap.org'),
      'https://workforceap.org/auth/callback',
    );
    assert.equal(
      signupEmailRedirectTo('https://workforceap-beta.vercel.app'),
      'https://workforceap-beta.vercel.app/auth/callback',
    );
  });

  it('returns undefined for an unparseable origin', () => {
    assert.equal(signupEmailRedirectTo('not a url'), undefined);
  });
});
