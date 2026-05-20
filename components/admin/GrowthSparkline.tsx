type GrowthSparklineProps = {
  data: number[];
  color?: string;
  height?: number;
};

export default function GrowthSparkline({
  data,
  color = 'var(--color-accent)',
  height = 36,
}: GrowthSparklineProps) {
  if (data.length === 0) {
    return <div style={{ height, opacity: 0.25, background: 'var(--color-surface-variant)', borderRadius: 4 }} />;
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const width = 100;
  const step = width / (data.length - 1 || 1);

  const points = data
    .map((v, i) => {
      const x = i * step;
      const y = height - ((v - min) / range) * (height - 4) - 2;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      style={{ width: '100%', height, display: 'block' }}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
        opacity={0.75}
      />
    </svg>
  );
}
