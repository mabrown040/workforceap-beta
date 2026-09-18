/**
 * ZIP / county → nearest American Job Center (one-stop) guidance.
 *
 * Texas boards are curated from public Workforce Solutions directories so the
 * apply form can name a local office without a live DOL lookup. Every result
 * also includes the CareerOneStop finder for confirmation / other states.
 */

export type WorkforceCenterMatch = {
  board: string;
  office: string;
  city: string;
  phone?: string;
  website: string;
  county?: string;
  finderUrl: string;
};

type BoardRecord = {
  board: string;
  office: string;
  city: string;
  phone?: string;
  website: string;
  counties: readonly string[];
  zip3: readonly string[];
};

const CAREERONESTOP_FINDER =
  'https://www.careeronestop.org/LocalHelp/AmericanJobCenters/find-american-job-centers.aspx';

const TEXAS_BOARDS: readonly BoardRecord[] = [
  {
    board: 'Workforce Solutions Capital Area',
    office: 'Workforce Solutions Capital Area Career Center',
    city: 'Austin',
    phone: '(512) 597-7100',
    website: 'https://www.wfscapitalarea.com',
    counties: ['travis'],
    zip3: ['787'],
  },
  {
    board: 'Workforce Solutions Rural Capital Area',
    office: 'Workforce Solutions Rural Capital Area',
    city: 'Round Rock',
    phone: '(512) 244-2218',
    website: 'https://www.workforcesolutionsrca.com',
    counties: ['williamson', 'hays', 'bastrop', 'caldwell', 'blanco', 'burnet', 'fayette', 'lee', 'llano'],
    zip3: ['786'],
  },
  {
    board: 'Workforce Solutions Gulf Coast',
    office: 'Workforce Solutions Gulf Coast Career Office',
    city: 'Houston',
    website: 'https://www.wrksolutions.com',
    counties: ['harris', 'fort bend', 'galveston', 'brazoria', 'montgomery', 'liberty', 'chambers', 'walker', 'wharton', 'austin', 'colorado', 'waller'],
    zip3: ['770', '771', '772', '773', '774', '775'],
  },
  {
    board: 'Workforce Solutions Alamo',
    office: 'Workforce Solutions Alamo Career Center',
    city: 'San Antonio',
    website: 'https://www.workforcesolutionsalamo.org',
    counties: ['bexar', 'comal', 'guadalupe', 'wilson', 'kendall', 'bandera', 'medina', 'atascosa', 'karnes', 'wilson'],
    zip3: ['782', '781'],
  },
  {
    board: 'Workforce Solutions Greater Dallas',
    office: 'Workforce Solutions Greater Dallas',
    city: 'Dallas',
    website: 'https://www.wfsdallas.com',
    counties: ['dallas'],
    zip3: ['752', '753'],
  },
  {
    board: 'Workforce Solutions Tarrant County',
    office: 'Workforce Solutions Tarrant County',
    city: 'Fort Worth',
    website: 'https://workforcesolutionstarrantcounty.com',
    counties: ['tarrant'],
    zip3: ['760', '761'],
  },
  {
    board: 'Workforce Solutions Central Texas',
    office: 'Workforce Solutions Central Texas',
    city: 'Temple',
    website: 'https://www.workforcesolutionsctx.com',
    counties: ['bell', 'coryell', 'lampasas', 'milam', 'mills', 'san saba', 'hamilton'],
    zip3: ['765'],
  },
  {
    board: 'Workforce Solutions Greater Austin / North Texas',
    office: 'Workforce Solutions North Central Texas',
    city: 'Arlington',
    website: 'https://dfwjobs.com',
    counties: ['collin', 'denton', 'ellis', 'hood', 'johnson', 'kaufman', 'parker', 'rockwall', 'somervell', 'wise'],
    zip3: ['750', '751', '762'],
  },
  {
    board: 'Workforce Solutions Lower Rio Grande Valley',
    office: 'Workforce Solutions Lower Rio Grande Valley',
    city: 'McAllen',
    website: 'https://www.wfsolutions.org',
    counties: ['hidalgo', 'starr', 'willacy'],
    zip3: ['785'],
  },
  {
    board: 'Workforce Solutions Cameron',
    office: 'Workforce Solutions Cameron',
    city: 'Brownsville',
    website: 'https://www.wfscameron.org',
    counties: ['cameron'],
    zip3: ['785'],
  },
  {
    board: 'Workforce Solutions Borderplex',
    office: 'Workforce Solutions Borderplex',
    city: 'El Paso',
    website: 'https://www.borderplexjobs.com',
    counties: ['el paso', 'hudspeth', 'culberson'],
    zip3: ['799', '798'],
  },
  {
    board: 'Workforce Solutions Coastal Bend',
    office: 'Workforce Solutions Coastal Bend',
    city: 'Corpus Christi',
    website: 'https://www.southtexasworkforce.org',
    counties: ['nueces', 'san patricio', 'aransas', 'bee', 'live oak', 'refugio', 'jim wells'],
    zip3: ['784', '783'],
  },
] as const;

function normalizeCounty(county: string | null | undefined): string {
  return (county ?? '').trim().toLowerCase().replace(/\s+county$/i, '');
}

function zip3Of(zip: string | null | undefined): string {
  return (zip ?? '').replace(/\D/g, '').slice(0, 3);
}

export function careerOneStopFinderUrl(zip?: string | null): string {
  const digits = (zip ?? '').replace(/\D/g, '').slice(0, 5);
  const params = new URLSearchParams();
  if (digits.length >= 5) params.set('location', digits);
  params.set('radius', '25');
  return `${CAREERONESTOP_FINDER}?${params.toString()}`;
}

export function lookupWorkforceCenter(input: {
  zip?: string | null;
  county?: string | null;
  state?: string | null;
}): WorkforceCenterMatch | null {
  const county = normalizeCounty(input.county);
  const prefix = zip3Of(input.zip);
  const state = (input.state ?? '').trim().toUpperCase();
  const inTexas = !state || state === 'TX' || state === 'TEXAS';

  if (inTexas) {
    const byCounty = county
      ? TEXAS_BOARDS.find((board) => board.counties.includes(county))
      : undefined;
    const byZip = prefix.length === 3 ? TEXAS_BOARDS.find((board) => board.zip3.includes(prefix)) : undefined;
    const board = byCounty ?? byZip;
    if (board) {
      return {
        board: board.board,
        office: board.office,
        city: board.city,
        phone: board.phone,
        website: board.website,
        county: county || undefined,
        finderUrl: careerOneStopFinderUrl(input.zip),
      };
    }
  }

  if ((input.zip ?? '').replace(/\D/g, '').length >= 5) {
    return {
      board: 'American Job Center (U.S. Department of Labor one-stop)',
      office: 'Find your local workforce center',
      city: '',
      website: careerOneStopFinderUrl(input.zip),
      finderUrl: careerOneStopFinderUrl(input.zip),
    };
  }

  return null;
}

export function workforceCenterPlainLine(match: WorkforceCenterMatch | null): string | null {
  if (!match) return null;
  const where = match.city ? ` in ${match.city}` : '';
  const phone = match.phone ? ` · ${match.phone}` : '';
  return `Nearest workforce / one-stop center: ${match.board} (${match.office}${where})${phone}`;
}
