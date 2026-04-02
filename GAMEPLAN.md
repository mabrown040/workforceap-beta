# WorkforceAP Gameplan: Full Site UI Audit, Polish, and QA

Based on recent audits (including `audit-comprehensive-2026-03-20.md`, `audit-qa-live-2026-03-20.md`, `.portal-audit/LIVE_SITE_AUDIT_2026-04-01.md`), here is the comprehensive gameplan for improving the site's UI and ensuring portal functionality works seamlessly.

## 1. Immediate Critical Fixes (P0)

*   **Tailwind Prefix Bug:** Fixed. The `wa-` prefix was missing from display utility classes (`hidden md:block`, `block md:hidden`), resulting in duplicate mobile/desktop UI blocks appearing simultaneously across multiple pages (e.g., `/contact`, `/signup`, `/programs`, etc.). This caused visual bugs and broke Playwright end-to-end tests that expected a single interactive element.
*   **Duplicate Contact Form (`/contact`):** Resolved via the Tailwind Prefix fix above. The layout now correctly bifurcates mobile and desktop form rendering.
*   **Employer Portal Setup:** The employer portal needs a seeded record in the database. End-to-end testing and the job approval workflow are currently blocked because no employers exist.
    *   *Action:* Use the available script `scripts/create-employer-michael-brown.ts` (via `pnpm run db:create-employer-michael-brown`) or API to seed initial employer data to unlock QA testing of the job posting flow.

## 2. Full Site Button & UI Polish (P1)

*   **Consistent Micro-interactions:** Implement scaled button interactions (press effects, cubic-bezier transitions) and card hover states (lift effect, shadow increase) as specified in `cursor-prompt-p2-polish.md`.
*   **Mobile Responsiveness:** Ensure the 11-step timeline on the homepage, the 4-column talent cards on the employer page, and the pricing tier comparison tables render correctly on narrow viewports without horizontal scrolling or text overflow.
*   **Jobs Board Population:** The `/jobs` page currently appears empty and abandoned.
    *   *Action:* Seed 3-5 sample job listings to demonstrate functionality until real employer data flows in.
*   **Success Stories:** Replace placeholder testimonials on `/employers` and add 3-5 graduate profiles (photos, outcomes, quotes) to the homepage to build social proof for parents and partners.
*   **Copywriting and Anti-Slop Check:** Eliminate vague marketing copy ("Breaking systemic barriers") in favor of concrete outcomes (e.g., "Train for a $45K healthcare job in 16 weeks"). Ensure consistent, direct, and practical language across all marketing pages.

## 3. QA of Portal Functions (P2)

*   **Skills Assessment Wizard:** The current skills assessment is a 35-question single page. Testing of the new 8-step wizard is blocked because the default test user has already completed the assessment.
    *   *Action:* Create a fresh test account or clear the assessment state for an existing test user to properly QA the new wizard.
*   **Admin Jobs Page Stability:** Ensure the server error on the `/admin/jobs` route is resolved. Add error boundaries (`app/admin/error.tsx`) to prevent white screens if database queries return null or fail.
*   **Super Admin Message Monitoring:** Ensure the newly implemented Super Admin message dashboard (`/admin/messages`) correctly tracks SLA breaches (e.g., counselor response >48h) and displays red alert badges without breaking existing counselor-member message flows.
*   **Rate Limiting & Security:** Verify that rate limiting on `/api/auth/login` fails closed if the Upstash environment is missing, and ensure file validation on resume uploads properly restricts to PDF/DOC/DOCX.

## 4. Post-Launch Enhancements (P3)

*   **AI Job Matchmaker:** Fully implement and test the AI-powered job matching system for students.
*   **Email Configuration:** Verify that Resend API keys are correctly configured in Vercel to allow contact form follow-ups and automated notifications (e.g., application accepted/rejected) to function in production.
*   **SEO and Internal Linking:** Review meta tags across all 19 program pages and connect blog posts to relevant program pages.

This gameplan provides a structured approach to stabilizing the WorkforceAP platform for pre-launch and ensuring all portals deliver a high-quality, 7-star experience.
