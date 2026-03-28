# WorkforceAP Conversion Funnel Audit
**Date:** 2026-03-27  
**Auditor:** Forge ⚙️  
**Site:** https://workforceap.org  
**Method:** Full site crawl — homepage, apply, programs, partners, employers, FAQ, find-your-path, how-it-works, contact

---

## Executive Summary

WorkforceAP's site is clean, credible, and communicates value clearly. The core messaging is strong ("free training, no debt, employer-aligned"). However, the funnel has **critical dead ends** — particularly on the Employer and Partners pages — and several pages fail to capture momentum at the point of interest. The quiz (`/find-your-path`) exists and functions but renders invisibly as static text via web fetch, suggesting it may be JS-only and could be inaccessible or stall for users with slow connections or JS issues. No testimonials or outcome data with names are present, which limits trust conversion.

**Highest-priority fix:** The Employers page is nearly empty (~80 words) with zero CTA. That's a P0 revenue/partnership kill.

---

## Section 1 — Ranked Conversion Issues

### P0 — Critical (Fix Immediately)

---

**P0-1**  
**Page:** `/employers`  
**Element:** Entire page  
**Issue:** The Employers page contains ~80 words of copy and **zero call-to-action**. There's no form, no button, no email link, no "Contact us to hire" flow. An employer landing here has nowhere to go. This is the most important B2B conversion surface and it's empty.  
**Evidence:** Fetched content ends abruptly with a paragraph about AI tools. No CTA rendered.  
**Fix:** Add at minimum: (1) a "Contact us to discuss hiring" button → `/contact?topic=employer`, (2) a lightweight lead form with name/company/role count/certifications needed, (3) a section listing what employers get (pre-screened graduates, 90-day support, no fee). Target: 400-word page with 2 CTAs.

---

**P0-2**  
**Page:** `/find-your-path` (Career Quiz)  
**Element:** Quiz interaction layer  
**Issue:** The quiz renders as static non-interactive HTML at the text/markdown level. The 5-question flow appears to be entirely JavaScript-rendered. If a user has slow JS load, ad-blockers, or certain mobile browsers, they see a blank or broken experience. Additionally, there's **no visible "Apply Now" CTA as a quiz result** — the only post-quiz action is a static link at the top of the page ("Ready now? Start your application"). If the quiz results don't end with a direct apply prompt, it's a dead end.  
**Fix:** (1) Ensure quiz renders a result page with a hard CTA: "Your best match is [X]. Apply now — it's free." with a direct `/apply?program=X` deep link. (2) Add server-side fallback rendering so quiz intro is visible without JS. (3) Test that quiz completion → apply conversion is tracked.

---

### P1 — High Priority (Fix This Sprint)

---

**P1-1**  
**Page:** `/partners`  
**Element:** Partner signup CTA  
**Issue:** The Partners page describes referral partners but the only CTA is "Contact us to refer" → `/contact?topic=partnership`. There is **no dedicated partner intake form**, no partner portal link that works for new partners, and no differentiation between referral partners, employers, funders, and workforce boards. A workforce board landing here can't self-identify their path.  
**Fix:** Create a segmented partner intake: "What type of partner are you?" → [Referral Org | Employer | Funder | Workforce Board] → tailored next steps per type. At minimum, add a form on `/partners` instead of sending everyone to `/contact`.

---

**P1-2**  
**Page:** `/` (Homepage)  
**Element:** Social proof / testimonials section  
**Issue:** Zero named testimonials. Zero graduate success stories. The only "proof" is: "25+ years experience, 2,000+ trained, Austin launch community" and partner logos (Google, AT&T, Coursera). These are credibility signals but not **conversion-grade social proof**. An underserved adult learner needs to see: "Someone like me did this and it worked."  
**Fix:** Add 2–3 graduate testimonials with: name (or first name + city), former situation, program completed, outcome (job title + approx salary). Even one strong story with a photo increases conversion significantly. "Many graduates see strong wage gains" is too vague — needs a real number or story.

---

