# WorkforceAP UX/Design Audit
**Date:** 2026-03-27  
**Auditor:** Forge ⚙️  
**Site:** https://workforceap.org  
**Methodology:** Content + structure review via web fetch across all public pages; mobile responsiveness assessed via layout/content patterns; navigation map reconstructed from nav headers found in 404 responses and footer.

---

## Navigation Map (Reconstructed)

From nav headers and footer observed across all pages:

**Top Nav:**
- About Us → What We Do | Partners | Leadership Team | For Employers | How It Works
- Programs → All Programs | Find Your Career | Program Comparison | Salary Guide
- Jobs
- Blog
- FAQ
- **Apply Now** (CTA button)
- Sign in
- Contact Us

**Footer:**
- Programs: All Programs | Find Your Career | Compare Programs | Salary Guide | Apply Now
- About: What We Do | How It Works | Partners | Leadership Team | For Employers | FAQ | Contact Us
- Email | Phone | LinkedIn | Privacy | Terms

---

## Issues — Ranked by Priority

---

### 🔴 P0 — Critical (Conversion-Killing / Broken)

---

**P0-1 | `/about` — Page 404s**  
- **Page:** `/about`  
- **Element:** Nav link "About Us" dropdown; direct URL  
- **Issue:** `https://workforceap.org/about` returns a 404. The top-level "About" concept exists as a dropdown parent but clicking the parent label would 404. Users who type or share `/about` hit a dead end.  
- **Fix:** Either create an `/about` redirect to `/what-we-do`, or make the nav dropdown parent non-clickable with a clear visual affordance (e.g., chevron + disabled cursor). At minimum, set up a 301 redirect.

---

**P0-2 | `/find-your-career` — Link in nav goes to quiz but `/programs/find-your-path` 404s**  
- **Page:** Programs dropdown → "Find Your Career"; FAQ links to `/find-your-path`  
- **Element:** FAQ answer says `[Take the Career Quiz](/find-your-path)` but that path 404s  
- **Issue:** The FAQ page contains a broken internal link pointing to `/find-your-path`. The actual working path appears to be `/find-your-career`. Any user following this link from FAQ hits a 404.  
- **Fix:** Update FAQ link href from `/find-your-path` to `/find-your-career`. Audit all internal links for consistent path naming.

---

**P0-3 | `/jobs` — Page renders as loading state with no fallback**  
- **Page:** `/jobs`  
- **Element:** Job board content area  
- **Issue:** The Jobs page renders as "Loading jobs…" with a note that applying is for members. A first-time visitor sees a blank, loading state with no indication of how many jobs exist, what types, or when/if they'll load. Non-members likely see a permanently spinning state.  
- **Fix:** Show at minimum: (a) a count or category summary of current openings even to unauthenticated users, (b) a static example of job types/employers, or (c) a clear "Sign in to view jobs" gate instead of silent loading. Add a skeleton UI or empty state with a CTA ("Apply to access employer-matched jobs").

---

### 🟠 P1 — High (Significant Friction, Trust Damage, or Conversion Drop)

---

**P1-1 | `/apply` — Apply form appears to be a wizard/multi-step but no form fields visible in content**  
- **Page:** `/apply`  
- **Element:** Application form  
- **Issue:** The apply page describes "3 quick questions, choose a program, create your account" but the actual form fields appear to be rendered via JavaScript (not present in fetched HTML). If JS fails or loads slowly, users see no form — just a headline and instructions. On slow mobile connections (common for the underserved target audience), this creates a dead zone.  
- **Fix:** Ensure the eligibility questions are server-rendered or have a no-JS fallback. Consider progressive enhancement. At minimum, add a visible loading indicator and a phone number alternative prominently placed above the fold: "Prefer to call? (512) 777-1808".

---

