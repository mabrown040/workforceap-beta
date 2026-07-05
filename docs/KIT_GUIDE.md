# Portal Kit Guide

> Agent-facing guide to the portal design kit, produced by the Astryx pattern-mining study
> (`docs/ASTRYX_LESSONS.md`). Linked from `AGENTS.md` and from the header of
> `components/portal/kit/index.ts`.

**Audience:** any engineer or AI agent touching portal UI. Read this before writing portal
components — it exists so you don't rediscover the token families, surface modes, and status-color
semantics from scratch.

**Prime directives**
1. Compose from `components/portal/kit/*` — don't rebuild primitives.
2. Semantic tokens over hardcoded values — no raw hex, no raw px for radius/padding/shadow.
   (Enforced by ESLint in `components/portal/kit/**`: warn locally, error in CI.)
3. When starting a page, copy the nearest example in `components/portal/kit/pages/**` rather than
   composing from a blank file.
4. If you change kit behavior, update the file's header comment and this guide in the same change.

---

## 1. Token families — which one to use

There are **two** live CSS-variable families in this codebase. Only one is canonical for new work.

| Family | File | Status |
|---|---|---|
| `--wa-*` | `css/portal-tokens.css` | **Canonical.** Use this for all kit/portal work. |
| `--color-*`, `--surface-container-*` | `css/main.css` | Legacy (MD3-style). Do not add new refs; bridge aliases in `portal-tokens.css` map the live names onto `--wa-*`. Caution: its `:root` holds **dark** values with light as the override — the opposite convention from `--wa-*`. |
| `--dm-*` | — | **Deleted** (was `css/dark-mode.css`). Never reintroduce. |

Key `--wa-*` tokens (see `css/portal-tokens.css` for the full set):

- **Brand (constant across modes):** `--wa-accent` (brand magenta) / `--wa-accent-dark` /
  `--wa-accent-soft` / `--wa-on-accent`, `--wa-gold(-dark|-soft)`, `--wa-info(-soft)`,
  `--wa-success`, `--wa-danger(-soft)`, `--wa-violet`.
- **Neutrals (flip in dark mode):** `--wa-bg`, `--wa-surface`, `--wa-surface-2` (raised
  fill: icon tiles, chips), `--wa-text`, `--wa-muted`, `--wa-border`, `--wa-track`, plus the
  sidebar set (`--wa-sidebar-*`, dark chrome in both modes).
- **Shape / density / pop (flip per surface, §2):** `--wa-radius`, `--wa-radius-sm`, `--wa-pad`,
  `--wa-pad-sm`, `--wa-pop`, `--wa-shadow`, `--wa-shadow-lg`.
- **Motion (§7):** `--wa-dur-fast` (120ms) / `--wa-dur-base` (200ms) / `--wa-dur-slow` (300ms) +
  `--wa-ease`; all zeroed under `prefers-reduced-motion`.
- **Z-index scale:** `--z-sticky` (10) < `--z-nav-drawer` (100, a 20-unit *band*: overlay/panel/
  toggle) < `--z-modal` (1100) < `--z-tour` (5000) < `--z-toast` (9999). Never invent a z-index
  literal; pick from this scale.

In TSX, prefer the typed helper over raw `var()` strings:

```ts
import { colorVar } from '@/components/portal/kit'; // components/portal/kit/tokens.ts
colorVar('accent'); // -> 'var(--wa-accent)'
// KitColor = 'accent' | 'accentDark' | 'gold' | 'info' | 'success' | 'text' | 'muted'
```

Tailwind is configured with the **`wa-` prefix** (`tailwind.config.ts`) — utilities look like
`wa-flex wa-items-center`. Unprefixed Tailwind classes silently do nothing.

---

## 2. Surface modes: `warm` vs `dense`

The kit has one design language with **two densities**, switched by a `data-surface` attribute
that the token layer reads (`css/portal-tokens.css`). Brand colors are identical in both;
only radius / padding / pop / shadow change.

| Mode | Who | Feel | Values |
|---|---|---|---|
| `warm` | Member-facing routes | Bold + calm: soft corners, generous space, gradient "pop" tiles on | radius 26/16, pad 28/18, `--wa-pop: 1` |
| `dense` | Admin / staff / data / rosters / queues | Compact, sharp, pop off | radius 12/8, pad 16/12, `--wa-pop: 0` |

