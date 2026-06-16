import { describe, expect, it } from 'vitest';
import {
  GOOGLE_IT_COMPLETION_RATE_MIN_ENROLLMENTS,
  GOOGLE_IT_PLACEMENT_RATE_MIN_ENROLLMENTS,
  buildGoogleItPublicMetricCards,
  type GoogleItLandingMetrics,
} from './googleItSupportLanding';

const baseMetrics: GoogleItLandingMetrics = {
  enrollmentCount: 0,
  completionCount: 0,
  placementCount: 0,
  hasLiveData: false,
  asOfLabel: 'No reliable program outcomes available yet',
};

describe('buildGoogleItPublicMetricCards', () => {
  it('returns no public trust cards when live outcomes are unavailable', () => {
    expect(buildGoogleItPublicMetricCards(baseMetrics)).toEqual([]);
  });

  it('shows enrollment count but suppresses unreliable completion and placement rates', () => {
    const cards = buildGoogleItPublicMetricCards({
      ...baseMetrics,
      enrollmentCount: GOOGLE_IT_COMPLETION_RATE_MIN_ENROLLMENTS - 1,
      completionCount: 4,
      placementCount: 3,
      hasLiveData: true,
    });

    expect(cards).toEqual([
      {
        key: 'enrollment',
        label: 'Current enrollments',
        value: '9',
        detail: 'Learners enrolled in the IT support pathway.',
      },
    ]);
  });

  it('shows completion and placement rates only after methodology thresholds are met', () => {
    const cards = buildGoogleItPublicMetricCards({
      ...baseMetrics,
      enrollmentCount: GOOGLE_IT_PLACEMENT_RATE_MIN_ENROLLMENTS,
      completionCount: 18,
      placementCount: 12,
      hasLiveData: true,
    });

    expect(cards).toEqual([
      {
        key: 'enrollment',
        label: 'Current enrollments',
        value: '40',
        detail: 'Learners enrolled in the IT support pathway.',
      },
      {
        key: 'completion',
        label: 'Completion rate',
        value: '45%',
        detail: 'Members with completed program progress divided by enrollments.',
      },
      {
        key: 'placement',
        label: 'Placement rate',
        value: '30%',
        detail: 'Verified placement records divided by enrollments.',
      },
    ]);
  });
});