**P1-3**  
**Page:** `/apply`  
**Element:** Form visibility / apply flow itself  
**Issue:** The apply page describes a 3-step process (eligibility → program → account) but the actual form is JavaScript-rendered and doesn't appear in static crawl. This means: (1) if JS fails, users see nothing to fill out, (2) there's no fallback "email us or call us" prompt if the form doesn't load. The page copy says "3 quick questions" but doesn't tell users what those questions ARE, which may create hesitation.  
**Fix:** (1) Add a "Can't see the form? Call (512) 777-1808 or email info@workforceap.org" fallback below the form. (2) Preview the eligibility questions (e.g., "We'll ask about your location, goals, and availability — takes 3 minutes"). Reduces anxiety and hesitation. (3) Confirm the form has an explicit mobile-optimized layout.

---

**P1-4**  
**Page:** `/` (Homepage) and all pages  
**Element:** Email capture  
**Issue:** There is **no email capture anywhere** on the site outside of the application form. Users who aren't ready to apply (exploring, out of Austin area, checking for a friend) have no way to stay connected. The homepage even says "If you're elsewhere, apply anyway; we'll keep you in the loop" — but there's no mechanism to actually do that without going through full application.  
**Fix:** Add a lightweight "Stay in the loop" email capture widget in the homepage footer section and/or a slide-in for users who've scrolled 70%+ and haven't clicked Apply. Copy: "Not ready to apply? Get updates when we expand to your area." Ties directly to the geographic expansion narrative.

---

**P1-5**  
**Page:** `/programs` (navigation)  
**Element:** "Find Your Career" nav link  
**Issue:** The nav links to `/find-your-career` (404) instead of `/find-your-path`. This is a broken nav link that kills a key discovery path.  
**Evidence:** Fetching `/find-your-career` returned a 404. The 404 page's own nav shows "Find Your Career" in the menu, confirming the mismatch.  
**Fix:** Update nav link from `/find-your-career` to `/find-your-path`. One-line fix. Do it today.

---

**P1-6**  
**Page:** `/programs` (navigation)  
**Element:** "Program Comparison" nav link  
**Issue:** `/programs/compare` returned a 404. The nav lists "Program Comparison" as a menu item but the page doesn't exist.  
**Fix:** Either build the comparison page or remove the nav item. A broken nav item erodes trust. If the page is coming soon, redirect to `/programs` with a #comparison anchor.

---

### P2 — Medium Priority (Fix Next Sprint)

---

**P2-1**  
**Page:** `/employers`  
**Element:** Value proposition copy  
**Issue:** "90-day post-hire support" is mentioned but not explained. What does this support entail? An employer deciding whether to hire through WorkforceAP needs specifics. Does this mean counselor check-ins? Retention coaching? Replacement guarantee?  
**Fix:** Add a 3-bullet breakdown of employer support: what it is, what triggers it, and the employer's responsibility. This turns a vague claim into a compelling differentiator.

---

**P2-2**  
**Page:** All pages  
**Element:** CTA button consistency  
**Issue:** CTAs across the site use different labels: "Apply Now," "Start Your Application," "Apply to unlock member tools," "Apply for training." This fragmentation dilutes the primary action. Inconsistent labeling makes the site feel patchwork and can reduce click-through.  
**Fix:** Standardize primary CTA to one label sitewide: **"Apply Free"** or **"Apply Now — It's Free"**. Secondary CTAs can vary but primary should be unified.

---

**P2-3**  
**Page:** `/how-it-works`  
**Element:** Step 11 — "Outcomes" / wage claim  
**Issue:** "Graduates average $42K+ starting in their new field" — this is the only hard outcome stat on the site, but it's buried at the bottom of a long process page and not surfaced on the homepage or apply page. It's also lower than some program salary ranges listed (e.g., AWS: $95K–$145K), which could cause cognitive dissonance without context.  
**Fix:** (1) Surface the $42K+ stat on the homepage hero. (2) Clarify it's a blended average across all programs including Digital Literacy (lowest earners). (3) Add per-track outcome data on program pages.

---

**P2-4**  
**Page:** `/faq`  
**Element:** "Take the Career Quiz" link  
**Issue:** The FAQ links to `/find-your-path` correctly — but the label is "Take the Career Quiz" which doesn't match the page title "Find Your Path." Minor inconsistency but contributes to trust erosion if users see different names for the same thing.  
**Fix:** Standardize the quiz name across all references: either "Career Quiz" or "Find Your Path" — pick one.

---

