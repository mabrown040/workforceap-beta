import { ImageResponse } from 'next/og';

export const runtime = 'edge';

const BRAND_BG = '#0b1220';
const ACCENT = '#3b82f6';
const TEXT = '#f8fafc';
const MUTED = '#94a3b8';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const title = (searchParams.get('title') ?? 'Workforce Advancement Project').slice(0, 120);
  const description = (searchParams.get('description') ?? 'No-cost career training pathways in Austin, TX.').slice(0, 220);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: `linear-gradient(135deg, ${BRAND_BG} 0%, #111827 55%, #1e293b 100%)`,
          padding: '64px 72px',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 12,
              background: ACCENT,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: TEXT,
              fontSize: 28,
              fontWeight: 700,
            }}
          >
            W
          </div>
          <div style={{ color: MUTED, fontSize: 28, fontWeight: 600 }}>Workforce Advancement Project</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ color: TEXT, fontSize: 64, fontWeight: 700, lineHeight: 1.1, letterSpacing: '-0.02em' }}>
            {title}
          </div>
          <div style={{ color: MUTED, fontSize: 32, lineHeight: 1.35, maxWidth: 960 }}>{description}</div>
        </div>

        <div style={{ color: MUTED, fontSize: 24 }}>workforceap.org · Austin, TX</div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}
