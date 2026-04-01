import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { CheckCircle, FileQuestion, ArrowRight, Lock } from 'lucide-react';

import { buildPageMetadata } from '@/app/seo';
import SkillAssessmentForm from '@/components/portal/tools/SkillAssessmentForm';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { getProgramBySlug } from '@/lib/content/programs';

export const metadata: Metadata = buildPageMetadata({
  title: 'Skills Assessment',
  description: 'View your assessment status and career readiness.',
  path: '/dashboard/skills-assessment',
});

export default async function SkillsAssessmentPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/skills-assessment');

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id, deletedAt: null },
    select: {
      assessmentCompleted: true,
      assessmentCompletedAt: true,
      assessmentScorePct: true,
      assessmentScore: true,
      enrolledProgram: true,
      interviewCompletedAt: true,
    },
  });

  if (!dbUser) redirect('/login');

  const completed = dbUser.assessmentCompleted ?? false;
  const assessmentGated = !completed && dbUser.interviewCompletedAt == null;

  return (
    <div className="assessments-page">
      <h1 className="portal-page-title">Skills Assessment</h1>
      <p className="portal-assessments-lead">
        Your skills snapshot helps us personalize your learning path and connect you with career support.
      </p>

      <div className="assessments-card">
        {assessmentGated ? (
          <>
            <div className="assessments-card__row">
              <Lock size={28} className="assessments-card__icon assessments-card__icon--muted" aria-hidden />
              <h2 className="assessments-card__title">Assessment opens after your intake interview</h2>
            </div>
            <p className="assessments-card__body">
              Your counselor uses the interview to confirm fit and next steps. After that conversation is complete, you
              can take the skills snapshot here. If you believe your interview is already done and you still see this
              message, contact your counselor or email support.
            </p>
            <Link href="/dashboard" className="btn btn-outline">
              Back to overview
            </Link>
          </>
        ) : completed ? (
          <>
            <div className="assessments-card__row">
              <CheckCircle size={28} className="assessments-card__icon assessments-card__icon--accent" aria-hidden />
              <h2 className="assessments-card__title">Assessment complete</h2>
            </div>
            <ul className="assessments-card__list">
              {dbUser.assessmentCompletedAt && (
                <li>
                  <strong>Completed:</strong>{' '}
                  {new Date(dbUser.assessmentCompletedAt).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </li>
              )}
              {dbUser.assessmentScorePct != null && (
                <li>
                  <strong>Score:</strong> {dbUser.assessmentScorePct}%
                </li>
              )}
              {dbUser.enrolledProgram && (
                <li>
                  <strong>Program:</strong>{' '}
                  {getProgramBySlug(dbUser.enrolledProgram)?.title ?? dbUser.enrolledProgram}
                </li>
              )}
            </ul>
            <div className="assessments-card__actions">
              <Link href="/dashboard/readiness" className="btn btn-primary">
                View Career Readiness <ArrowRight size={16} />
              </Link>
              <Link href="/dashboard/training" className="btn btn-outline">
                Go to Training
              </Link>
            </div>
          </>
        ) : (
          <>
            <div className="assessments-card__row">
              <FileQuestion size={28} className="assessments-card__icon assessments-card__icon--muted" aria-hidden />
              <h2 className="assessments-card__title">Assessment not yet completed</h2>
            </div>
            <p className="assessments-card__body--tight">
              Complete a quick 10-minute skills snapshot so we can tailor your learning path and identify support resources.
              This step is required before you can access your training courses.
            </p>
            <Link href="/dashboard/assessment" className="btn btn-primary">
              Take Assessment
            </Link>
          </>
        )}
      </div>

      <div className="assessments-why">
        <h3 className="assessments-why__title">Why we ask</h3>
        <p className="assessments-why__text">
          Your answers help counselors personalize your learning path, recommend certifications, and connect you with job
          placement resources. Results are used only to support your success.
        </p>
      </div>

      {!assessmentGated ? <SkillAssessmentForm /> : null}
    </div>
  );
}
