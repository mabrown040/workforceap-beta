import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  getElevenLabsAgentId,
  LILLEY_STUDENT_COACH_AGENT_ID,
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
  `scripts/elevenlabs/patches/${LILLEY_STUDENT_COACH_AGENT_ID}.patch.json`
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

test('member Lilley surfaces accept only the reviewed student agent while staff remains separate', (t) => {
  const previousMember = process.env.ELEVENLABS_COUNSELOR_AGENT_ID;
  const previousCareerBusiness = process.env.ELEVENLABS_CAREER_BUSINESS_AGENT_ID;
  const previousStaff = process.env.ELEVENLABS_COUNSELOR_STAFF_AGENT_ID;
  t.after(() => {
    if (previousMember === undefined) delete process.env.ELEVENLABS_COUNSELOR_AGENT_ID;
    else process.env.ELEVENLABS_COUNSELOR_AGENT_ID = previousMember;
    if (previousCareerBusiness === undefined) delete process.env.ELEVENLABS_CAREER_BUSINESS_AGENT_ID;
    else process.env.ELEVENLABS_CAREER_BUSINESS_AGENT_ID = previousCareerBusiness;
    if (previousStaff === undefined) delete process.env.ELEVENLABS_COUNSELOR_STAFF_AGENT_ID;
    else process.env.ELEVENLABS_COUNSELOR_STAFF_AGENT_ID = previousStaff;
  });
  delete process.env.ELEVENLABS_COUNSELOR_AGENT_ID;
  delete process.env.ELEVENLABS_CAREER_BUSINESS_AGENT_ID;
  delete process.env.ELEVENLABS_COUNSELOR_STAFF_AGENT_ID;

  assert.equal(getElevenLabsAgentId('counselor'), LILLEY_STUDENT_COACH_AGENT_ID);
  assert.equal(getElevenLabsAgentId('career_business'), LILLEY_STUDENT_COACH_AGENT_ID);
  assert.equal(getElevenLabsAgentId('counselor_staff'), undefined);

  process.env.ELEVENLABS_COUNSELOR_AGENT_ID = 'agent_1101kqfjfm8retm8j6md467wzxdb';
  process.env.ELEVENLABS_CAREER_BUSINESS_AGENT_ID = 'agent_unreviewed_member_voice';
  assert.equal(getElevenLabsAgentId('counselor'), LILLEY_STUDENT_COACH_AGENT_ID);
  assert.equal(getElevenLabsAgentId('career_business'), LILLEY_STUDENT_COACH_AGENT_ID);

  process.env.ELEVENLABS_COUNSELOR_AGENT_ID = 'agent_unreviewed_member_voice';
  assert.equal(getElevenLabsAgentId('counselor'), LILLEY_STUDENT_COACH_AGENT_ID);

  process.env.ELEVENLABS_COUNSELOR_AGENT_ID = LILLEY_STUDENT_COACH_AGENT_ID;
  process.env.ELEVENLABS_CAREER_BUSINESS_AGENT_ID = LILLEY_STUDENT_COACH_AGENT_ID;
  assert.equal(getElevenLabsAgentId('counselor'), LILLEY_STUDENT_COACH_AGENT_ID);
  assert.equal(getElevenLabsAgentId('career_business'), LILLEY_STUDENT_COACH_AGENT_ID);

  process.env.ELEVENLABS_COUNSELOR_STAFF_AGENT_ID = 'agent_configured_staff';
  assert.equal(getElevenLabsAgentId('counselor_staff'), 'agent_configured_staff');

  const src = readFileSync(agentsPath, 'utf8');

  assert.match(src, /counselor: LILLEY_STUDENT_COACH_AGENT_ID/);
  assert.match(src, /career_business: LILLEY_STUDENT_COACH_AGENT_ID/);
  assert.doesNotMatch(src, /counselor_staff:\s*'agent_/);
  assert.match(src, /REVIEWED_LILLEY_STUDENT_COACH_AGENT_IDS\.has\(fromEnv\)/);
});

test('the active ElevenLabs patch is student-facing and cannot restore the staff prompt', () => {
  const patch = JSON.parse(readFileSync(livePatchPath, 'utf8')) as {
    name?: string;
    conversation_config?: {
      agent?: { first_message?: string; prompt?: { prompt?: string; llm?: string } };
      tts?: { voice_id?: string };
    };
  };
  const firstMessage = patch.conversation_config?.agent?.first_message ?? '';
  const prompt = patch.conversation_config?.agent?.prompt?.prompt ?? '';

  assert.equal(patch.name, 'Lilley - WorkforceAP Student Career Coach');
  assert.equal(patch.conversation_config?.tts?.voice_id, 'l4Coq6695JDX9xtLqXDE');
  assert.equal(patch.conversation_config?.agent?.prompt?.llm, 'gpt-5.6-luna');
  assert.match(firstMessage, /I'm Lilley, your WorkforceAP AI career coach/);
  assert.match(prompt, /student-facing AI Career Coach/);
  assert.match(prompt, /You do not assist counselors with caseloads/);
  assert.match(prompt, /\{\{member_name\}\}/);
  assert.match(prompt, /\{\{program_title\}\}/);
  assert.match(prompt, /\{\{program_skills\}\}/);
  assert.match(prompt, /\{\{coach_memory_summary\}\}/);
  assert.doesNotMatch(prompt, /\{\{staff_name\}\}|\{\{partner_name\}\}/);
  assert.doesNotMatch(prompt, /support career counselors and staff/);
  assert.match(prompt, /FINAL SPOKEN-OUTPUT CHECK/);
  assert.match(prompt, /inspect the first sentence/);
  assert.match(prompt, /generic empathy, an emotion paraphrase, or a stock opener/);
  assert.match(prompt, /Start ordinary coaching replies with useful substance/);
  assert.match(prompt, /Do not preface that substance with generic empathy/);
  assert.match(prompt, /If a proposed first sentence only paraphrases emotion, delete it/);
  assert.match(prompt, /Never begin consecutive ordinary-coaching turns with the same wording/);
  assert.match(prompt, /repeat the exact STATE 2 safety question whenever STATE 2 requires it/);
  assert.match(prompt, /When personal-life stress affects work or training/);
  assert.match(prompt, /Offer a tiny career step only when the student explicitly asks to return to a career topic/);
  assert.match(prompt, /SAFETY STATE MACHINE/);
  assert.match(prompt, /Never skip a state, infer an answer/);
  assert.match(prompt, /STATE 1 — ORDINARY COACHING/);
  assert.match(prompt, /Earlier career context does not make an unqualified statement career-only/);
  assert.match(prompt, /named-task language as career-only only when the same turn contains no broader-life/);
  assert.match(
    prompt,
    /do you mean quitting the job search or training, or are you thinking about suicide or hurting yourself right now\?/
  );
  assert.match(prompt, /Say only that sentence\. Then move to STATE 2/);
  assert.match(prompt, /directly states that they are currently thinking about suicide/);
  assert.match(prompt, /A denial, quotation, hypothetical question, or discussion of someone else's situation is not a positive disclosure/);
  assert.match(prompt, /STATE 2 — WAITING FOR A DIRECT SAFETY ANSWER/);
  assert.match(prompt, /Stay in this state until the student directly answers/);
  assert.match(prompt, /A CLEAR DENIAL must explicitly deny current suicidal or self-harm thoughts/);
  assert.match(prompt, /"I am safe," "I mean life," "I don't know,"/);
  assert.match(prompt, /saying there is no plan is not a clear denial/);
  assert.match(prompt, /Are you thinking about suicide or hurting yourself right now\?/);
  assert.match(prompt, /remain in STATE 2/);
  assert.match(prompt, /A refusal to answer or a statement such as "I do not want to talk about it" is an evasive non-answer/);
  assert.match(prompt, /Do not preface it with empathy, explanation, or "I need a direct answer,"/);
  assert.match(prompt, /do not add any other words/);
  assert.match(prompt, /do not mention 988 or emergency services/);
  assert.match(prompt, /Start exactly with "Okay\."/);
  assert.match(prompt, /Do not summarize their emotions/);
  assert.match(prompt, /After a CLEAR DENIAL, if the student means broader life stress/);
  assert.match(prompt, /do not redirect into career coaching/);
  assert.match(prompt, /My role is career coaching, so I cannot guide personal-life concerns/);
  assert.match(prompt, /We can pause here, or I can help you identify a trusted person or human support to contact/);
  assert.match(prompt, /Would you like to pause, or would you like help identifying a trusted person or human support/);
  assert.match(prompt, /Resume career coaching only if the student explicitly asks for it/);
  assert.match(prompt, /STATE 3 — POSSIBLE SELF-HARM OR HARM TO OTHERS/);
  assert.match(prompt, /Ordinary career coaching remains paused/);
  assert.match(prompt, /already stated immediate danger or a plan to act, do not ask them to restate it/);
  assert.match(prompt, /immediately give the emergency guidance below/);
  assert.match(prompt, /no immediate danger or no plan, that does not clear STATE 3/);
  assert.match(prompt, /A later "no plan" or "not in immediate danger" never returns/);
  assert.match(prompt, /vary wording only when no exact sentence is mandated/);
  assert.match(prompt, /Respond directly to the student's newest barrier/);
  assert.match(prompt, /call or text 988/);
  assert.match(prompt, /call 911 or local emergency services now/);
  assert.match(prompt, /Do not invent or assume the student's enrollment, grades, progress, funding/);
  assert.match(prompt, /Never claim that Coursera access[\s\S]*approved or guaranteed/);
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
