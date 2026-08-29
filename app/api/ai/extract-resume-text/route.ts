import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { checkAIToolRateLimit } from '@/lib/rate-limit';
import {
  prepareResumeUpload,
  ResumeUploadValidationError,
} from '@/lib/resume/prepareResumeUpload';

export async function POST(request: Request) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
    const { success } = await checkAIToolRateLimit(user.id);
    if (!success) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
    }
  
    const file = formData.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

    try {
      const prepared = await prepareResumeUpload(file);
      return NextResponse.json({
        text: prepared.text,
        extractionWarning: prepared.extractionWarning,
      });
    } catch (err) {
      if (err instanceof ResumeUploadValidationError) {
        return NextResponse.json(
          { error: err.message, code: err.code },
          { status: 400 },
        );
      }
      console.error('Extract resume text error:', err);
      return NextResponse.json(
        { error: 'Could not extract text from file. Try pasting instead.' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('/ai/extract-resume-text:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
