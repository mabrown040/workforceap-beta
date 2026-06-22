# Portal Reskin — Design Mockups (BUILD SPEC)

These are **static HTML mockups** — the design source-of-truth for the portal reskin.
They are NOT React/Next code. The job is to **port these into React kit pages**
(`@/components/portal/kit`) behind `?ui=kit`, per `docs/PORTAL_REDESIGN_PLAN.md`.

Open locally: served at `http://192.168.1.150:8999/` (or open the files directly).

## What's built vs. what's spec

- **Built in React (deployed, behind `?ui=kit`):** 5 lean landings (member dashboard, admin,
  employer, partner, counselor) + `/dev/kit` + `/dev/dashboard`. These are *lean subsets* —
  KPI strip + a table — NOT the full mockup richness.
- **Spec only (these files):** the full reskin — Voice Studio, Career Studio, the
  "Everything to get hired" toolkit, the full Command Center, polished Messages /
  Certifications / Board Outcomes / Students roster. **Not yet written as React.**

## Mockup → target page

| Mockup | Specs / target |
|---|---|
| `index.html` | landing index for all mockups |
| `workforceap-member-suite.html` | full member portal suite (dashboard + sub-pages) → `app/(portal)/dashboard` + member sub-routes |
| `workforceap-voice-studio.html` | Voice AI tools studio (dad's priority) → new Voice Studio page |
| `workforceap-admin-full.html` | full admin app (every admin page) → `app/admin/*` |
| `workforceap-admin-suite.html`, `workforceap-admin-subviews.html` | admin sub-views detail |
| `workforceap-admin-partner-mockup.html` | admin partner management |
| `workforceap-concept-calm.html`, `-dense.html`, `-bold.html` | 3 global direction concepts × all 5 personas (A/B/C compare) |
| `wa-v2-member.html`, `-employer.html`, `-partner.html`, `-counselor.html` | per-persona v2 landings |
| `workforceap-design-system.html` | token/component reference |
| `workforceap-mobile-proof.html` | mobile/responsive proof |
| `workforceap-bento-shotgun.html`, `workforceap-bento-mockup.html` | early bento explorations |
| `workforceap-portal-variants.html` | original variant exploration |

## Direction (locked)

Gold × Stat-Dense. Member = Bold+Calm (warm surface); staff/admin = Dense Command (dense surface);
top-nav for members, sidebar for staff. Full rationale in `docs/PORTAL_REDESIGN_PLAN.md` §1.
