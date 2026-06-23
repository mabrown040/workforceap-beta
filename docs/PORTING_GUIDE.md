# Mockup → React Kit — PORTING GUIDE

You are porting a static HTML mockup in `docs/mockups/*.html` into a **React kit component**.
Fidelity bar: the result should look like the mockup — same layout, spacing, color roles,
hierarchy, and copy. Reproduce it faithfully, on our design system (not raw Tailwind).

## Hard rules (read twice)

1. **Tailwind is prefixed `wa-`.** The mockups use *unprefixed* Tailwind (`bg-[#ad2c4d]`,
   `rounded-3xl`, `grid-cols-3`). Those DO NOT WORK here. You must instead use:
   - **inline `style={{}}`** with our CSS variables (e.g. `style={{ color: 'var(--wa-accent)' }}`), AND/OR
   - **`wa-kit-*` component classes** (below), AND/OR
   - **`wa-`-prefixed utilities** for layout only (`wa-grid wa-grid-cols-1 lg:wa-grid-cols-3 wa-gap-5`, `wa-p-6`, `wa-mt-6`, `wa-hidden`, `md:wa-block`).
   When in doubt, use inline `style` with tokens — it always works.
2. **Icons: use `lucide-react`, NOT Font Awesome.** Map each `fa-*` to the closest lucide
   icon (e.g. `fa-microphone`→`Mic`, `fa-microphone-lines`→`Mic`/`AudioLines`, `fa-wand-magic-sparkles`→`Sparkles`/`Wand2`,
   `fa-bullseye`→`Target`, `fa-headset`/`fa-headphones`→`Headphones`, `fa-briefcase`→`Briefcase`,
   `fa-bolt`→`Zap`, `fa-file-lines`→`FileText`, `fa-envelope-open-text`→`MailOpen`, `fa-circle-check`→`CheckCircle2`,
   `fa-magnifying-glass-chart`→`ChartNoAxesColumn`/`Search`, `fa-sitemap`→`Network`, `fa-route`→`Route`,
   `fa-linkedin`→`Linkedin`, `fa-user-pen`→`UserPen`, `fa-magnifying-glass`→`Search`, `fa-comments-dollar`→`MessagesSquare`,
   `fa-scale-balanced`→`Scale`, `fa-clock`→`Clock`, `fa-video`→`Video`, `fa-phone-slash`→`PhoneOff`,
   `fa-microphone-slash`→`MicOff`, `fa-closed-captioning`→`Captions`, `fa-palette`→`Palette`,
   `fa-arrow-right`→`ArrowRight`, `fa-arrow-up-from-bracket`→`Upload`, `fa-hashtag`→`Hash`, `fa-key`→`KeyRound`,
   `fa-play`→`Play`, `fa-circle`→`Circle`, `fa-flask`→`FlaskConical`, `fa-plus`→`Plus`, `fa-bell`→`Bell`).
3. **Display/heading font:** add `className="h-font"` to big headings (it's our Plus Jakarta Sans
   display face). Body text inherits Inter automatically.
4. **Wrap the whole component in `<DesignSurface surface="...">`** — `"warm"` for member-facing,
   `"dense"` for admin/staff/data. Import from `@/components/portal/kit`.
5. **`'use client'`** at the very top ONLY if the component has interactivity (tabs, toggles,
   local state). Tab-switching mockups (e.g. voice studio) need it. Pure read views don't.
6. **NEVER run git. NEVER run `npm run build` / full `tsc`.** Only create the files you're told to
   create, only in your assigned directory. Do not edit, move, or delete any other file. The
   orchestrator wires routes, runs the build, and commits. Write clean, correctly-typed TSX.
7. **Data:** these are presentational. Accept a typed `Props` interface, but give every prop a
   **sensible default pulled from the mockup's own numbers/copy** so the component renders
   standalone with no wiring. (e.g. `score = 72`, `firstName = 'there'`.)

## Design tokens (CSS variables — always available)

