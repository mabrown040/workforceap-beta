import { describe, it, expect } from 'vitest';
import { getProfileCompleteness, getProfileMissingFields } from '@/lib/resume/profileCompleteness';

describe('getProfileCompleteness', () => {
  it('returns 0 when both profile and user are null', () => {
    expect(getProfileCompleteness(null, null)).toBe(0);
  });

  it('returns 0 when profile is null and user has no fields', () => {
    expect(getProfileCompleteness(null, {})).toBe(0);
  });

  it('returns 100 when all fields are present', () => {
    const profile = {
      profilePhone: '555-1234',
      profileAddress: '123 Main St',
      profileLinkedin: 'linkedin.com/in/test',
      profileBio: 'I am a test user',
      employmentStatus: 'employed',
      educationLevel: 'bachelors',
    };
    const user = {
      fullName: 'Test User',
      email: 'test@example.com',
      enrolledProgram: 'cyber',
      assessmentCompleted: true,
    };
    expect(getProfileCompleteness(profile, user)).toBe(100);
  });

  it('counts fullName from user', () => {
    expect(getProfileCompleteness(null, { fullName: 'Test' })).toBe(10);
  });

  it('counts email from user', () => {
    expect(getProfileCompleteness(null, { email: 'test@example.com' })).toBe(10);
  });

  it('counts enrolledProgram from user', () => {
    expect(getProfileCompleteness(null, { enrolledProgram: 'cyber' })).toBe(10);
  });

  it('counts assessmentCompleted from user', () => {
    expect(getProfileCompleteness(null, { assessmentCompleted: true })).toBe(10);
  });

  it('does not count assessmentCompleted when false', () => {
    expect(getProfileCompleteness(null, { assessmentCompleted: false })).toBe(0);
  });

  it('counts profile fields from profile object', () => {
    const profile = {
      profilePhone: '555-1234',
      profileAddress: '123 Main St',
      profileLinkedin: 'linkedin.com/in/test',
      profileBio: 'Bio',
      employmentStatus: 'employed',
      educationLevel: 'bachelors',
    };
    expect(getProfileCompleteness(profile, null)).toBe(60);
  });

  it('ignores whitespace-only values', () => {
    const profile = {
      profilePhone: '   ',
      profileAddress: '',
      profileLinkedin: '\t',
    };
    expect(getProfileCompleteness(profile, null)).toBe(0);
  });

  it('calculates partial completeness correctly', () => {
    const profile = {
      profilePhone: '555-1234',
      profileAddress: null,
      profileLinkedin: 'linkedin.com/in/test',
      profileBio: null,
      employmentStatus: 'employed',
      educationLevel: null,
    };
    const user = {
      fullName: 'Test User',
      email: null,
      enrolledProgram: 'cyber',
      assessmentCompleted: null,
    };
    expect(getProfileCompleteness(profile, user)).toBe(50);
  });

  it('handles undefined values', () => {
    const profile = {
      profilePhone: undefined,
      profileAddress: undefined,
      profileLinkedin: undefined,
      profileBio: undefined,
      employmentStatus: undefined,
      educationLevel: undefined,
    };
    const user = {
      fullName: undefined,
      email: undefined,
      enrolledProgram: undefined,
      assessmentCompleted: undefined,
    };
    expect(getProfileCompleteness(profile, user)).toBe(0);
  });
});

describe('getProfileMissingFields', () => {
  it('returns all fields when everything is empty', () => {
    expect(getProfileMissingFields(null, null)).toEqual([
      'full name',
      'email',
      'phone',
      'address',
      'LinkedIn',
      'bio',
      'employment status',
      'education level',
      'enrolled program',
      'skills assessment',
    ]);
  });

  it('returns empty array when all fields present', () => {
    const profile = {
      profilePhone: '555-1234',
      profileAddress: '123 Main St',
      profileLinkedin: 'linkedin.com/in/test',
      profileBio: 'Bio',
      employmentStatus: 'employed',
      educationLevel: 'bachelors',
    };
    const user = {
      fullName: 'Test User',
      email: 'test@example.com',
      enrolledProgram: 'cyber',
      assessmentCompleted: true,
    };
    expect(getProfileMissingFields(profile, user)).toEqual([]);
  });

  it('returns only missing fields', () => {
    const profile = {
      profilePhone: '555-1234',
      profileAddress: null,
      profileLinkedin: 'linkedin.com/in/test',
      profileBio: null,
      employmentStatus: 'employed',
      educationLevel: null,
    };
    const user = {
      fullName: 'Test User',
      email: null,
      enrolledProgram: 'cyber',
      assessmentCompleted: null,
    };
    expect(getProfileMissingFields(profile, user)).toEqual([
      'email',
      'address',
      'bio',
      'education level',
      'skills assessment',
    ]);
  });
});
