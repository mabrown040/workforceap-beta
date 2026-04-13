# WorkforceAP Marketing Copy Rewrite — Inventory & Wording Audit

**Date:** 2026-04-11
**Branch:** claude/naughty-kalam
**Purpose:** Structured audit of all public marketing pages to guide a sitewide copy rewrite. Read-only — no source files modified.

---

## Page Inventory

### 1. Programs Catalog

| Field | Value |
|---|---|
| **Route** | `/programs` |
| **Source files** | `app/(decision-journey)/programs/page.tsx`, `app/(decision-journey)/programs/ProgramsContent.tsx` |
| **Audience** | Participant (primary), general |
| **Current top CTA** | Desktop: "Find Your Career →" (ExperimentedCtaLink, A/B with "Take 2-Min Quiz →") → `/find-your-path`; Mobile: fixed-bottom strip "Can't decide? Take 2-min quiz" → `/find-your-path`; bottom section: "Start Application" → `/apply` |
| **student/member wording** | Uses **"members"** correctly in the bottom CTA block ("no cost to eligible members"). No "student" found. |
| **Red-flag terms** | None in these files |
| **Rewrite priority** | **Medium** — Copy is generally clean but the desktop hero intro ("Bridging the education-to-career gap") and eyebrow label ("Curated Excellence") feel generic/abstract. The 4-step journey section could be tightened. Secondary CTAs ("Or compare programs side-by-side") are well-targeted. |

---

### 2. Find Your Path (Quiz)

| Field | Value |
|---|---|
| **Route** | `/find-your-path` |
| **Source files** | `app/(decision-journey)/find-your-path/page.tsx`, `app/(decision-journey)/find-your-path/FindYourPathClient.tsx` |
| **Audience** | Participant |
| **Current top CTA** | Desktop hero: "Ready now? Start your application" (ExperimentedCtaLink, A/B with "Apply now (10 minutes)") → `/apply`; quiz results: "Start [Program Name] Application →" → `/apply?program=...`; secondary "Talk to a counselor first" → `/contact` |
| **student/member wording** | Uses **"members"** correctly in results footer ("All programs are available at no cost to members."). Alt text on sidebar image reads "Students collaborating on career training" — red flag (line 95 of page.tsx). |
| **Red-flag terms** | **"Academic Navigator"** — appears twice as an eyebrow label badge on both desktop (line 37) and mobile (line 129) layouts of `page.tsx`. This is an internal/institutional product name, not participant-facing language. |
| **Rewrite priority** | **High** — "Academic Navigator" label is prominently displayed to participants on a key conversion page. Sidebar image alt text uses "students". The quiz itself and result copy are participant-friendly but the eyebrow branding contradicts the member-focused voice. |

---

### 3. Program Comparison

| Field | Value |
|---|---|
| **Route** | `/program-comparison` |
| **Source files** | `app/(decision-journey)/program-comparison/page.tsx`, `app/(decision-journey)/program-comparison/ProgramComparisonClient.tsx` |
| **Audience** | Participant |
| **Current top CTA** | Desktop hero: "Not sure? Take the 2-minute pathfinder quiz" (ExperimentedCtaLink, A/B with "See your top-fit track in 2 minutes") → `/find-your-path`; bento section: "Apply Now" → `/apply`; bottom: "Apply Now" → `/apply` |
| **student/member wording** | Uses **"members"** correctly ("All WorkforceAP programs are offered at zero cost to members."). No "student" found. |
| **Red-flag terms** | None in these files |
| **Rewrite priority** | **Medium** — Hero headline "Architect Your Civic Future" is abstract and editorial — unlikely to resonate with a first-time visitor who does not know WorkforceAP's positioning. Eyebrow "Curator Comparison" is jargon. The functional comparison content (decision guide, table, starter cards) is solid. |

---

### 4. Salary Guide