Wrap the **route-group layout**, not individual components:

```tsx
import { DesignSurface, useSurface } from '@/components/portal/kit';

<DesignSurface surface="warm">{children}</DesignSurface>   // member
<DesignSurface surface="dense">{children}</DesignSurface>  // admin / staff / data
```

`useSurface()` returns `'warm' | 'dense'` for the rare component that must branch in JS
(default is `'dense'` if unwrapped). Components should normally *not* branch — consuming
`--wa-radius`/`--wa-pad`/`--wa-pop` makes them adapt automatically. Spec:
`docs/PORTAL_DESIGN_KIT.md`.

---

## 3. Dark mode

- Every mode-dependent `--wa-*` token is a **single `light-dark(light, dark)` declaration** in
  `css/portal-tokens.css`, resolved natively by the browser via the CSS `color-scheme` property.
  `:root` sets `color-scheme: light`; `html.dark, [data-theme='dark']` flips it to `dark` — that
  one line is the entire dark theme. There is **no duplicated dark variable block**; a token
  cannot exist in light but be missing in dark.
- The theme system (`components/theme/ThemeInitScript.tsx` + `lib/hooks/useTheme.ts`) keeps
  `html.dark` mirroring the effective mode, including "system", so the class is always
  authoritative.
- **Never** hand-write a dark variant of a color. If you consume `--wa-*` tokens, dark mode is
  automatic. If a component needs a tinted background, use
  `color-mix(in srgb, var(--wa-x) 15%, transparent)` — alpha tints work on both modes (this is
  the pattern in `lib/ui/statusColors.ts` and the `.wa-kit-tag--*` classes). If a value genuinely
  needs different colors per mode (rare — e.g. WCAG-tuned tag foregrounds), write one
  `light-dark(a, b)` pair, not an `html.dark` override.
- Elevation in dark mode comes from shadows plus a 1px **inset bezel highlight** baked into
  `--wa-shadow`/`--wa-shadow-lg` (transparent in light) — not from lighter surface tones. Do not
  add new surface-tone variables; `--wa-surface` and `--wa-surface-2` are the whole ladder.

---

## 4. Status colors — two systems, one mapping (read this twice)

There are two status vocabularies. Don't invent a third.

**Kit `KitTone`** (`components/portal/kit/tokens.ts`) — used by `<StatusTag tone=…>` via
`.wa-kit-tag--*` classes in `css/portal-kit.css`:

| tone | color | meaning |
|---|---|---|
| `ok` | green | healthy / complete |
| `warn` | gold | attention soon |
| `alert` | brand magenta (`--wa-accent`) | "needs a look" — brand-colored attention |
| `danger` | true red (`--wa-danger`) | destructive / error / failed / rejected |
| `info` | blue | neutral information |
| `muted` | gray | inactive / default |

**`alert` vs `danger` is deliberate**: a failed/rejected row must not read as just another
brand-magenta highlight — use `danger` there (see the note in `tokens.ts`).

**App-wide `StatusTone`** (`lib/ui/statusColors.ts`) — `success | warning | danger | info |
neutral`, returning `{ fg, bg, border }` triples for badges/chips outside the kit. **Gotcha:** its
`danger` intentionally resolves to brand magenta `--color-accent` ("at risk / rejected" *status*),
NOT `--wa-danger`; true red is reserved for destructive *action* affordances (e.g. ConfirmDialog's
confirm button). Rationale is in the file header — don't "fix" it.

Mapping when converting components: `success↔ok`, `warning↔warn`, `danger(status)↔alert`,
`info↔info`, `neutral↔muted`; kit `danger` (true red) has no `StatusTone` equivalent on purpose.

---

## 5. The `KitBaseProps` contract

Every kit primitive accepts `className`, `style`, `ref` (plain prop, React 19 style — no
`forwardRef`), and `data-*` passthrough on its root element
(`components/portal/kit/base.ts`). Rules:

- **Consumer overrides always win.** Merge order is internal classes/styles first, consumer
  `className`/`style` last — everywhere, no exceptions.
- Need a margin tweak or a `data-testid`? Pass it to the component. **Do not wrap kit components
  in a div** just to attach a class or test id.
- New kit components must extend `KitBaseProps<RootElement>` (+ `KitDataAttrs`) and use the `cx()`
  helper for class merging. There is intentionally no `asChild`, no polymorphic `as`, and no
  style-slot props.

