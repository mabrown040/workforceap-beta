export type ResumeFramework = 'early_career' | 'career_transition' | 'experienced';

export type ResumeFrameworkSignals = {
  employmentStatus?: string | null;
  educationLevel?: string | null;
  yearsExperienceHint?: string | null;
};

/**
 * Pick resume coaching frame from profile heuristics (no LLM).
 * `auto` defers to this inference on the server.
 */
export function inferResumeFramework(signals: ResumeFrameworkSignals): ResumeFramework {
  const emp = (signals.employmentStatus ?? '').toLowerCase();
  const edu = (signals.educationLevel ?? '').toLowerCase();

  if (emp.includes('student') || emp.includes('first') || edu.includes('high school') || edu.includes('ged')) {
    return 'early_career';
  }
  if (
    emp.includes('career change') ||
    emp.includes('transition') ||
    emp.includes('unemployed') ||
    emp.includes('laid') ||
    emp.includes('returning')
  ) {
    return 'career_transition';
  }
  if (emp.includes('employed') || emp.includes('experienced') || edu.includes('bachelor') || edu.includes('master')) {
    return 'experienced';
  }
  return 'career_transition';
}

export function resumeFrameworkPromptBlock(framework: ResumeFramework): string {
  switch (framework) {
    case 'early_career':
      return `FRAMEWORK: Early-career / limited work history. Prioritize strengths from school, volunteer work, part-time roles, and transferable coursework. Avoid implying seniority the candidate does not have. Keep bullets concrete and coach them to add metrics they can verify.`;
    case 'experienced':
      return `FRAMEWORK: Experienced professional. Use confident, concise business language. Surface leadership, scope, and measurable outcomes already present in the resume. Do not add seniority or metrics not evidenced in the source.`;
    case 'career_transition':
    default:
      return `FRAMEWORK: Career transition. Emphasize transferable skills and reframed accomplishments toward the stated target role. Call out gaps honestly in the "HOW WE POSITIONED YOU" section with suggestions to add evidence, rather than inventing experience.`;
  }
}
