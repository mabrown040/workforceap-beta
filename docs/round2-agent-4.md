You are an i18n engineer for WorkforceAP. Spanish-speaking members are a significant portion of our user base. The portal must feel native in Spanish.

Your task: Complete the Spanish i18n sweep for remaining untranslated portal surfaces. Create a single PR.

## Issues to fix (from global voice audit)

1. **Employer portal i18n** — `app/(portal)/employer/` pages have hardcoded English strings:
   - `employer/page.tsx`: "Talent Pipeline", "Post a role", "Matched candidates"
   - `employer/jobs/page.tsx`: "Active postings", "Drafts", "Closed"
   - `employer/applications/page.tsx`: "Applications", "Filter by status"
   - `employer/candidates/[studentId]/page.tsx`: "Candidate snapshot", "Roles in pipeline", "AI matches"
   - Add `employer` namespace to `messages/en.json` and `messages/es.json`. Replace all hardcoded strings with `t()` calls.

2. **Partner portal i18n** — `app/(portal)/partner/` pages have hardcoded English:
   - `partner/page.tsx`: "Members referred", "Pipeline overview", "Certificates"
   - `partner/guide/page.tsx`: "How it works", "Step 1", "Step 2"
   - `partner/referred-members/page.tsx`: "Referred members", "Filter"
   - Add `partner` namespace to both JSON files.

3. **Counselor portal i18n** — `app/(portal)/counselor/` and `app/(portal)/dashboard/messages/`:
   - "Message queue", "Unread", "Mark as read"
   - Add `counselor` and `messages` namespaces.

4. **Fix translation quality issues** — In `messages/es.json`:
   - `footer.workforceBoards`: "Junta de workforce" → "Juntas de trabajo locales"
   - `dashboard.toolCountTogether`: "cosa/cosas" → "recurso(s)"
   - `apply.referral.capitalArea`: keep English or translate to "Área de la capital"
   - Audit any remaining literal translations that sound robotic

5. **Dashboard SR-only English** — `app/(portal)/dashboard/page.tsx` has `<h1 className="wa-sr-only">Welcome to WorkforceAP...</h1>`. Move to `messages/dashboard.srOnlyWelcome` in both languages.

6. **Program content** — Program titles and categories ("Technology", "Construction") come from config, not messages. For now, add a `programs` namespace with display names in both languages so pages can use `t('programs.technology')` etc.

## Rules
- One PR, one concern: i18n sweep
- Update BOTH `messages/en.json` AND `messages/es.json` for every key
- Don't change logic or auth — only string extraction and JSON updates
- Build must pass
- Use existing `getTranslations` / `useTranslations` patterns from `learningHub` and `training` namespaces
- PR title: "fix(i18n): complete spanish translations for employer, partner, counselor portals"
