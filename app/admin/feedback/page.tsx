import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser, withAuthGuc } from '@/lib/auth/server';
import { resolveAdminPageTenant, withAdminPageScope, inheritUserOrg, inheritMemberOrg, inheritLeaderOrg, inheritInvitedByOrg } from '@/lib/tenant/adminPageScope';
import { prisma } from '@/lib/db/prisma';
import { buildFeedbackUserScope } from '@/app/api/admin/feedback/_feedbackScope';
import PageHeader from '@/components/portal/PageHeader';
import AdminFeedbackClient from '@/components/admin/AdminFeedbackClient';
import {
  FeedbackKit,
  type FeedbackRow,
  type FeedbackSentiment,
} from '@/components/portal/kit/pages/admin-subviews/FeedbackKit';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadataAsync({
    title: 'Member Feedback',
    description: 'View and analyze member feedback submissions.',
    path: '/admin/feedback',
  });
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return parts
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function sentimentOf(rating: number): FeedbackSentiment {
  if (rating >= 4) return 'Positive';
  if (rating === 3) return 'Neutral';
  return 'Critical';
}

const SUMMARY_FALLBACK = 'No comment left';

interface FeedbackKitData {
  feedback: FeedbackRow[];
  total: number;
  recent: number;
  critical: number;
  avgRating: string;
}

const EMPTY_KIT_DATA: FeedbackKitData = {
  feedback: [],
  total: 0,
  recent: 0,
  critical: 0,
  avgRating: '—',
};

/**
 * Load feedback rows + KPI aggregates for the kit's read table. Reuses the
 * per-actor scope from the legacy API loader so tenant/counselor scoping and
 * RLS match exactly. Re-establishes the auth GUC because RSC renders outside
 * the root layout's gucContextStorage scope.
 */
async function loadFeedbackKitData(staffUserId: string): Promise<FeedbackKitData> {
  return withAuthGuc(async () => {
    const userScope = await buildFeedbackUserScope(staffUserId);
    if (userScope === null) return EMPTY_KIT_DATA;

    const where = userScope ? { user: userScope } : {};
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [items, total, recent, critical, agg] = await Promise.all([
      prisma.memberFeedback.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: { user: { select: { fullName: true, email: true } } },
      }),
      prisma.memberFeedback.count({ where }),
      prisma.memberFeedback.count({
        where: { ...where, createdAt: { gte: sevenDaysAgo } },
      }),
      prisma.memberFeedback.count({ where: { ...where, rating: { lte: 2 } } }),
      prisma.memberFeedback.aggregate({ where, _avg: { rating: true } }),
    ]);

    const feedback: FeedbackRow[] = items.map((f) => {
      const memberName = f.user.fullName?.trim() || f.user.email || 'Unknown member';
      const summaryRaw = f.comment?.trim();
      const summary = summaryRaw
        ? summaryRaw.length > 120
          ? `${summaryRaw.slice(0, 117)}…`
          : summaryRaw
        : SUMMARY_FALLBACK;
      return {
        id: f.id,
        memberName,
        memberEmail: f.user.email ?? '',
        initials: initialsOf(memberName),
        summary,
        type: f.type,
        rating: f.rating,
        sentiment: sentimentOf(f.rating),
        submitted: f.createdAt.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        }),
      };
    });

    const avg = agg._avg.rating;
    return {
      feedback,
      total,
      recent,
      critical,
      avgRating: avg != null ? avg.toFixed(1) : '—',
    };
  });
}

export default async function AdminFeedbackPage({
  searchParams,
}: {
  searchParams?: Promise<{ ui?: string }>;
}) {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/admin/feedback');
  const scope = await resolveAdminPageTenant(user.id);
  if (!scope.ok) redirect('/dashboard');

  const params = await searchParams;
  const requestedUi = typeof params?.ui === 'string' ? params.ui : null;

  // Redesigned kit is the DEFAULT; the legacy interactive view (filters,
  // pagination) is still available at ?ui=legacy. Runs AFTER the auth guard so
  // access control is preserved. FeedbackKit is a pure read table fed by real
  // prisma data loaded below.
  if (requestedUi !== 'legacy') {
    const data = await loadFeedbackKitData(user.id).catch((err) => {
      console.error('[admin/feedback] failed to load feedback:', err);
      return EMPTY_KIT_DATA;
    });
    return <FeedbackKit {...data} />;
  }

  return (
    <div className="admin-main-content">
      <PageHeader
        title="Member Feedback"
        subtitle="Review feedback from members on training, counselors, and the platform."
      />
      <AdminFeedbackClient />
    </div>
  );
}
