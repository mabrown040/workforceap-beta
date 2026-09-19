import { describe, expect, it } from 'vitest';
import en from '@/messages/en.json';
import fr from '@/messages/fr.json';
import pt from '@/messages/pt.json';

/**
 * Keys that components read statically but that were missing from the catalog,
 * so next-intl rendered the raw key path (e.g. "employer.loiTitle" as the tab
 * title of /employer/loi, "admin.memberCount" on the admin pipeline view).
 * Each entry is `namespace.key` as the component reads it.
 */
const PAGE_MESSAGE_KEYS = [
  'employer.loiTitle', // app/employer/loi/page.tsx generateMetadata
  'employer.loiDescription',
  'employer.outcomes.title', // app/employer/outcomes/page.tsx generateMetadata
  'employer.outcomes.description',
  'admin.analyticsPageTitle', // app/admin/analytics/page.tsx generateMetadata
  'admin.analyticsPageDescription',
  'admin.memberCount', // app/admin/pipeline/PipelineLegacyView.tsx
] as const;

function resolve(messages: unknown, dotted: string): unknown {
  return dotted.split('.').reduce<unknown>((cur, part) => {
    if (cur === null || typeof cur !== 'object' || Array.isArray(cur)) return undefined;
    return (cur as Record<string, unknown>)[part];
  }, messages);
}

describe('page message keys exist in every shipped catalog', () => {
  for (const [locale, messages] of Object.entries({ en, fr, pt })) {
    it(`${locale}.json resolves every statically read key to a string`, () => {
      const missing = PAGE_MESSAGE_KEYS.filter((key) => typeof resolve(messages, key) !== 'string');
      expect(missing).toEqual([]);
    });
  }

  it('admin.memberCount pluralises with the count argument', () => {
    expect(en.admin.memberCount).toContain('{count, plural,');
  });

  it('admin.analytics stays a plain nav label, so the page metadata uses its own keys', () => {
    // `t('analytics.title')` on a string leaf raises INSUFFICIENT_PATH and renders the raw key.
    expect(typeof en.admin.analytics).toBe('string');
  });
});
