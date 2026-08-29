/**
 * Training Bridge — curated static mapping: target occupation → required
 * skills → which WAP pathway (program) covers them.
 *
 * Phase 1 is fully deterministic: no LLM calls, no schema changes. Required
 * skills are curated from O*NET occupation profiles; pathway coverage comes
 * from the program catalog (lib/content/programs.ts) and the 2026 syllabi.
 * The member's Skill Mapper output (saved AIToolResult of type
 * `skill_assessment`) is matched against `matchTerms` to find what is
 * already covered vs. still missing.
 */
import { getProgramBySlug, type Program } from '@/lib/content/programs';
import {
  REVISED_PROGRAM_OCCUPATION_ALIGNMENT,
  type ProgramOccupationAlignment,
} from '@/lib/content/programOccupationAlignment';

export type BridgeSkill = {
  /** Plain-language skill name shown to members (8th-grade reading level). */
  name: string;
  /**
   * Lowercase terms matched (substring, case-insensitive) against the
   * member's Skill Mapper skill names to decide whether they already have it.
   */
  matchTerms: string[];
};

export type BridgeOccupation = {
  id: string;
  /** Plain-language target job title. */
  occupationTitle: string;
  /** O*NET-SOC code prefixes that map to this target job (e.g. "15-1232"). */
  onetCodePrefixes: string[];
  /** Board-submitted codes, retained separately from live O*NET routing. */
  boardClassification?: ProgramOccupationAlignment['board'];
  /** Lowercase keywords matched against a saved occupation title. */
  titleKeywords: string[];
  /** Skills employers expect for this job. */
  requiredSkills: BridgeSkill[];
  /** WAP pathway (program catalog slug) that teaches these skills. */
  programSlug: string;
  /** Names from `requiredSkills` that the pathway covers. */
  pathwayCovers: string[];
};

const skill = (name: string, matchTerms: string[]): BridgeSkill => ({ name, matchTerms });

const MANAGEMENT_ALIGNMENT = REVISED_PROGRAM_OCCUPATION_ALIGNMENT.managementAnalyst;
const DBA_ALIGNMENT = REVISED_PROGRAM_OCCUPATION_ALIGNMENT.databaseAdministrator;

