import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import Footer from '@/components/Footer';
import WeeklyRecapClient from '@/components/portal/WeeklyRecapClient';

export const metadata: Metadata = buildPageMetadata({
  title: 'Weekly Recap',
  description: 'Your personalized weekly summary and next actions.',
  path: '/weekly-recap',
});

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const start = new Date(d);
  start.setDate(diff);
  start.setHours(0, 0, 0, 0);
  return start;
}

export default async function WeeklyRecapPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/weekly-recap');

  const weekStart = getWeekStart(new Date());
  const { generateWeeklyRecap } = await import('@/lib/recap/generate');
  // Always regenerate so activity counts stay fresh
  const recap = await generateWeeklyRecap(user.id, weekStart);

  if (recap && !recap.openedAt) {
    await prisma.weeklyRecap.update({
      where: { id: recap.id },
      data: { openedAt: new Date() },
    });
  }

  const recapData = recap?.recapJson as {
    weekInReview?: { applicationsAdded?: number; resourcesCompleted?: number; aiToolsUsed?: number; pathwayStepsCompleted?: number };
    goalsSnapshot?: Array<{ title: string; status: string }>;
    applicationsCount?: number;
    recommendedActions?: string[];
    readinessScoreSnapshot?: number;
  } | null;

  return (
    <div className="inner-page">
      <section className="page-hero">
        <div className="page-hero-content">
          <Link href="/career-brief" className="resource-back-link">
            ← Back to Career Brief
          </Link>
          <h1>Your Weekly Recap</h1>
          <p>Your personalized summary and recommended next actions.</p>
        </div>
      </section>

      <section className="content-section">
        <div className="container">
          <WeeklyRecapClient
            recap={recap}
            recapData={recapData}
            weekStart={weekStart.toISOString()}
          />
        </div>
      </section>

      <Footer />
    </div>
  );
}
