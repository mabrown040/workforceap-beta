/**
 * WorkforceAP-authored curricula for the two MSSC manufacturing and logistics
 * programs (CPT and CLT).
 *
 * These are NOT TWC syllabus transcriptions. `shared/programSyllabi.ts` holds
 * the twelve source-locked transcriptions of the `.docx` files supplied by the
 * program owner in July 2026, each carrying a SHA-256 of its source document.
 * CPT and CLT were never part of that submission, so their class content is
 * authored in-house here and kept in a separate module so the regulated
 * transcription and the in-house curriculum can never be mistaken for one
 * another.
 *
 * Course names, order, and slugs match the existing catalog exactly, because
 * skill missions (`lib/content/skillMissionCatalog.ts`), checkpoints
 * (`lib/content/checkpoints/tradesAndHealth.ts`), and the course skill map
 * (`lib/content/courseSkillMap.ts`) already join to these courses by
 * normalized course name. Renaming a course here silently breaks a member's
 * mission unlocks — add courses, never rename them, without updating all four.
 *
 * Hour allocations, delivery format, and the tuition figure are program-design
 * decisions that carry onto the funder-facing price list at
 * `/programs/price-list`. They are marked `draft-pending-owner-verification`
 * until the program owner confirms them for the next EdVera / TWC submission.
 *
 * Dependency-free so both the Next portal and the Astro marketing build
 * consume the same class content.
 */

export interface ProgramCurriculumCourse {
  name: string;
  hours: number;
  description: string;
  /** MSSC assessment areas this course prepares a member to sit for. */
  certificationAlignment: string[];
}

export type CurriculumVerificationStatus =
  | 'draft-pending-owner-verification'
  | 'owner-verified';

export interface ProgramCurriculum {
  slug: string;
  title: string;
  providers: string;
  providerLine: string;
  deliveryFormat: string;
  totalHours: number;
  totalHoursLabel: string;
  clockHours: number;
  labHours: number;
  costLabel: string;
  tuitionAndFees: number;
  /** Credential the sequence prepares a member to earn. */
  credential: string;
  /** Every MSSC assessment area the sequence covers end to end. */
  certificationTargets: string[];
  courses: ProgramCurriculumCourse[];
  /** Provenance. Deliberately not a `sourceDocument` / `sourceSha256` pair. */
  authoredBy: string;
  contentVerified: string;
  status: CurriculumVerificationStatus;
  notes?: string[];
}

