import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildCertificateShare,
  buildShareAchievementPath,
  buildSkillCheckpointShare,
} from './shareAchievementLinks';

test('buildShareAchievementPath encodes skill checkpoint achievement without member PII', () => {
  const path = buildShareAchievementPath({
    kind: 'skill-checkpoint',
    skillName: 'Customer escalation triage',
    programTitle: 'IT Support Professional Certificate',
    courseName: 'Technical Support Fundamentals',
    scoreLabel: '3/4 correct',
  });

  assert.equal(
    path,
    '/share/achievement?type=skill-checkpoint&skill=Customer+escalation+triage&program=IT+Support+Professional+Certificate&course=Technical+Support+Fundamentals&score=3%2F4+correct',
  );
  assert.equal(path.includes('name='), false);
});

test('buildSkillCheckpointShare returns native-share-ready title text and absolute URL', () => {
  const share = buildSkillCheckpointShare({
    origin: 'https://example.org',
    skillName: 'Incident response',
    programTitle: 'Cybersecurity Professional Certificate',
    courseName: 'Security Operations',
    correct: 4,
    total: 5,
  });

  assert.equal(share.url, 'https://example.org/share/achievement?type=skill-checkpoint&skill=Incident+response&program=Cybersecurity+Professional+Certificate&course=Security+Operations&score=4%2F5+correct');
  assert.equal(share.title, 'Skill demonstrated: Incident response');
  assert.equal(share.text, 'I completed a WorkforceAP Skill Checkpoint for Incident response and scored 4/5.');
});

test('buildCertificateShare returns certificate share payload with date metadata', () => {
  const share = buildCertificateShare({
    origin: 'https://example.org',
    certificateTitle: 'Google IT Support Professional Certificate',
    earnedAtIso: '2026-06-14T12:00:00.000Z',
  });

  assert.equal(share.url, 'https://example.org/share/achievement?type=certificate&title=Google+IT+Support+Professional+Certificate&issuer=WorkforceAP&date=2026-06-14');
  assert.equal(share.title, 'Certificate earned: Google IT Support Professional Certificate');
  assert.equal(share.text, 'I recorded my Google IT Support Professional Certificate in WorkforceAP.');
});
