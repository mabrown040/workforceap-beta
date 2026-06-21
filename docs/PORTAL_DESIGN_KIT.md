# Portal Design Kit — Phase 0 Spec

Build guide for the portal redesign. Phase 0 = **token layer + component kit only**. Zero
member-visible change; safe to merge. Everything after converts pages onto this kit one at a
time (strangler pattern — see the rollout playbook).

Reference mockups live on the lab server (`http://192.168.1.150:8999/`). Each component below
names the mockup screen that demonstrates it.

---

## 0. Decisions locked

- **Mode follows surface-type, not a blanket skin.** Three modes, assigned per surface:
  - `warm` (Bold + Calm) → **member** screens. Gradient hero + progress ring + streak up top; calm single-next-action + whitespace below.
  - `dense` → **data/CSV/chart/roster** screens + **admin** + staff queues. Compact, tables, KPI strips.
  - Member uses **top-nav + bottom-tab** (mobile); staff use **sidebar → hamburger drawer** (mobile).
- **One token layer + one component kit underneath all of it.** Mode is a setting, not a fork.
- Reuse existing primitives: `components/ui/Card.tsx`, `components/ui/Button.tsx` (`lib/ui/buttonClasses.ts`),
  `components/ui/Skeleton.tsx`; the `wa-` Tailwind prefix (brand tokens already in `tailwind.config.ts`);
  `ui-card` classes in `css/main.css`; portal utilities in `css/portal-ui-kit.css`.

---

## 1. Token layer (the foundation — build first)

Single source of truth. Today brand colors live in `tailwind.config.ts` (`wa-brand-accent` `#ad2c4d`,
`accent-dark` `#8c0f37`, `accent-light`) and `DESIGN.md`. Phase 0 promotes the full set to **CSS custom
properties** so mode can swap them without rebuilding Tailwind.

- **File:** `css/portal-tokens.css` (new, imported by `css/portal.css`). Define `:root` tokens:
  `--wa-accent`, `--wa-accent-dark`, `--wa-gold`, `--wa-info`, `--wa-success`, `--wa-bg`, `--wa-surface`,
  `--wa-text`, `--wa-muted`, `--wa-border`, `--wa-radius`, `--wa-radius-sm`, `--wa-pad`, `--wa-pad-sm`,
  `--wa-pop` (0|1), shadows. Values mirror `DESIGN.md`.
