import assert from 'node:assert/strict';
import test from 'node:test';
import { Buffer } from 'node:buffer';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { clampElevenLabsDynamicVariables } from '@/lib/ai/clampElevenLabsDynamicVariables';
import { extractTextFromResumeBuffer } from './extractTextFromResumeBuffer';
import { isUnsafeResumePlainText, sanitizeResumePlainText } from './extractionQuality';

const require = createRequire(import.meta.url);

function validPdfResume(): Buffer {
  // Keep this fixture uncompressed and PDF 1.4-compatible so the repository's
  // legacy pdf-parse engine reads it identically on Windows and Linux.
  const content = [
    'BT',
    '/F1 18 Tf',
    '48 730 Td',
    '(Jane Doe Resume) Tj',
    '0 -35 Td',
    '/F1 11 Tf',
    '(Experience: Database administrator using SQL and PostgreSQL.) Tj',
    'ET',
  ].join('\n');
  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>\nendobj\n',
    `4 0 obj\n<< /Length ${Buffer.byteLength(content, 'latin1')} >>\nstream\n${content}\nendstream\nendobj\n`,
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
  ];

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];
  for (const object of objects) {
    offsets.push(Buffer.byteLength(pdf, 'latin1'));
    pdf += object;
  }
  const xrefOffset = Buffer.byteLength(pdf, 'latin1');
  pdf += 'xref\n0 6\n0000000000 65535 f \n';
  for (const offset of offsets) pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  pdf += `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return Buffer.from(pdf, 'latin1');
}

async function mammothDocxFixture(): Promise<Buffer> {
  const packagePath = require.resolve('mammoth/package.json');
  return readFile(join(dirname(packagePath), 'test', 'test-data', 'single-paragraph.docx'));
}

test('extractTextFromResumeBuffer: UTF-8 .txt', async () => {
  const buf = Buffer.from('Hello résumé\nline two', 'utf-8');
  const t = await extractTextFromResumeBuffer(buf, 'txt');
  assert.match(t, /résumé/);
});

test('extractTextFromResumeBuffer: extracts a real text PDF', async () => {
  const text = await extractTextFromResumeBuffer(validPdfResume(), 'pdf');
  assert.match(text, /Jane Doe Resume/);
  assert.match(text, /Database administrator/);
});

test('extractTextFromResumeBuffer: extracts a real DOCX', async () => {
  const text = await extractTextFromResumeBuffer(await mammothDocxFixture(), '.docx');
  assert.equal(text, 'Walking on imported air');
});

test('extractTextFromResumeBuffer: malformed PDF never becomes resume text', async () => {
  const rawPdf = [
    '%PDF-1.7',
    '1 0 obj',
    '<< /Type /Catalog >>',
    'stream',
    'profile={{member_full_name}}',
    'endstream',
    'endobj',
    '%%EOF',
  ].join('\n');

  await assert.rejects(() => extractTextFromResumeBuffer(Buffer.from(rawPdf), 'pdf'));
});

test('extractTextFromResumeBuffer: malformed DOCX never becomes resume text', async () => {
  const rawDocx = Buffer.from(
    'PK\u0003\u0004 [Content_Types].xml word/document.xml {{resume_text}} not really a zip',
    'utf-8',
  );
  await assert.rejects(() => extractTextFromResumeBuffer(rawDocx, 'docx'));
});

test('extractTextFromResumeBuffer: invalid UTF-8 and binary masquerading as TXT fail closed', async () => {
  await assert.rejects(() => extractTextFromResumeBuffer(Buffer.from([0xff, 0xfe, 0xfd]), 'txt'));
  await assert.rejects(() =>
    extractTextFromResumeBuffer(Buffer.from('%PDF-1.7\n1 0 obj\nstream\nbytes\nendstream\nendobj'), 'txt'),
  );
});

test('resume text safety guard rejects containers, parser output, and agent placeholders', () => {
  const parserDiagnostic = [
    'Error: Invalid PDF structure',
    'at Object.parse (webpack:///src/pdf.js:24:23)',
  ].join('\n');
  const zipContainer = 'PK [Content_Types].xml word/document.xml';

  assert.equal(isUnsafeResumePlainText('%PDF-1.7\n1 0 obj\nendobj\n%%EOF'), true);
  assert.equal(isUnsafeResumePlainText(parserDiagnostic), true);
  assert.equal(isUnsafeResumePlainText(zipContainer), true);
  assert.equal(sanitizeResumePlainText('Candidate: {{member_full_name}}\nExperience'), '');
  assert.equal(
    sanitizeResumePlainText('Jane Doe\r\nExperience\r\nStreamlined PDF workflows for staff.'),
    'Jane Doe\nExperience\nStreamlined PDF workflows for staff.',
  );
});

test('ElevenLabs boundary drops poisoned resume variables and reconciles has_resume', () => {
  const poisoned = '%PDF-1.7\n1 0 obj\nstream\n{{member_full_name}}\nendstream\nendobj\n%%EOF';
  const guarded = clampElevenLabsDynamicVariables({
    member_first_name: 'Jane',
    resume_text: poisoned,
    live_resume_draft: poisoned,
    has_resume: true,
  });

  assert.equal(guarded.member_first_name, 'Jane');
  assert.equal(guarded.resume_text, '');
  assert.equal(guarded.live_resume_draft, '');
  assert.equal(guarded.has_resume, 'false');

  const validResume = 'Jane Doe\nExperience\nDatabase administrator using SQL and PostgreSQL.';
  const valid = clampElevenLabsDynamicVariables({ resume_text: validResume, has_resume: true });
  assert.equal(valid.resume_text, validResume);
  assert.equal(valid.has_resume, 'true');
});

test('plain-text save route rejects poisoned resume data before storage', async () => {
  const route = await readFile(
    join(process.cwd(), 'app', 'api', 'member', 'resume', 'plain-text', 'route.ts'),
    'utf-8',
  );
  const sanitizeIndex = route.indexOf('sanitizeResumePlainText(raw)');
  const rejectionIndex = route.indexOf('if (raw.trim() && !safeText)');
  const uploadIndex = route.indexOf('.upload(path, plainText');

  assert.ok(sanitizeIndex >= 0);
  assert.ok(rejectionIndex > sanitizeIndex);
  assert.ok(uploadIndex > rejectionIndex);
});
