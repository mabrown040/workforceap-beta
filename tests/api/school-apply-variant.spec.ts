import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';

describe('school apply variant', () => {
  const client = readFileSync(
    path.resolve(__dirname, '../../app/apply/ApplyEligibilityClient.tsx'),
    'utf-8',
  );
  const applyPage = readFileSync(path.resolve(__dirname, '../../app/apply/page.tsx'), 'utf-8');
  const organic = readFileSync(
    path.resolve(__dirname, '../../app/apply/OrganicApplyPage.tsx'),
    'utf-8',
  );
  const enroll = readFileSync(
    path.resolve(__dirname, '../../components/marketing/PartnerSchoolEnrollPage.tsx'),
    'utf-8',
  );
  const results = readFileSync(
    path.resolve(__dirname, '../../app/apply/results/ApplyResultsClient.tsx'),
    'utf-8',
  );

  it('hides income, employment, county, and barrier questions when school', () => {
    expect(client).toContain('const isSchool = Boolean(schoolApply)');
    expect(client).toContain('{!isSchool ? (');
    expect(client).toContain('className="funding-questions"');
    expect(client).toContain("guardianRequired = isSchool && schoolGuardianRequired(ageGroup)");
    expect(client).toContain('schoolPrimaryBarriers()');
    expect(client).toContain('schoolDetailsComplete');
    expect(client).not.toMatch(/Parent \/ guardian name \*/);
  });

  it('lets the school variant win over the paid UTM apply page', () => {
    expect(applyPage).toContain('if (paidUtmSource && !schoolApply)');
    expect(applyPage).toContain('schoolApply={schoolApply}');
  });

  it('uses student hero, docs, and next-step copy instead of adult funding copy', () => {
    expect(organic).toContain("t('schoolHeroHeading')");
    expect(organic).toContain("t('schoolDocsLead')");
    expect(organic).toContain('school={isSchool}');
    expect(organic).toContain('{isSchool ? null : <TrustStrip variant="apply" />}');
  });

  it('does not tell students the application asks about income and employment', () => {
    expect(enroll).toContain('What do I need to apply?');
    expect(enroll).toContain('We do not ask about jobs or household income');
    expect(enroll).not.toContain('The application asks about income and employment');
  });

  it('replaces the funding-fit banner on program ranking for school applicants', () => {
    expect(results).toContain('schoolResultsSponsoredStrong');
    expect(results).toContain('schoolFlow ? true : data.qualifies === true');
  });
});
