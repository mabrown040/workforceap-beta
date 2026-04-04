# Sprint Tracker — 2026-04-03
## Call Notes Implementation Sprint

> Source: Call notes from Mike + Dad session (~120 items)
> Updated: 2026-04-04 (engineering sweep)

---

## SHIPPED ✅

| PR | What | Status |
|----|------|--------|
| #343 | Program mobile overflow fix | ✅ merged |
| #344 | MobileBottomNav on 18 dashboard pages | ✅ merged |
| #345 | Profile resume/skills wiring + banner fix | ✅ merged |
| #346 | **Tab nav redesign** (4 tabs: Journey/Tools/Connect/Me) | ✅ merged |
| #347 | Certifications → Certificates (21 files) | ✅ merged |
| #348 | Find Your Career CTA + Retake Assessment + What We Do copy | ✅ merged |
| #349 | Partners referral language + churches + terminology | ✅ merged |
| #350 | Homepage CTA + nav reorder + how-it-works buttons | ✅ merged |
| #351 | Profile/resume/settings unified hub | ✅ merged |
| #352 | Career readiness live scoring | ✅ merged |
| #353 | Job board matched jobs strip | ✅ merged |
| #354 | Messaging rate-limit guardrails | ✅ merged |
| #355 | Inline resume PDF preview | ✅ merged |
| #356 | Live resume edit workspace on profile hub | ✅ merged |
| #357 | Voice resume coach on profile hub | ✅ merged |
| #358 | Voice coach loads member resume as context | ✅ merged |
| #359 | Suggestion capture cards + resume rendering hardened | ✅ merged |

## IN PROGRESS 🔨

### Resume Hub Polish
- [x] Wire Accept → pushes suggestion text into ResumeRewriterForm — **done** (controlled `ResumeRewriterForm` in `ResumeCoachWorkspace`; mobile profile uses same workspace as desktop). Log: `docs/COMPLETED-WORK-LOG.md`.
- [ ] **Deploy QA:** resume inline preview — same-origin `/api/member/resume/preview` + DOC/DOCX HTML path; confirm PDF iframe in staging/prod (replaces raw Supabase URL in iframe for PDF).

## QUEUED 📋

### Marketing (Round 4)
- [x] Blog default image pool (20 curated images with category defaults) — **wired** (`getDefaultImage` in listing + post when no cover). See `lib/blog/defaultImages.ts`.
- [x] Image diversity pass (67%+ diverse across site) — **addressed for blog defaults** via curated Unsplash pools (diverse subjects); sitewide photo audit still optional.
- [x] "How It Works" laptop program wording — **already matches live site** (workforceap.org: “Zero upfront cost for qualifying members”; same intent in beta). See `docs/COMPLETED-WORK-LOG.md`.
- [x] Accessibility font sizes + journey step consistency — **partial:** homepage milestone cards (`.home-milestone-card`); blog listing “Read more” text; skip link already in root layout.

### Portal Improvements
- [x] Weekly recap + career brief consolidation — **light:** cross-links between `/dashboard/weekly-recap` and `/dashboard/career-brief` (full single-page merge not done).
- [x] Job board full solution — **shipped:** curated apply syncs to Application Tracker; “Add to my tracker only” + Saved column on kanban; board badge on tracker cards (`lib/jobs/syncCuratedJobToTracker`, `/api/member/job-applications/track-curated`).
- [x] Partner onboarding flow (30-sec intro, auto-advance tour) — **timing tuned** (`PartnerOnboardingTour` 7.5s/slide ≈ 30s for first four slides).
- [x] Program change request flow — **shipped:** member `/dashboard/program` + `/api/member/program-change-request`; admin `/admin/program-change-requests` (approve updates `User.enrolledProgram`).
- [x] DOC/DOCX inline preview — **shipped:** server HTML via Mammoth (`/api/member/resume/docx-html`); PDF via same-origin stream (not full PDF conversion pipeline).

### AI tools (see also `AI-TOOLS-BACKLOG.md`)
- [x] Skill Mapper page + radar + O*NET/demo fallback
- [x] Browser STT captions on voice interview (Web Speech API)
- [x] Skill Mapper follow-through: cert → skill categories, market comparison (My Skills Profile), course/cert gap recommendations
- [x] WebRTC / MediaRecorder video mock interview (optional opt-in on voice interview page; consent + Supabase upload + `voice_interview_video` AI history row)

## SEPARATE SPRINTS 🗓️

Detailed notes: [`docs/plans/SEPARATE-SPRINTS.md`](SEPARATE-SPRINTS.md).

- **O*NET → 19 Programs Mapping** — keep Grok, improve prompts
- **Partner Portal White-Label** — attendance sheets, outcome reports
- **WAP Email Addresses** — @workforceap.org for members
- **Signup Flow Audit** — from call notes #16, #18, #19

## DECISIONS LOCKED
1. Side panel = **4-tab nav** ✅ shipped
2. Resume coach = **shipped** (voice + context + suggestion capture)
3. O*NET = **keep Grok**, improve prompts
4. Image diversity = **67%+ diverse**
5. Certifications → **Certificates** ✅ shipped
6. Kimi ACP times out on large audits; do those directly