**P2-5**  
**Page:** `/partners`  
**Element:** Outcomes for referred candidates  
**Issue:** Partners (workforce boards, social services orgs) need to know what happens to the people they refer. The page says "You receive updates when referred individuals complete programs" — but doesn't say: How? How often? What format? This is weak for B2B partner trust.  
**Fix:** Add a brief partner reporting blurb: "Referral partners receive a completion notification and, with member consent, placement status updates via email." Concrete = trustworthy.

---

### P3 — Low Priority (Backlog)

---

**P3-1**  
**Page:** `/` (Homepage)  
**Element:** Hero section — "19 programs · Industry-recognized certifications"  
**Issue:** "19 programs" is a number that means nothing without context. Users don't know if that's a lot or a little, or which programs apply to them. The hero would convert better with specificity: "Google, IBM, AWS, CompTIA — choose your track."  
**Fix:** Replace "19 programs" bullet with 4 recognized logos or specific track names in the hero.

---

**P3-2**  
**Page:** All pages  
**Element:** LinkedIn as only social channel  
**Issue:** Footer links to LinkedIn only. For an organization serving underserved adults and community partners, Facebook and Instagram may be higher-traffic channels. No social follow widget = lost retargeting opportunity.  
**Fix:** Add Facebook/Instagram if active. Even if those accounts are sparse, establish the channels for pixel retargeting.

---

**P3-3**  
**Page:** `/apply`  
**Element:** Geographic friction message  
**Issue:** "We're currently serving the Austin area" appears AFTER users start the apply page, not before. Out-of-area users who get excited, start the form, then hit a geographic wall will bounce with a negative impression.  
**Fix:** Move the Austin-only caveat to a top-of-page callout: "Currently serving Austin, TX. Outside Austin? Apply anyway — we'll notify you when we expand." This sets expectations without discouraging.

---

**P3-4**  
**Page:** `/programs` (individual programs)  
**Element:** No per-program apply CTA  
**Issue:** Program pages list courses and salary ranges but it's unclear if each program card has a direct "Apply for this program" button. If users have to go back to `/apply` and re-select, that's friction.  
**Fix:** Add a direct "Apply for [Program Name]" button on each program card that deep-links to `/apply?program=[slug]`.

---

**P3-5**  
**Page:** `/contact`  
**Element:** Form topic dropdown  
**Issue:** Contact form has a "What can we help with?" field but no visible list of options in static view. If this is a free-text field, it creates noise. If it's a dropdown with options, it should include: "Apply," "Partner with us," "Hire a graduate," "General question."  
**Fix:** Confirm dropdown options cover all inbound intents and route accordingly (ideally to different email queues or CRM tags).

---

## Section 2 — Flow-by-Flow Analysis

### Homepage → Apply Path

**Flow:** Hero → "Apply" CTA → `/apply` → Form (JS) → Account creation  
**Friction points:**
1. Hero CTA says "Apply" but it's not immediately clear what you're applying for (training? a job?). The subheadline helps but headline-CTA pairing could be tighter.
2. Apply page explains the 3-step intake well — but the actual form is invisible without JS, meaning the experience degrades silently.
3. No progress indicator visible pre-form to indicate "you're 2 minutes away from submitting."

**Verdict:** Path exists and is reasonably clear. Main failure is JS-only form with no fallback.

---

### Apply Flow (Full Application)

**11-step process:** Apply → Overview → Membership → Assessment → Interview → Workforce Readiness → Resources → Training → Certify → Placement → Outcomes  
**Friction points:**
1. The 11-step process is described on `/how-it-works` but not surfaced on `/apply`. A user starting the form has no idea they're entering an 11-step journey. This can cause post-submit abandonment when they realize what's ahead.
2. Step 3 ("Membership — Join free") appears redundant with Step 1 ("Apply — no cost"). Users may not understand why there's both an application AND a membership step.
3. Steps 6–7 (Workforce Readiness, Resources) are vague. What does "Workforce Readiness" look like? How long? Is it required?

**Fix:** Add an abbreviated "What to expect" timeline on `/apply` — not the full 11 steps, but "1. Apply online (10 min) → 2. Counselor call (30 min) → 3. Start your program (within 2 weeks)."

---

### Partner Signup Flow

**Flow:** `/partners` → "Contact us to refer" → `/contact?topic=partnership`  
**Verdict:** Effectively a dead end. There is no self-service partner intake. A motivated workforce board director visiting this page cannot do anything except send a general contact message. High friction for a B2B conversion that's critical to referral pipeline.

