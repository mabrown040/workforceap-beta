# WorkforceAP Brand Guidelines

Create a comprehensive `DESIGN.md` and a standalone visual brand guide HTML page (`brand-guide.html` in the repo root) for WorkforceAP.

## Product Context

WorkforceAP is a workforce development platform that provides free career training and certifications (Tech, Data, AI, Healthcare, Manufacturing, Skilled Trades) to underserved communities, veterans, and adult learners in the Austin area. The model: no-cost to members, employer-aligned, 16–20 weeks to certification, 100% job search support.

**Three audiences:** Members (job seekers), Employers (hiring companies), Partners (workforce centers, nonprofits, community orgs referring members).

**Brand personality:** Serious, civic, empowering. Not startup-cute. Not government-dull. Think: "we actually get people hired." Authoritative but approachable. Evidence-based. Built for people who've been overlooked.

---

## Canonical Design System (extract from existing code)

The design system lives in `css/main.css`. Extract and formalize everything below.

### Colors

**Primary Palette:**
| Token | Hex | Usage |
|-------|-----|-------|
| Primary / Near-black | `#1a1a1a` | Body text, headings, nav, dark backgrounds |
| Accent / Crimson | `#ad2c4d` | Primary CTAs, links, highlights, focus rings |
| Accent Dark | `#8b1f38` | Hover state for crimson elements |
| Blue | `#2b7bb9` | Supporting — data, info states, links in body copy |
| Gold | `#a47f38` | Milestone badges, achievement, premium tier indicators |
| Gold Light | `#c49a4a` | Gold hover/lighter states |
| Green | `#4a9b4f` | Success states, placement badges, positive outcomes |

**Neutrals (9-step):**
| Token | Hex |
|-------|-----|
| White | `#ffffff` |
| Gray 50 | `#fafafa` |
| Gray 100 | `#f5f5f5` |
| Gray 200 | `#e8e8e8` |
| Gray 300 | `#d4d4d4` |
| Gray 400 | `#a3a3a3` |
| Gray 500 | `#737373` |
| Gray 600 | `#525252` |
| Gray 700 | `#404040` |
| Gray 800 | `#262626` |
| Light | `#f7f8fa` |

**Semantic:**
| State | Color |
|-------|-------|
| Success | `#4a9b4f` (Green) |
| Warning | `#a47f38` (Gold) |
| Error | `#ad2c4d` (Crimson) |
| Info | `#2b7bb9` (Blue) |

**Tailwind tokens** (in `tailwind.config.ts` with `wa-` prefix):
```
wa-brand-primary    = #1a1a1a
wa-brand-accent     = #ad2c4d
wa-brand-accent-dark = #8b1f38
wa-brand-blue       = #2b7bb9
wa-brand-gold       = #a47f38
wa-brand-gold-light = #c49a4a
wa-brand-green      = #4a9b4f
```

### Typography
- **Font:** Inter (Google Fonts) — all weights 400, 500, 600, 700
- **Scale:**
  - H1: 2.5rem / 700
  - H2: 2rem / 600
  - H3: 1.5rem / 600
  - H4: 1.25rem / 600
  - Body: 1rem / 400 / line-height 1.6
  - Small: 0.875rem
- **Homepage:** Uses `color: #1a1a1a` on white, OR white text on dark (`body.homepage { background: #1a1a1a }`)

### Spacing
- **Base unit:** 8px
- **Scale:** 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96px

### Border Radius
- SM: 4px
- MD: 8px
- LG: 12px
- XL: 16px
- Full: 50px (pill buttons)

### Shadows (3 levels)
- SM: `0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)`
- MD: `0 4px 16px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.05)`
- LG: `0 10px 40px rgba(0,0,0,0.1), 0 4px 12px rgba(0,0,0,0.06)`
- XL: `0 20px 60px rgba(0,0,0,0.14), 0 8px 20px rgba(0,0,0,0.08)`
- Glow Accent: `0 0 30px rgba(173,44,77,0.2), 0 0 60px rgba(173,44,77,0.08)`
- Glow Gold: `0 0 30px rgba(164,127,56,0.2), 0 0 60px rgba(164,127,56,0.08)`

### Motion
- Fast: `150ms cubic-bezier(0.4, 0, 0.2, 1)`
- Base: `200ms cubic-bezier(0.4, 0, 0.2, 1)`
- Slow: `400ms cubic-bezier(0.4, 0, 0.2, 1)`
- Spring: `0.5s cubic-bezier(0.34, 1.56, 0.64, 1)`
- Keyframes in use: fadeInUp, fadeIn, slideInLeft, slideInRight, scaleIn, pulse, shimmer, float, gradientShift
- **Always respect:** `prefers-reduced-motion` — all animations disabled at `0.01ms`

