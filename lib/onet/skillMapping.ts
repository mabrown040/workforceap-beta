/**
 * Maps common O*NET skill / ability / knowledge element names to WorkforceAP
 * program skill names with weights.
 *
 * When an occupation's O*NET elements overlap with a program's skills, we
 * compute a weighted score rather than a raw token count. Importance and
 * level ratings from O*NET drive the weight.
 */

export type SkillMapping = {
  /** O*NET element name pattern (case-insensitive). */
  onetPattern: RegExp;
  /** WorkforceAP program skill name (must match skill string in Program.skills). */
  programSkill: string;
  /** Base weight [0,1] for this mapping. */
  weight: number;
};

/** Canonical bidirectional mappings: O*NET element → WAP program skill. */
export const SKILL_MAPPINGS: SkillMapping[] = [
  // IT / Cybersecurity
  { onetPattern: /\bnetwork\b/i, programSkill: 'Networking', weight: 0.60 },
  { onetPattern: /\bnetwork security\b/i, programSkill: 'Network security', weight: 0.70 },
  { onetPattern: /\btcp\/ip\b/i, programSkill: 'TCP/IP', weight: 0.70 },
  { onetPattern: /\boperating systems\b/i, programSkill: 'OS', weight: 0.55 },
  { onetPattern: /\bhardware\b/i, programSkill: 'Hardware', weight: 0.55 },
  { onetPattern: /\bcybersecurity\b/i, programSkill: 'Cybersecurity', weight: 0.70 },
  { onetPattern: /\binformation security\b/i, programSkill: 'Cybersecurity', weight: 0.60 },
  { onetPattern: /\btroubleshooting\b/i, programSkill: 'Help desk', weight: 0.50 },
  { onetPattern: /\bcustomer service\b/i, programSkill: 'Customer service', weight: 0.50 },
  { onetPattern: /\blinux\b/i, programSkill: 'Linux', weight: 0.65 },
  { onetPattern: /\bsql\b/i, programSkill: 'SQL', weight: 0.60 },
  { onetPattern: /\bdatabase\b/i, programSkill: 'Databases', weight: 0.55 },
  { onetPattern: /\bincident response\b/i, programSkill: 'Incident response', weight: 0.70 },
  { onetPattern: /\brisk management\b/i, programSkill: 'Risk management', weight: 0.55 },
  { onetPattern: /\bcryptography\b/i, programSkill: 'Cryptography', weight: 0.60 },
  { onetPattern: /\bit automation\b/i, programSkill: 'IT automation', weight: 0.55 },
  { onetPattern: /\bpython\b/i, programSkill: 'Python', weight: 0.55 },
  { onetPattern: /\bcloud\b/i, programSkill: 'AWS', weight: 0.40 },
  { onetPattern: /\baws\b/i, programSkill: 'AWS', weight: 0.70 },
  { onetPattern: /\bazure\b/i, programSkill: 'Cloud architecture', weight: 0.50 },
  { onetPattern: /\bdevops\b/i, programSkill: 'DevOps', weight: 0.60 },
  { onetPattern: /\bcontainers?\b/i, programSkill: 'DevOps', weight: 0.45 },
  { onetPattern: /\bgit\b/i, programSkill: 'Git', weight: 0.55 },
  { onetPattern: /\bbash\b/i, programSkill: 'Bash', weight: 0.50 },
  { onetPattern: /\bapis?\b/i, programSkill: 'APIs', weight: 0.50 },
  { onetPattern: /\bcisco\b/i, programSkill: 'Cisco', weight: 0.65 },
  { onetPattern: /\bwireless\b/i, programSkill: 'Wireless', weight: 0.55 },

  // AI & Software Dev
  { onetPattern: /\bsoftware engineering\b/i, programSkill: 'Software engineering', weight: 0.65 },
  { onetPattern: /\bprogramming\b/i, programSkill: 'Programming', weight: 0.55 },
  { onetPattern: /\bjavascript\b/i, programSkill: 'JavaScript', weight: 0.60 },
  { onetPattern: /\bhtml\b/i, programSkill: 'HTML', weight: 0.50 },
  { onetPattern: /\bcss\b/i, programSkill: 'CSS', weight: 0.50 },
  { onetPattern: /\breact\b/i, programSkill: 'React', weight: 0.60 },
  { onetPattern: /\bnode\.?js\b/i, programSkill: 'Node.js', weight: 0.55 },
  { onetPattern: /\bflask\b/i, programSkill: 'Flask', weight: 0.55 },
  { onetPattern: /\bmachine learning\b/i, programSkill: 'Machine Learning', weight: 0.65 },
  { onetPattern: /\bai\/ml\b/i, programSkill: 'AI/ML', weight: 0.70 },
  { onetPattern: /\bartificial intelligence\b/i, programSkill: 'AI/ML', weight: 0.65 },
  { onetPattern: /\bgenerative ai\b/i, programSkill: 'Generative AI', weight: 0.70 },
  { onetPattern: /\bprompt engineering\b/i, programSkill: 'Prompt engineering', weight: 0.60 },
  { onetPattern: /\bdata science\b/i, programSkill: 'Data science', weight: 0.60 },

  // Cloud & Data
  { onetPattern: /\bdata analysis\b/i, programSkill: 'Data analysis', weight: 0.60 },
  { onetPattern: /\bdata visualization\b/i, programSkill: 'Data viz', weight: 0.60 },
  { onetPattern: /\btableau\b/i, programSkill: 'Tableau', weight: 0.65 },
  { onetPattern: /\br programming\b/i, programSkill: 'R', weight: 0.55 },
  { onetPattern: /\bspreadsheet\b/i, programSkill: 'Spreadsheets', weight: 0.45 },
  { onetPattern: /\bjupyter\b/i, programSkill: 'Jupyter', weight: 0.55 },
  { onetPattern: /\bcloud architecture\b/i, programSkill: 'Cloud architecture', weight: 0.60 },

  // Business
  { onetPattern: /\bproject management\b/i, programSkill: 'Project management', weight: 0.65 },
  { onetPattern: /\bagile\b/i, programSkill: 'Agile', weight: 0.55 },
  { onetPattern: /\bscrum\b/i, programSkill: 'Scrum', weight: 0.60 },
  { onetPattern: /\bms project\b/i, programSkill: 'MS Project', weight: 0.60 },
  { onetPattern: /\bseo\b/i, programSkill: 'SEO', weight: 0.60 },
  { onetPattern: /\bsem\b/i, programSkill: 'SEM', weight: 0.60 },
  { onetPattern: /\bemail marketing\b/i, programSkill: 'Email marketing', weight: 0.55 },
  { onetPattern: /\bdigital marketing\b/i, programSkill: 'Digital marketing', weight: 0.55 },
  { onetPattern: /\banalytics\b/i, programSkill: 'Analytics', weight: 0.50 },
  { onetPattern: /\buser research\b/i, programSkill: 'User research', weight: 0.60 },
  { onetPattern: /\bwireframing\b/i, programSkill: 'Wireframing', weight: 0.55 },
  { onetPattern: /\bfigma\b/i, programSkill: 'Figma', weight: 0.65 },
  { onetPattern: /\bprototyping\b/i, programSkill: 'Prototyping', weight: 0.55 },
  { onetPattern: /\bux design\b/i, programSkill: 'UX Design', weight: 0.60 },

  // Healthcare
  { onetPattern: /\bmedical coding\b/i, programSkill: 'Medical coding', weight: 0.70 },
  { onetPattern: /\bmedical billing\b/i, programSkill: 'Medical billing', weight: 0.60 },
  { onetPattern: /\behr\b/i, programSkill: 'EHR', weight: 0.60 },
  { onetPattern: /\belectronic health records?\b/i, programSkill: 'EHR', weight: 0.60 },
  { onetPattern: /\bhipaa\b/i, programSkill: 'HIPAA', weight: 0.65 },
  { onetPattern: /\bicd-?10\b/i, programSkill: 'ICD-10', weight: 0.65 },
  { onetPattern: /\bcpt\b/i, programSkill: 'CPT', weight: 0.60 },
  { onetPattern: /\brevenue cycle\b/i, programSkill: 'Revenue cycle', weight: 0.55 },
  { onetPattern: /\bhealth information\b/i, programSkill: 'Health information', weight: 0.55 },

  // Manufacturing / Construction / Logistics
  { onetPattern: /\bsafety\b/i, programSkill: 'Safety', weight: 0.50 },
  { onetPattern: /\bosha\b/i, programSkill: 'OSHA-10', weight: 0.60 },
  { onetPattern: /\bquality control\b/i, programSkill: 'Quality practices', weight: 0.55 },
  { onetPattern: /\bmanufacturing\b/i, programSkill: 'Manufacturing processes', weight: 0.60 },
  { onetPattern: /\bmachining\b/i, programSkill: 'Machining', weight: 0.55 },
  { onetPattern: /\bcnc\b/i, programSkill: 'CNC', weight: 0.60 },
  { onetPattern: /\bwelding\b/i, programSkill: 'Welding', weight: 0.60 },
  { onetPattern: /\blogistics\b/i, programSkill: 'Logistics fundamentals', weight: 0.60 },
  { onetPattern: /\bsupply chain\b/i, programSkill: 'Supply chain', weight: 0.60 },
  { onetPattern: /\binventory\b/i, programSkill: 'Inventory', weight: 0.55 },
  { onetPattern: /\bmaterial handling\b/i, programSkill: 'Material handling', weight: 0.55 },
  { onetPattern: /\btransportation\b/i, programSkill: 'Transportation', weight: 0.50 },
  { onetPattern: /\bblueprint\b/i, programSkill: 'Blueprint reading', weight: 0.60 },
  { onetPattern: /\bconstruction\b/i, programSkill: 'Construction fundamentals', weight: 0.60 },
  { onetPattern: /\bcarpentry\b/i, programSkill: 'Carpentry', weight: 0.55 },
  { onetPattern: /\belectrical\b/i, programSkill: 'Electrical', weight: 0.50 },
  { onetPattern: /\bplumbing\b/i, programSkill: 'Plumbing', weight: 0.50 },
  { onetPattern: /\blean\b/i, programSkill: 'Lean manufacturing', weight: 0.55 },
  { onetPattern: /\bsix sigma\b/i, programSkill: 'Six Sigma', weight: 0.55 },

  // Digital literacy (fallback / broad)
  { onetPattern: /\bcomputer literacy\b/i, programSkill: 'Digital literacy', weight: 0.45 },
  { onetPattern: /\bemail\b/i, programSkill: 'Email', weight: 0.30 },
  { onetPattern: /\bfinancial literacy\b/i, programSkill: 'Financial literacy', weight: 0.40 },
  { onetPattern: /\bonline safety\b/i, programSkill: 'Online safety', weight: 0.35 },
];

