# Sprint 10 - Dark mode fixes

## Fix 1: Token remap on `html.dark` (not only `body`)

`--color-primary` and the neutral scale are remapped on **`html.dark`** so every descendant (including portaled or nested trees) resolves the dark palette. Previously variables on `html.dark body` did not apply to arbitrary subtrees still inheriting `:root` `#1a1a1a` as text color.

## Fix 2: `--color-gray-900`

Added `--color-gray-900` in dark mode so `.blog-card-title` and similar patterns resolve to a light heading color.

## Fix 3: Page coverage (CSS)

`html.dark` overrides for:

- Salary / comparison tables (header background, row hover, link color)
- Salary guide intros / legends / mobile card program title
- Program comparison decision guide panel
- Active program filter chip (readable on dark)
- Program card icon, skills pills, details panel
- Blog listing cards (cover placeholder, category pill)
- Markdown body on legal-style pages
- Contact / apply form panels
- Public job board (`.jobs-listing`, filters, drawer, empty states, `.jobs-public-cta`)
- Shared **admin** utility classes (`.admin-form-input`, `.admin-error-banner`, `.admin-blog-ai-section`, etc.)

## Fix 4: TSX hardcoded colors

- `ProgramsContent.tsx` - meta / footnote / partner line use `var(--color-gray-*)`
- `BlogPostEditor.tsx`, `BlogAIClient.tsx` - admin utility classes + token borders
- `AddMemberWizard.tsx`, `NewPartnerForm.tsx` - error banner class; inputs/hints; secondary buttons

## Fix 5: Public `/jobs` landing

- **`/jobs`** is a **public** page: no login redirect; banner explains log in / apply to submit applications.
- **`JobsListingClient`**: when logged out, job cards link to **`/login?redirectTo=/jobs/{id}`**.
- **`/jobs/[id]`**: public view of live jobs; **`JobApplyButton`** shows "Log in to apply" when unauthenticated (apply API still requires auth).

## Fix 6: Viewport meta

Root layout exports Next.js **`viewport`** (`width=device-width`, `initialScale: 1`, `viewportFit: 'cover'`).

## Note: `/program-comparison`

Client-rendered (`ProgramComparisonClient`); tools without JS may see an empty shell. The live app is fine.

## Extended audit checklist (from master merge)

`master` at one point carried a longer Sprint 10 prompt (programs/salary/blog/contact/legal hardcodes, quiz counter, admin tabs, etc.). Treat anything not listed above as **backlog** unless already implemented in code.

## Verification

```bash
npx tsc --noEmit
npm run build
```
