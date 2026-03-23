import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { getEmployerForUser } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import PageHeader from '@/components/portal/PageHeader';
import EmployerSettingsForm from '@/components/employer/EmployerSettingsForm';
import Link from 'next/link';

export const metadata: Metadata = buildPageMetadata({
  title: 'Company settings',
  description: 'Employer portal company settings.',
  path: '/employer/settings',
});

export default async function EmployerSettingsPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/employer/settings');

  const ctx = await getEmployerForUser(user.id);
  if (!ctx) redirect('/employers');

  const employer = await prisma.employer.findUnique({
    where: { id: ctx.employerId },
    select: {
      companyName: true,
      companyDescription: true,
      companyWebsite: true,
      companySize: true,
      industry: true,
      contactName: true,
      contactEmail: true,
      contactPhone: true,
    },
  });
  if (!employer) redirect('/employers');

  return (
    <div className="employer-settings-page">
      <PageHeader
        title="Company settings"
        subtitle="Update your company profile and primary hiring contact. Changes save to your employer record immediately."
      />

      <section className="employer-settings-form-section employer-dash-panel" aria-label="Company profile form">
        <EmployerSettingsForm initial={employer} />
      </section>

      <div className="employer-settings-next-steps" role="region" aria-label="Where to go next">
        <h2 className="employer-settings-next-steps__title">What you can do now</h2>
        <ul className="employer-settings-next-steps__list">
          <li>
            <Link href="/employer/jobs" className="employer-settings-next-steps__link">
              Manage job postings
            </Link>
            <span className="employer-settings-next-steps__desc">Create, edit, submit for review, and publish roles.</span>
          </li>
          <li>
            <Link href="/employer/applications" className="employer-settings-next-steps__link">
              Review applicants
            </Link>
            <span className="employer-settings-next-steps__desc">See applications and update hiring status.</span>
          </li>
          <li>
            <Link href="/employer/messages" className="employer-settings-next-steps__link">
              Messages / support
            </Link>
            <span className="employer-settings-next-steps__desc">Ask WorkforceAP to update billing contacts, users, or company details.</span>
          </li>
          <li>
            <Link href="/contact" className="employer-settings-next-steps__link">
              Contact form
            </Link>
            <span className="employer-settings-next-steps__desc">General inquiries: program partnerships, press, or other topics.</span>
          </li>
        </ul>
      </div>
      <p className="employer-settings-footnote">
        For urgent account changes, email{' '}
        <a href="mailto:info@workforceap.org" className="employer-settings-mailto">
          info@workforceap.org
        </a>
        .
      </p>
    </div>
  );
}
