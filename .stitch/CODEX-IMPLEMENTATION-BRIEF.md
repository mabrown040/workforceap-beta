# WorkforceAP Mobile Implementation Sprint
Date: 2026-03-28
Branch: feature/mobile-stitch-sprint
Base: master

## Mission
Implement 4 Stitch-generated mobile designs as responsive Next.js components. Apply the designs at ≤640px breakpoints only. Do NOT break desktop. 

## Reference Files
All Stitch HTML is in `.stitch/`:
- `mobile-homepage-light.html` — Homepage mobile layout
- `mobile-programs.html` — Programs catalog mobile
- `mobile-apply.html` — Apply flow start screen mobile
- `mobile-quiz.html` — Find Your Path quiz mobile

Design system: `.stitch/golden-screens-mobile.json`

## Design Tokens (from Stitch)
- primary: #8c0f37 | primary-container: #ad2c4d
- secondary: #7b5800 | secondary-container: #ffbb00
- surface: #fcf9f8 | on-surface: #1c1b1b
- on-surface-variant: #584144 | outline-variant: #debfc2
- No 1px solid borders (use bg shifts for separation)
- Glassmorphism nav: bg/80 + backdrop-blur-[12px]
- Primary CTA: gradient from #8c0f37 to #ad2c4d, rounded-md
- Font: Inter throughout

## Task 1: Homepage Mobile (app/page.tsx)
Implement the `.stitch/mobile-homepage-light.html` design as the ≤640px view of the homepage.
Key elements:
- Compact glassmorphic sticky nav
- Hero: enrollment badge, H1 with gradient span, proof line, 2 CTAs full-width stack
- Partner logo horizontal scroll
- 3-stat row
- Journey 4-step horizontal scroll cards
- Bottom nav bar (Home active)

## Task 2: Programs Mobile (app/programs/page.tsx)
Implement `.stitch/mobile-programs.html` as ≤640px view.
Key elements:
- Filter chips horizontal scroll (categories)
- Featured Digital Literacy card full-width crimson gradient
- 2-column program card grid
- Sticky "Can't decide? Take the quiz" bottom bar (above nav)
- Bottom nav (Programs active)

## Task 3: Apply Flow Start Screen Mobile (app/apply/page.tsx)
Implement `.stitch/mobile-apply.html` as ≤640px view.
Key elements:
- 3-step mini-flow indicator horizontal
- Time estimate pill
- Progress bar Step 1 of 4
- First question with 4 large tap-target answer cards
- Full-width crimson Next button
- Security badge at bottom

## Task 4: Find Your Path Quiz Mobile (app/find-your-path/page.tsx)
Implement `.stitch/mobile-quiz.html` as ≤640px view.
Key elements:
- 5-step progress bar 40% filled
- Large question card
- 4 full-width answer options with icons
- Back/Continue nav row
- Skip for now + reassurance text

## Shared: Bottom Nav Component
Create `components/MobileBottomNav.tsx` — sticky bottom nav used on all 4 pages.
4 tabs: Home (house icon) | Quiz (quiz icon) | Programs (school icon) | Apply (assignment_turned_in icon)
Active tab: crimson bg, filled icon.
Only visible at ≤640px (hidden md:hidden).

## Constraints
- Use Tailwind only (no new CSS files unless absolutely necessary)
- Use Material Symbols Outlined (already installed)
- Preserve all existing desktop behavior and all portal routes
- Each page must be SSR-safe (no client-only code without 'use client')
- No lorem ipsum, use real WorkforceAP copy
- Run `npm run build` before submitting PR — must pass

## Output
- Branch: `feature/mobile-stitch-sprint`
- PR title: feat(mobile): Stitch mobile sprint — homepage, programs, apply, quiz
- Report files changed + build passing in PR description

---

## UPDATE: 2 Additional Screens Added (2026-03-28)

### Task 5: Employers Page Mobile (app/employers/page.tsx)
Reference: `.stitch/mobile-employers.html`
Implement at ≤640px: partner logos scroll, proof metrics row, talent category chips, 4-step hiring process, full-width CTA, inquiry form.

### Task 6: What We Do Page Mobile (app/what-we-do/page.tsx)
Reference: `.stitch/mobile-what-we-do.html`
Implement at ≤640px: impact stats row, mission/values cards, 4-step program flow, partner pills, bottom CTA band.
