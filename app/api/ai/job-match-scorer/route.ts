import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { ensureUserInDb } from '@/lib/auth/ensureUser';
import { checkAIToolRateLimit } from '@/lib/rate-limit';
import { jobMatchScorerSchema } from '@/lib/validation/jobMatchScorer';
import { chatCompletion, isAIConfigured } from '@/lib/ai/groq';
import { saveAIToolResult } from '@/lib/ai/saveResult';
import { fetchPageText } from '@/lib/ai/atsProviders';
import { sanitizeScrapedJobText } from '@/lib/ai/parseJob';

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

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isAIConfigured()) return NextResponse.json({ error: 'AI service not configured' }, { status: 503 });

  const { success } = await checkAIToolRateLimit(user.id);
  if (!success) return NextResponse.json({ error: 'Rate limit exceeded. Try again in an hour.' }, { status: 429 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = jobMatchScorerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? 'Validation failed' },
      { status: 400 }
    );
  }

  const { resume, jobDescription, jobUrl } = parsed.data;

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

  if (jobUrl?.trim()) {
    try {
      const scrapeResult = await fetchPageText(jobUrl.trim(), { waitFor: 2500 });
      
      if ('source' in scrapeResult && scrapeResult.text) {
        // Successful scrape with usable content
        finalJobDescription = sanitizeScrapedJobText(scrapeResult.text).slice(0, 8000);
        scrapedFromUrl = true;
      } else if ('reason' in scrapeResult) {
        // Scrape failed with a specific reason
        scrapeError = scrapeResult.reason;
        console.error('[job-match-scorer] URL scrape failed:', scrapeError);
      }
      
      // If we have no job description from either source, return error
      if (!finalJobDescription && scrapeError) {
        return NextResponse.json(
          { error: scrapeError },
          { status: 400 }
        );
      }
    } catch (err) {
      console.error('[job-match-scorer] URL fetch error:', err);
      if (!finalJobDescription) {
        return NextResponse.json(
          { error: 'Failed to fetch job description from URL. Please paste the job description directly.' },
          { status: 400 }
        );
      }
    }
  }

  // Final validation of job description
  if (!finalJobDescription || finalJobDescription.length < 50) {
    return NextResponse.json(
      { error: 'Job description must be at least 50 characters' },
      { status: 400 }
    );
  }

  const systemPrompt = `You are a career coach and ATS expert. Analyze how well a candidate's resume matches a job description.

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
${resume}
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

    if (!output) return NextResponse.json({ error: 'No response from AI' }, { status: 500 });

    const parsedOutput = parseMatchAnalysis(output);
    const summary = finalJobDescription.slice(0, 80) + (finalJobDescription.length > 80 ? '...' : '');

    try {
      await ensureUserInDb(user);
      await saveAIToolResult(user.id, 'job_match_scorer', summary, output);
    } catch (saveErr) {
      console.error('Job match scorer: failed to save result', saveErr);
    }

    return NextResponse.json({
      output,
      parsed: parsedOutput,
      scrapedFromUrl,
    });
  } catch (err) {
    console.error('Job match scorer error:', err);
    return NextResponse.json(
      { error: 'Failed to analyze match. Please try again.' },
      { status: 500 }
    );
  }
}
