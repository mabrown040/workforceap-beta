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

const IMPORTS_TO_ADD = [
  "import { getClientIp } from '@/lib/api-utils';",
  "import { createApiErrorResponse, createRateLimitResponse, createServiceUnavailableResponse, createUnauthorizedResponse } from '@/lib/api-utils';",
];

for (const route of AI_ROUTES) {
  const filePath = path.join(BASE_DIR, route);
  let content = fs.readFileSync(filePath, 'utf8');

  // 1. Add imports before the `export const POST` line
  if (!content.includes("from '@/lib/api-utils'")) {
    const lines = content.split('\n');
    let exportPostIdx = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('export const POST')) {
        exportPostIdx = i;
        break;
      }
    }
    if (exportPostIdx >= 0) {
      // Insert before the export const POST line
      lines.splice(exportPostIdx, 0, ...IMPORTS_TO_ADD);
      content = lines.join('\n');
    }
  }

  // 2. Update rate-limit import to include new checkers
  if (!content.includes('checkAICoachUserRateLimit')) {
    content = content.replace(
      /import\s+\{([^}]*)\}\s+from\s+'@\/lib\/rate-limit';/,
      (match, imports) => {
        const trimmed = imports.trim();
        if (trimmed.includes('checkAICoachUserRateLimit')) return match;
        const newImports = trimmed + (trimmed.endsWith(',') ? ' ' : ', ') + 'checkAICoachUserRateLimit, checkAICoachIpRateLimit';
        return `import { ${newImports} } from '@/lib/rate-limit';`;
      }
    );
  }

  // 3. Replace error response patterns
  content = content.replace(
    /return NextResponse\.json\(\{ error: 'Unauthorized' \}, \{ status: 401 \}\);/g,
    'return createUnauthorizedResponse();'
  );
  content = content.replace(
    /return NextResponse\.json\(\{ error: 'Unauthorized' \}, \{ status: 401 \}\)/g,
    'return createUnauthorizedResponse()'
  );

  content = content.replace(
    /return NextResponse\.json\(\{ error: 'This feature is temporarily unavailable\. Please try again soon\.' \}, \{ status: 503 \}\);/g,
    'return createServiceUnavailableResponse();'
  );
  content = content.replace(
    /return NextResponse\.json\(\{ error: 'This feature is temporarily unavailable\. Please try again soon\.' \}, \{ status: 503 \}\)/g,
    'return createServiceUnavailableResponse()'
  );

  content = content.replace(
    /return NextResponse\.json\(\{ error: 'Rate limit exceeded\. Please try again in a few minutes\.' \}, \{ status: 429 \}\);/g,
    'return createRateLimitResponse();'
  );
  content = content.replace(
    /return NextResponse\.json\(\{ error: 'Rate limit exceeded\. Please try again in a few minutes\.' \}, \{ status: 429 \}\)/g,
    'return createRateLimitResponse()'
  );

  content = content.replace(
    /return NextResponse\.json\(\{ error: 'Invalid JSON' \}, \{ status: 400 \}\);/g,
    "return createApiErrorResponse('Invalid JSON', 'VALIDATION_ERROR', 400);"
  );
  content = content.replace(
    /return NextResponse\.json\(\{ error: 'Invalid JSON' \}, \{ status: 400 \}\)/g,
    "return createApiErrorResponse('Invalid JSON', 'VALIDATION_ERROR', 400)"
  );

  // Zod validation error (two common patterns)
  content = content.replace(
    /return NextResponse\.json\(\{ error: parsed\.error\.errors\[0\]\?\.message \?\? 'Validation failed' \}, \{ status: 400 \}\);/g,
    "return createApiErrorResponse(parsed.error.errors[0]?.message ?? 'Validation failed', 'VALIDATION_ERROR', 400);"
  );
  content = content.replace(
    /return NextResponse\.json\(\s*\{ error: parsed\.error\.errors\[0\]\?\.message \?\? 'Validation failed' \},\s*\{ status: 400 \}\s*\);/g,
    "return createApiErrorResponse(parsed.error.errors[0]?.message ?? 'Validation failed', 'VALIDATION_ERROR', 400);"
  );

  // 500 errors
  content = content.replace(
    /return NextResponse\.json\(\{ error: 'Internal server error' \}, \{ status: 500 \}\);/g,
    "return createApiErrorResponse('Internal server error', 'INTERNAL_ERROR', 500);"
  );
  content = content.replace(
    /return NextResponse\.json\(\{ error: 'Internal server error' \}, \{ status: 500 \}\)/g,
    "return createApiErrorResponse('Internal server error', 'INTERNAL_ERROR', 500)"
  );

  // 4. Add dual rate limit check after the existing checkAIToolRateLimit block
  if (content.includes('checkAIToolRateLimit(user.id)') && !content.includes('checkAICoachUserRateLimit')) {
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
  console.log('Updated', route);
}

console.log('Done');
