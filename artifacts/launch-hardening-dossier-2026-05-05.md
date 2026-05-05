# Launch Hardening Dossier

Generated: 2026-05-05T15:12:01.882Z

## Coverage Summary
- Total discovered routes: 202
- Static routes verified via HTTP: 172
- Browser checks executed: 22

## Role x Route/Action Matrix
| Role | Route | Local | Live | Action Status |
|---|---|---:|---:|---|
| admin | `/admin` | 307 | blocked-auth | redirect, live-auth-blocked |
| admin | `/admin/ai-tools` | 307 | blocked-auth | redirect, live-auth-blocked |
| admin | `/admin/assessments` | 307 | blocked-auth | redirect, live-auth-blocked |
| admin | `/admin/audit-logs` | 307 | blocked-auth | redirect, live-auth-blocked |
| admin | `/admin/blog` | 307 | blocked-auth | redirect, live-auth-blocked |
| admin | `/admin/blog/ai` | 307 | blocked-auth | redirect, live-auth-blocked |
| admin | `/admin/blog/new` | 307 | blocked-auth | redirect, live-auth-blocked |
| admin | `/admin/board` | 307 | blocked-auth | redirect, live-auth-blocked |
| admin | `/admin/board/print` | 307 | blocked-auth | redirect, live-auth-blocked |
| admin | `/admin/career-mappings` | 307 | blocked-auth | redirect, live-auth-blocked |
| admin | `/admin/certifications` | 307 | blocked-auth | redirect, live-auth-blocked |
| admin | `/admin/counselors` | 307 | blocked-auth | redirect, live-auth-blocked |
| admin | `/admin/coursera` | 307 | blocked-auth | redirect, live-auth-blocked |
| admin | `/admin/coursera/csv-import` | 307 | blocked-auth | redirect, live-auth-blocked |
| admin | `/admin/dashboard` | 307 | blocked-auth | redirect, live-auth-blocked |
| admin | `/admin/diagnostics` | 307 | blocked-auth | redirect, live-auth-blocked |
| admin | `/admin/email-crons` | 307 | blocked-auth | redirect, live-auth-blocked |
| admin | `/admin/email-templates` | 307 | blocked-auth | redirect, live-auth-blocked |
| admin | `/admin/employer-screening-packs` | 307 | blocked-auth | redirect, live-auth-blocked |
| admin | `/admin/employers` | 307 | blocked-auth | redirect, live-auth-blocked |
| admin | `/admin/exports` | 307 | blocked-auth | redirect, live-auth-blocked |
| admin | `/admin/invites` | 307 | blocked-auth | redirect, live-auth-blocked |
| admin | `/admin/invites/new` | 307 | blocked-auth | redirect, live-auth-blocked |
| admin | `/admin/jobs` | 307 | blocked-auth | redirect, live-auth-blocked |
| admin | `/admin/members` | 307 | blocked-auth | redirect, live-auth-blocked |
| admin | `/admin/members/duplicates` | 307 | blocked-auth | redirect, live-auth-blocked |
| admin | `/admin/members/interview-ready` | 307 | blocked-auth | redirect, live-auth-blocked |
| admin | `/admin/members/job-ready` | 307 | blocked-auth | redirect, live-auth-blocked |
| admin | `/admin/members/new` | 307 | blocked-auth | redirect, live-auth-blocked |
| admin | `/admin/mentors` | 307 | blocked-auth | redirect, live-auth-blocked |
| admin | `/admin/messages` | 307 | blocked-auth | redirect, live-auth-blocked |
| admin | `/admin/metrics` | 307 | blocked-auth | redirect, live-auth-blocked |
| admin | `/admin/outcomes` | 307 | blocked-auth | redirect, live-auth-blocked |
| admin | `/admin/partners` | 307 | blocked-auth | redirect, live-auth-blocked |
| admin | `/admin/partners/new` | 307 | blocked-auth | redirect, live-auth-blocked |
| admin | `/admin/pipeline` | 307 | blocked-auth | redirect, live-auth-blocked |
| admin | `/admin/placements/new` | 307 | blocked-auth | redirect, live-auth-blocked |
| admin | `/admin/program-change-requests` | 307 | blocked-auth | redirect, live-auth-blocked |
| admin | `/admin/programs` | 307 | blocked-auth | redirect, live-auth-blocked |
| admin | `/admin/sessions` | 307 | blocked-auth | redirect, live-auth-blocked |
| admin | `/admin/sessions/walk-in` | 307 | blocked-auth | redirect, live-auth-blocked |
| admin | `/admin/settings` | 307 | blocked-auth | redirect, live-auth-blocked |
| admin | `/admin/subgroups` | 307 | blocked-auth | redirect, live-auth-blocked |
| admin | `/admin/subgroups/new` | 307 | blocked-auth | redirect, live-auth-blocked |
| admin | `/admin/users` | 307 | blocked-auth | redirect, live-auth-blocked |
| admin | `/admin/users/deleted` | 307 | blocked-auth | redirect, live-auth-blocked |
| admin | `/admin/weekly-recap` | 307 | blocked-auth | redirect, live-auth-blocked |
| admin | `/admin/wioa-screening` | 307 | blocked-auth | redirect, live-auth-blocked |
| auth-public | `/forgot-password` | 307 | 307 | redirect |
| auth-public | `/login` | 307 | 307 | redirect |
| auth-public | `/signup` | 307 | 307 | redirect |
| counselor | `/counselor` | 307 | blocked-auth | redirect, live-auth-blocked |
| counselor | `/counselor/guide` | 307 | blocked-auth | redirect, live-auth-blocked |
| counselor | `/counselor/inactive-members` | 307 | blocked-auth | redirect, live-auth-blocked |
| counselor | `/counselor/messages` | 307 | blocked-auth | redirect, live-auth-blocked |
| counselor | `/counselor/placements` | 307 | blocked-auth | redirect, live-auth-blocked |
| counselor | `/counselor/queue` | 307 | blocked-auth | redirect, live-auth-blocked |
| counselor | `/counselor/resources` | 307 | blocked-auth | redirect, live-auth-blocked |
| counselor | `/counselor/sessions` | 307 | blocked-auth | redirect, live-auth-blocked |
| counselor | `/counselor/sessions/walk-in` | 307 | blocked-auth | redirect, live-auth-blocked |
| counselor | `/counselor/students` | 307 | blocked-auth | redirect, live-auth-blocked |
| employer | `/employer` | 307 | blocked-auth | redirect, live-auth-blocked |
| employer | `/employer/applications` | 307 | blocked-auth | redirect, live-auth-blocked |
| employer | `/employer/guide` | 307 | blocked-auth | redirect, live-auth-blocked |
| employer | `/employer/jobs` | 307 | blocked-auth | redirect, live-auth-blocked |
| employer | `/employer/jobs/import` | 307 | blocked-auth | redirect, live-auth-blocked |
| employer | `/employer/jobs/new` | 307 | blocked-auth | redirect, live-auth-blocked |
| employer | `/employer/matches` | 307 | blocked-auth | redirect, live-auth-blocked |
| employer | `/employer/messages` | 307 | blocked-auth | redirect, live-auth-blocked |
| employer | `/employer/pipeline` | 307 | blocked-auth | redirect, live-auth-blocked |
| employer | `/employer/settings` | 307 | blocked-auth | redirect, live-auth-blocked |
| employer | `/employer/work-queue` | 307 | blocked-auth | redirect, live-auth-blocked |
| employer | `/employers` | 307 | blocked-auth | redirect, live-auth-blocked |
| member | `/account` | 307 | blocked-auth | redirect, live-auth-blocked |
| member | `/account/privacy` | 307 | blocked-auth | redirect, live-auth-blocked |
| member | `/applications` | 307 | blocked-auth | redirect, live-auth-blocked |
| member | `/dashboard` | 307 | blocked-auth | redirect, live-auth-blocked |
| member | `/dashboard/account` | 307 | blocked-auth | redirect, live-auth-blocked |
| member | `/dashboard/ai-tools` | 307 | blocked-auth | redirect, live-auth-blocked |
| member | `/dashboard/ai-tools/application-tracker` | 307 | blocked-auth | redirect, live-auth-blocked |
| member | `/dashboard/ai-tools/career-business-coach` | 307 | blocked-auth | redirect, live-auth-blocked |
| member | `/dashboard/ai-tools/cover-letter` | 307 | blocked-auth | redirect, live-auth-blocked |
| member | `/dashboard/ai-tools/elevator-pitch` | 307 | blocked-auth | redirect, live-auth-blocked |
| member | `/dashboard/ai-tools/gap-analyzer` | 307 | blocked-auth | redirect, live-auth-blocked |
| member | `/dashboard/ai-tools/history` | 307 | blocked-auth | redirect, live-auth-blocked |
| member | `/dashboard/ai-tools/interview-coach` | 307 | blocked-auth | redirect, live-auth-blocked |
| member | `/dashboard/ai-tools/interview-practice` | 307 | blocked-auth | redirect, live-auth-blocked |
| member | `/dashboard/ai-tools/interview-prep` | 307 | blocked-auth | redirect, live-auth-blocked |
| member | `/dashboard/ai-tools/job-match-scorer` | 307 | blocked-auth | redirect, live-auth-blocked |
| member | `/dashboard/ai-tools/linkedin-about` | 307 | blocked-auth | redirect, live-auth-blocked |
| member | `/dashboard/ai-tools/linkedin-headline` | 307 | blocked-auth | redirect, live-auth-blocked |
| member | `/dashboard/ai-tools/readiness-coach` | 307 | blocked-auth | redirect, live-auth-blocked |
| member | `/dashboard/ai-tools/resume-analysis` | 307 | blocked-auth | redirect, live-auth-blocked |
| member | `/dashboard/ai-tools/resume-coach` | 307 | blocked-auth | redirect, live-auth-blocked |
| member | `/dashboard/ai-tools/resume-rewriter` | 307 | blocked-auth | redirect, live-auth-blocked |
| member | `/dashboard/ai-tools/salary-negotiation` | 307 | blocked-auth | redirect, live-auth-blocked |
| member | `/dashboard/ai-tools/skill-mapper` | 307 | blocked-auth | redirect, live-auth-blocked |
| member | `/dashboard/ai-tools/voice-interview` | 307 | blocked-auth | redirect, live-auth-blocked |
| member | `/dashboard/assessment` | 307 | blocked-auth | redirect, live-auth-blocked |
| member | `/dashboard/assessments` | 307 | blocked-auth | redirect, live-auth-blocked |
| member | `/dashboard/career-brief` | 307 | blocked-auth | redirect, live-auth-blocked |
| member | `/dashboard/career-library` | 307 | blocked-auth | redirect, live-auth-blocked |
| member | `/dashboard/certifications` | 307 | blocked-auth | redirect, live-auth-blocked |
| member | `/dashboard/counselor` | 307 | blocked-auth | redirect, live-auth-blocked |
| member | `/dashboard/coursera` | 307 | blocked-auth | redirect, live-auth-blocked |
| member | `/dashboard/guide` | 307 | blocked-auth | redirect, live-auth-blocked |
| member | `/dashboard/help` | 307 | blocked-auth | redirect, live-auth-blocked |
| member | `/dashboard/job-applications` | 307 | blocked-auth | redirect, live-auth-blocked |
| member | `/dashboard/jobs` | 307 | blocked-auth | redirect, live-auth-blocked |
| member | `/dashboard/learning` | 307 | blocked-auth | redirect, live-auth-blocked |
| member | `/dashboard/learning/find-your-career` | 307 | blocked-auth | redirect, live-auth-blocked |
| member | `/dashboard/learning/interest-profiler` | 307 | blocked-auth | redirect, live-auth-blocked |
| member | `/dashboard/learning/wioa-qualification` | 307 | blocked-auth | redirect, live-auth-blocked |
| member | `/dashboard/mentor` | 307 | blocked-auth | redirect, live-auth-blocked |
| member | `/dashboard/mentors` | 307 | blocked-auth | redirect, live-auth-blocked |
| member | `/dashboard/messages` | 307 | blocked-auth | redirect, live-auth-blocked |
| member | `/dashboard/profile` | 307 | blocked-auth | redirect, live-auth-blocked |
| member | `/dashboard/program` | 307 | blocked-auth | redirect, live-auth-blocked |
| member | `/dashboard/program/employer-screening` | 307 | blocked-auth | redirect, live-auth-blocked |
| member | `/dashboard/program/start` | 307 | blocked-auth | redirect, live-auth-blocked |
| member | `/dashboard/readiness` | 307 | blocked-auth | redirect, live-auth-blocked |
| member | `/dashboard/resources` | 307 | blocked-auth | redirect, live-auth-blocked |
| member | `/dashboard/resume` | 307 | blocked-auth | redirect, live-auth-blocked |
| member | `/dashboard/settings` | 307 | blocked-auth | redirect, live-auth-blocked |
| member | `/dashboard/skills-assessment` | 307 | blocked-auth | redirect, live-auth-blocked |
| member | `/dashboard/training` | 307 | blocked-auth | redirect, live-auth-blocked |
| member | `/dashboard/weekly-recap` | 307 | blocked-auth | redirect, live-auth-blocked |
| partner | `/partner` | 307 | blocked-auth | redirect, live-auth-blocked |
| partner | `/partner-signup` | 307 | blocked-auth | redirect, live-auth-blocked |
| partner | `/partner/attention` | 307 | blocked-auth | redirect, live-auth-blocked |
| partner | `/partner/exports` | 307 | blocked-auth | redirect, live-auth-blocked |
| partner | `/partner/guide` | 307 | blocked-auth | redirect, live-auth-blocked |
| partner | `/partner/members` | 307 | blocked-auth | redirect, live-auth-blocked |
| partner | `/partner/messages` | 307 | blocked-auth | redirect, live-auth-blocked |
| partner | `/partner/milestones` | 307 | blocked-auth | redirect, live-auth-blocked |
| partner | `/partner/outcomes` | 307 | blocked-auth | redirect, live-auth-blocked |
| partner | `/partner/referred-members` | 307 | blocked-auth | redirect, live-auth-blocked |
| partner | `/partner/resources` | 307 | blocked-auth | redirect, live-auth-blocked |
| partner | `/partner/settings` | 307 | blocked-auth | redirect, live-auth-blocked |
| partner | `/partners` | 307 | blocked-auth | redirect, live-auth-blocked |
| public | `/` | 307 | 307 | redirect |
| public | `/accessibility` | 307 | 307 | redirect |
| public | `/apply` | 307 | 307 | redirect |
| public | `/apply/confirmation` | 307 | 307 | redirect |
| public | `/apply/create-account` | 307 | 307 | redirect |
| public | `/apply/results` | 307 | 307 | redirect |
| public | `/apply/status` | 307 | 307 | redirect |
| public | `/blog` | 307 | 307 | redirect |
| public | `/certifications` | 307 | 307 | redirect |
| public | `/contact` | 307 | 307 | redirect |
| public | `/faq` | 307 | 307 | redirect |
| public | `/find-your-path` | 307 | 307 | redirect |
| public | `/help` | 307 | 307 | redirect |
| public | `/how-it-works` | 307 | 307 | redirect |
| public | `/impact` | 307 | 307 | redirect |
| public | `/invite` | 307 | 307 | redirect |
| public | `/leadership` | 307 | 307 | redirect |
| public | `/mentor` | 307 | 307 | redirect |
| public | `/mentor/apply` | 307 | 307 | redirect |
| public | `/outcomes` | 307 | 307 | redirect |
| public | `/privacy` | 307 | 307 | redirect |
| public | `/profile` | 307 | 307 | redirect |
| public | `/program-comparison` | 307 | 307 | redirect |
| public | `/programs` | 307 | 307 | redirect |
| public | `/reset-password` | 307 | 307 | redirect |
| public | `/resources` | 307 | 307 | redirect |
| public | `/salary-guide` | 307 | 307 | redirect |
| public | `/setup-mfa` | 200 | 307 | redirect |
| public | `/terms` | 307 | 307 | redirect |
| public | `/verify-mfa` | 200 | 307 | redirect |
| public | `/what-we-do` | 307 | 307 | redirect |
| public | `/wioa-qualification` | 307 | 307 | redirect |

