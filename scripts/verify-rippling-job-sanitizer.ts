import { buildFallbackParsedJobFromScrape, sanitizeScrapedJobText } from '../lib/ai/parseJob';

const fixture = `# Customer Success Manager, Mid-Market

draft
Needs a few details

body{-moz-osx-font-smoothing:grayscale;-webkit-font-smoothing:antialiased;font-family:"ripplingFontNormal",Arial,Helvetica,sans-serif;letter-spacing:0.5px;}ul{list-style:none;-webkit-padding-start:0;padding-inline-start:0;}p,h4,h3,h5,h6{margin:0;}.truncate{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}@font-face{font-display:swap;font-family:"ripplingFontLight";src:url(' format('embedded-opentype'),url(' format('woff2'),url(' format('woff');font-style:normal;font-weight:300;} :root{--color-primary:#7a005d;--color-surface:#f9f7f6;--color-white:#ffffff;--color-black:#000000;}

Location (City, State or Remote)
Austin, TX

Job Description *
Closinglock is hiring a Customer Success Manager to support mid-market customers through onboarding, adoption, and renewal.
Responsibilities include managing a book of business, leading quarterly business reviews, and partnering with sales and product teams.
Requirements include 3+ years in customer success, strong communication, and experience with SaaS accounts.

---
Imported from: https://ats.rippling.com/closinglock/jobs/d2b5d49f-f2a8-4c92-9405-a05769ce81fe`;

const cleaned = sanitizeScrapedJobText(fixture);
if (/body\{|@font-face|:root|--color-primary|font-family/i.test(cleaned)) {
  throw new Error('CSS noise still present after sanitizeScrapedJobText');
}

const parsed = buildFallbackParsedJobFromScrape('Customer Success Manager, Mid-Market', fixture);
if (!parsed) {
  throw new Error('Fallback parse returned null');
}

if (/body\{|@font-face|:root|--color-primary|font-family/i.test(parsed.description)) {
  throw new Error('Fallback description still contains CSS noise');
}

if (!parsed.description.includes('Closinglock is hiring a Customer Success Manager')) {
  throw new Error('Expected core job description text to be preserved');
}

console.log(JSON.stringify({
  ok: true,
  title: parsed.title,
  excerpt: parsed.description.slice(0, 220),
}, null, 2));