| Field | Value |
|---|---|
| **Route** | `/salary-guide` |
| **Source files** | `app/(decision-journey)/salary-guide/page.tsx` |
| **Audience** | Participant |
| **Current top CTA** | Desktop: "Find your best-fit programs (2-min quiz)" → `/find-your-path`; bottom: "Apply Now" → `/apply`; Mobile: "Speak to an Advisor" → `/apply` |
| **student/member wording** | Uses **"member"** correctly (mobile CTA card: "Free career coaching for every member"). No "student" found. |
| **Red-flag terms** | None in this file |
| **Rewrite priority** | **Low** — Copy is factual and grounded. The insights grid is strong. Growth trajectory section is generic ("most graduates" language could be sharpened). Mobile CTA card headline "Maximize Your Growth." is aspirational but appropriate. |

---

### 5. Apply

| Field | Value |
|---|---|
| **Route** | `/apply` |
| **Source files** | `app/apply/page.tsx` |
| **Audience** | Participant |
| **Current top CTA** | Hero section is the form itself; fallback CTAs: "Contact a counselor" → `/contact`, "Call (512) 777-1808" |
| **student/member wording** | Uses **"participants"** in hero body ("No cost to qualifying participants."). Sidebar steps include "Program Selection" icon labeled `school`. No "student" in visible copy. |
| **Red-flag terms** | **"Institutional Portal"** — appears at line 193 as the hero eyebrow label badge ("Institutional Portal" with an `assured_workload` icon). This is internal/bureaucratic framing exposed to participants on the highest-conversion page of the site. |
| **Rewrite priority** | **High (P0)** — "Institutional Portal" is the biggest red flag across the entire site. It is displayed as the first text a participant reads on the application page. The hero heading "Program Admission" is also cold and institutional; "Start Your Application" or similar would serve participants better. |

---

### 6. FAQ

| Field | Value |
|---|---|
| **Route** | `/faq` |
| **Source files** | `app/faq/page.tsx` (delegates to `FAQContent.tsx` and `FAQMobileSection.tsx`) |
| **Audience** | Participant, parent/supporter, general |
| **Current top CTA** | No explicit primary CTA on the page shell; FAQContent and FAQMobileSection (not audited as files) likely contain CTAs |
| **student/member wording** | Page shell is clean — no red-flag terms found in `page.tsx`. No "student" in shell. |
| **Red-flag terms** | None found in `page.tsx` shell |
| **Rewrite priority** | **Low** — Page shell and metadata are appropriate. The description "For applicants, parents, partners, and anyone with questions" is inclusive. Interior content (FAQContent, FAQMobileSection) was not included in scope but should be checked separately during rewrite. |

---

### 7. How It Works

| Field | Value |
|---|---|
| **Route** | `/how-it-works` |
| **Source files** | `app/how-it-works/page.tsx` |
| **Audience** | Participant, general |
| **Current top CTA** | Three hero CTAs: "Find your career" → `/find-your-path`, "Apply now — free" → `/apply`, "View programs" → `/programs`; bottom section: "Apply For Next Cohort" → `/apply`, "Speak with an Advisor" → `/contact` |
| **student/member wording** | Uses **"members"** throughout and correctly (150-Day Support, loaner laptops "Zero upfront cost for qualifying members", benefits section "exclusive community of members and alumni"). Eyebrow label: "Member Experience" — well-positioned. |
| **Red-flag terms** | None found |
| **Rewrite priority** | **Low** — Strong member-centric language throughout. Hero heading "Start your path starts here." has a grammatical quirk (repeated "starts") that should be fixed. CTA "Apply For Next Cohort" implies a cohort model that may not match all programs. Bottom CTA copy "Join hundreds of successful members" lacks specificity. |

---

### 8. What We Do

| Field | Value |
|---|---|
| **Route** | `/what-we-do` |
| **Source files** | `app/what-we-do/page.tsx` |
| **Audience** | General, potential partners, funders |
| **Current top CTA** | Hero: "Explore Our Impact" → `/programs`, "Discuss Partnership" → `/contact?topic=partnership` |
| **student/member wording** | Uses **"participants"** (bento card: "No tuition for members. No prerequisites. Funding comes from grants and partnerships — participants are not charged for access."). Mixes "members" and "participants" — needs alignment. No "student" found. |
| **Red-flag terms** | None found |
| **Rewrite priority** | **Medium** — Mixes "participants" and "members" terminology within the same section, which will confuse if a brand standard is chosen. The page is primarily stakeholder/funder-facing, so clarity matters. Hero headline "Creating Opportunity" is strong but generic; subhead is good. Values section is solid. |

