import { notFound } from 'next/navigation';
import { FileText, MailOpen, Mic } from 'lucide-react';
import { MemberToolkitKit } from '@/components/portal/kit/pages/member/MemberToolkitKit';

/**
 * Storybook-lite showcase — MemberToolkitKit (AI tool cards + advisor
 * transcript). No `onSend` is passed, so the advisor renders the honest
 * "no live composer" state pointing at the voice coach — matching how the
 * kit behaves with no wired backend. Preview-only, no auth/DB. See
 * app/dev/dashboard/page.tsx for the pattern.
 */
export const dynamic = 'force-dynamic';

export default function DevMemberToolkitPage() {
  if (process.env.VERCEL_ENV === 'production') notFound();

  return (
    <MemberToolkitKit
      tools={[
        { id: 'resume', icon: <FileText size={20} aria-hidden="true" />, title: 'Resume Audit', body: 'Score your resume against the role and get fix-it suggestions.', cta: 'Run Audit', href: '#' },
        { id: 'cover', icon: <MailOpen size={20} aria-hidden="true" />, title: 'Cover Letter', body: 'Generate a tailored cover letter for any saved job in seconds.', cta: 'Generate', href: '#' },
        { id: 'interview', icon: <Mic size={20} aria-hidden="true" />, title: 'Interview Prep', body: 'Practice common questions with instant AI feedback.', cta: 'Start Session', href: '#' },
      ]}
      advisorOnline
      advisorMessages={[
        { id: 'am1', from: 'other', author: 'AI', text: 'Hey Mike — I saw you saved the Deloitte Salesforce Administrator role. Want help tailoring your resume for it?' },
        { id: 'am2', from: 'self', text: 'Yes, what should I change?' },
        { id: 'am3', from: 'other', author: 'AI', text: 'Lead with your Salesforce Administrator cert and add a line about the case-study project. I can draft it — try the Resume Audit tool above.' },
      ]}
    />
  );
}
