const fs = require('fs');
const path = require('path');

const AI_ROUTES = [
  'app/api/ai/cover-letter/route.ts',
  'app/api/ai/elevator-pitch/route.ts',
  'app/api/ai/export-pdf/route.ts',
  'app/api/ai/extract-resume-skills/route.ts',
  'app/api/ai/extract-resume-text/route.ts',
  'app/api/ai/gap-analyzer/route.ts',
  'app/api/ai/interview-practice/route.ts',
  'app/api/ai/interview-voice/route.ts',
  'app/api/ai/job-match-scorer/route.ts',
  'app/api/ai/linkedin-about/route.ts',
  'app/api/ai/linkedin-headline/route.ts',
  'app/api/ai/resume-rewriter/route.ts',
  'app/api/ai/resume-strength/route.ts',
  'app/api/ai/salary-negotiation/route.ts',
  'app/api/ai/skill-mapper/route.ts',
];

const BASE_DIR = '/home/mike/.openclaw-dench/workspace/wap-repo';

for (const route of AI_ROUTES) {
  const filePath = path.join(BASE_DIR, route);
  let content = fs.readFileSync(filePath, 'utf8');

  // Add dual rate limit check if not already present (check by looking for the actual call pattern)
  if (content.includes('checkAIToolRateLimit(user.id)') && !content.includes('checkAICoachUserRateLimit(user.id)')) {
    content = content.replace(
      /const \{ success \} = await checkAIToolRateLimit\(user\.id\);\n\s*if \(!success\)/g,
      (match) => {
        return `const { success } = await checkAIToolRateLimit(user.id);
    const ip = getClientIp(request);
    const userLimit = await checkAICoachUserRateLimit(user.id);
    const ipLimit = await checkAICoachIpRateLimit(ip);
    if (!userLimit.success || !ipLimit.success) return createRateLimitResponse();
    if (!success)`;
      }
    );
  }

  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Fixed rate limit in', route);
}

console.log('Done');
