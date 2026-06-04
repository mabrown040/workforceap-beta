# WorkforceAP Comprehensive UI/UX & Quality Gameplan
**Date:** March 20, 2026 (Updated post-audit)

## Executive Summary

We have performed an initial sweep of the accessibility structure, addressing high-priority duplicate `h1` headings across the Employer hub (`/employer/jobs`) and the Member hub (`/dashboard/messages`, AI tools). However, to reach a true "10-star" stakeholder experience, we must methodically address the structural, visual, and functional backlog identified in `PORTAL-UI-ONE-SHOT-TASK.md` and `GAMEPLAN.md`.

This gameplan synthesizes all audit findings into a prioritized roadmap for engineering and design.

---

## 1. Immediate Polish (Current Sprint)

**Objective:** Fix structural accessibility issues (Tier A) and glaring visual slop to establish trust.

*   **A1: Single `PageHeader` / One `h1` per route**
    *   **Status:** Partially completed (`/employer/jobs`, `/dashboard/messages`, `/dashboard/ai-tools/interview-practice`).
    *   **Action:** Systematically apply the unified `<PageHeader>` + `<PortalPageFrame>` root pattern to all remaining split mobile/desktop layouts.
    *   **Targets:** `/employer/applications`, `/employer/matches`, `/employer/messages`, `/partner/*`, `/counselor/*`.
*   **A2: Sidebar Navigation Accessibility**
    *   **Action:** Fix concatenated `listitem` labels in `WorkspaceShell` so screen readers parse spaces correctly (e.g., "Overview My Program" -> "Overview, My Program").
*   **A3: Dynamic Route Verification**
    *   **Action:** Spot-check dynamic routes (`/employer/jobs/[id]`, `/counselor/students/[id]`) for duplicate title patterns.
*   **B1-B3: Contrast & Color Semantics (WCAG)**
    *   **Action:** Remove "loud gold" on light backgrounds (replace with `on-surface`). Tone down large red numerals on the Employer hub to avoid reading as "errors."

---

## 2. Short-Term Improvements (Next 2-4 Weeks)

**Objective:** Refine layouts, density, component consistency, and core stakeholder workflows.

*   **C1-C7: Layout, Density, and Rhythm**
    *   **Employer Guide:** Fix the 3rd-step card orphan layout (use a single column stack or 3-col grid).
    *   **Voice Assistants:** Reduce vertical fluff on the Employer hub voice card; consolidate duplicate "assistant" text entries.
    *   **Partner Hub:** Unify header control rows (height, padding, border) and increase vertical rhythm between KPI cards.
    *   **Counselor Roster:** Replace the developer-default dashed empty state box with a soft-filled surface and icon matching the portal system.
*   **Workflow Completion:**
    *   **Employer:** Validate end-to-end job pipeline, candidate matching, and presentation of assessment scores.
    *   **Student:** Implement a "What Happens Next" timeline immediately post-application to reduce anxiety, and add a first-login guided modal.

---

## 3. Medium-Term Strategic Improvements (1-2 Months)

**Objective:** Expand analytics, elevate public perception, and strictly enforce the design system.

*   **Public Transparency & Content:**
    *   Highlight real (or persona-driven) success stories on the homepage.
    *   Expand the FAQ regarding hardware loans, employment during training, and certification timelines.
*   **Partner Growth:**
    *   Build robust partner analytics dashboards showing referral completion rates, interview status, and job placements.
    *   Launch a dedicated `/partners` landing page explaining referral benefits.
*   **Design System Enforcement:**
    *   Audit and implement global CSS transition tokens for all interactive states (hover, active).
    *   Consolidate all loose color hex codes to strictly use `tailwind.config.ts` brand tokens.

---

## 4. Documentation & Verification Guardrails

*   **Screenshot Matrix:** Ensure every static path listed in `portal-audit-paths.mjs` has an updated desktop and mobile PNG stored in `docs/portal-screenshots/` to prevent visual regression.
*   **User Guides:** Publish instructional resources for Applicants, Students, Partners, and Employers.
*   **CI/CD:** Integrate `npm run audit:portal` securely into the CI pipeline to catch route drift automatically.