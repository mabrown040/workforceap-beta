/**
 * Gradient fallbacks for blog posts when cover_image is null.
 * Maps category to gradient colors.
 */
export const BLOG_GRADIENTS: Record<string, string> = {
  'Career Tips': 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
  'Program Spotlight': 'linear-gradient(135deg, #9333ea 0%, #6b21a8 100%)',
  Local: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
  'Success Stories': 'linear-gradient(135deg, #f97316 0%, #c2410c 100%)',
  News: 'linear-gradient(135deg, #4b5563 0%, #1f2937 100%)',
};

export const DEFAULT_BLOG_GRADIENT = 'linear-gradient(135deg, #1a1a1a 0%, #262626 100%)';

export function getBlogGradient(category: string | null): string {
  return (category && BLOG_GRADIENTS[category]) || DEFAULT_BLOG_GRADIENT;
}
