# WorkforceAP Site Audit — Call Notes (2026-04-03)
## Mike + Dad (Speaker 1) Session

> Parsed from voice transcript. Organized by section.

---

## 1. MARKETING / FRONT-END (Public Pages)

### 1.1 Homepage (`/`)
- [ ] **Swap nav CTA positions**: "Partner with Us" moves to middle, "Employers" moves to right (Partners more important than Employers right now)
- [ ] **Hero background**: Needs to be brighter/more uplifting
- [ ] **"Your Journey to Success" section**: Step labels need consistent alignment — "Welcome Onboard" wording is "making up stuff" — needs real copy
- [ ] **Wording simplification**: Some sections are "too complicated" — simplify language
- [ ] **Font size**: Increase text size across pages — accessibility concern (people with poor eyesight)
- [ ] **"Apply for Free" button**: Remove "for free" — just say "Apply Now". Make the word bigger, especially on mobile
- [ ] **"Find Your Career" button**: Should appear on every public-facing page (homepage, how-it-works, etc.)
- [ ] **Two career tools distinction**: Simple 6-question assessment = public/pre-member. O*NET deep dive = members-only career services

### 1.2 Find Your Path / Assessment (`/find-your-path`)
- [ ] **"Retake Assessment" button at TOP**: Currently hidden at the bottom — users don't know they've already completed it until they scroll down. Add prominent button at top saying "Retake Assessment" if already completed

### 1.3 What We Do (`/what-we-do`)
- [ ] **Simplify "Redefining the Architecture of Opportunity"** → "Creating Opportunity"
- [ ] **"How We Build Impact"**: Simplify language — "most people can't pronounce" some of the words
- [ ] **Success metrics wording**: Current "Your hire. When you land a job" is too job-centric. Reword to something like: *"Every program, partnership, and investment is designed to expand opportunities, strengthen skills, and deliver meaningful life and career outcomes."*
- [ ] **Key Partnerships list**: Government, Employers, Non-profit/Community Organizations **and Churches** (churches are key partners — add explicitly)

### 1.4 How It Works (`/how-it-works`)
- [ ] **Journey steps must be consistent**: The 11 steps shown here must match EXACTLY wherever they appear on the site
- [ ] **"Find Your Career" button**: Add before the application button on this page
- [ ] **"Your Journey with Us"** → Change to **"Your Journey with Workforce Advancement Project"** (use full name at least once)
- [ ] **Steps flow**: Apply → Overview → Membership → Assessment → Interview → Workforce Readiness/Resources → Training → Certification → Job Placement Assistance → (rename "Better Life" to something less ambiguous — TBD)
- [ ] **Laptop program section**: Remove "no upfront cost" — sounds like "we'll charge you later". Just say "Zero cost for qualifying members"
- [ ] **"50-day first-time support"**: Clarify this means continued check-ins after job placement
- [ ] **Training benefits wording**: Change "direct pipeline" — Dad got Austin hiring director contact

### 1.5 Programs (`/programs`)
- [ ] **"Industry recognized certificates"**: Change "certifications" → "certificates" (consistent terminology)
- [ ] **Diversify images**: Target 33% representation minimum across ethnicities (Black, Hispanic, Asian) — no page should be all-white stock photos
- [ ] **Salary data**: Keep pulling from Department of Labor / public data — that's correct

### 1.6 Partners Page (`/partners`)
- [ ] **Standard partner language across site**: "Non-profit services, churches, community organizations" — use this wording consistently everywhere partnerships are mentioned
- [ ] **Referral wording**: Change "best referrals" (sounds discriminating) → "Referrals motivated to improve the quality of their life and interested in training in those areas"
- [ ] **Response time commitment**: 48–72 hours for all referrals
- [ ] **Employers section**: Add "verified skills and certificates" to the value prop
- [ ] **Enterprise Upskill**: Not ready for detail yet, but keep the option — Dell scenario: "50 people, $4k/person for unlimited class access"

### 1.7 Leadership (`/leadership`)
- [ ] **Reorder nav**: What We Do → How It Works → **Leadership** → Partners → **Blog** → Contact Us
- [ ] **Blog should be in main nav** (currently not there)
- [ ] **Photo sizes inconsistent**: Brandon smaller, Derek bigger, Lakecia correct. Make all 3 columns equal
- [ ] **Bio details**: "People aren't gonna read those details yet" — keep accurate but consider condensing
- [ ] **Brandon**: Getting new photo within a week

