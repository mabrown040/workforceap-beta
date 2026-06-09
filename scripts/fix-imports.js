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

  // Remove any api-utils imports that appear mid-file (after export const POST)
  const badImportPattern = /export const POST = withApiGuc\(async \(request: (Request|NextRequest)\) => \{\nimport \{ getClientIp \} from '@\/lib\/api-utils';\nimport \{ createApiErrorResponse, createRateLimitResponse, createServiceUnavailableResponse, createUnauthorizedResponse \} from '@\/lib\/api-utils';\n/g;
  content = content.replace(badImportPattern, (match, reqType) => {
    return `export const POST = withApiGuc(async (request: ${reqType}) => {`;
  });

  // Also handle the case where the imports are after `export const POST = withApiGuc(async (request: Request) => {`
  // but with different spacing
  content = content.replace(
    /export const POST = withApiGuc\(async \(request: Request\) => \{\nimport \{ getClientIp \} from '@\/lib\/api-utils';\nimport \{ createApiErrorResponse, createRateLimitResponse, createServiceUnavailableResponse, createUnauthorizedResponse \} from '@\/lib\/api-utils';\n/,
    "export const POST = withApiGuc(async (request: Request) => {"
  );
  content = content.replace(
    /export const POST = withApiGuc\(async \(request: NextRequest\) => \{\nimport \{ getClientIp \} from '@\/lib\/api-utils';\nimport \{ createApiErrorResponse, createRateLimitResponse, createServiceUnavailableResponse, createUnauthorizedResponse \} from '@\/lib\/api-utils';\n/,
    "export const POST = withApiGuc(async (request: NextRequest) => {"
  );

  // Add the imports at the correct location - after the last import statement and before any code
  if (!content.includes("from '@/lib/api-utils'")) {
    const lines = content.split('\n');
    let lastImportIdx = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim().startsWith('import ')) {
        lastImportIdx = i;
      }
    }
    if (lastImportIdx >= 0) {
      lines.splice(lastImportIdx + 1, 0,
        "import { getClientIp } from '@/lib/api-utils';",
        "import { createApiErrorResponse, createRateLimitResponse, createServiceUnavailableResponse, createUnauthorizedResponse } from '@/lib/api-utils';"
      );
      content = lines.join('\n');
    }
  }

  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Fixed', route);
}

console.log('Done fixing imports');
