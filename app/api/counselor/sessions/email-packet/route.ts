import { NextResponse } from 'next/server';
import { z } from 'zod';
import { Resend } from 'resend';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { brandedEmailLayout } from '@/lib/email/template';
import { sessionPacketHtml, type SessionPacketSection } from '@/emails/session-packet';
import { resolveActOnBehalf } from '@/lib/auth/actAsSubject';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.workforceap.org';

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  return key ? new Resend(key) : null;
}

function getFrom(): string {
  return process.env.EMAIL_FROM || 'WorkforceAP <hello@workforceap.org>';
}

const bodySchema = z.object({
  memberId: z.string().uuid(),
  sessionId: z.string().uuid(),
});

/**
 * Ends an in-office session by emailing the cumulative packet to the member.
 *
 * Pulls every AIToolResult that was created during this session (matched
 * via MemberEvent.sessionId) for the subject member, formats each one as
 * a packet section, and sends a single branded email. The member also has
 * portal access to the same outputs in their AI history list.
 *
 * Per /plan-ceo-review reframe: this is the "A-to-Z in 30 min" close. The
 * member walks out of the office with a deliverable in their inbox.
 */
export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? 'Validation failed' },
      { status: 400 }
    );
  }
  const { memberId, sessionId } = parsed.data;

  // Reuse the same auth helper used by AI tool routes — counselor must
  // have an active assignment to this member; admin/super always allowed.
  const onBehalf = await resolveActOnBehalf(user.id, memberId);
  if (!onBehalf.ok) {
    return NextResponse.json({ error: onBehalf.error }, { status: onBehalf.status });
  }
  if (!onBehalf.isOnBehalf) {
    return NextResponse.json(
      { error: 'Email packet endpoint is for counselor/admin sessions only' },
      { status: 400 }
    );
  }

  const member = await prisma.user.findUnique({
    where: { id: memberId, deletedAt: null },
    select: { id: true, fullName: true, email: true },
  });
  if (!member) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 });
  }

  // Find every ai_tool_run_completed event in this session for this member.
  // Each event's entityId points to an AIToolResult row.
  const events = await prisma.memberEvent.findMany({
    where: {
      userId: memberId,
      sessionId,
      eventName: 'ai_tool_run_completed',
      entityType: 'ai_tool_result',
      entityId: { not: null },
    },
    orderBy: { createdAt: 'asc' },
    select: { entityId: true, createdAt: true },
  });

  if (events.length === 0) {
    return NextResponse.json(
      { error: 'No tools were run in this session yet — nothing to email.' },
      { status: 400 }
    );
  }

  const resultIds = events.map((e) => e.entityId).filter((id): id is string => !!id);
  const results = await prisma.aIToolResult.findMany({
    where: { id: { in: resultIds }, userId: memberId },
    select: { id: true, toolType: true, inputSummary: true, output: true, createdAt: true },
  });
  // Preserve session order
  const orderedResults = events
    .map((e) => results.find((r) => r.id === e.entityId))
    .filter((r): r is typeof results[number] => !!r);

  const sections: SessionPacketSection[] = orderedResults.map((r) => {
    if (r.toolType === 'resume_rewriter') {
      return {
        title: 'Polished resume',
        contextLine: r.inputSummary ? `Tailored to: ${r.inputSummary}` : null,
        body: r.output,
      };
    }
    if (r.toolType === 'cover_letter') {
      return {
        title: 'Tailored cover letter',
        contextLine: r.inputSummary ? `For: ${r.inputSummary}` : null,
        body: r.output,
      };
    }
    if (r.toolType === 'interview_practice') {
      // Output is a JSON array of { question, type?, tip?, exampleAnswer? }
      try {
        const parsedQs = JSON.parse(r.output) as Array<{
          question: string;
          type?: string;
          tip?: string;
          exampleAnswer?: string;
        }>;
        return {
          title: 'Interview practice questions',
          contextLine: r.inputSummary ? `For: ${r.inputSummary}` : null,
          body: '',
          asList: {
            items: parsedQs.map((q) => ({
              heading: q.question,
              tip: q.tip,
              exampleAnswer: q.exampleAnswer,
            })),
          },
        };
      } catch {
        return {
          title: 'Interview practice questions',
          contextLine: r.inputSummary ? `For: ${r.inputSummary}` : null,
          body: r.output,
        };
      }
    }
    const titleMap: Record<string, string> = {
      resume_analysis: 'Resume strength analysis',
      gap_analyzer: 'Employment gap analysis',
      job_match_scorer: 'Job match score',
      linkedin_headline: 'LinkedIn headline options',
      linkedin_about: 'LinkedIn About section',
      salary_negotiation: 'Salary negotiation script',
      career_counselor: 'Elevator pitch',
    };
    return {
      title: titleMap[r.toolType] ?? r.toolType.replace(/_/g, ' '),
      contextLine: r.inputSummary || null,
      body: r.output,
    };
  });

  const firstName = member.fullName?.trim().split(/\s+/)[0] ?? 'there';
  const sessionDate = orderedResults[0]?.createdAt
    ? orderedResults[0].createdAt.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : new Date().toLocaleDateString();
  const counselorName = onBehalf.actorName ?? 'your WorkforceAP counselor';
  const portalUrl = `${SITE_URL}/dashboard`;

  const subject = `Your session packet from ${counselorName}`;
  const innerHtml = sessionPacketHtml({
    firstName,
    counselorName,
    sessionDate,
    sections,
    portalUrl,
  });
  const html = brandedEmailLayout({
    title: subject,
    bodyHtml: innerHtml,
    ctaText: 'Open my portal',
    ctaUrl: portalUrl,
  });

  const resend = getResend();
  if (!resend) {
    console.warn('[session-packet] RESEND_API_KEY not set — packet not sent');
    return NextResponse.json(
      { ok: false, error: 'Email is not configured. Packet was not sent.' },
      { status: 503 }
    );
  }
  try {
    await resend.emails.send({
      from: getFrom(),
      to: member.email,
      subject,
      html,
    });
  } catch (err) {
    console.error('[session-packet] resend failed', err);
    return NextResponse.json({ ok: false, error: 'Email service error' }, { status: 502 });
  }

  return NextResponse.json({
    ok: true,
    sectionCount: sections.length,
    to: member.email,
  });
}
