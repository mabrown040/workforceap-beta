import {
  extractSubJobUrlsFromPageText,
  parseJobListingsFromPageText,
  sanitizeScrapedJobText,
} from '../lib/ai/parseJob';
import { extractMeaningfulPageText } from '../lib/ai/atsProviders';
import { collectDraftInputsFromPageText } from '../lib/employer/jobImportBulk';

async function main() {
  const fixture = `### Current Openings

[Customer Success Manager, Mid-Market](https://ats.rippling.com/closinglock/jobs/d2b5d49f-f2a8-4c92-9405-a05769ce81fe)
Customer Success
Austin, TX
[View job](https://ats.rippling.com/closinglock/jobs/d2b5d49f-f2a8-4c92-9405-a05769ce81fe)

[Customer Support Representative](https://ats.rippling.com/closinglock/jobs/8ec12dbb-ae32-4d98-b8b7-5f8bb8256594)
Customer Success
Austin, TX
[View job](https://ats.rippling.com/closinglock/jobs/8ec12dbb-ae32-4d98-b8b7-5f8bb8256594)

[Manager, Customer Success (Mid-Market and Enterprise)](https://ats.rippling.com/closinglock/jobs/99b24a99-d83b-4652-9539-ff5ed3de2ff1)
Customer Success
Austin, TX
[View job](https://ats.rippling.com/closinglock/jobs/99b24a99-d83b-4652-9539-ff5ed3de2ff1)

[Business Operations Associate](https://ats.rippling.com/closinglock/jobs/f7b63e61-31ef-4f36-8199-e867230c7228)
General & Administrative
Austin, TX
[View job](https://ats.rippling.com/closinglock/jobs/f7b63e61-31ef-4f36-8199-e867230c7228)

[Head of People](https://ats.rippling.com/closinglock/jobs/e7a4e3b3-47f3-4ced-9e2d-69a60bade8bf)
General & Administrative
Austin, TX
[View job](https://ats.rippling.com/closinglock/jobs/e7a4e3b3-47f3-4ced-9e2d-69a60bade8bf)

[Head of Revenue Operations](https://ats.rippling.com/closinglock/jobs/36b4667b-4eea-4fc0-9ac7-70ac12e49885)
General & Administrative
Austin, TX
[View job](https://ats.rippling.com/closinglock/jobs/36b4667b-4eea-4fc0-9ac7-70ac12e49885)

[Partner Marketing Manager](https://ats.rippling.com/closinglock/jobs/11394c38-d2b1-46c7-bd6b-9e86455420fd)
Marketing
Austin, TX
[View job](https://ats.rippling.com/closinglock/jobs/11394c38-d2b1-46c7-bd6b-9e86455420fd)

[Senior Lifecycle Marketing Manager](https://ats.rippling.com/closinglock/jobs/6c4319bb-4064-4835-96bc-9d7b978f225a)
Marketing
Austin, TX
[View job](https://ats.rippling.com/closinglock/jobs/6c4319bb-4064-4835-96bc-9d7b978f225a)

[Mid or Senior Frontend Engineer](https://ats.rippling.com/closinglock/jobs/9bfdc7ad-c429-4f48-ae1a-37510bc4d717)
Research & Development
Austin, TX
[View job](https://ats.rippling.com/closinglock/jobs/9bfdc7ad-c429-4f48-ae1a-37510bc4d717)

[Principal Product Manager](https://ats.rippling.com/closinglock/jobs/b299d6eb-46ef-49b2-8178-34f7377fc17f)
Research & Development
Austin, TX
[View job](https://ats.rippling.com/closinglock/jobs/b299d6eb-46ef-49b2-8178-34f7377fc17f)

[Product Marketing Lead](https://ats.rippling.com/closinglock/jobs/2c362eab-cc91-483e-8a8e-eb4e7300fd45)
Research & Development
Austin, TX
[View job](https://ats.rippling.com/closinglock/jobs/2c362eab-cc91-483e-8a8e-eb4e7300fd45)

[Senior Backend Engineer](https://ats.rippling.com/closinglock/jobs/6ec19b32-a9be-449b-a993-2e9a3a025762)
Research & Development
Austin, TX
[View job](https://ats.rippling.com/closinglock/jobs/6ec19b32-a9be-449b-a993-2e9a3a025762)

[Account Executive, SMB](https://ats.rippling.com/closinglock/jobs/1a4dbf12-557c-4695-b58d-b4573fad97d9)
Sales
Austin, TX
[View job](https://ats.rippling.com/closinglock/jobs/1a4dbf12-557c-4695-b58d-b4573fad97d9)

[Sales Development Representative](https://ats.rippling.com/closinglock/jobs/ac25579d-6556-449b-b674-08159e5b5d13)
Sales
Austin, TX
[View job](https://ats.rippling.com/closinglock/jobs/ac25579d-6556-449b-b674-08159e5b5d13)`;

  const listings = await parseJobListingsFromPageText(fixture);
  const subUrls = extractSubJobUrlsFromPageText(fixture);

  // Also verify sanitized path (used by import-bulk for Firecrawl content)
  const sanitized = sanitizeScrapedJobText(fixture);
  const sanitizedListings = await parseJobListingsFromPageText(sanitized);
  const sanitizedSubUrls = extractSubJobUrlsFromPageText(sanitized);
  if (sanitizedSubUrls.length !== 14 || (sanitizedListings?.length ?? 0) !== 14) {
    throw new Error(
      `Sanitized path: expected 14/14, got subUrls=${sanitizedSubUrls.length} listings=${sanitizedListings?.length ?? 0}`
    );
  }

  if (!listings) {
    throw new Error('Parser returned null');
  }

  if (subUrls.length !== 14) {
    throw new Error(`Expected 14 sub-job URLs, got ${subUrls.length}`);
  }

  if (listings.length !== 14) {
    throw new Error(`Expected 14 jobs, got ${listings.length}`);
  }

  const missingLinks = listings.filter((job) => !job.sourceUrl);
  if (missingLinks.length > 0) {
    throw new Error(`Expected all jobs to have sourceUrl, missing on ${missingLinks.length}`);
  }

  if (listings[0]?.location !== 'Austin, TX') {
    throw new Error(`Expected first listing location to be Austin, TX, got ${listings[0]?.location ?? 'missing'}`);
  }

  const cssSoup = `<html><body><style>body{-moz-osx-font-smoothing:grayscale;-webkit-font-smoothing:antialiased;font-family:"ripplingFontNormal",Arial,Helvetica,sans-serif;}ul{list-style:none;}p,h4,h3,h5,h6{margin:0;}.truncate{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}.lineClamp{display:-webkit-box!important;-webkit-line-clamp:2;overflow:hidden;text-overflow:ellipsis;white-space:normal;}@font-face{font-display:swap;font-family:RipplingIconsKit;src:url('https://static-assets.ripplingcdn.com/pebble/fonts/RipplingIconsKit/v5.93/r-icon.woff2') format('woff2');font-weight:normal;font-style:normal;}</style></body></html>`;
  const extractedFromCssSoup = extractMeaningfulPageText(cssSoup);
  if (extractedFromCssSoup.isUsable || extractedFromCssSoup.text.length !== 0) {
    throw new Error('Expected CSS-heavy Rippling shell HTML to be rejected as unusable page text');
  }

  const draftPlan = await collectDraftInputsFromPageText(fixture, {
    baseUrl: 'https://ats.rippling.com/closinglock/jobs',
    deps: {
      parseJobListingsFromPageText: async () => listings,
      extractSubJobUrlsFromPageText: () => subUrls,
      fetchSubJobPageText: async (url: string) => {
        const listing = listings.find((job) => job.sourceUrl === url);
        if (!listing) return { error: 'fetch_failed' as const };
        return { 
          text: `# ${listing.title}\n\n${listing.location ?? 'Austin, TX'}\n\nResponsibilities\n- Imported from fixture`,
          source: 'direct' as const
        };
      },
      parseJobFromText: async () => null,
      isAIConfigured: () => false,
    },
  });

  if (!draftPlan.handled) {
    throw new Error('Expected one careers page URL to be treated as a multi-job source');
  }

  if (draftPlan.drafts.length !== 14) {
    throw new Error(`Expected 14 draft inputs from one careers page URL, got ${draftPlan.drafts.length}`);
  }

  if (draftPlan.errors.length !== 0) {
    throw new Error(`Expected 0 draft planning errors, got ${draftPlan.errors.length}`);
  }

  const firstDraft = draftPlan.drafts[0];
  if (!firstDraft?.description.includes('Imported from: https://ats.rippling.com/closinglock/jobs/')) {
    throw new Error('Expected draft descriptions to retain the per-job source URL');
  }

  const shortChildDraftPlan = await collectDraftInputsFromPageText(fixture, {
    baseUrl: 'https://ats.rippling.com/closinglock/jobs',
    deps: {
      parseJobListingsFromPageText: async () => listings,
      extractSubJobUrlsFromPageText: () => subUrls.slice(0, 1),
      fetchSubJobPageText: async () => ({ text: 'Customer Success Manager, Mid-Market\nOwn onboarding. Drive adoption.', source: 'direct' as const }),
      parseJobFromText: async () => null,
      isAIConfigured: () => false,
    },
  });

  if (shortChildDraftPlan.drafts.length !== 1) {
    throw new Error(`Expected short child page text to still produce 1 draft, got ${shortChildDraftPlan.drafts.length}`);
  }

  if (shortChildDraftPlan.drafts[0]?.importProvider !== 'scrape+fallback') {
    throw new Error(`Expected short child page text to prefer scrape+fallback, got ${shortChildDraftPlan.drafts[0]?.importProvider ?? 'missing'}`);
  }

  if (shortChildDraftPlan.drafts[0]?.description.includes('Details to be added - imported from careers page.')) {
    throw new Error('Expected short child page text to beat the careers-page listing fallback copy');
  }

  console.log(JSON.stringify({
    ok: true,
    count: listings.length,
    urlCount: subUrls.length,
    draftCount: draftPlan.drafts.length,
    shortChildProvider: shortChildDraftPlan.drafts[0]?.importProvider ?? null,
    first: listings[0],
    last: listings[listings.length - 1],
  }, null, 2));
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
