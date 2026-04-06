import { prisma } from '@/lib/db/prisma';
import { READINESS_SECTIONS, getJobSiteItemKey } from '@/lib/content/readinessChecklist';

export type MemberReadinessItem = {
  key: string;
  label: string;
  type: string;
  placeholder?: string;
  completed: boolean;
  valueText?: string | null;
};

export type MemberReadinessSection = {
  section: number;
  title: string;
  items: MemberReadinessItem[];
};

/**
 * Counselor checklist merged with `readiness_checklist` rows for the member.
 * Shared by `/api/member/readiness` and `/dashboard/readiness` so the UI is not
 * dependent on a client-side fetch for live data.
 */
export async function getMemberReadinessSections(userId: string): Promise<MemberReadinessSection[]> {
  const items = await prisma.readinessChecklist.findMany({
    where: { userId },
  });

  const map = new Map(items.map((i) => [i.itemKey, i]));

  return READINESS_SECTIONS.map((sec) => ({
    section: sec.section,
    title: sec.title,
    items: sec.items.flatMap((item): MemberReadinessItem[] => {
      if (item.type === 'sites' && item.sites) {
        return item.sites.map((siteName) => {
          const key = getJobSiteItemKey(siteName);
          const row = map.get(key);
          return {
            key,
            label: siteName,
            type: 'checkbox',
            completed: row?.completed ?? false,
            valueText: row?.valueText,
          };
        });
      }
      const row = map.get(item.key);
      return [
        {
          key: item.key,
          label: item.label,
          type: item.type === 'sites' ? 'checkbox' : item.type,
          placeholder: item.placeholder,
          completed: row?.completed ?? false,
          valueText: row?.valueText,
        },
      ];
    }),
  }));
}
