import { Program } from '@/lib/content/programs';

interface Props {
  program: Program;
}

export function ProgramFaqAccordion({ program }: Props) {
  const faqs = [
    {
      q: 'Is this program really free?',
      a: `Yes — the ${program.title} is available at no cost to qualifying members through WIOA and workforce development funding. There are no hidden fees or tuition costs.`,
    },
    {
      q: 'How long does it take to complete?',
      a: `The program takes ${program.duration} to complete. Most members finish within 3-5 months while working part-time.`,
    },
    {
      q: 'What certificate do I earn?',
      a: `You earn a ${program.partner} Professional Certificate, recognized by employers nationwide. This credential is delivered through Coursera and can be added to your LinkedIn profile and resume.`,
    },
    {
      q: 'Do I need prior experience?',
      a: 'No prior experience is required. These programs are designed for career changers and beginners. We provide career coaching and technical support throughout your journey.',
    },
    {
      q: 'Will this help me get a job?',
      a: `Yes — ${program.partner} certificates are specifically designed to prepare you for in-demand roles. Our career coaches help with resume building, interview prep, and direct employer connections in the Austin area.`,
    },
    {
      q: 'Can I do this online?',
      a: 'Yes — the entire program is online and self-paced. You can learn from anywhere with an internet connection. We also offer optional in-person study groups and career events in Austin.',
    },
  ];

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      {faqs.map((faq, i) => (
        <details
          key={i}
          className="group rounded-xl bg-white border border-slate-200 open:shadow-sm transition-all"
        >
          <summary className="flex cursor-pointer items-center justify-between p-6 font-semibold text-slate-900">
            {faq.q}
            <span className="ml-4 text-slate-400 group-open:rotate-180 transition-transform">
              ▼
            </span>
          </summary>
          <div className="px-6 pb-6 text-slate-600 leading-relaxed">
            {faq.a}
          </div>
        </details>
      ))}
    </div>
  );
}
