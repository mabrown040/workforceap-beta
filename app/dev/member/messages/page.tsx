import { notFound } from 'next/navigation';
import { MemberMessagesKit } from '@/components/portal/kit/pages/member/MemberMessagesKit';

/**
 * Storybook-lite showcase — MemberMessagesKit (unread conversation list +
 * an open thread). No `memberUserId`/`threadId`/`onSend` are passed, so the
 * kit stays fully local (no Supabase realtime, no /api/member/messages POST).
 * Preview-only, no auth/DB. See app/dev/dashboard/page.tsx for the pattern.
 */
export const dynamic = 'force-dynamic';

export default function DevMemberMessagesPage() {
  if (process.env.VERCEL_ENV === 'production') notFound();

  return (
    <MemberMessagesKit
      conversations={[
        { id: 'sarah', name: 'Sarah Chen', role: 'Your Counselor', preview: "Great progress this week! Let's talk about…", unread: true, active: true },
        { id: 'team', name: 'WorkforceAP Team', role: 'Support', preview: 'Your AWS exam voucher is ready.', unread: true },
        { id: 'jasmine', name: 'Jasmine Davis', role: 'Peer Cohort', preview: 'Anyone free to do a mock interview Thursday?' },
      ]}
      activeName="Sarah Chen"
      activeRole="Career Counselor"
      activeInitials="SC"
      activeOnline
      messages={[
        { id: 'm1', from: 'other', author: 'SC', text: 'Hi Mike! Great progress — 78% on AWS Practitioner. How are you feeling about the Deloitte interview?' },
        { id: 'm2', from: 'self', text: 'A little nervous about the technical questions honestly.' },
        {
          id: 'm3',
          from: 'other',
          author: 'SC',
          text: "Totally normal. Let's do a mock interview Thursday. I'll also flag the Interview Prep tool in your Career Toolkit — it's tuned for Salesforce admin roles.",
        },
        { id: 'm4', from: 'self', text: 'That would help a lot, thank you.' },
        { id: 'm5', from: 'other', author: 'SC', text: "Booked you for Thursday 2pm CT. I'll send the calendar invite in a few." },
      ]}
    />
  );
}
