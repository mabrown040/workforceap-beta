import { NextResponse } from 'next/server';
import { LabWorkspaceError } from './labWorkspace';
import { LAB_MAX_REQUEST_LENGTH } from './labWorkspaceTypes';

export const LAB_PRIVATE_HEADERS = { 'Cache-Control': 'private, no-store' };
const MESSAGES = {
  FORBIDDEN: 'This evidence is not available to your account.',
  LAB_NOT_AVAILABLE: 'This lab is not part of your current assignment.',
  DRAFT_CONFLICT: 'A newer draft was saved. Reload the saved version before trying again. Your current edits have not been saved.',
  CONTENT_CHANGED: 'The lab content changed. Reload before saving. Your current edits have not been saved.',
  INVALID_EVIDENCE: 'Use only the lab deliverables and complete each answer before submitting.',
  ALREADY_SUBMITTED: 'This evidence has already been submitted. You can submit another revision after revision is requested.',
  REVIEW_CONFLICT: 'This submission has changed or already been reviewed. Reload before reviewing.',
  INVALID_REVIEW: 'Score each rubric criterion once. Request revision if any criterion is below 2.',
  WORKSPACE_UNAVAILABLE: 'The lab workspace is unavailable. Your changes were not saved. Please try again.',
};
export function labJson(data: unknown, status = 200) { return NextResponse.json(data, { status, headers: LAB_PRIVATE_HEADERS }); }
export function labFailure(error: unknown) {
  if (error instanceof LabWorkspaceError) return labJson({ error: MESSAGES[error.code], code: error.code }, error.status);
  console.error('[lab-evidence] Operation unavailable.');
  return labJson({ error: 'The lab workspace is unavailable. Your changes were not saved. Please try again.' }, 503);
}
export function requireLabMutationOrigin(request: Request): Response | null {
  const origin = request.headers.get('origin');
  if (!origin || origin !== new URL(request.url).origin || request.headers.get('sec-fetch-site') === 'cross-site') {
    return labJson({ error: 'This request must come from the current site.' }, 403);
  }
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) return labJson({ error: 'Use a JSON request.' }, 415);
  return null;
}
export async function readLabJson(request: Request): Promise<{ body: unknown } | { response: Response }> {
  if (Number(request.headers.get('content-length')) > LAB_MAX_REQUEST_LENGTH) return { response: labJson({ error: 'Request is too large.' }, 413) };
  try {
    const text = await request.text();
    if (text.length > LAB_MAX_REQUEST_LENGTH) return { response: labJson({ error: 'Request is too large.' }, 413) };
    return { body: JSON.parse(text) };
  } catch { return { response: labJson({ error: 'Invalid JSON.' }, 400) }; }
}
