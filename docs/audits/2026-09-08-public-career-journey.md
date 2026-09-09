# Public career journey audit — September 8, 2026

Read-only browser review of production `https://www.workforceap.org` at desktop
and 390 × 844 mobile dimensions. Completed the pathfinder and followed its
application link; did not submit an application or send a message.

## Observed production behavior

1. **Home learner actions below the first mobile screen.** On `/`, Donate begins
   at y=193, Start your application at y=926, and Find your path at y=988. The
   first screen is dominated by the institutional mission paragraph.
2. **Recommendations under-explain readiness.** On `/find-your-path`, computers
   + brand new/no experience + needs a job ASAP returns IBM IT Support, Google
   Python Automation, and Net+/Sec+. Explanations repeat the same interest-only
   rationale. The latter two display unsupported starting salary bands.
3. **Program preparation contradicts the entry point.** On
   `/programs/it-support-professional-certificate-ibm`, “First IT credential”
   appears alongside a fallback recommendation for prior experience. The
   supplied syllabus describes entry-level IT support and contains no
   `recommendedPrerequisite` field. Its 160 hours and $7,500 tuition are
   documented training facts; they are distinct from salary claims.
4. **Public impact has almost no usable evidence.** `/impact` reports no
   published completion, placement, wage, program-cohort, employer, or story
   data. This avoids fabricated figures but leaves readers with little help
   assessing the work.
5. **The application first step is substantial.** `/en/apply` asks six screening
   questions plus contact details, location, age, barriers, and referral source
   before program and account steps. The selected program survives the
   marketing-to-application handoff correctly.

## Program catalog and comparison correction

The September 8 working change removes unsupported salary figures and source
attributions from the catalog, all 20 generated program detail pages, and the
comparison page. Pay research links point to `/salary-guide`.

Comparison rows now read current program titles, hours/delivery formats,
providers, and syllabus prerequisites from the same catalog as detail pages.
This corrects stale duplicated durations, certificate labels, and difficulty
stars. Unverified “High / Very High” demand labels are removed. Roles are
presented as directions for research, not verified employment outcomes.

The IBM detail page reports that the syllabus has no listed recommended
prerequisite and directs readers to confirm preparation with an advisor. This
does not infer unrestricted eligibility. The documented CompTIA A+ or
equivalent prerequisite for Networking and Cybersecurity remains intact.

Source: `shared/programSyllabi.ts`; provenance:
`docs/source-of-truth/TWC-PROGRAM-SYLLABI-2026-07.md`. Historical salary values
remain in shared data pending a separate migration; these corrected pages do
not render them.

## Verification

- `npm run build` in `marketing/`: all 68 static routes built successfully.
- Parsed rendered HTML for the catalog, comparison, and 20 generated program
  details: no starting salary/range or Lightcast/BLS attribution; each links to
  career pay research.
- Checked rendered IBM detail for 160 hours, $7,500 tuition, and the corrected
  preparation statement. Checked comparison for the exact supplied
  Networking and Cybersecurity prerequisite.
- Browser preview at 390 × 844: comparison and IBM detail have no horizontal
  page overflow; pay-research links exist and no runtime errors were reported.
- Screenshots retained locally: `/tmp/wap-live-mobile.png`,
  `/tmp/wap-live-match-results.png`, `/tmp/wap-live-apply.png`, and
  `/tmp/wap-changed-comparison-mobile.png`.

Remaining scope: other owners are improving home, quiz plans, and impact.
Archived blog content also requires an evidence review before its named member
stories or historical wage claims are reused as proof.
