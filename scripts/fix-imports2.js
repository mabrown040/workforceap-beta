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

  // Step 1: Remove any api-utils imports that are NOT at the top of the file
  const lines = content.split('\n');
  const cleanedLines = [];
  let inTopImports = true;
  let codeStarted = false;
  for (const line of lines) {
    if (inTopImports && line.trim() && !line.trim().startsWith('import ') && !line.trim().startsWith('//') && !line.trim().startsWith('/*') && !line.trim().startsWith('*')) {
      inTopImports = false;
    }
    if (line.includes("from '@/lib/api-utils'") && !inTopImports) {
      continue; // skip mid-file api-utils imports
    }
    cleanedLines.push(line);
  }
  content = cleanedLines.join('\n');

  // Step 2: Find the last import line and add our imports there
  const allLines = content.split('\n');
  let lastImportIdx = -1;
  for (let i = 0; i < allLines.length; i++) {
    if (allLines[i].trim().startsWith('import ')) {
      lastImportIdx = i;
    }
  }

  if (lastImportIdx >= 0 && !content.includes("from '@/lib/api-utils'")) {
    allLines.splice(lastImportIdx + 1, 0,
      "import { getClientIp } from '@/lib/api-utils';",
      "import { createApiErrorResponse, createRateLimitResponse, createServiceUnavailableResponse, createUnauthorizedResponse } from '@/lib/api-utils';"
    );
    content = allLines.join('\n');
  }

  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Fixed', route);
}

console.log('Done');
