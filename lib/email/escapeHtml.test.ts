import test from 'node:test';
import assert from 'node:assert/strict';
import { escapeHtml, sanitizeEmailSubjectLine } from './escapeHtml';

test('escapeHtml neutralizes HTML and quotes', () => {
  assert.equal(escapeHtml('<script>'), '&lt;script&gt;');
  assert.equal(escapeHtml('a & b'), 'a &amp; b');
  assert.equal(escapeHtml(`"'`), '&quot;&#39;');
  assert.equal(escapeHtml(''), '');
});

test('sanitizeEmailSubjectLine removes CRLF header injection', () => {
  assert.equal(
    sanitizeEmailSubjectLine('Hello\r\nBcc: evil@x.test'),
    'Hello Bcc: evil@x.test'
  );
  assert.equal(sanitizeEmailSubjectLine('  ok  '), 'ok');
});