/** Score a program's skill list against a list of O*NET elements (skills/abilities/knowledge/work activities). */
export function scoreSkillMapping(
  onetElements: { name: string; importance: number | null; level: number | null }[],
  programSkills: string[]
): { score: number; matchedSkills: string[]; reasons: string[] } {
  let score = 0;
  const matchedSkills = new Set<string>();
  const reasons = new Set<string>();

  const normalizedProgramSkills = programSkills.map((s) => s.toLowerCase().trim());

  for (const el of onetElements) {
    if (!el.name) continue;
    const importance = el.importance ?? el.level ?? 50;
    const normalizedImportance = importance / 100;

    for (const mapping of SKILL_MAPPINGS) {
      if (mapping.onetPattern.test(el.name)) {
        const progIndex = normalizedProgramSkills.indexOf(mapping.programSkill.toLowerCase().trim());
        if (progIndex >= 0) {
          const contribution = mapping.weight * normalizedImportance;
          score += contribution;
          matchedSkills.add(programSkills[progIndex]);
          reasons.add(`${mapping.programSkill} (${Math.round(normalizedImportance * 100)}%)`);
        }
        break; // one mapping per O*NET element
      }
    }
  }

  return {
    score: Math.min(1, score),
    matchedSkills: [...matchedSkills],
    reasons: [...reasons].slice(0, 4),
  };
}
