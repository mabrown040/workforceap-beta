import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { READINESS_SECTIONS, getJobSiteItemKey } from '@/lib/content/readinessChecklist';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isAdmin(user.id)))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id: userId } = await params;

  const items = await prisma.readinessChecklist.findMany({
    where: { userId },
  });

  const map = new Map(items.map((i) => [i.itemKey, i]));

  type ItemOut = {
    key: string;
    label: string;
    type: 'checkbox' | 'text' | 'textarea';
    placeholder?: string;
    completed: boolean;
    completedAt?: Date | null;
    completedBy?: string | null;
    notes?: string | null;
    valueText?: string | null;
  };

  const sections = READINESS_SECTIONS.map((sec) => ({
    section: sec.section,
    title: sec.title,
    items: sec.items.flatMap((item): ItemOut[] => {
      if (item.type === 'sites' && item.sites) {
        return item.sites.map((siteName) => {
          const key = getJobSiteItemKey(siteName);
          const row = map.get(key);
          return {
            key,
            label: siteName,
            type: 'checkbox' as const,
            completed: row?.completed ?? false,
            completedAt: row?.completedAt,
            completedBy: row?.completedBy,
            notes: row?.notes,
            valueText: row?.valueText,
          };
        });
      }
      const row = map.get(item.key);
      return [{
        key: item.key,
        label: item.label,
        type: item.type as 'checkbox' | 'text' | 'textarea',
        placeholder: item.placeholder,
        completed: row?.completed ?? false,
        completedAt: row?.completedAt,
        completedBy: row?.completedBy,
        notes: row?.notes,
        valueText: row?.valueText,
      }];
    }),
  }));

  return NextResponse.json({ sections, memberId: userId });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isAdmin(user.id)))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id: userId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const o = body as { itemKey?: string; completed?: boolean; valueText?: string; notes?: string };
  const itemKey = typeof o.itemKey === 'string' ? o.itemKey : '';
  if (!itemKey) {
    return NextResponse.json({ error: 'itemKey required' }, { status: 400 });
  }

  const hasCompleted = typeof o.completed === 'boolean';
  const completed = o.completed === true;
  const valueText = typeof o.valueText === 'string' ? o.valueText : undefined;
  const hasValueText = typeof o.valueText === 'string';
  const notes = typeof o.notes === 'string' ? o.notes : undefined;
  const hasNotes = typeof o.notes === 'string';

  let sectionNum = 1;
  for (const sec of READINESS_SECTIONS) {
    for (const item of sec.items) {
      if (item.key === itemKey) {
        sectionNum = sec.section;
        break;
      }
      if (item.type === 'sites' && item.sites?.some((s) => getJobSiteItemKey(s) === itemKey)) {
        sectionNum = sec.section;
        break;
      }
    }
  }

  const updateData = {
    ...(hasCompleted && {
      completed,
      completedAt: completed ? new Date() : null,
      completedBy: completed ? user.id : null,
    }),
    ...(hasValueText && { valueText }),
    ...(hasNotes && { notes }),
  };

  await prisma.readinessChecklist.upsert({
    where: { userId_itemKey: { userId, itemKey } },
    create: {
      userId,
      section: sectionNum,
      itemKey,
      completed: hasCompleted ? completed : false,
      completedAt: hasCompleted && completed ? new Date() : null,
      completedBy: hasCompleted && completed ? user.id : null,
      valueText: hasValueText ? valueText : null,
      notes: hasNotes ? notes : null,
    },
    update: updateData,
  });

  return NextResponse.json({ ok: true });
}
