/**
 * Board-submitted occupation classifications and their operational O*NET-SOC
 * equivalents.
 *
 * EDvera/board records are compliance evidence and must not be silently
 * rewritten when O*NET changes a code. Runtime career tools, however, must use
 * codes that the current O*NET data service recognizes. Keeping both values in
 * one source of truth makes that boundary explicit.
 */
export type ProgramOccupationAlignment = {
  programSlug: string;
  board: {
    primaryOnetSocCode: string;
    secondaryOnetSocCodes: readonly string[];
  };
  operational: {
    primaryOnetSocCode: string;
    secondaryOnetSocCodes: readonly string[];
  };
  boardToOperationalCode: Readonly<Record<string, string>>;
};

export const REVISED_PROGRAM_OCCUPATION_ALIGNMENT = {
  managementAnalyst: {
    programSlug: 'data-analytics-professional-certificate-google',
    board: {
      primaryOnetSocCode: '13-1111.00',
      secondaryOnetSocCodes: ['13-1161.00'],
    },
    operational: {
      primaryOnetSocCode: '13-1111.00',
      secondaryOnetSocCodes: ['13-1161.00'],
    },
    boardToOperationalCode: {},
  },
  databaseAdministrator: {
    programSlug: 'data-science-professional-certificate-ibm',
    board: {
      // Preserve the exact Capital Area/EDvera submission classification.
      primaryOnetSocCode: '15-1245.00',
      secondaryOnetSocCodes: ['15-1243.00'],
    },
    operational: {
      // Current O*NET-SOC splits Database Administrators into 15-1242.00.
      primaryOnetSocCode: '15-1242.00',
      secondaryOnetSocCodes: ['15-1243.00'],
    },
    boardToOperationalCode: {
      '15-1245.00': '15-1242.00',
    },
  },
} as const satisfies Record<string, ProgramOccupationAlignment>;
