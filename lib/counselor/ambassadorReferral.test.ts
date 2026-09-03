import test from 'node:test';
import assert from 'node:assert/strict';
import { matchAmbassador, normalizePersonName, pickAmbassadorReferralText } from './ambassadorReferral';

const candidates = [
  { counselorId: 'c1', userId: 'u1', fullName: 'Maria García', email: 'maria@example.org' },
  { counselorId: 'c2', userId: 'u2', fullName: 'James Lee', email: 'james@example.org' },
  { counselorId: 'c3', userId: 'u3', fullName: 'James Lee', email: 'james.lee2@example.org' },
];

test('picks the explicit referral field first, then the ambassador write-in', () => {
  assert.equal(
    pickAmbassadorReferralText({ partnerAmbassadorReferral: ' Maria Garcia ', hearAbout: 'Friend or family' }),
    'Maria Garcia',
  );
  assert.equal(
    pickAmbassadorReferralText({ hearAbout: 'Community Ambassador (write in)', hearAboutOther: 'James Lee' }),
    'James Lee',
  );
  assert.equal(
    pickAmbassadorReferralText({ hearAbout: 'Partner or community ambassador', hearAboutOther: 'James Lee' }),
    'James Lee',
  );
  assert.equal(pickAmbassadorReferralText({ hearAbout: 'Friend or family', hearAboutOther: 'James Lee' }), null);
  assert.equal(pickAmbassadorReferralText({ hearAbout: 'Community Ambassador (write in)' }), null);
});

test('normalizes accents, case, punctuation and whitespace', () => {
  assert.equal(normalizePersonName('  Maria   GARCÍA. '), 'maria garcia');
  assert.equal(normalizePersonName(null), '');
});

test('matches a unique ambassador by name, accent- and case-insensitively', () => {
  const m = matchAmbassador('maria garcia', candidates);
  assert.equal(m.ok, true);
  if (m.ok) {
    assert.equal(m.candidate.counselorId, 'c1');
    assert.equal(m.matchedOn, 'name');
  }
});

test('an email in the text resolves duplicates by name', () => {
  const m = matchAmbassador('James Lee <james.lee2@example.org>', candidates);
  assert.equal(m.ok, true);
  if (m.ok) {
    assert.equal(m.candidate.counselorId, 'c3');
    assert.equal(m.matchedOn, 'email');
  }
});

test('never guesses: ambiguous and unknown names are left for staff', () => {
  assert.deepEqual(matchAmbassador('James Lee', candidates), { ok: false, reason: 'ambiguous', text: 'james lee' });
  assert.deepEqual(matchAmbassador('Nobody Here', candidates), { ok: false, reason: 'no_match', text: 'nobody here' });
  assert.deepEqual(matchAmbassador('   ', candidates), { ok: false, reason: 'no_referral_text' });
});
