import assert from 'node:assert/strict';
import test from 'node:test';
import { resumePlainTextPreviewHtml } from './resumePreviewHtml';

test('resume preview escapes uploaded text before returning iframe HTML', () => {
  const html = resumePlainTextPreviewHtml('<img src=x onerror=alert(1)> & "private"');
  assert.doesNotMatch(html, /<img/);
  assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.match(html, /&amp;/);
  assert.match(html, /&quot;private&quot;/);
});
