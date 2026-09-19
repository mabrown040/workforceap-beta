import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { join } from 'node:path';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('self-serve counselor and assessment copy wiring', () => {
  it('assigns on signup, enroll, and first counselor-thread open', () => {
    const signup = read('app/api/apply/signup/route.ts');
    const enroll = read('app/api/member/enroll/route.ts');
    const thread = read('lib/messages/counselorThread.ts');
    assert.match(signup, /ensureSelfServeCounselorAssigned/);
    assert.match(signup, /autoAssignAmbassadorFromReferral/);
    assert.match(enroll, /ensureSelfServeCounselorAssigned/);
    assert.match(thread, /ensureSelfServeCounselorAssigned/);
  });

  it('keeps unassigned member messages notifying counselors then admins', () => {
    const route = read('app/api/member/messages/route.ts');
    assert.match(route, /notifyUnassignedMemberMessage/);
    assert.doesNotMatch(route, /typically completed within a few business days/i);
  });

  it('describes preassessment as a placement tool, not a Coursera unlock', () => {
    const page = read('app/(portal)/dashboard/assessment/page.tsx');
    const messages = read('messages/en.json');
    assert.match(page, /placement check/);
    assert.doesNotMatch(page, /Then Coursera courses unlock/);
    assert.match(messages, /does not unlock Coursera/);
    assert.doesNotMatch(messages, /before your Coursera courses unlock/);
  });
});
