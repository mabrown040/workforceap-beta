# Funding Copy Migration

## Why This Changed

We are pivoting from generic "no cost" language to **"Workforce Funded Training"** — a specific, branded term that:

- Signals a real funding mechanism rather than vague "free" positioning
- Aligns with WIOA, grant, and employer-partner funding sources
- Avoids the perception that programs are universally free (they are **funded** for **qualified** members)
- Supports the ICP (low-income, mobile-first, institution-skeptic) by being specific about the pathway, not just the price

## What Changed

All English-language copy in `messages/en.json` was swept. Spanish (`es.json`), French (`fr.json`), and Portuguese (`pt.json`) are **intentionally unchanged** in this PR and will be updated in a follow-up translation pass.

### Keys Updated in `messages/en.json`

| Namespace | Key | Before | After |
|-----------|-----|--------|-------|
| `dashboard` | `aiToolkitDescription` | "AI-powered career tools ... available at no cost to members." | "AI-powered career tools ... available through Workforce Funded Training for qualified members." |
| `dashboard` | `startApplicationToBegin` | "Start your application ... All programs are offered at no cost to members." | "Start your application ... All programs are offered through Workforce Funded Training for qualified members." |
| `dashboard` | `chooseProgramToBegin` | "Choose a program ... All programs are offered at no cost to members." | "Choose a program ... All programs are offered through Workforce Funded Training for qualified members." |
| `dashboard` | `letsBuildYourCareerPath` | "Let's build your career path. Programs are available at no cost to members." | "Let's build your career path. Programs are available through Workforce Funded Training for qualified members." |
| `dashboard` | `careerTrainingNoCost` | "Career training at no cost to members, funded by grants and partnerships. A counselor will help you pick the right program and next steps. for qualifying members, confirmed by your counselor." | "Career training through Workforce Funded Training for qualified members. A counselor will help you pick the right program and next steps." |
| `dashboard` | `pickCareerTrack` | "Pick the career track ... Programs are available at no cost to members, funded by grants and partnerships." | "Pick the career track ... Programs are available through Workforce Funded Training for qualified members." |
| `apply` | `heroDescHighlight` | "Programs are offered at no cost to qualifying members, funded by grants and partnerships." | "Programs are offered through Workforce Funded Training for qualified members." |
| `marketing.home` | `description` | "Occupational and career training with grant- and partner-funded access for qualifying members ..." | "Occupational and career training with Workforce Funded Training access for qualified members ..." |
| `marketing.home` | `heroCopy` | "Career training with no upfront program cost for qualifying members. Earn industry-recognized credentials ..." | "Career training through Workforce Funded Training for qualified members. Earn industry-recognized credentials ..." |
| `marketing.home` | `heroBody1` | "... at no cost to the members." | "... through Workforce Funded Training for qualified members." (Also lowercased "Workforce readiness" → "workforce readiness" and "Resume, Interview and Job Placement Assistance" → "resume, interview and job placement assistance") |
| `marketing.home` | `trustGrant` | "Grant- and partner-funded pathways" | "Workforce Funded Training pathways" |
| `marketing.home` | `trustNoCost` | "No-cost for qualifying members" | "Workforce Funded Training for qualified members" |
| `marketing.home` | `memberCardNoCost` | "No-cost for qualifying members" | "Workforce Funded Training for qualified members" |
| `marketing.home` | `aboutBody1` | "... with no cost to qualifying members." | "... through Workforce Funded Training for qualified members." |
| `marketing.whatWeDo` | `description` | "... grant- and partner-funded access for qualifying members." | "... Workforce Funded Training access for qualified members." |
| `marketing.whatWeDo` | `heroCopy` | "Employer-aligned training. No cost for qualifying members. Career support throughout the journey ..." | "Employer-aligned training. Workforce Funded Training for qualified members. Career support throughout the journey ..." |
| `marketing.whatWeDo` | `bento2Desc` | "No cost for qualifying members. No prerequisites. Funding comes from grants and partnerships ..." | "Workforce Funded Training for qualified members. No prerequisites. Funding comes from WIOA, grants, employer partners, and community partnerships ..." |
| `marketing.whatWeDo` | `missionBody2` | "We build lasting careers and better lives at no cost to qualifying members — funded by grants and employer and community partnerships." | "We build lasting careers and better lives through Workforce Funded Training for qualified members — funded by WIOA, grants, employer partners, and community partnerships." |
| `marketing.whatWeDo` | `ctaBody` | "Join hundreds of members ... Our programs are offered at no cost to qualifying members." | "Join hundreds of members ... Our programs are offered through Workforce Funded Training for qualified members." |
| `marketing.howItWorks` | `heroCopy` | "No gatekeeping. Clear, grant- and partner-funded pathways for qualifying members." | "No gatekeeping. Clear, Workforce Funded Training pathways for qualifying members." |
| `marketing.programs` | `heroDesc` | "Explore career training programs offered at no cost to qualifying members, with certifications from IBM, Google, AWS, Microsoft, and CompTIA." | "Explore career training programs offered through Workforce Funded Training for qualified members, with certifications from IBM, Google, AWS, Microsoft, and CompTIA." |
| `marketing.faq` | `faq1a` | "Programs are offered at no cost to qualifying members. WorkforceAP helps you understand the funding path ..." | "Programs are offered through Workforce Funded Training for qualified members. WorkforceAP helps you understand the funding path ..." |
| `marketing.contact` | `heroCopy` | "... or a donor interested in supporting no-cost member training ..." | "... or a donor interested in supporting Workforce Funded Training ..." |
| `marketing.partners` | `narrativeCopy` | "Referral partners send us candidates who may benefit from career training offered at no cost to members." | "Referral partners send us candidates who may benefit from career training offered through Workforce Funded Training for qualified members." |
| `marketing.partners` | `faq2a` | "... our career training programs that are offered at no cost to members." | "... our career training programs offered through Workforce Funded Training for qualified members." |
| `footer` | `fundedBy` | "Funded by grants and partnerships." | "Workforce Funded Training for qualified members." |
| `footer` | `copyright` | "Career training and job-readiness support with no upfront program cost for qualifying members." | "Career training and job-readiness support through Workforce Funded Training for qualified members." |
| `marketing.impact` | `intro` | "... through no-cost training, employer-informed program design ..." | "... through Workforce Funded Training, employer-informed program design ..." |
| `marketing.impact` | `stat4Label` | "Cost to members — funded by grants and partnerships" | "Cost to members — Workforce Funded Training" |

