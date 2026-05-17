import { readFileSync } from 'fs';
import { join } from 'path';

export type CareerBriefMeta = {
  id: string;
  title: string;
  date: string;
  slug: string;
};

const BRIEFS: CareerBriefMeta[] = [
  { id: '2026-03-21', title: 'Weekly Career Brief — March 21, 2026', date: '2026-03-21', slug: '2026-03-21-weekly-brief' },
  { id: '2026-03-14', title: 'Weekly Career Brief — March 14, 2026', date: '2026-03-14', slug: '2026-03-14-weekly-brief' },
];

export function getCareerBriefs(): CareerBriefMeta[] {
  return BRIEFS;
}

export function getCareerBriefContent(slug: string): string | null {
  // Path-traversal guard: only allow slugs that match a known brief.
  // Without this, the [slug] dynamic route segment in
  // `app/(portal)/dashboard/career-brief/[slug]/page.tsx` will pass
  // URL-decoded `..` segments straight into `path.join`, letting a
  // signed-in member read any `*.md` file beneath the project root.
  // Defense-in-depth: also normalize the resolved path and reject
  // anything that escapes `content/career-brief/`.
  if (!BRIEFS.some((b) => b.slug === slug)) return null;

  const baseDir = join(process.cwd(), 'content', 'career-brief');
  const filePath = join(baseDir, `${slug}.md`);
  // join() resolves `..` segments; assert the result stays under baseDir
  // (handles edge cases like Windows path separators or a future code
  // change that loosens the slug check above).
  if (!filePath.startsWith(baseDir + (filePath.includes('\\') ? '\\' : '/'))) {
    return null;
  }
  try {
    return readFileSync(filePath, 'utf-8');
  } catch {
    return null;
  }
}
