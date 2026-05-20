# Google Ads — 2026 Launch (pre-staged configs)

Pre-built campaign artifacts for **manual import** into [Google Ads Editor](https://ads.google.com/home/tools/ads-editor/) or the Google Ads web UI. No API integration — review here, paste on approval day.

All campaigns ship **PAUSED** so nothing spends until Mike flips them live.

## Contents

| File | Purpose |
|------|---------|
| `campaigns.csv` | 5 Search campaigns, budgets, geo, `TARGET_CPA` $15, status |
| `adgroups.csv` | 15 ad groups (3 per campaign), 90 keywords (broad / phrase / exact) |
| `ads.csv` | 45 responsive search ads (3 per ad group), 15 headlines + 4 descriptions each |
| `extensions.json` | Account-level sitelinks, callouts, structured snippets (+ optional call) |

## Campaign summary

| Campaign | Daily budget | Location | Bidding |
|----------|-------------|----------|---------|
| free IT certification Austin | $35 | Austin, TX | Target CPA $15 |
| career change tech training | $40 | Texas | Target CPA $15 |
| Google IT certificate free | $35 | United States | Target CPA $15 |
| WIOA training Texas | $45 | Texas | Target CPA $15 |
| no cost coding bootcamp Austin | $35 | Austin, TX | Target CPA $15 |

## Paste-into-Google-Ads-Editor walkthrough

### Prerequisites

1. Install [Google Ads Editor](https://ads.google.com/home/tools/ads-editor/) (desktop).
2. Sign in to the WorkforceAP Google Ads account.
3. **Download recent changes** from the account (Account → Get recent changes) so Editor has a fresh copy.

### Step 1 — Import campaigns

1. In Editor: **Account → Import → From file**.
2. Select `campaigns.csv`.
3. Map columns if prompted:
   - `campaign_name` → Campaign
   - `budget_daily_usd` → Daily budget
   - `location` → Location (verify geo targets match intent)
   - `language` → Language
   - `network` → Networks (Search only)
   - `bidding_strategy` → Bidding (`TARGET_CPA:15` → Target CPA, $15)
   - `status` → Campaign status (`PAUSED`)
4. Preview → **Post** (or keep local until approval day).

> **Note:** Editor may require a linked conversion action before Target CPA goes live. Confirm the primary apply/conversion action exists in the account first.

### Step 2 — Import ad groups & keywords

1. **Import → From file** → `adgroups.csv`.
2. Map:
   - `campaign_name`, `ad_group_name`, `keyword`, `match_type`, `status`
3. Verify match types: `BROAD`, `PHRASE`, `EXACT` (Editor sometimes labels Phrase/Exact with brackets in the UI after import).
4. Post. All ad groups and keywords remain **PAUSED** until campaigns go live.

### Step 3 — Import responsive search ads

1. **Import → From file** → `ads.csv`.
2. Map headline columns `headline_1` … `headline_15` and description columns `description_1` … `description_4`.
3. Map `final_url` → Final URL. URLs include UTM parameters:
   - `utm_source=google_ads`
   - `utm_campaign={url-encoded campaign name}`
   - `utm_term={url-encoded representative keyword}`
4. Optional: replace static `utm_term` values with ValueTrack `{keyword}` in Editor for per-click keyword tracking:
   ```
   https://workforceap.org/apply?utm_source=google_ads&utm_campaign={campaign}&utm_term={keyword}
   ```
   (Use `{campaign}` / `{keyword}` ValueTrack parameters supported by Google Ads.)
5. `path_1` / `path_2` are set to `Apply` / `Free` where supported.
6. Post and run **Check changes** for policy or character-limit warnings (headlines ≤ 30 chars, descriptions ≤ 90).

### Step 4 — Add extensions (manual)

`extensions.json` is a reference spec — Editor does not import this JSON directly.

1. **Account-level extensions** (recommended so all 5 campaigns inherit):
   - **Ads & assets → Sitelinks** — add the four sitelinks from `extensions.json` (Apply, Programs, Employer Page, Outcomes).
   - **Callouts** — add: `Free`, `WIOA-funded`, `850+ Placed`, plus the extras listed in the file.
   - **Structured snippets** — Programs, Services, Types headers with the value lists in the file.
2. Optionally enable **Call** extension `(512) 777-1808` if phone leads are a goal.
3. Associate extensions with all launch campaigns (or account-default).

### Step 5 — Pre-launch checklist (approval day)

- [ ] Conversion tracking fires on `https://workforceap.org/apply` (GA4 / Google tag).
- [ ] Target CPA $15 is acceptable vs. historical CPA (adjust in UI if needed).
- [ ] Geo targets match funding/eligibility (Austin vs. Texas vs. US).
- [ ] Negative keyword lists added at account/campaign level (not in this bundle — add separately).
- [ ] Billing & daily budgets confirmed.
- [ ] Change campaign + ad group status from **Paused** → **Enabled** when ready.
- [ ] Post changes from Editor → **Account → Post**.

## UTM convention

| Parameter | Value |
|-----------|--------|
| `utm_source` | `google_ads` |
| `utm_campaign` | URL-encoded campaign name (underscores for spaces in CSV exports) |
| `utm_term` | Representative keyword per ad group (or `{keyword}` ValueTrack live) |

Sitelink URLs in `extensions.json` use `utm_medium=extension` and `utm_content=sitelink_*` for extension-level reporting.

## Editing locally

Re-run the generator logic by editing `campaigns.csv` / re-exporting from this folder. To regenerate `adgroups.csv` and `ads.csv` from source, keep campaign/ad-group definitions in sync — the committed CSVs are the source of truth for import.

## What this does **not** include

- Google Ads API automation
- Negative keywords, audience lists, or remarketing
- Performance Max / Display / YouTube
- Automated rules or budget scripts

Add those in the Google Ads UI after the Search launch is stable.
