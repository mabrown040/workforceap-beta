-- CreateTable
CREATE TABLE "wap_jobs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description_md" TEXT NOT NULL,
    "apply_url" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wap_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "wap_jobs_status_idx" ON "wap_jobs"("status");

-- CreateIndex
CREATE INDEX "wap_jobs_created_at_idx" ON "wap_jobs"("created_at");

-- Seed initial open roles (idempotent)
INSERT INTO "wap_jobs" ("id", "title", "location", "type", "description_md", "apply_url", "status", "created_at")
VALUES
  (
    'a1000001-0000-4000-8000-000000000001',
    'Senior Counselor',
    'Austin, TX (hybrid)',
    'FT',
    E'Guide members through workforce training, WIOA eligibility, and job placement. Partner with employers and community organizations while using our AI-native platform to deliver high-touch coaching at scale.\n\n**What you''ll do**\n- Coach members through training and job search\n- Review progress data and personalize support\n- Collaborate with ops and engineering on member outcomes',
    'mailto:careers@workforceap.org?subject=Application%3A%20Senior%20Counselor',
    'open',
    CURRENT_TIMESTAMP
  ),
  (
    'a1000001-0000-4000-8000-000000000002',
    'Senior Engineer',
    'Remote (US)',
    'FT',
    E'Build the workforce engine that gets people to work. Ship product across our Next.js portal, Prisma data layer, and AI tooling that counselors and members rely on every day.\n\n**What you''ll do**\n- Own features end-to-end across the stack\n- Improve reliability, performance, and accessibility\n- Partner with counselors and ops to ship member-facing impact',
    'mailto:careers@workforceap.org?subject=Application%3A%20Senior%20Engineer',
    'open',
    CURRENT_TIMESTAMP
  ),
  (
    'a1000001-0000-4000-8000-000000000003',
    'Operations Lead',
    'Austin, TX',
    'FT',
    E'Run the operational backbone of a national workforce nonprofit — program logistics, partner coordination, and the systems that keep members moving from intake to placement.\n\n**What you''ll do**\n- Own day-to-day program operations and partner workflows\n- Improve processes with clear metrics and feedback loops\n- Coordinate across counseling, engineering, and employer teams',
    'mailto:careers@workforceap.org?subject=Application%3A%20Operations%20Lead',
    'open',
    CURRENT_TIMESTAMP
  )
ON CONFLICT ("id") DO NOTHING;