### Keys Intentionally Left Unchanged

| Key | Reason |
|-----|--------|
| `marketing.partners.referralWhy` | "There is no cost to refer" refers to **partner** cost, not member cost. Still accurate. |
| `marketing.home.trustNoCard` | "No credit card required" is still accurate and unrelated to funding language. |
| `marketing.home.statNoCost` / `statMemberCost` | The "$0" label stays. The stat label itself was updated where needed. |

---

## `fundingSource` Field on Programs

### Database / CMS Schema

Programs now support an optional `fundingSource` field. This is used to show the specific funding mechanism on program cards, detail pages, and enrollment flows.

**Recommended values:**
- `WIOA` — Workforce Innovation and Opportunity Act
- `Grant` — General grant-funded pathway
- `Employer Partner` — Direct employer sponsorship
- `Community Partnership` — Local org / church / nonprofit partnership
- `Workforce Funded Training` — Default umbrella term when specific source is mixed or TBD

### How to Add `fundingSource` to a Program

1. In the admin portal or CMS, locate the program record.
2. Set `fundingSource` to one of the values above (or a custom string if needed).
3. The badge component will render automatically on program cards and detail pages.

### Badge Component Usage

The badge is displayed via the `FundingBadge` component (or equivalent in your UI layer):

```tsx
// Example usage in a program card
<FundingBadge source={program.fundingSource} />

// Renders a pill/chip like:
// "Workforce Funded Training" | "WIOA" | "Employer Partner" | etc.
```

**Design rules:**
- Badge appears **below the program title** and **above the CTA** on cards.
- On detail pages, it appears in the hero section next to the duration estimate.
- Color coding (optional):
  - `WIOA` → blue
  - `Grant` → green
  - `Employer Partner` → purple
  - `Community Partnership` → amber
  - Default / mixed → slate / neutral

---

## Translation Status

| Language | Status | Notes |
|----------|--------|-------|
| English (`en.json`) | ✅ Updated in this PR | All funding copy swept |
| Spanish (`es.json`) | ⏳ Pending | Do not translate word-for-word; adapt "Workforce Funded Training" to Spanish context (e.g., "Capacitación Financiada por Workforce" or similar branded term). |
| French (`fr.json`) | ⏳ Pending | Same guidance as Spanish. |
| Portuguese (`pt.json`) | ⏳ Pending | Same guidance as Spanish. |

**Rule for translators:** Preserve the **branded proper-noun feel** of "Workforce Funded Training" rather than literal translation. It should read like a program name, not a generic description.

---

## Rollback

If you need to revert this copy change:

```bash
git checkout HEAD -- messages/en.json
rm docs/FUNDING-COPY-MIGRATION.md
```

Or cherry-pick the inverse if this was committed as a standalone commit.

---

## Related

- Branch: `dench/funding-copy-workforce-funded-training`
- PR: (link when created)
- Follow-up: Translation pass for `es`, `fr`, `pt`
