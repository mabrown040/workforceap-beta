/**
 * When a member's connection drops mid-form, or the platform answers with an
 * HTML error page instead of JSON, the member must read one plain translated
 * sentence, never the browser's internal error text ("Failed to fetch",
 * "Unexpected token '<'"). Messages the server sent on purpose still pass
 * through, and the raw error stays in the console for debugging.
 */
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import messages from '@/messages/en.json';
import SurveyClient from '@/app/(portal)/dashboard/survey/SurveyClient';
import SkillMissionChallenge from '@/components/portal/SkillMissionChallenge';
import CourseraAccountLinkCard from '@/components/portal/CourseraAccountLinkCard';
import JobApplicationForm from '@/components/portal/JobApplicationForm';

const CONNECTION_COPY = messages.common.connectionError;
const RAW_BROWSER_TEXT = /Failed to fetch|Unexpected token|not valid JSON/;

const fetchMock = vi.fn<typeof fetch>();
let consoleError: ReturnType<typeof vi.spyOn>;

/** What Chromium rejects with when the network drops during `fetch()`. */
const droppedConnection = () => new TypeError('Failed to fetch');
/** A proxy/platform HTML 500: `res.json()` rejects with the browser's SyntaxError. */
const htmlErrorPage = () =>
  new Response('<!doctype html><html><body><h1>500 Internal Server Error</h1></body></html>', {
    status: 500,
    headers: { 'content-type': 'text/html' },
  });

function withMessages(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages} timeZone="America/New_York">
      {ui}
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

async function expectAlert(container: HTMLElement | typeof screen = screen) {
  const scope = container === screen ? screen : within(container as HTMLElement);
  await waitFor(() => expect(scope.getByRole('alert')).toBeInTheDocument());
  return scope.getByRole('alert');
}

describe('job-placement survey', () => {
  function fillAndSubmit() {
    for (const star of screen.getAllByRole('radio', { name: '5 out of 5' })) fireEvent.click(star);
    fireEvent.click(screen.getByRole('button', { name: 'Yes' }));
    fireEvent.click(screen.getByRole('button', { name: 'Submit feedback' }));
  }

  it('shows the translated connection message, not "Failed to fetch", when the connection drops', async () => {
    fetchMock.mockRejectedValue(droppedConnection());
    withMessages(<SurveyClient userId="user-1" placementId="placement-1" />);
    fillAndSubmit();
    const alert = await expectAlert();
    expect(alert).toHaveTextContent(CONNECTION_COPY);
    expect(alert.textContent).not.toMatch(RAW_BROWSER_TEXT);
    expect(consoleError).toHaveBeenCalledWith(expect.stringContaining('placement-survey'), expect.any(TypeError));
  });

  it('still shows a message the server sent on purpose', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: 'This placement has already been surveyed.' }), {
        status: 409,
        headers: { 'content-type': 'application/json' },
      }),
    );
    withMessages(<SurveyClient userId="user-1" placementId="placement-1" />);
    fillAndSubmit();
    const alert = await expectAlert();
    expect(alert).toHaveTextContent('This placement has already been surveyed.');
    expect(alert.textContent).not.toContain(CONNECTION_COPY);
  });
});

describe('skill mission scenario submission', () => {
  const mission = {
    key: 'fixture:mission:1', courseSlug: 'fixture-course', programSlug: 'fixture-program', programTitle: 'Fixture program',
    courseTitle: 'Support', missionName: 'Support practice', missionTagline: 'Practice a support case', primaryAxis: 'Service',
    skillLabels: ['Troubleshooting'], scenarioPrompt: 'Describe your support process.', evidenceHint: 'Use concrete observations.',
    quizQuestions: [{ text: 'How do you start?', options: ['Ask questions', 'Guess', 'Ignore', 'Delete'] as [string, string, string, string] }],
    estimatedMinutes: 15, status: 'ready' as const, completedAt: null, latestResult: null, aiToolResultId: null,
  };

  async function submitScenario() {
    fireEvent.change(screen.getByRole('textbox', { name: 'Your scenario response' }), {
      target: { value: 'I confirmed the details with the customer before escalating the ticket.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Submit for coaching' }));
  }

  it('maps an HTML 500 page to the translated connection message instead of "Unexpected token"', async () => {
    fetchMock.mockResolvedValue(htmlErrorPage());
    withMessages(<SkillMissionChallenge mission={mission} initialPhase={2} onClose={vi.fn()} onComplete={vi.fn()} />);
    await submitScenario();
    const alert = await expectAlert(screen.getByRole('dialog'));
    expect(alert).toHaveTextContent(CONNECTION_COPY);
    expect(alert.textContent).not.toMatch(RAW_BROWSER_TEXT);
    expect(consoleError).toHaveBeenCalledWith(expect.stringContaining('skill-mission'), expect.any(SyntaxError));
  });

  it('maps a dropped connection to the translated connection message and keeps the response', async () => {
    fetchMock.mockRejectedValue(droppedConnection());
    withMessages(<SkillMissionChallenge mission={mission} initialPhase={2} onClose={vi.fn()} onComplete={vi.fn()} />);
    await submitScenario();
    const alert = await expectAlert(screen.getByRole('dialog'));
    expect(alert).toHaveTextContent(CONNECTION_COPY);
    expect(screen.getByRole('textbox', { name: 'Your scenario response' })).toHaveValue(
      'I confirmed the details with the customer before escalating the ticket.',
    );
  });
});

describe('Coursera account link card', () => {
  it('maps an HTML error page to the translated connection message', async () => {
    fetchMock.mockResolvedValue(htmlErrorPage());
    withMessages(<CourseraAccountLinkCard portalEmail="member@example.org" initialCourseraEmail={null} />);
    fireEvent.click(screen.getByRole('button', { name: 'Save Coursera email' }));
    // This card renders its error as plain footnote copy rather than a live region.
    const notice = await screen.findByText(CONNECTION_COPY);
    expect(notice).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(RAW_BROWSER_TEXT);
    expect(consoleError).toHaveBeenCalledWith(expect.stringContaining('coursera-account-link'), expect.any(SyntaxError));
  });
});

describe('job application form', () => {
  it('maps a dropped connection from the tracker to the translated connection message', async () => {
    const onSubmit = vi.fn().mockRejectedValue(droppedConnection());
    const { container } = withMessages(<JobApplicationForm onSubmit={onSubmit} onClose={vi.fn()} />);
    fireEvent.change(container.querySelector('#jobapplicationform-job-title-field')!, { target: { value: 'Help Desk Technician' } });
    fireEvent.change(container.querySelector('#jobapplicationform-company-field')!, { target: { value: 'Probe Employer' } });
    fireEvent.change(container.querySelector('#jobapplicationform-date-applied-field')!, { target: { value: '2026-09-18' } });
    fireEvent.submit(container.querySelector('form')!);
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    const alert = await expectAlert();
    expect(alert).toHaveTextContent(CONNECTION_COPY);
    expect(alert.textContent).not.toMatch(RAW_BROWSER_TEXT);
  });
});
