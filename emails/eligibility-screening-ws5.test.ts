/**
 * WS5 email payload field coverage — confirmation + admin alert templates.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { applicationConfirmationHtml } from './application-confirmation';
import { newApplicationAlertHtml } from './new-application-alert';
import { eligibilityScreeningSummaryHtml } from './eligibility-screening-summary';
import { eligibilityScreeningConfirmationHtml } from './eligibility-screening-confirmation';
import { eligibilityScreeningAdminAlertHtml } from './eligibility-screening-admin-alert';

const SAMPLE = {
  q1: 'yes',
  q2: 'yes',
  q3: 'no',
  qualifies: true,
  yesCount: 2,
  receivingUnemployment: 'yes',
  exhaustedUnemployment: 'no',
  layoffCompany: 'Acme Logistics',
  snapWic: 'yes',
  hearAbout: 'Partner or community ambassador',
  hearAboutOther: null,
  partnerAmbassadorReferral: 'Ambassador Jane / code-abc',
};

describe('eligibilityScreeningSummaryHtml', () => {
  it('includes WS4 unemployment / SNAP / hear-about / ambassador fields', () => {
    const html = eligibilityScreeningSummaryHtml(SAMPLE);
    assert.match(html, /Receiving unemployment/);
    assert.match(html, /yes/);
    assert.match(html, /Exhausted unemployment/);
    assert.match(html, /Acme Logistics/);
    assert.match(html, /SNAP\/WIC/);
    assert.match(html, /Partner or community ambassador/);
    assert.match(html, /Ambassador Jane \/ code-abc/);
  });

  it('returns empty string when no fields present', () => {
    assert.equal(eligibilityScreeningSummaryHtml({}), '');
    assert.equal(eligibilityScreeningSummaryHtml(null), '');
  });

  it('escapes HTML in free-text fields', () => {
    const html = eligibilityScreeningSummaryHtml({
      layoffCompany: '<script>alert(1)</script>',
      partnerAmbassadorReferral: '<img src=x onerror=alert(1)>',
    });
    assert.ok(!html.includes('<script>'));
    assert.ok(html.includes('&lt;script&gt;'));
    assert.ok(!html.includes('<img'));
  });
});

describe('applicationConfirmationHtml WS5 eligibility payload', () => {
  it('embeds eligibility fields when provided', () => {
    const html = applicationConfirmationHtml({ firstName: 'Alex', eligibility: SAMPLE });
    assert.match(html, /Eligibility answers we received/);
    assert.match(html, /Receiving unemployment/);
    assert.match(html, /Acme Logistics/);
    assert.match(html, /SNAP\/WIC/);
    assert.match(html, /Ambassador Jane/);
    assert.match(html, /automatic receipt/);
    assert.match(html, /1(?:&ndash;|–|-)\s*2 business days/);
    assert.ok(!html.includes('3 to 5 business days'));
  });

  it('omits eligibility block when fields absent', () => {
    const html = applicationConfirmationHtml({ firstName: 'Alex' });
    assert.ok(!html.includes('Eligibility answers we received'));
  });
});

describe('newApplicationAlertHtml WS5 eligibility payload', () => {
  it('embeds structured eligibility fields for Mike/admin', () => {
    const html = newApplicationAlertHtml({
      applicantName: 'Alex Rivera',
      applicantEmail: 'alex@example.com',
      programInterest: 'IT Support',
      applicationId: 'app-1',
      eligibility: SAMPLE,
    });
    assert.match(html, /Receiving unemployment/);
    assert.match(html, /SNAP\/WIC/);
    assert.match(html, /Heard about us/);
    assert.match(html, /Partner \/ ambassador referral/);
  });
});

describe('eligibilityScreeningConfirmationHtml', () => {
  it('includes copy of submitted WS4 answers', () => {
    const html = eligibilityScreeningConfirmationHtml({
      firstName: 'Sam',
      eligibility: SAMPLE,
    });
    assert.match(html, /Here is a copy of what you submitted/);
    assert.match(html, /Acme Logistics/);
  });
});

describe('eligibilityScreeningAdminAlertHtml', () => {
  it('labels dashboard vs token source', () => {
    const dash = eligibilityScreeningAdminAlertHtml({
      memberName: 'Sam',
      memberEmail: 'sam@example.com',
      memberId: 'u1',
      source: 'dashboard',
      eligibility: SAMPLE,
    });
    assert.match(dash, /member portal/);
    const tok = eligibilityScreeningAdminAlertHtml({
      memberName: 'Sam',
      memberEmail: 'sam@example.com',
      source: 'token',
      eligibility: SAMPLE,
    });
    assert.match(tok, /tokenized questionnaire/);
  });
});
