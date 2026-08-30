import { render } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';

import EmployerJobPostForm from '@/components/employer/EmployerJobPostForm';
import JobForm from '@/components/employer/JobForm';

const push = vi.hoisted(() => vi.fn());
const refresh = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, refresh }),
}));

const source = (relativePath: string) =>
  readFileSync(path.join(process.cwd(), relativePath), 'utf8');

function jsxMountCount(pageSource: string, componentName: string) {
  return pageSource.match(new RegExp(`<${componentName}\\b`, 'g'))?.length ?? 0;
}

function literalIds(componentSource: string) {
  return Array.from(componentSource.matchAll(/\bid="([^"]+)"/g), (match) => match[1]);
}

function expectUniqueRenderedIds(container: HTMLElement) {
  const ids = Array.from(container.querySelectorAll<HTMLElement>('[id]'), (element) => element.id);
  expect(ids.length).toBeGreaterThan(0);
  expect(new Set(ids).size).toBe(ids.length);
}

describe('responsive portal pages mount each interactive surface once', () => {
  it.each([
    ['app/(portal)/employer/jobs/post/page.tsx', 'EmployerJobPostForm'],
    ['app/(portal)/employer/jobs/new/page.tsx', 'JobForm'],
    ['app/(portal)/partner/messages/page.tsx', 'PortalTeamChatClient'],
    ['app/(portal)/counselor/messages/page.tsx', 'CounselorMessagesInboxClient'],
  ])('%s has one %s instance', (pagePath, componentName) => {
    expect(jsxMountCount(source(pagePath), componentName)).toBe(1);
  });

  it('keeps one responsive shell instead of paired mounted mobile and desktop forms', () => {
    for (const pagePath of [
      'app/(portal)/employer/jobs/post/page.tsx',
      'app/(portal)/employer/jobs/new/page.tsx',
    ]) {
      const pageSource = source(pagePath);
      expect(pageSource).toContain('wa-pb-24 md:wa-pb-0');
    }
  });

  it('renders each employer form with unique DOM ids', () => {
    const quickPost = render(<EmployerJobPostForm />);
    expectUniqueRenderedIds(quickPost.container);
    quickPost.unmount();

    const advancedEditor = render(
      <JobForm companyName="WorkforceAP Test Employer" programSlugs={[]} />,
    );
    expectUniqueRenderedIds(advancedEditor.container);
  });

  it('keeps fixed ids unique inside every singly mounted interactive component', () => {
    for (const componentPath of [
      'components/employer/EmployerJobPostForm.tsx',
      'components/employer/JobForm.tsx',
      'components/portal/PortalTeamChatClient.tsx',
    ]) {
      const ids = literalIds(source(componentPath));
      expect(ids.length).toBeGreaterThan(0);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
});
