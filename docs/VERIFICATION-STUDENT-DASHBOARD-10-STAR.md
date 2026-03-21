# Student Dashboard 10-Star — Verification

## Summary
Student home evolved from generic dashboard to student-success coach: Today/Next Step workflow with one dominant primary action, one secondary, stage-aware guidance, job-outcome framing, less nav overload, and specific recommendations.

## Design

### Today / Next Step
- **One primary action** — The single most important next step (choose program, take assessment, continue training, view career readiness)
- **One secondary action** — Alternative: "How It Works", "View Program", "Or: Build your resume", "Browse jobs in your area"

### Stage-Aware Guidance
- **A (no program):** Choose program → How it works
- **B (no assessment):** Take assessment → View program
- **C (in progress):** Continue training (next course) → Or: [top job-readiness action]
- **D (all complete):** View Career Readiness → Browse jobs or [top action]

### Job-Outcome Framing
- Copy ties training to outcomes: "Finish training to move toward job-ready — employers see your progress"
- State D: "Build readiness and apply — resume, applications, interview practice move you toward offers"
- Matched roles: "Ranked by fit to your skills and program. Apply when you're ready."

### Specific Recommendations
- Replaced 3-button "Suggested for you" block with single "Also: [specific action]" or "Next: [specific action]"
- Uses `getCareerBriefContext` recommendedActions (prioritized: resume → interview → applications → resources)

### Nav Overload
- Sidebar grouped: Core (Home, Program, Training), Tools (AI Tools, Career Readiness, etc.), More (Learning, Recap, Profile, Settings)
- Recent activity and checklist collapsed in details

### Preserved
- Welcome message
- Progress bar (compact)
- Continue training CTA
- MatchedRoles (assessment-complete users)
- Onboarding checklist (collapsed)

## Verification
- `npm run build` — ✅ passes
- Routes: `/dashboard` renders with new layout per state