**P1-2 | Home — No real social proof or graduate testimonials**  
- **Page:** Home (`/`)  
- **Element:** Trust section  
- **Issue:** The homepage lists partner logos (Google, AT&T, Coursera) and credentials (founder stats, partner org names) but contains **zero graduate testimonials, success stories, or outcome numbers** such as "X graduates placed" or "Y% job placement rate." The target audience (underserved adults, skeptical of "free" offers) needs human validation to overcome trust barriers.  
- **Fix:** Add 2–3 short testimonial cards with photo, name, program completed, and outcome (e.g., "Went from $14/hr to $28/hr in 4 months"). Even a single compelling story above the fold would dramatically increase conversion. The blog has a success story section — pull one excerpt to the homepage.

---

**P1-3 | Navigation — "About Us" is a dropdown with no direct landing page**  
- **Page:** Global nav  
- **Element:** "About Us" dropdown parent  
- **Issue:** "About Us" is a dropdown menu grouping (What We Do, Partners, Leadership Team, For Employers, How It Works) but clicking the parent label hits a 404. This is confusing UX — a primary nav item that looks clickable but isn't (or is broken). On mobile, dropdowns are typically tap-to-expand, making this even more confusing.  
- **Fix:** Either (a) create an `/about` page that serves as an overview landing page for the section, or (b) make the dropdown parent label non-linkable (pointer: none, no href) with a visible expand/collapse chevron.

---

**P1-4 | `/employers` — Thin content, no CTA or form**  
- **Page:** `/employers`  
- **Element:** Full page  
- **Issue:** The Employers page has only 2–3 sentences of content. There's no form, no call-to-action button, no way for an employer to express interest directly from the page. The page headline says "Hire Certified, Job-Ready Tech Talent" but then… nothing actionable happens.  
- **Fix:** Add an employer contact form or at minimum a visible CTA ("Tell us about your hiring needs") linking to `/contact?topic=employer`. Add 2–3 employer benefits bullets, a brief process description, and ideally a quote from a hiring partner. This is a key revenue/partnership acquisition page that's currently dead-ending.

---

**P1-5 | Programs page — 19 programs listed but no filter or category navigation**  
- **Page:** `/programs`  
- **Element:** Program listing  
- **Issue:** All 19 programs are listed sequentially. While categories exist (AI & Software Dev, Cloud & Data, IT & Cybersecurity, Business, Healthcare, etc.), there's no jump-to-category nav, filter by interest/level/duration, or visual separation between categories beyond a small label. A first-time visitor scrolling through 19 cards will experience fatigue and may not find their best fit.  
- **Fix:** Add sticky category filter tabs or sidebar at the top of `/programs`. Consider anchoring each category (`#ai-software`, `#cloud-data`, etc.) so the "Find Your Career" quiz can deep-link to results. The salary guide has a clean table — link to it more prominently from programs.

---

**P1-6 | Mobile — JS-heavy pages risk blank screens for target audience**  
- **Pages:** `/apply`, `/jobs`, and likely `/find-your-career`  
- **Element:** Core conversion flows  
- **Issue:** The target audience (underserved individuals, often on lower-end Android devices, slower connections) is most vulnerable to JS rendering failures. Multiple conversion-critical pages appear to rely on client-side rendering for their primary content. At 375px, a blank or loading form is a conversion killer.  
- **Fix:** Audit lighthouse mobile performance score. Ensure LCP (Largest Contentful Paint) for Apply and Jobs is under 2.5s. Add server-side fallback for core form steps. Consider a lightweight "Apply via phone/text" option above the fold on `/apply` for mobile users.

---

### 🟡 P2 — Medium (Friction, Missed Opportunity, Clarity Issues)

---

**P2-1 | FAQ — Only "Admissions" category visible**  
- **Page:** `/faq`  
- **Element:** FAQ accordion/sections  
- **Issue:** The FAQ page shows only the "Admissions" section in the fetched content, with a handful of questions. For a workforce training program, users have many more questions: Cost? Schedule? Equipment? What if I drop out? What happens if I don't find a job? The FAQ appears either very thin or the remaining sections aren't rendering.  
- **Fix:** Ensure all FAQ categories render (Programs, Schedule, Technology/Equipment, Post-Placement, Employer). If JavaScript-gated, ensure SSR for initial FAQ content. Consider adding a search box for FAQs.

---

