import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  getElevenLabsAgentId,
  resolveCounselorVoiceSessionPlan,
} from './ai/elevenlabsAgents';
import {
  appendVoiceTranscriptTurn,
  extractVoiceTranscriptTurn,
  type VoiceTranscriptTurn,
} from './interview/voiceTranscript';

const root = process.cwd();
const sessionRoutePath = join(root, 'app/api/counselor/session/route.ts');
const clientPath = join(root, 'components/portal/tools/CareerCounselor.tsx');
const staffClientPath = join(root, 'components/portal/CounselorPortalVoiceBlock.tsx');
const feedbackRoutePath = join(root, 'app/api/counselor/feedback/route.ts');
const agentsPath = join(root, 'lib/ai/elevenlabsAgents.ts');
const portalPagePath = join(root, 'app/(portal)/dashboard/counselor/page.tsx');
const voiceSurfacePath = join(root, 'lib/portal/voiceAgentSurfaces.ts');
const voicePromoPath = join(root, 'components/portal/VoiceCoachesPromo.tsx');
const voiceStudioPath = join(root, 'components/portal/kit/pages/VoiceStudioKit.tsx');
const historyPagePath = join(root, 'app/(portal)/dashboard/ai-tools/history/page.tsx');
const livePatchPath = join(
  root,
  'scripts/elevenlabs/patches/agent_1101kqfjfm8retm8j6md467wzxdb.patch.json'
);
test('voice session policy keeps member Lilley and authorized staff contexts separate', () => {
  assert.deepEqual(resolveCounselorVoiceSessionPlan('member', false), {
    ok: true,
    audience: 'member',
    contextKind: 'member',
    agentKey: 'counselor',
  });
  assert.deepEqual(resolveCounselorVoiceSessionPlan(undefined, false), {
    ok: true,
    audience: 'member',
    contextKind: 'member',
    agentKey: 'counselor',
  });
  assert.deepEqual(resolveCounselorVoiceSessionPlan('staff', false), {
    ok: false,
    status: 403,
    error: 'Forbidden',
  });
  assert.deepEqual(resolveCounselorVoiceSessionPlan('staff', true), {
    ok: true,
    audience: 'staff',
    contextKind: 'staff',
    agentKey: 'counselor_staff',
  });
});

