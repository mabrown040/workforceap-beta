import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(rel: string) {
  return readFileSync(join(root, rel), 'utf8');
}

describe('counselor member detail PageHeader contract', () => {
  it('mounts one PageHeader outside mobile/desktop splits (jobs pattern)', () => {
    const source = read('app/(portal)/counselor/students/[memberId]/page.tsx');
    expect(source.match(/<PageHeader[\s>]/g)?.length ?? 0).toBe(1);
    expect(source).toContain('PortalPageFrame');
    expect(source).not.toMatch(/<h1[\s>]/);
    expect(source).toContain('startSession');
    expect(source).toContain('priorityQueueActionMessage');

    // Bodies stay split; header must not live inside either wrapper.
    const mobileIdx = source.indexOf('wa-block md:wa-hidden');
    const desktopIdx = source.indexOf('wa-hidden md:wa-block');
    const headerIdx = source.indexOf('<PageHeader');
    expect(headerIdx).toBeGreaterThan(-1);
    expect(mobileIdx).toBeGreaterThan(-1);
    expect(desktopIdx).toBeGreaterThan(-1);
    expect(headerIdx).toBeLessThan(mobileIdx);
    expect(headerIdx).toBeLessThan(desktopIdx);
  });
});
