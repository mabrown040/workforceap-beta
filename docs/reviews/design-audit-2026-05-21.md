# WAP Public Surfaces — Design Audit

**Date:** 2026-05-21  
**Branch:** `review/design-audit`  
**Scope:** `/`, `/apply`, `/login`, `/employer` (portal), `/partners`, `/dashboard` (member shell + home)  
**Method:** Static React tree + CSS review (no runtime screenshots). Scores 0–10 per criterion.

---

## Executive summary

| Route | Visual hierarchy | Type rhythm | Color & contrast | Mobile | Empty/loading | AI slop | **Avg** |
|-------|------------------|-------------|------------------|--------|---------------|---------|---------|
| `/` | 6 | 7 | 8 | 7 | 5 | 6 | **6.5** |
| `/apply` | 7 | 8 | 7 | 8 | 8 | 7 | **7.5** |
| `/login` | 8 | 8 | 8 | 9 | 6 | 6 | **7.5** |
| `/employer` | 7 | 6 | 7 | 7 | 8 | 5 | **6.7** |
| `/partners` | 7 | 6 | 7 | 8 | 4 | 4 | **6.0** |
| `/dashboard` | 5 | 5 | 7 | 8 | 9 | 5 | **6.5** |

**Top wins:** Apply flow skeleton + sidebar progression; login mobile trust bar and 44px targets; dashboard skeleton/error boundaries; homepage hero contrast veil (`css/marketing.css`).

**Top risks:** Homepage and dashboard CTA stacking; partners page ships placeholder logos/stats/demo; micro-type sprawl (10–11px labels) on portal surfaces; repeated burgundy diagonal gradients + `hero-people.webp` across marketing and portal.

---

## Scoring rubric (reference)

| Score | Meaning |
|-------|---------|
| 9–10 | Best-in-class; minor polish only |
| 7–8 | Solid; 1–2 targeted fixes |
| 5–6 | Usable but inconsistent or confusing in places |
| 3–4 | Meaningful UX/a11y debt |
| 0–2 | Broken or misleading |

---

## `/` — Homepage

**Tree:** `app/page.tsx` → hero (inline) + `HomePageBelowFold` + `DynamicMobileBottomNav` / `DynamicFooter`  
**Styles:** `css/main.css` (tokens), `css/marketing.css` (`.home-hero*`, mobile CTA rules)

### Scores

| Criterion | Score | Notes |
|-----------|-------|-------|
| Visual hierarchy | **6** | Hero stacks mobile-only primary CTA, three step pills, three link-buttons (primary / secondary / ghost), trust row, credibility cards, and a tertiary mobile apply link — mitigation exists but desktop still reads as multi-primary. |
| Type rhythm | **7** | `text-display-lg` + clamp on H1 is strong; below-fold mixes `0.625rem` eyebrows, `0.68rem` funding chips, and ad-hoc inline sizes. |
| Color & contrast | **8** | `--home-hero-fg` veil + `::before` scrim (`css/marketing.css:283–319`) target AA on photo; accent span on headline uses token. Funding chips at `0.68rem` are small for AAA body text. |
| Mobile | **7** | `@media (max-width: 639px)` mobile primary CTA enforces `min-height: 44px` (`css/marketing.css:258–265`); outline secondary hidden ≤767px. Hero content still very tall before scroll. |
| Empty/loading | **5** | `HomePageBelowFold` is `dynamic()` with no loading UI (`app/page.tsx:17`). Footer/nav wrapped in `ErrorBoundary` only. |
| AI slop | **6** | Full-bleed stock hero, glass trust cards, Material icon density, gradient overlay — polished but template-adjacent. |

### File:line callouts

- **CTA proliferation (hero):** three button-style links after step pills — `app/page.tsx:204–223`; mobile duplicate at `app/page.tsx:177–187` and text link `app/page.tsx:264–268`.
- **Intentional mobile CTA fix (good):** `css/marketing.css:248–266` documents Sprint G1 mobile primary pill; hides duplicate ≥640px.
- **Micro-type on funding chips:** `app/page.tsx:248` (`fontSize: '0.68rem'`) — below comfortable reading size for dense legal-adjacent content.
- **Stakeholder card competes with hero:** member card gets accent border + elevated shadow — `components/marketing/HomePageBelowFold.tsx:187–195` — visually rivals hero primary.
- **Credibility bar:** text-only partner names (`HomePageBelowFold.tsx:161–165`) — acceptable placeholder but weak social proof vs logo treatment on `/employers`.

