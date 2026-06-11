export interface ResumeBullet {
  text: string;
  /** 1-indexed line number in original resume */
  line: number;
  /** Section header this bullet falls under, normalized lowercase */
  section: string | null;
  /** Word count */
  words: number;
  /** First token, lowercased, stripped of punctuation */
  firstWord: string;
  /** True if bullet contains a numeric metric (%, $, count, year range) */
  hasMetric: boolean;
  /** True if firstWord matches the action-verb list */
  startsWithActionVerb: boolean;
}

export interface ResumeSection {
  name: string;
  normalized: 'summary' | 'experience' | 'education' | 'skills' | 'certifications' | 'projects' | 'contact' | 'other';
  startLine: number;
  endLine: number;
}

export interface ResumeFeatures {
  rawText: string;
  /** Normalized lines (trimmed, empty lines collapsed) */
  lines: string[];
  sections: ResumeSection[];
  bullets: ResumeBullet[];
  /** Detected contact signals (email, phone, linkedin url) */
  contact: {
    email: string | null;
    phone: string | null;
    linkedinUrl: string | null;
    cityState: string | null;
  };
  /** All date ranges parsed from experience bullets */
  dateRanges: Array<{ from: string; to: string; current: boolean }>;
  /**
   * True when the input had no usable line structure (e.g. PDF copy/paste
   * collapsed to one blob) and sections were recovered by re-flowing the
   * text around inline headers/bullet glyphs. Formatting scores are
   * approximate in this mode.
   */
  reflowed?: boolean;
}

export interface StructuralSubscore {
  score: number;
  weight: number;
  notes: string[];
}

export interface StructuralScore {
  composite: number;
  breakdown: {
    structure: StructuralSubscore;
    quantification: StructuralSubscore;
    actionVerbs: StructuralSubscore;
    bulletLength: StructuralSubscore;
    contact: StructuralSubscore;
  };
  features: ResumeFeatures;
}