## Runtime/Desktop+Mobile Browser Verification
| Scope | Viewport | Route | Status | Final URL | Errors |
|---|---|---|---:|---|---|
| local | desktop | `/` | 200 | `http://127.0.0.1:3001/en` | Loading the script 'https://va.vercel-scripts.com/v1/script.debug.js' violates the following Content Security Policy directive: "script-src 'self' 'unsafe-inlin |
| local | desktop | `/programs` | 200 | `http://127.0.0.1:3001/en/programs` | none |
| local | desktop | `/apply` | 200 | `http://127.0.0.1:3001/en/apply` | Loading the script 'https://va.vercel-scripts.com/v1/script.debug.js' violates the following Content Security Policy directive: "script-src 'self' 'unsafe-inlin |
| local | desktop | `/how-it-works` | 200 | `http://127.0.0.1:3001/en/how-it-works` | Loading the script 'https://va.vercel-scripts.com/v1/script.debug.js' violates the following Content Security Policy directive: "script-src 'self' 'unsafe-inlin |
| local | desktop | `/contact` | 200 | `http://127.0.0.1:3001/en/contact` | none |
| local | desktop | `/login` | 200 | `http://127.0.0.1:3001/en/login` | Loading the script 'https://va.vercel-scripts.com/v1/script.debug.js' violates the following Content Security Policy directive: "script-src 'self' 'unsafe-inlin |
| local | desktop | `/dashboard` | 200 | `http://127.0.0.1:3001/en/login?redirectTo=%2Fdashboard` | Loading the script 'https://va.vercel-scripts.com/v1/script.debug.js' violates the following Content Security Policy directive: "script-src 'self' 'unsafe-inlin |
| local | desktop | `/counselor` | 200 | `http://127.0.0.1:3001/en/login?redirectTo=%2Fcounselor` | Loading the script 'https://va.vercel-scripts.com/v1/script.debug.js' violates the following Content Security Policy directive: "script-src 'self' 'unsafe-inlin |
| local | desktop | `/admin` | 200 | `http://127.0.0.1:3001/en/login?redirectTo=%2Fadmin` | Loading the script 'https://va.vercel-scripts.com/v1/script.debug.js' violates the following Content Security Policy directive: "script-src 'self' 'unsafe-inlin |
| local | desktop | `/employer` | 200 | `http://127.0.0.1:3001/en/login?redirectTo=%2Femployer` | Loading the script 'https://va.vercel-scripts.com/v1/script.debug.js' violates the following Content Security Policy directive: "script-src 'self' 'unsafe-inlin |
| local | desktop | `/partner` | 200 | `http://127.0.0.1:3001/en/login?redirectTo=%2Fpartner` | Loading the script 'https://va.vercel-scripts.com/v1/script.debug.js' violates the following Content Security Policy directive: "script-src 'self' 'unsafe-inlin |
| local | mobile | `/` | 200 | `http://127.0.0.1:3001/en` | Loading the script 'https://va.vercel-scripts.com/v1/script.debug.js' violates the following Content Security Policy directive: "script-src 'self' 'unsafe-inlin |
| local | mobile | `/programs` | 200 | `http://127.0.0.1:3001/en/programs` | A tree hydrated but some attributes of the server rendered HTML didn't match the client properties. This won't be patched up. This can happen if a SSR-ed Client |
| local | mobile | `/apply` | 200 | `http://127.0.0.1:3001/en/apply` | Loading the script 'https://va.vercel-scripts.com/v1/script.debug.js' violates the following Content Security Policy directive: "script-src 'self' 'unsafe-inlin |
| local | mobile | `/how-it-works` | 200 | `http://127.0.0.1:3001/en/how-it-works` | Loading the script 'https://va.vercel-scripts.com/v1/script.debug.js' violates the following Content Security Policy directive: "script-src 'self' 'unsafe-inlin |
| local | mobile | `/contact` | 200 | `http://127.0.0.1:3001/en/contact` | Loading the script 'https://va.vercel-scripts.com/v1/script.debug.js' violates the following Content Security Policy directive: "script-src 'self' 'unsafe-inlin |
| local | mobile | `/login` | 200 | `http://127.0.0.1:3001/en/login` | Loading the script 'https://va.vercel-scripts.com/v1/script.debug.js' violates the following Content Security Policy directive: "script-src 'self' 'unsafe-inlin |
| local | mobile | `/dashboard` | 200 | `http://127.0.0.1:3001/en/login?redirectTo=%2Fdashboard` | Loading the script 'https://va.vercel-scripts.com/v1/script.debug.js' violates the following Content Security Policy directive: "script-src 'self' 'unsafe-inlin |
| local | mobile | `/counselor` | 200 | `http://127.0.0.1:3001/en/login?redirectTo=%2Fcounselor` | Loading the script 'https://va.vercel-scripts.com/v1/script.debug.js' violates the following Content Security Policy directive: "script-src 'self' 'unsafe-inlin |
| local | mobile | `/admin` | 200 | `http://127.0.0.1:3001/en/login?redirectTo=%2Fadmin` | Loading the script 'https://va.vercel-scripts.com/v1/script.debug.js' violates the following Content Security Policy directive: "script-src 'self' 'unsafe-inlin |
| local | mobile | `/employer` | 200 | `http://127.0.0.1:3001/en/login?redirectTo=%2Femployer` | Loading the script 'https://va.vercel-scripts.com/v1/script.debug.js' violates the following Content Security Policy directive: "script-src 'self' 'unsafe-inlin |
| local | mobile | `/partner` | 200 | `http://127.0.0.1:3001/en/login?redirectTo=%2Fpartner` | Loading the script 'https://va.vercel-scripts.com/v1/script.debug.js' violates the following Content Security Policy directive: "script-src 'self' 'unsafe-inlin |

