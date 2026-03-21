# WorkforceAP Launch-Prep UI/UX Audit

**Goal:** Last-push cleanup before launch review. Understandable, prioritized changes across the public site.

**Constraints:** Preserve Dad's voice. No generic nonprofit slop. Protected: hero headline, $0 Cost to Qualifying Participants. Austin = launch wedge, not ceiling.

**Audit focus:** UX clarity, trust, mobile quality, CTA logic, visual hierarchy, consistency.

---

## Priority 1: Homepage Below Hero

**Problem:** Feels like stacked information blocks, not one orchestrated persuasion flow.

**Changes:**
- Add trust line above stats: "Employer-aligned. No participant debt. Success = you get hired."
- Strengthen fit guidance: "For you, if you're ready to launch" — Austin as launch community
- Add quiz CTA in For You section
- Journey steps: applicant-benefit-driven copy (24–48h response, no gatekeeping)
- Who We Are: Austin + national scale ("launch community; building toward expansion")
- Programs: outcomes ($48K–$145K), fit CTA
- Footer CTA: "Your Next Step" — decisive, pathfinder secondary

---

## Priority 2: Salary Guide Mobile — Last-Mile Polish

**Problem:** Intro copy, long-title readability, badge-row spacing, excessive top chrome on small screens.

**Changes:**
- Tighten intro: shorter fit lead; collapse PhotoHighlight on mobile
- Card layout for <640px (no table)
- Long program titles: line-clamp or smaller font on mobile
- Badge row: flex-wrap, gap, prevent cramping
- Reduce page-hero/PhotoHighlight padding on mobile
- Scoped table hide; cards only

---

## Priority 3: Programs Pages

**Problem:** Strong breadth but needs scan rhythm, fit clarity, outcome orientation.

**Changes:**
- Pathfinder prominence: hero CTA
- Best-for + job-outcomes on cards (programExtras)
- Bottom actions: "Not sure? Take the pathfinder quiz" primary
- Program detail: fit block at top; pathfinder/comparison in sidebar

---

## Priority 4: Program Comparison

**Problem:** Dense information compression; needs decision-support, mobile elegance.

**Changes:**
- "How to Choose" decision guide
- Best-for on cards; job outcomes
- Mobile: card-first; no horizontal table
- Pathfinder CTA in hero

---

## Priority 5: Find Your Path

**Problem:** Must feel premium, lightweight, confidence-building.

**Changes:**
- Fit reasoning per result card
- Confidence summary from answers
- Job outcomes on cards
- Clear next steps: Apply to top match; Compare, Salary guide links

---

## Priority 6: How It Works

**Problem:** Process-chart energy → confidence-building journey.

**Changes:**
- "Why we do this" per step
- Step copy: what it does for applicant, why it exists

---

## Priority 7: Employers

**Problem:** Slightly generic; trust leaks; needs commercial confidence.

**Changes:**
- Remove placeholder testimonials; substantive commitments
- Sharper hero, CTAs
- Austin as launch; expansion framing

---

## Priority 8: What We Do / Partners / Leadership

**Problem:** Generic-about → high-trust model explanation.

**Changes:**
- What We Do: operating model, why it scales
- Partners: segmented by type (employers, referral orgs, workforce boards, funders)
- Leadership: mission-led trust; missionRelevance

---

## Priority 9: Blog / Content System

**Problem:** Distinguish local launch, national thought leadership, conversion content.

**Changes:** (Lower priority for this PR — structural/content tagging)

---

## Priority 10: Site-Wide Mobile (<640px)

**Problem:** Cramped layouts, tap targets, vertical rhythm, top chrome, table breakage.

**Changes:**
- 44px min tap targets for primary CTAs
- Reduce hero/photo padding on mobile
- Single-column grids; no horizontal scroll
- Table-like content → cards where needed
- Vertical spacing rhythm

---

## Implementation in This PR

**Salary Guide Mobile Defect Fix + Last-Mile Polish:**
- Add `.salary-guide-page` scope; wrap table in `.salary-guide-table-wrap`
- Nuclear hide: display:none, visibility:hidden, height:0, position:absolute off-screen — guarantee no horizontal scroll
- Override at end of main.css to win over 768px cascade
- Tighten fit lead; shorter table intro and ramp legend
- Long program titles: word-wrap, hyphens for readability
- Badge row: improved flex-wrap, gap, alignment
- Reduce top chrome on mobile: compress page-hero and PhotoHighlight padding

**Note:** Homepage, Programs, Program Comparison, Employers, What We Do, Partners, Leadership, Find Your Path, How It Works — master already includes the 10-star upgrades from prior PRs. This PR focuses on the salary guide mobile defect and last-mile polish.
