import { getMemberState } from '@/lib/member/getMemberState';
import type { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { withDbRetry } from '@/lib/db/withDbRetry';
import { ensureAppUserProvisioned } from '@/lib/member/ensureAppUser';
import PageHeader from '@/components/portal/PageHeader';
import { getTranslations } from 'next-intl/server';

const ResumeClient = dynamic(() => import('./ResumeClient'), {
  loading: () => (
    <div
      role="status"
      aria-live="polite"
      className="portal-card portal-card--flat"
      style={{
        minHeight: 280,
        padding: '2.5rem 1.25rem',
        borderRadius: 12,
        textAlign: 'center',
        color: 'var(--color-on-surface-variant)',
        fontSize: '0.9rem',
        fontWeight: 600,
      }}
    >
      Loading resume tools…
    </div>
  ),
});

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadataAsync({
    title: 'My Resume',
    description: 'Upload, view, and AI-generate your professional resume.',
    path: '/dashboard/resume',
  });
}

export default async function DashboardResumePage() {
  const user = await getUser();
  if (!user) redirect("/login?redirectTo=/dashboard/resume");
  const t = await getTranslations('profile');

  // Single source of truth: getMemberState returns consistent profile % across
  // all surfaces. It throws "Member not found" when the app `users` row is
  // missing (orphaned Supabase auth user). Self-heal by provisioning the row
  // and retrying once before giving up — the root layout normally provisions on
  // entry, but guard here so a direct hit never 500s. Reads wrapped in
  // withDbRetry to ride out a transient pooler blip (2026-06-30 incident).
  let memberState;
  try {
    memberState = await withDbRetry(() => getMemberState(user.id));
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('Member not found')) {
      await ensureAppUserProvisioned(user);
      memberState = await withDbRetry(() => getMemberState(user.id));
    } else {
      throw err;
    }
  }
  const completeness = memberState.profileCompletenessPct;

  // Still need profile for resume paths
  const profile = await withDbRetry(() =>
    prisma.profile.findUnique({
      where: { userId: user.id },
      select: {
        resumeOriginalPath: true,
        resumeEnhancedPath: true,
      },
    }),
  );

  const fields = {
    name: memberState.fullName ?? "",
    email: memberState.email ?? "",
    phone: "", // getMemberState doesn't expose phone currently
  };

  return (
    <>
      {/* ── Mobile ── */}
      <div className="md:wa-hidden" style={{ paddingBottom: "6rem" }}>
        <div
          style={{
            padding: "1rem 1rem 1.25rem",
            borderBottom: "1px solid var(--surface-container-high)",
            background: "var(--surface-container-low)",
          }}
        >
          <Link
            href="/dashboard/ai-tools"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.3rem",
              fontSize: "0.85rem",
              color: "var(--color-accent)",
              textDecoration: "none",
              marginBottom: "0.75rem",
              fontWeight: 500,
            }}
          >
            ← Career Toolkit
          </Link>
          <div
            style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: "var(--surface-container-highest)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: "1.2rem", color: "var(--color-accent)" }}
                aria-hidden="true"
              >
                description
              </span>
            </div>
            <div>
              <h1
                style={{
                  fontSize: "1.15rem",
                  fontWeight: 700,
                  margin: 0,
                  color: "var(--color-on-surface)",
                }}
              >
                {t('resume')}
              </h1>
              <p
                style={{
                  fontSize: "0.78rem",
                  color: "var(--color-on-surface-variant)",
                  margin: "0.1rem 0 0",
                }}
              >
                Upload your resume, review it, and build an updated version from
                your profile.
              </p>
            </div>
          </div>
        </div>

        <div style={{ padding: "1rem" }}>
          <ResumeClient
            completeness={completeness}
            witData={{
              name: fields.name,
              email: fields.email,
              phone: fields.phone,
              recentEmployer: "",
              targetJob: "",
              skills: "",
            }}
            hasOriginal={!!profile?.resumeOriginalPath}
            hasEnhanced={!!profile?.resumeEnhancedPath}
          />
        </div>      </div>

      {/* ── Desktop ── */}
      <div
        className="wa-hidden md:wa-block"
        style={{ background: "var(--color-surface)", minHeight: "100vh" }}
      >
        <div
          style={{
            padding: "1.25rem 2rem 1.5rem",
            borderBottom: "1px solid var(--surface-container-high)",
            background: "var(--surface-container-low)",
          }}
        >
          <PageHeader
            title={t('resume')}
            subtitle="Upload your resume, review it inline, or build one from your profile."
            breadcrumbs={[
              { label: "Member Portal", href: "/dashboard" },
              { label: "Resume" },
            ]}
          />
        </div>

        <div style={{ padding: "2rem" }}>
          <ResumeClient
            completeness={completeness}
            witData={{
              name: fields.name,
              email: fields.email,
              phone: fields.phone,
              recentEmployer: "",
              targetJob: "",
              skills: "",
            }}
            hasOriginal={!!profile?.resumeOriginalPath}
            hasEnhanced={!!profile?.resumeEnhancedPath}
            layout="side-by-side"
          />
        </div>
      </div>
    </>
  );
}
