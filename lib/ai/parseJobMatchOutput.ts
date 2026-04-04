/**
 * Parses structured sections from the job-match-scorer AI output (see route system prompt).
 */
export type ParsedJobMatch = {
  scorePercent: number | null;
  matchedSkills: string[];
  missingSkills: string[];
};

function parseBulletLines(block: string): string[] {
  return block
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .map((l) => l.replace(/^[•\-\*]\s*/, '').trim())
    .filter((l) => l.length > 0);
}

export function parseJobMatchOutput(output: string): ParsedJobMatch {
  const scoreMatch = output.match(/MATCH SCORE:\s*(\d{1,3})\s*%/i);
  const scorePercent = scoreMatch
    ? Math.min(100, Math.max(0, Number.parseInt(scoreMatch[1], 10)))
    : null;

  const strengthsMatch = output.match(
    /^\s*STRENGTHS:\s*([\s\S]*?)(?=^\s*GAPS TO ADDRESS:)/im
  );
  const gapsMatch = output.match(
    /^\s*GAPS TO ADDRESS:\s*([\s\S]*?)(?=^\s*QUICK WINS:)/im
  );

  const matchedSkills = strengthsMatch ? parseBulletLines(strengthsMatch[1]) : [];
  const missingSkills = gapsMatch ? parseBulletLines(gapsMatch[1]) : [];

  return { scorePercent, matchedSkills, missingSkills };
}
