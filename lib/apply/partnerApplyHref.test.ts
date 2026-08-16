import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { partnerApplyHref, partnerProgramHref } from './partnerApplyHref';

describe('partnerApplyHref', () => {
  it('keeps the school ref on the hero apply URL', () => {
    assert.equal(partnerApplyHref('chs2026'), '/apply?ref=chs2026');
  });

  it('pins a program without dropping the school ref', () => {
    assert.equal(
      partnerApplyHref('chs2026', 'it-support-professional-certificate-ibm'),
      '/apply?ref=chs2026&program=it-support-professional-certificate-ibm',
    );
  });

  it('falls back to a plain program apply when the ref is missing', () => {
    assert.equal(partnerApplyHref(null, 'data-analytics-professional-certificate-google'), '/apply?program=data-analytics-professional-certificate-google');
    assert.equal(partnerApplyHref(''), '/apply');
  });
});

describe('partnerProgramHref', () => {
  it('forwards the school ref onto the program page so Apply can catch it', () => {
    assert.equal(
      partnerProgramHref('chs2026', 'cybersecurity-professional-certificate-google'),
      '/programs/cybersecurity-professional-certificate-google?ref=chs2026',
    );
  });

  it('omits ref when none is present', () => {
    assert.equal(partnerProgramHref(null, 'ux-design-professional-certificate-google'), '/programs/ux-design-professional-certificate-google');
  });
});
