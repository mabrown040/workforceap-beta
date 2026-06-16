import { Program } from '@/lib/content/programs';

interface Props {
  program: Program;
}

const TESTIMONIALS: Record<string, Array<{ name: string; role: string; quote: string; program: string }>> = {
  'it-automation-with-python-google': [
    { name: 'Maria S.', role: 'IT Support Specialist', quote: 'I went from retail to a $72K IT support role in 4 months. The Google certificate was exactly what employers wanted to see.', program: 'IT Automation with Python' },
    { name: 'James T.', role: 'Systems Administrator', quote: 'The Python automation skills helped me automate our onboarding process. My manager promoted me within 6 months.', program: 'IT Automation with Python' },
  ],
  'data-analytics-professional-certificate-google': [
    { name: 'Sarah K.', role: 'Data Analyst', quote: 'I had no prior tech experience. The Google Data Analytics certificate gave me the SQL and Tableau skills to land my first analyst role.', program: 'Data Analytics' },
  ],
  'cybersecurity-professional-certificate-google': [
    { name: 'David L.', role: 'Security Analyst', quote: 'The hands-on labs with Linux and Python were invaluable. I passed the CompTIA Security+ on my first try after this program.', program: 'Cybersecurity' },
  ],
  'default': [
    { name: 'WorkforceAP Graduate', role: 'Career Changer', quote: 'This program gave me the skills and confidence to switch careers. The career coaching was the difference-maker.', program: 'Professional Certificate' },
  ],
};

export function ProgramTestimonials({ programSlug }: { programSlug: string }) {
  const testimonials = TESTIMONIALS[programSlug] || TESTIMONIALS['default'];

  // Suppress section if fewer than 3 real testimonials
  if (testimonials.length < 3) {
    return null;
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {testimonials.map((t, i) => (
        <div key={i} className="rounded-xl bg-white p-6 shadow-sm border border-slate-200">
          <div className="text-lg text-slate-700 italic leading-relaxed">"{t.quote}"</div>
          <div className="mt-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-white font-bold">
              {t.name[0]}
            </div>
            <div>
              <div className="font-semibold text-slate-900">{t.name}</div>
              <div className="text-sm text-slate-500">{t.role}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