### Imagined fix (textual screenshot)

```
[HERO — simplified]
H1: Empowering People. Advancing Futures.
Sub: 2 lines max (merge heroBody1+2 to one paragraph)
[ ONE primary pill: Start application → /apply ]
Secondary as text link: Browse programs · Find your path
Step pills → move below fold as "How it works" (not competing with CTA row)
Remove tertiary mobile-only apply link once single primary is stable
```

---

## `/apply` — Application

**Tree:** `app/apply/page.tsx` → `OrganicApplyPage` | `PaidApplyVariant` (UTM)  
**Styles:** inline `sPage` object + `css/portal-main-extracted.css` (`.apply-page-skeleton*`, `.apply-grid-layout`)

### Scores

| Criterion | Score | Notes |
|-----------|-------|-------|
| Visual hierarchy | **7** | Sidebar steps + main form card create clear focus; hero help box adds Contact + Call CTAs that compete with form below fold. |
| Type rhythm | **8** | Strong `--space-*` / `--font-size-*` usage in `OrganicApplyPage.tsx:15–170`. Docs checklist drifts to raw `0.9rem`. |
| Color & contrast | **7** | Burgundy hero gradient + white copy works; checklist uses `--color-gray-700` (`OrganicApplyPage.tsx:281`) — verify light-theme-only assumption. |
| Mobile | **8** | Grid → single column `@768px` (`OrganicApplyPage.tsx:342–357`); sidebar precedes form (good for context). |
| Empty/loading | **8** | `ApplyPageSkeleton` with `aria-busy` (`app/apply/ApplyPageSkeleton.tsx:3–4`); dual `Suspense` boundaries (`OrganicApplyPage.tsx:268–313`). |
| AI slop | **7** | Same gradient hero family as login; supplemental lock/bolt cards are generic but copy is real (i18n). |

### File:line callouts

- **Hero competes with form:** help fallback with two buttons inside hero — `app/apply/OrganicApplyPage.tsx:192–205`.
- **Step indicator tap targets:** sidebar step circles `32×32px` — `OrganicApplyPage.tsx:228–229` (decorative, OK).
- **Paid variant (subset traffic):** single primary in hero — `app/apply/PaidApplyVariant.tsx:49–58`; sticky CTA on scroll — `:33–40` (good hierarchy for ads).
- **Skeleton quality:** shimmer in `css/portal-main-extracted.css:7065+`.

### Imagined fix

```
[APPLY HERO — shorter]
Eyebrow + H1 + one line social proof
Help row: single line "Questions? Call (512) 777-1808" (link styled, not second gold button)
Move help card below form on mobile only
```

---

## `/login` — Sign in

**Tree:** `app/(auth)/login/page.tsx` → `LoginForm`  
**Styles:** inline `s` object in `LoginForm.tsx`; responsive block `LoginForm.tsx:711–733`

### Scores

| Criterion | Score | Notes |
|-----------|-------|-------|
| Visual hierarchy | **8** | One gradient submit; portal chips are secondary navigation. "New here?" banner is contextual, not equal weight to Sign in. |
| Type rhythm | **8** | Labels use `--font-size-sm` uppercase; heading `--font-size-h2`; consistent spacing scale. |
| Color & contrast | **8** | Form on `--surface-container-lowest`; focus rings defined `.login-field:focus` (`LoginForm.tsx:728–732`). |
| Mobile | **9** | Brand panel hidden ≤768px; `.mobile-trust-bar` surfaces trust (`LoginForm.tsx:712–726`); password toggle `minWidth/minHeight: 44px` (`LoginForm.tsx:225–226`). |
| Empty/loading | **6** | Submit shows `aria-busy` + opacity (`LoginForm.tsx:667–671`); no route-level skeleton. |
| AI slop | **6** | Split-screen gradient + faint hero image (`LoginForm.tsx:443–452`) — familiar SaaS trope; `verified_user` eyebrow badge. |

### File:line callouts