---

### 9. Employers

| Field | Value |
|---|---|
| **Route** | `/employers` |
| **Source files** | `app/employers/page.tsx` |
| **Audience** | Employer |
| **Current top CTA** | Hero: CTA to employer contact form (`#employer-contact-form`); Partnership tiers: "Start Standard Intake", "Start Partner Intake", "Start Upskill Intake" all → `#employer-contact-form` |
| **student/member wording** | Uses **"members"** when referring to program participants ("Members complete training", "AI-powered career support: Members use guided AI tools"). Employer-specific content does not misuse "students". |
| **Red-flag terms** | **"AI-powered"** — line 365: "AI-powered career support: Members use guided AI tools for resumes, interviews, and applications while a counselor keeps the human layer." |
| **Rewrite priority** | **Medium** — "AI-powered" on the employer page is a marketing claim that warrants review (acceptable here since it's describing a real feature to a sophisticated audience, but should use consistent language with the member portal). Primary concern: the VALUE_CARDS section uses "Members complete training and are vetted through the Workforce Advancement Project process" — slightly verbose. |

---

### 10. Partners

| Field | Value |
|---|---|
| **Route** | `/partners` |
| **Source files** | `app/partners/page.tsx` |
| **Audience** | Partner organizations, referral partners, funders |
| **Current top CTA** | Each partner type card has a next-step CTA: "Contact to Refer", "Explore Co-Delivery", "Discuss Alignment", "Learn How to Support" — all → `/contact?topic=partnership` |
| **student/member wording** | Uses **"individuals"**, **"clients"**, and **"participants"** appropriately for the partner context. No "student" found. |
| **Red-flag terms** | PLATFORM_FEATURES section contains "Smart Intake" card with copy: "AI-assisted enrollment and eligibility screening reduces onboarding time by 60%, letting counselors focus on high-touch support." — this uses "AI-assisted" (variant of AI-powered). Not a strict match but worth noting. |
| **Rewrite priority** | **Low** — Partner-facing page with appropriate terminology. The "AI-assisted" claim with a specific metric (60%) needs a source or should be softened. FAQ section ("Who can become a partner?") is clear and inclusive. |

---

### 11. Contact

| Field | Value |
|---|---|
| **Route** | `/contact` |
| **Source files** | `app/contact/page.tsx` (delegates to `ContactFormClient.tsx`, `ContactMobileSection.tsx`) |
| **Audience** | All audiences |
| **Current top CTA** | "Send Us a Message" form (ContactFormClient); fallback: call (512) 777-1808 or email info@workforceap.com |
| **student/member wording** | No red-flag terms in page shell. |
| **Red-flag terms** | None found in `page.tsx` |
| **Rewrite priority** | **Low** — Page shell copy is clean. Desktop hero "Connect with Authority" is abstract; the sub-eyebrow "The bridge between ambition and institutional impact" is oddly formal for a contact page. Consider simpler framing like "We respond within 24–48 hours." |

---

### 12. Blog

| Field | Value |
|---|---|
| **Route** | `/blog` |
| **Source files** | `app/blog/page.tsx` (delegates to `BlogListingClient.tsx`) |
| **Audience** | General, SEO |
| **Current top CTA** | No explicit CTA on page shell beyond navigation |
| **student/member wording** | No red-flag terms in page shell |
| **Red-flag terms** | None found in `page.tsx` |
| **Rewrite priority** | **Low** — Metadata description contains "career-ready individuals nationwide" which is appropriate. PageHero subtitle "Career tips, program spotlights, success stories, and local insights." is adequate. Blog is primarily SEO/content-driven. |

---

### 13. Program Detail

| Field | Value |
|---|---|
| **Route** | `/programs/[slug]` |
| **Source files** | `app/(decision-journey)/programs/[slug]/page.tsx`, `app/(decision-journey)/programs/[slug]/ProgramDetailClient.tsx` |
| **Audience** | Participant |
| **Current top CTA** | Mobile: back-link to `/programs`, then program cards; Desktop (via page.tsx): the page renders detailed program info with "Apply" and "Compare" links. The generateMetadata description ends with "Apply today." |
| **student/member wording** | No red-flag terms found in either source file |
| **Red-flag terms** | None found |
| **Rewrite priority** | **Medium** — The metadata description template uses "qualifying individuals" (not "members"), which may need alignment. The page shell delegates most copy to components (`ProgramDetailClient`, `ProgramRelatedSection`, `ProgramOnetCareerSection`) — those components were not in scope but should be reviewed. ProgramDetailClient.tsx copy is functional ("Skills you'll learn", "Course list") with no issues. |

---

## Red Flag Hits Summary

### "student" / "students"

Occurrences in **public marketing pages** being audited:

| File | Line | Text |
|---|---|---|
| `app/(decision-journey)/find-your-path/page.tsx` | 95 | `alt="Students collaborating on career training"` (image alt text in sidebar) |

Occurrences in **portal, admin, and internal code** (not marketing pages — listed for awareness):

- `app/(auth)/signup/SignupForm.tsx:20` — `'Student'` (role label in signup form)
- `app/(auth)/login/LoginForm.tsx:17` — "Student roster, messaging, and resources for counseling partners." (portal description)
- `app/privacy/page.tsx:90,94,95` — FERPA/student references (legally appropriate in privacy policy)
- `app/(portal)/employer/candidates/[studentId]/page.tsx` — `studentId` parameter (internal URL)
- `components/forms/ParentalConsentForm.tsx` — "Student Information", "Student Date of Birth" (minor consent form — may be intentional)
- `components/admin/InviteForm.tsx:224` — `<option value="member">Student</option>` (admin invite role label — should be "Member")
- `components/admin/InvitesTable.tsx:27` — `member: 'Student'` (admin display label — should be "Member")
- `components/portal/EmployerPipelineClient.tsx:86` — `<option value="student_notified">Student notified</option>` (status label in employer portal)
- `lib/ai/matchStudents.ts` — `StudentMatch`, `matchStudentsForJob` (internal code identifiers)
- `lib/counselor/memberStatus.ts:5,37` — Code comments referring to "student" (counselor layer)
- `lib/content/leadership.ts:161,180` — Bio copy mentioning "student performance tracking" (factual historical reference)
- `lib/blog/defaultImages.ts:44` — `alt: 'Students studying together'` (blog image alt text — should be updated)

### "Academic Navigator"

| File | Lines | Context |
|---|---|---|
| `app/(decision-journey)/find-your-path/page.tsx` | 37, 129 | Eyebrow badge label on both desktop and mobile layouts — directly participant-facing |

No other occurrences found in app/, components/, or lib/.

### "Institutional Portal"

| File | Line | Context |
|---|---|---|
| `app/apply/page.tsx` | 193 | Hero eyebrow badge label — directly participant-facing, highest-traffic conversion page |

No other occurrences found in app/, components/, or lib/.

### "AI-powered"

| File | Line | Context |
|---|---|---|
| `app/page.tsx` | 116 | Homepage hero body copy: "...{WORKFORCEAP_PROGRAM_CATALOG_SIZE} specialized programs, professional guidance, and Workforce Readiness with AI-powered tools designed to help people move forward." |
| `app/page.tsx` | 205 | Feature bullet: "Workforce Readiness through AI-powered tools" |
| `app/employers/page.tsx` | 365 | Employer differentiation section: "AI-powered career support: Members use guided AI tools..." |
| `app/admin/ai-tools/page.tsx` | 24 | Admin page subtitle (internal — not public) |
| `app/(portal)/dashboard/ai-tools/page.tsx` | 14, 84 | Member portal metadata and page copy (portal — logged-in only) |
| `app/(portal)/dashboard/ai-tools/resume-rewriter/page.tsx` | 66 | Portal tool description (portal — logged-in only) |
| `tests/e2e/visual-regression-smoke.spec.ts` | 59 | Test file looking for homepage heading (confirms homepage has this copy) |

**Marketing page hits:** `app/page.tsx` (homepage, 2 instances) and `app/employers/page.tsx` (1 instance).

---

## Shared Copy Files

### `lib/content/programs.ts`

- **Purpose:** Single source of truth for all 19 programs. Exports the `PROGRAMS` array and `WORKFORCEAP_PROGRAM_CATALOG_SIZE` constant.
- **What it contains:** Each program object includes: `slug`, `title`, `category`, `categoryLabel`, `categoryColor`, `borderColor`, `icon`, `duration`, `salary` (a display string like `"Starting salary: $85K-$135K"`), `skills[]`, `courses[]` (with `slug`, `name`, `estimatedHours`), and `partner`.
- **Rewrite relevance:** The `salary` field strings use the format `"Starting salary: $XXK-$XXK"` — used directly on program cards. If the rewrite wants to change how salary is labeled (e.g., "Starting range" vs "Starting salary"), this is the master source to update. Partner names (Google, IBM, Amazon Web Services, CompTIA, Microsoft) are locked as external brand names.
- **Red-flag status:** No "student", "AI-powered", "Academic Navigator", or "Institutional Portal" found in this file.

### `lib/content/programDescriptions.ts`

- **Purpose:** Provides 2–3 sentence category descriptions used on program detail pages (`getProgramDescription(category)`).
- **What it contains:** One description per category slug (`it-cyber`, `ai-software`, `cloud-data`, `business`, `healthcare`, `manufacturing`, `digital-literacy`). Descriptions use second-person ("you", "your") and are participant-facing.
- **Rewrite relevance:** These descriptions are copy that can be rewritten directly here. Current copy is adequate but generic ("Prepare for a career in...", "Build skills in..."). Rewrite opportunity: make them more specific about who the program is for and what participants gain.
- **Red-flag status:** No red-flag terms found.

### `components/Footer.tsx`

- **Purpose:** Sitewide footer used on most marketing pages.
- **What it contains:** Four nav columns (Programs, About, Support, brand column). Brand tagline: "Empowering the workforce through intentional education and industry-leading partnerships." Copyright: "Empowering People. Advancing Futures." Partner logos: State of Texas, Texas Workforce Commission, Workforce Solutions. O*NET attribution.
- **Rewrite relevance:** Tagline is acceptable but generic. CTA links in footer use labels like "Find Your Career", "Compare Programs", "Apply Now" — consistent with page CTAs. No member-facing copy in footer.
- **Red-flag status:** No red-flag terms found.

---

## Priority Summary

| Priority | Pages |
|---|---|
| **High** | `/find-your-path` (Academic Navigator badge), `/apply` (Institutional Portal badge) |
| **Medium** | `/programs` (hero copy), `/program-comparison` (hero headline), `/what-we-do` (member/participant terminology mix), `/employers` (AI-powered claim), `/programs/[slug]` (terminology in metadata + delegated components) |
| **Low** | `/salary-guide`, `/how-it-works` (minor fixes only), `/faq`, `/contact`, `/blog`, `/partners` |

---

## Additional Concerns Found During Audit

1. **Homepage not in audit scope but has 2 "AI-powered" hits** — `app/page.tsx` lines 116 and 205. The homepage is arguably the highest-traffic page and should be included in the rewrite.

2. **Terminology inconsistency: "members" vs "participants"** — Most pages use "members" but `/what-we-do` and `/apply` use "participants". A single standard should be chosen and applied sitewide. Current preference appears to be "members" based on frequency.

3. **Admin copy leaking "Student" as a role label** — `components/admin/InviteForm.tsx` and `components/admin/InvitesTable.tsx` display "Student" as the label for the `member` role. This creates internal confusion and should be changed to "Member" for consistency.

4. **Blog image alt text** — `lib/blog/defaultImages.ts:44` contains `alt: 'Students studying together'`. This is not a public page copy issue but affects SEO and consistency.

5. **"Academic Navigator" is a branded product name** — Both instances are on `/find-your-path` as an eyebrow label. If this is an internal product feature name, it should either be renamed for public audiences or replaced with participant-language like "Career Pathfinder" or simply omitted.

6. **Grammar issue on `/how-it-works`** — Hero H1: "Start your path starts here." — the word "path" is redundant (or "Start your" is). Should be "Your path starts here." or "Start here."
