import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  HearAboutSelectOptions,
  PartnerReferralSelectOptions,
} from '@/components/apply/HearAboutSelectOptions';

describe('hear-about and partner referral dropdowns', () => {
  it('populates grouped hear-about options with named partners first', () => {
    const { container } = render(
      <select>
        <HearAboutSelectOptions />
      </select>,
    );
    const options = [...container.querySelectorAll('option')].map((el) => el.textContent);
    const groups = [...container.querySelectorAll('optgroup')].map((el) => el.getAttribute('label'));

    expect(options[0]).toBe('Launch Pad Job Club');
    expect(options).toContain('Purpose Works / Job Seekers Network');
    expect(options).toContain('Workforce Solutions Capital Area');
    expect(options).toContain('Workforce Solutions Rural Capital Area');
    expect(options).toContain('Other / write in');
    expect(groups).toEqual([
      'Partners & workforce centers',
      'Community organizations',
      'Other sources',
    ]);
  });

  it('populates the partner/ambassador dropdown from the 8/24 list', () => {
    const { container } = render(
      <select>
        <PartnerReferralSelectOptions />
      </select>,
    );
    const options = [...container.querySelectorAll('option')].map((el) => el.textContent);
    expect(options).toEqual([
      'Launch Pad Job Club',
      'Purpose Works / Job Seekers Network',
      'Workforce Solutions Capital Area',
      'Workforce Solutions Rural Capital Area',
      'Other Partner (write in)',
      'Community Ambassador (write in)',
    ]);
  });
});
