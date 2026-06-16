---
title: ElevenLabs + Vercel WorkforceAP Migration Implementation Plan
type: note
date: "2026-04-30"
---

# ElevenLabs + Vercel WorkforceAP Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrate WorkforceAP’s ElevenLabs setup into the new WorkforceAP-owned account without breaking any Vercel-backed voice flows, while preserving a verifiable old→new ID map for agents, voices, prompts, patches, and env vars.

**Architecture:** Treat this as an identity-reconciliation migration, not a blind rebuild. First export and freeze the current state from the old ElevenLabs account and Vercel config, then create a canonical migration map, then rebuild assets in the new account, then switch Vercel/runtime references only after parity checks pass. Keep personal and WorkforceAP accounts separate the whole time.

**Tech Stack:** Next.js 15, Vercel, ElevenLabs ConvAI + TTS APIs, Composio, Node scripts, pnpm, Playwright, Node test runner.

---

### Task 1: Inventory current repo integration surface

**Files:**
- Modify: `docs/plans/2026-04-30-elevenlabs-vercel-workforceap-migration.md`
- Review: `lib/ai/elevenlabsAgents.ts`
- Review: `lib/ai/elevenlabs.ts`
- Review: `lib/ai/elevenlabsPortalContext.ts`
- Review: `lib/portal/counselorVoice.ts`
- Review: `lib/portal/interviewVoice.ts`
- Review: `app/api/interview/session/route.ts`
- Review: `app/api/member/voice-interview/session/route.ts`
- Review: `app/api/member/readiness/voice-session/route.ts`
- Review: `app/api/member/wioa-qualification/voice-session/route.ts`
- Review: `app/api/member/career-business-coach/voice-session/route.ts`
- Review: `app/api/member/resume-coach/session/route.ts`
- Review: `app/api/counselor/session/route.ts`
- Review: `app/api/employer/voice-session/route.ts`
- Review: `app/api/partner/voice-session/route.ts`
- Review: `app/api/public/wioa-qualification/voice-session/route.ts`
- Review: `scripts/elevenlabs/apply-agent-patches.mjs`
- Review: `scripts/elevenlabs/patches/*.json`
- Review: `.env.example`
- Review: `vercel.json`

**Step 1: Record all current integration points**

Capture these current bindings in working notes:
- agent env vars from `lib/ai/elevenlabsAgents.ts`
- TTS voice env vars from `lib/portal/counselorVoice.ts` and `lib/portal/interviewVoice.ts`
- direct API dependency on `ELEVENLABS_API_KEY` from `lib/ai/elevenlabs.ts`
- every route that calls `startElevenLabsPortalSession(...)`
- existing patch files in `scripts/elevenlabs/patches/`

**Step 2: Confirm the current agent key matrix**

Expected keys:
- `ELEVENLABS_INTERVIEW_AGENT_ID`
- `ELEVENLABS_COUNSELOR_AGENT_ID`
- `ELEVENLABS_EMPLOYER_AGENT_ID`
- `ELEVENLABS_READINESS_AGENT_ID`
- `ELEVENLABS_RESUME_COACH_AGENT_ID`
- `ELEVENLABS_PARTNER_AGENT_ID`
- `ELEVENLABS_WIOA_PREQUAL_AGENT_ID`
- `ELEVENLABS_CAREER_BUSINESS_AGENT_ID`

**Step 3: Confirm the current voice key matrix**

Expected keys:
- `NEXT_PUBLIC_ELEVENLABS_WIOA_VOICE_ID`
- `NEXT_PUBLIC_ELEVENLABS_COUNSELOR_VOICE_ID`
- `NEXT_PUBLIC_ELEVENLABS_INTERVIEWER_FEMALE_VOICE_ID`
- `NEXT_PUBLIC_ELEVENLABS_INTERVIEWER_MALE_VOICE_ID`

**Step 4: Verify patch coverage**

Run:
```bash
cd /home/claw/.openclaw/agents/main/workforceap-beta
find scripts/elevenlabs/patches -maxdepth 1 -type f -name 'agent_*.patch.json' | sort
```

Expected: one patch file per agent that requires prompt/config overrides.

**Step 5: Commit notes only if any repo docs were updated**

