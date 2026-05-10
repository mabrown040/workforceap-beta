You are a member-first UX engineer for WorkforceAP — a nonprofit career training platform serving low-income adults, many on cracked Android phones with tight data and skepticism about "free" promises.

Your task: Fix the highest-impact member-facing issues in the dashboard. Create a single PR with clean, scoped changes.

## Issues to fix (from member audit)

1. **"Free" copy lacks nuance** — `app/(portal)/dashboard/page.tsx:776-779` welcome card says "no cost to members" without qualification. In `messages/en.json` and `messages/es.json`, update `careerTrainingNoCost` to include: "for qualifying members, confirmed by your counselor" and mention that partner sites (Coursera) may have their own terms.

2. **FAQ oversimplifies** — `app/(portal)/dashboard/guide/page.tsx:75-76` says "available at no cost" without enrollment steps. Update the FAQ answer to say "no program fee for members who qualify" and point to counselor confirmation.

3. **Third-party "free" claims** — `app/(portal)/dashboard/career-brief/page.tsx:53,79` says HIPAA/Office cert "free online". Replace with "often low-cost or included through partners—check current terms" or name the catch (account required).

4. **Mobile font sizes too small** — In `css/portal.css`, increase minimum font sizes for mobile:
   - `.portal-journey-step__detail`: 0.75rem → 0.875rem
   - `.portal-quick-grid-item__label`: 0.75rem → 0.875rem
   - Dashboard date pills, progress chips: minimum 0.8125rem
   - `MemberProgressStrip` step labels: 0.75rem → 0.875rem, dots 18px → 24px

5. **Profile bar fixed width** — `app/(portal)/dashboard/profile/page.tsx:245-259` uses 180px fixed width. Make it full-width on small screens (`max-w-full` or `width: 100%` below 768px).

6. **Learning page micro-text** — `app/(portal)/dashboard/learning/page.tsx` pathway bar 0.375rem → 0.5rem, eyebrow text 11px → minimum 0.8125rem.

7. **Resume load failure fakes success** — `app/(portal)/dashboard/layout.tsx:43-46` on DB error pretends resume exists. Change to show an honest banner: "We couldn't load your resume status—try again" instead of defaulting to true.

8. **Coursera fallback silent** — `app/(portal)/dashboard/page.tsx:151-157` if live progress fails, falls back to empty map. Add a small inline notice: "Live training sync unavailable—showing last saved progress" when `liveProgress` is empty after error.

9. **Match failure = no matches** — `app/(portal)/dashboard/jobs/JobsListingClient.tsx:330-333` treats error as empty list. Show "Couldn't load your matches—pull to refresh" or a retry button.

10. **Replace `alert()` with inline errors** — `app/(portal)/dashboard/LogCertificationModal.tsx:29-31` and `PlacementConfirmationStrip.tsx:22-24` use browser `alert()`. Replace with inline red message + retry button in the component.

## Rules
- One PR, one concern: only these member-facing fixes
- Don't change auth, roles, or API contracts
- Update both `messages/en.json` and `messages/es.json` for any new copy
- Build must pass (`npm run build`)
- Use the existing design system (no new CSS frameworks)
- PR title: "fix(member): mobile font sizes, trust copy, and honest error states"
