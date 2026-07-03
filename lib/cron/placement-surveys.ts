/**
 * Placement survey automation core.
 *
 * Handles 30/60/90/180-day survey scheduling, sending, and escalation.
 * Called by the /api/cron/placement-survey route.
 */

import { prisma } from '@/lib/db/prisma';
import { issuePlacementSurveyToken } from '@/lib/security/placementSurveyToken';
import { sendPlacementSurveyEmail, sendPlacementSurveyEscalationEmail } from '@/lib/email';
import { createNotification } from '@/lib/notifications/create';
import type { PlacementSurveyWave } from '@prisma/client';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.workforceap.org';

const WAVES: { wave: PlacementSurveyWave; days: number; windowHours: number }[] = [
  { wave: 'thirty_day', days: 30, windowHours: 24 },
  { wave: 'sixty_day', days: 60, windowHours: 24 },
  { wave: 'ninety_day', days: 90, windowHours: 24 },
  { wave: 'hundred_eighty_day', days: 180, windowHours: 24 },
];

/** Waves that still block escalation for a stale (no-response) survey. */
const ESCALATABLE_WAVES: PlacementSurveyWave[] = [
  'thirty_day',
  'sixty_day',
  'ninety_day',
  'hundred_eighty_day',
];

export type SurveySendResult = {
  wave: PlacementSurveyWave;
  sent: Array<{ userId: string; email: string; surveyId: string }>;
  skipped: Array<{ userId: string; reason: string }>;
  emailFailures: Array<{ userId: string; error: string }>;
};

export type EscalationResult = {
  alerted: Array<{ userId: string; counselorEmail: string }>;
  skipped: Array<{ userId: string; reason: string }>;
  emailFailures: Array<{ userId: string; error: string }>;
};

export type DailySurveyRunResult = {
  success: boolean;
  waves: SurveySendResult[];
  escalations: EscalationResult;
};

function getSurveyDueDate(placedAt: Date, days: number): Date {
  const d = new Date(placedAt);
  d.setDate(d.getDate() + days);
  return d;
}

function inWindow(target: Date, windowHours: number): { gte: Date; lte: Date } {
  const half = (windowHours * 60 * 60 * 1000) / 2;
  return {
    gte: new Date(target.getTime() - half),
    lte: new Date(target.getTime() + half),
  };
}

/**
 * Send surveys for placements that hit their 30/60/90-day mark today.
 */
export async function sendDuePlacementSurveys(): Promise<SurveySendResult[]> {
  const results: SurveySendResult[] = [];

  for (const { wave, days, windowHours } of WAVES) {
    const now = new Date();
    const target = new Date();
    target.setDate(target.getDate() - days);
    const { gte, lte } = inWindow(target, windowHours);

    const placements = await prisma.placementRecord.findMany({
      where: {
        placedAt: { gte, lte },
        // Placement must exist; we send one survey per wave per placement
        placementSurveys: { none: { wave } },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            enrolledProgram: true,
          },
        },
      },
      take: 200,
    });

    const sent: SurveySendResult['sent'] = [];
    const skipped: SurveySendResult['skipped'] = [];
    const emailFailures: SurveySendResult['emailFailures'] = [];

    // Batch idempotency check: load all existing surveys for this wave + placement set
    const existingSurveys = await prisma.placementSurvey.findMany({
      take: 5000,
      where: {
        placementId: { in: placements.map((p) => p.id) },
        wave,
      },
      select: { placementId: true },
    });
    const existingPlacementIds = new Set(existingSurveys.map((s) => s.placementId));

    for (const placement of placements) {
      const user = placement.user;
      if (!user?.email) {
        skipped.push({ userId: placement.userId, reason: 'No email on user' });
        continue;
      }

      // Idempotency check (in-memory)
      if (existingPlacementIds.has(placement.id)) {
        skipped.push({ userId: placement.userId, reason: `Survey already exists for ${wave}` });
        continue;
      }

      // Create the row first because we need its id to mint the
      // signed token embedded in the email's survey URL. If the email
      // send subsequently fails, roll the row back (below) so the next
      // cron run will re-pick this user — otherwise the idempotency
      // filter above (`placementSurveys: { none: { wave } }` style)
      // would skip them forever despite never receiving their email.
      //
      // The in-memory idempotency check above keys on placementId+wave, but the
      // table's unique constraint is (userId, wave). A member with more than one
      // PlacementRecord in the same wave window (or a concurrent run) therefore
      // passed the check yet hit a P2002 on insert and crashed the cron. Treat
      // that collision as "already surveyed for this wave" and skip instead.
      let survey: { id: string };
      try {
        survey = await prisma.placementSurvey.create({
          data: {
            userId: placement.userId,
            placementId: placement.id,
            wave,
            sentAt: new Date(),
          },
          select: { id: true },
        });
      } catch (createErr) {
        const isUniqueViolation =
          typeof createErr === 'object' &&
          createErr !== null &&
          'code' in createErr &&
          (createErr as { code?: unknown }).code === 'P2002';
        if (isUniqueViolation) {
          skipped.push({
            userId: placement.userId,
            reason: `Survey already exists for ${wave} (userId+wave)`,
          });
          continue;
        }
        throw createErr;
      }

      const token = await issuePlacementSurveyToken({ surveyId: survey.id });
      const surveyUrl = `${SITE_URL}/survey/placement/${encodeURIComponent(token)}`;

      const result = await sendPlacementSurveyEmail({
        to: user.email,
        fullName: user.fullName ?? '',
        programName: user.enrolledProgram,
        surveyUrl,
        wave,
      });

      if (result.ok) {
        // Fire the in-app notification only after the email succeeds so
        // a failed-email run doesn't leave an orphan "survey ready"
        // notification pointing at a row we're about to delete.
        void createNotification({
          userId: placement.userId,
          type: 'survey_due',
          title: 'Placement survey ready',
          body: `Your ${wave.replace('_', '-day ')} placement survey is ready. It only takes 2 minutes.`,
          data: { surveyId: survey.id, wave },
        });
        sent.push({ userId: placement.userId, email: user.email, surveyId: survey.id });
      } else {
        // Rollback so the user gets re-picked on the next cron run.
        // Best-effort: if the delete itself fails (e.g. transient DB
        // hiccup), the row leaks and the user will be skipped — surface
        // both errors in the result.
        try {
          await prisma.placementSurvey.delete({ where: { id: survey.id } });
        } catch (deleteErr) {
          emailFailures.push({
            userId: placement.userId,
            error: `Email failed (${result.error ?? 'unknown'}) and rollback delete also failed (${
              deleteErr instanceof Error ? deleteErr.message : 'unknown'
            }); row leaked and user will be skipped on the next run.`,
          });
          continue;
        }
        emailFailures.push({ userId: placement.userId, error: result.error ?? 'Unknown send error' });
      }
    }

    results.push({ wave, sent, skipped, emailFailures });
  }

  return results;
}

