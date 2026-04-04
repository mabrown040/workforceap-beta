import { Buffer } from 'node:buffer';

/**
 * Extract plain text from a resume file buffer (same rules as `/api/ai/extract-resume-text`).
 */
export async function extractTextFromResumeBuffer(buffer: Buffer, ext: string): Promise<string> {
  const e = ext.toLowerCase().replace(/^\./, '');

  if (e === 'pdf') {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require('pdf-parse/lib/pdf-parse.js');
      const data = await pdfParse(buffer);
      return (data.text?.trim() || '') as string;
    } catch {
      const raw = buffer.toString('utf-8');
      return raw
        .replace(/[^\x20-\x7E\n\r\t]/g, ' ')
        .replace(/\s{3,}/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
    }
  }

  if (e === 'docx' || e === 'doc') {
    const mammoth = await import('mammoth');
    const result = await mammoth.extractRawText({ buffer });
    return (result.value?.trim() || '') as string;
  }

  if (e === 'txt' || e === 'text') {
    return buffer.toString('utf-8').trim();
  }

  return buffer.toString('utf-8').trim();
}
