# Reusable UI layer guidance

## Inventory of recurring patterns
- Buttons: primary, outline, accent, ghost, destructive confirmation, table-row actions.
- Form groups: label + control + hint/error patterns across portal tools, employer job posting, and admin editing flows.
- Field errors and inline alerts: network/save failures shown as bespoke crimson boxes, plain text, or unstyled paragraphs.
- Cards: dashboard cards, benefit cards, job cards, partner/admin panels, resource cards.
- Badges/status chips: resource progress, employer job states, benefit access states, suggested-program confidence chips.
- Empty states: admin tables, partner resources, employer jobs board, jobs listing.
- Page headers: title + subtitle + optional action across admin, employer, and partner pages.
- Alert boxes: success/error flash banners and inline review messages.

## Shared primitive contract
- **Button**: use semantic variants for hierarchy (`primary`, `accent`, `secondary`, `outline`, `ghost`, `dark`, `white`) and shared loading behavior.
- **Card**: use `Card` for standard bordered/elevated containers; reserve bespoke card CSS for domain-specific layouts only.
- **Badge**: use tone-based semantics (`neutral`, `info`, `success`, `warning`, `danger`, `accent`) instead of ad-hoc one-off pill colors.
- **Alert**: use shared alert chrome for error/success/info/warning messaging with optional title and dismiss/action affordance.
- **EmptyState**: use a shared title/description/action layout so empty screens read consistently.
- **PageHeader**: keep title first, subtitle second, actions last; action area should only hold the primary page-level CTA plus one secondary action at most.

## Style and behavior guidance
- Status color mapping:
  - Neutral = drafts, inactive, not requested.
  - Warning = pending review / saved / needs attention.
  - Success = active, completed, live.
  - Danger = destructive actions and failed states only.
  - Accent = product-driving CTAs, not passive metadata.
- Hierarchy:
  - Primary CTA: filled brand button.
  - Workflow-advancing CTA: accent button when the action changes state externally (for example “Submit for review”).
  - Secondary action: outline button.
  - Tertiary/local action: ghost button only where contrast supports it.
- Spacing:
  - Form controls stack with one label, one control, and one hint/error block.
  - Card interiors should default to the shared spacing scale rather than per-component inline padding.
  - Empty states and alerts should keep content in a single readable column with one action row.

## Current overloads / inconsistencies to keep addressing
- `btn-ghost` is overloaded: it appears both on dark hero surfaces and on light app surfaces, so contrast expectations differ.
- Status treatments are inconsistent between cards, tables, and badges; some states rely on custom hex values instead of semantic tokens.
- Empty states vary in heading size, padding, and action placement between admin, employer, and portal views.
- Some admin flows still use inline form layout styles instead of shared form/card primitives.
- Table row actions still mix inline buttons, links, and select controls without a shared “action cluster” wrapper.
