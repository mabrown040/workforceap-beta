/**
 * Accessibility sweep of member-facing and public forms.
 *
 * Each block pins one markup contract: a control that a screen reader can
 * name, an error message that is announced (`role="alert"`) and tied to the
 * field it belongs to (`aria-invalid` / `aria-describedby`), or a required
 * field that is marked as such. Every assertion failed on the markup before
 * the sweep; none exercises business logic beyond what is needed to surface
 * the error state.
 */
import type { AnchorHTMLAttributes, ReactElement } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import messages from '@/messages/en.json';

vi.hoisted(() => {
  vi.stubEnv('NEXT_PUBLIC_CAPTCHA_ENABLED', 'false');
});

const navigation = vi.hoisted(() => ({ search: new URLSearchParams() }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }),
  useSearchParams: () => navigation.search,
  usePathname: () => '/en',
}));
vi.mock('next/link', () => ({
  default: ({ children, ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props}>{children}</a>,
}));
// CAPTCHA is disabled here; never load the third-party widget.
vi.mock('next/dynamic', () => ({ default: () => () => null }));
vi.mock('@/lib/analytics/events', () => ({ trackLeadFormEvent: vi.fn(), trackFunnelEvent: vi.fn() }));
vi.mock('@/components/portal/PageHeader', () => ({
  default: ({ title }: { title: string }) => <h1>{title}</h1>,
}));

import MentorSessionForm from '@/components/portal/MentorSessionForm';
import EmployerContactForm from '@/app/employers/EmployerContactForm';
import EmployerLoiForm from '@/components/employer/EmployerLoiForm';
import EmployerSignupPage from '@/app/employers/signup/page';
import CertificationAddForm from '@/components/portal/CertificationAddForm';
import PlacementSurveyForm from '@/components/forms/PlacementSurveyForm';
import InvitePage from '@/app/invite/page';
import EmployerSettingsForm from '@/components/employer/EmployerSettingsForm';
import PrivacySettingsPage from '@/app/(portal)/account/privacy/page';
import PartnerSettingsEditRequest from '@/components/partner/PartnerSettingsEditRequest';
import SignupForm from '@/app/(auth)/signup/SignupForm';

const fetchMock = vi.fn<typeof fetch>();
const droppedConnection = () => new TypeError('Failed to fetch');
const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

function withMessages(ui: ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages} timeZone="America/New_York">
      {ui}
    </NextIntlClientProvider>,
  );
}

/** Dispatches submit on the nearest form, bypassing native `required` gating. */
function submitFormOf(control: HTMLElement) {
  const form = control.closest('form');
  if (!form) throw new Error('control is not inside a form');
  fireEvent.submit(form);
}

/** The element(s) an `aria-describedby` points at, resolved from the document. */
function describedBy(control: HTMLElement): HTMLElement[] {
  const ids = (control.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean);
  return ids.map((id) => {
    const el = document.getElementById(id);
    if (!el) throw new Error(`aria-describedby points at missing id "${id}"`);
    return el;
  });
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  navigation.search = new URLSearchParams();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
afterAll(() => {
  vi.unstubAllEnvs();
});

describe('MentorSessionForm (member portal)', () => {
  it('names both controls and announces the submit failure', async () => {
    fetchMock.mockRejectedValueOnce(droppedConnection());
    render(<MentorSessionForm mentorId="mentor-1" />);

    const when = screen.getByLabelText(/preferred date and time/i);
    expect(when).toHaveAttribute('type', 'datetime-local');
    const topic = screen.getByLabelText(/topic or questions/i);
    expect(topic.tagName).toBe('TEXTAREA');

    fireEvent.change(when, { target: { value: '2030-01-01T10:00' } });
    fireEvent.change(topic, { target: { value: 'Resume review' } });
    submitFormOf(topic);

    expect(await screen.findByRole('alert')).toHaveTextContent(/something went wrong/i);
  });
});

describe('EmployerContactForm (public employer intake)', () => {
  it('announces the submit failure', async () => {
    fetchMock.mockRejectedValueOnce(droppedConnection());
    render(<EmployerContactForm />);

    submitFormOf(screen.getByLabelText(/company name/i));

    expect(await screen.findByRole('alert')).toHaveTextContent(/network error/i);
  });
});

describe('EmployerLoiForm (public letter of intent)', () => {
  it('labels the program checkbox group and announces the submit failure', async () => {
    fetchMock.mockRejectedValueOnce(droppedConnection());
    withMessages(<EmployerLoiForm />);

    const group = screen.getByRole('group', { name: /preferred programs/i });
    expect(group.querySelectorAll('input[type="checkbox"]').length).toBeGreaterThan(0);

    submitFormOf(screen.getByLabelText(/company name/i));

    expect(await screen.findByRole('alert')).toHaveTextContent(messages.common.connectionError);
  });
});

describe('employer signup page (public)', () => {
  it('ties the password rules to the field and announces the consent error', async () => {
    render(<EmployerSignupPage />);
    const password = screen.getByLabelText(/^password/i);

    submitFormOf(password);

    const rules = await screen.findByRole('alert');
    expect(rules).toHaveTextContent(/at least 8 characters/i);
    expect(password).toHaveAttribute('aria-invalid', 'true');
    expect(describedBy(password)).toContain(rules);

    fireEvent.change(password, { target: { value: 'Secret1A' } });
    submitFormOf(password);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/agree to the terms/i);
    });
    expect(password).toHaveAttribute('aria-invalid', 'false');
    expect(password).not.toHaveAttribute('aria-describedby');
  });
});

