# Design System

**Workforce Advancement Project**  
Version 1.0 — March 2026

## Overview

This design system defines the visual language and interaction patterns for the Workforce Advancement Project website. All tokens use CSS custom properties defined in `css/main.css`.

## Spacing Scale

8px base unit system for consistent rhythm and alignment.

| Token | Value | Usage |
|-------|-------|-------|
| `--space-1` | 4px | Minimal spacing, icon gaps |
| `--space-2` | 8px | Tight element spacing |
| `--space-3` | 12px | Small padding, compact layouts |
| `--space-4` | 16px | Default spacing, list items |
| `--space-6` | 24px | Section padding, card gaps |
| `--space-8` | 32px | Large padding, component spacing |
| `--space-12` | 48px | Extra large spacing |
| `--space-16` | 64px | Section margins |
| `--space-24` | 96px | Hero spacing, major sections |

## Color Palette

### Primary

- `--color-primary` — `#1a1a1a` — Main text, backgrounds
- `--color-accent` — `#ad2c4d` — CTA buttons, active states, links
- `--color-accent-dark` — `#8b1f38` — Accent hover states

### Semantic

- `--color-blue` — `#2b7bb9` — Information, Technology track
- `--color-green` — `#4a9b4f` — Success states, Healthcare track
- `--color-gold` — `#a47f38` — Warning, highlights
- `--color-gold-light` — `#c49a4a` — Gold hover states

### Neutral Scale

- `--color-white` — `#ffffff` — Backgrounds, cards
- `--color-gray-50` — `#fafafa` — Subtle backgrounds
- `--color-gray-100` — `#f5f5f5` — Hover backgrounds
- `--color-gray-200` — `#e8e8e8` — Borders, dividers
- `--color-gray-300` — `#d4d4d4` — Placeholder text
- `--color-gray-400` — `#a3a3a3` — Disabled states
- `--color-gray-500` — `#737373` — Secondary text
- `--color-gray-600` — `#525252` — Body text (light backgrounds)
- `--color-gray-700` — `#404040` — Headings (light backgrounds)
- `--color-gray-800` — `#262626` — Primary dark

## Typography

Font family: `Inter` with fallbacks to system fonts.

### Hierarchy

| Element | Size | Weight | Line Height | Token |
|---------|------|--------|-------------|-------|
| H1 | 2.5rem (40px) | 700 | 1.2 | `--font-size-h1` |
| H2 | 2rem (32px) | 600 | 1.2 | `--font-size-h2` |
| H3 | 1.5rem (24px) | 600 | 1.3 | `--font-size-h3` |
| H4 | 1.25rem (20px) | 600 | 1.4 | `--font-size-h4` |
| Body | 1rem (16px) | 400 | 1.6 | `--font-size-base` |
| Small | 0.875rem (14px) | 400 | 1.5 | `--font-size-sm` |

### Responsive Adjustments

H1 scales to 2rem (32px) on mobile devices (<768px).  
H2 scales to 1.75rem (28px) on mobile devices.

## Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | 4px | Input fields, small chips |
| `--radius-md` | 8px | Standard (buttons, cards) |
| `--radius-lg` | 12px | Large cards, modals |
| `--radius-xl` | 16px | Feature sections |
| `--radius-full` | 50px | Pills, avatars |

## Shadows

Three-level elevation system for depth hierarchy.

| Level | Token | Usage |
|-------|-------|-------|
| Level 1 | `--shadow-sm` | Subtle lift, input fields |
| Level 2 | `--shadow-md` | Cards, dropdowns |
| Level 3 | `--shadow-lg` | Modals, popovers, major UI |

**Values:**
- `--shadow-sm` — `0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)`
- `--shadow-md` — `0 4px 16px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.05)`
- `--shadow-lg` — `0 10px 40px rgba(0,0,0,0.1), 0 4px 12px rgba(0,0,0,0.06)`

## Transitions

| Token | Duration | Easing | Usage |
|-------|----------|--------|-------|
| `--transition-fast` | 150ms | ease-out | Button press, quick interactions |
| `--transition-base` | 200ms | ease-out | Standard hovers, state changes |
| `--transition-slow` | 400ms | ease-out | Page transitions, large movements |

**Cubic bezier:** All transitions use `cubic-bezier(0.4, 0, 0.2, 1)` for smooth deceleration.

## Mobile Interactions

### Button Press States

All interactive buttons scale to 97% on press.

```css
.btn:active {
  transform: scale(0.97);
  transition: transform 200ms cubic-bezier(0.4, 0, 0.2, 1);
}
```

### Card Hover

Cards lift 4px on hover (desktop only).

```css
.card:hover {
  transform: translateY(-4px);
  transition: transform 200ms ease-out;
}
```

### Touch Targets

Minimum touch target size: **48px × 48px** on mobile devices.

## Accessibility

### Motion Preferences

All animations and transitions respect `prefers-reduced-motion`.

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

### Focus States

Consistent 2px accent ring on all interactive elements.

```css
:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--color-white), 0 0 0 4px var(--color-accent);
}
```

## Container Widths

| Breakpoint | Max Width |
|------------|-----------|
| Default | 1200px (`--max-width`) |
| Large content | 1400px |
| Full bleed | 100% |

Padding: 2rem (32px) on mobile, 2.5rem (40px) on desktop.

## Component Patterns

### Buttons

Three sizes:
- Default: 44px min height
- Large: 48px min height
- Small: 36px min height

CTA buttons use `--color-accent` background with white text.  
Secondary buttons use white background with `--color-primary` text.

### Cards

Standard card:
- Background: `--color-white`
- Border: 1px solid `--color-gray-200`
- Radius: `--radius-md` (8px)
- Padding: `--space-6` (24px)
- Shadow: `--shadow-md`

### Loading States

Skeleton loaders use pulse animation with neutral gray gradient.

```css
background: linear-gradient(
  90deg,
  var(--color-gray-200) 25%,
  var(--color-gray-100) 50%,
  var(--color-gray-200) 75%
);
animation: pulse 1.5s ease-in-out infinite;
```

## Implementation Notes

- All design tokens are defined as CSS custom properties in `css/main.css`
- Components in `components/ui/` follow this system strictly
- Responsive behavior uses `@media (hover: none)` for touch devices
- Color contrast meets WCAG 2.1 AA standards minimum
