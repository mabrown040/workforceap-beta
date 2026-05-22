import { describe, expect, it } from 'vitest';
import {
  TRUST_STRIP_PLACEHOLDER_LINE,
  formatTrustStripLine,
  type TrustStripMetrics,
} from './trustStripMetrics';

describe('formatTrustStripLine', () => {
  it('returns placeholders when no live data', () => {
    const metrics: TrustStripMetrics = {
      membersPlaced: 0,
      partnerCompanies: 0,
      avgStartingWage: null,
      hasLiveData: false,
    };
    expect(formatTrustStripLine(metrics)).toBe(TRUST_STRIP_PLACEHOLDER_LINE);
  });

  it('formats live placement and wage stats without partner-company claims', () => {
    const metrics: TrustStripMetrics = {
      membersPlaced: 912,
      partnerCompanies: 43,
      avgStartingWage: 48500,
      hasLiveData: true,
    };
    expect(formatTrustStripLine(metrics)).toBe('912 members placed · $48.5K avg starting wage');
  });

  it('omits zero segments and falls back when all are empty', () => {
    const metrics: TrustStripMetrics = {
      membersPlaced: 0,
      partnerCompanies: 0,
      avgStartingWage: null,
      hasLiveData: true,
    };
    expect(formatTrustStripLine(metrics)).toBe(TRUST_STRIP_PLACEHOLDER_LINE);
  });
});
