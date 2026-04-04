# Stakeholder transcript review — backlog (2026-04)

Source: walkthrough notes (marketing site, member portal, admin, partners). Items **shipped in code** in the same PR as this file are summarized under “Done in this batch.” Everything else remains for product/design/legal prioritization.

## Done in this batch (marketing + Pathfinder + leadership)

- **Home hero:** Brighter gradient overlay; CTA order **Find Your Career → Partner With Us → Apply** (with “Apply Now — Free” experiment labels); slightly larger primary typography.
- **Stakeholder cards:** **Partners** first and elevated, then Members, then Employers.
- **11-step strip:** Slightly larger milestone card body/heading type for readability.
- **Find Your Path:** **Sticky** “Assessment on file / Retake assessment” bar (stays visible while scrolling) when saved results load.
- **How it works:** Hero CTAs reordered — **Find your career** primary, **Apply now — free** secondary, **View programs** outline; step 11 label **Career growth** (was “Better Life”).
- **Leadership / Board:** Trustees in **three equal columns**, uniform 120px circular photos and card layout (removes uneven “bento” sizing).

## Already shipped earlier (reference)

- **Resume voice coach:** Plain-text extraction from PDF/DOCX for ElevenLabs; live editor draft in session; Accept → in-place replace when `original` matches (`feat/resume-coach-plain-text-context` or merged equivalent).

## Remaining — marketing / public site

- **What we do, Partners, Employers pages:** Shorten copy, “creating opportunity” framing, partner taxonomy (churches / community orgs / non-profits), referral wording (“best referrals” → inclusive language), success metrics clarity, laptop “zero upfront cost” clarification (not “pay later”).
- **Global:** Optional **text size** control; continue **image diversity** rules for blog/marketing (~67%+).
- **Nav:** Confirm **Blog** + **Contact** visibility in all breakpoints; order **Leadership** vs **Partners** in dropdown (currently Leadership → Partners → Blog → Contact).
- **Programs / employers:** Enterprise upskill, cyber defense ordering, employer tier copy — content strategy.
- **11-step journey:** Ensure **same wording** everywhere (homepage strip vs `/how-it-works` vs portal) — partially aligned; full copy audit still useful.

## Remaining — member portal (high level)

- **Assessment:** Prominent **Take / Retake assessment** on **dashboard** (not only Pathfinder); clarify duplicate flows: public **Pathfinder quiz** vs member **O\*NET / deeper** tools.
- **Portal IA:** Consolidate training / program / learning hub; Coursera integration; interest profiler completion + retake + skill mapping UX.
- **Resume:** Upload → parse → display on dashboard; voice coach **accept gate** + PDF/DOC export (partially specified in transcript).
- **Weekly recap / career brief:** Fresher data, explain scores, contrast modes (light/dark).
- **Job board / applications:** Kanban drag-and-drop, curated vs scraped jobs, employer consent for sharing.
- **Messages:** Role-based messaging, counselor/partner/instructor boundaries, SLA 48–72h surfacing.
- **Admin / partner / employer portals:** Analytics, placement grants, invites, pipeline AI suggestions with approval gate, white-label settings — large backlog.

## Suggested morning review order

1. Merge PR and verify **homepage**, **/find-your-path** (with saved localStorage results), **/how-it-works**, **/leadership** on mobile + desktop.
2. Skim this list and tick items into GitHub Issues or your sprint board.
