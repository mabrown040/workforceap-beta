type Surface = {
  badge: string;
  subtext?: string;
  icon: string;
  glowColor: string;
  gradient: string;
};

export const readinessVoiceSurface: Surface = {
  badge: 'Workforce Readiness & career coach',
  subtext: 'Interviews, certifications, and next steps. Program context is included automatically.',
  icon: '🎯',
  glowColor: '#0d9488',
  gradient: 'linear-gradient(135deg, #0d9488, #14b8a6, #5eead4)',
};

export const resumeCoachVoiceSurface: Surface = {
  badge: 'Resume coach',
  subtext:
    'Voice feedback on bullets and framing. Pair with your live draft when you use the rewriter.',
  icon: '✨',
  glowColor: '#2563eb',
  gradient: 'linear-gradient(135deg, #2563eb, #3b82f6, #38bdf8)',
};

export const counselorStaffVoiceSurface: Surface = {
  badge: 'Counselor assistant',
  subtext: 'Student support, outreach, and how to use this workspace.',
  icon: '💬',
  glowColor: '#c026d3',
  gradient: 'linear-gradient(135deg, #86198f, #c026d3, #f0abfc)',
};

export const studentCounselorVoiceSurface: Surface = {
  badge: 'Your counselor',
  subtext: 'Private voice session — then your personalized action plan.',
  icon: '🎧',
  glowColor: '#db2777',
  gradient: 'linear-gradient(135deg, #be185d, #db2777, #fbcfe8)',
};

export const employerVoiceSurface: Surface = {
  badge: 'Employer assistant',
  subtext: 'Postings, applicants, and navigating the employer portal.',
  icon: '🏢',
  glowColor: '#4f46e5',
  gradient: 'linear-gradient(135deg, #4f46e5, #6366f1, #a5b4fc)',
};

export const partnerVoiceSurface: Surface = {
  badge: 'Partner assistant',
  subtext: 'Referrals, member progress, and partner tools.',
  icon: '🤝',
  glowColor: '#ea580c',
  gradient: 'linear-gradient(135deg, #ea580c, #f97316, #fdba74)',
};

export const mockInterviewVoiceSurface: Surface = {
  badge: 'Mock interview',
  subtext: 'Answer out loud — optional camera recording for review.',
  icon: '🎙️',
  glowColor: '#7c3aed',
  gradient: 'linear-gradient(135deg, #5b21b6, #7c3aed, #c4b5fd)',
};
