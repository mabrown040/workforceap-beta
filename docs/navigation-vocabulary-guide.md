# Navigation and shared vocabulary guide

## Audit summary

### Inventory of duplicate concepts

| Concept | Labels found | Recommended label |
| --- | --- | --- |
| Public site entry | Home, Site home | WorkforceAP site |
| Top-level page inside a workspace | Home, Dashboard, Overview | Overview |
| Member workspace | Dashboard, member portal, student portal | Member portal |
| Employer workspace | Employer portal, company switcher | Employer portal |
| Partner workspace | Partner portal | Partner portal |
| Group leader workspace | My Group, Group leader view | Group portal |
| Partner/member collateral | Resources, Program resources, Partner resources | Use audience-specific names (Program resources, Partner resources) |
| Employer pipeline review | Applications, Applicants | Applicants for employer-facing surfaces; Applications for member-facing tracking |
| Admin area | Admin, WorkforceAP Admin, Admin Overview | Admin workspace / Admin overview |

## Shared vocabulary rules

1. **Use workspace names to orient the user.**
   - Member portal
   - Employer portal
   - Partner portal
   - Group portal
   - Admin workspace
2. **Use `Overview` for the first destination inside a workspace.** Avoid mixing `Home` and `Dashboard` in nav labels.
3. **Use `WorkforceAP site` for the back link to marketing pages.** This distinguishes the public site from signed-in workspaces.
4. **Use audience-specific resource labels.**
   - `Partner resources` for partner-only links
   - `Program resources` for member training assets
5. **Reserve `Applicants` for employer hiring review.** Reserve `Applications` for member job-application tracking.
6. **Prefer `Members` over `My Group` when the page content is a roster or progress table.**

## Recommended implementation pattern

- Keep shared nav copy in a single config module so shells, sidebars, and route headers reuse the same labels.
- Treat each workspace shell as a product primitive with:
  - a workspace label,
  - a context label,
  - a primary nav list,
  - a consistent link back to the WorkforceAP site,
  - shared header actions.
- Route headers should mirror the active nav label whenever possible so the sidebar, browser title, and page heading all reinforce the same concept.