---

## 6. Component index (`components/portal/kit/index.ts`)

Foundation: `DesignSurface` / `useSurface`, `colorVar` + `KitColor`/`KitTone` types,
`KitBaseProps` / `KitDataAttrs` / `cx` (§5).

| Component | Use for |
|---|---|
| `StatTile`, `KpiStrip` | single stat / row of stats (never hand-roll stat blocks) |
| `StatusTag` | semantic status pill (every table status column, risk tiers) |
| `SectionHeader` | titled section starts |
| `ProgressRing`, `ProgressBar` | completion / capacity |
| `Avatar` | people |
| `DataTable` (+ `Column`) | tabular data — never raw `<table>` + manual borders; supports `render`/`cardRender` for custom cells / mobile cards |
| `FeatureTile` | member-facing gradient/pop tiles |
| `QueueRow`, `WorkQueueItem` | staff work queues |
| `KanbanBoard`, `KanbanColumnHeader` | pipeline boards |
| `BarChartMini`, `RankBars` | inline mini charts |
| `FormField`, `Toggle` | form controls |
| `ChatThread` | message threads |
| `AppShellSidebar`, `AppShellMember` | shell chrome (dense sidebar / member tabs) |
| `UniversalSearch` | global search affordance |
| `MemberDashboardKit` | composed member dashboard |

**A11y behavior hooks** (`components/portal/kit/hooks/` — use these instead of hand-rolling;
any future kit Dialog/Menu/Combobox must be built on them):

