# Pending Stitch Screen Prompts

Project: `18255988866302206897`

These prompts are ready to run once a fresh Stitch bearer token is available.

---

## 1) Employers Mobile Screen

**Target filename:** `mobile-employers.html`

**Prompt:**

```text
Create a mobile-first WorkforceAP "For Employers" screen (390px viewport) in the same visual system as our existing mobile files (Tailwind CDN, Inter, Material Symbols, maroon/gold civic palette, high contrast, rounded cards, sticky bottom nav).

Goal: convert employers into leads and partnership inquiries.

Include sections in this order:
1) Top app bar with brand + back/menu affordance.
2) Hero headline: "Build Your Workforce Pipeline" with subcopy about no-cost employer partnerships.
3) Primary CTA button: "Partner With Us".
4) Secondary CTA text button: "Schedule a Call".
5) "Why Partner" value cards (3 cards):
   - Pre-screened candidates
   - Industry-aligned training
   - Ongoing placement support
6) "How It Works" 3-step horizontal/stack flow:
   - Share hiring needs
   - Review candidate matches
   - Hire + onboard with support
7) Testimonial quote block from an employer (placeholder text acceptable).
8) Industries chips/list (Healthcare, IT/Cyber, Business Ops, Skilled Trades).
9) Contact form preview card with fields:
   - Company name
   - Hiring roles
   - Contact email
   - Preferred timeline
   And a submit CTA "Request Employer Outreach".
10) Sticky bottom quick action bar with phone/email icon actions.
11) Standard WorkforceAP mobile bottom navigation with Employers tab highlighted.

Design constraints:
- Keep text concise and conversion-oriented.
- Maintain accessibility (tap targets >= 44px, readable type scale, strong contrast).
- No external JS frameworks beyond Tailwind CDN.
- Output a complete standalone HTML file.
```

---

## 2) What We Do Mobile Screen

**Target filename:** `mobile-what-we-do.html`

**Prompt:**

```text
Create a mobile-first WorkforceAP "What We Do" screen (390px viewport) consistent with our existing mobile design language (Tailwind CDN, Inter, Material Symbols, maroon/gold accent, clean editorial card layout, soft shadows, rounded corners).

Goal: clearly explain WorkforceAP services and program model for prospective learners and partners.

Include sections in this order:
1) Top app bar with brand + navigation affordance.
2) Hero section:
   - Title: "What We Do"
   - Subtitle summarizing WorkforceAP mission: helping people transition into in-demand careers.
3) 4 service pillars as icon cards:
   - Career Discovery
   - Skills Training
   - Career Coaching
   - Employer Connections
4) "Who We Serve" segment with 3 audience cards:
   - Career changers
   - Job seekers
   - Employers
5) "Program Pathway" vertical timeline:
   - Discover
   - Enroll
   - Train
   - Get Hired
6) Impact stats row (3 metrics placeholders):
   - Learners supported
   - Completion rate
   - Employer partners
7) Short FAQ accordion-style card list (static UI acceptable):
   - Cost
   - Duration
   - Eligibility
8) Primary CTA: "Explore Programs"
9) Secondary CTA: "Take Career Quiz"
10) Footer/support strip with contact/help link.
11) WorkforceAP bottom mobile nav with "What We Do" (or About) state visually active.

Design constraints:
- Prioritize clarity and scanability.
- Keep copy concise, professional, civic-impact tone.
- Ensure accessible spacing, typography, and touch targets.
- Output complete standalone HTML only.
```

---

## Notes

- Existing generated screen IDs already mapped in `STITCH-REFRESH-PROTOCOL.md`.
- After token refresh, run each prompt through Stitch and save outputs in `.stitch/`.