export const PROGRAM_CURRICULA: Record<string, ProgramCurriculum> = {
  'certified-production-technician-cpt': {
    slug: 'certified-production-technician-cpt',
    title: 'Certified Production Technician (CPT)',
    providers: 'MSSC / NAM',
    providerLine:
      'Aligned to the MSSC Certified Production Technician (CPT) standard   |   Delivery Format: Hybrid, Instructor-Supported',
    deliveryFormat: 'Hybrid, Instructor-Supported',
    totalHours: 160,
    totalHoursLabel: '160 Hours (104 Clock + 56 Lab/Project/Test Prep)',
    clockHours: 104,
    labHours: 56,
    costLabel: '$7500 = $7500 tuition and fees',
    tuitionAndFees: 7500,
    credential: 'MSSC Certified Production Technician (CPT)',
    certificationTargets: [
      'Safety',
      'Quality Practices and Measurement',
      'Manufacturing Processes and Production',
      'Maintenance Awareness',
    ],
    authoredBy: 'WorkforceAP program team',
    contentVerified: '2026-08-28',
    status: 'draft-pending-owner-verification',
    notes: [
      'Hour allocations, delivery format, and the tuition figure are drafts awaiting program-owner sign-off before the next EdVera / TWC submission.',
      'The MSSC CPT credential is assessed in four modules; a member must pass all four to hold the full CPT. Each course below names the modules it prepares for.',
    ],
    courses: [
      {
        name: 'Introduction to Manufacturing',
        hours: 14,
        description:
          'Orientation to the modern production floor: plant roles and shift structure, how work moves from raw material to finished goods, and the metrics a technician is measured against — takt time, throughput, scrap, and overall equipment effectiveness. Covers push versus pull production, work-in-process and why it accumulates, and the purpose of standard work. Establishes the vocabulary the rest of the program builds on.',
        certificationAlignment: ['Manufacturing Processes and Production'],
      },
      {
        name: 'Blueprint Reading and Technical Drawing',
        hours: 18,
        description:
          'Read and interpret production drawings. Orthographic projection, sectional and detail views, title blocks and revision control, scale, and the dimensioning conventions used on the shop floor, plus an introduction to geometric dimensioning and tolerancing symbols. Members practice translating a print into the setup steps and dimensional checks required at a workstation.',
        certificationAlignment: [
          'Quality Practices and Measurement',
          'Manufacturing Processes and Production',
        ],
      },
      {
        name: 'Machining and CNC Operations',
        hours: 24,
        description:
          'Material removal fundamentals and the operator role at a CNC cell. Cutting tools and workholding, speeds and feeds, coolant, machine setup and first-article inspection, loading programs, applying tool and work offsets, and monitoring a cycle for tool wear, chatter, and dimensional drift. Includes the daily machine checks that keep a cell running and when to stop and escalate.',
        certificationAlignment: [
          'Manufacturing Processes and Production',
          'Maintenance Awareness',
        ],
      },
      {
        name: 'Welding Fundamentals',
        hours: 18,
        description:
          'Introduction to the joining processes a production technician works alongside: shielded metal arc, gas metal arc, and gas tungsten arc welding. Joint types and weld symbols, base metal and filler selection, heat input and distortion control, and visual identification of common discontinuities such as porosity, undercut, and incomplete fusion. Includes fume extraction, arc-flash protection, and hot-work permit procedures.',
        certificationAlignment: ['Manufacturing Processes and Production', 'Safety'],
      },
      {
        name: 'Quality Control and Inspection',
        hours: 24,
        description:
          'Measure, judge, and document conformance. Instrument selection and use for calipers, micrometers, height gauges, and go/no-go gauges; gauge repeatability and reproducibility; sampling plans; statistical process control charts and control limits; and process capability. Covers root-cause tools including 5 Whys and cause-and-effect analysis, the corrective-action cycle, and how nonconforming material is segregated, tagged, and dispositioned.',
        certificationAlignment: ['Quality Practices and Measurement'],
      },
      {
        name: 'Safety and OSHA Compliance',
        hours: 22,
        description:
          'Hazard recognition and the hierarchy of controls applied to a production environment. Lockout/tagout, machine guarding, personal protective equipment selection, hazard communication and safety data sheets, confined space and fall hazards, powered industrial truck awareness, emergency action plans, and near-miss and incident reporting. Prepares members for the OSHA 10-Hour General Industry card.',
        certificationAlignment: ['Safety'],
      },
      {
        name: 'Lean Manufacturing Principles',
        hours: 20,
        description:
          'Continuous improvement as it is actually practiced on a floor. The eight wastes, 5S, value stream mapping, kaizen events, visual management and andon signals, quick changeover, and total productive maintenance. Members map a real process, identify waste, and quantify the improvement a proposed change would deliver.',
        certificationAlignment: [
          'Manufacturing Processes and Production',
          'Maintenance Awareness',
        ],
      },
      {
        name: 'Production Technology Capstone',
        hours: 20,
        description:
          'An integrated project that exercises all four MSSC modules together: read a production print, plan a workstation setup, build and run a quality check plan, complete a hazard assessment with a written lockout/tagout sequence, and present improvement recommendations supported by production metrics. Includes full-length CPT assessment review and timed practice across every module.',
        certificationAlignment: [
          'Safety',
          'Quality Practices and Measurement',
          'Manufacturing Processes and Production',
          'Maintenance Awareness',
        ],
      },
    ],
  },

  'certified-logistics-technician-clt': {
    slug: 'certified-logistics-technician-clt',
    title: 'Certified Logistics Technician (CLT)',
    providers: 'MSSC / NAM',
    providerLine:
      'Aligned to the MSSC Certified Logistics Associate (CLA) and Certified Logistics Technician (CLT) standards   |   Delivery Format: Hybrid, Instructor-Supported',
    deliveryFormat: 'Hybrid, Instructor-Supported',
    totalHours: 160,
    totalHoursLabel: '160 Hours (110 Clock + 50 Lab/Project/Test Prep)',
    clockHours: 110,
    labHours: 50,
    costLabel: '$7500 = $7500 tuition and fees',
    tuitionAndFees: 7500,
    credential: 'MSSC Certified Logistics Technician (CLT)',
    certificationTargets: [
      'Global Supply Chain Logistics Life Cycle',
      'Logistics Environment',
      'Safe Material Handling and Equipment Operation',
      'Product Receiving',
      'Product Storage',
      'Order Processing',
      'Packaging and Shipment',
      'Inventory Control',
      'Safe Handling of Hazardous Materials',
      'Evaluation of Transportation Modes',
      'Dispatch and Tracking',
      'Measurements and Metrics',
    ],
    authoredBy: 'WorkforceAP program team',
    contentVerified: '2026-08-28',
    status: 'draft-pending-owner-verification',
    notes: [
      'Hour allocations, delivery format, and the tuition figure are drafts awaiting program-owner sign-off before the next EdVera / TWC submission.',
      'MSSC certifies logistics in two tiers: the Certified Logistics Associate (CLA) covers foundational areas and is the prerequisite for the Certified Logistics Technician (CLT). This sequence prepares members for both.',
    ],
    courses: [
      {
        name: 'Introduction to Supply Chain Management',
        hours: 16,
        description:
          'The end-to-end logistics life cycle from supplier to end customer, and where a technician sits inside it. Covers the roles and departments in a distribution center, how a demand signal travels upstream, service-level agreements and what breaks them, and the cost-versus-service tradeoff behind every logistics decision. Members learn to trace a delivery problem back to the step where it started.',
        certificationAlignment: [
          'Global Supply Chain Logistics Life Cycle',
          'Logistics Environment',
        ],
      },
      {
        name: 'Inventory Management and Control',
        hours: 22,
        description:
          'Keeping recorded stock and physical stock in agreement. Cycle counting versus wall-to-wall physical inventory, ABC classification, safety stock and reorder points, lot and serial traceability, FIFO and FEFO rotation, and the investigation and paperwork behind an inventory adjustment. Covers shrink, its common causes, and the controls that reduce it.',
        certificationAlignment: ['Inventory Control', 'Product Storage'],
      },
      {
        name: 'Transportation and Distribution',
        hours: 20,
        description:
          'Comparing truckload, less-than-truckload, parcel, rail, ocean, and air on cost, transit time, capacity, and reliability. Carrier selection and tendering, bills of lading and freight documentation, accessorial charges, appointment scheduling, and the dispatch and tracking routine — including how a shipment exception is escalated and communicated to a customer.',
        certificationAlignment: [
          'Evaluation of Transportation Modes',
          'Dispatch and Tracking',
        ],
      },
      {
        name: 'Warehouse Operations',
        hours: 24,
        description:
          'The physical flow through a facility, dock to dock. Receiving and dock procedures, inspection and discrepancy handling, putaway strategies and slotting logic, picking methods including discrete, batch, zone, and wave, then packing, staging, loading, and outbound verification. Includes material handling equipment operation, pedestrian and forklift traffic safety, safe lifting, and housekeeping standards.',
        certificationAlignment: [
          'Product Receiving',
          'Product Storage',
          'Order Processing',
          'Packaging and Shipment',
          'Safe Material Handling and Equipment Operation',
        ],
      },
      {
        name: 'Procurement and Vendor Management',
        hours: 18,
        description:
          'How goods are ordered and how their arrival is verified. Requisitions and purchase orders, supplier qualification and scorecards, lead times, incoterms and where title and risk transfer, receiving discrepancies and vendor claims, and the three-way match between purchase order, receipt, and invoice that has to reconcile before a supplier is paid.',
        certificationAlignment: ['Logistics Environment', 'Product Receiving'],
      },
      {
        name: 'Supply Chain Technology and SAP',
        hours: 22,
        description:
          'The systems a logistics technician works in every shift. Warehouse management and ERP fundamentals using SAP-style transaction flows, barcode and RFID scanning, advance shipping notices and EDI basics, and transaction accuracy — how a mis-scan propagates, how it is found, and how it is corrected. Members learn how their keystrokes become the reports leadership reviews.',
        certificationAlignment: [
          'Order Processing',
          'Measurements and Metrics',
          'Logistics Environment',
        ],
      },
      {
        name: 'Global Supply Chain and Trade',
        hours: 18,
        description:
          'Moving freight across borders and handling regulated material. Import and export documentation, the customs broker role, harmonized tariff basics, trade compliance and denied-party screening, plus hazardous materials classification, packaging, labeling, placarding, and shipping papers under DOT and IATA rules — including what a technician must never sign for.',
        certificationAlignment: [
          'Safe Handling of Hazardous Materials',
          'Logistics Environment',
        ],
      },
      {
        name: 'CLT Certification Preparation',
        hours: 20,
        description:
          'Full-length timed practice across every CLA and CLT assessment area, with a metrics workshop covering fill rate, on-time delivery, dock-to-stock time, inventory record accuracy, and cost per unit shipped. Closes with a capstone in which members diagnose a distribution-center performance problem from its metrics and present corrective actions to a supervisor panel.',
        certificationAlignment: [
          'Measurements and Metrics',
          'Global Supply Chain Logistics Life Cycle',
        ],
      },
    ],
  },
};

export function getProgramCurriculum(slug: string): ProgramCurriculum | undefined {
  return PROGRAM_CURRICULA[slug];
}