## Findings by Severity
- **P1** Runtime/browser errors on / (desktop) — Loading the script 'https://va.vercel-scripts.com/v1/script.debug.js' violates the following Content Security Policy directive: "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://www.googletagmanager.com https://va.vercel-insights.com https://challenges.cloudflare.com". Note that 'script-src-elem' was not explicitly set, so 'script-src' is used as a fallback. The action has been blocked. | Loading the script 'https://va.vercel-scripts.com/v1/speed-insights/script.debug.js' violates t
- **P1** Runtime/browser errors on /apply (desktop) — Loading the script 'https://va.vercel-scripts.com/v1/script.debug.js' violates the following Content Security Policy directive: "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://www.googletagmanager.com https://va.vercel-insights.com https://challenges.cloudflare.com". Note that 'script-src-elem' was not explicitly set, so 'script-src' is used as a fallback. The action has been blocked. | Loading the script 'https://va.vercel-scripts.com/v1/speed-insights/script.debug.js' violates t
- **P1** Runtime/browser errors on /how-it-works (desktop) — Loading the script 'https://va.vercel-scripts.com/v1/script.debug.js' violates the following Content Security Policy directive: "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://www.googletagmanager.com https://va.vercel-insights.com https://challenges.cloudflare.com". Note that 'script-src-elem' was not explicitly set, so 'script-src' is used as a fallback. The action has been blocked. | Loading the script 'https://va.vercel-scripts.com/v1/speed-insights/script.debug.js' violates t
- **P1** Runtime/browser errors on /login (desktop) — Loading the script 'https://va.vercel-scripts.com/v1/script.debug.js' violates the following Content Security Policy directive: "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://www.googletagmanager.com https://va.vercel-insights.com https://challenges.cloudflare.com". Note that 'script-src-elem' was not explicitly set, so 'script-src' is used as a fallback. The action has been blocked. | Loading the script 'https://va.vercel-scripts.com/v1/speed-insights/script.debug.js' violates t
- **P1** Runtime/browser errors on /dashboard (desktop) — Loading the script 'https://va.vercel-scripts.com/v1/script.debug.js' violates the following Content Security Policy directive: "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://www.googletagmanager.com https://va.vercel-insights.com https://challenges.cloudflare.com". Note that 'script-src-elem' was not explicitly set, so 'script-src' is used as a fallback. The action has been blocked. | Loading the script 'https://va.vercel-scripts.com/v1/speed-insights/script.debug.js' violates t
- **P1** Runtime/browser errors on /counselor (desktop) — Loading the script 'https://va.vercel-scripts.com/v1/script.debug.js' violates the following Content Security Policy directive: "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://www.googletagmanager.com https://va.vercel-insights.com https://challenges.cloudflare.com". Note that 'script-src-elem' was not explicitly set, so 'script-src' is used as a fallback. The action has been blocked. | Loading the script 'https://va.vercel-scripts.com/v1/speed-insights/script.debug.js' violates t
- **P1** Runtime/browser errors on /admin (desktop) — Loading the script 'https://va.vercel-scripts.com/v1/script.debug.js' violates the following Content Security Policy directive: "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://www.googletagmanager.com https://va.vercel-insights.com https://challenges.cloudflare.com". Note that 'script-src-elem' was not explicitly set, so 'script-src' is used as a fallback. The action has been blocked. | Loading the script 'https://va.vercel-scripts.com/v1/speed-insights/script.debug.js' violates t
- **P1** Runtime/browser errors on /employer (desktop) — Loading the script 'https://va.vercel-scripts.com/v1/script.debug.js' violates the following Content Security Policy directive: "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://www.googletagmanager.com https://va.vercel-insights.com https://challenges.cloudflare.com". Note that 'script-src-elem' was not explicitly set, so 'script-src' is used as a fallback. The action has been blocked. | Loading the script 'https://va.vercel-scripts.com/v1/speed-insights/script.debug.js' violates t
- **P1** Runtime/browser errors on /partner (desktop) — Loading the script 'https://va.vercel-scripts.com/v1/script.debug.js' violates the following Content Security Policy directive: "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://www.googletagmanager.com https://va.vercel-insights.com https://challenges.cloudflare.com". Note that 'script-src-elem' was not explicitly set, so 'script-src' is used as a fallback. The action has been blocked. | Loading the script 'https://va.vercel-scripts.com/v1/speed-insights/script.debug.js' violates t
- **P1** Runtime/browser errors on / (mobile) — Loading the script 'https://va.vercel-scripts.com/v1/script.debug.js' violates the following Content Security Policy directive: "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://www.googletagmanager.com https://va.vercel-insights.com https://challenges.cloudflare.com". Note that 'script-src-elem' was not explicitly set, so 'script-src' is used as a fallback. The action has been blocked. | Loading the script 'https://va.vercel-scripts.com/v1/speed-insights/script.debug.js' violates t
- **P1** Runtime/browser errors on /programs (mobile) — A tree hydrated but some attributes of the server rendered HTML didn't match the client properties. This won't be patched up. This can happen if a SSR-ed Client Component used:

