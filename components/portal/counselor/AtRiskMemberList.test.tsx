import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { getProgramBySlug } from '@/lib/content/programs';
import AtRiskMemberList from './AtRiskMemberList';

describe('AtRiskMemberList program label', () => {
  it('prints a humanised title for an unknown slug and the catalog title for the IBM alias', () => {
    const aws = getProgramBySlug('ai-practitioner-professional-certificate-aws');
    expect(aws).toBeTruthy();
    render(
      <AtRiskMemberList
        members={[
          { memberId: 'm1', riskScore: 82, riskLevel: 'CRITICAL', enrolledProgram: 'google-it-support-certificate' },
          { memberId: 'm2', riskScore: 61, riskLevel: 'HIGH', enrolledProgram: 'ai-professional-developer-certificate-ibm' },
          { memberId: 'm3', riskScore: 40, riskLevel: 'MEDIUM', enrolledProgram: null },
        ]}
      />,
    );
    expect(screen.getByText('Google IT Support Certificate')).toBeInTheDocument();
    expect(screen.queryByText('google-it-support-certificate')).toBeNull();
    expect(screen.getByText(aws!.title)).toBeInTheDocument();
    expect(screen.getByText('No program')).toBeInTheDocument();
  });
});
