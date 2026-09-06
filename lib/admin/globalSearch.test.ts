import assert from 'node:assert/strict';
import test from 'node:test';
import { globalSearchKey, rankGlobalSearchResults, userSearchResult, type GlobalSearchResult } from './globalSearch';
import { createGlobalSearchSource } from './globalSearchSource';

const user = {
  id: 'user-1', fullName: 'Mike Brown', email: 'mike@example.test', enrolledProgram: null,
  profile: { role: 'member' }, userRoles: [] as Array<{ role: { name: string } }>,
};
const result = (id: string, type: GlobalSearchResult['type'] = 'member'): GlobalSearchResult => ({
  id, type, label: id, href: `/admin/${type}/${id}`, icon: 'person',
});

test('staff grants win over a member profile and route to the full account directory', () => {
  for (const profile of [user.profile, null, { role: 'admin' }]) {
    const staff = userSearchResult({ ...user, profile, userRoles: [{ role: { name: 'super_admin' } }] });
    assert.equal(staff.type, 'staff');
    assert.equal(staff.href, '/admin/users?ui=legacy&search=mike%40example.test');
  }
  assert.equal(userSearchResult(user).href, '/admin/members/user-1');
  assert.equal(userSearchResult({ ...user, profile: { role: 'partner' } }).type, 'account');
});

test('record identity stays unique even when types or destinations coincide', async () => {
  const first = { ...result('first', 'employer'), href: '/admin/employers' };
  const second = { ...result('second', 'employer'), href: '/admin/employers' };
  assert.notEqual(globalSearchKey(result('shared', 'member')), globalSearchKey(result('shared', 'employer')));
  const source = createGlobalSearchSource(() => {}, (async () => Response.json({ results: [first, second] })) as typeof fetch);
  const items = await source.search('employer');
  assert.deepEqual(items.map(item => item.id), ['employer:first', 'employer:second']);
  assert.equal(source.resolveHref('employer:second'), '/admin/employers');
  assert.equal(source.resolveHref('/admin/employers'), undefined);
});

test('exact name/email matches rank first with stable ties across incoming order', () => {
  const candidates = [
    { ...result('z'), label: 'Zed', sublabel: 'mike@example.test' },
    { ...result('prefix'), label: 'Mike Brown' },
    { ...result('a'), label: 'Mike' },
    { ...result('b'), label: 'Mike' },
  ];
  assert.deepEqual(rankGlobalSearchResults(candidates, '  mike  ', 3).map(row => row.id), ['a', 'b', 'prefix']);
  assert.deepEqual(rankGlobalSearchResults([...candidates].reverse(), 'mike', 3).map(row => row.id), ['a', 'b', 'prefix']);
  assert.equal(rankGlobalSearchResults(candidates, 'mike@example.test', 1)[0].id, 'z');
});

test('overlapping exact and general candidates do not consume multiple result slots', () => {
  const exact = { ...result('shared'), label: 'Sam' };
  const employer = { ...result('shared', 'employer'), label: 'Sam' };
  const prefix = { ...result('other'), label: 'Samuel' };
  const ranked = rankGlobalSearchResults([exact, employer, exact, prefix, employer], 'Sam', 3);
  assert.equal(ranked.length, 3);
  assert.deepEqual(new Set(ranked.map(globalSearchKey)), new Set(['member:shared', 'employer:shared', 'member:other']));
});

test('a late response cannot replace newer navigation or error state', async () => {
  let finishFirst!: (response: Response) => void;
  let firstSignal: AbortSignal | null | undefined;
  const errors: Array<string | null> = [];
  let calls = 0;
  const source = createGlobalSearchSource(message => errors.push(message), (async (_url, init) => {
    if (++calls === 1) {
      firstSignal = init?.signal;
      return new Promise<Response>(resolve => { finishFirst = resolve; });
    }
    return Response.json({ results: [result('new')] });
  }) as typeof fetch);
  const first = source.search('old');
  await source.search('new');
  assert.equal(firstSignal?.aborted, true);
  finishFirst(new Response('old provider failure', { status: 500 }));
  assert.deepEqual(await first, []);
  assert.equal(source.resolveHref('member:new'), '/admin/member/new');
  assert.ok(errors.every(error => error === null));
});

test('empty successful searches and request failures have different visible states', async () => {
  const errors: Array<string | null> = [];
  let fail = true;
  const source = createGlobalSearchSource(message => errors.push(message), (async () => fail
    ? new Response('private server failure details', { status: 500 })
    : Response.json({ results: [] })) as typeof fetch);
  assert.deepEqual(await source.search('mike'), []);
  assert.match(errors.at(-1) ?? '', /temporarily unavailable/);
  assert.doesNotMatch(errors.at(-1) ?? '', /private server/);
  fail = false;
  assert.deepEqual(await source.search('nobody'), []);
  assert.equal(errors.at(-1), null);
});
