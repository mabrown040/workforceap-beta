import { WORKFORCEAP_PROGRAM_CATALOG_SIZE } from '@/lib/content/programs';

export default function StatsBar() {
  return (
    <section className="wa-py-12 wa-bg-gray-50 dark:wa-bg-[#1c1b1b]">
      <div className="wa-mx-auto wa-max-w-7xl wa-px-8 wa-grid wa-grid-cols-1 md:wa-grid-cols-3 wa-gap-12 wa-text-center md:wa-text-left">
        <div className="wa-space-y-2">
          <div className="wa-text-4xl wa-font-black wa-text-[#ad2c4d] dark:wa-text-[#ffb2bc]">{WORKFORCEAP_PROGRAM_CATALOG_SIZE}+</div>
          <div className="wa-text-sm wa-font-bold wa-uppercase wa-tracking-[0.2em] wa-text-gray-600 dark:wa-text-[#debfc2]">Specialized Programs</div>
        </div>
        <div className="wa-space-y-2">
          <div className="wa-text-4xl wa-font-black wa-text-[#ad2c4d] dark:wa-text-[#ffb2bc]">$0</div>
          <div className="wa-text-sm wa-font-bold wa-uppercase wa-tracking-[0.2em] wa-text-gray-600 dark:wa-text-[#debfc2]">Total Tuition Cost</div>
        </div>
        <div className="wa-space-y-2">
          <div className="wa-text-4xl wa-font-black wa-text-[#ad2c4d] dark:wa-text-[#ffb2bc]">12-24</div>
          <div className="wa-text-sm wa-font-bold wa-uppercase wa-tracking-[0.2em] wa-text-gray-600 dark:wa-text-[#debfc2]">Weeks to Graduate</div>
        </div>
      </div>
    </section>
  );
}
