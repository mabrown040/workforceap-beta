import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const sessionRoutePath = join(root, 'app/api/counselor/session/route.ts');
const clientPath = join(root, 'components/portal/tools/CareerCounselor.tsx');
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
const retiredPatchPath = join(
  root,
  'scripts/elevenlabs/patches/agent_2801kmznvsemfmms06r0e02es1b9.patch.json'
);

test('member Lilley session loads member context instead of staff counselor context', () => {
  const src = readFileSync(sessionRoutePath, 'utf8');

  assert.match(
    src,
    /import \{ fetchMemberPortalDynamicVariables \} from '@\/lib\/ai\/elevenlabsPortalContext';/
  );
  assert.match(src, /fetchMemberPortalDynamicVariables\(user\.id\)/);
  assert.doesNotMatch(src, /fetchCounselorPortalDynamicVariables/);
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
});

test('Lilley action plans and saved history stay student-facing', () => {
  const src = readFileSync(feedbackRoutePath, 'utf8');

  assert.match(src, /student-facing AI career coach/);
  assert.match(src, /Lilley career-coaching transcript/);
  assert.match(src, /Lilley career-coaching session/);
  assert.match(src, /coachLabel: 'Lilley Career Coach'/);
  assert.doesNotMatch(src, /Career readiness voice coach|Career counselor action-plan/);
});

test('Lilley fallback targets the active migrated ElevenLabs agent', () => {
  const src = readFileSync(agentsPath, 'utf8');

  assert.match(
    src,
    /counselor: 'agent_1101kqfjfm8retm8j6md467wzxdb'/
  );
  assert.match(src, /RETIRED_COUNSELOR_AGENT_IDS\.has\(fromEnv\)/);
  assert.match(src, /agent_2801kmznvsemfmms06r0e02es1b9/);
});

test('the active ElevenLabs patch is student-facing and cannot restore the staff prompt', () => {
  assert.equal(existsSync(retiredPatchPath), false);

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
  const sources = [
    readFileSync(portalPagePath, 'utf8'),
    readFileSync(voiceSurfacePath, 'utf8'),
    readFileSync(voicePromoPath, 'utf8'),
    readFileSync(voiceStudioPath, 'utf8'),
    readFileSync(historyPagePath, 'utf8'),
  ].join('\n');

  assert.match(sources, /Lilley, Your AI Career Coach/);
  assert.match(sources, /Lilley Career Coach/);
  assert.match(sources, /badge: 'LILLEY'/);
  assert.doesNotMatch(sources, /Private voice session|AI Career Counselor|title="Career Counselor"/);

  for (const locale of ['en', 'es', 'fr', 'pt']) {
    const messages = JSON.parse(readFileSync(join(root, `messages/${locale}.json`), 'utf8')) as {
      nav?: { aiCounselor?: string };
      marketing?: { common?: { aiCounselor?: string } };
    };
    assert.equal(messages.nav?.aiCounselor, 'Lilley');
    assert.match(messages.marketing?.common?.aiCounselor ?? '', /^Lilley/);
  }
});
