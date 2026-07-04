# Astryx Lessons — pattern-mining study for the WorkforceAP Portal Kit

**Status:** study output, 2026-07-04. Decision already made: we are **not** adopting Astryx as a
dependency. This doc extracts portable techniques only.

- `astryx/…` file refs = the study clone at
  `/tmp/claude-0/-home-user-workforceap-beta/cb07b015-b86f-50e0-809c-3a3cf78ad5f9/scratchpad/astryx`
  (transient — refs are for provenance; the relevant excerpts are quoted inline).
- Our refs are relative to this repo root.
- Effort: **S** ≤ half a day, **M** = a few days, **L** = a project.

---

## Lesson 1 — `light-dark()` + `color-scheme` instead of duplicated dark-mode variable blocks

**Rank: 1 (highest leverage — attacks our known token debt directly)**

**(a) Astryx.** Every color token is a *single* declaration carrying both modes, resolved natively
by the browser via the CSS `color-scheme` property — no `.dark` class, no duplicated variable
block, no possibility of a token existing in light but missing in dark:

```ts
// astryx/packages/core/src/theme/tokens.stylex.ts:24-34
'--color-accent':             'light-dark(#0064E0, #2694FE)',
'--color-background-surface': 'light-dark(#FFFFFF, #1F1F22)',
'--color-text-primary':       'light-dark(#0A1317, #DFE2E5)',
```

Theme authors write `[light, dark]` tuples; `defineTheme()`
(`astryx/packages/core/src/theme/defineTheme.ts:389-394`) compiles them to `light-dark()` strings.
The `<Theme>` provider (`astryx/packages/core/src/theme/Theme.tsx:64-79, 195-223`) just sets
`color-scheme` (light/dark/system) — "system" mode is free because the browser resolves it.

**(b) Us.** Three *different* dark-mode mechanisms coexist:
1. `css/portal-tokens.css:128-144` — light in `:root`, dark override under
   `html.dark, [data-theme='dark']`.
2. `css/main.css:83, 566` — **inverted**: `:root` holds *dark* values, light is the override under
   `html:not(.dark)`.
3. `css/dark-mode.css` (`--dm-*`) — dark via *both* `@media (prefers-color-scheme: dark)` and a
   `.dark` class; effectively orphaned (only 2 live refs, both in
   `components/theme/ThemeSelector.tsx:45,51`, with hardcoded fallbacks).

**(c) Portable change.** Migrate `css/portal-tokens.css` to `light-dark()` pairs and set
`color-scheme: light dark` at `:root`, keeping `html.dark` only as a one-line
`color-scheme: dark` override (and `html:not(.dark)` → `color-scheme: light` when the user picks
explicitly). Existing `ThemeInitScript.tsx` class toggling keeps working; the duplicated
`html.dark { --wa-* … }` block disappears. Do the kit family first; `main.css` later.
Baseline support for `light-dark()` is universal in current browsers.

**(d) Effort: M** (kit family only: S; including `main.css`: M).

---

## Lesson 2 — One token family, strict prefixes, primitive → semantic → component layering

**Rank: 2**

**(a) Astryx.** Three explicit layers, one naming scheme:
- **Primitive/default:** `astryx/packages/core/src/theme/tokens.stylex.ts` — kebab-case with
  strict category prefixes (`--color-`, `--radius-`, `--shadow-`, `--spacing-`, `--duration-`).
- **Semantic/theme:** each theme (`astryx/packages/themes/{neutral,butter,chocolate,gothic,matcha,stone,y2k}/src/*Theme.ts`)
  overrides only tokens that differ from defaults.
- **Component:** the same theme files carry a `components:` block keyed by component + variant,
  referencing semantic tokens, never raw hex (`neutralTheme.ts:373-378`:
  `button: { 'variant:destructive': { backgroundColor: 'var(--color-error-muted)' } }`).

All namespacing flows from one constant (`NAMESPACE = 'astryx'` in
`astryx/packages/core/src/naming.ts`) — classes, data-attributes, and internal vars can't drift.

