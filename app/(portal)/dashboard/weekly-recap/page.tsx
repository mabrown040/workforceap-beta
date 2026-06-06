import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import PageHeader from '@/components/portal/PageHeader';
import MotivatingRecapClient, { type MotivatingRecapData } from './MotivatingRecapClient';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('dashboard');
  return buildPageMetadataAsync({
    title: t('weeklyRecapMetaTitle'),
    description: t('weeklyRecapMetaDesc'),
    path: '/dashboard/weekly-recap',
  });
}

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
  if (!user) redirect('/login?redirectTo=/dashboard/weekly-recap');

  const weekStart = getWeekStart(new Date());
  const { generateWeeklyRecap } = await import('@/lib/recap/generate');
  let recap: Awaited<ReturnType<typeof generateWeeklyRecap>> | null = null;
  try {
    recap = await generateWeeklyRecap(user.id, weekStart);
  } catch (e) {
    console.error('[WeeklyRecapPage] generateWeeklyRecap failed', e);
  }

  if (recap && !recap.openedAt) {
    try {
      await prisma.weeklyRecap.update({
        where: { id: recap.id },
        data: { openedAt: new Date() },
      });
    } catch (e) {
      console.error('[WeeklyRecapPage] openedAt update failed', e);
    }
  }

  const recapData = (recap?.recapJson ?? null) as MotivatingRecapData;

  return (
    <>
      <div style={{ paddingBottom: '5rem' }}>
        <PageHeader
          title="Weekly Recap"
          subtitle="Celebrate your wins, see your goal progress, and get a clear plan for the week ahead."
          breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Weekly Recap' }]}
        />
        {recap === null ? (
          <div className="mx-auto max-w-2xl px-4 py-8">
            <div className="rounded-lg border border-border bg-card p-6 text-center text-muted-foreground">
              Your recap isn&rsquo;t ready yet — check back after your next activity or try refreshing.
            </div>
          </div>
        ) : (
          <MotivatingRecapClient
            recap={recap}
            recapData={recapData}
            weekStart={weekStart.toISOString()}
          />
        )}
      </div>    </>
  );
}
