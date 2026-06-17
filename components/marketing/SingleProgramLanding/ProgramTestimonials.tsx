import { prisma } from '@/lib/db/prisma';
import { TestimonialStatus } from '@prisma/client';
import { getProgramBySlug } from '@/lib/content/programs';

interface Props {
  programSlug: string;
}

export async function ProgramTestimonials({ programSlug }: Props) {
  // Query real, published testimonials from the database.
  // Only show testimonials that are explicitly consented and staff-approved.
  const testimonials = await prisma.testimonial.findMany({
    where: {
      status: TestimonialStatus.PUBLISHED,
      deletedAt: null,
      consentGiven: true,
      member: {
        enrolledProgram: programSlug,
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 6,
    include: {
      member: {
        select: {
          fullName: true,
          enrolledProgram: true,
        },
      },
    },
  });

  // Suppress section entirely if fewer than 3 real testimonials.
  // This prevents showing a sparse or unconvincing social-proof section.
  if (testimonials.length < 3) {
    return null;
  }

  const programTitle = getProgramBySlug(programSlug)?.title ?? programSlug;

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {testimonials.map((t) => (
        <div key={t.id} className="rounded-xl bg-white p-6 shadow-sm border border-slate-200">
          <div className="text-lg text-slate-700 italic leading-relaxed">"{t.content}"</div>
          <div className="mt-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-white font-bold">
              {t.member.fullName?.charAt(0).toUpperCase() ?? 'M'}
            </div>
            <div>
              <div className="font-semibold text-slate-900">{t.member.fullName ?? 'Member'}</div>
              <div className="text-sm text-slate-500">{programTitle}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
