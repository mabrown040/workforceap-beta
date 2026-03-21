# P0 Blocker Fix - Cursor Prompt (Composer 2)

Fix all P0 blockers for WorkforceAP prelaunch. This is a workforce development platform with 4 portals (Student, Employer, Partner, Admin).

## CRITICAL FIXES REQUIRED:

### 1. Admin Jobs Crash (URGENT)
- Fix server error on `/admin/jobs` route
- Check for null/undefined handling in job queries
- Add error boundaries to prevent white screen

### 2. Fake Testimonials Replacement
- Replace "Placeholder testimonials — real stories coming soon" on `/employers`
- Use interim copy: "Employer success stories are being collected. Contact info@workforceap.org for early partner references."
- OR if stats available: "Employer outcomes (updated quarterly): [# hired], [90-day retention], [avg time-to-hire]."

### 3. Employer Portal Cleanup (Prelaunch Mode)
- REMOVE "Job Postings (Free)" text from employer page
- DO NOT add pricing yet
- Simply show job posting feature without price mention
- Use "Coming soon" badge if needed for pricing

### 4. Apply Flow Fix
- Fix Step 1 Continue button staying disabled
- Add inline validation: "Please answer all questions to continue"
- Add phone fallback: "Having trouble? Call (512) 777-1808"

### 5. Security Hardening
- Fix rate limiting to FAIL CLOSED when Upstash env missing
- Add rate limiting to `/api/auth/login` endpoint
- Fix password reset to use strict allowlisted origin from env (not request headers)
- Add strict file validation to resume upload (PDF/DOC/DOCX only, MIME sniffing)

### 6. Error Boundaries
- Add `app/error.tsx` for route errors
- Add `app/global-error.tsx` for uncaught errors
- Add `app/admin/error.tsx` specifically for admin crashes

### 7. UX Improvements (Keep Dad's Language)
- KEEP existing buzzwords and mission language ("Empowering People, Advancing Futures", "Breaking systemic barriers")
- ONLY fix: Apply flow validation, employer testimonials, remove "FREE" mention
- Do NOT change hero text or mission language

### 8. Salary Disclaimer Fix
- Update `/programs` cards: "Salary range is Austin market estimate (Lightcast/BLS, Jan 2026). Actual pay depends on experience and employer."

## PRELAUNCH CONTEXT:
- This is prelaunch, building data phase
- Placement tracking will be improved post-launch
- Employer pricing TBD, just don't mention "FREE"
- Keep Dad's vision/language intact
- Focus on fixing broken functionality, not redesigning

## FILES TO MODIFY:
- `app/admin/jobs/page.tsx` or related (fix crash)
- `app/employers/page.tsx` (remove FREE, fix testimonials)
- `app/apply/page.tsx` or wizard (fix continue button)
- `app/api/auth/login/route.ts` (add rate limiting)
- `app/api/auth/forgot-password/route.ts` (fix host injection)
- `app/api/admin/members/[id]/upload-resume/route.ts` (file validation)
- `lib/rate-limit.ts` (fail closed)
- `app/programs/page.tsx` (salary disclaimer)
- Create `app/error.tsx`, `app/global-error.tsx`, `app/admin/error.tsx`

Run `npm run build` to verify all fixes compile correctly.
