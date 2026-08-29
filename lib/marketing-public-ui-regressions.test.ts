import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const source = (relativePath: string) => readFileSync(join(process.cwd(), relativePath), 'utf8');

test('program search hidden cards override the flex card layout', () => {
  const programs = source('marketing/src/pages/programs.astro');
  const cardRule = programs.indexOf('.pcard{');
  const hiddenRule = programs.indexOf('.pcard[hidden]');

  assert.ok(cardRule >= 0, 'program card layout rule is missing');
  assert.ok(hiddenRule > cardRule, 'hidden-card override must follow the flex card rule');
  assert.match(programs, /\.pcard\[hidden\]\s*\{\s*display\s*:\s*none\s*\}/);
});

test('both pathfinders link to the real comparison page without unsupported selection copy', () => {
  const marketingPathfinder = source('marketing/src/components/FindYourPathQuiz.tsx');
  const appPathfinder = source('app/(decision-journey)/find-your-path/FindYourPathClient.tsx');

  assert.match(marketingPathfinder, /<a href="\/program-comparison">Compare programs<\/a>/);
  assert.match(
    appPathfinder,
    /<LocalizedLink href="\/program-comparison">Compare programs<\/LocalizedLink>/,
  );
  assert.doesNotMatch(marketingPathfinder, /check up to four tracks/i);
  assert.doesNotMatch(appPathfinder, /check up to four tracks/i);
});

test('closed mobile navigation backdrop is hidden from assistive technology', () => {
  const mainNav = source('components/MainNav.tsx');
  const backdropStart = mainNav.indexOf('className={`mobile-nav-backdrop');
  const backdrop = mainNav.slice(backdropStart, backdropStart + 600);

  assert.ok(backdropStart >= 0, 'mobile navigation backdrop is missing');
  assert.match(backdrop, /aria-hidden=\{!mobileOpen\}/);
  assert.match(backdrop, /tabIndex=\{mobileOpen \? 0 : -1\}/);
});

test('localized signup opens root legal documents without Next prefetch requests', () => {
  const signup = source('app/(auth)/signup/SignupForm.tsx');
  const consentBlock = signup.slice(signup.indexOf('{/* Consent checkboxes */}'), signup.indexOf('{/* Error banner */}'));

  assert.match(consentBlock, /<a href="\/terms" target="_blank" rel="noopener noreferrer"/);
  assert.match(consentBlock, /<a href="\/privacy" target="_blank" rel="noopener noreferrer"/);
  assert.doesNotMatch(consentBlock, /<LocalizedLink href="\/(?:terms|privacy)"/);
});