test('shared voice route enforces staff authorization and selects the planned context', () => {
  const src = readFileSync(sessionRoutePath, 'utf8');
  const staffClient = readFileSync(staffClientPath, 'utf8');

  assert.match(src, /requestedAudience === 'staff'/);
  assert.match(src, /await isCounselor\(user\.id\)/);
  assert.match(src, /await isAdmin\(user\.id\)/);
  assert.match(src, /resolveCounselorVoiceSessionPlan\(requestedAudience, canUseStaffVoice\)/);
  assert.match(src, /if \(!plan\.ok\)/);
  assert.match(src, /plan\.contextKind === 'staff'/);
  assert.match(src, /fetchCounselorPortalDynamicVariables\(user\.id\)/);
  assert.match(src, /fetchMemberPortalDynamicVariables\(user\.id\)/);
  assert.match(src, /startElevenLabsPortalSession\(plan\.agentKey/);
  assert.match(staffClient, /sessionPayload=\{\{ audience: 'staff' \}\}/);
});

test('member Lilley client forwards the server-provided dynamic variables', () => {
  const src = readFileSync(clientPath, 'utf8');

  assert.match(src, /dynamicVariables\?: Record<string, string \| number \| boolean>/);
  assert.match(src, /dynamicVariables = data\.dynamicVariables/);
  assert.match(src, /Conversation\.startSession\(\{[\s\S]*dynamicVariables/);
  assert.match(src, /voice session is processed by ElevenLabs/);
  assert.match(src, /transcript is analyzed by an AI provider/);
  assert.match(src, /saved to your WorkforceAP AI history and coach memory/);
  assert.match(src, /may be emailed to configured[\s\S]*WorkforceAP support recipients/);
  assert.match(src, /aria-describedby="lilley-data-use"/);
  assert.match(src, /JSON\.stringify\(\{ audience: 'member' \}\)/);
  assert.match(src, /extractVoiceTranscriptTurn\(event\)/);
  assert.match(src, /appendVoiceTranscriptTurn\(transcriptRef\.current, turn\)/);
});

test('normalized SDK messages produce a non-empty member feedback payload', () => {
  const events = [
    { role: 'user', message: 'I need help choosing my next training step.' },
    { role: 'agent', message: 'Let us narrow that to one action you can take today.' },
  ];
  let transcript: VoiceTranscriptTurn[] = [];

  for (const event of events) {
    transcript = appendVoiceTranscriptTurn(transcript, extractVoiceTranscriptTurn(event));
  }

  const feedbackPayload = JSON.parse(JSON.stringify({ transcript })) as {
    transcript: VoiceTranscriptTurn[];
  };
  assert.deepEqual(feedbackPayload.transcript, [
    { role: 'user', text: 'I need help choosing my next training step.' },
    { role: 'agent', text: 'Let us narrow that to one action you can take today.' },
  ]);
  assert.ok(feedbackPayload.transcript.length > 0);
});

test('Lilley action plans and saved history stay student-facing', () => {
  const src = readFileSync(feedbackRoutePath, 'utf8');

  assert.match(src, /student-facing AI career coach/);
  assert.match(src, /Lilley career-coaching transcript/);
  assert.match(src, /Lilley career-coaching session/);
  assert.match(src, /coachLabel: 'Lilley Career Coach'/);
  assert.doesNotMatch(src, /Career readiness voice coach|Career counselor action-plan/);
});

test('Lilley and staff counselor fallbacks target separate ElevenLabs agents', (t) => {
  const previousMember = process.env.ELEVENLABS_COUNSELOR_AGENT_ID;
  const previousStaff = process.env.ELEVENLABS_COUNSELOR_STAFF_AGENT_ID;
  t.after(() => {
    if (previousMember === undefined) delete process.env.ELEVENLABS_COUNSELOR_AGENT_ID;
    else process.env.ELEVENLABS_COUNSELOR_AGENT_ID = previousMember;
    if (previousStaff === undefined) delete process.env.ELEVENLABS_COUNSELOR_STAFF_AGENT_ID;
    else process.env.ELEVENLABS_COUNSELOR_STAFF_AGENT_ID = previousStaff;
  });
  delete process.env.ELEVENLABS_COUNSELOR_AGENT_ID;
  delete process.env.ELEVENLABS_COUNSELOR_STAFF_AGENT_ID;

  assert.equal(getElevenLabsAgentId('counselor'), 'agent_1101kqfjfm8retm8j6md467wzxdb');
  assert.equal(getElevenLabsAgentId('counselor_staff'), 'agent_2801kmznvsemfmms06r0e02es1b9');

  const src = readFileSync(agentsPath, 'utf8');

  assert.match(src, /counselor: 'agent_1101kqfjfm8retm8j6md467wzxdb'/);
  assert.match(src, /counselor_staff: 'agent_2801kmznvsemfmms06r0e02es1b9'/);
  assert.match(src, /RETIRED_COUNSELOR_AGENT_IDS\.has\(fromEnv\)/);
});

test('the active ElevenLabs patch is student-facing and cannot restore the staff prompt', () => {
  const patch = JSON.parse(readFileSync(livePatchPath, 'utf8')) as {
    name?: string;
    conversation_config?: {
      agent?: { first_message?: string; prompt?: { prompt?: string } };
    };
  };
  const firstMessage = patch.conversation_config?.agent?.first_message ?? '';
  const prompt = patch.conversation_config?.agent?.prompt?.prompt ?? '';

  assert.equal(patch.name, 'Lilley - WorkforceAP Student Career Coach');
  assert.match(firstMessage, /I'm Lilley, your WorkforceAP AI career coach/);
  assert.match(prompt, /student-facing AI Career Coach/);
  assert.match(prompt, /You do not assist counselors with caseloads/);
  assert.match(prompt, /\{\{member_name\}\}/);
  assert.match(prompt, /\{\{program_title\}\}/);
  assert.match(prompt, /\{\{program_skills\}\}/);
  assert.match(prompt, /\{\{coach_memory_summary\}\}/);
  assert.doesNotMatch(prompt, /\{\{staff_name\}\}|\{\{partner_name\}\}/);
  assert.doesNotMatch(prompt, /support career counselors and staff/);
});

test('member portal surfaces consistently present Lilley as an AI career coach', () => {
  const promoSource = readFileSync(voicePromoPath, 'utf8');
  const sources = [
    readFileSync(portalPagePath, 'utf8'),
    readFileSync(voiceSurfacePath, 'utf8'),
    promoSource,
    readFileSync(voiceStudioPath, 'utf8'),
    readFileSync(historyPagePath, 'utf8'),
  ].join('\n');

  assert.match(sources, /Lilley, Your AI Career Coach/);
  assert.match(sources, /Lilley Career Coach/);
  assert.match(sources, /badge: 'LILLEY'/);
  assert.doesNotMatch(sources, /Private voice session|AI Career Counselor|title="Career Counselor"/);
  assert.match(promoSource, /href="\/dashboard\/counselor"/);
  assert.doesNotMatch(promoSource, /agent=counselor/);

  for (const locale of ['en', 'es', 'fr', 'pt']) {
    const messages = JSON.parse(readFileSync(join(root, `messages/${locale}.json`), 'utf8')) as {
      nav?: { aiCounselor?: string };
      marketing?: { common?: { aiCounselor?: string } };
    };
    assert.equal(messages.nav?.aiCounselor, 'Lilley');
    assert.match(messages.marketing?.common?.aiCounselor ?? '', /^Lilley/);
  }
});
