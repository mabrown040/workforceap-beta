const TESTIMONIALS = [
  {
    quote:
      'I went from retail to IT support in 4 months. WorkforceAP covered everything \u2014 the course, the cert, and even helped me prep for interviews. I landed a job paying $18/hr before I even finished.',
    name: 'Marcus T.',
    detail: 'CompTIA A+ Graduate \u00b7 Now: IT Support Specialist',
  },
  {
    quote:
      'As a single mom, I couldn\u2019t afford to take a risk. WorkforceAP was fully funded, fully flexible, and the counselors actually checked in on me. I passed my Google cert on the first try.',
    name: 'Destiny R.',
    detail: 'Google IT Support Graduate \u00b7 Now: Help Desk Technician',
  },
  {
    quote:
      'I was skeptical because it was free. But this program is the real deal. My instructor was sharp, the material was current, and I had job offers within two weeks of getting certified.',
    name: 'Jordan K.',
    detail: 'CompTIA Network+ Graduate \u00b7 Now: Network Technician',
  },
];

export default function HomepageTestimonials() {
  return (
    <section style={{ background: 'var(--surface-container-low)', padding: 'clamp(3rem, 6vw, 6rem) 0' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 clamp(1rem, 4vw, 2rem)' }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <span
            className="text-label-upper"
            style={{ color: 'var(--color-accent)', marginBottom: '0.75rem', display: 'inline-block' }}
          >
            Real Outcomes
          </span>
          <h2 className="text-display-sm">What Our Graduates Say</h2>
        </div>

        <div
          className="home-testimonials-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
            gap: '1.5rem',
          }}
        >
          {TESTIMONIALS.map((t) => (
            <div
              key={t.name}
              className="stitch-card"
              style={{
                background: 'var(--surface-container-lowest)',
                padding: '2rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.25rem',
              }}
            >
              <p
                style={{
                  fontStyle: 'italic',
                  color: 'var(--color-on-surface)',
                  lineHeight: 1.7,
                  fontSize: '0.95rem',
                  flex: 1,
                }}
              >
                &ldquo;{t.quote}&rdquo;
              </p>
              <div>
                <span style={{ fontWeight: 700, color: 'var(--color-on-surface)', display: 'block' }}>
                  {t.name}
                </span>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-on-surface-variant)' }}>
                  {t.detail}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