**(b) Us.** Three *parallel* families with conflicting conventions: `--wa-*`
(`css/portal-tokens.css`), MD3-style `--color-*`/`--surface-container-*` (`css/main.css`), and
dead `--dm-*` (`css/dark-mode.css`). `css/portal-tokens.css:49-57` already bridges them with
aliases (`--color-accent: var(--wa-accent)` etc.) — the right direction, but incomplete. The kit
consumes tokens directly via a flat map (`components/portal/kit/tokens.ts:8-16`); meanwhile
`lib/ui/statusColors.ts` reaches into the *other* family (`--color-green`, `--color-gold`).

**(c) Portable change.** Declare `--wa-*` the canonical family. Extend the bridge-alias block in
`portal-tokens.css` so every live `--color-*`/`--surface-container-*` name resolves to a `--wa-*`
value, then delete `css/dark-mode.css` (after moving `ThemeSelector.tsx`'s two refs). Don't build
Astryx's runtime `defineTheme()` engine — with two surfaces and one brand we only need the
*discipline*: components reference semantic `--wa-*` tokens; raw hex only inside
`portal-tokens.css`.

**(d) Effort: S** for alias completion + `--dm-*` deletion; **L** for a true full merge of
`main.css` (defer).

---

## Lesson 3 — Agent-facing kit documentation (CLAUDE.md-style rules + anti-patterns + component index)

**Rank: 3 (cheapest win per unit effort)**

**(a) Astryx.** The repo is aggressively legible to AI agents:
- Root `astryx/CLAUDE.md` is 143 dense lines: pointers instead of prose, a doc-sync rule ("update
  the file's header comment; look for `SYNC:` comments"), and machine-regenerated
  `<!-- MARKER -->` blocks including a StyleX capability table with explicit `PATTERN → fix`
  mappings.
- `astryx/packages/cli/docs/principles.doc.mjs` — ordered Rules ("Components over primitives",
  "Semantic tokens over hardcoded values") plus an explicit **Anti-Patterns** don't-list ("Badge
  as decoration… use StatusDot"; "Inventing props. Read component docs first").
- Every component ships a co-located `{Name}.doc.mjs` (props/examples/a11y/keyboard), auto-
  discovered by the CLI; `.claude/skills/dense-compression-protocol.md` even specifies how to
  compress docs without losing "signal words" (`must`/`always`/`when`).
- `astryx/CLAUDE.md:5-49` defines `/vibe-test`, which *measures* how well the agent docs make LLMs
  generate correct component code — docs are treated as a tested artifact.

**(b) Us.** Root `AGENTS.md` is dev-environment setup only. `.claude/` has no skills/commands.
`docs/` has ~125 files but no agent-legible kit index; the closest are `docs/PORTAL_DESIGN_KIT.md`
(Phase-0 spec) and `docs/UI-DESIGN-SYSTEM.md` (migration playbook). Every fan-out subagent
re-discovers the token families, the `warm`/`dense` seam, and the `alert` vs `danger` distinction
(currently documented only in code comments, `components/portal/kit/tokens.ts:22-27` and
`lib/ui/statusColors.ts:10-22`).

**(c) Portable change.** Ship a single `docs/KIT_GUIDE.md` (draft written alongside this study:
`docs/KIT_GUIDE_DRAFT.md`) that teaches: token families + which is canonical, surface modes,
status-tone semantics, icon rules, component index, and a mined anti-pattern list. Link it from
`AGENTS.md` and from a header comment in `components/portal/kit/index.ts`. Skip the CLI/doc-gen
machinery — manual sync is fine at 21 components; adopt Astryx's `SYNC:` comment convention to
keep it honest.

**(d) Effort: S.**

---

## Lesson 4 — A11y behavior as shared hooks: focus trap w/ escape stack, roving tabindex, live-region announcer

**Rank: 4 (matters the moment the kit grows a Dialog/Menu — which it will)**

**(a) Astryx.** Accessibility behavior is centralized in hooks, so every overlay/list component
gets it for free:
- `astryx/packages/core/src/hooks/useFocusTrap.ts` — visibility-aware focusable filtering
  (lines 77-102), capture-phase focus recovery that only fights *keyboard* escapes, not mouse
  light-dismiss (229-264), manual Tab/Shift+Tab wrap (309-334), and a module-level `escapeStack`
  (31-46) so nested layers (popover inside dialog) consume one Escape each.
- `Dialog.tsx` rides native `<dialog>.showModal()` for trapping (line 390) but restores focus to
  the captured trigger on close (376, 405) and ignores IME composition-cancel Escapes
  (`isImeKeyEvent`, lines 424-441).
- `astryx/packages/core/src/hooks/useListFocus.ts` — roving tabindex with a `syncTabStops` repair
  pass on every layout effect (355-412), arrow keys with RTL swap, Home/End (469-557); shared by
  TabList (`TabList.tsx:154-158`) and DropdownMenu, plus `useTypeahead` for first-character jump.
- `astryx/packages/core/src/hooks/useAnnounce.ts` — singleton persistent live regions (created
  once, lines 55-87, because freshly-mounted regions don't announce), clear-then-set via rAF for
  repeated messages (89-106).
- ARIA wiring: menu trigger gets `aria-haspopup`/`aria-expanded`/`aria-controls`
  (`DropdownMenu.tsx:421-423`), sortable headers get conditional `aria-sort`
  (`useTableSortable.tsx:415`).

**(b) Us.** No dialog/menu primitives in the kit yet, and no shared hooks. `DataTable.tsx:78-95`
does the honest basics (clickable rows: `role="button"`, `tabIndex={0}`, Enter/Space) but there is
no arrow-key navigation, no `aria-sort` concept, no focus-restore pattern anywhere, no announcer.
`UniversalSearch.tsx` has no combobox semantics.

**(c) Portable change.** Before building any kit Dialog/Menu/Combobox, create
`components/portal/kit/hooks/` with three ports (they're dependency-free patterns): `useFocusTrap`
(with the escape-stack idea — we already stack drawer/modal/tour per `css/portal-tokens.css:96-100`),
`useListFocus` (roving tabindex + arrows/Home/End), and `useAnnounce`. Prefer native `<dialog>` +
focus-restore like Astryx rather than a div-based trap. Retrofit `UniversalSearch` onto
`useListFocus` when results become keyboard-navigable.

**(d) Effort: M.**

---

## Lesson 5 — A `BaseProps` contract: className/style/data-* passthrough, ref-as-prop, deterministic override order

**Rank: 5**

**(a) Astryx.** Every component extends `BaseProps<T>`
(`astryx/packages/core/src/BaseProps.ts:23-95`): HTML attributes minus a footgun denylist, a typed
style-override slot (`xstyle`), and open `data-${string}` passthrough. Style merge order is
identical everywhere (`Button.tsx:621-647`): internal styles → override slot → `className` →
`style`, so consumer overrides always win predictably. Refs are plain props (React 19 style,
`ButtonProps.ref` at `Button.tsx:278`) merged via `mergeRefs` when internal refs are also needed.
Variants are typed as extensible interfaces (`interface ButtonVariantMap { primary: true; … }`,
`Button.tsx:245-269`) so downstream code can add variants via module augmentation without forking.
No `asChild`; polymorphism is a narrow, typed `as?: LinkComponentType` used only when `href` is set.

**(b) Us.** Of the kit files audited, only `DesignSurface` accepts `className`; `StatusTag`,
`DataTable`, `UniversalSearch` accept neither `className`, `style`, `ref`, nor `data-*`. Any page
needing a margin tweak or a test id must wrap the component in a div — exactly the lock-in Astryx
avoids. `StatusTag`'s `tone` is a closed union (fine), but there's no escape hatch at all.

**(c) Portable change.** Add a tiny `KitBaseProps` (`className?`, `style?`,
`ref?`, `[key: \`data-${string}\`]`) in `components/portal/kit/tokens.ts` or a new `base.ts`, and
thread it through the primitives, always merging consumer `className` *last*. Skip `xstyle` (we're
Tailwind, not StyleX) and skip `asChild`. Adopt the "accessible name decoupled from visible
content" idea (Astryx `Button` has `label` vs `children`/`icon` slots) for icon-only kit buttons.

**(d) Effort: S–M** (mechanical; per-component).

---

## Lesson 6 — Status colors flip *strategy*, not just values, in dark mode

**Rank: 6**

**(a) Astryx.** Documented in `astryx/packages/themes/neutral/src/neutralTheme.ts:164-190`: light
mode = pastel bg + dark saturated text; dark mode = **alpha-tinted overlay** bg + light pastel
text — because opaque pastels "glow" on dark bodies. Badge tokens are per-hue semantic vars so the
inversion is defined once (`neutralTheme.ts:443-482`).

**(b) Us.** We independently converged on the same idea in two places: `lib/ui/statusColors.ts`
uses `color-mix(… 15%, transparent)` tints (mode-agnostic, good), and `portal-tokens.css:138-141`
flips `--wa-*-soft` from opaque pastels to rgba overlays in dark. But the two status systems
disagree at the source: kit `KitTone` (`ok/warn/alert/danger/info/muted`, hexes inside
`css/portal-kit.css` tag classes) vs `StatusTone` (`success/warning/danger/info/neutral`, and its
`danger` is deliberately brand-magenta `--color-accent`, *not* `--wa-danger` — see
`statusColors.ts:10-22`).

**(c) Portable change.** Don't touch the semantics (the `alert` vs `danger` distinction is a real
decision, documented). Do: (1) make `.wa-kit-tag--*` in `css/portal-kit.css` consume
`statusColor()`-style `color-mix()` tints of `--wa-*` tokens instead of any literal values, so
tags inherit dark mode for free; (2) add a documented mapping table `KitTone ↔ StatusTone` to the
kit guide so agents stop inventing a third palette.

**(d) Effort: S.**

---

## Lesson 7 — Dark elevation via shadow + inset "bezel", not a tonal surface ramp

**Rank: 7**

**(a) Astryx.** Explicitly rejects the Material-style "surfaces lighten as they elevate" ramp.
`neutralTheme.ts:332-365` (+ comment at 103-117): in dark mode, card/popover/muted all collapse to
the body tone and "lift purely via shadow + inset highlight" — a 1px inset
`light-dark(transparent, oklch(1 0 0/8%))` bezel. One narrow exception: interactive `surface` is
slightly lighter than `body`.

**(b) Us.** `css/main.css` carries a full MD3 `--surface-container-*` tonal scale, while the kit's
dark mode already leans the Astryx way (deeper shadows at `portal-tokens.css:142-143`, only two
surface tones: `--wa-surface`, `--wa-surface-2`).

**(c) Portable change.** Keep the kit's flat two-tone approach and steal the bezel trick: add the
inset highlight to `--wa-shadow`/`--wa-shadow-lg` dark values (or to `.wa-kit-card` in dark) so
cards separate from the background without inventing more surface tones. This also weakens the
case for migrating the MD3 tonal scale into the kit — it can stay legacy.

**(d) Effort: S.**

---

## Lesson 8 — Lint rules that enforce token discipline, stricter for CI/agents than for humans

**Rank: 8**

**(a) Astryx.** `astryx/internal/eslint-plugin-astryx/` ships custom rules: `no-hardcoded-styles`
(detects raw px/hex and names the correct token var in the message), `no-border-shorthand`,
`require-base-props`, etc. `astryx/eslint.config.js:8-25` runs a two-tier severity model —
warnings for humans locally, hard errors when `CI=true` or `ASTRYX_STRICT_LINT=1`, i.e. agents get
the stricter gate by design.

**(b) Us.** No lint rule prevents raw hex/px in kit components; `docs/UI-DESIGN-SYSTEM.md` exists
precisely because ~8,791 inline `style={{}}` blocks accumulated.

**(c) Portable change.** One scoped ESLint rule (files: `components/portal/kit/**`) rejecting hex
literals and inline `style={{}}` with tokened properties, with an autofix-adjacent message naming
the `--wa-*` token. Copy the two-tier trick: `warn` locally, `error` in CI. Expand scope to
`components/portal/**` only after the kit conversion progresses.

**(d) Effort: S** (kit scope) / M (custom messages mapping values → tokens).

---

## Lesson 9 — Motion: guidance prose + tokens + declarative reduced-motion everywhere

**Rank: 9**

**(a) Astryx.** `--duration-*`/ease vars plus `astryx/packages/cli/docs/motion.doc.mjs` — *where
motion helps vs hurts* ("Table row hovers… perceptible duration… makes the interface feel like
it's catching up to the cursor"), direction-matches-action, exit-animations-only-when-orienting.
Reduced motion is handled declaratively at the style-declaration level in 34 files (e.g.
`Button.tsx:73-76` nests `'@media (prefers-reduced-motion: reduce)': '0s'`), with exactly one
imperative `matchMedia` use where JS timing needs gating (`MobileNav.tsx:354-357`).

**(b) Us.** `portal-tokens.css:147-151` gates shadows on reduced-motion (nice), and kit components
are told to gate their own animations, but we have no duration/easing tokens and no written motion
guidance; transitions are ad-hoc per component.

**(c) Portable change.** Add `--wa-dur-fast/base/slow` + `--wa-ease` to `portal-tokens.css`, zero
them under the existing reduced-motion block, and put a 10-line "where motion helps/hurts" section
in the kit guide. Cheap, prevents the next dozen ad-hoc `transition: all 0.3s`.

**(d) Effort: S.**

---

## Lesson 10 — Templates as the unit of reuse; generated docs checked for drift

**Rank: 10 (directional, not urgent)**

**(a) Astryx.** `astryx/packages/cli/templates/pages/` holds 40+ full page templates behind
`astryx template <name> --skeleton`; agents are instructed to start from a template, not a blank
file. `astryx/scripts/{sync-exports.js, verify-exports.mjs, generate-token-docs.mjs}` keep
generated indexes from drifting.

**(b) Us.** We already have the seed of this: `components/portal/kit/pages/**`
(member/admin/admin-subviews demo compositions) are exactly "templates," but nothing points agents
at them as the starting point, and `index.ts` exports are hand-maintained with no drift check.

**(c) Portable change.** No CLI needed. In the kit guide, name `kit/pages/**` as the mandatory
starting reference for new pages ("copy the nearest kit page, don't compose from scratch").
Optionally add a 20-line script asserting every kit component file is exported from `index.ts`.

**(d) Effort: S.**

---

## Deliberate non-adoptions (studied, rejected)

- **StyleX / `xstyle` prop** — wrong substrate; we're Tailwind + CSS vars.
- **Runtime `defineTheme()` + `@scope` theme engine** — 7-theme machinery; we have one brand and a
  two-value surface axis that `[data-surface]` already handles well (Astryx has *no* density axis
  — our warm/dense seam is a thing we do that they don't).
- **`asChild`/Slot polymorphism** — Astryx itself avoids it; their narrow `as`-when-`href` pattern
  is the better model if we ever need it.
- **Doc-gen CLI, dense/zh doc translations, MCP server, `/vibe-test`** — right idea (tested,
  generated agent docs), wrong scale for 21 components. Keep the *discipline* (SYNC comments,
  anti-pattern lists), skip the machinery.

---

## Top 5 to actually do

1. **Write and land the kit guide** (`docs/KIT_GUIDE_DRAFT.md` → `docs/KIT_GUIDE.md`), link it
   from `AGENTS.md` and `components/portal/kit/index.ts`. — Lesson 3, **S**
2. **Migrate `css/portal-tokens.css` to `light-dark()` + `color-scheme`**, deleting the duplicated
   `html.dark` variable block; then delete orphaned `css/dark-mode.css` (`--dm-*`). — Lessons 1+2, **S/M**
3. **Add `KitBaseProps` (className/style/ref/data-*) to kit primitives** with consumer-wins merge
   order. — Lesson 5, **S–M**
4. **Port the three a11y hooks (`useFocusTrap` w/ escape stack, `useListFocus`, `useAnnounce`)
   into `components/portal/kit/hooks/` before building any kit Dialog/Menu**; native `<dialog>` +
   focus restore. — Lesson 4, **M**
5. **Scoped ESLint rule banning raw hex / tokened inline styles in `components/portal/kit/**`**,
   warn locally / error in CI. — Lesson 8, **S**

(Honorable mention if budget allows: `--wa-dur-*` motion tokens + the dark-mode inset-bezel shadow
— both S, both one-file changes to `portal-tokens.css`.)
