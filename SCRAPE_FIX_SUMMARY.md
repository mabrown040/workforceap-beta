# Job Scrape Hardening - Root Cause Analysis

## Problems Identified

1. **Weak content validation**: `fetchPageText()` only checked if text length > 200 chars, which doesn't detect:
   - Cookie walls / consent banners
   - JavaScript shell content ("Loading...", "Please enable JavaScript")
   - Cloudflare/anti-bot blocks
   - Login gates
   - Generic error pages

2. **Poor error messages**: When scraping failed, users got generic "Could not extract job description" without knowing WHY (cookie wall vs JS-rendered vs blocked)

3. **No content quality checks**: The code didn't verify that scraped content actually looks like a job posting

4. **Return type was primitive**: `fetchPageText()` returned `string | null` which loses error context

## Changes Made

### 1. Added Content Quality Detection (`lib/ai/atsProviders.ts`)
- `isJunkContent()`: Detects cookie walls, anti-bot pages, login gates, error pages
- `hasJobContentIndicators()`: Verifies content has job-specific keywords (responsibilities, qualifications, etc.)
- `checkContentQuality()`: Returns detailed quality assessment with reason

### 2. Changed Return Types
- `fetchPageText()` now returns `{ text: string; source: 'direct' | 'firecrawl' } | { text: null; reason: string }`
- `fetchSubJobPageText()` uses same pattern
- Callers can now provide specific error messages to users

### 3. Updated Route Handler (`app/api/ai/job-match-scorer/route.ts`)
- Now handles the new return type
- Returns specific error reasons to frontend instead of generic messages
- Better logging of scrape failures

### 4. Updated All Callers
- `import-bulk/route.ts`: Updated `parseSingleJobUrl()`
- `import/route.ts`: Updated `parseDirectJobUrl()`
- `jobImportBulk.ts`: Updated sub-job fetching
- `verify-rippling-bulk-import.ts`: Updated test mocks

## Validation
- TypeScript typecheck passes
- Next.js build succeeds
- All callers updated for new return type

## Remaining Limitations
1. **LinkedIn**: Still blocked (anti-bot protection requires special handling)
2. **Workday/iCIMS**: Requires Firecrawl (JS-rendered) - if Firecrawl not configured or rate-limited, will fail
3. **Some job boards**: May still block based on IP/rate limiting
4. **Cookie walls**: Some EU sites show consent walls that Firecrawl may not bypass

## Files Changed
- `lib/ai/atsProviders.ts` - Added content quality detection, hardened fetch functions
- `app/api/ai/job-match-scorer/route.ts` - Updated to use new return type
- `app/api/employer/jobs/import-bulk/route.ts` - Updated caller
- `app/api/employer/jobs/import/route.ts` - Updated caller
- `lib/employer/jobImportBulk.ts` - Updated caller
- `scripts/verify-rippling-bulk-import.ts` - Updated test mocks
