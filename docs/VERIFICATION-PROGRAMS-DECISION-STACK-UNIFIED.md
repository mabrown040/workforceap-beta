# Verification: Programs Decision Stack Unified 10-Star Upgrade

## Overview

This PR unifies the programs decision stack (`/programs`, `/programs/[slug]`, `/find-your-path`, `/program-comparison`, `/salary-guide`) into one connected decision system. The goal is to improve decision clarity, confidence, and fit without bloating pages or sterilizing the brand.

## Changes by Page

### 1. `/find-your-path` — Front-Door Recommendation Engine

**Before:** Simple "Top 3" results with minimal reasoning. Generic conversion CTA.

**After:**
- **Confidence-building reasoning:** Each result card shows a "why this fits" explanation derived from quiz answers (e.g., "You're interested in computers and technology — IT and software programs line up well.")
- **Dynamic summary:** Subtitle uses `getTopFitSummary(answers)` to reflect what drove the recommendations (interests, experience, timeline, priorities).
- **Job outcomes:** Result cards show "Roles: X · Y · Z" from `programExtras`.
- **Clear next steps:** Primary CTA applies to top match; secondary links to "Compare programs" and "Salary guide."
- **"View full program details"** link on each card.

**New files:** `lib/content/quizReasoning.ts` — maps quiz answers to human-readable fit reasoning per program category.

### 2. `/programs` and `/programs/[slug]` — Fit Guidance

**Enhancements:**
- **Ramp notes:** `programExtras` now includes optional `difficulty` (1–3) and `rampNote` (e.g., "No tech background required. Our shortest program.").
- **Program detail page:** Displays `rampNote` when present, alongside "Best for" and "Job outcomes."
- **Programs catalog:** Already had best-for and job outcomes from previous PR; preserved.

### 3. `/program-comparison` — Decision Guidance

**Before:** Table/cards with basic stats. No guidance on how to choose.

**After:**
- **"How to Choose" section:** Bulleted decision guide covering:
  - Time (6–8 weeks vs 16–20 weeks)
  - Difficulty (⭐–⭐⭐⭐) and what it means
  - Tech comfort (beginner vs comfortable)
  - Salary vs ramp tradeoff
- **Job outcomes on cards:** Each comparison card shows "Roles: X · Y · Z" when available.
- **Pathfinder CTA:** Retained in hero.

### 4. `/salary-guide` — Fit + Path Framing

**Before:** Pure salary focus. Risk of salary bait.

**After:**
- **Fit-first context block:** "Salary is one factor. The right program also fits your timeline, tech comfort, and goals. Higher pay often means a steeper learning curve — choose a path you can commit to."
- **Links to pathfinder and comparison** before the salary table.
- **Updated insights:** "Highest Paying Programs" now notes fit/ramp: "Best if you can invest 4–6 months and enjoy technical problem-solving. Not every path fits everyone."
- **Bottom CTA:** "Not sure which program fits you? Take the 2-minute pathfinder quiz."

## Data / Content

- `lib/content/programExtras.ts`: Added `difficulty` and `rampNote` to key programs (Digital Literacy, AWS, CompTIA A+, Cybersecurity, AI Developer).
- `lib/content/quizReasoning.ts`: New module for quiz → fit reasoning.

## Verification Steps

1. **Find Your Path**
   - Complete the 5-question quiz.
   - Confirm each result card shows reasoning (e.g., "You're interested in...") and job outcomes.
   - Confirm CTA applies to top match; links to compare and salary guide work.
   - Return to find-your-path with stored results; confirm "Previous Results" shows (reasoning hidden when no answers).

2. **Programs**
   - Visit `/programs` and `/programs/aws-cloud-technology-amazon` (or another program with rampNote).
   - Confirm "Ramp:" line appears where applicable.

3. **Program Comparison**
   - Visit `/program-comparison`.
   - Confirm "How to Choose" section appears above the table.
   - Confirm comparison cards show "Roles:" when available.

4. **Salary Guide**
   - Visit `/salary-guide`.
   - Confirm fit context block and pathfinder/comparison links appear.
   - Confirm insight cards mention fit/ramp; bottom CTA includes pathfinder link.

## Preserved

- Dad's voice and brand tone.
- Credibility signals: duration, salary, skills, partner/certification.
- No generic nonprofit copy.
- Existing pathfinder, programs, and comparison structure.
