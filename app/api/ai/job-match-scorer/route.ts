import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { ensureUserInDb } from '@/lib/auth/ensureUser';
import { checkAIToolRateLimit, checkAICoachUserRateLimit, checkAICoachIpRateLimit } from '@/lib/rate-limit';
import { jobMatchScorerSchema } from '@/lib/validation/jobMatchScorer';
import { chatCompletion, isAIConfigured } from '@/lib/ai/groq';
import { saveAIToolResult } from '@/lib/ai/saveResult';
import {
  fetchPageText,
  detectProvider,
  isKnownStructuredApiProvider,
  importJobsFromUrl,
  type ATSParseResult,
} from '@/lib/ai/atsProviders';
import { sanitizeScrapedJobText } from '@/lib/ai/parseJob';
import { resolveActOnBehalf } from '@/lib/auth/actAsSubject';

import { prefillJobMatchScorer, honestNoResumeError } from '@/lib/ai/prefillFromMemberState';
import { getAICoachContext, renderCoachContextForPrompt } from '@/lib/ai/aiCoachContext';
import { withApiGuc } from '@/lib/db/withRequestGuc';
import { getClientIp } from '@/lib/api-utils';
import { createApiErrorResponse, createRateLimitResponse, createServiceUnavailableResponse, createUnauthorizedResponse } from '@/lib/api-utils';

/**
 * Extract job description from URL using provider-aware logic.
 * Tier 1: Use ATS provider APIs (Greenhouse, Lever, Ashby) for known job URLs
 * Tier 2: Fallback to generic page scraping (fetchPageText)
 * Returns the job description text or null with a user-friendly, actionable reason.
 */
async function extractJobDescriptionFromUrl(url: string): Promise<
  | { text: string; source: 'ats-api' | 'scraping' }
  | { text: null; reason: string; guidance: 'unsupported-url' | 'scrape-failed' | 'paste-manually' | 'service-busy' }
> {
  const detected = detectProvider(url);

  // Tier 1: Use structured ATS APIs for known providers with job IDs
  if (detected && isKnownStructuredApiProvider(detected.provider) && detected.jobId) {
    
    const result: ATSParseResult = await importJobsFromUrl(url);
    
    if (result.jobs.length > 0) {
      // Successfully got structured job data from API
      const job = result.jobs[0];
      const descriptionParts: string[] = [];
      
      if (job.title) descriptionParts.push(`Title: ${job.title}`);
      if (job.company) descriptionParts.push(`Company: ${job.company}`);
      if (job.location) descriptionParts.push(`Location: ${job.location}`);
      if (job.description) descriptionParts.push(`\n${job.description}`);
      if (job.requirements && job.requirements.length > 0) {
        descriptionParts.push(`\nRequirements:\n${job.requirements.join('\n')}`);
      }
      
      const fullText = descriptionParts.join('\n').trim();
      if (fullText.length >= 100) {
        return { text: fullText, source: 'ats-api' };
      }
      // Job was found but description is too short - fall through to scraping
      console.warn(`[job-match-scorer] ${detected.provider} API returned short description (${fullText.length} chars), trying fallback`);
    }
    
    // API returned no jobs or errors - try fallback scraping
    if (result.errors.length > 0) {
      console.warn(`[job-match-scorer] ${detected.provider} API failed:`, result.errors.join('; '));
    }
  }
  
  // Tier 2: Fallback to generic page scraping
  // This also handles: unknown providers, API failures, JS-rendered pages
  const scrapeResult = await fetchPageText(url, { waitFor: 2500 });
  
  if ('source' in scrapeResult && scrapeResult.text) {
    return { text: scrapeResult.text, source: 'scraping' };
  }

  // Scraping failed — surface a user-friendly reason based on error type
  if ('error' in scrapeResult) {
    if (scrapeResult.error === 'rate_limited' || scrapeResult.error === 'quota_exceeded') {
      return {
        text: null,
        reason: 'Job description reader is temporarily busy. Please try again in a few minutes, or paste the job description directly.',
        guidance: 'service-busy',
      };
    }

    // Known JS-rendered ATS pages may still scrape successfully, but if scraping fails,
    // give the member a more specific fallback suggestion.
    if (detected && ['rippling', 'workday', 'icims'].includes(detected.provider)) {
      return {
        text: null,
        reason: `${detected.provider.charAt(0).toUpperCase() + detected.provider.slice(1)} career pages could not be read automatically this time. Please paste the job description directly if retrying does not work.`,
        guidance: 'paste-manually',
      };
    }

    // Check if this URL is from a known unsupported domain
    const urlLower = url.toLowerCase();
    const unsupportedDomains = [
      'linkedin.com',
      'indeed.com',
      'glassdoor.com',
      'monster.com',
      'ziprecruiter.com',
      'careerbuilder.com',
    ];
    const isUnsupportedDomain = unsupportedDomains.some(domain => urlLower.includes(domain));
    
    if (isUnsupportedDomain) {
      return {
        text: null,
        reason: `This job board (${new URL(url).hostname}) is not supported for automatic reading.`,
        guidance: 'unsupported-url',
      };
    }
    
    return {
      text: null,
      reason: 'Could not extract job description from URL. The page may require login, use JavaScript rendering, or block automated reading.',
      guidance: 'scrape-failed',
    };
  }

  return {
    text: null,
    reason: 'Could not extract job description from URL.',
    guidance: 'scrape-failed',
  };
}

