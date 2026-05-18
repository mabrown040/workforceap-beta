// Strong resume action verbs. Lowercase. First-token check.
// Curated against common ATS keyword lists + Harvard / Wharton career-center guides.
// Weak/passive verbs ("responsible", "helped", "worked", "tasked", "assisted") not included.
export const ACTION_VERBS = new Set<string>([
  'accelerated', 'achieved', 'acquired', 'activated', 'adapted', 'advised', 'advocated', 'analyzed',
  'architected', 'arranged', 'audited', 'authored', 'authorized', 'automated', 'awarded',
  'benchmarked', 'boosted', 'budgeted', 'built',
  'captured', 'centralized', 'chaired', 'championed', 'closed', 'coached', 'collaborated', 'commissioned',
  'compiled', 'completed', 'composed', 'conceived', 'condensed', 'conducted', 'configured', 'consolidated',
  'constructed', 'consulted', 'converted', 'coordinated', 'created', 'cultivated', 'curated', 'cut',
  'decreased', 'defined', 'delivered', 'demonstrated', 'deployed', 'designed', 'developed', 'devised',
  'diagnosed', 'directed', 'discovered', 'doubled', 'drafted', 'drove',
  'earned', 'edited', 'educated', 'elevated', 'eliminated', 'enabled', 'engineered', 'enhanced',
  'ensured', 'established', 'evaluated', 'examined', 'executed', 'expanded', 'expedited', 'exceeded',
  'facilitated', 'forecasted', 'forged', 'formulated', 'founded',
  'generated', 'governed', 'grew', 'guided',
  'halved', 'headed', 'hired',
  'identified', 'implemented', 'improved', 'increased', 'influenced', 'initiated', 'innovated',
  'inspected', 'inspired', 'instituted', 'integrated', 'interviewed', 'introduced', 'invented',
  'invested', 'investigated', 'issued',
  'launched', 'led', 'leveraged', 'lifted',
  'managed', 'mapped', 'marketed', 'maximized', 'measured', 'mediated', 'mentored', 'merged',
  'migrated', 'minimized', 'mobilized', 'modeled', 'modernized', 'monitored', 'motivated',
  'navigated', 'negotiated',
  'operated', 'optimized', 'orchestrated', 'organized', 'originated', 'outpaced', 'overhauled', 'oversaw',
  'partnered', 'persuaded', 'piloted', 'pioneered', 'planned', 'positioned', 'prepared', 'presented',
  'prevented', 'prioritized', 'processed', 'procured', 'produced', 'programmed', 'promoted', 'proposed',
  'prospected', 'prototyped', 'proved', 'published',
  'qualified', 'quantified',
  'raised', 'ranked', 'recommended', 'reconciled', 'recruited', 'redesigned', 'reduced', 'refined',
  'refactored', 'reimagined', 'renegotiated', 'reorganized', 'repaired', 'replaced', 'replicated',
  'researched', 'resolved', 'restored', 'restructured', 'retained', 'revamped', 'reviewed', 'revitalized',
  'saved', 'scaled', 'scheduled', 'screened', 'secured', 'segmented', 'selected', 'served', 'shaped',
  'shipped', 'simplified', 'sold', 'solved', 'sourced', 'spearheaded', 'specified', 'standardized',
  'steered', 'streamlined', 'strengthened', 'structured', 'surpassed', 'supervised', 'synthesized',
  'taught', 'targeted', 'tested', 'tracked', 'trained', 'transformed', 'translated', 'tripled',
  'unified', 'updated', 'upgraded', 'utilized',
  'validated', 'verified',
  'won', 'wrote',
]);

// Weak/diluting first verbs we flag specifically.
export const WEAK_VERBS = new Set<string>([
  'responsible', 'helped', 'worked', 'tasked', 'assisted', 'participated',
  'supported', 'contributed', 'involved', 'engaged', 'handled', 'attended',
]);
