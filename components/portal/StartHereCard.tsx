import Link from 'next/link';
import { FileText, Mic, BookOpen } from 'lucide-react';

const CTAS = [
  {
    href: '/dashboard/ai-tools/resume-rewriter',
    label: 'Complete resume',
    description: 'Complete or improve your resume with AI support',
    Icon: FileText,
  },
  {
    href: '/dashboard/ai-tools/interview-practice',
    label: 'Practice interview',
    description: 'Prepare with role-specific questions',
    Icon: Mic,
  },
  {
    href: '/dashboard/learning',
    label: 'Review learning hub',
    description: 'Pathways, resource library, and program tools',
    Icon: BookOpen,
  },
] as const;

export default function StartHereCard() {
  return (
    <div className="start-here-card" role="region" aria-labelledby="start-here-title">
      <h2 id="start-here-title" className="start-here-title">
        Start Here
      </h2>
      <p className="start-here-subtitle">Follow these next steps to move from learning to readiness to applications</p>
      <div className="start-here-ctas">
        {CTAS.map((cta) => {
          const Icon = cta.Icon;
          return (
          <Link
            key={cta.label}
            href={cta.href}
            className="start-here-cta"
            aria-label={`${cta.label}: ${cta.description}`}
          >
            <span className="start-here-cta-icon" aria-hidden>
              <Icon size={20} className="text-current" />
            </span>
            <div className="start-here-cta-content">
              <span className="start-here-cta-label">{cta.label}</span>
              <span className="start-here-cta-desc">{cta.description}</span>
            </div>
            <span className="start-here-cta-arrow" aria-hidden>
              →
            </span>
          </Link>
          );
        })}
      </div>
    </div>
  );
}
