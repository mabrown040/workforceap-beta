/**
 * Opt-in PostgreSQL proof of the member messaging RLS migration.
 * Uses captured live definitions plus minimal synthetic tables, not migration replay.
 * Creates and finally drops only a NEW local proof DB and three NEW NOLOGIN roles.
 * Run: RLS_PROOF_DATABASE_URL=postgresql://claw@127.0.0.1:55437/workforceap_message_rls_proof_20260909
 *      RLS_PROOF_ARTIFACT_DIR=/tmp/member-message-rls-proof node tests/rls/member-message-assignment.mjs
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const migrationPath = 'prisma/migrations/20260909224000_member_message_current_assignment/migration.sql';
const migration = readFileSync(resolve(root, migrationPath), 'utf8');
const baselineText = readFileSync(resolve(root, 'tests/fixtures/member-message-rls-baseline.json'), 'utf8');
const baseline = JSON.parse(baselineText);
let target;
try { target = new URL(process.env.RLS_PROOF_DATABASE_URL); } catch { throw new Error('Set a valid RLS_PROOF_DATABASE_URL for the isolated local proof database.'); }
assert.equal(target.hostname, '127.0.0.1', 'Only the isolated local PostgreSQL host is allowed.');
assert.equal(target.port, '55437', 'Never use the system/production database port.');
const database = decodeURIComponent(target.pathname.slice(1));
assert.match(database, /^workforceap_message_rls_proof_\d{8}$/, 'Use a dedicated message RLS proof database.');
assert.equal(target.search, '', 'Connection options are not accepted.');
const artifactDir = resolve(process.env.RLS_PROOF_ARTIFACT_DIR ?? '/tmp/member-message-rls-proof');
mkdirSync(artifactDir, { recursive: true });
const env = { ...process.env, PGHOST: target.hostname, PGPORT: target.port, PGUSER: decodeURIComponent(target.username), PGPASSWORD: decodeURIComponent(target.password), PGCONNECT_TIMEOUT: '5' };
const literal = value => `'${String(value).replaceAll("'", "''")}'`;
const ident = value => `"${String(value).replaceAll('"', '""')}"`;
const report = { startedAt: new Date().toISOString(), migrationPath, migrationSha256: createHash('sha256').update(migration).digest('hex'), baselineSha256: createHash('sha256').update(baselineText).digest('hex'), baselineCapturedAt: baseline.capturedAt, target: `127.0.0.1:55437/${database}`, checks: [], cleanup: null };
let dbCreated = false;
const createdRoles = [];
function sql(input, { db = database, expectDenied = false } = {}) {
  const result = spawnSync('psql', ['-X', '-qAt', '-v', 'ON_ERROR_STOP=1', '-d', db], { env, input: `\\set VERBOSITY sqlstate\n${input}`, encoding: 'utf8', timeout: 15000 });
  if (expectDenied) {
    assert.notEqual(result.status, 0, 'Expected database permission denial.');
    assert.match(result.stderr ?? '', /42501/, 'Expected SQLSTATE 42501.');
    return '42501';
  }
  assert.equal(result.status, 0, `Local SQL failed: ${(result.stderr ?? '').trim()}`);
  return result.stdout.trim();
}
function check(name, actual, expected) { assert.deepEqual(actual, expected, name); report.checks.push({ name, passed: true, actual }); console.log(`PASS ${name}`); }
function actorSql(actor, body, { role = 'authenticated', denied = false, guc = true, profileRole = null } = {}) {
  const org = actor.startsWith('foreign') ? 'org-b' : 'org-a';
  const appRole = profileRole ?? (actor === 'super' ? 'super_admin' : actor.includes('admin') ? 'admin' : actor.startsWith('partner') ? 'partner' : actor.startsWith('employer') ? 'employer' : 'member');
  return sql(`BEGIN; SET LOCAL ROLE ${ident(role)};
    DO $ctx$ BEGIN
      PERFORM set_config('app.current_user_id', ${literal(guc ? actor : '')}, true);
      PERFORM set_config('app.current_org_id', ${literal(guc ? org : '')}, true);
      PERFORM set_config('app.current_role', ${literal(guc ? appRole : '')}, true);
      PERFORM set_config('app.current_partner_id', '', true);
      PERFORM set_config('request.jwt.claims', ${literal(JSON.stringify({ sub: actor, role: 'authenticated' }))}, true);
    END $ctx$;
    ${body}
    ROLLBACK;`, { expectDenied: denied });
}
function rights(actor, thread, expected, label, options = {}) {
  const reads = JSON.parse(actorSql(actor, `SELECT json_build_array(
    (SELECT count(*) FROM public.message_threads WHERE id=${literal(thread)}),
    (SELECT count(*) FROM public.messages WHERE thread_id=${literal(thread)})
  );`, options));
  const updated = Number(actorSql(actor, `WITH changed AS (UPDATE public.message_threads SET counselor_last_read_at='2026-09-09T12:00:00Z' WHERE id=${literal(thread)} RETURNING id) SELECT count(*) FROM changed;`, options));
  const insert = `INSERT INTO public.messages(id,thread_id,author_id,body) VALUES('proof-attempt',${literal(thread)},${literal(actor)},'Synthetic policy proof'); SELECT 1;`;
  const inserted = expected[3] ? Number(actorSql(actor, insert, options)) : (actorSql(actor, insert, { ...options, denied: true }), 0);
  const actual = [...reads, updated, inserted]; check(label, actual, expected); return actual;
}
try {
  check('proof database does not already exist', sql(`SELECT count(*) FROM pg_database WHERE datname=${literal(database)};`, { db: 'postgres' }), '0');
  check('test roles do not already exist', sql("SELECT count(*) FROM pg_roles WHERE rolname IN ('authenticated','anon','service_role');", { db: 'postgres' }), '0');
  for (const role of ['authenticated', 'anon', 'service_role']) {
    sql(`CREATE ROLE ${ident(role)} NOLOGIN NOSUPERUSER NOBYPASSRLS NOINHERIT;`, { db: 'postgres' }); createdRoles.push(role);
  }
  sql(`CREATE DATABASE ${ident(database)};`, { db: 'postgres' }); dbCreated = true;
  sql(`
    CREATE TYPE public.message_thread_kind AS ENUM ('member','employer','partner');
    CREATE TABLE public.users(id TEXT PRIMARY KEY, organization_id TEXT NOT NULL, deleted_at TIMESTAMP(3));
    CREATE TABLE public.counselors(id TEXT PRIMARY KEY, user_id TEXT NOT NULL, active BOOLEAN NOT NULL DEFAULT TRUE);
    CREATE TABLE public.counselor_assignments(id TEXT PRIMARY KEY, counselor_id TEXT NOT NULL, member_id TEXT NOT NULL, active BOOLEAN NOT NULL DEFAULT TRUE);
    CREATE TABLE public.employers(id TEXT PRIMARY KEY, user_id TEXT NOT NULL);
    CREATE TABLE public.partner_users(partner_id TEXT NOT NULL, user_id TEXT NOT NULL);
    CREATE TABLE public.message_threads(id TEXT PRIMARY KEY, kind public.message_thread_kind NOT NULL DEFAULT 'member', member_id TEXT, employer_id TEXT, partner_id TEXT, counselor_user_id TEXT, staff_user_id TEXT, member_last_read_at TIMESTAMP(3), counselor_last_read_at TIMESTAMP(3), portal_user_last_read_at TIMESTAMP(3), staff_last_read_at TIMESTAMP(3), created_at TIMESTAMP(3) NOT NULL DEFAULT NOW(), updated_at TIMESTAMP(3) NOT NULL DEFAULT NOW());
    CREATE TABLE public.messages(id TEXT PRIMARY KEY, thread_id TEXT NOT NULL, author_id TEXT, body TEXT NOT NULL, created_at TIMESTAMP(3) NOT NULL DEFAULT NOW());
    GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
    GRANT ALL ON TABLE public.message_threads, public.messages TO anon, authenticated, service_role;
    GRANT SELECT ON public.users, public.counselors, public.counselor_assignments, public.employers, public.partner_users TO anon, authenticated, service_role;
    ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.counselors ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.counselor_assignments ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.message_threads ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
  `);
  for (const f of baseline.functions) sql(f.definition);
  for (const p of baseline.policies) {
    assert.equal(p.schemaname, 'public');
    assert.ok(['counselors', 'counselor_assignments', 'message_threads', 'messages'].includes(p.tablename));
    assert.deepEqual(p.roles, ['public']);
    sql(`CREATE POLICY ${ident(p.policyname)} ON public.${ident(p.tablename)} FOR ${p.cmd} TO PUBLIC ${p.qual ? `USING (${p.qual})` : ''} ${p.with_check ? `WITH CHECK (${p.with_check})` : ''};`);
  }
  sql(`
    INSERT INTO public.users(id,organization_id) VALUES
      ('member','org-a'),('member-two','org-a'),('old','org-a'),('new','org-a'),('inactive','org-a'),('foreign-counselor','org-b'),('admin','org-a'),('foreign-admin','org-b'),('super','org-b'),('employer-owner','org-a'),('partner-owner','org-a'),('unrelated','org-a');
    INSERT INTO public.counselors(id,user_id,active) VALUES ('c-old','old',TRUE),('c-new','new',TRUE),('c-inactive','inactive',FALSE),('c-foreign','foreign-counselor',TRUE);
    INSERT INTO public.counselor_assignments(id,counselor_id,member_id,active) VALUES ('a-old','c-old','member',TRUE),('a-new','c-new','member',FALSE),('a-inactive','c-inactive','member',TRUE),('a-foreign','c-foreign','member',TRUE);
    INSERT INTO public.employers VALUES ('employer-one','employer-owner');
    INSERT INTO public.partner_users VALUES ('partner-one','partner-owner');
    INSERT INTO public.message_threads(id,kind,member_id,employer_id,partner_id,counselor_user_id,staff_user_id) VALUES
      ('member-thread','member','member',NULL,NULL,'old',NULL),
      ('admin-pointer-thread','member','member-two',NULL,NULL,NULL,'admin'),
      ('employer-thread','employer',NULL,'employer-one',NULL,NULL,'admin'),
      ('partner-thread','partner',NULL,NULL,'partner-one',NULL,'admin'),
      ('orphan-thread','member',NULL,NULL,NULL,'old',NULL);
    INSERT INTO public.messages(id,thread_id,author_id,body) SELECT id||'-message',id,'member','Synthetic policy fixture' FROM public.message_threads;
  `);
  check('assertions run as authenticated with active RLS and no bypass', JSON.parse(actorSql('old', `SELECT json_build_array(current_user,rolsuper,rolbypassrls,row_security_active('public.message_threads'),row_security_active('public.messages')) FROM pg_roles WHERE rolname=current_user;`)), ['authenticated', false, false, true, true]);
  rights('old','member-thread',[1,1,1,1],'before: active counselor has existing access');
  sql("BEGIN; UPDATE counselor_assignments SET active=FALSE WHERE id='a-old'; UPDATE counselor_assignments SET active=TRUE WHERE id='a-new'; COMMIT;");
  rights('old','member-thread',[1,1,1,1],'RED: reassigned counselor still reads/posts through stale pointer');
  rights('new','member-thread',[0,0,0,0],'RED: current counselor cannot use stale-pointer thread');
  const portalBefore = {};
  for (const [who,thread,expected] of [['partner-owner','partner-thread',[1,1,1,1]],['employer-owner','employer-thread',[1,1,1,1]],['admin','partner-thread',[1,1,1,1]],['super','partner-thread',[1,1,0,0]],['unrelated','partner-thread',[0,0,0,0]]]) portalBefore[who] = rights(who,thread,expected,`before: portal ${who}`);
  sql(migration);
  rights('old','member-thread',[0,0,0,0],'GREEN: reassigned counselor loses thread/read/update/post');
  rights('new','member-thread',[1,1,1,1],'GREEN: current active counselor works despite stale pointer');
  rights('member','member-thread',[1,1,1,1],'member retains own conversation');
  rights('unrelated','member-thread',[0,0,0,0],'unrelated member denied');
  rights('inactive','member-thread',[0,0,0,0],'active assignment with inactive counselor denied');
  rights('foreign-counselor','member-thread',[0,0,0,0],'cross-org active counselor assignment denied');
  rights('admin','member-thread',[1,1,0,0],'tenant admin retains read-only SQL rights without pointer');
  rights('admin','admin-pointer-thread',[1,1,1,1],'tenant admin retains prior SQL participant write rights');
  rights('foreign-admin','member-thread',[0,0,0,0],'other-org admin denied');
  rights('super','member-thread',[1,1,0,0],'super admin retains SQL reads without adding SQL writes');
  sql("UPDATE public.message_threads SET staff_user_id='old' WHERE id='member-thread';");
  rights('old','member-thread',[0,0,0,0],'cached staff pointer cannot restore former counselor access');
  sql("UPDATE public.message_threads SET counselor_user_id='inactive' WHERE id='member-thread';");
  rights('inactive','member-thread',[0,0,0,0],'cached counselor pointer cannot restore inactive counselor access');
  sql("UPDATE public.users SET deleted_at=NOW() WHERE id='new';");
  rights('new','member-thread',[0,0,0,0],'deleted active counselor user denied');
  sql("UPDATE public.users SET deleted_at=NULL WHERE id='new'; UPDATE public.users SET deleted_at=NOW() WHERE id='member';");
  rights('member','member-thread',[0,0,0,0],'deleted member cannot read own conversation');
  rights('new','member-thread',[0,0,0,0],'deleted member conversation withheld from counselor');
  rights('admin','member-thread',[0,0,0,0],'deleted member conversation withheld from tenant admin');
  rights('super','member-thread',[0,0,0,0],'deleted member conversation withheld from super admin');
  sql("UPDATE public.users SET deleted_at=NULL WHERE id='member'; UPDATE public.users SET deleted_at=NOW() WHERE id='admin';");
  rights('admin','admin-pointer-thread',[0,0,0,0],'deleted admin with cached pointer denied');
  sql("UPDATE public.users SET deleted_at=NULL WHERE id='admin'; UPDATE public.counselor_assignments SET active=FALSE WHERE id='a-new';");
  rights('new','member-thread',[0,0,0,0],'deactivated current assignment immediately denies counselor');
  rights('member','member-thread',[1,1,1,1],'member still has access without an active local counselor');
  sql("UPDATE public.counselor_assignments SET active=TRUE WHERE id='a-new';");
  rights('old','orphan-thread',[0,0,0,0],'null-member thread fails closed despite cached owner');
  rights('member','member-thread',[0,0,0,0],'JWT-shaped identity without trusted GUC grants nothing',{guc:false});
  check('wrong author insert rejected',actorSql('new',"INSERT INTO public.messages(id,thread_id,author_id,body) VALUES('wrong-author','member-thread','member','Synthetic forbidden author');",{denied:true}),'42501');
  const metadata = {id:"'retargeted'",kind:"'partner'",member_id:"'member-two'",employer_id:"'employer-one'",partner_id:"'partner-one'",counselor_user_id:"'old'",staff_user_id:"'old'"};
  for (const [column,value] of Object.entries(metadata)) check(`authenticated cannot rewrite ${column}`,actorSql('new',`UPDATE public.message_threads SET ${ident(column)}=${value} WHERE id='member-thread';`,{denied:true}),'42501');
  check('combined portal-shaped retarget is denied',actorSql('member',"UPDATE public.message_threads SET kind='partner',member_id=NULL,partner_id='partner-one',staff_user_id='member' WHERE id='member-thread';",{denied:true}),'42501');
  check('authenticated has receipt-only UPDATE and service privilege is unchanged',JSON.parse(sql("SELECT json_build_array(has_table_privilege('authenticated','public.message_threads','UPDATE'),has_column_privilege('authenticated','public.message_threads','member_last_read_at','UPDATE'),has_column_privilege('authenticated','public.message_threads','counselor_last_read_at','UPDATE'),has_column_privilege('authenticated','public.message_threads','portal_user_last_read_at','UPDATE'),has_column_privilege('authenticated','public.message_threads','staff_last_read_at','UPDATE'),has_column_privilege('authenticated','public.message_threads','kind','UPDATE'),has_table_privilege('anon','public.message_threads','UPDATE'),has_column_privilege('anon','public.message_threads','member_last_read_at','UPDATE'),has_table_privilege('service_role','public.message_threads','UPDATE'));")),[false,true,true,true,true,false,false,false,true]);
  check('anonymous receipt UPDATE denied even with a forged identity context',actorSql('member',"UPDATE public.message_threads SET member_last_read_at=NOW() WHERE id='member-thread';",{role:'anon',denied:true}),'42501');
  for (const [who,thread] of [['partner-owner','partner-thread'],['employer-owner','employer-thread'],['admin','partner-thread'],['super','partner-thread'],['unrelated','partner-thread']]) rights(who,thread,portalBefore[who],`after: portal ${who} retains exact policy results`);
  check('owner can still perform authorized reassignment metadata updates',Number(sql("BEGIN; WITH changed AS (UPDATE public.message_threads SET counselor_user_id='new' WHERE id='member-thread' RETURNING id) SELECT count(*) FROM changed; ROLLBACK;")),1);
  check('new helper is stable, security definer, with fixed search path',JSON.parse(sql("SELECT json_build_array(provolatile,prosecdef,proconfig) FROM pg_proc WHERE oid='public.can_access_member_message_thread(text,boolean)'::regprocedure;")),['s',true,['search_path=pg_catalog, public']]);
  report.complete = true;
} catch (error) {
  report.complete = false; report.failure = error.message; process.exitCode = 1; console.error(error.message);
} finally {
  const removedRoles=[];
  try {
    if (dbCreated) sql(`DROP DATABASE ${ident(database)};`, { db:'postgres' });
    for (const role of createdRoles.reverse()) { sql(`DROP ROLE ${ident(role)};`, { db:'postgres' }); removedRoles.push(role); }
    report.cleanup = { databaseDropped: dbCreated, rolesDropped: removedRoles };
  } catch(error) {report.cleanup={error:error.message,rolesDropped:removedRoles};process.exitCode=1;}
  report.finishedAt=new Date().toISOString();writeFileSync(resolve(artifactDir,'verification.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({complete:report.complete,checks:report.checks.length,cleanup:report.cleanup,artifactDir}));
}
