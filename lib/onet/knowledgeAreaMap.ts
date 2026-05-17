/**
 * Maps O*NET knowledge area names to WorkforceAP program category slugs with weights.
 *
 * Knowledge areas are broad domains of structured knowledge (e.g. "Computers and Electronics",
 * "Medicine and Dentistry"). When an occupation scores highly on a knowledge area, programs
 * in the mapped category receive a weighted boost.
 *
 * Weights are in [0, 1]. A weight of 0.25 is a moderate nudge; 0.5 is a strong signal.
 */

export type KnowledgeAreaMapping = {
  /** Exact or partial match against O*NET knowledge area name (case-insensitive). */
  knowledgePattern: RegExp;
  /** WorkforceAP program category slug. */
  programCategory: string;
  /** Score contribution [0,1] for this knowledge area. */
  weight: number;
  /** Human-readable label for reasoning text. */
  label: string;
};

export const KNOWLEDGE_AREA_MAPPINGS: KnowledgeAreaMapping[] = [
  // IT / Cybersecurity
  { knowledgePattern: /\bcomputers and electronics\b/i, programCategory: 'it-cyber', weight: 0.45, label: 'Computers & Electronics' },
  { knowledgePattern: /\btelecommunications\b/i, programCategory: 'it-cyber', weight: 0.35, label: 'Telecommunications' },
  { knowledgePattern: /\bengineering and technology\b/i, programCategory: 'it-cyber', weight: 0.25, label: 'Engineering & Technology' },
  { knowledgePattern: /\bdesign\b/i, programCategory: 'it-cyber', weight: 0.15, label: 'Design' },

  // AI & Software Dev
  { knowledgePattern: /\bmathematics\b/i, programCategory: 'ai-software', weight: 0.30, label: 'Mathematics' },
  { knowledgePattern: /\bphysics\b/i, programCategory: 'ai-software', weight: 0.20, label: 'Physics' },

  // Cloud & Data
  { knowledgePattern: /\bmathematics\b/i, programCategory: 'cloud-data', weight: 0.25, label: 'Mathematics (Data)' },
  { knowledgePattern: /\beconomics and accounting\b/i, programCategory: 'cloud-data', weight: 0.20, label: 'Economics & Accounting' },

  // Business
  { knowledgePattern: /\badministration and management\b/i, programCategory: 'business', weight: 0.40, label: 'Administration & Management' },
  { knowledgePattern: /\bcustomer and personal service\b/i, programCategory: 'business', weight: 0.25, label: 'Customer & Personal Service' },
  { knowledgePattern: /\bsales and marketing\b/i, programCategory: 'business', weight: 0.35, label: 'Sales & Marketing' },
  { knowledgePattern: /\beconomics and accounting\b/i, programCategory: 'business', weight: 0.20, label: 'Economics & Accounting' },
  { knowledgePattern: /\bpersonnel and human resources\b/i, programCategory: 'business', weight: 0.20, label: 'Personnel & HR' },

  // Healthcare
  { knowledgePattern: /\bmedicine and dentistry\b/i, programCategory: 'healthcare', weight: 0.50, label: 'Medicine & Dentistry' },
  { knowledgePattern: /\btherapy and counseling\b/i, programCategory: 'healthcare', weight: 0.40, label: 'Therapy & Counseling' },
  { knowledgePattern: /\bbiology\b/i, programCategory: 'healthcare', weight: 0.25, label: 'Biology' },
  { knowledgePattern: /\bpsychology\b/i, programCategory: 'healthcare', weight: 0.25, label: 'Psychology' },

  // Manufacturing / Construction / Logistics
  { knowledgePattern: /\bmechanical\b/i, programCategory: 'manufacturing', weight: 0.35, label: 'Mechanical' },
  { knowledgePattern: /\bbuilding and construction\b/i, programCategory: 'manufacturing', weight: 0.40, label: 'Building & Construction' },
  { knowledgePattern: /\btransportation\b/i, programCategory: 'manufacturing', weight: 0.30, label: 'Transportation' },
  { knowledgePattern: /\bproduction and processing\b/i, programCategory: 'manufacturing', weight: 0.35, label: 'Production & Processing' },

  // Digital literacy (broad catch-all for low-knowledge-area occupations)
  { knowledgePattern: /\benglish language\b/i, programCategory: 'digital-literacy', weight: 0.10, label: 'English Language' },
  { knowledgePattern: /\bclerical\b/i, programCategory: 'digital-literacy', weight: 0.15, label: 'Clerical' },
];

/** Score a program category against a list of O*NET knowledge area names + importances. */
export function scoreKnowledgeAreas(
  knowledgeAreas: { name: string; importance: number | null; level: number | null }[],
  programCategory: string
): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];
  for (const ka of knowledgeAreas) {
    if (!ka.name) continue;
    const importance = ka.importance ?? ka.level ?? 50;
    const normalizedImportance = importance / 100; // O*NET uses 0-100 scale

    for (const mapping of KNOWLEDGE_AREA_MAPPINGS) {
      if (mapping.programCategory !== programCategory) continue;
      if (mapping.knowledgePattern.test(ka.name)) {
        const contribution = mapping.weight * normalizedImportance;
        score += contribution;
        reasons.push(`${mapping.label} knowledge (${Math.round(normalizedImportance * 100)}%)`);
        break; // one match per knowledge area
      }
    }
  }
  // Clamp to [0,1]
  return { score: Math.min(1, score), reasons: [...new Set(reasons)].slice(0, 3) };
}
