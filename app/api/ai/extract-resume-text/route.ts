import { Buffer } from 'node:buffer';
import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { checkAIToolRateLimit } from '@/lib/rate-limit';
import { extractTextFromResumeBuffer } from '@/lib/resume/extractTextFromResumeBuffer';
import { validateFileType } from '@/lib/resume/file-validation';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

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
  
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 400 });
    }
  
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  
    try {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.isBuffer(arrayBuffer) ? arrayBuffer : Buffer.from(arrayBuffer);
  
      if (!validateFileType(buffer, file.type || '', file.name, { allowTxt: true })) {
        return NextResponse.json(
          { error: 'Invalid file type. Use PDF, DOC, DOCX, or TXT.' },
          { status: 400 }
        );
      }
  
      const text = await extractTextFromResumeBuffer(buffer, ext);
      if (ext === 'pdf' && !text) {
        return NextResponse.json(
          {
            error:
              'Could not extract text from this PDF. It may be a scanned image. Try pasting your resume text instead.',
          },
          { status: 400 }
        );
      }
      return NextResponse.json({ text });
    } catch (err) {
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