- **Audience-aware hero copy (good):** `LoginForm.tsx:59–94` — employer/partner/staff headlines avoid "Your career starts here" mismatch.
- **Portal chip overload when expanded:** five destinations at `minHeight: 44` — `LoginForm.tsx:516–546` — wrap OK but visually noisy for members.
- **Staff portals toggle (good):** hidden by default — `LoginForm.tsx:548–568`.
- **Remember-me default unchecked (good):** shared-device safety — `LoginForm.tsx:337–340`.

### Imagined fix

```
[LOGIN MOBILE]
Logo mark + H2 Sign in (no duplicate hero headline lost)
Trust bar stays
Portal chips: show "Member" selected + "Staff login ∨" only (unchanged logic, tighter visual)
```

---

## `/employer` — Employer portal home

**Tree:** `app/(portal)/employer/layout.tsx` → `EmployerPortalShell` → `WorkspaceShell` + `app/(portal)/employer/page.tsx`  
**Styles:** `css/portal.css`, `css/portal-main-extracted.css` (`.employer-portal-*`), inline gradients on page

### Scores

| Criterion | Score | Notes |
|-----------|-------|-------|
| Visual hierarchy | **7** | Desktop header action "Post a job" is clear (`page.tsx:407–408`); mobile switches primary between Review candidates vs Post first role (`page.tsx:305–325`) — good statefulness. Voice block + gradient promo card add noise. |
| Type rhythm | **6** | Mix of `wa-text-[11px]`, portal BEM, inline px; pipeline mini-card labels `0.6rem` (`page.tsx:479`). |
| Color & contrast | **7** | Pending banner uses explicit amber browns (`page.tsx:218–236`); gradient buttons white-on-accent generally pass AA. |
| Mobile | **7** | KPI horizontal scroll (`page.tsx:257`); quick actions `minHeight: 44px` (`page.tsx:327–332`); dedicated mobile/desktop split (`wa-block md:wa-hidden`). |
| Empty/loading | **8** | `PortalEmptyState` for zero jobs/applicants (`page.tsx:351–356`, `429–435`); no skeleton for initial SSR paint. |
| AI slop | **5** | Repeated `linear-gradient(135deg, accent-dark, accent)` CTAs; `PortalVoiceSessionLazy`; decorative `school` watermark card (`page.tsx:531–541`); `auto_awesome` placement metrics. |

### File:line callouts

- **Shell:** employer uses `WorkspaceShell` + bottom nav variant — `components/portal/EmployerPortalShell.tsx:28–44`; `PortalShell` explicitly skips sidebar for dedicated shells — `PortalShell.tsx:10–17`.
- **Duplicate metrics:** mobile KPI scroll vs desktop `portal-metric-strip` — same data, different layouts (`page.tsx:243–272` vs `440–456`).
- **Hardcoded English in pending banner:** `page.tsx:230–235` — not i18n (`getTranslations` used elsewhere on page).
- **Empty state pattern (good):** `components/portal/PortalEmptyState.tsx:33–61` — centered icon, primary/secondary actions.

### Imagined fix

```
[EMPLOYER MOBILE HOME]
Row 1: "Employer portal" eyebrow + headline (keep)
Row 2: ONE gradient primary (Review N candidates OR Post first role)
Row 3: 2-up quick actions (Post role | Messages) — drop duplicate full-width post when primary is already "post"
Voice assistant → collapsed accordion below fold ("Ask hiring questions")
Remove gradient sidebar promo on mobile (desktop only)
```

---

## `/partners` — Partner marketing

**Tree:** `app/partners/page.tsx` → marketing UI kit (`HeroSection`, `StatBand`, `PartnershipCard`, …) + `PartnerSignupForm`  
**Styles:** inline styles + `css/marketing.css`; page-local `@media` block `page.tsx:884–898`

### Scores

| Criterion | Score | Notes |
|-----------|-------|-------|
| Visual hierarchy | **7** | Hero primary → `#partner-signup` vs secondary login is clear (`page.tsx:134–156`). Lower page repeats CTAs (pathway cards, footer gradient band). |
| Type rhythm | **6** | Repeated `0.7rem` uppercase eyebrows; headline clamp OK; body sizes vary (`1.25rem`, `0.9375rem`, `0.8rem`). |
| Color & contrast | **7** | Subhead at `rgba(255,255,255,0.58)` (`page.tsx:122`) may fail AA for small text on dark hero; gradient clipped headline (`page.tsx:103–108`) fragile in forced-colors/high contrast. |
| Mobile | **8** | Bento spans collapse at 1023px (`page.tsx:885–893`); hero CTAs `minHeight: 44px` (`page.tsx:140`, `153`). |
| Empty/loading | **4** | Documented placeholders: logos (`page.tsx:32–38`, `194–211`), stats TODO (`page.tsx:217–219`), demo `href="#partner-demo-video-todo"` (`page.tsx:439–441`). |
| AI slop | **4** | Text logo placeholders; placeholder stats; dual icon libraries (Lucide + Material); accent+gold gradient text; radial overlay CTA (`page.tsx:813–819`); reuses `hero-people.webp` (`page.tsx:737–745`). |

