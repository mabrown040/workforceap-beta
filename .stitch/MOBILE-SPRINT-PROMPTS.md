# WorkforceAP Stitch Mobile Sprint — Design Prompts
Date: 2026-03-28
Reference project: 491456976719912592
Base token: AQ.Ab8RN6LsHFEqlUAcysveJAXqIoRLCiB4RYZhIof8AQU2Lqw8pg

## Design system (from golden screens)
- Dark: #141313 surface, #e6e1e1 on-surface, #ad2c4d primary, #ffb2bc primary light
- Font: Inter, Material Symbols Outlined
- Bottom nav: 4 tabs (Home, Quiz, Programs, Apply)
- Cards: surface-container bg, rounded-xl, subtle border-outline-variant/15
- CTAs: bg-[#ad2c4d] text-[#670024] bold, or btn-outline
- Nav: fixed top, glass blur, bottom nav mobile-only

---

## PROMPT 1: Homepage Mobile (Final Optimized)
Design a mobile-first homepage for WorkforceAP (390px width, dark theme).

Requirements:
- Top: Compact glass nav with "WorkforceAP" wordmark + menu icon
- Hero block: Enrollment badge pill (pulsing accent) → H1 "Free Career Training" with gradient accent → 1 proof line (94% placement) → "Apply Free — 10 Minutes" CTA (full width, crimson) + "Find Your Path" secondary (outline)
- Trust strip: horizontal scroll with partner logos (Google IBM AWS CompTIA AT&T)
- Stats row: 3 stats side-by-side (19 Programs | $0 Cost | 12-24 wks)
- Journey preview: condensed 4-step horizontal cards (Quiz → Apply → Train → Hired)
- CTA band: "Start Your Career" full-width accent
- Bottom nav: Home (active), Quiz, Programs, Apply

Style: Dark #141313, Material Symbols, Inter bold, crimson accents, glassmorphism nav. No lorem ipsum. Real copy only.

---

## PROMPT 2: Apply Flow — Mobile Start Screen
Design a mobile application start screen for WorkforceAP (390px, dark theme).

Requirements:
- Header: "Program Admission" H1 + "assured_workload" Material Symbol
- Subtext: "Answer a few quick questions, choose a program, then create your account. No experience required. No cost to qualifying participants."
- 3-step mini-flow: horizontal card row with icons — [1. Check Fit] [2. Pick Program] [3. Create Account] — step 1 highlighted in accent
- Time estimate pill: "About 10 minutes" with timer icon
- Progress bar: 0% filled, labeled "Step 1 of 4"
- First question card: "What best describes your current situation?" with 4 large tap-target answer options (full-width radio cards, 56px min height each)
- Navigation: "Next →" full-width CTA + ghost "Save & Continue Later" link below
- Security assurance badge: lock icon + "Your info is private and secure"
- Bottom nav: Apply (active), Home, Quiz, Programs

Style: Dark theme, generous spacing, high-contrast answer cards with hover/selected state in accent color.

---

## PROMPT 3: Find Your Path — Quiz Mobile
Design a mobile career quiz interface for WorkforceAP (390px, dark theme).

Requirements:
- Top: "Find Your Path" H2 + "5 questions · 2 minutes" subtitle
- Persistent progress bar: step counter "2 of 5" + visual fill bar (40% filled)
- Question card: Large card with question text ("What type of work do you find most satisfying?")
- Answer options: 4 vertically stacked radio cards, full width, 60px height, with icon + label. Selected state: crimson border + soft accent fill
- Navigation row: "← Back" ghost + "Continue →" accent button
- Exit link: "Skip for now" small text at very bottom
- Reassurance text: "No commitment. No wrong answers."

Style: Dark, spacious, thumb-friendly. Answer cards must feel like native app choices not web form inputs.

---

## PROMPT 4: Programs Mobile — Filter + Bento List
Design a mobile programs catalog for WorkforceAP (390px, dark theme).

Requirements:
- H1: "Master Your Future." italic accent span
- Subtitle: "19 programs · $0 cost"
- Filter chip row: horizontal scroll — All Programs | IT & Cyber | AI & Software | Cloud | Business | Healthcare
- Featured card (full width, crimson gradient): Digital Literacy — "Start Here" badge, 4 weeks, $0, Apply button
- Program cards: 2-column grid below featured card, each with category tag, program name, duration, $0 badge, tap-to-apply
- Bottom nav: Programs (active), Home, Quiz, Apply
- Sticky CTA bar at bottom (above nav): "Can't decide? Take the 2-min quiz →"

Style: Filter chips as rounded-full pills. Cards as rounded-xl with surface-container bg. Featured card full-bleed gradient.

