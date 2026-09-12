import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('resend', () => ({ Resend: class MockResend {} }));
vi.mock('@/lib/email/send', () => {
  const sendBrandedEmail = vi.fn().mockResolvedValue(undefined);
  return { sendBrandedEmail, sendBrandedEmailOrThrowOnSkip: sendBrandedEmail };
});
vi.mock('@/lib/tenant/organizationBranding', () => ({ getOrganizationBranding: vi.fn() }));
import { courseAccountabilityHtml } from '@/emails/course-accountability';
import { courseKickoffHtml } from '@/emails/course-kickoff';
import { courseEnrolledHtml } from '@/emails/course-enrolled';
import { sendCourseAccountabilityEmail, sendCourseKickoffEmail, sendCourseEnrolledEmail } from '@/lib/email';
import { sendBrandedEmail } from '@/lib/email/send';

const text = (html: string) => new DOMParser().parseFromString(html, 'text/html').body.textContent!.replace(/\s+/g, ' ').trim();
const input = { firstName: 'Jordan', programName: 'IT Support' };
beforeEach(() => { vi.clearAllMocks(); vi.stubEnv('RESEND_API_KEY', 'fixture-no-network'); });
afterEach(() => { vi.unstubAllEnvs(); });

describe('funding and course-assignment email accuracy', () => {
  it('uses the exact requested funding-update body', () => {
    expect(text(courseAccountabilityHtml(input))).toBe('Hello Jordan, Your seat for the IT Support training program is reserved. We are now working to identify a WIOA training grant, another grant, and/or a scholarship to cover the cost of your training. Once funding is secured and approved, you will be officially enrolled and notified when you can begin classes. We will keep you updated throughout the funding and enrollment process.');
  });

  it.each([courseAccountabilityHtml, courseKickoffHtml, courseEnrolledHtml])('escapes member and program values without introducing HTML', (template) => {
    const html = template({ firstName: '<img src=x>', programName: 'IT & <script>alert(1)</script>' });
    const doc = new DOMParser().parseFromString(html, 'text/html');
    expect(doc.querySelector('img,script')).toBeNull();
    expect(doc.body.textContent).toContain('<img src=x>');
    expect(doc.body.textContent).toContain('IT & <script>alert(1)</script>');
  });

  it('removes unsupported claims from both immediate program-assignment emails', () => {
    for (const html of [courseKickoffHtml(input), courseEnrolledHtml(input)]) {
      expect(text(html)).toContain('program selection');
      expect(text(html)).not.toMatch(/80%|paid for|biggest predictor|easiest|starts soon|lesson one|now enrolled|start making progress/i);
    }
  });

  it('delivers the corrected funding subject and exact body without a course-start CTA', async () => {
    expect(await sendCourseAccountabilityEmail({ to: 'fixture@example.org', fullName: 'Jordan Example', programName: 'IT Support' })).toEqual({ ok: true });
    const payload = vi.mocked(sendBrandedEmail).mock.calls[0][1];
    expect(payload.subject).toBe('Your IT Support training reservation — funding update');
    expect(payload.html).toContain(courseAccountabilityHtml(input));
    expect(payload.html).not.toMatch(/paid for|80%|Open lesson one|dashboard\/training|Ready to start/i);
  });

  it('keeps both immediate email subjects, headings and links at program-next-step level', async () => {
    for (const send of [sendCourseKickoffEmail, sendCourseEnrolledEmail]) await send({ to: 'fixture@example.org', fullName: 'Jordan Example', programName: 'IT Support' });
    expect(sendBrandedEmail).toHaveBeenCalledTimes(2);
    for (const [, payload] of vi.mocked(sendBrandedEmail).mock.calls) {
      expect(payload.subject).not.toMatch(/starts soon|enrolled|paid for|80%/i);
      expect(payload.html).not.toMatch(/80%|paid for|Open lesson one|dashboard\/training|start making progress/i);
      expect(payload.html).toContain('/dashboard/program');
      expect(payload.html).toContain('View my program');
    }
  });
});
