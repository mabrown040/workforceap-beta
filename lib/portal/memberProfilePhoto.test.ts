import test from 'node:test';
import assert from 'node:assert/strict';

import {
  isProfilePhotoStoragePath,
  profilePhotoStoragePath,
  resolveProfilePhotoContentType,
} from './memberProfilePhoto';

test('profilePhotoStoragePath is stable per user', () => {
  assert.equal(profilePhotoStoragePath('user-1'), 'profile-photos/user-1/photo.webp');
});

test('isProfilePhotoStoragePath rejects traversal and foreign prefixes', () => {
  assert.equal(isProfilePhotoStoragePath('user-1', 'profile-photos/user-1/photo.webp'), true);
  assert.equal(isProfilePhotoStoragePath('user-1', 'profile-photos/user-2/photo.webp'), false);
  assert.equal(isProfilePhotoStoragePath('../etc', 'profile-photos/../etc/photo.webp'), false);
});

test('resolveProfilePhotoContentType accepts common image extensions', () => {
  assert.equal(resolveProfilePhotoContentType('headshot.jpg'), 'image/jpeg');
  assert.equal(resolveProfilePhotoContentType('headshot.PNG'), 'image/png');
  assert.equal(resolveProfilePhotoContentType('headshot.webp'), 'image/webp');
  assert.equal(resolveProfilePhotoContentType('resume.pdf'), null);
});
