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

/**
 * Clusters are blast-radius cuts (files that fail together), not folders.
 * The 2026-08-23 scale beat used 11 clusters / ~161 files — a hot-path sample.
 * This list keeps those 11 ids stable (prior claims still resolve) and adds
 * directory-complete clusters so the map covers the real tree: every App
 * Router group, lib domain, portal kit, prisma, messages, CI, and tests.
 */
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
      "app/api/apply/",
      "app/apply/",
      "lib/apply/",
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
      "prisma/",
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
      "i18n/request.ts",
    ],
  },
  {
    id: "ent_cluster_rate_limit",
    label: "Rate limit + abuse surfaces",
    seeds: ["lib/rate-limit.ts", "lib/messages/rateLimit.ts", "lib/turnstile/"],
  },
  {
    id: "ent_cluster_payments",
    label: "Stripe donate + employer billing",
    seeds: [
      "lib/stripe/",
      "app/api/donate/",
      "app/api/stripe/",
      "app/api/employer/webhook/",
      "app/api/webhooks/stripe/",
    ],
  },
  {
    id: "ent_cluster_jobs_cron",
    label: "Cron / background jobs",
    seeds: ["app/api/cron/", "app/api/admin/crons/", "lib/cron/", "vercel.json"],
  },
  {
    id: "ent_cluster_portal_hot",
    label: "Portal dashboard + jobs board",
    seeds: [
      "app/(portal)/dashboard/",
      "app/jobs/",
      "lib/jobs/",
      "lib/member/service.ts",
      "lib/member/getMemberState.ts",
    ],
  },
  // ── directory-complete clusters (deep beat) ──────────────────────────
  {
    id: "ent_cluster_admin_ssr",
    label: "Admin SSR pages (global isAdmin + list loaders)",
    seeds: ["app/admin/", "components/admin/"],
  },
  {
    id: "ent_cluster_admin_api",
    label: "Admin API write / export / cron-trigger surface",
    seeds: ["app/api/admin/", "lib/admin/"],
  },
  {
    id: "ent_cluster_portal_member",
    label: "Member portal + member APIs",
    seeds: [
      "app/(portal)/dashboard/",
      "app/(portal)/account/",
      "app/(portal)/applications/",
      "app/(portal)/certifications/",
      "app/(portal)/profile/",
      "app/(portal)/resources/",
      "app/(portal)/help/",
      "app/(portal)/coach/",
      "app/api/member/",
      "lib/member/",
    ],
  },
  {
    id: "ent_cluster_employer",
    label: "Employer portal + APIs + billing",
    seeds: [
      "app/(portal)/employer/",
      "app/employer/",
      "app/employers/",
      "app/api/employer/",
      "lib/employer/",
      "components/employer/",
    ],
  },
  {
    id: "ent_cluster_partner_portal",
    label: "Partner portal + APIs + signup",
    seeds: [
      "app/(portal)/partner/",
      "app/partner-signup/",
      "app/api/partner/",
      "components/partner/",
    ],
  },
  {
    id: "ent_cluster_counselor",
    label: "Counselor portal + APIs + caseload",
    seeds: [
      "app/(portal)/counselor/",
      "app/api/counselor/",
      "lib/counselor/",
      "components/counselor/",
    ],
  },
  {
    id: "ent_cluster_public_marketing",
    label: "Public marketing + Astro site",
    seeds: [
      "app/page.tsx",
      "app/(decision-journey)/",
      "app/careers/",
      "components/marketing/",
      "lib/marketing/",
      "lib/content/",
      "marketing/",
      "css/marketing.css",
      "css/main.css",
    ],
  },
  {
    id: "ent_cluster_ai_spend",
    label: "AI tools + ElevenLabs + voice spend",
    seeds: [
      "app/api/ai/",
      "lib/ai/",
      "app/(portal)/dashboard/ai-tools/",
      "app/api/public/wioa-qualification/voice-session/",
      "app/api/partner/voice-session/",
    ],
  },
  {
    id: "ent_cluster_email_notify",
    label: "Email / Resend / recap / nudges",
    seeds: [
      "lib/email/",
      "lib/email.ts",
      "lib/recap/",
      "lib/notifications/",
      "lib/notify/",
      "emails/",
      "app/api/admin/email-crons/",
      "app/api/admin/email-templates/",
      "app/api/contact/",
      "app/api/unsubscribe/",
    ],
  },
  {
    id: "ent_cluster_storage_uploads",
    label: "File upload + storage buckets",
    seeds: [
      "lib/storage/",
      "lib/resume/",
      "app/api/member/resume/",
      "app/api/member/certifications/upload/",
      "app/api/counselor/sessions/upload-resume/",
      "app/api/admin/members/",
    ],
  },
  {
    id: "ent_cluster_feature_flags",
    label: "Feature flags + experiments",
    seeds: [
      "lib/feature-flags/",
      "lib/experiments/",
      "app/api/feature-flags/",
      "app/api/admin/feature-flags/",
      "app/admin/feature-flags/",
    ],
  },
  {
    id: "ent_cluster_ci_deploy",
    label: "CI / deploy / Caddy / Next config",
    seeds: [
      ".github/",
      "vercel.json",
      "Caddyfile",
      "DEPLOY.md",
      "next.config.ts",
      "package.json",
      "pnpm-workspace.yaml",
      "playwright.config.ts",
      "eslint.config.mjs",
      "tsconfig.json",
    ],
  },
  {
    id: "ent_cluster_tests",
    label: "Automated tests that prove or fail to prove claims",
    seeds: ["tests/", "scripts/verify-high-risk-tenant-routes.cjs", "scripts/test-unit.mjs"],
  },
  {
    id: "ent_cluster_i18n_catalog",
    label: "i18n catalogs + locale routing",
    seeds: ["messages/", "i18n/", "lib/i18n/"],
  },
  {
    id: "ent_cluster_xapi",
    label: "xAPI LRS ingest + Coursera statements",
    seeds: ["lib/xapi/", "app/api/xapi/", "app/api/test/xapi-access-token/", "app/api/webhooks/coursera/"],
  },
  {
    id: "ent_cluster_gdpr",
    label: "GDPR export / delete / consent",
    seeds: [
      "lib/gdpr/",
      "app/api/gdpr/",
      "app/(portal)/account/privacy/",
      "app/admin/data-retention/",
      "app/api/admin/data-retention/",
      "lib/retention/",
    ],
  },
  {
    id: "ent_cluster_security",
    label: "Audit log + tokens + MFA + headers",
    seeds: [
      "lib/security/",
      "lib/audit/",
      "lib/audit.ts",
      "lib/tokenizedLink.ts",
      "lib/auth/mfaTrust.ts",
      "lib/auth/mfaConfig.ts",
    ],
  },
  {
    id: "ent_cluster_scripts_ops",
    label: "Ops scripts + seed + audit ranker",
    seeds: ["scripts/"],
  },
  {
    id: "ent_cluster_portal_kit",
    label: "Portal kit + shared chrome",
    seeds: [
      "components/portal/",
      "components/theme/",
      "components/observability/",
      "docs/KIT_GUIDE.md",
    ],
  },
  {
    id: "ent_cluster_mentor",
    label: "Mentor apply + APIs",
    seeds: ["app/mentor/", "app/api/mentor/", "app/api/mentors/", "app/admin/mentors/"],
  },
  {
    id: "ent_cluster_org_public",
    label: "Public org pages + onboard",
    seeds: ["app/org/", "app/api/org/", "app/api/onboarding/"],
  },
  {
    id: "ent_cluster_survey_tokens",
    label: "Tokenized survey / questionnaire / invite links",
    seeds: [
      "app/q/",
      "app/api/q/",
      "app/placement-survey/",
      "app/api/placement-survey/",
      "app/survey/",
      "app/invite/",
      "app/api/invite/",
      "lib/tokenizedLink.ts",
      "lib/security/placementSurveyToken.ts",
      "lib/invitations/",
    ],
  },
  {
    id: "ent_cluster_webhooks",
    label: "Inbound webhooks (Coursera, learning-completion, Stripe)",
    seeds: [
      "app/api/webhooks/",
      "lib/webhooks/",
      "lib/coursera/webhookAuth.ts",
      "app/admin/webhook-events/",
      "app/api/admin/webhook-events/",
      "app/api/admin/webhooks/",
    ],
  },
  {
    id: "ent_cluster_onet_quiz",
    label: "O*NET quiz / interest profiler / WIOA public",
    seeds: [
      "lib/onet/",
      "lib/wioa/",
      "app/api/public/",
      "app/wioa-qualification/",
      "app/(decision-journey)/find-your-path/",
      "app/api/recommend/",
    ],
  },
  {
    id: "ent_cluster_supabase_auth",
    label: "Supabase auth pages + login APIs",
    seeds: [
      "lib/supabase/",
      "lib/supabase-admin.ts",
      "lib/supabaseCookieOptions.ts",
      "app/(auth)/",
      "app/auth/",
      "app/api/auth/",
    ],
  },
  {
    id: "ent_cluster_observability",
    label: "Sentry + request id + health",
    seeds: [
      "lib/observability/",
      "sentry.server.config.ts",
      "sentry.edge.config.ts",
      "instrumentation.ts",
      "instrumentation-client.ts",
      "app/api/health/",
      "app/admin/health/",
      "app/admin/diagnostics/",
    ],
  },
  {
    id: "ent_cluster_dev_labs",
    label: "Dev / kit / Astryx labs (must stay prod-gated)",
    seeds: ["app/dev/"],
  },
  {
    id: "ent_cluster_leader_subgroup",
    label: "Subgroup leader portal + APIs",
    seeds: [
      "app/(portal)/leader/",
      "app/api/leader/",
      "app/api/subgroup/",
      "app/admin/subgroups/",
      "app/api/admin/subgroups/",
    ],
  },
  {
    id: "ent_cluster_coursera_sync",
    label: "Coursera B4B sync + admin enrollment",
    seeds: [
      "lib/coursera/",
      "app/admin/coursera/",
      "app/api/admin/coursera/",
      "app/(portal)/dashboard/coursera/",
    ],
  },
  {
    id: "ent_cluster_messages",
    label: "In-app messages + inbox",
    seeds: [
      "lib/messages/",
      "app/api/admin/messages/",
      "app/admin/messages/",
      "app/(portal)/dashboard/messages/",
      "app/api/partner/messages/",
      "app/api/counselor/",
    ],
  },
  {
    id: "ent_cluster_locked_stakes",
    label: "Product stakes + locked copy",
    seeds: [
      "docs/PRODUCT_STAKES.md",
      "lib/locked-stakes/",
      ".github/workflows/locked-product-stakes.yml",
    ],
  },
  // Coverage clusters: directory-complete so the map is not a hot-path sample.
  // Blast-radius clusters above remain the auditor subgraphs; these fill gaps.
  {
    id: "ent_cluster_app_tree",
    label: "Full App Router tree (coverage)",
    seeds: ["app/"],
  },
  {
    id: "ent_cluster_lib_tree",
    label: "Full lib tree (coverage)",
    seeds: ["lib/"],
  },
  {
    id: "ent_cluster_components_tree",
    label: "Full components tree (coverage)",
    seeds: ["components/", "hooks/"],
  },
  {
    id: "ent_cluster_content_shared",
    label: "Content catalogs + shared + CSS + pages leftover",
    seeds: ["content/", "shared/", "css/", "pages/", "supabase/", "emails/"],
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

  const uniqueFiles = new Set(clusters.flatMap((c) => c.files));
  const map = {
    generatedBy: "scripts/audit-map.mjs",
    generatedAt: new Date().toISOString(),
    cut: "blast-radius",
    rulesLoaded: loadRules().map((r) => r.id),
    clusterCount: clusters.length,
    fileCountSum: clusters.reduce((n, c) => n + c.fileCount, 0),
    uniqueFileCount: uniqueFiles.size,
    clusters,
    hotspots: hot.slice(0, 20),
  };
  writeFileSync(join(GRAPH_DIR, "map.json"), JSON.stringify(map, null, 2) + "\n");
  console.log(
    `map: ${clusters.length} clusters, ${map.fileCountSum} memberships, ${uniqueFiles.size} unique files`,
  );
  for (const c of clusters) console.log(`  ${c.id}  ${c.fileCount} files  heat=${c.hotspotCommits}`);
}

function sPrefix(f) {
  const i = f.lastIndexOf("/");
  return i === -1 ? f : f.slice(0, i + 1);
}

main();
