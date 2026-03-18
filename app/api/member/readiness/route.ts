import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { READINESS_SECTIONS, getJobSiteItemKey } from '@/lib/content/readinessChecklist';

export async function GET(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const items = await prisma.readinessChecklist.findMany({
    where: { userId: user.id },
  });

  const map = new Map(items.map((i) => [i.itemKey, i]));

  type ItemOut = { key: string; label: string; type: string; placeholder?: string; completed: boolean; valueText?: string | null };

  const sections = READINESS_SECTIONS.map((sec) => ({
    section: sec.section,
    title: sec.title,
    items: sec.items.flatMap((item): ItemOut[] => {
      if (item.type === 'sites' && item.sites) {
        return item.sites.map((siteName) => {
          const key = getJobSiteItemKey(siteName);
          const row = map.get(key);
          return { key, label: siteName, type: 'checkbox', completed: row?.completed ?? false, valueText: row?.valueText };
        });
      }
      const row = map.get(item.key);
      return [{
        key: item.key,
        label: item.label,
        type: item.type === 'sites' ? 'checkbox' : item.type,
        placeholder: item.placeholder,
        completed: row?.completed ?? false,
        valueText: row?.valueText,
      }];
    }),
  }));

  return NextResponse.json({ sections });
}
