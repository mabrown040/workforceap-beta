# Cursor Cloud Agent Prompt: P2 Polish Sprints

## Task Overview
Implement 7-star versions of two approved sprints:
1. Mobile micro-interactions (1-1.5 days)
2. Design polish with design system foundation (2 days)

**CRITICAL: Anti-Slop Guardrails Enforced**

---

## Sprint 1: Mobile Micro-interactions (7-Star)

### Requirements
- **Button interactions**: Scale to 0.97 on press, 200ms cubic-bezier(0.4, 0, 0.2, 1) transition, subtle shadow reduction
- **Card hover states**: translateY(-4px), increased shadow, 250ms transition
- **Page transitions**: Fade between routes, 300ms
- **Sticky header**: Shrink from 80px to 60px on scroll (>100px), smooth transition
- **Touch targets**: Minimum 48px, hero buttons 52px
- **Loading skeletons**: Pulse animation for content loading states
- **Focus states**: Visible 2px outline for accessibility (not just color change)

### Technical Constraints
- Use CSS custom properties for animation values
- Respect `prefers-reduced-motion` media query
- Must maintain Lighthouse mobile performance >90
- No JavaScript-heavy libraries (use CSS transforms)

### Files to Modify
- `css/main.css` — Add interaction tokens and base transitions
- `components/ui/Button.tsx` — Add press states
- `components/ui/Card.tsx` — Add hover lift effect
- `app/layout.tsx` — Add sticky header shrink behavior
- `components/ui/Skeleton.tsx` — Create skeleton component

---

## Sprint 2: Design Polish + Design System (7-Star)

### Requirements
- **Spacing system**: 8px base unit (0.5rem), scale: 4, 8, 12, 16, 24, 32, 48, 64, 96
- **Color consolidation**: Audit and reduce to single palette
  - Primary: WorkforceAP blue (keep existing)
  - Secondary: Success green, warning yellow, error red
  - Neutrals: 9 grayscale steps
- **Typography hierarchy**: 
  - H1: 2.5rem/700, H2: 2rem/600, H3: 1.5rem/600
  - Body: 1rem/400, Small: 0.875rem/400
  - Line-height: 1.5 for body, 1.2 for headings
- **Border radius**: 8px (standard), 12px (large cards), 4px (small elements)
- **Shadows**: 3 levels (sm, md, lg) using rgba black at 5%, 10%, 15%
- **Max-width containers**: 640px (sm), 768px (md), 1024px (lg), 1280px (xl)

### Design System Documentation
Create `docs/design-system.md` with:
- Token reference (colors, spacing, typography)
- Component usage guidelines
- Do/don't examples

### Files to Modify
- `css/main.css` — Add CSS custom properties for all tokens
- `tailwind.config.ts` — Sync tokens with Tailwind config
- Audit all page.tsx files for inconsistencies
- Fix: mismatched padding, rogue colors, inconsistent border-radius

---

## 🚨 ANTI-SLOP GUARDRAILS (MANDATORY)

### Content Rules
1. **NO generic marketing copy** — Every word must have specific meaning
2. **NO buzzwords** — Avoid: "revolutionary," "cutting-edge," "innovative," "world-class," "seamless," "holistic"
3. **NO placeholder text** — No "Lorem ipsum," no "Coming soon," no "TBD"
4. **NO vague benefits** — Instead of "improve your life," use "prepare for entry-level healthcare jobs in 16 weeks"
5. **NO AI-sounding phrases** — Avoid: "In today's fast-paced world," "Are you tired of...", "Imagine a future where..."

### Voice Requirements (WorkforceAP Tone)
- **Direct**: Say exactly what you mean
- **Practical**: Focus on outcomes, not feelings
- **Specific**: Numbers, timelines, job titles
- **Respectful**: Career-changers 30+ are adults, don't talk down

### Examples of GOOD vs SLOP

| SLOP (REJECT) | GOOD (APPROVE) |
|---------------|----------------|
| "Transform your future with our revolutionary program" | "Train for a $45K healthcare job in 16 weeks. Free." |
| "Seamless integration of cutting-edge curriculum" | "Courses built with Ascension Seton hiring managers." |
| "Unlock your potential" | "87% of graduates start new careers within 6 months." |
| "In today's competitive job market..." | "Austin needs 2,400 new medical assistants by 2027." |

### Verification Checklist
Before any file is modified, verify:
- [ ] No buzzwords added
- [ ] All text is specific and verifiable
- [ ] Tone matches existing WorkforceAP voice
- [ ] No placeholder or vague language
- [ ] Numbers and timelines are accurate (or removed if unknown)

---

## Deliverables

1. **CSS custom properties** in `css/main.css`
2. **Updated Tailwind config** in `tailwind.config.ts`
3. **Design system docs** in `docs/design-system.md`
4. **Interaction components** (Button, Card, Skeleton)
5. **Sticky header** shrink behavior
6. **Performance check** — Lighthouse mobile >90

## Branch Naming
`p2/polish-micro-interactions-and-design-system`

## Auto-Create PR
Set `autoCreatePr: true` with detailed description of all changes.

---

## Success Criteria
- [ ] All interactions feel smooth and responsive
- [ ] Visual consistency across all pages
- [ ] No slop content introduced
- [ ] Performance maintained
- [ ] Design system documented