### File:line callouts

- **Launch blockers called out in source (good honesty):** file header `app/partners/page.tsx:8–14`.
- **StatBand with placeholder data:** `page.tsx:234–241` — trust damage if shipped publicly.
- **Partnership bento:** 12-col grid with uneven spans — `page.tsx:459–557` — desktop-strong, mobile stacks via CSS.
- **Signup section density:** referral microcopy repeated — `page.tsx:587–588` duplicates hero microcopy `page.tsx:128`.

### Imagined fix

```
[PARTNERS HERO]
Keep single primary: Become a referral partner
Secondary: Sign in to partner portal
[LOGOS BAND]
Until real logos: grayscale "Partner network growing" + 3 approved marks max — remove "Logo placeholder 1" pills
[STATS]
Hide band entirely until analytics wired OR show qualitative copy without numbers
[DEMO]
Replace #todo link with mailto/contact until video exists
```

---

## `/dashboard` — Member shell + home

**Tree:** `app/(portal)/layout.tsx` → `PortalLayoutClient` → `PortalShell` (minimal for `/dashboard`) + `WorkspaceShell` (via dashboard layout) → `MemberPortalTopNav` + `app/(portal)/dashboard/page.tsx`  
**Styles:** `css/portal.css` (`.member-portal-top-nav*`, `.portal-quick-grid*`, skeletons)

### Scores

| Criterion | Score | Notes |
|-----------|-------|-------|
| Visual hierarchy | **5** | Mobile home stacks hero, State-A gradient CTA, `MemberDoThisNextCard`, progress strip, certs, next steps, *another* priority gradient card, journey, points, carousels, quick grid, voice, AI activity — multiple primaries depending on member state. |
| Type rhythm | **5** | Extreme micro labels: `0.625rem`, `0.65rem`, `wa-text-[10px]`, `wa-text-[11px]` alongside `1.625rem` greeting (`page.tsx:711–720`, `1056–1057`). Hardcoded `"Priority Action"` (`page.tsx:878`). |
| Color & contrast | **7** | Portal tokens + `color-mix` gradients softer than marketing; active tab white on accent (`css/portal.css:3137–3144`). |
| Mobile | **8** | Top nav tabs `min-height: 44px` (`css/portal.css:3118–3119`); compact icon-only mode (`css/portal.css:3185–3193`); carousels use `calc(100vw - 3rem)` width (`page.tsx:581`, `994–995`). |
| Empty/loading | **9** | `DashboardSkeleton` mirrors layout (`components/dashboard/DashboardSkeleton.tsx:6–129`); `JobsSkeleton`; section `ErrorBoundary` + `DashboardErrorFallback`; empty copy for points/AI tools (`page.tsx:946–953`, `1140–1148`). |
| AI slop | **5** | Voice section lazy-loaded; radial blob decoration (`page.tsx:695–706`); points gamification; gradient next-step cards; `smart_toy` AI activity rows. |

### File:line callouts

- **Shell architecture:** `WorkspaceShell` renders `MemberPortalTopNav` for members — `components/portal/WorkspaceShell.tsx:561–562`; bottom nav suppressed for members (`568–571`).
- **PortalShell bypasses nav on dashboard:** `PortalShell.tsx:28`, `102` — dashboard relies on workspace chrome instead.
- **Suspense + skeleton (desktop):** `app/(portal)/dashboard/page.tsx:1156` wraps `PortalEntryClient` with `DashboardSkeleton`.
- **Duplicate priority CTAs:** State A block (`page.tsx:799–831`) can coexist conceptually with `MemberDoThisNextCard` (`840–844`) and fallback priority card (`872–897`).
- **i18n gap:** `"Priority Action"`, `"How to earn points"` (`page.tsx:967`) — English literals in translated surface.
- **Quick grid tap targets:** padding `1rem` — `css/portal.css:2295` — meets 44px with label stack.

