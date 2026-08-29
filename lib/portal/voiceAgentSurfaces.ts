import { createElement, type ReactNode } from 'react';
import { AudioLines, Briefcase, Building2, Handshake, Headphones, MessageSquare, Sparkles, Target } from 'lucide-react';

type Surface = {
  badge: string;
  subtext?: string;
  icon: ReactNode;
  glowColor: string;
  gradient: string;
  ctaGradient?: string;
  ctaShadow?: string;
};

const CRIMSON = '#ad2c4d';
const CRIMSON_DARK = '#8c0f37';
const GOLD = '#a47f38';
const GOLD_DARK = '#7d5f26';
const BLUE = '#2b7bb9';
const BLUE_DARK = '#1f5a87';

const icon = (Icon: typeof Target) => createElement(Icon, { size: 22, 'aria-hidden': true });

export const readinessVoiceSurface: Surface = {
  /* Badges normalized to short Title Case across all voice surfaces
     (audit #55) — was "Workforce Readiness & career coach". */
  badge: 'READINESS',
  subtext: 'Interviews, certifications, and next steps — talked through out loud.',
  icon: icon(Target),
  glowColor: GOLD,
  gradient: `linear-gradient(135deg, ${GOLD}, ${GOLD_DARK})`,
  ctaGradient: `linear-gradient(135deg, ${GOLD}, ${GOLD_DARK})`,
  ctaShadow: '0 8px 24px rgba(164,127,56,0.24)',
};

export const resumeCoachVoiceSurface: Surface = {
  badge: 'RESUME',
  subtext:
    'Voice feedback on bullets and framing. Pair with your live draft when you use the rewriter.',
  icon: icon(Sparkles),
  glowColor: CRIMSON,
  gradient: `linear-gradient(135deg, ${CRIMSON}, ${CRIMSON_DARK})`,
  ctaGradient: `linear-gradient(135deg, ${CRIMSON}, ${CRIMSON_DARK})`,
  ctaShadow: '0 8px 24px rgba(173,44,77,0.2)',
};

export const counselorStaffVoiceSurface: Surface = {
  badge: 'COUNSELOR',
  subtext: 'Member support, outreach, and how to use this workspace.',
  icon: icon(MessageSquare),
  glowColor: BLUE,
  gradient: `linear-gradient(135deg, ${BLUE}, ${BLUE_DARK})`,
  ctaGradient: `linear-gradient(135deg, ${BLUE}, ${BLUE_DARK})`,
  ctaShadow: '0 8px 24px rgba(43,123,185,0.2)',
};

export const studentCounselorVoiceSurface: Surface = {
  badge: 'LILLEY',
  subtext: 'Student career coaching — then your personalized action plan.',
  icon: icon(Headphones),
  glowColor: BLUE,
  gradient: `linear-gradient(135deg, ${BLUE}, ${BLUE_DARK})`,
  ctaGradient: `linear-gradient(135deg, ${BLUE}, ${BLUE_DARK})`,
  ctaShadow: '0 8px 24px rgba(43,123,185,0.2)',
};

export const employerVoiceSurface: Surface = {
  badge: 'Employer assistant',
  subtext: 'Postings, applicants, and navigating the employer portal.',
  icon: icon(Building2),
  glowColor: CRIMSON,
  gradient: `linear-gradient(135deg, ${CRIMSON}, ${CRIMSON_DARK})`,
  ctaGradient: `linear-gradient(135deg, ${CRIMSON}, ${CRIMSON_DARK})`,
  ctaShadow: '0 8px 24px rgba(173,44,77,0.2)',
};

export const partnerVoiceSurface: Surface = {
  badge: 'Partner assistant',
  subtext: 'Referrals, member progress, and partner tools.',
  icon: icon(Handshake),
  glowColor: GOLD,
  gradient: `linear-gradient(135deg, ${GOLD}, ${GOLD_DARK})`,
  ctaGradient: `linear-gradient(135deg, ${GOLD}, ${GOLD_DARK})`,
  ctaShadow: '0 8px 24px rgba(164,127,56,0.24)',
};

export const mockInterviewVoiceSurface: Surface = {
  badge: 'PRACTICE',
  subtext: 'Answer out loud — optional camera recording for review.',
  icon: icon(AudioLines),
  glowColor: CRIMSON,
  gradient: `linear-gradient(135deg, ${CRIMSON_DARK}, #5e1426)`,
  ctaGradient: `linear-gradient(135deg, ${CRIMSON}, ${CRIMSON_DARK})`,
  ctaShadow: '0 8px 24px rgba(173,44,77,0.2)',
};

export const careerBusinessVoiceSurface: Surface = {
  badge: 'ADVANCED',
  subtext: 'Career, project management, sales, marketing, and business guidance.',
  icon: icon(Briefcase),
  glowColor: CRIMSON,
  gradient: `linear-gradient(135deg, ${CRIMSON}, ${CRIMSON_DARK})`,
  ctaGradient: `linear-gradient(135deg, ${CRIMSON}, ${CRIMSON_DARK})`,
  ctaShadow: '0 8px 24px rgba(173,44,77,0.2)',
};
