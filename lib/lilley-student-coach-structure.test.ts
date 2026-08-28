import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const sessionRoutePath = join(root, 'app/api/counselor/session/route.ts');
const clientPath = join(root, 'components/portal/tools/CareerCounselor.tsx');
const agentsPath = join(root, 'lib/ai/elevenlabsAgents.ts');
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