export interface MatchAnalysisOutput {
  matchScore: number;
  strengths: string[];
  gaps: string[];
  quickWins: string[];
  rawText: string;
}

function parseMatchAnalysis(aiOutput: string): MatchAnalysisOutput {
  const lines = aiOutput.split('\n');
  let matchScore = 70; // Default realistic score
  const strengths: string[] = [];
  const gaps: string[] = [];
  const quickWins: string[] = [];

  let currentSection: 'strengths' | 'gaps' | 'quickWins' | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Parse MATCH SCORE
    const scoreMatch = trimmed.match(/MATCH\s*SCORE:\s*(\d+)%?/i);
    if (scoreMatch) {
      const parsed = parseInt(scoreMatch[1], 10);
      if (!isNaN(parsed) && parsed >= 0 && parsed <= 100) {
        matchScore = parsed;
      }
      continue;
    }

    // Detect section headers
    if (/^STRENGTHS:/i.test(trimmed) || /^STRENGTHS$/i.test(trimmed)) {
      currentSection = 'strengths';
      continue;
    }
    if (/^GAPS\s*(TO\s*ADDRESS)?:/i.test(trimmed) || /^GAPS$/i.test(trimmed)) {
      currentSection = 'gaps';
      continue;
    }
    if (/^QUICK\s*WINS:/i.test(trimmed) || /^QUICK\s*WINS$/i.test(trimmed)) {
      currentSection = 'quickWins';
      continue;
    }

    // Parse bullet points
    const bulletMatch = trimmed.match(/^[•\-\*]\s*(.+)/);
    if (bulletMatch && currentSection) {
      const content = bulletMatch[1].trim();
      if (content.length > 5) {
        if (currentSection === 'strengths') strengths.push(content);
        else if (currentSection === 'gaps') gaps.push(content);
        else if (currentSection === 'quickWins') quickWins.push(content);
      }
    }
  }

  return {
    matchScore,
    strengths: strengths.length > 0 ? strengths : ['Resume shows relevant experience'],
    gaps: gaps.length > 0 ? gaps : ['Review job requirements for specific gaps'],
    quickWins: quickWins.length > 0 ? quickWins : ['Tailor resume keywords to job posting'],
    rawText: aiOutput,
  };
}
export const POST = withApiGuc(async (request: Request) => {
  try {
    const user = await getUser();
    if (!user) return createUnauthorizedResponse();
    if (!isAIConfigured()) return createServiceUnavailableResponse();
  
    const { success } = await checkAIToolRateLimit(user.id);
    const ip = getClientIp(request);
    const userLimit = await checkAICoachUserRateLimit(user.id);
    const ipLimit = await checkAICoachIpRateLimit(ip);
    if (!userLimit.success || !ipLimit.success) return createRateLimitResponse();
    if (!success) return createRateLimitResponse();
  
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return createApiErrorResponse('Invalid JSON', 'VALIDATION_ERROR', 400);
    }
  
    const parsed = jobMatchScorerSchema.safeParse(body);
    if (!parsed.success) {
      return createApiErrorResponse(parsed.error.errors[0]?.message ?? 'Validation failed', 'VALIDATION_ERROR', 400);
    }
  
    const { resume, jobDescription, jobUrl, subjectMemberId, sessionId, prefill: shouldPrefill, parentToolResultId } = parsed.data;
    const onBehalf = await resolveActOnBehalf(user.id, subjectMemberId);
    if (!onBehalf.ok) return NextResponse.json({ error: onBehalf.error }, { status: onBehalf.status });
  
    let finalResume = resume?.trim();
  
    // If no resume provided, try to prefill from member state
    if (!finalResume || finalResume.length < 40) {
      if (shouldPrefill) {
        const prefill = await prefillJobMatchScorer(onBehalf.subjectUserId);
        if (!prefill.resume || prefill.resume.length < 40) {
          const err = honestNoResumeError();
          return NextResponse.json({ error: err.error }, { status: err.status });
        }
        finalResume = prefill.resume;
      }
    }
  
    // Validate that at least one job source is provided
    if (!jobDescription?.trim() && !jobUrl?.trim()) {
      return NextResponse.json(
        { error: 'Please provide either a job description or a job URL' },
        { status: 400 }
      );
    }
  
    // Fetch job description from URL if provided
    let finalJobDescription = jobDescription?.trim() ?? '';
    let scrapedFromUrl = false;
    let scrapeError: string | null = null;
    let scrapeSource: 'ats-api' | 'scraping' | null = null;
    let scrapeGuidance: 'unsupported-url' | 'scrape-failed' | 'paste-manually' | 'service-busy' | null = null;
  
    if (jobUrl?.trim()) {
      try {
        const extractResult = await extractJobDescriptionFromUrl(jobUrl.trim());
        
        if ('source' in extractResult && extractResult.text) {
          // Successful extraction — only use if substantive enough
          const sanitized = sanitizeScrapedJobText(extractResult.text).slice(0, 8000);
          if (sanitized.length >= 50) {
            finalJobDescription = sanitized;
            scrapedFromUrl = true;
            scrapeSource = extractResult.source;
          } else {
            // Scraped content too short — preserve any manually-provided description
            console.warn(`[job-match-scorer] Scraped content too short (${sanitized.length} chars), falling back to manual description`);
            if (!finalJobDescription) {
              return NextResponse.json(
                { 
                  error: 'Could not extract a full job description from that URL. Try pasting the job description directly.',
                  guidance: 'paste-manually',
                },
                { status: 400 }
              );
            }
          }
        } else if ('reason' in extractResult) {
          // Extraction failed with a specific reason and guidance
          scrapeError = extractResult.reason;
          scrapeGuidance = extractResult.guidance;
          console.error('[job-match-scorer] URL extraction failed:', scrapeError, 'guidance:', scrapeGuidance);
        }
  
        // If we have no job description from either source, return error with guidance
        if (!finalJobDescription && scrapeError) {
          const errorMessage = scrapeGuidance === 'paste-manually'
            ? `${scrapeError} Please paste the job description text directly.`
            : scrapeGuidance === 'unsupported-url'
            ? `${scrapeError} Copy and paste the job description text instead.`
            : scrapeGuidance === 'service-busy'
            ? scrapeError
            : `${scrapeError} You can paste the job description text directly instead.`;
          
          return NextResponse.json(
            { 
              error: errorMessage,
              guidance: scrapeGuidance,
            },
            { status: 400 }
          );
        }
      } catch (err) {
        console.error('[job-match-scorer] URL fetch error:', err);
        if (!finalJobDescription) {
          return NextResponse.json(
            { 
              error: 'Failed to fetch job description from URL. Please paste the job description directly.',
              guidance: 'paste-manually',
            },
            { status: 400 }
          );
        }
      }
    }
  
    // Final validation of job description
    if (!finalJobDescription || finalJobDescription.length < 50) {
      return NextResponse.json(
        { 
          error: scrapedFromUrl
            ? 'Could not extract enough content from that URL. Try pasting the job description directly.'
            : 'Job description must be at least 50 characters',
          guidance: scrapedFromUrl ? 'paste-manually' : undefined,
        },
        { status: 400 }
      );
    }
  
    // Sprint R2 — coach context block.
    let coachContextBlock = '';
    try {
      const ctx = await getAICoachContext(onBehalf.subjectUserId);
      coachContextBlock = `\n\n${renderCoachContextForPrompt(ctx)}`;
    } catch (ctxErr) {
      console.error('[job-match-scorer] coach context load failed', ctxErr);
    }
    if (parentToolResultId) {
      coachContextBlock += `\n- The member asked to regenerate from a prior match score — feel free to compare and recommend new quick wins.`;
    }

    const systemPrompt = `You are a career coach and ATS expert. Analyze how well a candidate's resume matches a job description.${coachContextBlock}
  
  Your response MUST follow this exact format:
  
  MATCH SCORE: [number]%
  (Use a number 0-100. Be realistic—most candidates are 50-75% matched. Only give 90+ for near-perfect fits.)
  
  STRENGTHS:
  • [bullet 1 - specific skill/experience they have that matches]
  • [bullet 2]
  • [2-4 bullets total]
  
  GAPS TO ADDRESS:
  • [bullet 1 - specific requirement they're missing, e.g. "ServiceNow experience", "ITIL certification"]
  • [bullet 2]
  • [2-5 bullets total. Be specific and actionable. These are why they might not get callbacks.]
  
  QUICK WINS:
  • [1-2 bullets: easiest ways to improve the match—e.g. "Add 'project management' if you've led any cross-team work", "Highlight your SQL experience more prominently"]
  
  Keep it concise. No fluff. Members want to know exactly why they're not getting callbacks and what to fix.`;
  
    const userPrompt = `Job description:
  ---
  ${finalJobDescription}
  ---
  
  Candidate's resume:
  ---
  ${finalResume}
  ---
  
  Analyze the match and output in the format above.`;
  
    try {
      const output = await chatCompletion(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        { maxTokens: 1200, temperature: 0.5 }
      );
  
      if (!output) return NextResponse.json({ error: 'We could not generate a response. Please try again.' }, { status: 500 });
  
      const parsedOutput = parseMatchAnalysis(output);
      const summary = finalJobDescription.slice(0, 80) + (finalJobDescription.length > 80 ? '...' : '');
  
      try {
        await ensureUserInDb(user);
        await saveAIToolResult(onBehalf.subjectUserId, 'job_match_scorer', summary, output, {
          actorUserId: onBehalf.actorUserId,
          actorName: onBehalf.actorName,
          sessionId,
          parentToolResultId: parentToolResultId ?? null,
        });
      } catch (saveErr) {
        console.error('Job match scorer: failed to save result', saveErr);
      }
  
      return NextResponse.json({
        output,
        parsed: parsedOutput,
        scrapedFromUrl,
        scrapeSource,
      });
    } catch (err) {
      console.error('Job match scorer error:', err);
      return NextResponse.json(
        { error: 'We could not analyze your match just now. Please try again in a moment.' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('/ai/job-match-scorer:', error);
    return createApiErrorResponse('Internal server error', 'INTERNAL_ERROR', 500);
  }
});
