# Prelaunch Growth / Lead-Magnet Roadmap — Approved 2026-06-13

Owner of decisions: Aura (priority/sequence). Execution: Dench → Forge (Engineer lane).
Status: **LOCKED** by Mike 2026-06-13. Do not re-litigate scope; flag changes back to Aura.

## Sequence

| # | Item | Gate to start | Notes |
|---|------|---------------|-------|
| 1/2 | Public interest profiler (lead magnet) | **building now** | the reuse source for #4 |
| 4 | Public career quiz | **next, after #1/#2 ships** | prelaunch-critical, same lead-magnet pattern |
| 3 | Share cards | after #4 | OG image route + share buttons |
| 5 | Referral perks | after #3 | referral code on points system |
| 6 | Outcomes wall | mechanic now, **turn on with first placements** | build dark, flip live later |

## Scope per item

### #4 — Public career quiz (prelaunch-critical)
Same pattern as the public interest profiler: **public page + stateless endpoint** reusing the
interest-profiler logic.
- Reuse (stateless, no user): `getInterestProfilerResults` / `getInterestProfilerCareers`
  (`lib/onet/interestProfiler`), `riasecFromResultRows` (`lib/content/quizIpMerge`),
  `mapIpCareerRowsToProgramSlugs` (`lib/onet/ipMapToPrograms`).
- Drop from the member route (`app/api/member/interest-profiler/score/route.ts`):
  `getUser()`/401 gate, `saveAIToolResult` persistence, `withApiGuc` tenant wrapper.
- Swap: `user.id`-keyed rate limit → **IP/anon-keyed** rate limit (still required — public surface).
- Requires `ONET_API_KEY` configured for the public endpoint (currently 503s without it).
- End on a soft CTA → enroll/sign-up (this is the lead capture).

### #3 — Share cards
- **OG image route** (Next dynamic OG) for shareable result/achievement cards.
- **Share button** wired into: mission celebration moment + cert moments.
- Cards should render without auth (public OG) but encode the achievement, not member PII.

### #5 — Referral perks
- Add **referral code** to the existing points system.
- **Both sides rewarded on enrollment** (referrer + referee), not on signup — reward fires at
  the enrollment event so it can't be farmed.

### #6 — Outcomes wall
- Build the **mechanic now** (data model + render path), ship behind a flag.
- **Turns on with first real placements** — no fake/seeded entries (member-trust standard).

## Dependencies / risks
- #4 blocks on #1/#2 shipping (shares the public lead-magnet plumbing).
- #4 hard-requires `ONET_API_KEY` on the public surface.
- #3 OG route must not leak member PII in card payloads.
- #6 must stay dark until real placements exist — honest-data standard, no seeded outcomes.
