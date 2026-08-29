import { Buffer } from 'node:buffer';
import { extractTextFromResumeBuffer } from './extractTextFromResumeBuffer';
import {
  getResumeExtractionWarning,
  hasSubstantiveResumeText,
  RESUME_TEXT_UPLOAD_ERROR,
  sanitizeResumePlainText,
} from './extractionQuality';
import { validateFileType } from './file-validation';

export const MAX_RESUME_UPLOAD_SIZE = 5 * 1024 * 1024;

export type ResumeUploadExtension = 'pdf' | 'docx' | 'txt';

export type ResumeUploadValidationErrorCode =
  | 'file_too_large'
  | 'legacy_doc_unsupported'
  | 'invalid_file_type'
  | 'resume_text_unreadable';

export class ResumeUploadValidationError extends Error {
  readonly code: ResumeUploadValidationErrorCode;

  constructor(code: ResumeUploadValidationErrorCode, message: string) {
    super(message);
    this.name = 'ResumeUploadValidationError';
    this.code = code;
  }
}

export const RESUME_UPLOAD_ERROR_MESSAGES: Record<ResumeUploadValidationErrorCode, string> = {
  file_too_large: 'File too large (max 5MB). Your previous resume was kept.',
  legacy_doc_unsupported:
    'Legacy .doc files are not supported. Save or export the file as PDF, DOCX, or TXT, then try again. Your previous resume was kept.',
  invalid_file_type:
    'Invalid file type. Upload a text-based PDF, DOCX, or TXT file. Your previous resume was kept.',
  resume_text_unreadable: RESUME_TEXT_UPLOAD_ERROR,
};

const MIME_BY_EXTENSION: Record<ResumeUploadExtension, string> = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  txt: 'text/plain',
};

const ACCEPTED_MIME_BY_EXTENSION: Record<ResumeUploadExtension, ReadonlySet<string>> = {
  pdf: new Set(['application/pdf']),
  docx: new Set([
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    // Some Windows/browser combinations report this legacy-but-common value.
    'application/zip',
  ]),
  txt: new Set(['text/plain']),
};

export interface ResumeUploadFileLike {
  name: string;
  type: string;
  size: number;
  arrayBuffer(): Promise<ArrayBuffer>;
}

export function isResumeUploadFileLike(value: unknown): value is ResumeUploadFileLike {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<ResumeUploadFileLike>;
  return typeof candidate.name === 'string'
    && typeof candidate.type === 'string'
    && typeof candidate.size === 'number'
    && Number.isFinite(candidate.size)
    && candidate.size >= 0
    && typeof candidate.arrayBuffer === 'function';
}

export interface PreparedResumeUpload {
  arrayBuffer: ArrayBuffer;
  extension: ResumeUploadExtension;
  contentType: string;
  text: string;
  extractionWarning: string | null;
}

function fail(code: ResumeUploadValidationErrorCode): never {
  throw new ResumeUploadValidationError(code, RESUME_UPLOAD_ERROR_MESSAGES[code]);
}

function extensionFromName(fileName: string): string {
  return fileName.split('.').pop()?.trim().toLowerCase() ?? '';
}

function hasCompatibleMimeType(extension: ResumeUploadExtension, mimeType: string): boolean {
  const normalized = mimeType.split(';', 1)[0]?.trim().toLowerCase() ?? '';

  // File.type is legitimately blank for some OS/browser combinations. Magic-byte
  // validation below remains authoritative in that case. Octet-stream is treated
  // the same way because browsers use it when they cannot identify a local file.
  if (!normalized || normalized === 'application/octet-stream') return true;

  return ACCEPTED_MIME_BY_EXTENSION[extension].has(normalized);
}

/**
 * Validate and safely extract a resume before any storage or profile mutation.
 *
 * Route handlers should call this function before constructing a storage client.
 * A validation error is safe to expose to the member and guarantees that no write
 * was attempted by this helper.
 */
export async function prepareResumeUpload(file: unknown): Promise<PreparedResumeUpload> {
  if (!isResumeUploadFileLike(file)) fail('invalid_file_type');
  if (file.size > MAX_RESUME_UPLOAD_SIZE) fail('file_too_large');

  const rawExtension = extensionFromName(file.name);
  if (rawExtension === 'doc') fail('legacy_doc_unsupported');
  if (rawExtension !== 'pdf' && rawExtension !== 'docx' && rawExtension !== 'txt') {
    fail('invalid_file_type');
  }

  const extension: ResumeUploadExtension = rawExtension;
  if (!hasCompatibleMimeType(extension, file.type || '')) fail('invalid_file_type');

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  if (buffer.length > MAX_RESUME_UPLOAD_SIZE) fail('file_too_large');
  if (!validateFileType(buffer, file.type || '', file.name, { allowTxt: true })) {
    fail('invalid_file_type');
  }

  let text: string;
  try {
    text = await extractTextFromResumeBuffer(buffer, extension);
  } catch {
    fail('resume_text_unreadable');
  }

  const safeText = sanitizeResumePlainText(text);
  if (!hasSubstantiveResumeText(safeText)) fail('resume_text_unreadable');

  return {
    arrayBuffer,
    extension,
    contentType: MIME_BY_EXTENSION[extension],
    text: safeText,
    extractionWarning: getResumeExtractionWarning(safeText),
  };
}
