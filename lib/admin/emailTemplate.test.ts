import test from 'node:test';
import assert from 'node:assert/strict';
import { renderTemplate, getDefaultSampleData, EMAIL_TEMPLATE_VARIABLES } from './emailTemplate';

test('renderTemplate replaces variables in subject and body', () => {
  const result = renderTemplate(
    { subject: 'Hello {firstName}', body: '<p>Hi {firstName}, welcome to {programName}</p>' },
    { firstName: 'Maria', programName: 'Customer Service Specialist' }
  );
  assert.equal(result.subject, 'Hello Maria');
  assert.ok(result.html.includes('Hi Maria'));
  assert.ok(result.html.includes('Customer Service Specialist'));
});

test('renderTemplate leaves unknown variables intact', () => {
  const result = renderTemplate(
    { subject: 'Hello {firstName}', body: '<p>{unknown}</p>' },
    { firstName: 'Maria' }
  );
  assert.equal(result.subject, 'Hello Maria');
  assert.ok(result.html.includes('{unknown}'));
});

test('getDefaultSampleData returns examples for known variables', () => {
  const sample = getDefaultSampleData(['firstName', 'programName']);
  assert.equal(sample.firstName, 'Maria');
  assert.equal(sample.programName, 'Customer Service Specialist');
});

test('getDefaultSampleData falls back to placeholder for unknown variables', () => {
  const sample = getDefaultSampleData(['customVar']);
  assert.equal(sample.customVar, '{customVar}');
});

test('EMAIL_TEMPLATE_VARIABLES has entries for core templates', () => {
  assert.ok(Object.keys(EMAIL_TEMPLATE_VARIABLES).length > 0);
  assert.ok(EMAIL_TEMPLATE_VARIABLES['welcome-member']);
  assert.ok(EMAIL_TEMPLATE_VARIABLES['application-confirmation']);
});
