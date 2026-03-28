interface StitchStatsBarProps {
  programCount: number;
}

export default function StitchStatsBar({ programCount }: StitchStatsBarProps) {
  const stats = [
    { value: `${programCount}+`, label: 'Specialized Programs' },
    { value: '$0', label: 'Total Tuition Cost' },
    { value: '12-24', label: 'Weeks to Graduate' },
  ];

  return (
    <section className="wa-bg-m3d-surface-container-low wa-py-12">
      <div className="wa-mx-auto wa-max-w-7xl wa-px-6">
        <div className="wa-grid wa-grid-cols-1 md:wa-grid-cols-3 wa-gap-8 wa-text-center">
          {stats.map((stat) => (
            <div key={stat.label}>
              <p className="wa-text-4xl wa-font-black wa-text-m3d-primary">
                {stat.value}
              </p>
              <p className="wa-mt-2 wa-text-xs wa-uppercase wa-tracking-widest wa-text-m3d-on-surface-variant wa-font-medium">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
