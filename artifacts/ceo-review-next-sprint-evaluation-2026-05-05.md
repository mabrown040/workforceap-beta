# CEO Review Follow-up — Done vs Next Sprint

## Already landed on master

### Marketing/public
- Removed the high-risk `n=1`/`1 placements tracked` trust callout from public-facing surfaces via PR #988 and related cleanup.
- Improved /programs and /apply mobile UX from the audit via PR #988.
- Shipped broad public i18n/localized marketing routing and SEO alternates via PRs #977/#981/#987/#991.
- Hardened blog/mobile runtime and navigation interactions via PR #997.
- Added launch-hardening audit artifacts/dossier via PR #999.
- Cron/security hardening landed across PRs #994 and follow-up master commits.

### Portal/product
- Coursera progress visibility, CSV promotion, active pull, and counselor/member surfacing landed via PRs #973-#975, #979, #982-#983, #990, #998.
- Counselor Sentry crashes fixed via PRs #978/#980/#996.
- Job application kanban status moves restored via PR #992.
- Training UX/i18n straggler polish landed via PR #985.
- Portal has strong role boundaries and no `n=1` placement stat.

## Still remaining from CEO/portal reviews

### P1 next sprint — public/marketing
1. Homepage hero still has two equal CTAs and a long-ish hero structure. The `n=1` issue is fixed, but the page still needs stronger single-action hierarchy.
2. /programs still needs a true mobile choice architecture: default starter-path view + sticky quiz CTA, not just mobile data visibility.
3. ERR_FAILED/Sentry noise still needs a focused browser/network pass to identify any remaining broken asset/source.

### P1 next sprint — portal
1. Mobile dashboard is still a vertical firehose; needs progressive disclosure around secondary content.
2. Empty states were missing for zero points and no AI activity; this branch starts that fix.
3. AI Toolkit labels still used jargon; this branch starts member-friendly label replacements.

## This branch
- Compresses homepage hero body copy in English to a clearer, member-first message.
- Renames high-jargon AI Toolkit labels in central registry/history/result surfaces.
- Adds mobile dashboard empty states for zero points and no recent AI activity.

## Recommended next sprint order
1. Land this branch after preview/build check.
2. Follow with a focused homepage CTA hierarchy branch: one dominant CTA + secondary text link, partner/employer CTAs lower.
3. Follow with /programs mobile decision architecture: 3 starter cards + `See all programs` + sticky `Find Your Path` CTA.
4. Run a browser-network pass for ERR_FAILED and open a tiny asset-fix PR.
5. Portal dashboard collapse pass: wrap career path, timeline, points, recommended programs, and recent activity behind `See full progress` on mobile.
