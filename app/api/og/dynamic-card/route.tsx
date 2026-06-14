import { ImageResponse } from 'next/og';
import { parseOgShareCardParams, type CertificateShareCard, type SkillCheckpointShareCard } from '@/lib/og/shareCards';

export const runtime = 'edge';

const MAROON = '#a01142';
const MAROON_DARK = '#5e0a26';
const GOLD = '#ffd166';
const MINT = '#06d6a0';
const WHITE = '#ffffff';
const TEXT_MUTED = 'rgba(255,255,255,0.78)';

type BadgeProps = {
  label: string;
  accent: string;
};

function Badge({ label, accent }: BadgeProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        alignSelf: 'flex-start',
        background: 'rgba(255,255,255,0.16)',
        border: '2px solid rgba(255,255,255,0.24)',
        color: WHITE,
        padding: '14px 26px',
        borderRadius: 999,
        fontSize: 27,
        fontWeight: 850,
      }}
    >
      <div
        style={{
          display: 'flex',
          width: 20,
          height: 20,
          borderRadius: 20,
          background: accent,
          boxShadow: `0 0 28px ${accent}`,
        }}
      />
      {label}
    </div>
  );
}

function CardShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        background: `linear-gradient(135deg, ${MAROON} 0%, ${MAROON_DARK} 100%)`,
        padding: '64px 70px',
        fontFamily: 'system-ui, sans-serif',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{ position: 'absolute', top: -120, right: -90, width: 390, height: 390, borderRadius: 390, background: GOLD, opacity: 0.18, display: 'flex' }} />
      <div style={{ position: 'absolute', bottom: -90, left: 440, width: 260, height: 260, borderRadius: 260, background: MINT, opacity: 0.18, display: 'flex' }} />
      <div style={{ position: 'absolute', top: 76, right: 88, width: 150, height: 150, borderRadius: 34, border: '5px solid rgba(255,255,255,0.18)', transform: 'rotate(10deg)', display: 'flex' }} />
      {children}
    </div>
  );
}

function Footer({ cta }: { cta: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: WHITE, fontSize: 29, fontWeight: 800 }}>
      <div style={{ display: 'flex', opacity: 0.9 }}>WorkforceAP</div>
      <div style={{ display: 'flex', background: WHITE, color: MAROON, padding: '10px 22px', borderRadius: 12, fontWeight: 900 }}>
        {cta}
      </div>
    </div>
  );
}

function SkillCheckpointCard({ card }: { card: SkillCheckpointShareCard }) {
  return (
    <CardShell>
      <div style={{ display: 'flex', flexDirection: 'column', maxWidth: 860, zIndex: 1 }}>
        <Badge label="SKILL CHECKPOINT COMPLETE" accent={MINT} />
        <div style={{ display: 'flex', color: WHITE, opacity: 0.88, fontSize: 35, fontWeight: 800, marginTop: 36 }}>
          {card.userDisplayName} completed
        </div>
        <div style={{ display: 'flex', color: WHITE, fontSize: 78, fontWeight: 950, lineHeight: 1.04, marginTop: 14 }}>
          {card.skillName}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, color: TEXT_MUTED, fontSize: 29, fontWeight: 700, marginTop: 30 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 58, height: 58, borderRadius: 58, background: GOLD, color: MAROON, fontSize: 38, fontWeight: 950 }}>✓</div>
          Badge earned and ready to share
        </div>
      </div>
      <Footer cta="workforceap.org/dashboard/training" />
    </CardShell>
  );
}

function CertificateCard({ card }: { card: CertificateShareCard }) {
  return (
    <CardShell>
      <div style={{ display: 'flex', flexDirection: 'column', maxWidth: 900, zIndex: 1 }}>
        <Badge label="CERTIFICATE EARNED" accent={GOLD} />
        <div style={{ display: 'flex', color: WHITE, opacity: 0.88, fontSize: 35, fontWeight: 800, marginTop: 34 }}>
          Awarded to {card.userDisplayName}
        </div>
        <div style={{ display: 'flex', color: WHITE, fontSize: 76, fontWeight: 950, lineHeight: 1.03, marginTop: 16 }}>
          {card.certificateTitle}
        </div>
        <div style={{ display: 'flex', color: GOLD, fontSize: 31, fontWeight: 850, marginTop: 30 }}>
          Issued by {card.issuer} • {card.displayDate}
        </div>
      </div>
      <Footer cta="workforceap.org/certifications" />
    </CardShell>
  );
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const card = parseOgShareCardParams(searchParams);

  return new ImageResponse(
    card.kind === 'certificate' ? <CertificateCard card={card} /> : <SkillCheckpointCard card={card} />,
    { width: 1200, height: 630 },
  );
}