### Imagined fix

```
[DASHBOARD MOBILE — state machine UI]
┌─────────────────────────────┐
│ Greeting + program chip     │
│ [ ONE next-step card ]      │  ← merge State A / DoThisNext / Priority into single component
├─────────────────────────────┤
│ Progress strip (collapsible)│
│ Quick 2×2 grid              │
│ Everything else in "More ∨" │
└─────────────────────────────┘
Top nav: cap at 5 tabs or group "Tools" (AI + Jobs)
Remove decorative radial blob; flatten hero gradient to solid surface-container
```

---

## Cross-cutting findings

### Design system adherence

- **Tokens exist and are used well** on apply/login (`--space-*`, `--font-size-*` in `css/main.css:39–118`).
- **Portal pages drift** into inline styles + `wa-text-[Npx]` utilities, making rhythm hard to audit globally.
- **Marketing pages** mix component library (`components/marketing/ui`) with large inline style blocks (`app/partners/page.tsx`, `app/page.tsx` hero).

### Gradient & imagery repetition

| Asset/pattern | Occurrences |
|---------------|-------------|
| `/images/hero-people.webp` | `/`, `/login`, `/partners`, `/employers`, homepage program cards |
| `linear-gradient(135deg, primary → accent-dark)` | `/apply` hero, `/login` brand panel, employer/dashboard CTAs |
| Material Symbols + Lucide mixed | `/partners` (`page.tsx:18`, multiple sections) |

### Accessibility highlights (keep)

- Skip links + conditional mobile nav skip — `app/layout.tsx:161–174`
- Homepage hero AA veil — `css/marketing.css:288–319`
- Login focus rings — `LoginForm.tsx:728–732`
- Member top nav focus/active states — `css/portal.css:3128–3145`

### Accessibility gaps (fix)

- Partners hero subhead opacity 0.58 — `app/partners/page.tsx:122`
- Homepage funding chip 0.68rem — `app/page.tsx:248`
- Dashboard English literals — `app/(portal)/dashboard/page.tsx:878`, `967`
- Employer pending banner English — `app/(portal)/employer/page.tsx:230–235`
- Gradient text headline — `app/partners/page.tsx:103–108` (provide solid fallback)

---

## Recommended priority (design-only backlog)

| P | Item | Primary files |
|---|------|---------------|
| P0 | Remove or gate partners placeholder logos/stats/demo | `app/partners/page.tsx:32–38`, `217–241`, `439–441` |
| P0 | Collapse dashboard mobile to one dominant next-step | `app/(portal)/dashboard/page.tsx:799–897` |
| P1 | Reduce homepage hero CTAs to one primary + text secondaries | `app/page.tsx:177–223`, `css/marketing.css:228–266` |
| P1 | Add `HomePageBelowFold` loading skeleton | `app/page.tsx:17`, `308` |
| P2 | Normalize portal micro-type to min 12px (0.75rem) for labels | `dashboard/page.tsx`, `employer/page.tsx` |
| P2 | i18n hardcoded strings on dashboard/employer | see callouts above |
| P3 | Deduplicate hero image / gradient recipes across marketing | sitewide asset audit |

---

## Appendix: key file map

| Route | Page | Shell / layout | Primary CSS |
|-------|------|----------------|-------------|
| `/` | `app/page.tsx` | `app/layout.tsx`, `ConditionalMarketingNav` | `css/marketing.css`, `css/main.css` |
| `/apply` | `app/apply/OrganicApplyPage.tsx` | marketing layout | inline + `portal-main-extracted.css` |
| `/login` | `app/(auth)/login/LoginForm.tsx` | auth (no marketing nav hide) | inline + `main.css` |
| `/employer` | `app/(portal)/employer/page.tsx` | `EmployerPortalShell` → `WorkspaceShell` | `css/portal.css` |
| `/partners` | `app/partners/page.tsx` | marketing | `css/marketing.css` + inline |
| `/dashboard` | `app/(portal)/dashboard/page.tsx` | `WorkspaceShell`, `MemberPortalTopNav` | `css/portal.css` |

---

*Audit produced in designer mode — documentation only; no application code changed.*
