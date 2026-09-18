import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(rel: string) {
  return readFileSync(join(root, rel), 'utf8');
}

const PAGE_HEADER_ROUTES = [
  'app/(portal)/partner/attention/page.tsx',
  'app/(portal)/partner/referred-members/page.tsx',
  'app/(portal)/partner/milestones/page.tsx',
  'app/(portal)/partner/messages/page.tsx',
  'app/(portal)/partner/exports/page.tsx',
  'app/(portal)/partner/resources/page.tsx',
  'app/(portal)/partner/settings/page.tsx',
] as const;

describe('partner portal PageHeader / KitEmptyState contract', () => {
  it.each(PAGE_HEADER_ROUTES)('%s mounts one shared PageHeader (jobs pattern)', (rel) => {
    const source = read(rel);
    expect(source.match(/<PageHeader[\s>]/g)?.length ?? 0).toBe(1);
    expect(source).toContain('PortalPageFrame');
    // Page chrome must not use SectionHeader as the route h1 substitute.
    expect(source).not.toMatch(/<SectionHeader[\s\n]/);
  });

  it('milestones keeps PageHeader outside mobile/desktop body splits', () => {
    const source = read('app/(portal)/partner/milestones/page.tsx');
    const headerIdx = source.indexOf('<PageHeader');
    const mobileIdx = source.indexOf('wa-block md:wa-hidden');
    const desktopIdx = source.indexOf('wa-hidden md:wa-block');
    expect(headerIdx).toBeGreaterThan(-1);
    expect(headerIdx).toBeLessThan(mobileIdx);
    expect(headerIdx).toBeLessThan(desktopIdx);
  });

  it('referred-members keeps PageHeader outside mobile/desktop body splits', () => {
    const source = read('app/(portal)/partner/referred-members/page.tsx');
    const headerIdx = source.indexOf('<PageHeader');
    const mobileIdx = source.indexOf('wa-block md:wa-hidden');
    const desktopIdx = source.indexOf('wa-hidden md:wa-block');
    expect(headerIdx).toBeGreaterThan(-1);
    expect(headerIdx).toBeLessThan(mobileIdx);
    expect(headerIdx).toBeLessThan(desktopIdx);
  });

  it('messages empty branch uses KitEmptyState', () => {
    const source = read('app/(portal)/partner/messages/page.tsx');
    expect(source).toContain('KitEmptyState');
    expect(source).toContain('noMessagesYetTitle');
  });

  it('outcomes uses PageHeader for page chrome and SectionHeader only for pending reviews', () => {
    const source = read('app/(portal)/partner/outcomes/page.tsx');
    expect(source.match(/<PageHeader[\s>]/g)?.length ?? 0).toBe(1);
    expect(source).toContain('PortalPageFrame');
    expect(source.match(/<SectionHeader[\s\n]/g)?.length ?? 0).toBe(1);
    expect(source).toContain('pendingPlacementReviews');
  });
});
