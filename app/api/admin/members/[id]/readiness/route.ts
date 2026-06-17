import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { getActorOrganizationId } from '@/lib/tenant/organization';
import { READINESS_SECTIONS, getJobSiteItemKey } from '@/lib/content/readinessChecklist';
import { auditRequestMeta, logAuditEvent } from '@/lib/audit/log';

import { withApiGuc } from '@/lib/db/withRequestGuc';async function _GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isAdmin(user.id)))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id: userId } = await params;

  // Tenant scope: verify member is in actor's org. ReadinessChecklist
  // isn't tenant-scoped directly; gate via User.organizationId.
  const orgId = await getActorOrganizationId(user.id);
  const member = await prisma.$transaction((tx) => tx.user.findFirst({
    where: { id: userId, organizationId: orgId },
    select: { id: true },
  }));
  if (!member) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 });
  }

  const items = await prisma.$transaction((tx) => tx.readinessChecklist.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    take: 200,
  }));

  const map = new Map(items.map((i) => [i.itemKey, i]));

  const lastItem = items[0];
  let lastUpdatedBy: string | null = null;
  let lastUpdatedAt: Date | null = null;
  if (lastItem?.updatedAt) {
    lastUpdatedAt = lastItem.updatedAt;
    if (lastItem.completedBy) {
      const completedBy = lastItem.completedBy;
      const counselor = await prisma.$transaction((tx) => tx.user.findUnique({
        where: { id: completedBy },
        select: { fullName: true },
      }));
      lastUpdatedBy = counselor?.fullName ?? null;
    }
  }

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

  return NextResponse.json({ sections, memberId: userId, lastUpdatedBy, lastUpdatedAt: lastUpdatedAt?.toISOString() ?? null });

  } catch (error) {
    console.error('/admin/members/[id]/readiness error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const GET = withApiGuc(_GET);async function _PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isAdmin(user.id)))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id: userId } = await params;

  // Tenant scope: an Org A admin cannot tick checklist items on an
  // Org B member by guessing their UUID.
  const orgId = await getActorOrganizationId(user.id);
  const target = await prisma.$transaction((tx) => tx.user.findFirst({
    where: { id: userId, organizationId: orgId },
    select: { id: true },
  }));
  if (!target) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 });
  }

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

  await prisma.$transaction((tx) => tx.readinessChecklist.upsert({
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
  }));

  const dbUser = await prisma.$transaction((tx) => tx.user.findUnique({
    where: { id: user.id },
    select: { fullName: true },
  }));

  logAuditEvent({
    user: { id: user.id, role: 'admin' },
    verb: 'update_readiness_item',
    object: { type: 'User', id: userId },
    result: { success: true, extensions: { itemKey, completed: hasCompleted ? completed : undefined } },
    request: auditRequestMeta(request),
    orgId,
  }).catch((err) => console.error('[audit] update_readiness_item:', err));

  return NextResponse.json({ ok: true, counselorName: dbUser?.fullName ?? (user.user_metadata?.full_name as string) ?? user.email });

  } catch (error) {
    console.error('/admin/members/[id]/readiness error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const PATCH = withApiGuc(_PATCH);

