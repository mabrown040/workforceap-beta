import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildFundingNotes,
  buildSponsorshipMessage,
  isSeatCapReached,
  isSponsorshipActive,
  resolveSponsorshipFundingSource,
  type SponsorshipPartner,
} from '@/lib/partners/sponsorship';

const START = new Date('2026-08-01T00:00:00Z');
const END = new Date('2026-12-31T23:59:59Z');

function partner(overrides: Partial<SponsorshipPartner> = {}): SponsorshipPartner {
  return {
    id: 'partner-1',
    name: 'Concordia High School',
    sponsoredEnrollment: true,
    sponsorshipFundingSource: null,
    sponsorshipTermLabel: null,
    sponsorshipStartsAt: null,
    sponsorshipEndsAt: null,
    sponsorshipSeatCap: null,
    ...overrides,
  };
}

test('isSponsorshipActive: false when the partner does not sponsor enrollment', () => {
  assert.equal(isSponsorshipActive(partner({ sponsoredEnrollment: false }), START), false);
  // Even inside a configured window.
  assert.equal(
    isSponsorshipActive(
      partner({ sponsoredEnrollment: false, sponsorshipStartsAt: START, sponsorshipEndsAt: END }),
      new Date('2026-09-01T00:00:00Z')
    ),
    false
  );
});

test('isSponsorshipActive: null bounds mean an open-ended sponsorship', () => {
  const p = partner();
  assert.equal(isSponsorshipActive(p, new Date('2020-01-01T00:00:00Z')), true);
  assert.equal(isSponsorshipActive(p, new Date('2099-01-01T00:00:00Z')), true);
});

test('isSponsorshipActive: window boundaries are inclusive', () => {
  const p = partner({ sponsorshipStartsAt: START, sponsorshipEndsAt: END });
  // Before the start.
  assert.equal(isSponsorshipActive(p, new Date(START.getTime() - 1)), false);
  // Exactly at the start.
  assert.equal(isSponsorshipActive(p, START), true);
  // Mid-window.
  assert.equal(isSponsorshipActive(p, new Date('2026-10-15T12:00:00Z')), true);
  // Exactly at the end.
  assert.equal(isSponsorshipActive(p, END), true);
  // After the end.
  assert.equal(isSponsorshipActive(p, new Date(END.getTime() + 1)), false);
});

test('isSponsorshipActive: open start bound only enforces the end', () => {
  const p = partner({ sponsorshipEndsAt: END });
  assert.equal(isSponsorshipActive(p, new Date('2000-01-01T00:00:00Z')), true);
  assert.equal(isSponsorshipActive(p, new Date(END.getTime() + 1)), false);
});

test('isSponsorshipActive: open end bound only enforces the start', () => {
  const p = partner({ sponsorshipStartsAt: START });
  assert.equal(isSponsorshipActive(p, new Date(START.getTime() - 1)), false);
  assert.equal(isSponsorshipActive(p, new Date('2099-01-01T00:00:00Z')), true);
});

test('isSeatCapReached: a null cap is never reached', () => {
  const p = partner({ sponsorshipSeatCap: null });
  assert.equal(isSeatCapReached(p, 0), false);
  assert.equal(isSeatCapReached(p, 10_000), false);
});

test('isSeatCapReached: under, exactly at, and over the cap', () => {
  const p = partner({ sponsorshipSeatCap: 25 });
  assert.equal(isSeatCapReached(p, 0), false);
  assert.equal(isSeatCapReached(p, 24), false);
  // At the cap every funded seat is spoken for — the next student is unfunded.
  assert.equal(isSeatCapReached(p, 25), true);
  assert.equal(isSeatCapReached(p, 26), true);
});

test('isSeatCapReached: a zero cap is reached immediately', () => {
  assert.equal(isSeatCapReached(partner({ sponsorshipSeatCap: 0 }), 0), true);
});

test('buildFundingNotes: includes the term label when present', () => {
  assert.equal(
    buildFundingNotes(partner({ sponsorshipTermLabel: 'Fall 2026' })),
    'Sponsored by Concordia High School (Fall 2026)'
  );
});

test('buildFundingNotes: omits the parenthetical without a term label', () => {
  assert.equal(buildFundingNotes(partner()), 'Sponsored by Concordia High School');
  assert.equal(
    buildFundingNotes(partner({ sponsorshipTermLabel: '   ' })),
    'Sponsored by Concordia High School'
  );
});

test('resolveSponsorshipFundingSource: defaults to PARTNER_ORG', () => {
  assert.equal(resolveSponsorshipFundingSource(partner()), 'PARTNER_ORG');
  assert.equal(
    resolveSponsorshipFundingSource(partner({ sponsorshipFundingSource: null })),
    'PARTNER_ORG'
  );
});

test('resolveSponsorshipFundingSource: honors an explicit funding source', () => {
  assert.equal(
    resolveSponsorshipFundingSource(partner({ sponsorshipFundingSource: 'GRANT' })),
    'GRANT'
  );
  assert.equal(
    resolveSponsorshipFundingSource(partner({ sponsorshipFundingSource: 'EMPLOYER' })),
    'EMPLOYER'
  );
});

test('buildSponsorshipMessage: names the school and the partnership', () => {
  assert.equal(
    buildSponsorshipMessage(partner()),
    'There is no cost to Concordia High School students — enrollment is sponsored ' +
      'through our partnership with Concordia High School.'
  );
});

test('buildSponsorshipMessage: scopes the copy to the term when one is set', () => {
  assert.equal(
    buildSponsorshipMessage(partner({ sponsorshipTermLabel: 'Fall 2026' })),
    'There is no cost to Concordia High School students for Fall 2026 — enrollment is ' +
      'sponsored through our partnership with Concordia High School.'
  );
});

test('buildSponsorshipMessage: never uses the barred no-cost adjective', () => {
  // Guardrail, not a style nit: a sponsored seat was paid for by somebody, so
  // the shorthand adjective barred by the regex below both misrepresents the
  // partnership and reads as a catch to prospective students. This message is
  // the single choke point for public cost copy.
  const variants: SponsorshipPartner[] = [
    partner(),
    partner({ sponsorshipTermLabel: 'Fall 2026' }),
    partner({ name: 'Austin ISD', sponsorshipTermLabel: 'Spring 2027' }),
  ];
  for (const p of variants) {
    assert.doesNotMatch(buildSponsorshipMessage(p), /\bfree\b/i);
  }
});
