import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildApplicationEmailPacket,
  bucketCommandCenterTotals,
  type AdminCommandCenter,
} from './commandCenterHelpers';

const baseCenter: AdminCommandCenter = {
  needsReply: [],
  atRisk: [],
  interviewing: [],
  applicationsPending: [],
  programHealth: [],
  totals: {
    needsReplyCount: 0,
    atRiskCount: 0,
    interviewingCount: 0,
    applicationsPendingCount: 0,
    certificationsPendingCount: 0,
    oldestPendingApplicationDays: null,
  },
};

describe('admin command center helpers', () => {
  it('builds a plain-English email packet from applicant data', () => {
    const packet = buildApplicationEmailPacket({
      applicantName: 'Jordan Lee',
      applicantEmail: 'jordan@example.com',
      programLabel: 'Cybersecurity Analyst',
      submittedDaysAgo: 9,
      recommendedCareerTitle: 'Information Security Analyst',
    });

    assert.equal(packet.subject, 'Next steps for your WorkforceAP application');
    assert.match(packet.body, /Hi Jordan/);
    assert.match(packet.body, /Cybersecurity Analyst/);
    assert.match(packet.body, /9 days ago/);
    assert.match(packet.body, /Information Security Analyst/);
    assert.match(packet.mailto, /mailto:jordan%40example\.com/);
    assert.match(packet.mailto, /subject=Next%20steps%20for%20your%20WorkforceAP%20application/);
  });

  it('summarizes all four dad command-center buckets', () => {
    const totals = bucketCommandCenterTotals({
      ...baseCenter,
      needsReply: [
        {
          memberId: 'member-1',
          memberName: 'Ava',
          memberEmail: 'ava@example.com',
          threadId: 'thread-1',
          lastMessageBody: 'Can you help?',
          lastMessageAt: new Date('2026-06-01T12:00:00Z'),
          hoursWaiting: 50,
        },
      ],
      atRisk: [
        {
          memberId: 'member-2',
          memberName: 'Ben',
          memberEmail: 'ben@example.com',
          daysInactive: 15,
          enrolledProgram: 'data-analytics',
        },
      ],
      interviewing: [
        {
          memberId: 'member-3',
          memberName: 'Cam',
          memberEmail: 'cam@example.com',
          company: 'Acme',
          role: 'Help Desk Analyst',
          statusLabel: 'Interviewing',
          nextInterviewDate: new Date('2026-06-20T15:00:00Z'),
        },
      ],
      applicationsPending: [
        {
          applicationId: 'app-1',
          memberId: 'member-4',
          memberName: 'Dee',
          memberEmail: 'dee@example.com',
          phone: null,
          programLabel: 'IT Support',
          status: 'PENDING',
          statusLabel: 'Waiting for review',
          submittedAt: new Date('2026-06-01T00:00:00Z'),
          submittedDaysAgo: 14,
          recommendedCareerTitle: null,
          emailPacket: buildApplicationEmailPacket({
            applicantName: 'Dee',
            applicantEmail: 'dee@example.com',
            programLabel: 'IT Support',
            submittedDaysAgo: 14,
            recommendedCareerTitle: null,
          }),
        },
      ],
    });

    assert.deepEqual(totals, {
      needsReplyCount: 1,
      atRiskCount: 1,
      interviewingCount: 1,
      applicationsPendingCount: 1,
      certificationsPendingCount: 0,
      oldestPendingApplicationDays: 14,
    });
  });
});