```bash
git add docs/plans/2026-04-30-elevenlabs-vercel-workforceap-migration.md
git commit -m "docs: add elevenlabs vercel migration plan"
```

### Task 2: Export old-account state and freeze a source-of-truth snapshot

**Files:**
- Create: `scripts/elevenlabs/export-account-state.mjs`
- Create: `scripts/elevenlabs/state/old-account-YYYYMMDD.json`
- Create: `scripts/elevenlabs/state/old-account-summary-YYYYMMDD.md`
- Test: `scripts/elevenlabs/export-account-state.mjs`

**Step 1: Write a read-only export script**

Create `scripts/elevenlabs/export-account-state.mjs` that calls the old/personal ElevenLabs API and exports:
- agents
- voices
- knowledge base objects if exposed
- tools
- secrets metadata (names only, never secret values)
- phone numbers / telephony bindings if exposed
- workspace/webhook metadata if exposed

The script must:
- read `ELEVENLABS_API_KEY` from env
- never print secret values
- write a timestamped JSON snapshot to `scripts/elevenlabs/state/`

**Step 2: Run the export against the current/personal account**

Run:
```bash
cd /home/claw/.openclaw/agents/main/workforceap-beta
ELEVENLABS_API_KEY=... node scripts/elevenlabs/export-account-state.mjs
```

Expected: a machine-readable JSON snapshot of the source account.

**Step 3: Create a human summary**

Write `scripts/elevenlabs/state/old-account-summary-YYYYMMDD.md` with:
- agent names + IDs
- voice names + IDs
- which assets are clearly WorkforceAP
- which assets are clearly personal and must not migrate
- missing metadata / unclear ownership

**Step 4: Freeze the source snapshot before rebuilding anything**

Do not create or patch assets in the new account until the export exists and is reviewed.

**Step 5: Commit the script, not the live snapshot if it contains sensitive metadata**

```bash
git add scripts/elevenlabs/export-account-state.mjs
git commit -m "chore: add elevenlabs account export script"
```

### Task 3: Export Vercel runtime configuration and app references

**Files:**
- Create: `docs/operations/vercel-elevenlabs-env-audit-YYYYMMDD.md`
- Review: `.env.example`
- Review: `.env.local`
- Review: `vercel.json`
- Review: all files listed in Task 1 route inventory

**Step 1: Export Vercel env names by environment**

Using Vercel CLI or dashboard, record for Preview and Production:
- whether `ELEVENLABS_API_KEY` is set
- all `ELEVENLABS_*_AGENT_ID` values
- all `NEXT_PUBLIC_ELEVENLABS_*_VOICE_ID` values
- any additional hidden env vars containing old account IDs

**Step 2: Capture app-side code references**

Run:
```bash
cd /home/claw/.openclaw/agents/main/workforceap-beta
grep -RIn --exclude-dir=node_modules --exclude-dir=.next --exclude='*.lock' -E 'ELEVENLABS_|elevenlabs|agentId|voiceId|convai' app lib scripts
```

Expected: complete list of repo locations that reference ElevenLabs runtime IDs or APIs.

**Step 3: Write the audit doc**

For each env var, record:
- env var name
- current source account value
- environment(s) where it exists
- code path(s) using it
- whether it must be replaced during cutover

**Step 4: Mark risky fallback behavior**

Specifically flag `lib/ai/elevenlabsAgents.ts` fallback IDs as cutover risk because silent fallbacks can mask broken env setup.

**Step 5: No cutover yet**

Do not change Vercel env vars in this task.

### Task 4: Build the canonical ID mapping manifest

**Files:**
- Create: `scripts/elevenlabs/state/workforce-migration-map.json`
- Create: `scripts/elevenlabs/state/workforce-migration-checklist.md`
- Test: `scripts/elevenlabs/state/workforce-migration-map.json`

**Step 1: Create the mapping schema**

The JSON manifest must track at minimum:
```json
{
  "agents": [
    {
      "key": "interview",
      "old_id": "agent_...",
      "new_id": "",
      "patch_file": "scripts/elevenlabs/patches/agent_....patch.json",
      "routes": ["app/api/interview/session/route.ts"]
    }
  ],
  "voices": [],
  "tools": [],
  "knowledge_base": [],
  "secrets": [],
  "phone_numbers": [],
  "vercel_env": []
}
```

