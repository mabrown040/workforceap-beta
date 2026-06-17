// Real testimonials only — no placeholders.
//
// WorkforceAP shows member stories only after consent and staff review.
// The canonical source for published testimonials is the database
// (`prisma.testimonial` with status=PUBLISHED). Static entries here are
// reserved for real, consented quotes that have been reviewed and approved.
//
// See: components/marketing/TestimonialsCarousel.tsx (server component
// that queries the live testimonial table).

export type Testimonial = {
  id: string;
  quote: string;
  name: string;
  role?: string;
  program?: string;
  salaryBefore?: string;
  salaryAfter?: string;
  avatarUrl?: string;
};

export const TESTIMONIALS: Testimonial[] = [];