```
--wa-accent: #ad2c4d   (crimson, primary action)      --wa-accent-dark: #8b1f38
--wa-accent-soft: #fdf2f4 (crimson tint bg)            --wa-gold: #a47f38 (achievement)
--wa-gold-soft: #fef3c7                                --wa-info: #2b7bb9 (blue, supporting)
--wa-success: #4a9b4f                                  --wa-bg: #f7f8fa  --wa-surface: #fff
--wa-text: #1a1a1a   --wa-muted: #737373   --wa-border: #e8e8e8
--wa-radius / --wa-radius-sm / --wa-pad / --wa-pad-sm   (auto-adjust per surface; prefer these for cards)
```
Crimson = action. Gold = achievement/readiness. Blue = supporting/counselor. Match the mockup's role usage.

## `wa-kit-*` component classes (from css/portal-kit.css — reuse, don't reinvent)

- `wa-kit-card` — white card (surface, border, radius, pad, shadow). `wa-kit-card--sm` smaller.
  `wa-kit-card--hover` lifts on hover. `wa-kit-card--tinted` crimson-tint bg.
- `wa-kit-card--gradient-crimson` / `--gradient-gold` — gradient feature tile, white text
  (auto-falls-back to calm tint in dense surface).
- `wa-kit-tag wa-kit-tag--{ok|warn|alert|info|muted}` — small pill/badge.
- `wa-kit-bar-track` + inner `wa-kit-bar-fill` — progress bar (set fill `style={{ width: '72%' }}`).
- `wa-kit-stat-label` (tiny uppercase label) + `wa-kit-stat-value` (big tabular number).
- `wa-kit-focus` — WCAG AA focus ring; add to clickable cards/buttons.
- `wa-kit-table-wrap` > `wa-kit-table` (th/td) — dense table.

## Kit components — `import { ... } from '@/components/portal/kit'`

- `<DesignSurface surface="warm|dense" className?>` — REQUIRED wrapper.
- `<KpiStrip cols={4} items={[{ label, value, color: 'accent'|'info'|'gold'|'success'|'text' }]} />`
- `<StatTile label value color? />`
- `<SectionHeader title kicker? goal? />`
- `<ProgressRing pct={72} size={112} onDark? />` — circular ring.
- `<ProgressBar pct={72} aria-label />`
- `<StatusTag tone="ok|warn|alert|info|muted">JOB-READY</StatusTag>`
- `<Avatar name="Mike Brown" />` — initials chip.
- `<FeatureTile icon={<Sparkles/>} badge="AI" title body tone="crimson|gold" href />`
- `<DataTable columns={Column[]} rows rowKey={r=>r.id} mobile="scroll|cards" />`
  (`Column = { key, header, align?, render?: (row)=>ReactNode }`)
- `<QueueRow>`, `<WorkQueueItem>`, `<KanbanBoard>`, `<BarChartMini>`, `<RankBars>`,
  `<FormField>`, `<Toggle>`, `<ChatThread>`, `<Avatar>`, `<UniversalSearch>`.
Prefer these primitives; build custom markup (with the rules above) only for what they don't cover.

## Skeleton

```tsx
// 'use client'  // ONLY if interactive
import { DesignSurface, KpiStrip, SectionHeader, FeatureTile } from '@/components/portal/kit';
import { Mic, Sparkles, Target } from 'lucide-react';

export interface FooKitProps { firstName?: string; score?: number; }

export function FooKit({ firstName = 'there', score = 72 }: FooKitProps) {
  return (
    <DesignSurface surface="warm">
      <div style={{ maxWidth: 1120, margin: '0 auto', padding: 16 }}>
        <h2 className="h-font" style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-.03em' }}>
          Everything to get hired, in order.
        </h2>
        {/* ...faithful port of the mockup using tokens + wa-kit-* + wa- utilities... */}
      </div>
    </DesignSurface>
  );
}
```

## Reduced motion
If you add CSS animations, gate them: respect `@media (prefers-reduced-motion: reduce)`.
Prefer subtle/none. Keep focus rings (`wa-kit-focus`).

## When done
Report: the exact file path(s) you created, the default export name(s), any props that should be
wired to real data later, and which mockup section maps to which target route.