**P2-2 | Contact page — Form fields visible but no confirmation state described**  
- **Page:** `/contact`  
- **Element:** Contact form  
- **Issue:** The contact form has standard fields (name, email, phone, message) but there's no visible indication of what happens after submit — no "You'll get a response within 24–48 hours" confirmation page description in the content, no success/error states referenced. Also, "What can we help with?" appears to be a free-text or dropdown field but it's not clear which.  
- **Fix:** Add a visible form success state ("Thanks! We'll get back to you within 24–48 hours. Check your email."). Make the topic selector a defined dropdown with clear options (Programs, Partnership, Employer, General). Add field validation feedback.

---

**P2-3 | `/partners` — Referral flow described but no actual referral form linked**  
- **Page:** `/partners`  
- **Element:** Referral CTA  
- **Issue:** The Partners page explains the referral process well but the CTA is "Contact us to refer" which links to `/contact?topic=partnership`. There's no dedicated referral intake form — partners have to write a freeform message. This creates friction and inconsistency in how referral data is collected.  
- **Fix:** Build a simple referral form (Referrer name/org + Candidate name + Candidate contact + Notes) either as a standalone page or modal. Or add pre-filled mailto: for the contact form that structures the referral request.

---

**P2-4 | Home — "19 Programs" stat is prominent but no direct path to find the right one**  
- **Page:** Home (`/`)  
- **Element:** Stats bar ("19 Programs · $0 Cost · 16–20 Weeks…")  
- **Issue:** "19 Programs" is one of the first stats a visitor sees, but there's no adjacent CTA like "Not sure which one? → Take the quiz." A confused visitor confronted with 19 options may bounce rather than dig.  
- **Fix:** Add a secondary CTA next to or below the stats bar: "Not sure where to start? → Find Your Career Path (2 min)". This surfaces the quiz/pathfinder tool for undecided visitors.

---

**P2-5 | Blog — All posts attributed to "WorkforceAP Team" with no author bylines**  
- **Page:** `/blog`  
- **Element:** Post author attribution  
- **Issue:** Every blog post is credited to "WorkforceAP Team" — no individual names, photos, or credentials. For a mission-driven org led by credentialed experts (Michael Brown PMP, board members with IBM/Microsoft/AWS backgrounds), anonymous team attribution is a missed trust opportunity.  
- **Fix:** Attribute posts to named authors where possible. Even a rotating "WorkforceAP Team, reviewed by Michael Brown PMP" would add credibility. Create author profile pages or bios.

---

**P2-6 | `/leadership` — Team profiles lack photos**  
- **Page:** `/leadership`  
- **Element:** Team cards  
- **Issue:** Leadership profiles have structured paths (`/leadership/michael-brown`) suggesting individual profile pages exist, and have detailed bios, but the photo src paths are included in the nav structure (suggested by `/leadership/michael-brown` prefix pattern). If photos are not loading or displaying at small sizes on mobile, the leadership section loses significant trust value.  
- **Fix:** Verify all leadership photos are loading correctly on mobile (375px). Ensure images have proper `alt` text. Consider adding LinkedIn profile links for each leader — this audience values verifiable credentials.

---

**P2-7 | `/salary-guide` — Excellent content but buried in Programs submenu**  
- **Page:** `/salary-guide`  
- **Element:** Navigation placement  
- **Issue:** The Salary Guide is excellent decision-support content (full table of all 19 programs, salary ranges, ramp difficulty) but it's buried as a 4th item in the Programs dropdown. Many visitors won't find it.  
- **Fix:** Reference the salary guide contextually on the homepage ("See what certified graduates earn →"), on program cards, and in the Apply flow. Consider a "What could you earn?" section on the homepage linking to it.

---

**P2-8 | "Find Your Career" path — Quiz exists but unclear from nav label**  
- **Page:** Programs dropdown  
- **Element:** Nav label "Find Your Career"  
- **Issue:** "Find Your Career" is vague — it could mean browsing, applying, or something else. The actual function (a guided quiz/pathfinder) isn't communicated by the label.  
- **Fix:** Rename to "Career Quiz" or "Find Your Path (2 min)" to set expectations. Add a quiz icon. On mobile, the subtle label difference gets lost.

