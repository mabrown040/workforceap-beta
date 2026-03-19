import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { checkAIToolRateLimit } from '@/lib/rate-limit';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(request: Request) {
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

  const ext = file.name.split('.').pop()?.toLowerCase();

  try {
    if (ext === 'pdf') {
      const buffer = Buffer.from(await file.arrayBuffer());
      let text = '';

      // Try pdf-parse first (best quality extraction)
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const pdfParse = require('pdf-parse/lib/pdf-parse.js');
        const data = await pdfParse(buffer);
        text = data.text?.trim() || '';
      } catch {
        // Fallback: raw text extraction from PDF binary
        // Extracts readable text by stripping non-printable characters
        const raw = buffer.toString('utf-8');
        text = raw
          .replace(/[^\x20-\x7E\n\r\t]/g, ' ')
          .replace(/\s{3,}/g, '\n')
          .replace(/\n{3,}/g, '\n\n')
          .trim();
      }

      if (!text) {
        return NextResponse.json(
          { error: 'Could not extract text from this PDF. It may be a scanned image. Try pasting your resume text instead.' },
          { status: 400 }
        );
      }

      return NextResponse.json({ text });
    }

    if (ext === 'docx' || ext === 'doc') {
      const mammoth = await import('mammoth');
      const buffer = Buffer.from(await file.arrayBuffer());
      const result = await mammoth.extractRawText({ buffer });
      return NextResponse.json({ text: result.value?.trim() || '' });
    }

    if (ext === 'txt') {
      const text = await file.text();
      return NextResponse.json({ text: text.trim() });
    }

    return NextResponse.json(
      { error: 'Unsupported format. Use PDF, DOCX, or TXT.' },
      { status: 400 }
    );
  } catch (err) {
    console.error('Extract resume text error:', err);
    return NextResponse.json(
      { error: 'Could not extract text from file. Try pasting instead.' },
      { status: 500 }
    );
  }
}
