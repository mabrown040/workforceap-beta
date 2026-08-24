import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AbstractIntlMessages } from 'next-intl';
import {
  clientMessagesBytes,
  pickAdminClientMessages,
  pickApplyClientMessages,
  pickAuthClientMessages,
  pickLegacyFatRootClientMessages,
  pickPortalClientMessages,
  pickRootClientMessages,
} from './pickRootClientMessages';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const catalog = JSON.parse(
  readFileSync(join(root, 'messages/en.json'), 'utf8'),
) as AbstractIntlMessages;

function ns(messages: AbstractIntlMessages, key: string): Record<string, unknown> {
  const value = (messages as Record<string, unknown>)[key];
  assert.equal(typeof value, 'object');
  return value as Record<string, unknown>;
}

test('full catalog is the documented 184KB on-disk tax', () => {
  const fileBytes = readFileSync(join(root, 'messages/en.json')).byteLength;
  assert.ok(fileBytes > 180_000, `expected ~184KB file, got ${fileBytes}`);
});

test('legacy fat picker still ships admin + apply + dashboard to every client', () => {
  const fat = pickLegacyFatRootClientMessages(catalog);
  assert.ok(ns(fat, 'admin'));
  assert.ok(ns(fat, 'apply'));
  assert.ok(ns(fat, 'dashboard'));
  assert.ok(clientMessagesBytes(fat) > 100_000);
});

test('root picker keeps a marketing nav string and drops admin/portal/apply', () => {
  const rootMessages = pickRootClientMessages(catalog);
  assert.equal(ns(rootMessages, 'nav').programs, 'Programs');
  assert.equal(ns(ns(rootMessages, 'marketing'), 'testimonials').sectionTitle, 'Hear from our members');
  assert.equal((rootMessages as Record<string, unknown>).admin, undefined);
  assert.equal((rootMessages as Record<string, unknown>).dashboard, undefined);
  assert.equal((rootMessages as Record<string, unknown>).apply, undefined);
  assert.ok(clientMessagesBytes(rootMessages) < 20_000);
});

test('portal picker keeps a dashboard string and drops admin/apply/marketing', () => {
  const portal = pickPortalClientMessages(catalog);
  assert.equal(typeof ns(portal, 'dashboard').welcome, 'string');
  assert.ok(String(ns(portal, 'dashboard').welcome).length > 0);
  assert.equal((portal as Record<string, unknown>).admin, undefined);
  assert.equal((portal as Record<string, unknown>).apply, undefined);
  assert.equal((portal as Record<string, unknown>).marketing, undefined);
});

test('admin / apply / auth slices stay on their own catalogs', () => {
  const admin = pickAdminClientMessages(catalog);
  const apply = pickApplyClientMessages(catalog);
  const auth = pickAuthClientMessages(catalog);
  assert.ok(ns(admin, 'admin'));
  assert.equal((admin as Record<string, unknown>).dashboard, undefined);
  assert.ok(ns(apply, 'apply'));
  assert.equal((apply as Record<string, unknown>).admin, undefined);
  assert.ok(ns(auth, 'auth'));
  assert.equal((auth as Record<string, unknown>).apply, undefined);
});

test('root payload is a fraction of the full catalog and of the legacy union', () => {
  const fullBytes = clientMessagesBytes(catalog);
  const legacyBytes = clientMessagesBytes(pickLegacyFatRootClientMessages(catalog));
  const rootBytes = clientMessagesBytes(pickRootClientMessages(catalog));
  const portalBytes = clientMessagesBytes(pickPortalClientMessages(catalog));
  assert.ok(rootBytes < legacyBytes / 4, `root ${rootBytes} vs legacy ${legacyBytes}`);
  assert.ok(rootBytes < fullBytes / 8, `root ${rootBytes} vs full ${fullBytes}`);
  assert.ok(portalBytes < legacyBytes, `portal ${portalBytes} vs legacy ${legacyBytes}`);
});
