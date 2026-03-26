import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isSuperAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { getSlaStatusForThreads, getThreadIdsBreachingSla } from '@/lib/messages/superAdminMessageQueries';

const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 50;
const HOURS_48_MS = 48 * 60 * 60 * 1000;

export async function GET(request: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isSuperAdmin(user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const sp = request.nextUrl.searchParams;
  const cursor = sp.get('cursor') ?? undefined;
  const limit = Math.min(Math.max(Number(sp.get('limit')) || DEFAULT_LIMIT, 1), MAX_LIMIT);
  const search = (sp.get('search') ?? '').trim();
  const alertsOnly = sp.get('alertsOnly') === '1' || sp.get('alertsOnly') === 'true';

  const searchWhere =
    search.length > 0
      ? {
          OR: [
            { member: { fullName: { contains: search, mode: 'insensitive' as const } } },
            { member: { email: { contains: search, mode: 'insensitive' as const } } },
            { messages: { some: { body: { contains: search, mode: 'insensitive' as const } } } },
          ],
        }
      : {};

  const baseWhere = {
    messages: { some: {} },
    member: { deletedAt: null },
    ...searchWhere,
  };

  if (alertsOnly) {
    const threshold = new Date(Date.now() - HOURS_48_MS);
    let breachIds = await getThreadIdsBreachingSla(threshold, 500);

    if (search.length > 0) {
      const matching = await prisma.messageThread.findMany({
        where: { id: { in: breachIds }, ...baseWhere },
        select: { id: true },
      });
      const allow = new Set(matching.map((m) => m.id));
      breachIds = breachIds.filter((id) => allow.has(id));
    }

    const startIdx = cursor ? breachIds.indexOf(cursor) + 1 : 0;
    const safeStart = startIdx < 0 ? 0 : startIdx;
    const pageIds = breachIds.slice(safeStart, safeStart + limit);
    const hasMore = safeStart + limit < breachIds.length;
    const nextCursor = hasMore && pageIds.length > 0 ? pageIds[pageIds.length - 1]! : null;

    if (pageIds.length === 0) {
      return NextResponse.json({ threads: [], nextCursor: null, alertsOnly: true });
    }

    const threads = await prisma.messageThread.findMany({
      where: { id: { in: pageIds }, member: { deletedAt: null } },
      select: {
        id: true,
        memberId: true,
        counselorUserId: true,
        updatedAt: true,
        member: { select: { id: true, fullName: true, email: true } },
        counselor: { select: { id: true, fullName: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { id: true, body: true, createdAt: true, authorId: true },
        },
      },
    });
    const order = new Map(pageIds.map((id, i) => [id, i]));
    threads.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));

    const slaMap = await getSlaStatusForThreads(threads.map((t) => t.id));
    const rows = threads.map((t) => {
      const last = t.messages[0];
      const sla = slaMap.get(t.id);
      const preview = last ? (last.body.length > 140 ? `${last.body.slice(0, 137)}…` : last.body) : '';
      return {
        id: t.id,
        memberId: t.memberId,
        memberName: t.member.fullName,
        memberEmail: t.member.email,
        counselorUserId: t.counselorUserId,
        counselorName: t.counselor?.fullName ?? null,
        updatedAt: t.updatedAt.toISOString(),
        lastMessagePreview: preview,
        lastMessageAt: last?.createdAt.toISOString() ?? null,
        lastMessageAuthorId: last?.authorId ?? null,
        sla: sla
          ? {
              needsCounselorReply: sla.needsCounselorReply,
              memberLastMessageAt: sla.memberLastMessageAt?.toISOString() ?? null,
              breached48h: sla.breached48h,
              breached72h: sla.breached72h,
            }
          : {
              needsCounselorReply: false,
              memberLastMessageAt: null,
              breached48h: false,
              breached72h: false,
            },
      };
    });

    return NextResponse.json({ threads: rows, nextCursor, alertsOnly: true });
  }

  const threads = await prisma.messageThread.findMany({
    where: baseWhere,
    orderBy: { updatedAt: 'desc' },
    take: limit + 1,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    select: {
      id: true,
      memberId: true,
      counselorUserId: true,
      updatedAt: true,
      member: { select: { id: true, fullName: true, email: true } },
      counselor: { select: { id: true, fullName: true } },
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { id: true, body: true, createdAt: true, authorId: true },
      },
    },
  });

  let page = threads;
  let nextCursor: string | null = null;
  if (threads.length > limit) {
    page = threads.slice(0, limit);
    nextCursor = page[page.length - 1]?.id ?? null;
  }

  const slaMap = await getSlaStatusForThreads(page.map((t) => t.id));

  const rows = page.map((t) => {
    const last = t.messages[0];
    const sla = slaMap.get(t.id);
    const preview = last ? (last.body.length > 140 ? `${last.body.slice(0, 137)}…` : last.body) : '';
    return {
      id: t.id,
      memberId: t.memberId,
      memberName: t.member.fullName,
      memberEmail: t.member.email,
      counselorUserId: t.counselorUserId,
      counselorName: t.counselor?.fullName ?? null,
      updatedAt: t.updatedAt.toISOString(),
      lastMessagePreview: preview,
      lastMessageAt: last?.createdAt.toISOString() ?? null,
      lastMessageAuthorId: last?.authorId ?? null,
      sla: sla
        ? {
            needsCounselorReply: sla.needsCounselorReply,
            memberLastMessageAt: sla.memberLastMessageAt?.toISOString() ?? null,
            breached48h: sla.breached48h,
            breached72h: sla.breached72h,
          }
        : {
            needsCounselorReply: false,
            memberLastMessageAt: null,
            breached48h: false,
            breached72h: false,
          },
    };
  });

  return NextResponse.json({
    threads: rows,
    nextCursor,
    alertsOnly: false,
  });
}
