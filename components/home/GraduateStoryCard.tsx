import Image from 'next/image';

type GraduateStoryProps = {
  name: string;
  role: string;
  imageSrc: string;
  beforePay: string;
  afterPay: string;
};

export default function GraduateStoryCard({ name, role, imageSrc, beforePay, afterPay }: GraduateStoryProps) {
  return (
    <div
      style={{
        backgroundColor: '#201f1f',
        padding: '2rem',
        borderRadius: '0.75rem',
        border: '1px solid rgba(88, 65, 68, 0.15)',
        transition: 'border-color 0.2s',
      }}
      className="hover:wa-border-[#ad2c4d]/30"
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.5rem' }}>
        <Image
          src={imageSrc}
          alt={`${name} - ${role}`}
          width={80}
          height={80}
          className="wa-rounded-lg wa-object-cover"
          style={{ filter: 'grayscale(1)', width: 80, height: 80 }}
        />
        <div>
          <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#e6e1e1' }}>{name}</h3>
          <div style={{ color: '#ad2c4d', fontWeight: 700, fontSize: '0.875rem', marginBottom: '1rem' }}>{role}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{ backgroundColor: '#141313', padding: '0.75rem', borderRadius: '0.5rem' }}>
              <div style={{ fontSize: '10px', color: '#debfc2', textTransform: 'uppercase', fontWeight: 700 }}>Before</div>
              <div style={{ fontSize: '1.125rem', fontWeight: 700, color: '#e6e1e1' }}>{beforePay}</div>
            </div>
            <div style={{ backgroundColor: 'rgba(173, 44, 77, 0.1)', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid rgba(173, 44, 77, 0.2)' }}>
              <div style={{ fontSize: '10px', color: '#ffb2bc', textTransform: 'uppercase', fontWeight: 700 }}>After</div>
              <div style={{ fontSize: '1.125rem', fontWeight: 700, color: '#ffb2bc' }}>{afterPay}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
