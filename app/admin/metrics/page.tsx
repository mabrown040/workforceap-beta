import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { getAdminMetrics } from '@/lib/admin/metrics';
import Footer from '@/components/Footer';

export const metadata: Metadata = buildPageMetadata({
  title: 'Admin metrics',
  description: 'Engagement and activity metrics.',
  path: '/admin/metrics',
});

export default async function AdminMetricsPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/admin/metrics');

  const adminRole = await prisma.userRole.findFirst({
    where: { userId: user.id },
    include: { role: true },
  });
  if (adminRole?.role?.name !== 'admin') {
    redirect('/dashboard');
  }

  const data = await getAdminMetrics();

  return (
    <div className="inner-page">
      <section className="page-hero">
        <div className="page-hero-content">
          <Link href="/admin" className="resource-back-link">
            ← Back to admin
          </Link>
          <h1>Admin metrics</h1>
          <p>Engagement and activity overview.</p>
        </div>
      </section>

      <section className="content-section">
        <div className="container">
          <div className="admin-metrics-grid">
            <div className="admin-metric-card">
              <h3>Members</h3>
              <p className="admin-metric-value">{data.totalMembers ?? 0}</p>
              <p className="admin-metric-label">Total members</p>
            </div>
            <div className="admin-metric-card">
              <h3>Weekly active</h3>
              <p className="admin-metric-value">{data.weeklyActiveMembers ?? 0}</p>
              <p className="admin-metric-label">Active in last 7 days</p>
            </div>
            <div className="admin-metric-card">
              <h3>Inactive</h3>
              <p className="admin-metric-value">{data.inactive14Days ?? 0}</p>
              <p className="admin-metric-label">No activity in 14+ days</p>
            </div>
            <div className="admin-metric-card">
              <h3>Goals</h3>
              <p className="admin-metric-value">{data.activeGoals ?? 0}</p>
              <p className="admin-metric-label">Active goals set</p>
            </div>
            <div className="admin-metric-card">
              <h3>Applications</h3>
              <p className="admin-metric-value">{data.applicationsSubmitted ?? 0}</p>
              <p className="admin-metric-label">Submitted (non-saved)</p>
            </div>
            <div className="admin-metric-card">
              <h3>Resources</h3>
              <p className="admin-metric-value">{data.resourcesCompleted ?? 0}</p>
              <p className="admin-metric-label">Resources completed</p>
            </div>
            <div className="admin-metric-card">
              <h3>AI tools</h3>
              <p className="admin-metric-value">{data.aiToolRuns ?? 0}</p>
              <p className="admin-metric-label">AI tool runs total</p>
            </div>
            <div className="admin-metric-card">
              <h3>Pathways</h3>
              <p className="admin-metric-value">{data.pathwayStarts ?? 0}</p>
              <p className="admin-metric-label">Pathways started</p>
            </div>
          </div>
          <p style={{ marginTop: '1.5rem' }}>
            <Link href="/admin/members">View members</Link>
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
}
