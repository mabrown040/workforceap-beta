// @vitest-environment node
import { existsSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import nextConfig from '../next.config';

type Redirect = { source: string; destination: string; permanent: boolean };

const root = process.cwd();

function marketingPageExists(urlPath: string): boolean {
  if (urlPath === '/blog' || urlPath === '/blog/') {
    return existsSync(path.join(root, 'marketing/src/pages/blog.astro'))
      || existsSync(path.join(root, 'marketing/src/pages/blog/index.astro'));
  }
  const slug = urlPath.replace(/^\/blog\//, '').replace(/\/$/, '');
  return existsSync(path.join(root, 'marketing/src/pages/blog', `${slug}.astro`))
    || existsSync(path.join(root, 'marketing/src/pages/blog', slug, 'index.astro'))
    || existsSync(path.join(root, 'marketing/dist/blog', slug, 'index.html'))
    || existsSync(path.join(root, 'marketing/dist/blog', `${slug}.html`));
}

describe('next.config redirects stay on live destinations', () => {
  it('maps legacy blog and jobs URLs to resolvable targets', async () => {
    const redirects = (await nextConfig.redirects?.()) as Redirect[] | undefined;
    expect(Array.isArray(redirects)).toBe(true);
    const list = redirects ?? [];

    const bySource = new Map(list.map((r) => [r.source, r]));

    expect(bySource.get('/jobs')?.destination).toBe('/dashboard/jobs');
    expect(bySource.get('/blog/our-mission')?.destination).toBe(
      '/blog/michael-brown-workforce-leader-austin',
    );
    expect(bySource.get('/blog/why-we-started-workforceap')?.destination).toBe(
      '/blog/michael-brown-workforce-leader-austin',
    );
    expect(bySource.get('/blog/career-change-guide')?.destination).toBe(
      '/blog/breaking-into-tech-starting-over',
    );
    expect(bySource.get('/blog/it-certifications-guide')?.destination).toBe(
      '/blog/5-certifications-under-6-months',
    );
    expect(bySource.get('/programs/cybersecurity')?.destination).toBe(
      '/programs/cybersecurity-professional-certificate-google',
    );

    for (const redirect of list) {
      if (!redirect.destination.startsWith('/blog')) continue;
      if (redirect.destination.includes(':')) continue;
      expect(
        marketingPageExists(redirect.destination),
        `${redirect.source} → ${redirect.destination} must exist in marketing`,
      ).toBe(true);
    }
  });
});