| Hook | Use for |
|---|---|
| `useFocusTrap` | overlays (dialogs, drawers, menus). Shared **Escape stack**: nested layers each consume one Escape, top-most first. Visibility-aware tab ring, IME-safe, restores focus to the trigger on close. Prefer native `<dialog>.showModal()` when possible. |
| `useListFocus` | roving tabindex for tablists/menus/result lists — Arrow keys (RTL-aware), Home/End, one tab stop, self-repairing as items mount/unmount. Mark items with `data-kit-list-item`. |
| `useAnnounce` / `announce` | screen-reader announcements ("12 results", "Saved"). Singleton persistent live regions — never mount your own `aria-live` div per component (freshly-mounted regions don't announce). |

Reference compositions ("templates"): `components/portal/kit/pages/{member,admin,admin-subviews}/`
plus `PartnerOverviewKit.tsx`, `VoiceStudioKit.tsx`. **Start new pages by copying the nearest one.**

---

## 7. Icons, styling, and motion

- **lucide-react only.** No other icon set, no inline SVG paths, no emoji-as-icon in kit surfaces.
- Size via the `size` prop to match surrounding text (typ. 14–18 in dense, 18–24 in warm); color
  via `currentColor` or `colorVar(...)` — never a hex literal.
- Icon-only interactive elements need an accessible name (`aria-label`).
- CSS lives in `css/portal-kit.css` under the `.wa-kit-*` class namespace (`wa-kit-card`,
  `wa-kit-tag--*`, `wa-kit-table`, `wa-kit-focus`, …). Follow that naming for new kit CSS.
- Focus rings: use the `.wa-kit-focus` / `.wa-kit-focus--on-dark` utilities — don't restyle
  outlines per component.
- **Motion:** use the `--wa-dur-fast|base|slow` + `--wa-ease` tokens, never literal durations.
  Where motion helps: state feedback (hover/press within `--wa-dur-fast`), entering overlays,
  progress. Where it hurts: table row hovers and list reflows at perceptible durations (the UI
  feels like it's "catching up to the cursor"), decorative movement on data-dense screens, and
  exit animations that delay the user (animate exits only when they orient, e.g. a drawer sliding
  back to its edge). Direction should match the action (drawer from the edge it lives on).
  The tokens zero themselves under `prefers-reduced-motion`; JS-driven animation must still gate
  on `matchMedia('(prefers-reduced-motion: reduce)')` (see `VoiceOrb`).
- Hover-only affordances belong under `@media (hover: hover)`.

---

## 8. Common mistakes (all observed in this repo — don't repeat them)

1. **Inventing another token family** or referencing the deleted `--dm-*`. Use `--wa-*`.
2. **Hardcoding hex/px** in a component instead of `--wa-*` / `colorVar()` — the entire
   `docs/UI-DESIGN-SYSTEM.md` migration exists because ~8.8k inline `style={{}}` blocks did this.
   (ESLint now blocks raw hex inside `components/portal/kit/**`.)
3. **Hand-writing dark-mode overrides** (`html.dark …` blocks) instead of consuming tokens,
   alpha tints, or a single `light-dark()` pair.
4. **Using `alert` for destructive/failed states** (that's `danger`), or "fixing"
   `statusColors.ts`'s magenta `danger` to red (it's intentional — see §4).
5. **Raw `<table>` + manual borders** instead of `DataTable`; ad-hoc stat blocks instead of
   `StatTile`/`KpiStrip`.
6. **Wrapping kit components in a div** to attach a class/test id (they take `className`/`style`/
   `ref`/`data-*` directly, §5) — or wrapping single components in `DesignSurface` (it belongs on
   route-group layouts).
7. **Unprefixed Tailwind classes** (`flex` instead of `wa-flex`) — they compile to nothing.
8. **Z-index literals** — use the `--z-*` scale (§1); PortalTour once rendered *under* the nav
   drawer because of an invented literal.
9. **Per-component `aria-live` regions / hand-rolled focus traps** — use `useAnnounce` /
   `useFocusTrap` from the kit (§6).
10. **Inventing props.** Read the component source in `components/portal/kit/` first; the kit is
    small enough to read.

---

## 9. Astryx coexistence (`@astryxdesign/core`)

The Astryx design system is installed site-wide (`app/layout.tsx` imports `reset.css` +
`astryx.css`). It coexists with the kit, it does not replace it:

- **Cascade safety:** all Astryx CSS lives in `@layer reset` / `@layer astryx-base`; the app's
  unlayered CSS always wins conflicts. The 11 shared token names (notably `--color-accent`,
  `--color-error`, `--color-border`) therefore resolve to the app's values everywhere — that is
  what makes Astryx components render in WorkforceAP crimson instead of Astryx blue. Never wrap
  app CSS in layers and never redefine Astryx's `--color-*` names in `:root`.
- **Dark mode:** Astryx tokens are `light-dark()`-based, same mechanism as `--wa-*` (§3). The
  app's `color-scheme` flip drives both. No `<Theme>` provider needed in production surfaces.
- **Division of labor:** new overlays, command surfaces, confirmation dialogs, and forms →
  Astryx (`Dialog`, `AlertDialog`, `CommandPalette`, `TextInput`, …) — e.g.
  `components/admin/ConfirmDialog.tsx` and `components/portal/GlobalSearch.tsx`. Within
  `components/portal/kit/pages/**`, hand-rolled generic-primitive markup (cards-as-`<div>`,
  buttons/CTA links styled by hand, badges/pills, tab lists, spinners, pagers, empty states,
  status dots, single-value progress bars) should be Astryx (`Card`, `Button`, `Token`,
  `SegmentedControl`, `Spinner`, `Pagination`, `EmptyState`, `StatusDot`, `ProgressBar`, `Link`
  wrapping Next's `Link` for navigational actions — see `VoiceStudioKit.tsx` /
  `member/MemberHomeKit.tsx`) — same brand-token bridge as everywhere else Astryx is used.
  WorkforceAP-specific composites that already encode real layout/business logic —
  `DataTable`, `StageTrack`, `SegmentedProgress`, `QueueRow`, `WorkQueueItem`, `ChatThread`,
  `KpiStrip`, `CardHead`, `Sparkline`/`AreaChartMini`, `ProgressRing`, `FeatureTile`,
  `FormField`, the kit's own `Avatar` — stay on the kit; they have no 1:1 Astryx equivalent and
  don't need one. The rule is "generic primitive → Astryx, domain composite → kit," not
  "no Astryx in kit/pages."
- **Workflow (mandatory):** `pnpm exec astryx build "<idea>"` → `astryx template <name>` →
  `astryx component <Name>` before writing Astryx UI. Do not invent props — the docs are the
  contract. Reference proofs live at `/dev/astryx` (templates + production overlay demos).

---

*Maintenance: this file is hand-synced. If you touch `components/portal/kit/index.ts` exports,
token names in `css/portal-tokens.css`, or `KitTone`/`StatusTone` semantics, update the matching
section here in the same PR.*
