import { ImageResponse } from 'next/og';
import { typeSlugToLabel } from '@/lib/career/careerQuizRules';

export const runtime = 'edge';

// Bold/Fun share card for career-quiz results. Renders the user's RIASEC type
// (from ?type=investigative-social) and an optional top career (?c=Registered Nurse)
// as a 1200x630 PNG that social platforms show in the link preview.
const MAROON = '#a01142';
const MAROON_DARK = '#5e0a26';
const GOLD = '#ffd166';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const label = typeSlugToLabel(searchParams.get('type')) ?? 'Find your career type';
  const career = (searchParams.get('c') ?? '').slice(0, 60);
  const [areaA, areaB] = label.split(' & ');

  const tagText = career ? `Top match: ${career}` : 'Free 60-second career quiz';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: `linear-gradient(135deg, ${MAROON} 0%, ${MAROON_DARK} 100%)`,
          padding: '70px',
          fontFamily: 'system-ui, sans-serif',
          position: 'relative',
        }}
      >
        {/* decorative blobs */}
        <div style={{ position: 'absolute', top: -120, right: -90, width: 380, height: 380, borderRadius: 400, background: GOLD, opacity: 0.18, display: 'flex' }} />
        <div style={{ position: 'absolute', bottom: -80, left: 480, width: 240, height: 240, borderRadius: 240, background: '#06d6a0', opacity: 0.18, display: 'flex' }} />

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', color: '#fff', opacity: 0.85, fontSize: 28, fontWeight: 800, letterSpacing: 3 }}>
            MY CAREER TYPE
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', color: '#fff', fontSize: 92, fontWeight: 900, lineHeight: 1.02, marginTop: 18 }}>
            <span style={{ color: '#fff' }}>{areaA}</span>
            {areaB ? <span style={{ color: GOLD, marginLeft: 22 }}>{`& ${areaB}`}</span> : null}
          </div>
          <div style={{ display: 'flex', alignSelf: 'flex-start', marginTop: 26, background: 'rgba(255,255,255,0.16)', color: '#fff', padding: '12px 26px', borderRadius: 999, fontSize: 30, fontWeight: 700 }}>
            {tagText}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', color: '#fff', fontSize: 33, fontWeight: 800 }}>
          What&apos;s yours?
          <div style={{ display: 'flex', background: '#fff', color: MAROON, padding: '10px 22px', borderRadius: 12, fontWeight: 900, margin: '0 16px' }}>
            workforceap.org/career-quiz
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
