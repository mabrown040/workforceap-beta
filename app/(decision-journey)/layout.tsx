import Footer from '@/components/Footer';
import MobileBottomNav from '@/components/MobileBottomNav';
import ProgramsDecisionJourneyNav from '@/components/ProgramsDecisionJourneyNav';
import ScrollToTopButton from '@/components/ScrollToTopButton';

/**
 * Shared layout for the career decision journey pages:
 * /find-your-path, /programs, /program-comparison, /salary-guide.
 *
 * The ProgramsDecisionJourneyNav lives here so it NEVER unmounts —
 * it stays frozen in place during soft navigation between sibling routes.
 * Only {children} swaps when the user clicks a tab.
 */
export default function DecisionJourneyLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ProgramsDecisionJourneyNav />
      {children}
      <ScrollToTopButton />
      <Footer />
      <MobileBottomNav variant="marketing" />
    </>
  );
}
