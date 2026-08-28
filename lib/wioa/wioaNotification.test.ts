import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getWioaScreeningNotificationRecipients } from './wioaNotification';

const originalWioaRecipient = process.env.WIOA_SCREENING_NOTIFY_EMAIL;
const originalAdminRecipients = process.env.EMAIL_TO_ADMIN;

function restoreEnv(name: 'WIOA_SCREENING_NOTIFY_EMAIL' | 'EMAIL_TO_ADMIN', value: string | undefined) {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}

afterEach(() => {
  restoreEnv('WIOA_SCREENING_NOTIFY_EMAIL', originalWioaRecipient);
  restoreEnv('EMAIL_TO_ADMIN', originalAdminRecipients);
});

test('WIOA screenings fall back to the shared admin-alert distribution', () => {
  delete process.env.WIOA_SCREENING_NOTIFY_EMAIL;
  process.env.EMAIL_TO_ADMIN = 'Staff@One.Example, dad@workforceap.org';

  assert.deepEqual(getWioaScreeningNotificationRecipients(), [
    'staff@one.example',
    'dad@workforceap.org',
  ]);
});

test('an explicit WIOA screening recipient override takes precedence', () => {
  process.env.EMAIL_TO_ADMIN = 'staff@one.example';
  process.env.WIOA_SCREENING_NOTIFY_EMAIL =
    ' Wioa@One.Example, dad@workforceap.org, wioa@one.example ';

  assert.deepEqual(getWioaScreeningNotificationRecipients(), [
    'wioa@one.example',
    'dad@workforceap.org',
  ]);
});

test('the structured form is default and voice is disclosed as preparation-only', () => {
  const source = readFileSync(
    join(process.cwd(), 'components/portal/WioaQualificationClient.tsx'),
    'utf8'
  );

  assert.match(source, /useState<'voice' \| 'form'>\('form'\)/);
  assert.match(source, /Voice preparation only/);
  assert.match(source, /does not save or send your answers/);
});
