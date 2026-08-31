import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = path.resolve(__dirname, '../..');
const source = (relativePath: string) => readFileSync(path.join(root, relativePath), 'utf8');
const compact = (value: string) => value.replace(/\s+/g, ' ');

const REQUIRED_ACCOUNT_FACTS = 'saved next-step, program, and progress facts';
const REQUIRED_PROVIDER_PROCESSING =
  'ElevenLabs processes your microphone audio and live transcript during this session';
const REQUIRED_APPLICATION_PERSISTENCE =
  'saves it to your AI history and uses it to update coach memory';
const REQUIRED_EMAIL_DISCLOSURE =
  'may also email the transcript to configured WorkforceAP support recipients';

describe('member voice data-use disclosures', () => {
  it('discloses the main Lilley transfer and completion persistence before Start', () => {
    const page = source('app/(portal)/dashboard/counselor/page.tsx');
    const counselor = source('components/portal/tools/CareerCounselor.tsx');
    const counselorText = compact(counselor);
    const completion = source('app/api/counselor/feedback/route.ts');
    const notice = counselor.indexOf('id="lilley-data-use"');
    const start = counselor.indexOf('Start Session', notice);

    expect(page).toContain('<CareerCounselor firstName={firstName} />');
    expect(counselorText).toContain(REQUIRED_PROVIDER_PROCESSING);
    expect(counselorText).toContain(REQUIRED_ACCOUNT_FACTS);
    expect(counselorText).toContain('through approved read-only tools');
    expect(counselorText).toContain(REQUIRED_APPLICATION_PERSISTENCE);
    expect(counselorText).toContain(REQUIRED_EMAIL_DISCLOSURE);
    expect(counselor).toContain('href="/privacy"');
    expect(counselor).toContain('aria-describedby="lilley-data-use"');
    expect(notice).toBeGreaterThan(-1);
    expect(start).toBeGreaterThan(notice);

    expect(completion).toContain("'career_counselor'");
    expect(completion).toContain('await saveAIToolResult(');
    expect(completion).toContain('updateCoachMemory({ userId: user.id');
    expect(completion).toContain('getVoiceCoachTranscriptRecipients()');
    expect(completion).toContain('sendVoiceCoachTranscriptEmail({');
  });

  it('discloses the legacy career/business transfer and completion persistence', () => {
    const business = source('components/portal/kit/pages/member/CareerBusinessCoachKit.tsx');
    const voiceSession = source('components/portal/PortalVoiceSession.tsx');
    const completion = source('app/api/member/career-business-coach/completion/route.ts');

    expect(business).toContain('sessionEndpoint="/api/member/career-business-coach/voice-session"');
    expect(business).toContain('completionEndpoint="/api/member/career-business-coach/completion"');
    expect(business).toContain(REQUIRED_PROVIDER_PROCESSING);
    expect(business).toContain(REQUIRED_ACCOUNT_FACTS);
    expect(business).toContain('through approved read-only tools');
    expect(business).toContain(REQUIRED_APPLICATION_PERSISTENCE);
    expect(business).toContain(REQUIRED_EMAIL_DISCLOSURE);
    expect(voiceSession).toContain('{dataUseNotice}');
    expect(voiceSession).toContain('<a href="/privacy"');

    expect(completion).toContain("'Career and business coach voice session'");
    expect(completion).toContain('await saveAIToolResult(');
    expect(completion).toContain('updateCoachMemory({ userId: user.id');
    expect(completion).toContain('getVoiceCoachTranscriptRecipients()');
    expect(completion).toContain('sendVoiceCoachTranscriptEmail({');
  });

  it('distinguishes inline Voice Studio non-persistence from provider processing', () => {
    const studio = source('components/portal/kit/pages/VoiceStudioKit.tsx');

    expect(studio.match(/dataUseNotice: LILLEY_DATA_USE_NOTICE/g)).toHaveLength(2);
    expect(studio).toContain(REQUIRED_PROVIDER_PROCESSING);
    expect(studio).toContain(REQUIRED_ACCOUNT_FACTS);
    expect(studio).toContain('through approved read-only tools');
    expect(studio).toContain(
      'This AI Career Tools session does not save the transcript to your WorkforceAP AI history or coach memory',
    );
    expect(studio).toContain("phase === 'ended' ? 'NOT SAVED TO WAP'");
    expect(studio).not.toContain('completionEndpoint');
    expect(studio).toContain('<Link href="/privacy"');
  });

  it('keeps provider retention separate from WorkforceAP application persistence in the runbook', () => {
    const runbook = source('docs/runbooks/elevenlabs-member-agent-cutover.md');

    expect(runbook).toContain('These settings govern provider retention only');
    expect(runbook).toContain('WorkforceAP application persistence is separate from provider retention');
    expect(runbook).toContain('save a captured transcript to WorkforceAP AI history');
    expect(runbook).toContain('use it to update coach memory');
    expect(runbook).toContain('may email it to configured WorkforceAP support recipients');
  });
});