---

### Employer Flow

**Flow:** `/employers` → (nothing)  
**Verdict:** This page has no conversion path. It reads like a draft. There is no form, no button, no next step. An employer cannot take any action from this page. **This is the site's most critical conversion gap.**

---

### Find Your Path Quiz

**Flow:** `/find-your-path` → 5 questions → [results?]  
**What works:** The quiz intro copy is strong — "Five questions, three ranked matches, plain-English why." It's accessible in tone. Question 1 is shown and is well-framed.  
**What's broken/unclear:**
1. The quiz result state is not verifiable via static crawl — it's JS-rendered. There's no way to confirm what happens after Q5. Does it show 3 program matches? Does it immediately prompt to apply? Does it capture email?
2. The quiz is linked from the FAQ as "Take the Career Quiz" and from nav as "Find Your Career" (which 404s). Navigation confusion.
3. There's no SMS/email capture on the quiz result ("Send me my results") — a major missed opportunity for lead nurturing.

**Fix:** On quiz completion: (1) Show top 3 matching programs with salary range, (2) Show "Apply for [top match] — free" CTA, (3) Offer "Email me my results" capture, (4) Add a "Not ready? Talk to a counselor" secondary CTA with phone number.

---

### CTAs Across All Pages — Dead Ends Audit

| Page | Primary CTA | Dead End? |
|------|-------------|-----------|
| `/` | Apply Now | ✅ Works |
| `/apply` | Start Application (JS form) | ⚠️ No fallback |
| `/programs` | View courses (expand) | ⚠️ No per-program apply |
| `/find-your-path` | Apply (top of page only) | ⚠️ No post-quiz CTA visible |
| `/how-it-works` | None visible at bottom | ❌ Dead end |
| `/partners` | Contact us to refer | ⚠️ Generic contact form only |
| `/employers` | None | ❌ Dead end |
| `/faq` | Contact Us / Apply Now | ✅ OK |
| `/contact` | Submit form | ✅ OK |

---

## Section 3 — Email Capture Opportunities

**Current state:** Zero email capture outside of the application form. The apply form requires account creation — this is a high-commitment ask for a first interaction.

**Missed opportunities:**
1. **Homepage exit intent / scroll trigger** — "Not ready to apply? Get notified when we expand to your city." Low commitment, high value for pipeline building.
2. **Quiz result email capture** — "Email me my top 3 program matches" — standard lead gen, high relevance.
3. **Programs page** — "Interested in [AWS Cloud]? Get notified when the next cohort opens." Per-program interest capture.
4. **FAQ page** — After answering questions, "Still have questions? Drop your email and we'll follow up." Low-friction conversion.
5. **Partners page** — Partner interest form with email + org name + type.

