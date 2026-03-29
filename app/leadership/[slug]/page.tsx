import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { buildPageMetadata, SITE_URL } from '@/app/seo';
import Footer from '@/components/Footer';
import {
  getLeaderBySlug,
  LEADERS,
  type LeaderBioBlock,
} from '@/lib/content/leadership';
import '../leadership-detail.css';

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return LEADERS.map((l) => ({ slug: l.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const leader = getLeaderBySlug(slug);
  if (!leader) return { title: 'Leadership' };

  return buildPageMetadata({
    title: `${leader.name} — ${leader.title}`,
    description: `Learn more about ${leader.name}, ${leader.title} at Workforce Advancement Project.`,
    path: `/leadership/${slug}`,
    image: `${SITE_URL}${leader.image}`,
  });
}

function BioBlocks({ blocks }: { blocks: LeaderBioBlock[] }) {
  return (
    <div className="ld-bio-blocks">
      {blocks.map((block, i) => {
        if (block.type === 'paragraph') {
          return <p key={i}>{block.text}</p>;
        }
        if (block.type === 'heading') {
          return <h3 key={i}>{block.text}</h3>;
        }
        if (block.type === 'bullets') {
          return (
            <ul key={i}>
              {block.items.map((item, j) => (
                <li key={j}>{item}</li>
              ))}
            </ul>
          );
        }
        return null;
      })}
    </div>
  );
}

/** Extract credential suffix like "PMP" or "PMP, ChE" from a name string */
function splitNameCredentials(name: string): { displayName: string; credentials: string | null } {
  const match = name.match(/^(.+?),\s*(.+)$/);
  if (!match) return { displayName: name, credentials: null };
  return { displayName: match[1], credentials: match[2] };
}

export default async function LeaderBioPage({ params }: Props) {
  const { slug } = await params;
  const leader = getLeaderBySlug(slug);
  if (!leader) notFound();

  const { displayName, credentials } = splitNameCredentials(leader.name);

  /* Pull first two bio paragraphs for the main bio card, rest for detail */
  const mainBioBlocks = leader.bioBlocks.slice(0, 2);
  const restBioBlocks = leader.bioBlocks.slice(2);

  /* First stat becomes the hero stat pair */
  const heroStats = leader.stats.slice(0, 2);

  const partnerships = [
    { icon: 'handshake', name: 'Goodwill Central Texas', desc: 'Career & Technical Academy' },
    { icon: 'account_balance', name: 'Texas Workforce Commission', desc: 'State Career Schools' },
    { icon: 'school', name: 'Austin Community College', desc: 'Continuing Education' },
    { icon: 'location_city', name: 'City of Austin', desc: 'Workforce Solutions' },
  ];

  const achievements = [
    { icon: 'emoji_events', title: 'Equity Innovation Award', desc: 'Recognized for transformative workforce equity programs across Central Texas.' },
    { icon: 'payments', title: '$20M+ Funding Secured', desc: 'Raised and directed over $20 million in grants, contracts, and partnerships for workforce development.' },
  ];

  return (
    <div className="inner-page ld-page">
      {/* ── Hero: 12-col grid ── */}
      <section className="ld-hero" aria-labelledby="ld-heading">
        <div className="ld-hero-inner">
          {/* Left: text (5 col) */}
          <div className="ld-hero-text">
            <span className="ld-hero-badge">
              <span className="material-symbols-outlined" style={{ fontSize: '1rem', fontVariationSettings: "'FILL' 1" }} aria-hidden>verified</span>
              Executive Leadership
            </span>

            <h1 id="ld-heading" className="ld-hero-name">
              {displayName}
              {credentials && <span className="ld-hero-credentials">, {credentials}</span>}
            </h1>

            <p className="ld-hero-title">{leader.title}</p>
            {leader.missionRelevance && (
              <p className="ld-hero-desc">{leader.missionRelevance}</p>
            )}

            {/* Stat cards */}
            <div className="ld-hero-stats">
              {heroStats.map((s) => (
                <div key={s.label} className="ld-hero-stat-card">
                  <span className="ld-hero-stat-value">{s.value}</span>
                  <span className="ld-hero-stat-label">{s.label}</span>
                </div>
              ))}
            </div>

            <a
              href={leader.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="ld-linkedin-btn"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }} aria-hidden>open_in_new</span>
              LinkedIn Profile
            </a>
          </div>

          {/* Right: portrait (7 col) */}
          <div className="ld-hero-portrait-wrap">
            <div className="ld-hero-portrait">
              <Image
                src={leader.image}
                alt={`Portrait of ${leader.name}`}
                fill
                priority
                className="ld-hero-portrait-img"
                sizes="(max-width: 767px) 100vw, 58%"
              />
            </div>
            {/* Overlapping quote card */}
            <div className="ld-hero-quote-card">
              <span className="material-symbols-outlined ld-hero-quote-icon" aria-hidden>format_quote</span>
              <p>Committed to bridging the gap between potential and opportunity through workforce innovation.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Biography Bento ── */}
      <section className="ld-section">
        <div className="ld-container">
          <h2 className="ld-section-heading">
            <span className="material-symbols-outlined" aria-hidden>auto_stories</span>
            Biography
          </h2>
          <div className="ld-bio-bento">
            {/* Main bio card (2/3 width) */}
            <div className="ld-bio-main-card">
              <BioBlocks blocks={mainBioBlocks} />
              {restBioBlocks.length > 0 && <BioBlocks blocks={restBioBlocks} />}
            </div>

            {/* Stacked side cards (1/3 width) */}
            <div className="ld-bio-side">
              <div className="ld-bio-side-card">
                <div className="ld-bio-side-icon-wrap">
                  <span className="material-symbols-outlined" aria-hidden>account_balance</span>
                </div>
                <h3>Civic Roots</h3>
                <p>Deep community ties through 100 Black Men of Austin, Alpha Phi Alpha Fraternity, and decades of public service leadership.</p>
              </div>
              <div className="ld-bio-side-card ld-bio-side-card--accent">
                <div className="ld-bio-side-icon-wrap ld-bio-side-icon-wrap--accent">
                  <span className="material-symbols-outlined" aria-hidden>groups</span>
                </div>
                <h3>Founder&apos;s Lens</h3>
                <p>A visionary who translates workforce needs into scalable training programs that create lasting community impact.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Partnerships Grid ── */}
      <section className="ld-section bg-surface-container-low">
        <div className="ld-container">
          <h2 className="ld-section-heading">
            <span className="material-symbols-outlined" aria-hidden>handshake</span>
            Key Partnerships
          </h2>
          <div className="ld-partners-grid">
            {partnerships.map((p) => (
              <div key={p.name} className="ld-partner-card">
                <span
                  className="material-symbols-outlined ld-partner-icon"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                  aria-hidden
                >
                  {p.icon}
                </span>
                <h3>{p.name}</h3>
                <p>{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Key Achievements ── */}
      <section className="ld-section">
        <div className="ld-container">
          <h2 className="ld-section-heading">
            <span className="material-symbols-outlined" aria-hidden>military_tech</span>
            Key Achievements
          </h2>
          <div className="ld-achievements-grid">
            {achievements.map((a) => (
              <div key={a.title} className="ld-achievement-card">
                <span
                  className="material-symbols-outlined ld-achievement-icon"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                  aria-hidden
                >
                  {a.icon}
                </span>
                <h3>{a.title}</h3>
                <p>{a.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── All Stats ── */}
      <section className="ld-section bg-surface-container-low">
        <div className="ld-container">
          <div className="ld-stats-grid">
            {leader.stats.map((s) => (
              <div key={s.label} className="ld-stat-card">
                <span className="ld-stat-value">{s.value}</span>
                <span className="ld-stat-label">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="ld-section">
        <div className="ld-container">
          <div className="ld-cta-banner">
            <h2>Collaborate for Change</h2>
            <p>Partner with us to expand workforce equity and create pathways to meaningful careers.</p>
            <div className="ld-cta-actions">
              <Link href="/contact" className="ld-cta-btn-primary">
                <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }} aria-hidden>mail</span>
                Get in Touch
              </Link>
              <Link href="/leadership" className="ld-cta-btn-secondary">
                <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }} aria-hidden>arrow_back</span>
                Back to Team
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
