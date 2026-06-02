import { PROGRAMS } from '@/lib/content/programs';
import { PROGRAM_SUBGROUPS, orderedSubgroupIdsWithPrograms } from '@/lib/content/programSubgroup';

/**
 * Mobile-only sticky jump links to catalog sections on /programs.
 * Keeps the full catalog visually open (product stake) while shortening scroll distance on small screens.
 */
export default function ProgramsMobileBrowseNav() {
  const chips = [
    { href: '#programs-quick-start', label: 'Quick start' },
    { href: '#program-catalog', label: 'All' },
    ...orderedSubgroupIdsWithPrograms(PROGRAMS).map((id) => ({
      href: `#subgroup-${id}`,
      label: PROGRAM_SUBGROUPS.find((s) => s.id === id)?.shortLabel ?? id,
    })),
  ];

  return (
    <nav className="programs-mobile-browse" aria-label="Jump to program categories">
      <div className="programs-mobile-browse__scroller">
        {chips.map((chip) => (
          <a key={chip.href} href={chip.href} className="programs-mobile-browse__chip">
            {chip.label}
          </a>
        ))}
      </div>
    </nav>
  );
}
