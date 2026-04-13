# WorkforceAP UI Audit & Gameplan
**Date:** March 20, 2026

## Executive Summary

The platform has achieved a stable baseline for its 4 portals (Student, Admin, Partner, Employer). Essential workflows (application, enrollment, job review) are functional, but the user experience lacks full clarity, transparency, and data-driven insights necessary for a true 10-star stakeholder experience.

This gameplan outlines the immediate, short-term, and medium-term action items needed to refine the platform into a polished, launch-ready application.

## 1. Immediate Polish (Current Sprint)

We have addressed the critical "P0" functional blockers and high-impact slop issues:
- **Admin Stability:** Fixed `/admin/jobs` crashes through safer data-fetching mechanisms and graceful UI boundary fallback.
- **Form Integrity:** Clarified errors in the `ApplyEligibilityClient.tsx` wizard by adding contextual feedback instructing users to answer all prompts and supplying a fallback support phone number.
- **Security Hardening:** Enforced a fail-closed strategy for rate limiting when external Redis dependencies are missing, to ensure authentication endpoints are not left vulnerable.
- **Copy Polish:** Replaced non-actionable marketing phrases ("Empowering People", "wrap-around services") on the homepage with clear, precise wording ("Free Career Training + Certifications for Austin Workers", "loaner laptops, resume help...").
- **Salary Context:** Added disclaimers directly to program cards explaining that salaries are estimated metrics specifically for the Austin area.

## 2. Short-Term Improvements (Next 2 Weeks)

### Employer Portal
- **Job Pipeline Completion:** The employer portal needs a seamless end-to-end testing run. Validate job posting creation, admin approval pipeline, and candidate matching.
- **Candidate Presentation:** Add granular details to the employer matches interface to display specific assessment scores.

### Student Experience
- **"What Happens Next" Confirmation:** Following an application submission, immediately load a clear, visual timeline of next steps (e.g., waiting 48 hours for a counselor message) to reduce anxiety.
- **Dashboard Onboarding:** Introduce a guided modal or checklist on a student's first login to point them directly to their enrolled curriculum or next steps.

### Public Transparency
- **Add Success Stories:** Introduce a dedicated space on the homepage highlighting actual participant outcomes (or placeholder personas until real data comes in) to establish parent and community trust.
- **Flesh out the FAQ:** Answer critical questions about employment while training, hardware loaner requirements, and exact certification timelines.

## 3. Medium-Term Improvements (1-2 Months)

### Partner Growth & Insights
- **Partner Analytics Dashboards:** Build out robust metrics detailing the progress of candidates referred by partner organizations. Show completion rates, interview status, and ultimate job placements securely.
- **Partner Landing Page:** Implement the `/partners` landing page to describe to outside organizations the specific benefits of referring candidates through WorkforceAP.

### Design System and Micro-interactions
- **Interaction Alignment:** Fully implement CSS transition tokens across all interactive components (buttons, cards) to ensure standardized hover and active states (as listed in P2 Polish requests).
- **Consolidate Palettes:** Perform a site-wide sweep to remove any colors that do not map directly to the defined `tailwind.config.ts` brand tokens.

## 4. Documentation Recommendations
- **User Guides:** Create short, instructional `docs/` resources for the four distinct audiences (Applicants, Enrolled Students, Partners, Employers) to accompany the software release.
- **Brand Voice Guidelines:** Establish a permanent "Anti-Slop" glossary ensuring future marketing content remains concrete, localized, and outcome-oriented.