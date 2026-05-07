# WorkforceAP Design Audit — 2026-05-05

**Auditor:** DenchClaw (design-review skill)  
**Site:** https://www.workforceap.org  
**Branch:** `claude/post-582-portal-polish` (clean working tree)  
**Screenshots captured:** Homepage (desktop/tablet/mobile), Programs page, Apply page  
**Member lens applied:** Low-income, mobile-first, skeptical of institutions, 8th-grade reading level  
**Stewardship feedback incorporated:** Michael Brown Sr. (dad) brand & copy concerns  

---

## Summary

| Priority | Count | Themes |
|---|---|---|
| **P0 — Critical** | 2 | Brand integrity (logo color), Missing stewardship copy |
| **P1 — High** | 3 | Logo detail loss, Mobile touch targets, Hero mobile density |
| **P2 — Medium** | 2 | CSS/brand-guide color drift, CTA visual weight |

**No fake login buttons or trust-breaking UI patterns detected.** "Apply Now" and "Log In" link to real endpoints. Trust language on hero and footer follows WAP copy rules ("no-cost for qualifying members", "funded by grants and partnerships").

---

## P0 — Critical

### 1. Logo color drift: renders bright red, not brand crimson

**Observation:** The logo PNG assets (`wap_logo.png`, `logo.png`, `logo-tight.png`) render the upward arrow in a bright, warm red (~#C41E3A range). The brand guide specifies **Crimson Primary #8c0f37 → #ad2c4d** — a deep, burgundy-academic crimson.

**Evidence:**
- Brand guide `brand-guide-stitch.html`: "Crimson Primary #8c0f37 → #ad2c4d" under Primary palette
- Live site JS extraction: `rgb(173, 44, 77)` (#ad2c4d) appears as a CSS color but the **PNG asset itself** has a visibly brighter, more saturated red arrow
- Dad feedback: *"logo looks red instead of intended crimson"*

**Member trust impact:** A generic bright red feels like a template color. The deeper crimson signals institutional credibility — think Harvard, Alabama, academic gravitas. For a member who distrusts institutions, color authenticity matters.

**Fix:** Re-export the logo SVG/PNG from the source design file using the correct brand crimson (#8c0f37 for dark applications, #ad2c4d for mid-tones). Audit all three PNG variants. If the source file is unavailable, the logo may need a color-corrected re-render.

---

### 2. Dad's original opening statement missing from homepage hero

**Observation:** The current hero reads:
> *"Empowering People. Advancing Futures."*  
> *"WorkforceAP helps qualifying members get career training, certificates, resume help, interview practice, and job-search support at no cost to the member."*

The **About** section (`aboutBody1` in `messages/en.json`) still contains Dad's stewardship language:
> *"...a reoccurring Vision given to Michael Brown by God for serving His people."*

But this **does not appear on the homepage at all.** Dad explicitly noted: *"front page has some changes but missing his original opening statement."*

**Member trust impact:** For the faith-driven audience segment (a key demographic in Central Texas workforce development), the absence of mission-forward language on the landing page removes a core trust signal. Members need to know this isn't just another training mill — it's purpose-driven.

**Fix:** The hero needs a mission-forward line. Options:
- Add a sub-headline or eyebrow above the h1: *"Built on faith. Driven by purpose."* or similar
- Or restore Dad's original opening statement as the hero body lead-in (reworded for the 8th-grade, mobile-first member if needed)
- Or add a small trust pill/badge under the hero steps: *"Faith-founded nonprofit · Serving Central Texas since 2025"*

**Decision needed:** What exactly was Dad's original opening statement? The `messages/en.json` has his language in `aboutBody1` but we need to confirm if there was an earlier hero version he wrote. Ask Mike or Dad for the exact copy.

---

## P1 — High

### 3. "Cross" detail in logo is not bold enough at nav size

**Observation:** Dad noted: *"cross is not as bold."* Looking at the logo assets, the rightmost human figure in the globe icon raises one arm high in a gesture that evokes a cross / crucifixion pose. This is a subtle but intentional faith signal.

In `logo.png` (full lockup with tagline) and `logo-tight.png`, the figure is large enough that the raised arm reads clearly. In `wap_logo.png` (small icon used in the nav header), the entire icon is rendered at ~40px height, compressing the figure detail so the "cross" gesture is nearly invisible.

**Fix options:**
- **A)** Replace nav logo with `logo-tight.png` (full lockup without tagline) at a slightly larger size so the figure detail survives
- **B)** Create a simplified nav-logo variant where the cross/raised-arm element is intentionally thickened/bolded for small sizes
- **C)** Accept that at nav sizes the detail is lost, but add a small faith indicator elsewhere in the header (e.g., a subtle cross icon or "Faith-founded" badge)

**Recommendation:** A — use `logo-tight.png` at ~48–56px height in the nav. Test that it doesn't break mobile header layout. The full lockup without tagline preserves the cross detail better than the tiny icon.

---

### 4. Mobile touch targets below minimum on nav and CTAs

**Observation:** From JS extraction on desktop viewport (browser automation `querySelectorAll` check):
- "Programs" link: 56×15px
- "Partners" link: 49×15px  
- "Employers" link: 61×15px
- "Blog" link: 26×15px
- "Apply Now" nav CTA: 112×32px
- "Log In" button: 38×58px (width is the issue here — 38px is too narrow)