---

### 🟢 P3 — Low (Polish, Consistency, Minor UX)

---

**P3-1 | Footer — "LinkedIn ↗" is the only social link**  
- **Page:** Global footer  
- **Element:** Social links  
- **Issue:** Only LinkedIn is listed. For a program targeting underserved adults, many of whom are active on Facebook, Instagram, or YouTube (where video testimonials live), the absence of other channels limits reach and community building.  
- **Fix:** Add Facebook/Instagram/YouTube links to footer if accounts exist. If they don't, consider prioritizing creation — especially short-form video testimonials on Instagram/YouTube for this audience.

---

**P3-2 | `/how-it-works` — Step 11 framing is weak**  
- **Page:** `/how-it-works`  
- **Element:** Step 11 "Better Life"  
- **Issue:** The last step is called "Better Life" with "Graduates average $42K+ starting in their new field" — but $42K average feels low given the program's emphasis on tech credentials (AWS at $95K–$145K). This might be dragged down by Digital Literacy track. The framing could create anchoring bias against the program's value.  
- **Fix:** Reframe Step 11 to use a range or highlight a more compelling outcome: "Most tech track graduates start $60K–$90K+. We support you until you land." Or break out averages by track category.

---

**P3-3 | `/what-we-do` — "$700k Revenue Turnaround" stat may confuse applicants**  
- **Page:** `/what-we-do`  
- **Element:** Credentials section  
- **Issue:** The stat "$700k Revenue Turnaround — Revitalized Goodwill Career & Technical Academy" is meaningful to grant funders and institutional partners but may confuse or be irrelevant to job-seeking applicants who are the primary audience. It frames success in financial/org terms rather than human outcomes.  
- **Fix:** Move financial/org metrics to a separate "For Funders" or "About Our Leadership" section. Lead the What We Do page with participant-focused outcomes (people trained, jobs landed, wage growth), not revenue stats.

---

**P3-4 | Privacy Policy — References to Supabase are exposed**  
- **Page:** `/privacy`  
- **Element:** Section 4 Data Security  
- **Issue:** The privacy policy explicitly names "Supabase" as the authentication provider. While not a security vulnerability on its own, naming the exact stack in public-facing legal docs is unnecessary and could inform bad actors about the tech stack.  
- **Fix:** Replace "secure authentication through Supabase" with "secure third-party authentication infrastructure." This is minor but professionally cleaner.

---

**P3-5 | Contact page — "I'd prefer to be contacted by text message" checkbox could be more prominent**  
- **Page:** `/contact`  
- **Element:** Contact preference  
- **Issue:** The SMS preference option is buried as a checkbox below the phone field. For the target demographic (mobile-first, often more comfortable with texting than email), this preference should be surfaced more prominently.  
- **Fix:** Move the SMS preference checkbox to directly after the phone number field with a clear label. Consider making it a toggle or radio button group: "Prefer to be reached by: Email / Phone call / Text."

---

**P3-6 | Terms page — Not audited (no fetch attempted)**  
- **Page:** `/terms`  
- **Element:** N/A  
- **Issue:** Terms page was not fetched in this audit. Should be verified to exist (not 404), be readable, and include expected sections (ToS, acceptable use, membership terms, content ownership).  
- **Fix:** Verify page exists and loads; check last-updated date is current (not years old); ensure it references the member portal and AI tools now in use.

---

## Summary Table