export const TRAINING_BRIDGE_OCCUPATIONS: BridgeOccupation[] = [
  {
    id: 'it-support-specialist',
    occupationTitle: 'IT Support Specialist',
    onetCodePrefixes: ['15-1232'],
    titleKeywords: ['it support', 'help desk', 'computer user support', 'desktop support', 'technical support'],
    requiredSkills: [
      skill('Help desk basics', ['help desk', 'service desk', 'support']),
      skill('Computer hardware', ['hardware', 'computers and electronics', 'equipment']),
      skill('Operating systems', ['operating system', 'windows', 'linux', 'software']),
      skill('Troubleshooting', ['troubleshoot', 'problem', 'repairing', 'complex problem solving']),
      skill('Customer service', ['customer', 'service orientation', 'active listening']),
    ],
    programSlug: 'it-support-professional-certificate-ibm',
    pathwayCovers: ['Help desk basics', 'Computer hardware', 'Operating systems', 'Troubleshooting', 'Customer service'],
  },
  {
    id: 'cybersecurity-analyst',
    occupationTitle: 'Cybersecurity Analyst',
    onetCodePrefixes: ['15-1212'],
    titleKeywords: ['security analyst', 'cybersecurity', 'cyber security', 'information security'],
    requiredSkills: [
      skill('Network security', ['network security', 'security', 'firewall']),
      skill('Incident response', ['incident', 'threat', 'monitoring']),
      skill('Linux basics', ['linux', 'operating system', 'command line']),
      skill('Networking basics', ['network', 'tcp', 'telecommunications']),
      skill('Risk awareness', ['risk', 'vulnerability', 'judgment and decision making']),
    ],
    programSlug: 'cybersecurity-professional-certificate-google',
    pathwayCovers: ['Network security', 'Incident response', 'Linux basics', 'Networking basics', 'Risk awareness'],
  },
  {
    id: 'management-analyst',
    occupationTitle: 'Management Analyst',
    // 13-1161 is the board-approved secondary outcome, but operationally it
    // belongs to the Digital Marketing bridge below. A bridge chooses one
    // pathway, so keeping it here would route marketing specialists to the
    // Management Analyst program simply because this entry appears first.
    onetCodePrefixes: ['13-1111'],
    boardClassification: MANAGEMENT_ALIGNMENT.board,
    titleKeywords: [
      'management analyst',
      'management consultant',
      'business analyst',
      'business intelligence',
    ],
    requiredSkills: [
      skill('Management consulting', ['management consulting', 'consultant', 'problem solving']),
      skill('Business analysis', ['business analysis', 'requirements', 'process improvement']),
      skill('Business strategy', ['business strategy', 'competitive analysis', 'strategic planning']),
      skill('Financial analysis', ['financial analysis', 'financial modeling', 'cost analysis', 'excel']),
      skill('Data-driven recommendations', ['data analysis', 'dashboard', 'visualization', 'recommendation']),
    ],
    programSlug: 'data-analytics-professional-certificate-google',
    pathwayCovers: [
      'Management consulting',
      'Business analysis',
      'Business strategy',
      'Financial analysis',
      'Data-driven recommendations',
    ],
  },
  {
    id: 'database-administrator',
    occupationTitle: 'Database Administrator',
    // Accept current O*NET (15-1242), the exact board submission (15-1245),
    // and the board-approved Database Architects secondary outcome.
    onetCodePrefixes: ['15-1242', '15-1245', '15-1243'],
    boardClassification: DBA_ALIGNMENT.board,
    titleKeywords: ['database administrator', 'database architect', 'database operations', 'dba'],
    requiredSkills: [
      skill('Relational databases and SQL', ['relational database', 'sql', 'mysql', 'postgresql', 'db2']),
      skill('Database security', ['database security', 'access control', 'permissions', 'rbac']),
      skill('Backup and recovery', ['backup', 'recovery', 'restore']),
      skill('Monitoring and performance tuning', ['monitoring', 'performance tuning', 'query optimization']),
      skill('Database automation', ['linux', 'shell scripting', 'bash', 'python', 'automation']),
      skill('ETL and data warehousing', ['etl', 'data pipeline', 'data warehouse', 'airflow', 'kafka']),
    ],
    programSlug: 'data-science-professional-certificate-ibm',
    pathwayCovers: [
      'Relational databases and SQL',
      'Database security',
      'Backup and recovery',
      'Monitoring and performance tuning',
      'Database automation',
      'ETL and data warehousing',
    ],
  },
  {
    id: 'software-developer',
    occupationTitle: 'Software Developer',
    onetCodePrefixes: ['15-1252', '15-1251'],
    titleKeywords: ['software developer', 'software engineer', 'programmer', 'web developer'],
    requiredSkills: [
      skill('Python', ['python']),
      skill('Programming basics', ['programming', 'coding', 'software development']),
      skill('Web app basics', ['web', 'flask', 'application']),
      skill('AI tools', ['ai', 'machine learning', 'artificial intelligence', 'generative']),
      skill('Problem solving', ['problem solving', 'critical thinking', 'logic', 'debugging']),
    ],
    programSlug: 'ai-practitioner-professional-certificate-aws',
    pathwayCovers: ['Python', 'Programming basics', 'Web app basics', 'AI tools', 'Problem solving'],
  },
  {
    id: 'project-manager',
    occupationTitle: 'Project Manager',
    onetCodePrefixes: ['13-1082', '11-3021'],
    titleKeywords: ['project manager', 'project management', 'project coordinator', 'scrum master'],
    requiredSkills: [
      skill('Project planning', ['planning', 'project management', 'organizing']),
      skill('Agile and Scrum', ['agile', 'scrum']),
      skill('Scheduling', ['schedul', 'time management']),
      skill('Risk management', ['risk']),
      skill('Team communication', ['communicat', 'coordination', 'speaking', 'active listening']),
    ],
    programSlug: 'project-management-professional-certificate-microsoft',
    pathwayCovers: ['Project planning', 'Agile and Scrum', 'Scheduling', 'Risk management', 'Team communication'],
  },
  {
    id: 'network-technician',
    occupationTitle: 'Network Technician',
    onetCodePrefixes: ['15-1244', '15-1241', '15-1231'],
    titleKeywords: ['network administrator', 'network technician', 'network support', 'systems administrator'],
    requiredSkills: [
      skill('Networking basics', ['network', 'telecommunications']),
      skill('TCP/IP', ['tcp', 'ip', 'protocol', 'routing']),
      skill('Wireless setup', ['wireless', 'wifi']),
      skill('Network hardware', ['hardware', 'cisco', 'router', 'equipment']),
      skill('Troubleshooting', ['troubleshoot', 'problem', 'repairing']),
    ],
    programSlug: 'comptia-network-professional-certificate',
    pathwayCovers: ['Networking basics', 'TCP/IP', 'Wireless setup', 'Network hardware', 'Troubleshooting'],
  },
  {
    id: 'medical-records-specialist',
    occupationTitle: 'Medical Records Specialist',
    onetCodePrefixes: ['29-2072', '29-2071'],
    titleKeywords: ['medical records', 'medical billing', 'medical coding', 'health information'],
    requiredSkills: [
      skill('Medical billing', ['billing', 'revenue']),
      skill('Medical coding', ['coding', 'icd', 'cpt']),
      skill('Medical terms', ['medical terminology', 'medicine', 'clerical']),
      skill('Patient records', ['records', 'ehr', 'documentation']),
      skill('Privacy rules (HIPAA)', ['hipaa', 'privacy', 'compliance']),
    ],
    programSlug: 'health-information-technology-mchit',
    pathwayCovers: ['Medical billing', 'Medical coding', 'Medical terms', 'Patient records', 'Privacy rules (HIPAA)'],
  },
  {
    id: 'digital-marketing-specialist',
    occupationTitle: 'Digital Marketing Specialist',
    onetCodePrefixes: ['13-1161'],
    titleKeywords: ['marketing', 'e-commerce', 'ecommerce', 'market research'],
    requiredSkills: [
      skill('Search engine basics (SEO)', ['seo', 'search engine']),
      skill('Email marketing', ['email marketing', 'email']),
      skill('Online ads', ['sem', 'ads', 'advertising', 'sales and marketing']),
      skill('Web analytics', ['analytics', 'data analysis']),
      skill('Online store basics', ['e-commerce', 'ecommerce', 'online store']),
    ],
    programSlug: 'digital-marketing-e-commerce-google',
    pathwayCovers: ['Search engine basics (SEO)', 'Email marketing', 'Online ads', 'Web analytics', 'Online store basics'],
  },
  {
    id: 'ux-designer',
    occupationTitle: 'UX Designer',
    onetCodePrefixes: ['15-1255'],
    titleKeywords: ['ux designer', 'user experience', 'web and digital interface', 'ui designer'],
    requiredSkills: [
      skill('User research', ['user research', 'research', 'customer and personal service']),
      skill('Wireframing', ['wireframe', 'layout', 'design']),
      skill('Figma', ['figma']),
      skill('Prototyping', ['prototyp']),
      skill('Usability testing', ['usability', 'testing', 'quality control']),
    ],
    programSlug: 'ux-design-professional-certificate-google',
    pathwayCovers: ['User research', 'Wireframing', 'Figma', 'Prototyping', 'Usability testing'],
  },
  {
    id: 'cloud-support-associate',
    occupationTitle: 'Cloud Support Associate',
    onetCodePrefixes: ['15-1299'],
    titleKeywords: ['cloud', 'aws', 'devops'],
    requiredSkills: [
      skill('AWS basics', ['aws', 'amazon web services', 'cloud']),
      skill('Cloud architecture', ['cloud architecture', 'systems analysis', 'systems evaluation']),
      skill('Linux basics', ['linux', 'operating system', 'command line']),
      skill('Python', ['python', 'programming']),
      skill('DevOps basics', ['devops', 'automation', 'deployment']),
    ],
    programSlug: 'aws-cloud-technology-amazon',
    pathwayCovers: ['AWS basics', 'Cloud architecture', 'Linux basics', 'Python', 'DevOps basics'],
  },
  {
    id: 'production-technician',
    occupationTitle: 'Production Technician',
    onetCodePrefixes: ['51-'],
    titleKeywords: ['production', 'manufacturing', 'assembler', 'machine operator'],
    requiredSkills: [
      skill('Workplace safety', ['safety', 'osha']),
      skill('Quality checks', ['quality', 'inspection', 'monitoring']),
      skill('Manufacturing processes', ['manufactur', 'production and processing', 'operation']),
      skill('Equipment care', ['maintenance', 'equipment', 'mechanical', 'repairing']),
    ],
    programSlug: 'certified-production-technician-cpt',
    pathwayCovers: ['Workplace safety', 'Quality checks', 'Manufacturing processes', 'Equipment care'],
  },
  {
    id: 'logistics-technician',
    occupationTitle: 'Logistics Technician',
    onetCodePrefixes: ['53-', '43-5071'],
    titleKeywords: ['logistics', 'warehouse', 'shipping', 'inventory', 'material moving'],
    requiredSkills: [
      skill('Inventory basics', ['inventory', 'stock']),
      skill('Material handling', ['material handling', 'material moving', 'equipment']),
      skill('Shipping and receiving', ['shipping', 'receiving', 'transportation']),
      skill('Workplace safety', ['safety', 'osha']),
    ],
    programSlug: 'certified-logistics-technician-clt',
    pathwayCovers: ['Inventory basics', 'Material handling', 'Shipping and receiving', 'Workplace safety'],
  },
  {
    id: 'construction-crew-member',
    occupationTitle: 'Construction Crew Member',
    onetCodePrefixes: ['47-'],
    titleKeywords: ['construction', 'carpenter', 'laborer', 'building'],
    requiredSkills: [
      skill('Safety training (OSHA-10)', ['osha', 'safety', 'public safety and security']),
      skill('Blueprint reading', ['blueprint', 'drawing', 'plans']),
      skill('Hand and power tools', ['tools', 'equipment', 'mechanical']),
      skill('Construction basics', ['construction', 'building']),
    ],
    programSlug: 'core-construction-training-certificate',
    pathwayCovers: ['Safety training (OSHA-10)', 'Blueprint reading', 'Hand and power tools', 'Construction basics'],
  },
];

