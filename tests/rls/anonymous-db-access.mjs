/** Opt-in, isolated PostgreSQL proof. Never accepts a remote database.
 * WAP12_PROOF_DATABASE_URL=postgresql://claw@127.0.0.1:55437/workforceap_anon_proof
 * node tests/rls/anonymous-db-access.mjs
 * Requires a local superuser and absent anon/authenticated/service_role/postgres roles.
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const target = new URL(process.env.WAP12_PROOF_DATABASE_URL);
assert.equal(target.hostname, '127.0.0.1');
assert.equal(target.port, '55437');
assert.equal(target.pathname, '/workforceap_anon_proof');
assert.equal(target.search, '');
const database = 'workforceap_anon_proof';
const roles = ['postgres', 'anon', 'authenticated', 'service_role'];
const createdRoles = [];
let createdDatabase = false;
let checks = 0;
const env = { ...process.env, PGHOST: target.hostname, PGPORT: target.port,
  PGUSER: decodeURIComponent(target.username), PGPASSWORD: decodeURIComponent(target.password), PGCONNECT_TIMEOUT: '5' };
function sql(input, db = database, denied = false) {
  const result = spawnSync('psql', ['-X', '-qAt', '-v', 'ON_ERROR_STOP=1', '-d', db],
    { env, input: `\\set VERBOSITY sqlstate\n${input}`, encoding: 'utf8', timeout: 15000 });
  if (denied) {
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /42501/);
    checks++;
  } else assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}
function equal(query, expected) { assert.equal(sql(query), expected); checks++; }
assert.equal(sql(`SELECT count(*) FROM pg_roles WHERE rolname IN ('postgres','anon','authenticated','service_role')`, 'postgres'), '0', 'Use a fresh isolated cluster; existing roles are never modified.');
try {
  sql(`CREATE DATABASE ${database}`, 'postgres');
  createdDatabase = true;
  for (const role of roles) {
    sql(`CREATE ROLE ${role} NOLOGIN`, 'postgres');
    createdRoles.push(role);
  }
  sql(`CREATE SCHEMA storage;
    GRANT ALL ON SCHEMA storage TO postgres;
    GRANT ALL ON SCHEMA public TO postgres;
    GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
    SET ROLE postgres;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;
    CREATE TABLE public.public_wioa_screenings (id serial PRIMARY KEY, payload text);
    ALTER TABLE public.public_wioa_screenings ENABLE ROW LEVEL SECURITY;
    CREATE POLICY public_wioa_screenings_insert_public ON public.public_wioa_screenings FOR INSERT WITH CHECK (true);
    CREATE TABLE public.messages (id serial PRIMARY KEY, body text);
    GRANT UPDATE (body) ON public.messages TO anon;
    CREATE FUNCTION public.lab_actor_is_member(text,text) RETURNS boolean LANGUAGE sql SECURITY DEFINER AS 'SELECT true';
    CREATE FUNCTION public.lab_actor_can_review(text,text) RETURNS boolean LANGUAGE sql SECURITY DEFINER AS 'SELECT true';
    CREATE FUNCTION public.can_access_member_message_thread(text,boolean) RETURNS boolean LANGUAGE sql SECURITY DEFINER AS 'SELECT true';
    CREATE FUNCTION public.backend_only() RETURNS boolean LANGUAGE sql AS 'SELECT true';
    REVOKE ALL ON FUNCTION public.backend_only() FROM PUBLIC, anon, authenticated;
    CREATE FUNCTION public.preserve_coursera_curriculum_course_mapping() RETURNS trigger LANGUAGE plpgsql AS 'BEGIN RETURN NEW; END';
    CREATE FUNCTION public.preserve_course_enrollment_curriculum_version() RETURNS trigger LANGUAGE plpgsql AS 'BEGIN RETURN NEW; END';
    CREATE FUNCTION public.xapi_statement_ingest_org_check() RETURNS trigger LANGUAGE plpgsql AS 'BEGIN RETURN NEW; END';
    GRANT USAGE ON SCHEMA storage TO anon;
    CREATE TABLE storage.objects (id text);
    GRANT SELECT ON storage.objects TO anon;
    RESET ROLE;`);
  sql(`SET ROLE anon; INSERT INTO public.public_wioa_screenings(payload) VALUES ('synthetic-before');`);
  const migration = readFileSync(new URL('../../prisma/migrations/20260910050000_contain_anonymous_public_access/migration.sql', import.meta.url), 'utf8');
  sql(`SET ROLE postgres; ${migration}`);
  sql(`SET ROLE anon; INSERT INTO public.public_wioa_screenings(payload) VALUES ('must-be-denied');`, database, true);
  sql(`SET ROLE anon; UPDATE public.messages SET body = 'must-be-denied';`, database, true);
  sql(`SET ROLE anon; SELECT * FROM public.messages;`, database, true);
  for (const call of ["lab_actor_is_member('x','y')", "lab_actor_can_review('x','y')", "can_access_member_message_thread('x',true)"]) {
    sql(`SET ROLE anon; SELECT public.${call}`, database, true);
    equal(`SET ROLE authenticated; SELECT public.${call}`, 't');
  }
  sql(`SET ROLE authenticated; SELECT public.backend_only()`, database, true);
  sql(`SET ROLE postgres; INSERT INTO public.public_wioa_screenings(payload) VALUES ('owner-api-path');`);
  equal(`SELECT count(*) FROM public.public_wioa_screenings`, '2');
  equal(`SELECT count(*) FROM pg_policies WHERE policyname='public_wioa_screenings_insert_public'`, '0');
  equal(`SELECT has_table_privilege('authenticated','public.messages','SELECT'), has_table_privilege('service_role','public.messages','INSERT'), has_table_privilege('anon','storage.objects','SELECT')`, 't|t|t');
  equal(`SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.prorettype='trigger'::regtype AND 'search_path=pg_catalog, public'=ANY(p.proconfig)`, '3');
  sql(`SET ROLE postgres; CREATE TABLE public.future_table(id serial, body text);
    CREATE FUNCTION public.future_rpc() RETURNS boolean LANGUAGE sql AS 'SELECT true';`);
  sql(`SET ROLE anon; INSERT INTO public.future_table(body) VALUES ('denied')`, database, true);
  sql(`SET ROLE anon; SELECT nextval('public.future_table_id_seq')`, database, true);
  sql(`SET ROLE anon; SELECT public.future_rpc()`, database, true);
  equal(`SELECT has_function_privilege('authenticated','public.future_rpc()','EXECUTE'), has_function_privilege('service_role','public.future_rpc()','EXECUTE')`, 't|t');
  // Repeatability and effective ACLs, including column-level grants.
  sql(`SET ROLE postgres; ${migration}`);
  equal(`SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r' AND (has_table_privilege('anon',c.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') OR has_any_column_privilege('anon',c.oid,'SELECT,INSERT,UPDATE,REFERENCES'))`, '0');
  console.log(JSON.stringify({ checks, result: 'PASS', scope: 'synthetic PostgreSQL permission proof; not live portal acceptance' }));
} finally {
  if (createdDatabase) sql(`DROP DATABASE ${database}`, 'postgres');
  for (const role of createdRoles.reverse()) sql(`DROP ROLE ${role}`, 'postgres');
}