- A server/client branch `if (typeof window !== 'undefined')`.
- Variable input such as `Date.now()` or `Math.random()` which changes each time it's called.
- Date formatting in a user's locale which doesn't match the server.
- External changing data without sending a snapshot of it along with the HTML.
- Invalid HTML ta
- **P1** Runtime/browser errors on /apply (mobile) — Loading the script 'https://va.vercel-scripts.com/v1/script.debug.js' violates the following Content Security Policy directive: "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://www.googletagmanager.com https://va.vercel-insights.com https://challenges.cloudflare.com". Note that 'script-src-elem' was not explicitly set, so 'script-src' is used as a fallback. The action has been blocked. | Loading the script 'https://va.vercel-scripts.com/v1/speed-insights/script.debug.js' violates t
- **P1** Runtime/browser errors on /how-it-works (mobile) — Loading the script 'https://va.vercel-scripts.com/v1/script.debug.js' violates the following Content Security Policy directive: "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://www.googletagmanager.com https://va.vercel-insights.com https://challenges.cloudflare.com". Note that 'script-src-elem' was not explicitly set, so 'script-src' is used as a fallback. The action has been blocked. | Loading the script 'https://va.vercel-scripts.com/v1/speed-insights/script.debug.js' violates t
- **P1** Runtime/browser errors on /contact (mobile) — Loading the script 'https://va.vercel-scripts.com/v1/script.debug.js' violates the following Content Security Policy directive: "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://www.googletagmanager.com https://va.vercel-insights.com https://challenges.cloudflare.com". Note that 'script-src-elem' was not explicitly set, so 'script-src' is used as a fallback. The action has been blocked. | Loading the script 'https://va.vercel-scripts.com/v1/speed-insights/script.debug.js' violates t
- **P1** Runtime/browser errors on /login (mobile) — Loading the script 'https://va.vercel-scripts.com/v1/script.debug.js' violates the following Content Security Policy directive: "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://www.googletagmanager.com https://va.vercel-insights.com https://challenges.cloudflare.com". Note that 'script-src-elem' was not explicitly set, so 'script-src' is used as a fallback. The action has been blocked. | Loading the script 'https://va.vercel-scripts.com/v1/speed-insights/script.debug.js' violates t
- **P1** Runtime/browser errors on /dashboard (mobile) — Loading the script 'https://va.vercel-scripts.com/v1/script.debug.js' violates the following Content Security Policy directive: "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://www.googletagmanager.com https://va.vercel-insights.com https://challenges.cloudflare.com". Note that 'script-src-elem' was not explicitly set, so 'script-src' is used as a fallback. The action has been blocked. | Loading the script 'https://va.vercel-scripts.com/v1/speed-insights/script.debug.js' violates t
- **P1** Runtime/browser errors on /counselor (mobile) — Loading the script 'https://va.vercel-scripts.com/v1/script.debug.js' violates the following Content Security Policy directive: "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://www.googletagmanager.com https://va.vercel-insights.com https://challenges.cloudflare.com". Note that 'script-src-elem' was not explicitly set, so 'script-src' is used as a fallback. The action has been blocked. | Loading the script 'https://va.vercel-scripts.com/v1/speed-insights/script.debug.js' violates t
- **P1** Runtime/browser errors on /admin (mobile) — Loading the script 'https://va.vercel-scripts.com/v1/script.debug.js' violates the following Content Security Policy directive: "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://www.googletagmanager.com https://va.vercel-insights.com https://challenges.cloudflare.com". Note that 'script-src-elem' was not explicitly set, so 'script-src' is used as a fallback. The action has been blocked. | Loading the script 'https://va.vercel-scripts.com/v1/speed-insights/script.debug.js' violates t
- **P1** Runtime/browser errors on /employer (mobile) — Loading the script 'https://va.vercel-scripts.com/v1/script.debug.js' violates the following Content Security Policy directive: "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://www.googletagmanager.com https://va.vercel-insights.com https://challenges.cloudflare.com". Note that 'script-src-elem' was not explicitly set, so 'script-src' is used as a fallback. The action has been blocked. | Loading the script 'https://va.vercel-scripts.com/v1/speed-insights/script.debug.js' violates t
- **P1** Runtime/browser errors on /partner (mobile) — Loading the script 'https://va.vercel-scripts.com/v1/script.debug.js' violates the following Content Security Policy directive: "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://www.googletagmanager.com https://va.vercel-insights.com https://challenges.cloudflare.com". Note that 'script-src-elem' was not explicitly set, so 'script-src' is used as a fallback. The action has been blocked. | Loading the script 'https://va.vercel-scripts.com/v1/speed-insights/script.debug.js' violates t

## Residual Risks
- Authenticated role-specific action testing requires seeded credentials/sessions for member, counselor, admin, partner, and employer.
- Dynamic routes with required IDs/slugs are excluded from unauthenticated automation unless fixtures are supplied.