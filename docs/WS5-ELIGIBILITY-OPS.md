# Website Adjustments WS5 — Eligibility ops & datasheet

**Branch:** `cursor/apply-eligibility-ops-datasheet-942e`  
**Depends on:** WS4 eligibility fields on `ApplyEligibilityScreening` (already on master).

## Mike gate (decided for this build)

| Decision | Outcome |
|---|---|
| Sept 14 “stay as member” | **Soft reminder only** — copy asks members to complete by Sept 14 to keep membership current. **No hard lockout / account disable** if they miss the date. |
| Datasheet | **In-admin table + CSV export** (not Google Sheet sync). Member Training Report also gained the WS4 columns. |
| Audience for campaign | Existing members **excluding CHS** via `lib/partners/chsPartner.ts` (`excludeChsPartnerReferralsWhere` / slug `concordia` + referral `chs2026`). |
| Emails | Extend existing Resend / `lib/email` apply confirmation + admin alert paths. No second mail stack. |

## What shipped

1. **Confirmation emails** — applicant + Mike/admin (`info@workforceap.org`) when adult eligibility is submitted on apply signup, `/api/member/eligibility`, or `/api/q/[token]/submit`. Bodies include unemployment triad, layoff company, SNAP/WIC, hear-about, ambassador.
2. **Datasheet** — `/admin/exports?ui=legacy#eligibility-datasheet` preview table + `GET /api/admin/export/eligibility` CSV; members export includes the same columns.
3. **Non-CHS campaign** — `POST /api/admin/members/send-eligibility-campaign` (UI on exports page) and `scripts/send-eligibility-campaign.ts`. Reuses `sendEligibilityLink` with soft-deadline copy.

## How to run the campaign

**Preferred (admin UI):** `/admin/exports?ui=legacy` → Eligibility screening datasheet → dry-run preview, then send (max 100/request, bulk-email rate limit).

**API:**
```bash
# Dry run
curl -X POST https://<host>/api/admin/members/send-eligibility-campaign \
  -H 'Content-Type: application/json' -H 'Cookie: …' \
  -d '{"dryRun":true,"missingScreeningOnly":true,"limit":100}'

# Send
curl -X POST https://<host>/api/admin/members/send-eligibility-campaign \
  -H 'Content-Type: application/json' -H 'Cookie: …' \
  -d '{"dryRun":false,"missingScreeningOnly":true,"limit":100}'
```

**Script (ops shell with DB + Resend):**
```bash
node --import tsx scripts/send-eligibility-campaign.ts --dry-run
node --import tsx scripts/send-eligibility-campaign.ts --limit 100
# Include already-screened members:
node --import tsx scripts/send-eligibility-campaign.ts --all --limit 50
```

## Residual for Mike

- Confirm Sept 14 soft-reminder wording in production before the blast.
- Decide whether a second wave after Sept 14 is reminder-only again (still no lockout).
- CHS stays out of this campaign by design; school path already skips adult WS4 fields.
- Google Sheet sync remains out of scope unless reopened.
