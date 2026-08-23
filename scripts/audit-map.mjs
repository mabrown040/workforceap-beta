#!/usr/bin/env node
/**
 * Cut the repo by blast radius, not by folder.
 * A cluster is the set of files that fail together when one of them is wrong.
 */
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const GRAPH_DIR = process.env.AUDIT_GRAPH_DIR || join(ROOT, "graph");

const SEED_CLUSTERS = [
  {
    id: "ent_cluster_partner_school",
    label: "Partner-school enrollment",
    seeds: [
      "lib/partners/",
      "lib/partner/",
      "lib/enroll/",
      "app/enroll/",
      "marketing/src/pages/enroll/",
      "scripts/create-chs-partner.ts",
      "scripts/seed-partner-school.ts",
      "scripts/stamp-chs-funding.ts",
    ],
  },
  {
    id: "ent_cluster_apply_signup",
    label: "Apply / signup stamp",
    seeds: [
      "app/api/apply/signup",
      "lib/apply/applyReferralCapture.ts",
      "lib/apply/applyReferralCapture.test.ts",
      "lib/partner/sponsoredEnrollment.ts",
    ],
  },
  {
    id: "ent_cluster_admin_partners",
    label: "Admin partners write path",
    seeds: ["app/admin/partners", "app/api/admin/partners", "lib/partner/adminSchoolPartner.ts"],
  },
  {
    id: "ent_cluster_tenant_auth",
    label: "Tenant + session + enroll cookie",
    seeds: ["lib/tenant/", "lib/auth/", "lib/i18n/config.ts", "middleware.ts"],
  },
  {
    id: "ent_cluster_coursera_consent",
    label: "Coursera × guardian consent",
    seeds: [
      "lib/admin/courseraConsentGate.ts",
      "app/consent/",
      "app/api/consent/",
      "components/forms/ParentalConsentForm.tsx",
      "lib/nav/ageBasedNav.ts",
    ],
  },
  {
    id: "ent_cluster_prisma_db",
    label: "Prisma client + GUC + pooler",
    seeds: [
      "lib/db/",
      "prisma/schema.prisma",
      "scripts/prisma-env.js",
      "scripts/ensure-prisma-env.cjs",
    ],
  },
  {
    id: "ent_cluster_request_cost",
    label: "Every-request layout / org / branding",
    seeds: [
      "app/layout.tsx",
      "lib/platform/defaultOrgTheme.ts",
      "lib/tenant/organization.ts",
      "lib/tenant/resolveOrgFromRequest.ts",
      "lib/tenant/customDomainCache.ts",
      "lib/member/ensureAppUser.ts",
    ],
  },
  {
    id: "ent_cluster_rate_limit",
    label: "Rate limit + abuse surfaces",
    seeds: ["lib/rate-limit.ts", "lib/messages/rateLimit.ts"],
  },
  {
    id: "ent_cluster_payments",
    label: "Stripe donate + employer billing",
    seeds: [
      "lib/stripe/",
      "app/api/donate/",
      "app/api/employer/webhook/",
      "app/api/webhooks/stripe/",
    ],
  },
  {
    id: "ent_cluster_jobs_cron",
    label: "Cron / background jobs",
    seeds: ["app/api/cron/", "app/api/admin/crons/", "vercel.json"],
  },
  {
    id: "ent_cluster_portal_hot",
    label: "Portal dashboard + jobs board",
    seeds: [
      "app/(portal)/dashboard/page.tsx",
      "app/jobs/",
      "lib/jobs/",
      "lib/member/service.ts",
    ],
  },
];

function sh(cmd) {
  try {
    return execSync(cmd, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return "";
  }
}

function hotspots(n = 40) {
  const raw = sh(`git log --since='90 days ago' --name-only --pretty=format: -- '*.ts' '*.tsx' '*.js' | sed '/^$/d' | sort | uniq -c | sort -nr | head -n ${n}`);
  return raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const m = l.match(/^(\d+)\s+(.+)$/);
      return m ? { commits: Number(m[1]), path: m[2] } : null;
    })
    .filter(Boolean);
}

function listUnder(prefix) {
  const raw = sh(`git ls-files '${prefix}*'`);
  return raw ? raw.split("\n").filter(Boolean) : existsSync(join(ROOT, prefix)) ? [prefix] : [];
}

function loadRules() {
  const p = join(GRAPH_DIR, "rules.json");
  if (!existsSync(p)) return [];
  return JSON.parse(readFileSync(p, "utf8")).filter((r) => r.status === "accepted");
}

function main() {
  const hot = hotspots();
  const clusters = SEED_CLUSTERS.map((c) => {
    const files = [...new Set(c.seeds.flatMap((s) => listUnder(s)))].sort();
    const heat = hot.filter((h) => files.some((f) => h.path === f || h.path.startsWith(sPrefix(f))));
    return {
      id: c.id,
      label: c.label,
      files,
      fileCount: files.length,
      hotspotCommits: heat.reduce((n, h) => n + h.commits, 0),
      auditors: ["deps", "secrets", "dead-code", "hot-paths"],
    };
  });

  const map = {
    generatedBy: "scripts/audit-map.mjs",
    generatedAt: new Date().toISOString(),
    cut: "blast-radius",
    rulesLoaded: loadRules().map((r) => r.id),
    clusters,
    hotspots: hot.slice(0, 20),
  };
  writeFileSync(join(GRAPH_DIR, "map.json"), JSON.stringify(map, null, 2) + "\n");
  console.log(`map: ${clusters.length} clusters, ${clusters.reduce((n, c) => n + c.fileCount, 0)} files`);
  for (const c of clusters) console.log(`  ${c.id}  ${c.fileCount} files  heat=${c.hotspotCommits}`);
}

function sPrefix(f) {
  const i = f.lastIndexOf("/");
  return i === -1 ? f : f.slice(0, i + 1);
}

main();