### 1.8 Blog (`/blog`)
- [ ] **Default images**: Create inventory of ~20 curated images that match tone. When no custom image is added to a post, serve from this pool (not all the same generic photo)
- [ ] **Category-specific defaults**: Career tips, Program Spotlight, Success Story — each category gets its own subset of default images

---

## 2. MEMBER PORTAL (`/dashboard`)

### 2.1 General UX
- [ ] **Side panel / navigation redesign**: Organize intuitively — this is THE priority UX fix
- [ ] **Program info at top of pages**: "Having their program at the top might not be the move" — reconsider layout
- [ ] **Add text size increase option** across pages (accessibility)

### 2.2 Voice Agents ⭐ (Dad loved these)
- [ ] **Weekly check-in agent**: Working well, good tone, doesn't destroy self-esteem ✅
- [ ] **Resume coach agent**: Working well ✅
- [ ] **KEY FEATURE REQUEST**: Resume coach should work WITH uploaded resume — live edits while talking. If resume uploaded, coach pulls from it and suggests changes in real-time. If no resume, creates a baseline framework through conversation
- [ ] **Accept/reject changes**: Gate between AI suggestions and actual resume updates — user must approve each change
- [ ] **Voice agent counselor**: Change to woman's voice — "soft sweetie for the counselor, for everybody"

### 2.3 My Program (`/dashboard/program`)
- [ ] **Option to change programs**: Should require going through counselor (not self-service). Add "Request Program Change" button that sends notification to admin/counselor
- [ ] **Notification on change request**: Email to admin + assigned counselor when member requests program change

