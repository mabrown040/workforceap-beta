import { WORKFORCEAP_PROGRAM_CATALOG_SIZE } from '@/lib/content/programs';

export default function StatsBar() {
  return (
    <section className="wa-py-12" style={{ backgroundColor: '#1c1b1b' }}>
      <div className="wa-mx-auto wa-max-w-7xl wa-px-8 wa-grid wa-grid-cols-1 md:wa-grid-cols-3 wa-gap-12 wa-text-center md:wa-text-left">
        <div className="wa-space-y-2">
          <div style={{ fontSize: '2.25rem', fontWeight: 900, color: '#ffb2bc' }}>{WORKFORCEAP_PROGRAM_CATALOG_SIZE}+</div>
          <div style={{ fontSize: '0.875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#debfc2' }}>Specialized Programs</div>
        </div>
        <div className="wa-space-y-2">
          <div style={{ fontSize: '2.25rem', fontWeight: 900, color: '#ffb2bc' }}>$0</div>
          <div style={{ fontSize: '0.875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#debfc2' }}>Total Tuition Cost</div>
        </div>
        <div className="wa-space-y-2">
          <div style={{ fontSize: '2.25rem', fontWeight: 900, color: '#ffb2bc' }}>12-24</div>
          <div style={{ fontSize: '0.875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#debfc2' }}>Weeks to Graduate</div>
        </div>
      </div>
    </section>
  );
}
