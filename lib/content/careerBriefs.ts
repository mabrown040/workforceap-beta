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
  try {
    const filePath = join(process.cwd(), 'content', 'career-brief', `${slug}.md`);
    return readFileSync(filePath, 'utf-8');
  } catch {
    return null;
  }
}