### 2.4 Training & Learning
- [ ] **Coursera API integration**: Training page should tie into exact Coursera modules
- [ ] **Combine related sections**: "Learning Hub", "Training", "My Program" could be one module
- [ ] **Certificates/Credentials**: Change "certifications" → "certificates" everywhere
- [ ] **Interest Profiler completion state**: If already completed, show results with option to retake (don't hide behind scroll)

### 2.5 O*NET Integration
- [ ] **Map O*NET recommendations to OUR courses**: Critical — the 19 programs need O*NET career codes tied to them
- [ ] **AI-powered matching**: Use stronger AI (Anthropic) to smartly match careers to training programs
- [ ] **"Refresh Matches" button**: Allow admin to re-run AI matching as programs change
- [ ] **Notifications**: When O*NET match identifies courses for a member → send email/notification: "Based on your profile, you'd be great for X, Y, Z courses"

### 2.6 Resume (`/dashboard/resume`)
- [ ] **Upload → Parse → Display**: When resume uploaded, it should be parsed and displayed formatted on the dashboard (not just stored)
- [ ] **Resume coach integration**: Voice coach should read from uploaded resume and make live suggestions
- [ ] **Resume + Profile = One View**: Profile and resume should be unified — all in one spot

### 2.7 Resources
- [ ] **Stop sending users off-site**: Resume tips, interview prep, LinkedIn guide — embed content inline instead of linking externally
- [ ] **Add voice coach**: Consider adding voice guidance for resource navigation

### 2.8 Job Board (`/dashboard/jobs`)
- [ ] **Currently empty** (no employer partners yet)
- [ ] **Interim solution**: Parse local jobs and serve on site. Admin-curated jobs pushed to members. Employer partner jobs highlighted/pushed to top
- [ ] **Job applications tracking**: Members should track both internal jobs AND external applications they've done elsewhere
- [ ] **Kanban improvement**: Cards should be draggable (click to move to different stage)

### 2.9 Messages (`/dashboard/messages`)
- [ ] **Members message assigned admin/counselor only**
- [ ] **NO cross-member communication**
- [ ] **Teachers/instructors**: Need portal access to communicate with student groups
- [ ] **Partners message their clients**: Gated to assigned members only
- [ ] **Counselors message their clients**: Also gated
- [ ] **Admins see everything**: Full cross-reference visibility

### 2.10 Career Readiness (`/dashboard/readiness`)
- [ ] **Live data**: Score must feed from actual profile data and user activity — not placeholder
- [ ] **Score explainer**: Clarify what boosts the score and what each metric means
- [ ] **LinkedIn integration**: Option to link LinkedIn profile → analyze and give feedback (instead of relying on non-technical users)
- [ ] **White on pink text issue**: Fix contrast — white text on light backgrounds

### 2.11 Skills Assessment
- [ ] **Separate from career matching**: Skills assessment (WIOA gate) ≠ skill mapping (job search). Don't merge into one screen
- [ ] **Shouldn't gate all features**: Assessment completion shouldn't block access to other portal features
- [ ] **Proactive follow-up**: When assessment completes → counselor/admin notification to reach out

### 2.12 Weekly Recap / Career Brief
- [ ] **Better UI/UX**: Hard to read, white text on light view
- [ ] **Pull from real metrics**: Combine all data points into job readiness scores with explanations
- [ ] **Weekly Recap + Career Brief should work together**: Not be separate disconnected features
- [ ] **Career Brief**: Should update weekly (currently stuck on March 21)

### 2.13 Profile (`/dashboard/profile`)
- [ ] **Profile photo upload**: Members need ability to upload profile picture
- [ ] **Combine Profile + Resume + Settings**: All user management in one place
- [ ] **Settings within profile**: Current separate settings page is redundant

---

## 3. ADMIN PORTAL (`/admin`)

### 3.1 Overview Dashboard
- [ ] **Add**: Jobs applied for (pulling from member self-added + internal jobs)
- [ ] **Add**: Per-member job application breakdown

### 3.2 Messages
- [ ] **Add counselors to messaging targets**: Currently admin can message members, employers, partners — add counselors
- [ ] **48-72 hour SLA tracking**: Show when last reply was vs SLA
- [ ] **Always messageable**: Anywhere there's a message option, admin should be able to message immediately

### 3.3 Members
- [ ] **Score explainer**: Add hover/tooltip on fit scores explaining calculation
- [ ] **Show**: Training completion count, last activity date
- [ ] **Future**: Email/notification automations based on activity
- [ ] **Employer visibility**: Employers see interested members only with member consent (consent toggle on job application)
- [ ] **Profile photo**: Show uploaded photo or serve generic placeholder
- [ ] **Program change**: Only admins can change member programs
- [ ] **Member change request**: Members can REQUEST change → admin approves
- [ ] **WIOA verification**: Third-party identity verification API (low cost, encrypted, private) — research options
- [ ] **Partner assignment**: Assign members to partner + subgroup. Partners should also be able to assign within their subgroups
- [ ] **Dual counselor assignment**: Partner counselor + WAP counselor + AI agent counselor — all three working together
- [ ] **Placement tracking**: Grants, starting salary, placement date — for WIOA reporting
- [ ] **Incentives**: Tag incentives on member responses (credit for more training, post-placement benefits)
- [ ] **Resume viewer**: View resume inline (popup) — not just download
- [ ] **Assessment UI**: Better dashboard view of pre-course assessment (not just plain text)

### 3.4 Interview Ready
- [ ] **Signals-based**: System should detect when member is ~70% through course → flag as interview-ready
- [ ] **Based on**: LinkedIn completeness, skill set, certificates, resume quality
- [ ] **Admin notification**: Surface interview-ready members proactively

### 3.5 Invites
- [ ] **All user types**: Student, counselor, partner, employer — all invitable from one place
- [ ] **Send from**: workforceap.org domain

### 3.6 Programs
- [ ] **Export for state approval**: Currently Texas-only. As multi-state expands, export needs to fit each state's Workforce Solutions / One-Stop center requirements
- [ ] **Dad has full 50-state list** of center names

### 3.7 Career Mappings
- [ ] **Combine with Programs view**: Career mappings + Programs should be one view — see what's mapped and add manual mappings
- [ ] **AI pre-match**: Don't require manual mapping of full O*NET database. AI should smartly match to the 19 programs
- [ ] **"Refresh Matches" button**: Re-run AI matching (consider Anthropic over Groq for better quality)

### 3.8 Blog Management
- [ ] **Default images**: 20-image pool as described in marketing section
- [ ] **Category defaults**: Different defaults per blog category

### 3.9 Jobs
- [ ] **Admin job sourcing**: Search + add jobs to database using AI agent. Find jobs matching students' zip code/location/remote → add to internal board
- [ ] **Employer partner jobs**: Manage and review

### 3.10 Employers
- [ ] **Tier management**: Basic → Hiring Partner → Enterprise Learning
- [ ] **Help section empty**: Add content or link to employer guide

### 3.11 Pipeline (Kanban)
- [ ] **AI-suggested movement**: Based on member progress, AI suggests stage changes → admin approves
- [ ] **Audit trail**: Every movement timestamped for WIOA compliance ("on this date, they moved to X stage")

### 3.12 Analytics
- [ ] **Weekly Recaps**: Better analytics as more data points collected
- [ ] **White on pink contrast fix**: Throughout admin
- [ ] **AI Tools usage**: Show which tools used by which member types
- [ ] **Certificates analytics**: Rename "certifications" → "certificates"

### 3.13 Settings
- [ ] **White-label ready**: Organization can customize name, colors, logo (for future white-label deployment)

---

## 4. PARTNER PORTAL (`/partner`)

### 4.1 Onboarding
- [ ] **30-second WAP overview**: When partner first logs in — video/voice presentation of what WAP does. Option to skip → static page instead
- [ ] **Each portal type should have intro**: Unique value-add presentation for members, employers, partners
- [ ] **Onboarding flow**: Should auto-advance through all steps (currently doesn't)
- [ ] **Highlight not blur**: Tour should highlight the active section, not blur it out
- [ ] **Referral link**: Easier way to copy it

### 4.2 Members / Referrals
- [ ] **Tracking**: All, Active, Placed, At Risk, **Sent** (track who they've sent the link to)
- [ ] **Attention queue**: Risk-based, with proactive next steps
- [ ] **Push notifications / emails**: When member needs attention
- [ ] **Direct messaging**: To their referred members within platform

### 4.3 Outcomes / Reporting
- [ ] **Outcome visibility**: As members progress through program
- [ ] **Monthly/weekly report**: Automated periodic report to partners
- [ ] **Export**: CSV with filtering + customization + preview of what export looks like
- [ ] **Real-time attendance sheets**: White-labeled with partner logo/org info
- [ ] **WIOA transparency**: Partners see when their members get WIOA approved → know contribution is coming

### 4.4 Milestones
- [ ] **Certifications, placements, progress**: All in one clear view

### 4.5 Partner Resources
- [ ] **Contact = Direct message to WAP** (not external contact form)

### 4.6 Partner Types
- [ ] **Community org partners**: Attached to organizations
- [ ] **Independent partners**: Individual contributors/consultants not attached to a non-profit
- [ ] **Both types**: Full visibility into client progress

### 4.7 Settings
- [ ] **View-only profile**: Partners can see but not freely edit org info
- [ ] **Suggest changes**: Partner submits change request → admin approves
- [ ] **No daily name changes**: Prevent abuse

### 4.8 Partner Abilities
- [ ] **Add counselors**: Partners can add their own counselors
- [ ] **Assign members to subgroups**: Partners manage their own cohort organization
- [ ] **Message members**: Gated to their assigned members only

---

## 5. DATA PRIVACY & SECURITY (Cross-cutting)

- [ ] **Gated messaging**: No user type can see/message outside their assigned scope
- [ ] **Admin full visibility**: Admins see everything including cross-references
- [ ] **Encrypted member data**: All PII encrypted at rest
- [ ] **No data leakage**: Database query isolation per role
- [ ] **WIOA compliance audit trail**: Timestamped stage movements, approvals
- [ ] **Third-party identity verification**: Research low-cost APIs for member identity verification
- [ ] **Instructor data isolation**: Teachers only see their class students

---

## 6. CROSS-CUTTING / TERMINOLOGY

- [ ] **"Certifications" → "Certificates"** everywhere
- [ ] **"Community organizations" includes**: Non-profits, churches, community orgs
- [ ] **Standard partner referral language**: Use consistent wording site-wide
- [ ] **"Find Your Career" button**: On every public page
- [ ] **11-step journey**: Must be identical wherever shown
- [ ] **WAP email addresses**: Members get @workforceap.org email for job applications