**Step 2: Populate old IDs first**

Do not guess new IDs. Fill the manifest with current old IDs and repo references only.

**Step 3: Link every runtime ID to exact code locations**

At minimum include these route groups:
- interview
- readiness
- wioa_prequal
- counselor
- employer
- partner
- resume_coach
- career_business

**Step 4: Add Vercel env linkage**

Each mapped object must list which env var gets updated during cutover.

**Step 5: Add a human checklist**

`workforce-migration-checklist.md` should mirror the manifest in readable form for live cutover use.

### Task 5: Prepare the repo for safe cutover

**Files:**
- Modify: `.env.example`
- Modify: `lib/ai/elevenlabsAgents.ts`
- Create: `lib/ai/elevenlabsAgents.test.ts`
- Create: `docs/operations/elevenlabs-cutover-runbook.md`
- Test: `lib/ai/elevenlabsAgents.test.ts`

**Step 1: Add missing env vars to `.env.example`**

Ensure `.env.example` explicitly includes all agent keys used in code, including:
- `ELEVENLABS_WIOA_PREQUAL_AGENT_ID`
- `ELEVENLABS_CAREER_BUSINESS_AGENT_ID`

Right now code references those keys; the template must not omit them.

**Step 2: Decide fallback policy**

Preferred path: remove hardcoded production fallback agent IDs from `lib/ai/elevenlabsAgents.ts` for production safety, or gate them behind a local-dev-only condition.

**Step 3: Add unit tests for env resolution**

Create `lib/ai/elevenlabsAgents.test.ts` covering:
- env var wins when present
- local fallback only works when intentionally allowed
- missing required agent ID fails loudly
- `envKeyForPortalAgent(...)` returns expected keys

**Step 4: Run the unit test**

Run:
```bash
cd /home/claw/.openclaw/agents/main/workforceap-beta
pnpm test:unit lib/ai/elevenlabsAgents.test.ts
```

Expected: PASS

**Step 5: Commit the safety hardening**

```bash
git add .env.example lib/ai/elevenlabsAgents.ts lib/ai/elevenlabsAgents.test.ts docs/operations/elevenlabs-cutover-runbook.md
git commit -m "chore: harden elevenlabs env mapping for migration"
```

### Task 6: Recreate WorkforceAP assets in the new ElevenLabs account

**Files:**
- Modify: `scripts/elevenlabs/state/workforce-migration-map.json`
- Modify: `scripts/elevenlabs/state/workforce-migration-checklist.md`
- Modify: `scripts/elevenlabs/patches/*.json` (only if prompt payloads must change)
- Test: new-account assets via Composio and/or direct API

**Step 1: Create the new WorkforceAP agents**

Use Composio when it speeds up creation, but use direct API whenever exact config fidelity matters.

Create new account versions of:
- interview
- counselor
- employer
- readiness
- resume coach
- partner
- wioa prequal
- career business

**Step 2: Recreate dependent assets**

Recreate or relink:
- voices
- KB docs / folders / URLs
- tools
- secrets
- outbound numbers / telephony bindings
- webhooks if present

**Step 3: Patch agent prompts/configs**

Apply patch files after new agent IDs exist.

If patch filenames are ID-bound, either:
- duplicate them with new `agent_<newid>.patch.json` names, or
- improve `scripts/elevenlabs/apply-agent-patches.mjs` to accept a mapping manifest instead of relying on filenames alone.

**Step 4: Write back new IDs into the migration map**

Populate `new_id` fields only after creation succeeds.

**Step 5: Verify parity before app cutover**

For each new agent, verify:
- agent exists
- session can be created
- prompt/first message is correct
- required tools/KB/secrets exist
- voice references are valid

### Task 7: Cut Vercel to the new IDs safely

**Files:**
- Modify: Vercel Preview env vars
- Modify: Vercel Production env vars
- Review: `vercel.json`
- Review: `docs/operations/elevenlabs-cutover-runbook.md`

**Step 1: Update Preview first**

Set new WorkforceAP values for:
- `ELEVENLABS_API_KEY`
- all `ELEVENLABS_*_AGENT_ID` vars
- all `NEXT_PUBLIC_ELEVENLABS_*_VOICE_ID` vars that changed

**Step 2: Redeploy Preview**

