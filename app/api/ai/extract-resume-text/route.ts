import { Buffer } from 'node:buffer';
import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { checkAIToolRateLimit, checkAICoachUserRateLimit, checkAICoachIpRateLimit } from '@/lib/rate-limit';
import { extractTextFromResumeBuffer } from '@/lib/resume/extractTextFromResumeBuffer';
import { validateFileType } from '@/lib/resume/file-validation';
import { getClientIp } from '@/lib/api-utils';
import { createApiErrorResponse, createRateLimitResponse, createUnauthorizedResponse } from '@/lib/api-utils';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(request: Request) {
  try {
    const user = await getUser();
    if (!user) return createUnauthorizedResponse();

    const { success } = await checkAIToolRateLimit(user.id);
    const ip = getClientIp(request);
    const userLimit = await checkAICoachUserRateLimit(user.id);
    const ipLimit = await checkAICoachIpRateLimit(ip);
    if (!userLimit.success || !ipLimit.success) return createRateLimitResponse();
    if (!success) return createRateLimitResponse();

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return createApiErrorResponse('Invalid form data', 'VALIDATION_ERROR', 400);
    }

    const file = formData.get('file') as File | null;
    if (!file) return createApiErrorResponse('No file provided', 'VALIDATION_ERROR', 400);

    if (file.size > MAX_FILE_SIZE) {
      return createApiErrorResponse('File too large (max 5MB)', 'VALIDATION_ERROR', 400);
    }

    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';

    try {
      const buffer = Buffer.from(await file.arrayBuffer());

      if (!validateFileType(buffer, file.type || '', file.name, { allowTxt: true })) {
        return createApiErrorResponse('Invalid file type. Use PDF, DOC, DOCX, or TXT.', 'VALIDATION_ERROR', 400);
      }

      const text = await extractTextFromResumeBuffer(buffer, ext);
      if (ext === 'pdf' && !text) {
        return createApiErrorResponse(
          'Could not extract text from this PDF. It may be a scanned image. Try pasting your resume text instead.',
          'VALIDATION_ERROR',
          400,
        );
      }
      return NextResponse.json({ text });
    } catch (err) {
      console.error('Extract resume text error:', err);
      return createApiErrorResponse('Could not extract text from file. Try pasting instead.', 'INTERNAL_ERROR', 500);
    }
  } catch (error) {
    console.error('/ai/extract-resume-text:', error);
    return createApiErrorResponse('Internal server error', 'INTERNAL_ERROR', 500);
  }
}
