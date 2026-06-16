#!/usr/bin/env node
/**
 * FORCE RLS Staging Harness
 * 
 * Verifies Row-Level Security is working correctly before enabling
 * FORCE RLS in production. Run this against staging database.
 * 
 * Usage: node scripts/verify-rls-staging.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TESTS = [
  {
    name: 'Tenant isolation: Org A admin cannot read Org B members',
    async run() {
      // Get two different orgs
      const orgs = await prisma.organization.findMany({ take: 2 });
      if (orgs.length < 2) return { skip: true, reason: 'Need 2+ orgs' };
      
      const orgA = orgs[0];
      const orgB = orgs[1];
      
      // Get an admin from org A
      const adminA = await prisma.user.findFirst({
        where: { organizationId: orgA.id, userRoles: { some: { role: { name: 'admin' } } } },
      });
      if (!adminA) return { skip: true, reason: 'No admin in org A' };
      
      // Set GUC as admin A
      await prisma.$executeRaw`SELECT set_config('app.current_org_id', ${orgA.id}, true)`;
      
      // Try to read org B member
      const orgBMember = await prisma.user.findFirst({
        where: { organizationId: orgB.id },
      });
      
      if (orgBMember) {
        return { pass: false, error: 'Org A admin can read Org B members — RLS NOT WORKING' };
      }
      
      return { pass: true };
    },
  },
  {
    name: 'Tenant isolation: Org A member cannot read Org B jobs',
    async run() {
      const orgs = await prisma.organization.findMany({ take: 2 });
      if (orgs.length < 2) return { skip: true, reason: 'Need 2+ orgs' };
      
      const orgA = orgs[0];
      const orgB = orgs[1];
      
      // Set GUC as org A
      await prisma.$executeRaw`SELECT set_config('app.current_org_id', ${orgA.id}, true)`;
      
      // Try to read org B jobs
      const orgBJobs = await prisma.job.findMany({
        where: { organizationId: orgB.id },
      });
      
      if (orgBJobs.length > 0) {
        return { pass: false, error: 'Org A can read Org B jobs — RLS NOT WORKING' };
      }
      
      return { pass: true };
    },
  },
  {
    name: 'NULLIF GUC: empty string returns NULL',
    async run() {
      await prisma.$executeRaw`SELECT set_config('app.current_org_id', '', true)`;
      
      const result = await prisma.$queryRaw`SELECT NULLIF(current_setting('app.current_org_id', true), '') as org_id`;
      const orgId = result[0]?.org_id;
      
      if (orgId !== null) {
        return { pass: false, error: `NULLIF returned ${orgId} instead of NULL` };
      }
      
      return { pass: true };
    },
  },
  {
    name: 'get_current_org_id() returns NULL when GUC empty',
    async run() {
      await prisma.$executeRaw`SELECT set_config('app.current_org_id', '', true)`;
      
      const result = await prisma.$queryRaw`SELECT get_current_org_id() as org_id`;
      const orgId = result[0]?.org_id;
      
      if (orgId !== null) {
        return { pass: false, error: `get_current_org_id() returned ${orgId} instead of NULL` };
      }
      
      return { pass: true };
    },
  },
  {
    name: 'Audit events table has RLS enabled',
    async run() {
      const result = await prisma.$queryRaw`
        SELECT relrowsecurity 
        FROM pg_class 
        WHERE relname = 'audit_events'
      `;
      
      const hasRls = result[0]?.relrowsecurity === true;
      
      if (!hasRls) {
        return { pass: false, error: 'audit_events table does NOT have RLS enabled' };
      }
      
      return { pass: true };
    },
  },
  {
    name: 'Users table has RLS enabled',
    async run() {
      const result = await prisma.$queryRaw`
        SELECT relrowsecurity 
        FROM pg_class 
        WHERE relname = 'users'
      `;
      
      const hasRls = result[0]?.relrowsecurity === true;
      
      if (!hasRls) {
        return { pass: false, error: 'users table does NOT have RLS enabled' };
      }
      
      return { pass: true };
    },
  },
  {
    name: 'xAPI statements have organization_id NOT NULL',
    async run() {
      const result = await prisma.$queryRaw`
        SELECT is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'xapi_statements' AND column_name = 'organization_id'
      `;
      
      const isNullable = result[0]?.is_nullable === 'YES';
      
      if (isNullable) {
        return { pass: false, error: 'xapi_statements.organization_id is still nullable' };
      }
      
      return { pass: true };
    },
  },
];

async function main() {
  console.log('🔒 FORCE RLS Staging Harness');
  console.log('==============================\n');
  
  let passed = 0;
  let failed = 0;
  let skipped = 0;
  
  for (const test of TESTS) {
    process.stdout.write(`${test.name} ... `);
    
    try {
      const result = await test.run();
      
      if (result.skip) {
        console.log(`⏭️  SKIPPED (${result.reason})`);
        skipped++;
      } else if (result.pass) {
        console.log('✅ PASS');
        passed++;
      } else {
        console.log(`❌ FAIL: ${result.error}`);
        failed++;
      }
    } catch (error) {
      console.log(`❌ ERROR: ${error.message}`);
      failed++;
    }
  }
  
  console.log('\n==============================');
  console.log(`Results: ${passed} passed, ${failed} failed, ${skipped} skipped`);
  
  if (failed > 0) {
    console.log('\n⚠️  FORCE RLS is NOT ready for production');
    process.exit(1);
  } else {
    console.log('\n✅ FORCE RLS is ready for production');
    process.exit(0);
  }
}

main().catch((error) => {
  console.error('Harness error:', error);
  process.exit(1);
}).finally(() => {
  prisma.$disconnect();
});
