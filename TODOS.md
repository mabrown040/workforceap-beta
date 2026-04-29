# WorkforceAP TODOS

---

## TODO: Configure GA4 funnel exploration report

**What:** Set up GA4 to capture and visualize the 7 member acquisition funnel events
as a multi-step funnel exploration report.

**Why:** The funnel events fire to dataLayer → GTM → GA4, but without a configured
GA4 funnel exploration, the data is invisible. This is the entire point of the
instrumentation sprint — the events are worthless until someone can query them.

**Pros:** Makes funnel drop-off visible immediately; enables data-driven decisions
about where to invest next (signup form? email verify? resume?).

**Cons:** GA4 configuration work, not code — requires access to the GA4 property.
No development cost, but needs to be done intentionally.

**Context:** The code for 7 `trackFunnelEvent()` calls was added in the member
acquisition sprint (2026-04). Events fire as `funnel_event` with `funnel_step` field.
Steps: `signup_page_viewed` → `signup_started` → `signup_completed` → `email_verified`
→ `dashboard_first_visit` → `resume_page_viewed` → `resume_uploaded`.
GTM must have a GA4 custom event tag configured to forward `funnel_event` dataLayer
pushes. Then build a Funnel Exploration in GA4 using these steps as the funnel stages.

**Depends on / blocked by:** Member acquisition sprint shipped (code + events live in prod).