### Focus / Accessibility
- Focus ring: `0 0 0 2px #ffffff, 0 0 0 4px #ad2c4d` (white inner + crimson outer)
- Applied to: button, a, input, select, textarea, [tabindex]:focus-visible
- Touch target minimum: 48px
- Font smoothing: antialiased

---

## Deliverables

### 1. `DESIGN.md` (repo root)

Formal design system document with these sections:

```
# WorkforceAP Design System

## Brand Identity
## Color System (full palette with usage rules)
## Typography (scale, weights, line heights, loading)
## Spacing System
## Border Radius
## Shadow System
## Motion & Animation
## Accessibility
## Component Patterns (buttons, cards, forms, badges, alerts)
## Portal vs Marketing Distinction
## Do / Don't (with examples)
## Tailwind Token Reference
## CSS Variable Reference
```

**Component Patterns section must include:**

#### Buttons
```
Primary CTA:   bg #ad2c4d, text white, hover bg #8b1f38, border-radius 50px (pill), padding 14px 32px, font-weight 600
Secondary:     bg transparent, border 1.5px #1a1a1a, text #1a1a1a, hover bg #1a1a1a + text white
Ghost/Link:    text #ad2c4d, no border, hover underline
Disabled:      opacity 0.5, cursor not-allowed
```

#### Cards
```
Standard:     bg white, border 1px #e8e8e8, border-radius 12px, shadow-md on hover, padding 24px
Dark:         bg #262626, text white, border none
Stat card:    border-left 3px #ad2c4d, bg #fafafa
```

#### Badges
```
Success:  bg #4a9b4f, text white
Warning:  bg #a47f38, text white
Error:    bg #ad2c4d, text white
Info:     bg #2b7bb9, text white
Neutral:  bg #e8e8e8, text #525252
Gold:     bg #a47f38, text white (placement/achievement)
```

#### Forms
```
Input:       border 1px #d4d4d4, border-radius 8px, focus border #ad2c4d + shadow 0 0 0 3px rgba(173,44,77,0.15)
Label:       font-size 0.875rem, font-weight 600, color #1a1a1a, margin-bottom 6px
Helper text: font-size 0.75rem, color #737373
Error text:  font-size 0.75rem, color #ad2c4d
```

#### Portal vs Marketing distinction:
- **Marketing site** (public pages): dark backgrounds, dramatic crimson CTAs, Inter font, editorial feel
- **Portals** (authenticated app): white backgrounds, higher data density, muted card borders, functional over dramatic

### 2. `brand-guide.html` (repo root)

A beautiful standalone HTML file (no external JS frameworks) that visually demonstrates the brand system. Self-contained — all CSS inline, fonts from Google Fonts.

**Sections:**

1. **Hero** — WorkforceAP wordmark/name, tagline ("Empowering People. Advancing Futures."), dark background (`#1a1a1a`), crimson accent elements

2. **Color Palette** — Every color as a swatch with: hex code, token name, usage description. Show contrast ratios for primary text combinations (white on crimson, white on near-black, etc.)

3. **Typography** — Inter at every weight and size in the scale. Show real copy ("Free Tech Career Training in Austin" as H1, body paragraph about the program, a stat card label, a button label)

4. **Buttons** — All states side by side: Primary (crimson pill), Secondary (outlined), Ghost, Disabled. Dark background variants too.

5. **Cards** — Standard card, stat card (border-left crimson), dark card, member progress card mockup

6. **Badges** — All semantic variants + gold placement badge

7. **Form elements** — Input default, focus, error, disabled states. Full mini-form mockup.

8. **Shadows** — Visual demo of all 4 shadow levels

9. **Motion reference** — CSS animation preview (cards fading in, button press scale, etc.)

10. **Portal mockup** — A realistic member dashboard card showing: program name, progress bar (crimson), status badge, next step CTA. Shows what the portal feels like.

11. **Marketing mockup** — A dark-background hero section with headline, body copy, crimson CTA button, stat row (19 Programs, $0 Cost, etc.)

12. **Do / Don't** — Side-by-side examples:
    - ✅ Crimson CTA on dark background | ❌ Blue CTA ("we don't use the default blue")
    - ✅ Pill-shaped primary buttons | ❌ Square buttons
    - ✅ Tight focus ring (crimson) | ❌ Browser default outline
    - ✅ Inter font, semibold labels | ❌ Multiple font families

The brand guide should itself look like it was designed using the WorkforceAP design system — dark header, crimson accents, proper spacing. It IS the brand, not just documentation of it.

---

## Quality Bar
- `brand-guide.html` opens in browser with no errors, no external dependencies missing
- All color contrast ratios documented (WCAG AA: 4.5:1 for normal text, 3:1 for large text)
- `DESIGN.md` is complete enough that a new developer could build a new page from scratch without looking at existing code
- No blue (#1e40af or any generic blue) used anywhere in CTAs or primary actions — that was the old default, not the brand