Run the normal preview deploy path and wait for the deployment URL to be live.

**Step 3: Smoke test every voice surface in Preview**

Exercise these endpoints/surfaces:
- `/api/interview/session`
- `/api/member/voice-interview/session`
- `/api/member/readiness/voice-session`
- `/api/member/wioa-qualification/voice-session`
- `/api/member/career-business-coach/voice-session`
- `/api/member/resume-coach/session`
- `/api/counselor/session`
- `/api/employer/voice-session`
- `/api/partner/voice-session`
- `/api/public/wioa-qualification/voice-session`

Expected: signed URLs return successfully and use the new mapped agent IDs.

**Step 4: Promote to Production only after Preview passes**

Repeat the env update in Production.

**Step 5: Record the exact cutover time**

Update `workforce-migration-checklist.md` with the final cutover timestamp and operator initials.

### Task 8: Validate from the user’s point of view

**Files:**
- Modify: `tests/e2e/prod-portal-smoke.spec.ts`
- Create: `tests/e2e/elevenlabs-voice-smoke.spec.ts`
- Test: `tests/e2e/elevenlabs-voice-smoke.spec.ts`
- Test: `pnpm build`

**Step 1: Add an E2E smoke covering at least one signed-session path**

Create a minimal Playwright test that verifies the app can obtain a signed session response for a valid authenticated flow.

**Step 2: Run unit + build gates**

Run:
```bash
cd /home/claw/.openclaw/agents/main/workforceap-beta
pnpm test:unit
pnpm build
```

Expected: PASS

**Step 3: Run targeted E2E smoke**

Run:
```bash
cd /home/claw/.openclaw/agents/main/workforceap-beta
pnpm exec playwright test tests/e2e/elevenlabs-voice-smoke.spec.ts
```

Expected: PASS

**Step 4: Verify no old IDs remain in repo-managed references**

Run:
```bash
cd /home/claw/.openclaw/agents/main/workforceap-beta
grep -RIn --exclude-dir=node_modules --exclude-dir=.next --exclude='*.lock' 'agent_' app lib scripts .env.example
```

Expected: only approved fallback-free references remain, or only IDs inside migration artifacts.

**Step 5: Commit the final migration state**

```bash
git add docs/operations scripts/elevenlabs .env.example lib/ai tests/e2e
git commit -m "feat: migrate workforceap elevenlabs and vercel bindings"
```

### Task 9: Post-cutover cleanup and rollback readiness

**Files:**
- Modify: `docs/operations/elevenlabs-cutover-runbook.md`
- Modify: `scripts/elevenlabs/state/workforce-migration-checklist.md`
- Create: `scripts/elevenlabs/state/rollback-map.json`

**Step 1: Create a rollback map**

Record the old personal-account IDs and previous Vercel env values in a secure rollback artifact.

**Step 2: Remove stale initiated/test assets if safe**

Delete only confirmed duplicate or temporary assets from the new WorkforceAP account after cutover stability is confirmed.

**Step 3: Confirm ownership boundaries**

Mark all surviving WorkforceAP assets as Workforce-owned. Personal-only assets stay out of the app.

**Step 4: Document final ownership**

Update the runbook with:
- which account owns production
- where API keys live
- who can rotate them
- which assets are canonical

**Step 5: Final verification**

Run one final preview/prod smoke check and confirm no route is silently relying on removed fallbacks.

---

## Migration-specific warnings

- `lib/ai/elevenlabsAgents.ts` currently contains hardcoded fallback agent IDs. That is convenient for dev and dangerous for migration. Treat this as a real cutover risk.
- `.env.example` currently documents some agent env vars but does not fully reflect the code-level matrix.
- `scripts/elevenlabs/patches/*.json` are named by agent ID, so migration changes the filename contract unless the patch runner is upgraded.
- Vercel env updates must happen in Preview before Production. No cowboy cutover.
- Never commit live API keys or secret values into repo artifacts.

## Definition of done

Migration is done only when all of these are true:
1. WorkforceAP production uses the new WorkforceAP-owned ElevenLabs account.
2. Every agent/voice/env reference has an old→new mapping artifact.
3. Preview and Production both pass signed-session smoke tests.
4. No route depends on stale hardcoded agent IDs.
5. Rollback instructions exist and have been reviewed.
