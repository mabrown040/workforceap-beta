export type CareersLeadFieldKey =
  | 'first_name'
  | 'last_name'
  | 'email'
  | 'interest_area'
  | 'message';

export type CareersLeadErrorCode = 'required' | 'invalid_email' | 'too_short';

export type CareersLeadPayload = {
  firstName: string;
  lastName: string;
  email: string;
  interestArea?: string;
  message: string;
  roleTitle?: string;
  turnstileToken?: string;
};

const INTEREST_AREAS = new Set(['counselor', 'engineering', 'operations', 'other']);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateCareersLeadPayload(body: unknown):
  | { ok: true; data: CareersLeadPayload }
  | {
      ok: false;
      fieldErrors: Partial<Record<CareersLeadFieldKey, CareersLeadErrorCode>>;
    } {
  if (!body || typeof body !== 'object') {
    return { ok: false, fieldErrors: {} };
  }

  const o = body as Record<string, unknown>;
  const firstName = typeof o.first_name === 'string' ? o.first_name.trim() : '';
  const lastName = typeof o.last_name === 'string' ? o.last_name.trim() : '';
  const email = typeof o.email === 'string' ? o.email.trim() : '';
  const message = typeof o.message === 'string' ? o.message.trim() : '';
  const roleTitle = typeof o.role_title === 'string' ? o.role_title.trim() || undefined : undefined;
  const interestAreaRaw = typeof o.interest_area === 'string' ? o.interest_area.trim() : '';
  const interestArea = INTEREST_AREAS.has(interestAreaRaw) ? interestAreaRaw : undefined;
  const turnstileToken =
    typeof o.cf_turnstile_response === 'string' ? o.cf_turnstile_response.trim() || undefined : undefined;

  const fieldErrors: Partial<Record<CareersLeadFieldKey, CareersLeadErrorCode>> = {};

  if (!firstName) fieldErrors.first_name = 'required';
  if (!lastName) fieldErrors.last_name = 'required';
  if (!email) {
    fieldErrors.email = 'required';
  } else if (!EMAIL_RE.test(email)) {
    fieldErrors.email = 'invalid_email';
  }
  if (!message) {
    fieldErrors.message = 'required';
  } else if (message.length < 20) {
    fieldErrors.message = 'too_short';
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }

  return {
    ok: true,
    data: {
      firstName,
      lastName,
      email,
      interestArea,
      message,
      roleTitle,
      turnstileToken,
    },
  };
}
