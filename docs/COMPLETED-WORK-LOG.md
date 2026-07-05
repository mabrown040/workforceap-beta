# Completed work log

Append-only record of shipped work that was previously tracked in backlogs or sprint notes. Use this to answer “what did we already ship?” without re-reading old PRs.

| Date (approx.) | Area | What shipped | Notes |
|----------------|------|--------------|--------|
| 2026-04 | AI tools hub | Stitch-era toolkit UI (bento, tools, history) | Was listed in root `AI-TOOLS-BACKLOG.md` (trimmed to open items only). |
| 2026-04 | Job Match | Split-pane `ResumeAnalysisPanel`, alignment ring, skill tags | Parity with internal mock; live Squarespace has no member Job Match UI — **not redundant** with workforceap.org (public marketing site). |
| 2026-04 | Interview Practice | STAR worksheets, transcript / PDF / .txt export | Self-hosted portal only. |
| 2026-04 | Voice Interview | `/dashboard/ai-tools/voice-interview`, coaching panel, member session API | Portal-only; not on public Squarespace. |
| 2026-04 | Profile / resume coach | Accept on voice suggestions **appends into** `ResumeRewriterForm` via controlled resume state | Fixes broken `initialResume`-only wiring; mobile profile now uses same `ResumeCoachWorkspace` as desktop. |
| 2026-04 | Resume coach context | PDF/DOCX/TXT extraction for ElevenLabs (`getMemberResumePlainText`, `extractTextFromResumeBuffer`); session POST body `liveResumeDraft`; profile hub hydrates editor via `GET /api/member/resume?includePlainText=1`; Accept applies **in-place replace** when `original` matches | Replaces naive `Blob.text()` on binary files. |
| 2026-04 | Live site parity check | `/how-it-works` loaner laptop copy | **Beta already aligned with live:** both use “Zero upfront cost for qualifying members” (live workforceap.org, fetched 2026-04). No copy change required for that backlog line. |
| 2026-04 | Skill Mapper | `/dashboard/ai-tools/skill-mapper` — O*NET search + radar (`SkillMapperRadar`), demo fallback when `ONET_API_KEY` unset (`lib/ai/skillMapperDemo.ts`) | Uses existing `GET /api/ai/skill-mapper`. |
| 2026-04 | Voice interview STT | `BrowserSpeechCaptions` (Web Speech API) on voice interview page | Runs alongside ElevenLabs; browser-dependent. |
| 2026-04 | Voice interview video | Optional WebRTC **camera + mic** recording (`MockInterviewVideoRecorder`), upload via `/api/member/voice-interview/recording`, `AIToolType.voice_interview_video` | Consent checkboxes; private `member-resumes` path `…/voice-interview-recordings/<uuid>.webm` or `.mp4`; short-lived signed download. |
| 2026-04 | Skill Mapper follow-through | Certifications → skill categories (`certToSkills.ts`); member skills vs job-market demand (**My Skills Profile** tab); course/cert recommendations to close gaps | Closes remaining Skill Mapper backlog lines; see `AI-TOOLS-BACKLOG.md` (only optional WebRTC stretch left). |
| 2026-04 | Blog images | `getDefaultImage` wired into listing + post hero when no cover; descriptive alts; “Read more” includes post title | `lib/blog/blogListingImage.ts`, `app/blog/*`. |
| 2026-04 | Partner onboarding | Auto-advance slide duration **7500ms** (~30s across 4 slides) | `PartnerOnboardingTour.tsx`. |
| 2026-04 | Career Brief ↔ Weekly Recap | Cross-links: recap → brief (existing); brief → recap (new) | Light “consolidation” without merging pages. |
| 2026-04 | Homepage journey a11y | `.home-milestone-card` body/heading font tweaks for readability | `css/main.css`, `app/page.tsx`. |
| 2026-07 | Kit meta-layer (Astryx lessons) | `--wa-*` tokens migrated to `light-dark()` + `color-scheme` (dark = one line); dead `--dm-*`/`css/dark-mode.css` deleted; `KitBaseProps` (className/style/ref/data-*) on kit primitives; a11y hooks `useFocusTrap` (Escape stack) / `useListFocus` / `useAnnounce`; kit ESLint hex ban (warn local, error CI); motion tokens `--wa-dur-*`/`--wa-ease`; dark inset-bezel elevation; `docs/KIT_GUIDE.md` landed | Study: `docs/ASTRYX_LESSONS.md`. Guide linked from `AGENTS.md` + kit barrel. |
| 2026-07 | Astryx full component sweep | Production adoptions: `PortalBreadcrumb` → Astryx `Breadcrumbs` (feeds `PageHeader`, ~140 pages; `on-dark` hero variant kept light-locked), `ThemeSelector` → `SegmentedControl`, `AdminChartsLoading` + `CoachChat` typing → `Spinner`, `EmployerApplicationsPager` → `Pagination` (same URL-state contract), `MembersTable` `HealthDot` → `StatusDot`, `/coach` chat presentation → Chat suite (`ChatMessageList`/`ChatMessageBubble`/`ChatComposer`) + `Markdown` replies + `Avatar` + `Token` prompt chips (logic/API contract unchanged). Lab: +7 templates (`login-sso`, `ai-chat-landing`, `side-gallery`, `file-explorer`, `kanban-board` — converted from raw `stylex.create` to plain styles since we don't run the StyleX compiler — `table-page`, plus existing `table-grouped`) and a components sampler (`/dev/astryx/components`: Calendar, CheckboxInput, Thumbnail, ChatSystemMessage + real ThemeSelector/PortalBreadcrumb mounts) | Colors stay on house tokens via the cascade-layer bridge (KIT_GUIDE §9). |
| 2026-07 | Design skills wired in | UI/UX Pro Max skill installed at `.cursor/skills/ui-ux-pro-max/` (searchable style/palette/typography/UX database via `scripts/search.py`; palette output advisory-only vs `--wa-*` tokens); gstack design-review methodology adapted (MIT) at `.agents/skills/design-review/SKILL.md` (UX laws, 80-item checklist, AI-slop blacklist, audit→fix→verify loop); both documented in `AGENTS.md` "Design intelligence & review skills" | Sources: nextlevelbuilder/ui-ux-pro-max-skill, garrytan/gstack. Full gstack suite not vendored (Claude-Code-specific). |
| 2026-07 | Astryx design system (site-wide) | `@astryxdesign/core` + `theme-neutral` + CLI installed; `reset.css`/`astryx.css` loaded globally via cascade layers (app CSS wins the 11 shared token names → components brand-align to crimson); `main.css` universal reset moved into `@layer reset` (fixes Astryx dialog centering); admin `ConfirmDialog` rebuilt on Astryx `Dialog` (same props API, 16 consumers untouched); admin ⌘K `GlobalSearch` rebuilt on `CommandPalette`; `/dev/astryx` lab with `dashboard`/`table-grouped`/`settings-sidebar` templates + overlay proofs | Coexistence policy: `AGENTS.md` "Astryx design system" + `docs/KIT_GUIDE.md` §9. Supersedes the non-adoption decision in `docs/ASTRYX_LESSONS.md`. |

## Live site comparison (workforceap.org)

- **Public marketing** (Squarespace): use for **messaging, IA, and visual parity** on public routes (`/`, `/how-it-works`, `/programs`, etc.).
- **Member portal / AI tools**: **not** on the old public site; self-hosted app features are additive. Avoid duplicating **public** copy inside the portal unless intentional.

## Related docs

- `docs/BACKLOG-MAINTENANCE.md` — how we handle backlog files and archives.
- `docs/plans/2026-04-03-sprint-tracker.md` — call-notes sprint; see tracker for shipped PR table.
