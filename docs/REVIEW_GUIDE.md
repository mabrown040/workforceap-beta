# Portal Reskin — Review Guide & Sign-off

**Branch:** `feature/portal-design-system` · **PR #2068** · **Preview (demo Supabase):**
`https://workforceap-beta-git-feature-p-793c79-mabrown040-5207s-projects.vercel.app`
Login: `mabrown040@gmail.com` (demo super-admin). **Not merged — awaiting sign-off.**

## Sign-off summary (what I verified)

Every portal is reskinned to the design kit and renders clean — swept live on the preview:

| Portal | Coverage | Result |
|---|---|---|
| **Admin** | 49 routes (Tier 1/2/3) | all render kit, 0 error boundaries; command rail matches `admin-full.html` (branded header, in-rail search, flat groups, **crimson active**, badge pills) |
| **Member** | 24 key routes | all render; Progress / Profile / Certs / Voice Studio match the fire mockups |
| **Counselor** | overview + nav | dark rail, KPI strip, triage list, crimson active |
| **Employer** | overview + nav | dark rail, 6-stat KPI, Voice Assistant card, crimson/gold quick actions |
| **Partner** | overview | renders branded ("Workforce Solutions Capital Area") |

**Voice sessions** now all use the brand palette (was a rainbow of off-brand colors):
- Counselor orb: pink `#db2777` → **crimson** `#ad2c4d`
- Resume coach: blue → crimson · Interview coach: purple → crimson (action coaches = crimson)
- Readiness coach: teal → **gold** `#a47f38` (achievement) · WIOA: teal → **blue** `#2b7bb9` (support)
- Active "CONNECTED" voice session (`PortalVoiceSession`) default → brand crimson
- In-office sessions (dad's flow): **rich Walk-in / Existing-member operator flow restored as default** (my earlier reskin had wrongly buried it behind a thin table).

Build gates green every push: `tsc` + Material-Symbols glyph check + `next build`.

## What to review (in priority order)

1. **Admin command rail** — `/admin`. Confirm: branded shield header, in-rail search, flat groups, the current page's row is **solid crimson**. Click through Students/Employers/Partners/Counselors/Mentors/Board/Jobs/Programs — each should be a KPI strip + kit table/cards.
2. **In-office sessions** (dad's flow) — `/admin/sessions`. Confirm the **Walk-in / Existing member** cards + session history are the default (not a bare table). Run one (`Start walk-in`) end-to-end.
3. **Voice sessions** — `/dashboard/ai-tools/studio` (the coach cards), `/dashboard/counselor` (the crimson orb), and start a Resume/Interview voice session — confirm the active "CONNECTED" screen pops **crimson** (no more pink/purple/teal).
4. **Member fire pages** — `/dashboard/readiness`, `/dashboard/profile`, `/dashboard/certifications`. Match the mockups; data is sparse on this account (see judgment).
5. **Persona portals** — `/employer`, `/counselor`, `/partner` overviews. Dark rail + KPI + lists.
6. **Dark mode + mobile** — toggle the moon icon; resize to phone. Rail → drawer, tables → cards.

## My judgment

- **Solid / done:** the reskin is consistent and brand-accurate across all five portals; the command rail now genuinely matches the mockup; voice is on-palette; in-office sessions flow is back to the rich operator experience.
- **Data, not design:** the demo super-admin account is sparse (readiness 5, 0 certs, no resume), so member pages look emptier than the populated mockups. Seed this account (enrollment + certs + a placement) to see them fully populated — it's not a UI gap.
- **One real open item — member nav (#2069):** the member portal still uses the older two-level nav (Home / My Program / Career Toolkit + sidebar) instead of the mockup's flat 6-item top-nav (Jobs · Certs · Toolkit · Progress · Messages · Profile). Page **bodies** match the mockups; the nav **shell** does not. This was assigned to the other session and has a reachability spec (`docs/PORTAL_NAV_SPEC.md`) — say the word and I'll take it.
- **Minor polish (non-blocking):** the voice counselor uses a couple emoji (🎙️/🔊) in the active state where the design rubric prefers SVG; the rail footer has no user-identity block (needs a user-name prop threaded into the shell).

## Architecture reference
`docs/ADMIN_PORTAL.md` (kit pattern, nav/rail, APIs, build gates). gbrain: `projects/workforceap/admin-portal-reskin`.
