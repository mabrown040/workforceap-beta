# Overnight Sprint — 2026-05-05

## Mission
Get WorkforceAP closer to partner-trust / next-cohort readiness while Mike sleeps. Platform reliability and Coursera must feel like one coherent experience before partnerships scale.

## Strategic read from gbrain
- Product readiness and funding/distribution are separate but connected problems.
- Best funding/distribution paths remain: ACE direct-grant narrative, SDF via college/employer consortium, WIOA selectively board-by-board.
- For partnership trust, platform reliability is the wedge: if WAP cannot integrate every partner individually yet, the core portal/Coursera experience must be boringly reliable.

## Lanes
1. **Merge-ready QA fixes** — resolve PR #1010 locked-stakes/check status, rebase on latest master if needed, verify preview, merge when green.
2. **Enterprise reliability QA** — produce a repeatable smoke harness for public + auth-sensitive routes; find/fix high-confidence reliability regressions.
3. **Coursera synonymy** — make WAP↔Coursera feel like one flow: member email linking shipped in #1011; next verify launch, sync, unmatched mapping, runbook, env checklist.
4. **Partner/cohort readiness** — Concordia/high-school summer program + college-credit angle; define what must be true for Dad to sell without platform embarrassment.
5. **GTM/ads planning** — sales/marketing/ads plan that does not overclaim; target partner trust, no-cost-to-members, measurable training outcomes.

## Guardrails
- Ship small PRs, test before merge.
- Do not send external emails/posts/ads without Mike approval.
- Do not make destructive DB changes.
- Prefer evidence: build, typecheck, route smoke, screenshot, PR link, or explicit blocker.