/**
 * Escalate 30/60/90/180-day surveys with no response after 7 days.
 * Alerts the assigned counselor (or admin fallback).
 */
export async function escalateStalePlacementSurveys(): Promise<EscalationResult> {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const staleSurveys = await prisma.placementSurvey.findMany({
    where: {
      wave: { in: ESCALATABLE_WAVES },
      completedAt: null,
      sentAt: { lte: sevenDaysAgo },
      escalatedAt: null,
    },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          counselorAssignments: {
            where: { active: true },
            select: {
              counselor: {
                select: {
                  user: { select: { id: true, email: true, fullName: true } },
                },
              },
            },
            take: 1,
          },
        },
      },
      placement: {
        select: {
          employerName: true,
          jobTitle: true,
          startDate: true,
        },
      },
    },
    take: 100,
  });

  const alerted: EscalationResult['alerted'] = [];
  const skipped: EscalationResult['skipped'] = [];
  const emailFailures: EscalationResult['emailFailures'] = [];
  const skippedSurveyIds: string[] = [];

  for (const survey of staleSurveys) {
    const user = survey.user;
    const counselor = user.counselorAssignments[0]?.counselor;
    const counselorEmail = counselor?.user?.email;

    if (!counselorEmail) {
      skipped.push({ userId: user.id, reason: 'No active counselor email' });
      skippedSurveyIds.push(survey.id);
      continue;
    }

    const token = await issuePlacementSurveyToken({ surveyId: survey.id, ttlSeconds: 14 * 24 * 60 * 60 });
    const surveyUrl = `${SITE_URL}/survey/placement/${encodeURIComponent(token)}`;

    const result = await sendPlacementSurveyEscalationEmail({
      to: counselorEmail,
      counselorName: counselor.user.fullName ?? 'Counselor',
      memberName: user.fullName ?? 'Member',
      memberEmail: user.email ?? '',
      employerName: survey.placement.employerName,
      jobTitle: survey.placement.jobTitle,
      daysSincePlacement: survey.placement.startDate
        ? Math.floor((Date.now() - new Date(survey.placement.startDate).getTime()) / (1000 * 60 * 60 * 24))
        : null,
      surveyUrl,
      wave: survey.wave,
    });

    if (result.ok) {
      alerted.push({ userId: user.id, counselorEmail });
      await prisma.placementSurvey.update({
        where: { id: survey.id },
        data: { escalatedAt: new Date() },
      });

      // In-app companion to the escalation email so the counselor also sees
      // this in their notification feed, not just their inbox. Fail-soft —
      // createNotification never throws (see lib/notifications/create.ts).
      const counselorUserId = counselor.user.id;
      if (counselorUserId) {
        void createNotification({
          userId: counselorUserId,
          type: 'task_assigned',
          title: 'Placement survey follow-up needed',
          body: `${user.fullName ?? 'A member'}'s ${survey.wave.replace('_', '-day ')} placement survey has gone unanswered for 7+ days.`,
          data: { surveyId: survey.id, wave: survey.wave, memberId: user.id },
        });
      }
    } else {
      emailFailures.push({ userId: user.id, error: result.error ?? 'Unknown send error' });
    }
  }

  // Batch-update skipped surveys so we don't keep retrying them
  if (skippedSurveyIds.length > 0) {
    await prisma.placementSurvey.updateMany({
      where: { id: { in: skippedSurveyIds } },
      data: { escalatedAt: new Date() },
    });
  }

  return { alerted, skipped, emailFailures };
}

/**
 * Full daily run: send due surveys + escalate stale ones.
 */
export async function runDailyPlacementSurveyCron(): Promise<DailySurveyRunResult> {
  const waves = await sendDuePlacementSurveys();
  const escalations = await escalateStalePlacementSurveys();
  return { success: true, waves, escalations };
}
