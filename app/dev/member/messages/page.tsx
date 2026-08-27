import { notFound } from 'next/navigation';
import { MemberMessagesEmpty } from '@/components/portal/kit/pages/member/MemberMessagesEmpty';
import { MemberMessagesKit } from '@/components/portal/kit/pages/member/MemberMessagesKit';

/**
 * Storybook-lite showcase — MemberMessagesKit (unread conversation list +
 * an open thread). No `memberUserId`/`threadId`/`onSend` are passed, so the
 * kit stays fully local (no Supabase realtime, no /api/member/messages POST).
 *   /dev/member/messages            — populated inbox
 *   /dev/member/messages?state=empty — provisioning empty (live no-member-row)
 * Preview-only, no auth/DB. See app/dev/dashboard/page.tsx for the pattern.
 */
export const dynamic = 'force-dynamic';

export default async function DevMemberMessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  if (process.env.VERCEL_ENV === 'production') notFound();
  const { state } = await searchParams;
  if (state === 'empty') {
    return <MemberMessagesEmpty />;
  }

  return (
    <MemberMessagesKit
      conversations={[
        { id: 'sarah', name: 'Sarah Chen', role: 'Counselor', preview: 'AWS Practitioner at 78%. Deloitte interview is next.', unread: true, active: true },
        { id: 'team', name: 'WorkforceAP Team', role: 'Support', preview: 'Your AWS exam voucher is ready.', unread: true },
        { id: 'jasmine', name: 'Jasmine Davis', role: 'Peer Cohort', preview: 'Anyone free to do a mock interview Thursday?' },
      ]}
      activeName="Sarah Chen"
      activeRole="Career Counselor"
      activeInitials="SC"
      activeOnline
      messages={[
        { id: 'm1', from: 'other', author: 'SC', text: 'AWS Practitioner is at 78%. The Deloitte interview is next — want to walk the technical questions?' },
        { id: 'm2', from: 'self', text: 'The technical questions are the gap.' },
        {
          id: 'm3',
          from: 'other',
          author: 'SC',
          text: 'Thursday mock interview. Use Interview prep in Career Studio for Salesforce admin roles.',
        },
        { id: 'm4', from: 'self', text: 'Thursday works.' },
        { id: 'm5', from: 'other', author: 'SC', text: 'Thursday 2pm CT. Calendar invite next.' },
      ]}
    />
  );
}
