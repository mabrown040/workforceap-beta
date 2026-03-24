# Sprint 10 — Dark mode fixes

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
- Shared **admin** utility classes (`.admin-form-input`, `.admin-error-banner`, `.admin-blog-ai-section`, etc.)

## Fix 4: TSX hardcoded colors

- `ProgramsContent.tsx` — meta / footnote / partner line use `var(--color-gray-*)`
- `BlogPostEditor.tsx`, `BlogAIClient.tsx` — admin utility classes + token borders
- `AddMemberWizard.tsx`, `NewPartnerForm.tsx` — error banner class; inputs/hints; secondary buttons

## Verification

```bash
npx tsc --noEmit
npm run build
```
