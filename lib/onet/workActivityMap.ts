/**
 * Maps O*NET work activity categories to WorkforceAP program outcome domains.
 *
 * Work activities describe what workers *do* on the job (e.g. "Interacting With Computers",
 * "Processing Information"). Programs that teach related activities get a weighted boost.
 */

export type WorkActivityMapping = {
  /** Pattern to match O*NET work activity name (case-insensitive). */
  activityPattern: RegExp;
  /** Program category slug that benefits from this activity. */
  programCategory: string;
  /** Weight [0,1]. */
  weight: number;
  /** Human-readable label for reasoning. */
  label: string;
};

export const WORK_ACTIVITY_MAPPINGS: WorkActivityMapping[] = [
  // IT / Cybersecurity
  { activityPattern: /\binteracting with computers\b/i, programCategory: 'it-cyber', weight: 0.45, label: 'Computer interaction' },
  { activityPattern: /\brepairing and maintaining electronic equipment\b/i, programCategory: 'it-cyber', weight: 0.35, label: 'Electronic maintenance' },
  { activityPattern: /\bmonitoring processes, materials, or surroundings\b/i, programCategory: 'it-cyber', weight: 0.30, label: 'Monitoring' },
  { activityPattern: /\bidentifying objects, actions, and events\b/i, programCategory: 'it-cyber', weight: 0.25, label: 'Identification' },

  // AI & Software Dev
  { activityPattern: /\banalyzing data or information\b/i, programCategory: 'ai-software', weight: 0.35, label: 'Data analysis' },
  { activityPattern: /\bthinking creatively\b/i, programCategory: 'ai-software', weight: 0.30, label: 'Creative problem-solving' },
  { activityPattern: /\bupdating and using relevant knowledge\b/i, programCategory: 'ai-software', weight: 0.25, label: 'Continuous learning' },
  { activityPattern: /\bdeveloping objectives and strategies\b/i, programCategory: 'ai-software', weight: 0.25, label: 'Strategy' },

  // Cloud & Data
  { activityPattern: /\bprocessing information\b/i, programCategory: 'cloud-data', weight: 0.35, label: 'Information processing' },
  { activityPattern: /\bestimating the quantifiable characteristics of products, events, or information\b/i, programCategory: 'cloud-data', weight: 0.30, label: 'Quantitative estimation' },
  { activityPattern: /\bdocumenting\/recording information\b/i, programCategory: 'cloud-data', weight: 0.25, label: 'Documentation' },

  // Business
  { activityPattern: /\bcommunicating with supervisors, peers, or subordinates\b/i, programCategory: 'business', weight: 0.30, label: 'Communication' },
  { activityPattern: /\bestablishing and maintaining interpersonal relationships\b/i, programCategory: 'business', weight: 0.30, label: 'Relationship building' },
  { activityPattern: /\borganizing, planning, and prioritizing work\b/i, programCategory: 'business', weight: 0.40, label: 'Planning & prioritization' },
  { activityPattern: /\bscheduling work and activities\b/i, programCategory: 'business', weight: 0.35, label: 'Scheduling' },
  { activityPattern: /\bcoordinating the work and activities of others\b/i, programCategory: 'business', weight: 0.35, label: 'Coordination' },
  { activityPattern: /\bguiding, directing, and motivating subordinates\b/i, programCategory: 'business', weight: 0.30, label: 'Leadership' },
  { activityPattern: /\bselling or influencing others\b/i, programCategory: 'business', weight: 0.35, label: 'Sales / influence' },
  { activityPattern: /\bperforming for or working directly with the public\b/i, programCategory: 'business', weight: 0.25, label: 'Public-facing work' },

  // Healthcare
  { activityPattern: /\bassisting and caring for others\b/i, programCategory: 'healthcare', weight: 0.45, label: 'Patient care' },
  { activityPattern: /\bperforming administrative activities\b/i, programCategory: 'healthcare', weight: 0.25, label: 'Administrative' },
  { activityPattern: /\bevaluating information to determine compliance with standards\b/i, programCategory: 'healthcare', weight: 0.30, label: 'Compliance evaluation' },

  // Manufacturing / Construction / Logistics
  { activityPattern: /\binspecting equipment, structures, or materials\b/i, programCategory: 'manufacturing', weight: 0.35, label: 'Inspection' },
  { activityPattern: /\bhandling and moving objects\b/i, programCategory: 'manufacturing', weight: 0.30, label: 'Physical handling' },
  { activityPattern: /\boperating vehicles, mechanized devices, or equipment\b/i, programCategory: 'manufacturing', weight: 0.30, label: 'Equipment operation' },
  { activityPattern: /\bperforming general physical activities\b/i, programCategory: 'manufacturing', weight: 0.25, label: 'Physical work' },
  { activityPattern: /\brepairing and maintaining mechanical equipment\b/i, programCategory: 'manufacturing', weight: 0.40, label: 'Mechanical repair' },
  { activityPattern: /\bcontrolling machines and processes\b/i, programCategory: 'manufacturing', weight: 0.35, label: 'Machine control' },
  { activityPattern: /\bdrafting, laying out, and specifying technical devices, parts, and equipment\b/i, programCategory: 'manufacturing', weight: 0.30, label: 'Technical drafting' },

  // Digital literacy (broad)
  { activityPattern: /\bgetting information\b/i, programCategory: 'digital-literacy', weight: 0.15, label: 'Information retrieval' },
  { activityPattern: /\bread written materials\b/i, programCategory: 'digital-literacy', weight: 0.15, label: 'Reading comprehension' },
];

/** Score a program category against O*NET work activities. */
export function scoreWorkActivities(
  workActivities: { name: string; importance: number | null; level: number | null }[],
  programCategory: string
): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  for (const wa of workActivities) {
    if (!wa.name) continue;
    const importance = wa.importance ?? wa.level ?? 50;
    const normalizedImportance = importance / 100;

    for (const mapping of WORK_ACTIVITY_MAPPINGS) {
      if (mapping.programCategory !== programCategory) continue;
      if (mapping.activityPattern.test(wa.name)) {
        const contribution = mapping.weight * normalizedImportance;
        score += contribution;
        reasons.push(`${mapping.label} activity (${Math.round(normalizedImportance * 100)}%)`);
        break;
      }
    }
  }

  return { score: Math.min(1, score), reasons: [...new Set(reasons)].slice(0, 3) };
}
