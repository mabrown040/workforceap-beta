import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { buildPageMetadata } from "@/app/seo";
import { getUser } from "@/lib/auth/server";
import { prisma } from "@/lib/db/prisma";
import { getProfileCompleteness } from "@/lib/resume/profileCompleteness";
import PageHeader from "@/components/portal/PageHeader";
import ResumeClient from "./ResumeClient";
import MobileBottomNav from "@/components/MobileBottomNav";
import { getServerLabel as t } from '@/lib/i18n/serverLabels';

export const metadata: Metadata = buildPageMetadata({
  title: "Resume",
  description:
    "Upload your resume, review it, and build an updated version from your profile.",
  path: "/dashboard/resume",
});

export default async function DashboardResumePage() {
  const user = await getUser();
  if (!user) redirect("/login?redirectTo=/dashboard/resume");

  const profile = await prisma.profile.findUnique({
    where: { userId: user.id },
    select: {
      resumeOriginalPath: true,
      resumeEnhancedPath: true,
      profilePhone: true,
      profileAddress: true,
      profileLinkedin: true,
      profileBio: true,
      employmentStatus: true,
      educationLevel: true,
      user: {
        select: {
          fullName: true,
          email: true,
          phone: true,
          enrolledProgram: true,
          assessmentCompleted: true,
        },
      },
    },
  });

  const completeness = getProfileCompleteness(
    profile ?? null,
    profile?.user ?? null,
  );
  const fields = {
    name: profile?.user?.fullName ?? "",
    email: profile?.user?.email ?? "",
    phone: profile?.user?.phone ?? "",
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
                {t('Resume')}
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
        </div>
        <MobileBottomNav variant="portal" />
      </div>

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
            title={t('Resume')}
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