describe('CertificationAddForm (member dashboard)', () => {
  it('names the free-text name field and announces the validation error', async () => {
    render(<CertificationAddForm />);
    fireEvent.click(screen.getByRole('button', { name: /add a certificate/i }));

    const select = screen.getByRole('combobox', { name: /certificate name/i });
    fireEvent.change(select, { target: { value: 'Other' } });
    expect(screen.getByRole('textbox', { name: /certificate name/i })).toBeInTheDocument();

    submitFormOf(select);

    expect(await screen.findByRole('alert')).toHaveTextContent(/enter a certificate name/i);
  });
});

describe('PlacementSurveyForm (public + member survey)', () => {
  it('names every radio group after its visible question', () => {
    render(<PlacementSurveyForm token="survey-token" programName="Cybersecurity" />);

    expect(screen.getByRole('radiogroup', { name: /how satisfied are you with your job/i })).toBeInTheDocument();
    expect(screen.getByRole('radiogroup', { name: /how relevant was your training/i })).toBeInTheDocument();
    expect(screen.getByRole('radiogroup', { name: /counselor support/i })).toBeInTheDocument();
    const employed = screen.getByRole('radiogroup', { name: /still employed in this role/i });
    expect(employed.querySelectorAll('input[type="radio"]')).toHaveLength(2);
  });
});

describe('invite acceptance page (public)', () => {
  it('announces the accept failure', async () => {
    navigation.search = new URLSearchParams('token=invite-token');
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ valid: true, email: 'invitee@example.com', role: 'member' }))
      .mockRejectedValueOnce(droppedConnection());
    withMessages(<InvitePage />);

    const name = await screen.findByLabelText(/full name/i);
    fireEvent.change(name, { target: { value: 'Test Invitee' } });
    submitFormOf(name);

    expect(await screen.findByRole('alert')).toHaveTextContent(messages.common.connectionError);
  });
});

describe('EmployerSettingsForm (employer portal)', () => {
  it('announces a save failure as an alert, not a status', async () => {
    fetchMock.mockRejectedValueOnce(droppedConnection());
    render(
      <EmployerSettingsForm
        initial={{
          companyName: 'Acme',
          companyDescription: null,
          companyWebsite: null,
          companySize: null,
          industry: null,
          contactName: 'Contact',
          contactEmail: 'contact@example.com',
          contactPhone: null,
          logoUrl: null,
        }}
      />,
    );

    submitFormOf(screen.getByLabelText(/company name/i));

    expect(await screen.findByRole('alert')).toHaveTextContent(/network error/i);
  });
});

describe('account privacy page (member settings)', () => {
  it('announces an export failure as an alert, not a status', async () => {
    fetchMock.mockImplementation(async (input) => {
      if (String(input) === '/api/gdpr/consent') return jsonResponse({ consentCommunications: false });
      throw droppedConnection();
    });
    withMessages(<PrivacySettingsPage />);

    fireEvent.click(screen.getByRole('button', { name: messages.dashboard.privacy.exportButton }));

    expect(await screen.findByRole('alert')).toHaveTextContent(messages.dashboard.privacy.exportError);
  });
});

describe('PartnerSettingsEditRequest (partner portal)', () => {
  it('labels each field and announces the send failure', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: 'nope' }, 500));
    render(
      <PartnerSettingsEditRequest
        currentName="Org"
        currentContactName="Contact"
        currentContactEmail="org@example.com"
        currentContactPhone=""
        currentOrgType="Nonprofit"
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /request changes/i }));

    expect(screen.getByLabelText('Organization name')).toHaveValue('Org');
    expect(screen.getByLabelText('Contact name')).toHaveValue('Contact');
    expect(screen.getByLabelText('Contact email')).toHaveValue('org@example.com');
    expect(screen.getByLabelText('Contact phone')).toHaveValue('');
    expect(screen.getByLabelText('Organization type')).toHaveValue('Nonprofit');

    submitFormOf(screen.getByLabelText('Organization name'));

    expect(await screen.findByRole('alert')).toHaveTextContent(/could not send your request/i);
  });
});

describe('member SignupForm (public)', () => {
  it('marks the required fields as required', () => {
    withMessages(<SignupForm />);

    expect(screen.getByLabelText('Full Name')).toBeRequired();
    expect(screen.getByLabelText('Email')).toBeRequired();
    expect(screen.getByLabelText('Password', { exact: true })).toBeRequired();
    expect(screen.getByLabelText('Program of Interest')).toBeRequired();
    expect(screen.getByRole('checkbox', { name: /terms of service/i })).toBeRequired();
    // Optional fields stay optional.
    expect(screen.getByLabelText('Employment Status')).not.toBeRequired();
  });
});
