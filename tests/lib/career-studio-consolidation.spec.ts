import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '../..');
const source = (relativePath: string) => readFileSync(path.join(root, relativePath), 'utf8');

describe('Career Studio consolidation', () => {
  it('uses Voice Studio as the canonical AI tools experience', () => {
    const page = source('app/(portal)/dashboard/ai-tools/page.tsx');

    expect(page).toContain('VoiceStudioKit');
    expect(page).toContain("path: '/dashboard/ai-tools'");
    expect(page).toContain(": 'coaches';");
  });

  it('keeps the member toolkit proof on VoiceStudioKit, not MemberToolkitKit', () => {
    const proof = source('app/dev/member/toolkit/page.tsx');

    expect(proof).toContain('VoiceStudioKit');
    expect(proof).not.toMatch(/from '@\/components\/portal\/kit\/pages\/member\/MemberToolkitKit'/);
  });

  it('does not load resume data for the default Coaches tab', () => {
    const page = source('app/(portal)/dashboard/ai-tools/page.tsx');
    const studio = source('components/portal/kit/pages/VoiceStudioKit.tsx');

    expect(page).toContain("initialTab === 'studio'");
    expect(page).toContain("{ hasResume: false }");
    expect(studio).toContain("new URLSearchParams(searchParams?.toString() ?? '')");
    expect(studio).toContain("router.replace(`${pathname}${query ? `?${query}` : ''}`, { scroll: false })");
    expect(studio).toContain("selectTab(v as StudioTab)");
  });

  it('redirects duplicate entrypoints into canonical Studio tabs', () => {
    const legacyStudio = source('app/(portal)/dashboard/ai-tools/studio/page.tsx');
    const legacyToolkit = source('app/(portal)/dashboard/toolkit/page.tsx');

    expect(legacyStudio).toContain("redirect(`/dashboard/ai-tools${query ? `?${query}` : ''}`)");
    expect(legacyToolkit).toContain("redirect('/dashboard/ai-tools?tab=toolkit')");
  });

  it('exposes one Career Studio entry in member navigation', () => {
    const nav = source('lib/nav/portalNav.ts');

    expect(nav).toContain("href: '/dashboard/ai-tools', label: 'AI Career Tools'");
    expect(nav).not.toContain("label: 'Voice + Career Studio'");
    expect(nav).not.toContain("href: '/dashboard/toolkit', label: 'Career Toolkit'");
  });
});
