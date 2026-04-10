import Footer from '@/components/Footer';
import MobileBottomNav from '@/components/MobileBottomNav';

/**
 * Shared layout for the career decision journey pages:
 * /find-your-path, /programs, /program-comparison, /salary-guide.
 *
 * Next.js preserves this layout across sibling route transitions,
 * so the tab nav stays visually stable during soft navigation —
 * no full reload, no scroll-to-top.
 */
export default function DecisionJourneyLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Footer />
      <MobileBottomNav variant="marketing" />
    </>
  );
}