| ID | Priority | Page | Issue | Impact |
|----|----------|------|-------|--------|
| P0-1 | 🔴 P0 | `/about` | 404 on top-level About URL | Trust / nav |
| P0-2 | 🔴 P0 | `/faq` | Broken link to `/find-your-path` | Conversion |
| P0-3 | 🔴 P0 | `/jobs` | Permanent loading state for non-members | Trust / retention |
| P1-1 | 🟠 P1 | `/apply` | JS-dependent form may not render on mobile | Conversion |
| P1-2 | 🟠 P1 | Home | Zero graduate testimonials | Trust |
| P1-3 | 🟠 P1 | Global nav | About Us parent link is broken/confusing | Navigation |
| P1-4 | 🟠 P1 | `/employers` | Thin page, no CTA or form | Partnership acquisition |
| P1-5 | 🟠 P1 | `/programs` | 19 programs, no filter | Discoverability |
| P1-6 | 🟠 P1 | `/apply`, `/jobs` | Mobile JS rendering risk for target audience | Conversion |
| P2-1 | 🟡 P2 | `/faq` | FAQ appears thin / partially rendered | Trust |
| P2-2 | 🟡 P2 | `/contact` | No form confirmation state visible | UX |
| P2-3 | 🟡 P2 | `/partners` | No dedicated referral form | Partner UX |
| P2-4 | 🟡 P2 | Home | 19 Programs stat with no quiz CTA nearby | Conversion |
| P2-5 | 🟡 P2 | `/blog` | All posts anonymous, no author trust | Trust |
| P2-6 | 🟡 P2 | `/leadership` | Photos may not be loading; no LinkedIn links | Trust |
| P2-7 | 🟡 P2 | `/salary-guide` | Excellent content, buried in sub-nav | Discoverability |
| P2-8 | 🟡 P2 | Nav | "Find Your Career" label unclear | Navigation |
| P3-1 | 🟢 P3 | Footer | Only LinkedIn; no Facebook/Instagram/YouTube | Reach |
| P3-2 | 🟢 P3 | `/how-it-works` | $42K avg starting salary undercuts value | Framing |
| P3-3 | 🟢 P3 | `/what-we-do` | Revenue stats confuse applicant audience | Relevance |
| P3-4 | 🟢 P3 | `/privacy` | Supabase named in privacy policy | Polish |
| P3-5 | 🟢 P3 | `/contact` | SMS preference checkbox buried | Accessibility |
| P3-6 | 🟢 P3 | `/terms` | Not verified to exist/be current | Compliance |

---

## Top 5 Quick Wins (Highest ROI, Lowest Effort)

1. **Fix broken links** — `/about` 404 and `/find-your-path` in FAQ. 15-min fix. Stops trust-killing dead ends.
2. **Add 2 testimonials to homepage** — Pull from blog success story. No new content needed. Immediate trust lift.
3. **Add CTA to `/employers`** — 30-min fix. Link to contact form with pre-selected topic. Recovers a dead conversion path.
4. **Jobs page empty state** — Show category list + "Sign in or apply to view openings" instead of spinning loader. 1-hr fix.
5. **Add quiz CTA near stats bar on homepage** — "Not sure which program? Take the 2-min quiz →". One line of copy + link.

---

## Pages Confirmed Audited

| Page | URL | Status |
|------|-----|--------|
| Home | `/` | ✅ Audited |
| Programs | `/programs` | ✅ Audited |
| Apply | `/apply` | ✅ Audited |
| What We Do (About) | `/what-we-do` | ✅ Audited |
| Contact | `/contact` | ✅ Audited |
| Blog | `/blog` | ✅ Audited |
| Jobs | `/jobs` | ✅ Audited |
| Find Your Career | `/find-your-career` | ⚠️ Exists in nav; not directly fetched |
| Partners | `/partners` | ✅ Audited |
| Employers | `/employers` | ✅ Audited |
| FAQ | `/faq` | ✅ Audited |
| How It Works | `/how-it-works` | ✅ Audited |
| Leadership | `/leadership` | ✅ Audited |
| Salary Guide | `/salary-guide` | ✅ Audited |
| Privacy | `/privacy` | ✅ Audited |
| Terms | `/terms` | ❌ Not fetched |
| `/about` | `/about` | 🔴 404 confirmed |
| `/find-your-path` | `/find-your-path` | 🔴 404 confirmed |

---

*Audit conducted via content extraction (web_fetch). Visual/CSS issues requiring screenshots (typography, color contrast, spacing, image rendering) were not directly observable — a browser-rendered visual audit at 375px is recommended as a follow-up for P1-6 and P2-6.*

*— Forge ⚙️*
