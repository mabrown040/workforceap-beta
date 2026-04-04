# Sprint Tracker — 2026-04-03
## Call Notes Implementation Sprint

> Source: Call notes from Mike + Dad session (~120 items)
> Updated: 2026-04-03 19:42 CDT

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

### Resume Hub Polish (current branch: feat/accept-and-fix-resume)
- [ ] Wire Accept → pushes suggestion text into ResumeRewriterForm
- [ ] Verify resume inline preview actually works end-to-end in production (signed URL + CORS)

## QUEUED 📋

### Marketing (Round 4)
- [ ] Blog default image pool (20 curated images with category defaults)
- [ ] Image diversity pass (67%+ diverse across site)
- [ ] "How It Works" laptop program wording ("Zero cost for qualifying members")
- [ ] Accessibility font sizes + journey step consistency

### Portal Improvements
- [ ] Weekly recap + career brief consolidation
- [ ] Job board full solution (admin-curated + member self-tracking)
- [ ] Partner onboarding flow (30-sec intro, auto-advance tour)
- [ ] Program change request flow (member requests → admin approves)
- [ ] DOC/DOCX server-side conversion to PDF for inline preview

## SEPARATE SPRINTS 🗓️

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
