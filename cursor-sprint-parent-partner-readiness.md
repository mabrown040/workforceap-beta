# Cursor Sprint: Parent & Partner Readiness
**Date:** 2026-03-20  
**Priority:** High — prepare site for stakeholder approval (parents, partners)  
**DO NOT MODIFY:** Hero headline and "$0 Cost to Qualifying Participants" text

---

## Tasks (6 Items)

### 1. Program Cards - Add Salary Disclaimers
**File:** `/programs` page  
**Change:** Add small disclaimer text under salary ranges  
**Current:** `"Starting salary: $85K-$135K"`  
**New:** `"Starting salary: $85K-$135K"` + `<small>*Austin-area median based on industry data</small>`

---

### 2. Replace "Breaking Systemic Barriers" Language  
**Files:** Homepage, `/what-we-do`  
**Current:** `"Breaking systemic barriers through education, technology, and opportunity"`  
**New:** `"Free career training and certifications for Austin-area residents"`  
**Also replace in footer if present**

---

### 3. Create `/partners` Public Page  
**New file:** `app/partners/page.tsx`  
**Sections:**
1. Hero: "Partner with WorkforceAP"
2. What is a Partner: Referral orgs, workforce boards, nonprofits, government agencies
3. Partner Benefits:
   - Dedicated Partner Portal
   - Real-time milestone notifications
   - Analytics dashboard
   - Priority support
4. How Referrals Work:
   - Option 1: Send candidates to apply (select your org in dropdown)
   - Option 2: Admin assigns post-application
5. Become a Partner: Contact form or email info@workforceap.org
6. FAQ: 5 partner-specific questions

**Add to navigation:** Under "About Us" dropdown

---

### 4. Expand FAQ Page  
**File:** `/faq` or `app/faq/page.tsx`  
**Add 10 questions:**
1. What if I don't have a computer?
2. Can I work while in the program?
3. What certifications will I actually earn?
4. Do you guarantee job placement?
5. What makes this different from other training programs?
6. How do I become a referring partner?
7. Do you pay referral fees?
8. How do I track my referrals?
9. What support do students receive?
10. What happens if someone fails a certification exam?

---

### 5. Success Stories Section (Homepage)  
**File:** Homepage  
**Add:** 2-3 placeholder cards above footer  
**Content:**
- Marcus T. — IT Support Graduate — $58K at TechCorp
- Sarah K. — Data Analytics Graduate — $72K at HealthFirst  
- James R. — Cybersecurity Graduate — $85K at SecureNet
**Note:** "Real graduate stories coming soon"

---

### 6. Mobile Header Spacing Fix  
**File:** Dashboard header component  
**Issue:** Student/Admin/Sign out buttons overlap on mobile  
**Fix:** Add responsive spacing or stack buttons vertically on screens < 640px

---

## Technical Notes
- Match existing Tailwind styling
- Maintain accessibility standards
- Test mobile responsiveness
- Do NOT change hero headline
- Do NOT change "$0 Cost to Qualifying Participants"

---

## Deliverables
- PR with all 6 changes
- Screenshots of /partners page
- Screenshot of updated FAQ
- Mobile header screenshot
