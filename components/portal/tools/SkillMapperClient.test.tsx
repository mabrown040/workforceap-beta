import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import SkillMapperClient from './SkillMapperClient';

vi.mock('./ToolFollowThrough', () => ({ default: () => null }));

const MEMBER_PROFILE = [
  { axis: 'Analytics', value: 0.4 },
  { axis: 'Engineering', value: 0.3 },
  { axis: 'Design', value: 0.2 },
  { axis: 'Strategy', value: 0.5 },
  { axis: 'Service', value: 0.6 },
  { axis: 'Research', value: 0.25 },
];

const SOFTWARE_RADAR = [
  { axis: 'Analytics', value: 80 },
  { axis: 'Engineering', value: 90 },
  { axis: 'Design', value: 40 },
  { axis: 'Strategy', value: 50 },
  { axis: 'Service', value: 45 },
  { axis: 'Research', value: 60 },
];

const SECURITY_RADAR = [
  { axis: 'Analytics', value: 70 },
  { axis: 'Engineering', value: 75 },
  { axis: 'Design', value: 30 },
  { axis: 'Strategy', value: 55 },
  { axis: 'Service', value: 40 },
  { axis: 'Research', value: 65 },
];

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function mockSkillMapperFetch(options?: { emptyProfile?: boolean; noOccupations?: boolean }) {
  vi.mocked(fetch).mockImplementation(async (input) => {
    const url = String(input);
    if (url.includes('/api/member/skill-profile')) {
      return jsonResponse({
        skillProfile: options?.emptyProfile ? MEMBER_PROFILE.map((axis) => ({ ...axis, value: 0 })) : MEMBER_PROFILE,
        certNames: [],
        resumeSkills: [],
        hasInterestProfiler: true,
        hasAiResumeExtraction: true,
      });
    }
    if (url.includes('occupation=')) {
      if (options?.noOccupations) {
        return jsonResponse({ occupations: [], demo: true });
      }
      return jsonResponse({
        occupations: [
          { code: '15-1252.00', title: 'Software Developers', description: 'Develop applications.' },
          { code: '15-1212.00', title: 'Information Security Analysts', description: 'Protect systems.' },
        ],
      });
    }
    if (url.includes('code=15-1212.00')) {
      return jsonResponse({
        radarAxes: SECURITY_RADAR,
        skills: [{ name: 'Security Analysis', score: 88, category: 'skill' }],
      });
    }
    if (url.includes('code=')) {
      return jsonResponse({
        radarAxes: SOFTWARE_RADAR,
        skills: [{ name: 'Programming', score: 90, category: 'skill' }],
      });
    }
    return jsonResponse({});
  });
}

async function searchOccupation(query = 'software developer') {
  fireEvent.change(screen.getByLabelText('Search an occupation'), { target: { value: query } });
  fireEvent.click(screen.getByRole('button', { name: 'Search' }));
}

describe('SkillMapperClient auto-compare', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    vi.stubGlobal(
      'matchMedia',
      vi.fn((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('compares the first search result to current skills without a Compare click', async () => {
    mockSkillMapperFetch();
    render(<SkillMapperClient />);

    await waitFor(() => expect(fetch).toHaveBeenCalledWith('/api/member/skill-profile'));
    await searchOccupation();

    const panel = await screen.findByTestId('skill-mapper-compare-panel');
    expect(within(panel).getByRole('heading', { name: /your skills vs\. software developers/i })).toBeInTheDocument();
    expect(within(panel).getByText(/compared automatically from this search/i)).toBeInTheDocument();
    expect(within(panel).getByText('Skill gaps to close')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /compare with my profile/i })).not.toBeInTheDocument();
    expect(within(panel).getByRole('button', { name: /open full comparison/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /software developers/i })).toHaveAttribute('aria-pressed', 'true');
  });

  it('updates the side comparison when another occupation is chosen', async () => {
    mockSkillMapperFetch();
    render(<SkillMapperClient />);
    await waitFor(() => expect(fetch).toHaveBeenCalledWith('/api/member/skill-profile'));
    await searchOccupation();
    await screen.findByTestId('skill-mapper-compare-panel');

    fireEvent.click(screen.getByRole('button', { name: /information security analysts/i }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /your skills vs\. information security analysts/i })).toBeInTheDocument();
    });
  });

  it('still shows the side panel when the member has no skill profile yet', async () => {
    mockSkillMapperFetch({ emptyProfile: true });
    render(<SkillMapperClient />);
    await waitFor(() => expect(fetch).toHaveBeenCalledWith('/api/member/skill-profile'));
    await searchOccupation();

    const panel = await screen.findByTestId('skill-mapper-compare-panel');
    expect(within(panel).getByText(/we do not have a skill profile for you yet/i)).toBeInTheDocument();
    expect(within(panel).getByRole('link', { name: /take the interest profiler/i })).toHaveAttribute(
      'href',
      '/dashboard/learning/interest-profiler',
    );
  });

  it('auto-compares demo fallback data when search returns no occupations', async () => {
    mockSkillMapperFetch({ noOccupations: true });
    render(<SkillMapperClient />);
    await waitFor(() => expect(fetch).toHaveBeenCalledWith('/api/member/skill-profile'));
    await searchOccupation('unknown role');

    const panel = await screen.findByTestId('skill-mapper-compare-panel');
    expect(within(panel).getByRole('heading', { name: /your skills vs\./i })).toBeInTheDocument();
    expect(screen.getByText(/demo mode/i)).toBeInTheDocument();
  });
});
