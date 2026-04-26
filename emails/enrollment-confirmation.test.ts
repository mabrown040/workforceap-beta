/**
 * Tests for enrollment confirmation email template.
 * Verifies correct HTML output, escaping, and nonprofit language.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { enrollmentConfirmationHtml } from './enrollment-confirmation';

describe('enrollmentConfirmationHtml', () => {
  it('includes the member first name', () => {
    const html = enrollmentConfirmationHtml({
      firstName: 'Sarah',
      programName: 'Google Cybersecurity Certificate',
      counselorContact: 'counselor@workforceap.org',
    });
    assert.ok(html.includes('Sarah'), 'should include first name');
  });

  it('includes the program name', () => {
    const html = enrollmentConfirmationHtml({
      firstName: 'Sarah',
      programName: 'Google Cybersecurity Certificate',
      counselorContact: 'counselor@workforceap.org',
    });
    assert.ok(html.includes('Google Cybersecurity Certificate'), 'should include program name');
  });

  it('includes counselor contact', () => {
    const html = enrollmentConfirmationHtml({
      firstName: 'Sarah',
      programName: 'Google Cybersecurity Certificate',
      counselorContact: 'counselor@workforceap.org',
    });
    assert.ok(html.includes('counselor@workforceap.org'), 'should include counselor contact');
  });

  it('uses "accepted member" language — not "student"', () => {
    const html = enrollmentConfirmationHtml({
      firstName: 'Sarah',
      programName: 'Any Program',
      counselorContact: 'counselor@workforceap.org',
    });
    assert.ok(html.includes('accepted member'), 'should use accepted member language');
    assert.ok(!html.toLowerCase().includes('student'), 'should not use student language');
  });

  it('uses "no-cost training for members" language', () => {
    const html = enrollmentConfirmationHtml({
      firstName: 'Sarah',
      programName: 'Any Program',
      counselorContact: 'counselor@workforceap.org',
    });
    assert.ok(
      html.includes('no-cost training for members'),
      'should use correct nonprofit language'
    );
    assert.ok(
      !html.includes('qualifying participants'),
      'should not use qualifying participants language'
    );
  });

  it('escapes HTML in firstName to prevent XSS', () => {
    const html = enrollmentConfirmationHtml({
      firstName: '<script>alert(1)</script>',
      programName: 'Test Program',
      counselorContact: 'counselor@workforceap.org',
    });
    assert.ok(!html.includes('<script>'), 'should escape script tags in firstName');
    assert.ok(html.includes('&lt;script&gt;'), 'should HTML-encode the script tag');
  });

  it('escapes HTML in programName to prevent XSS', () => {
    const html = enrollmentConfirmationHtml({
      firstName: 'Sarah',
      programName: '<img onerror=alert(1) src=x>',
      counselorContact: 'counselor@workforceap.org',
    });
    assert.ok(!html.includes('<img'), 'should escape img tag in programName');
  });

  it('escapes HTML in counselorContact to prevent XSS', () => {
    const html = enrollmentConfirmationHtml({
      firstName: 'Sarah',
      programName: 'Test',
      counselorContact: '"><script>steal()</script>',
    });
    assert.ok(!html.includes('<script>'), 'should escape script in counselorContact');
  });

  it('returns non-empty string', () => {
    const html = enrollmentConfirmationHtml({
      firstName: 'Sarah',
      programName: 'Test Program',
      counselorContact: 'counselor@workforceap.org',
    });
    assert.ok(html.length > 100, 'should return substantial HTML content');
  });

  it('names the counselor when counselorName is provided', () => {
    const html = enrollmentConfirmationHtml({
      firstName: 'Sarah',
      programName: 'IT Support Professional Certificate',
      counselorContact: 'jane@workforceap.org',
      counselorName: 'Jane Rivera',
    });
    assert.ok(html.includes('Jane Rivera'), 'should name the counselor by name');
    assert.ok(
      html.includes('within 2 business days'),
      'should publish the 2-business-day reply SLA from /plan-design-review Decision 1',
    );
  });

  it('falls back gracefully when no counselor is assigned yet', () => {
    const html = enrollmentConfirmationHtml({
      firstName: 'Sarah',
      programName: 'IT Support Professional Certificate',
      counselorContact: 'info@workforceap.org',
    });
    assert.ok(
      html.includes('A counselor will reach out within 2 business days'),
      'should fall back to a warm "counselor will reach out" message',
    );
    assert.ok(!html.includes('undefined'), 'should not leak undefined');
  });

  it('escapes HTML in counselorName to prevent XSS', () => {
    const html = enrollmentConfirmationHtml({
      firstName: 'Sarah',
      programName: 'Test',
      counselorContact: 'counselor@workforceap.org',
      counselorName: '<script>steal()</script>',
    });
    assert.ok(!html.includes('<script>steal()</script>'), 'should escape script in counselorName');
  });
});