/** Minimal shape of one skill from a saved Skill Mapper run. */
export type MemberSkill = { name: string; score?: number };

/** A member skill counts as "having it" at or above this O*NET score. */
const HAVE_SKILL_MIN_SCORE = 50;

/** Find the curated bridge entry for a saved Skill Mapper occupation. */
export function findBridgeOccupation(
  occupationCode: string | null | undefined,
  occupationTitle: string | null | undefined
): BridgeOccupation | null {
  const code = (occupationCode ?? '').trim();
  if (code) {
    const byCode = TRAINING_BRIDGE_OCCUPATIONS.find((o) =>
      o.onetCodePrefixes.some((prefix) => code.startsWith(prefix))
    );
    if (byCode) return byCode;
  }
  const title = (occupationTitle ?? '').trim().toLowerCase();
  if (title) {
    const byTitle = TRAINING_BRIDGE_OCCUPATIONS.find((o) =>
      o.titleKeywords.some((kw) => title.includes(kw))
    );
    if (byTitle) return byTitle;
  }
  return null;
}

export function getBridgeOccupationById(id: string): BridgeOccupation | null {
  return TRAINING_BRIDGE_OCCUPATIONS.find((o) => o.id === id) ?? null;
}

export type BridgeGapResult = {
  /** Required skills the member does not show yet. */
  missingSkills: BridgeSkill[];
  /** Required skills the member already shows. */
  haveSkills: BridgeSkill[];
};

/**
 * Deterministic gap check: a required skill is "covered" when any of the
 * member's mapped skills matches one of its terms with a passing score.
 */
export function computeBridgeGap(
  memberSkills: MemberSkill[],
  occupation: BridgeOccupation
): BridgeGapResult {
  const normalized = memberSkills
    .filter((s) => typeof s?.name === 'string' && s.name.trim().length > 0)
    .map((s) => ({
      name: s.name.toLowerCase(),
      score: typeof s.score === 'number' ? s.score : 100,
    }));

  const missingSkills: BridgeSkill[] = [];
  const haveSkills: BridgeSkill[] = [];

  for (const required of occupation.requiredSkills) {
    const covered = normalized.some(
      (member) =>
        member.score >= HAVE_SKILL_MIN_SCORE &&
        required.matchTerms.some((term) => member.name.includes(term))
    );
    (covered ? haveSkills : missingSkills).push(required);
  }

  return { missingSkills, haveSkills };
}

/** Resolve the catalog program behind a bridge entry (null if catalog drifts). */
export function getBridgeProgram(occupation: BridgeOccupation): Program | null {
  return getProgramBySlug(occupation.programSlug) ?? null;
}