**Recommended priority:** Quiz result email capture (#2) + homepage scroll capture (#1) = highest ROI.

---

## Section 4 — Social Proof Assessment

**Current state:** Weak. The site has no named testimonials, no graduate photos, no video stories, no employer quotes.

**What exists:**
- Partner logos (Google, AT&T, Coursera) — credibility but not conversion-grade
- Stats: 25+ years, 2,000+ trained — credible but abstract
- Outcome claim: "$42K+ average starting salary" — single stat, buried in `/how-it-works`
- Founder bio mention: "Michael Brown, PMP — trained thousands across Austin Metro" — authority signal but no face/photo

**What's missing:**
- Named graduate stories (even 2–3 would dramatically increase trust)
- Employer testimonials ("We hired 3 WorkforceAP graduates..." type)
- Before/after narratives (unemployed → hired, specific salary delta)
- Success rate data (completion rate, placement rate)

**Impact:** For underserved populations (the target audience), social proof from peers is the #1 trust driver. "Someone like me did this and got a job" converts better than any stat or logo.

**Fix:** Collect 3 graduate stories within the next 30 days. Even brief: first name, city, program, old situation, new situation. Add to homepage above the fold and to the apply page.

---

## Section 5 — Value Proposition Clarity

**Assessment:** The core value prop is clear and differentiated:
- Free (no cost, no debt)
- Employer-aligned (not academic theater)
- Certifications from recognized brands (Google, IBM, AWS)
- Job placement included
- Loaner laptops (removes access barrier)

**What works:** The homepage hierarchy communicates "free + certified + job placement" effectively.  
**What's fuzzy:**
1. "Employer-aligned" is used frequently but never defined. What does it mean operationally? Do employers co-design curricula? Do they pre-commit to interviews? This is a meaningful differentiator if explained — currently it's just a phrase.
2. The 180-day post-hire support is mentioned on the homepage but the how-it-works page says "90-day post-hire support" (on the employers page). **Inconsistency — 180 vs 90 days.** This will undermine trust if an employer or graduate notices.
3. "Building toward national scale" / "Austin is our launch community" is mentioned 4+ times. This is good for managing expectations but repeated too often — it starts to feel like a caveat rather than a confidence signal.

**Fix:**
1. Define "employer-aligned" with one concrete sentence: "Our curriculum is reviewed by hiring managers and our graduates are matched to open roles before they finish training."
2. Reconcile the 180 vs 90-day post-hire support language — pick one and use it everywhere.
3. Reduce "launch community / Austin only" mentions to one clear callout per page max.

---

## Section 6 — Priority Matrix (Summary)

| ID | Priority | Page | Issue | Estimated Fix Time |
|----|----------|------|-------|--------------------|
| P0-1 | 🔴 P0 | `/employers` | No CTA, empty page — dead employer lead | 2–4 hrs |
| P0-2 | 🔴 P0 | `/find-your-path` | Quiz result → no apply CTA visible | 2–4 hrs |
| P1-1 | 🟠 P1 | `/partners` | No partner intake form, generic contact only | 4–8 hrs |
| P1-2 | 🟠 P1 | `/` (Homepage) | Zero testimonials / graduate outcomes | 8–16 hrs (content) |
| P1-3 | 🟠 P1 | `/apply` | JS-only form, no fallback, no preview | 2–4 hrs |
| P1-4 | 🟠 P1 | All pages | No email capture outside apply form | 4–8 hrs |
| P1-5 | 🟠 P1 | Nav | `/find-your-career` 404 — broken nav link | 15 min |
| P1-6 | 🟠 P1 | Nav | `/programs/compare` 404 — broken nav link | 15 min (or build page) |
| P2-1 | 🟡 P2 | `/employers` | "90-day support" not explained | 1 hr |
| P2-2 | 🟡 P2 | All pages | CTA label inconsistency | 1–2 hrs |
| P2-3 | 🟡 P2 | `/how-it-works` | $42K stat buried, 180 vs 90 day inconsistency | 1 hr |
| P2-4 | 🟡 P2 | `/faq` | Quiz named inconsistently | 30 min |
| P2-5 | 🟡 P2 | `/partners` | Weak partner outcomes reporting description | 1 hr |
| P3-1 | 🟢 P3 | Homepage hero | "19 programs" meaningless without context | 1 hr |
| P3-2 | 🟢 P3 | All pages | LinkedIn only social, no pixel channels | 2–4 hrs |
| P3-3 | 🟢 P3 | `/apply` | Austin-only caveat shown too late | 30 min |
| P3-4 | 🟢 P3 | `/programs` | No per-program direct apply CTA | 2–4 hrs |
| P3-5 | 🟢 P3 | `/contact` | Contact form topic options unclear | 1 hr |

---

## Appendix — Pages Audited

| URL | Status | Notes |
|-----|--------|-------|
| `workforceap.org/` | 200 | Homepage — functional |
| `workforceap.org/apply` | 200 | Form is JS-rendered |
| `workforceap.org/programs` | 200 | 19 programs listed |
| `workforceap.org/find-your-path` | 200 | Quiz intro visible, results unknown |
| `workforceap.org/find-your-career` | 404 | Broken nav link |
| `workforceap.org/partners` | 200 | Thin content, no intake form |
| `workforceap.org/employers` | 200 | Near-empty, no CTA |
| `workforceap.org/faq` | 200 | Good content, good CTAs |
| `workforceap.org/contact` | 200 | Functional |
| `workforceap.org/how-it-works` | 200 | Strong content, no bottom CTA |
| `workforceap.org/about` | 404 | No about page |
| `workforceap.org/programs/compare` | 404 | Nav link broken |

---

*Audit complete. — Forge ⚙️*
