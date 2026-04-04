# Completed work log

Append-only record of shipped work that was previously tracked in backlogs or sprint notes. Use this to answer “what did we already ship?” without re-reading old PRs.

| Date (approx.) | Area | What shipped | Notes |
|----------------|------|--------------|--------|
| 2026-04 | AI tools hub | Stitch-era toolkit UI (bento, tools, history) | Was listed in root `AI-TOOLS-BACKLOG.md` (trimmed to open items only). |
| 2026-04 | Job Match | Split-pane `ResumeAnalysisPanel`, alignment ring, skill tags | Parity with internal mock; live Squarespace has no member Job Match UI — **not redundant** with workforceap.org (public marketing site). |
| 2026-04 | Interview Practice | STAR worksheets, transcript / PDF / .txt export | Self-hosted portal only. |
| 2026-04 | Voice Interview | `/dashboard/ai-tools/voice-interview`, coaching panel, member session API | Portal-only; not on public Squarespace. |
| 2026-04 | Profile / resume coach | Accept on voice suggestions **appends into** `ResumeRewriterForm` via controlled resume state | Fixes broken `initialResume`-only wiring; mobile profile now uses same `ResumeCoachWorkspace` as desktop. |
| 2026-04 | Live site parity check | `/how-it-works` loaner laptop copy | **Beta already aligned with live:** both use “Zero upfront cost for qualifying members” (live workforceap.org, fetched 2026-04). No copy change required for that backlog line. |
| 2026-04 | Skill Mapper | `/dashboard/ai-tools/skill-mapper` — O*NET search + radar (`SkillMapperRadar`), demo fallback when `ONET_API_KEY` unset (`lib/ai/skillMapperDemo.ts`) | Uses existing `GET /api/ai/skill-mapper`. |
| 2026-04 | Voice interview STT | `BrowserSpeechCaptions` (Web Speech API) on voice interview page | Runs alongside ElevenLabs; browser-dependent. |
| 2026-04 | Blog images | `getDefaultImage` wired into listing + post hero when no cover; descriptive alts; “Read more” includes post title | `lib/blog/blogListingImage.ts`, `app/blog/*`. |
| 2026-04 | Partner onboarding | Auto-advance slide duration **7500ms** (~30s across 4 slides) | `PartnerOnboardingTour.tsx`. |
| 2026-04 | Career Brief ↔ Weekly Recap | Cross-links: recap → brief (existing); brief → recap (new) | Light “consolidation” without merging pages. |
| 2026-04 | Homepage journey a11y | `.home-milestone-card` body/heading font tweaks for readability | `css/main.css`, `app/page.tsx`. |

## Live site comparison (workforceap.org)

- **Public marketing** (Squarespace): use for **messaging, IA, and visual parity** on public routes (`/`, `/how-it-works`, `/programs`, etc.).
- **Member portal / AI tools**: **not** on the old public site; self-hosted app features are additive. Avoid duplicating **public** copy inside the portal unless intentional.

## Related docs

- `docs/BACKLOG-MAINTENANCE.md` — how we handle backlog files and archives.
- `docs/plans/2026-04-03-sprint-tracker.md` — call-notes sprint; see tracker for shipped PR table.
