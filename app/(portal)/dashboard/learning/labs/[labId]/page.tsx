import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getUser } from '@/lib/auth/server';
import { IT_SUPPORT_LAB_SCOPE, IT_SUPPORT_LAB_COURSE_SLUG } from '@/lib/content/itSupportLabs';
import { loadLabWorkspace } from '@/lib/member/labWorkspace';
import { MemberLabWorkspace } from '@/components/portal/MemberLabWorkspace';
import { DesignSurface, PageOpener } from '@/components/portal/kit';

export const metadata: Metadata = {
  title: 'Practice lab | WorkforceAP',
  description: 'Work through an assigned practice lab, save private evidence, and submit a version for review.',
  robots: { index: false, follow: false },
};

export default async function MemberLabPage({ params }: { params: Promise<{ labId: string }> }) {
  const { labId } = await params;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(labId) || labId.length > 180) notFound();
  const destination = `/dashboard/learning/labs/${encodeURIComponent(labId)}`;
  const user = await getUser();
  if (!user) redirect(`/login?redirectTo=${encodeURIComponent(destination)}`);
  let workspace;
  try { workspace = await loadLabWorkspace({ userId: user.id, labId }); }
  catch (error) {
    console.error('[member-lab] Workspace load failed', error);
    return <DesignSurface surface="warm"><section style={{ padding: 'var(--wa-pad-sm)' }}>
      <PageOpener kicker="Practice lab" title="Your lab could not be loaded" lede="We could not retrieve your lab work. Try loading the page again." />
      <Link href={destination} className="wa-kit-cta wa-kit-focus">Try again</Link>
    </section></DesignSurface>;
  }
  if (!workspace) return <DesignSurface surface="warm"><section style={{ padding: 'var(--wa-pad-sm)' }}>
    <PageOpener kicker="Practice lab" title="This lab is not available in your assignment" lede="Open your program to see the practice available for your assigned curriculum." />
    <Link href="/dashboard/program" className="wa-kit-cta wa-kit-focus">Back to my program</Link>
  </section></DesignSurface>;
  return <MemberLabWorkspace key={`${workspace.programSlug}:${workspace.curriculumVersion}:${workspace.lab.id}:${workspace.lab.contentVersion}`} workspace={workspace} scopeNote={IT_SUPPORT_LAB_SCOPE.estimateNote} returnCourseSlug={IT_SUPPORT_LAB_COURSE_SLUG} />;
}