- **Mode mechanism:** `[data-surface="warm"]` / `[data-surface="dense"]` blocks override radius / pad /
  pop / shadow tokens (colors stay constant — brand doesn't change per surface, only density + pop do).
  Set `data-surface` on the **route-group layout** (`app/(portal)/dashboard/layout.tsx` → `warm`;
  `app/admin/layout.tsx` → `dense`; counselor/employer/partner → `dense`). Demonstrated live in
  `workforceap-design-system.html` (the control rail flips these exact tokens).
- **React seam:** `components/portal/kit/DesignSurface.tsx` — thin client wrapper that sets `data-surface`
  + a `useSurface()` context so components read the default density/pop; per-component props still override.
- **Tailwind:** keep `wa-` utilities; add `wa-brand-gold`/`info`/`success` to config if missing. Component
  classes (`ui-*`) consume the CSS vars so they cascade with mode.
- **Mobile rule:** all tokens identical on mobile; layout components handle reflow (below).

Verify: `gbrain`-style — load a `warm` page and a `dense` page, confirm cards differ in radius/density,
colors identical.

---

## 2. Component kit

Target dir: `components/portal/kit/`. Each is `'use client'` only if it has interaction; prefer server
components. Props are the contract — build to these. "Mockup" = the lab screen to match visually.

| Component | Key props | Variants / notes | Mobile behavior | Mockup reference | Target file |
|---|---|---|---|---|---|
| **DesignSurface** | `surface: 'warm'\|'dense'`, `children` | sets `data-surface` + context | n/a | design-system.html | `kit/DesignSurface.tsx` |
| **SectionHeader** | `title`, `goal?`, `action?`, `kicker?` | goal caption (member/persona goal), optional CTA | stacks action below | every concept screen header | `kit/SectionHeader.tsx` |
| **Card** *(extend existing)* | `variant`, `hoverable`, `padding`, `tone?` | add `tone: 'surface'\|'tinted'\|'gradient-crimson'\|'gradient-gold'` (pop) | full-width, radius from token | all screens | extend `components/ui/Card.tsx` |
| **StatTile** | `label`, `value`, `delta?`, `color?` | tabular-nums; delta arrow | — | KPI strips (all) | `kit/StatTile.tsx` |
| **KpiStrip** | `items: StatTile[]`, `cols?` | wraps StatTiles | `grid-cols-2` mobile → `lg:grid-cols-4/6` | admin home, member home | `kit/KpiStrip.tsx` |
| **FeatureTile** | `icon`, `title`, `body`, `badge?`, `tone`, `href` | gradient (warm) vs tinted (calm) per `--wa-pop` | full-width | member home (Career Toolkit), bold concept | `kit/FeatureTile.tsx` |
| **ProgressRing** | `pct`, `size?`, `color?`, `onLight?` | SVG; light variant for gradient bg | scales via size prop | member program, readiness | `kit/ProgressRing.tsx` |
| **ProgressBar** | `pct`, `color?`, `label?` | gradient fill in warm, flat in dense | — | program health, modules | `kit/ProgressBar.tsx` |
| **StatusTag** | `children`, `tone: ok\|warn\|alert\|info\|muted` | semantic color map (DESIGN.md) | — | every table | `kit/StatusTag.tsx` |
| **DataTable** | `columns`, `rows`, `mobile: 'scroll'\|'cards'`, `cardRender?` | **the important one** | `cards` → renders `cardRender(row)` stacked; `scroll` → horizontal overflow | admin students, jobs, placements | `kit/DataTable.tsx` |
| **MobileCardList** | `rows`, `render` | used by DataTable `cards` mode | n/a (mobile only) | mobile-proof phone 3 | `kit/MobileCardList.tsx` |
| **BarChartMini** | `data: {label,value}[]`, `highlightLast?` | CSS bars, no chart lib | bars shrink, labels stay | board outcomes, analytics | `kit/BarChartMini.tsx` |
| **RankBars** | `data: {label,value,pct,color}[]` | horizontal labeled bars | — | program health, by-program | `kit/RankBars.tsx` |
| **QueueRow** | `tone: red\|yellow\|blue`, `title`, `meta`, `flag`, `action` | counselor triage / partner attention | full-width | counselor triage, partner attention | `kit/QueueRow.tsx` |
| **WorkQueueItem** | `icon`, `title`, `detail`, `action`, `urgent?` | admin/employer "what needs you" | full-width | admin command center, employer queue | `kit/WorkQueueItem.tsx` |
| **KanbanBoard** + **KanbanColumn** + **KanbanCard** | `columns: {label,count,tone,cards}[]` | employer pipeline | columns → horizontal scroll | employer pipeline | `kit/Kanban.tsx` |
| **AppShellSidebar** | `groups`, `footer`, `activeId` | staff/admin nav (dark) | `-translate-x-full lg:translate-x-0` drawer + overlay + hamburger | admin-full (already responsive) | `kit/AppShellSidebar.tsx` |
| **AppShellMember** | `topbar`, `bottomTabs`, `children` | member top-nav + bottom-tab | bottom tab bar on mobile, top-scroll nav | member-suite, mobile-proof phone 1 | `kit/AppShellMember.tsx` |
| **UniversalSearch** | `placeholder`, `scope?` | ⌘K command bar | full-width in drawer | design-system header | `kit/UniversalSearch.tsx` |
| **ChatThread** + **MessageBubble** | `messages`, `onSend` | member↔staff, AI advisor | full-height, sticky composer | voice-studio, member messages | `kit/ChatThread.tsx` |
| **FormField** + **Toggle** | standard | label + input + crimson toggle | full-width | profile/settings | `kit/FormField.tsx` |
| **Avatar** | `initials`, `gradient?`, `size?` | gradient circle | — | everywhere | `kit/Avatar.tsx` |

Notes:
- **Button** already covers CTAs (`variant`, `radius`, `size`, `fullWidth`, `loading`). Reuse as-is;
  add a `gold` variant if not present (achievement actions).
- **DataTable** is the linchpin for "charts/CSV/roster benefit from Dense" + "mobile works": dense on
  desktop, `cards` mode stacks rows into the mini-card pattern shown in mobile-proof phone 3.
- Charts stay **dependency-free** (CSS bars) per the mockups — no chart lib in Phase 0.

---

## 3. Build order (Phase 0)

1. **Tokens** — `css/portal-tokens.css` + `DesignSurface.tsx` + Tailwind token sync. (Invisible.)
2. **Primitives** — extend `Card`; add `StatTile`, `KpiStrip`, `StatusTag`, `ProgressRing`, `ProgressBar`,
   `Avatar`, `SectionHeader`. (Invisible until used.)
3. **Data + layout** — `DataTable` (+`MobileCardList`), `BarChartMini`, `RankBars`, `AppShellSidebar`
   (port the responsive admin-full shell), `AppShellMember`.
4. **Persona-specific** — `FeatureTile`, `QueueRow`, `WorkQueueItem`, `Kanban`, `ChatThread`, `FormField`.
5. **Storybook-lite proof page** — a non-routed `/dev/kit` (gated to non-prod) rendering every component
   in both `warm` and `dense`, so the kit is reviewable before any real page changes.

Each step merges on its own; nothing touches a member-facing route until Phase 1.

---

## 4. Phase 1 proof (first real conversion) → Vercel preview gate

After the kit lands, convert **one** page: the **member dashboard home**
(`app/(portal)/dashboard/page.tsx` + its `_components`), rebuilt on `AppShellMember` + the kit in `warm`
mode (matches `workforceap-member-suite.html` Home + the Bold+Calm hybrid in `workforceap-concept-bold.html`).

Gate before merge:
- **Vercel preview** deploy of the branch, pointed at **staging Supabase** (never prod).
- Walk it at 375 / 768 / 1440 (the kit's responsive contract).
- Confirm zero data/behavior regressions vs current dashboard (same loaders, same actions — only the
  presentation layer changed).
- Sit with it a few days. Then open the floodgates: convert remaining member pages by nav group
  (Journey → Program → Jobs → Me), then counselor, then employer/partner, then admin
  (`workforceap-admin-full.html` is the spec for all 39 admin routes).

---

## 5. Mockup → file index (so the build is paint-by-numbers)

| Surface | Mode | Lab mockup (spec) |
|---|---|---|
| Member home/program/jobs | warm | `workforceap-member-suite.html`, `workforceap-concept-bold.html`, `workforceap-concept-calm.html` |
| Member voice/AI tools | warm | `workforceap-voice-studio.html` |
| Admin (all 39 routes) | dense | `workforceap-admin-full.html` (responsive) |
| Admin/data deep-dives | dense | `workforceap-admin-suite.html`, `workforceap-admin-subviews.html` |
| Counselor / Employer / Partner | dense (+warm accents) | `workforceap-concept-dense.html` (their screens) |
| Token/mode engine | — | `workforceap-design-system.html` |
| Mobile contract | — | `workforceap-mobile-proof.html` |

---

## Out of scope (Phase 0)

No page conversions, no chart library, no DB changes. Phase 0 ships the kit + a gated `/dev/kit` proof
page only. First real page (member home) is Phase 1, behind a Vercel preview on staging.