These are desktop nav text links, but on **mobile** the same nav structure collapses into a hamburger menu where the tap targets are the `<li>` items. The mobile screenshot shows the hamburger menu expanded with stacked links; each link appears to be a full-width row which is good. However, the **"Apply Now" button at 112×32px** is below the 44px minimum even on desktop, and on mobile it may render similarly small.

**Member trust impact:** Low-income members often have older phones with less responsive touchscreens. Missing a tap target because it's 32px tall instead of 44px creates friction that feels like the site is "broken" — reinforcing skepticism.

**Fix:**
- Increase `nav-cta` (Apply Now) padding to hit minimum 44px height (ideally 48px)
- Ensure mobile menu `<a>` elements have `min-height: 48px` and adequate vertical padding
- Check `Log In` button in mobile nav — should be at least 44×44px

---

### 5. Hero text density on mobile is overwhelming

**Observation:** The mobile homepage screenshot (375×9364) shows the hero section with:
- H1: "Empowering People. Advancing Futures." — large, good
- Two body paragraphs immediately below — dense block of text on a narrow screen
- Three step pills in a row — on 375px they likely stack or wrap tightly
- Two CTAs: "Find Your Path" and "Browse Programs" — okay but the secondary CTA competes

The member ICP reads at an 8th-grade level and is often scanning, not reading. Two full paragraphs before any action is too much cognitive load on mobile.

**Fix:**
- Collapse `heroBody1` and `heroBody2` into **one** punchy sentence on mobile (≤12 words)
- Or use a visual break: show `heroBody1` (the core value prop) and hide `heroBody2` (the quiz instruction) behind a "How it works" expandable section on viewports <768px
- Increase font size of body text on mobile to at least 1rem (16px) — currently using `clamp(0.98rem, 0.45vw + 0.92rem, 1.12rem)` which bottoms out below 16px

---

## P2 — Medium

### 6. CSS accent color (#C41E3A) is out of sync with brand guide (#8c0f37 / #ad2c4d)

**Observation:**
- `css/main.css`: `--color-accent: #C41E3A`
- `lib/platform/brandColors.ts`: `DEFAULT_BRAND_ACCENT = '#C41E3A'`
- `brand-guide-stitch.html`: `--primary: #8c0f37`, `--primary-cont: #ad2c4d`

The live site renders buttons and accents in `#C41E3A` (a bright, almost cherry red), while the brand guide specifies the deeper academic crimson. This creates a subtle but pervasive drift across every CTA, badge, and footer section.

**Fix:**
1. Update `--color-accent` in `css/main.css` to `#ad2c4d` (or `#8c0f37` for darker applications)
2. Update `DEFAULT_BRAND_ACCENT` in `brandColors.ts`
3. Audit all hardcoded hex values across the codebase for `#C41E3A` or close variants
4. Update `theme-color` meta tag in `layout.tsx` (currently `#ad2c4d` — actually correct, but verify consistency)

**Risk check:** `#C41E3A` is a well-known "crimson" in many contexts (e.g., Harvard uses a similar shade). But the brand guide explicitly chose the deeper `#8c0f37` family. Align to the guide.

---

### 7. Apply page: "Apply Now" button in nav competes with page CTA

**Observation:** On `/apply`, the user is already applying. The nav still shows a pink "Apply Now" button, which is redundant and could confuse members ("Am I not already applying?").

**Fix:** On `/apply` and `/find-your-path`, suppress the nav "Apply Now" CTA or replace it with "Continue Application" if the user has an in-progress application. This is a small pattern but reduces cognitive load for members who are already in the funnel.

---

## What Works Well (Keep)

| Element | Why It Works |
|---|---|
| **Trust pills on hero** | "Grant- and partner-funded pathways · No credit card required · No-cost for qualifying members" — follows WAP copy rules exactly |
| **Footer trust language** | "No-cost career training for low-income adults in Central Texas. Funded by grants and partnerships." |
| **Apply page hero** | "Programs are offered at no cost to qualifying members, funded by grants and partnerships. No prior experience required." — clear, safe, specific |
| **No console errors** | Clean JS console on homepage |
| **Performance** | 764ms total load time, 42ms TTFB — fast enough for low-end devices |
| **Dark/light mode** | Proper token remapping on `html.dark` — respects member device preferences |

---

## Next Steps / Action Items

| # | Action | Owner | Priority |
|---|---|---|---|
| 1 | **Confirm Dad's exact original opening statement** with Michael Brown Sr. | Mike | P0 |
| 2 | **Re-export logo PNGs** with correct crimson (#8c0f37 / #ad2c4d) | Design/asset owner | P0 |
| 3 | **Update CSS `--color-accent`** to `#ad2c4d` and audit codebase for drift | Dev | P1 |
| 4 | **Swap nav logo** to `logo-tight.png` at larger size to preserve cross detail | Dev | P1 |
| 5 | **Fix mobile touch targets** — nav CTA ≥48px, menu items ≥44px | Dev | P1 |
| 6 | **Condense hero body copy** on mobile to one scannable sentence | Dev + Copy | P1 |
| 7 | **Suppress nav "Apply Now"** on `/apply` and `/find-your-path` | Dev | P2 |

---

*Audit completed 2026-05-05 23:07 CDT. Screenshots saved to `/tmp/wap-audit-*/`. This report should be paired with `/gstack-ship` once fixes are implemented.*
