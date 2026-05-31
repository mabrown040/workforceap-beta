import type { Metadata } from 'next';
import Image from 'next/image';
import LocalizedLink from '@/components/LocalizedLink';
import { notFound } from 'next/navigation';
import { buildPageMetadataAsync, DEFAULT_OG_IMAGE, SITE_URL } from '@/app/seo';
import Footer from '@/components/Footer';
import {
  getLeaderBySlug,
  LEADERS,
  type Leader,
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

  const ogImage =
    leader.image && leader.image.trim().length > 0 ? `${SITE_URL}${leader.image}` : DEFAULT_OG_IMAGE;

  return buildPageMetadataAsync({
    title: `${leader.name} — ${leader.title}`,
    description: `Learn more about ${leader.name}, ${leader.title} at Workforce Advancement Project.`,
    path: `/leadership/${slug}`,
    image: ogImage,
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

function heroBadgeFor(leader: Leader): string {
  if (leader.heroBadge) return leader.heroBadge;
  if (leader.founder) return 'Founder & Executive Leadership';
  if (leader.role.includes('COO')) return 'Operational Leadership';
  if (leader.role.startsWith('Board')) return 'Board of Trustees';
  return 'Leadership';
}

function heroQuoteFor(leader: Leader): string {
  return (leader.heroQuote ?? leader.missionRelevance ?? '').trim();
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
  const heroQuote = heroQuoteFor(leader);
  const spotlightCards = leader.spotlightCards ?? [];
  const partnerTiles = leader.partnerTiles ?? [];
  const achievementTiles = leader.achievementTiles ?? [];
  const hasSideColumn = spotlightCards.length > 0;

  const hasPortrait = Boolean(leader.image && leader.image.trim().length > 0);
  const portraitObjectPosition =
    leader.slug === 'michael-brown-ii'
      ? 'center 72%'
      : leader.slug === 'michael-brown'
        ? 'center 24%'
        : undefined;

  return (
    <div className="inner-page ld-page">
      {/* ── Hero: 12-col grid ── */}
      <section className="ld-hero" aria-labelledby="ld-heading">
        <div className={`ld-hero-inner${hasPortrait ? '' : ' ld-hero-inner--text-only'}`}>
          {/* Left: text (5 col) */}
          <div className="ld-hero-text">
            <span className="ld-hero-badge">
              <span className="material-symbols-outlined" style={{ fontSize: '1rem', ['--ms-fill' as string]: 1 }} aria-hidden>verified</span>
              {heroBadgeFor(leader)}
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

            {leader.linkedin ? (
              <a
                href={leader.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="ld-linkedin-btn"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }} aria-hidden>open_in_new</span>
                LinkedIn Profile
              </a>
            ) : null}
          </div>

          {/* Right: portrait (or quote-only when no photo yet) */}
          {hasPortrait ? (
            <div className="ld-hero-portrait-wrap">
              <div className="ld-hero-portrait">
                <Image
                  src={leader.image}
                  alt={`Portrait of ${leader.name}`}
                  fill
                  priority
                  className="ld-hero-portrait-img"
                  sizes="(max-width: 767px) 100vw, 58%"
                  style={portraitObjectPosition ? { objectPosition: portraitObjectPosition } : undefined}
                />
              </div>
              {heroQuote ? (
                <div className="ld-hero-quote-card">
                  <span className="material-symbols-outlined ld-hero-quote-icon" aria-hidden>format_quote</span>
                  <p>{heroQuote}</p>
                </div>
              ) : null}
            </div>
          ) : heroQuote ? (
            <div className="ld-hero-quote-only">
              <div className="ld-hero-quote-card ld-hero-quote-card--standalone">
                <span className="material-symbols-outlined ld-hero-quote-icon" aria-hidden>format_quote</span>
                <p>{heroQuote}</p>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      {/* ── Biography Bento ── */}
      <section className="ld-section">
        <div className="ld-container">
          <h2 className="ld-section-heading">
            <span className="material-symbols-outlined" aria-hidden>auto_stories</span>
            Biography
          </h2>
          <div className={`ld-bio-bento${!hasSideColumn ? ' ld-bio-bento--full' : ''}`}>
            <div className="ld-bio-main-card">
              <BioBlocks blocks={mainBioBlocks} />
              {restBioBlocks.length > 0 && <BioBlocks blocks={restBioBlocks} />}
            </div>

            {hasSideColumn ? (
              <div className="ld-bio-side">
                {spotlightCards.map((card) => {
                  const accent = card.variant === 'accent';
                  return (
                    <div
                      key={card.title}
                      className={`ld-bio-side-card${accent ? ' ld-bio-side-card--accent' : ''}`}
                    >
                      <div
                        className={`ld-bio-side-icon-wrap${accent ? ' ld-bio-side-icon-wrap--accent' : ''}`}
                      >
                        <span className="material-symbols-outlined" aria-hidden>
                          {card.icon}
                        </span>
                      </div>
                      <h3>{card.title}</h3>
                      <p>{card.body}</p>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {partnerTiles.length > 0 ? (
        <section className="ld-section bg-surface-container-low">
          <div className="ld-container">
            <h2 className="ld-section-heading">
              <span className="material-symbols-outlined" aria-hidden>handshake</span>
              Organizations &amp; focus areas
            </h2>
            <div className="ld-partners-grid">
              {partnerTiles.map((p) => (
                <div key={p.name} className="ld-partner-card">
                  <span
                    className="material-symbols-outlined ld-partner-icon"
                    style={{ ['--ms-fill' as string]: 1 }}
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
      ) : null}

      {achievementTiles.length > 0 ? (
        <section className="ld-section">
          <div className="ld-container">
            <h2 className="ld-section-heading">
              <span className="material-symbols-outlined" aria-hidden>military_tech</span>
              Highlights
            </h2>
            <div className="ld-achievements-grid">
              {achievementTiles.map((a) => (
                <div key={a.title} className="ld-achievement-card">
                  <span
                    className="material-symbols-outlined ld-achievement-icon"
                    style={{ ['--ms-fill' as string]: 1 }}
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
      ) : null}

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
              <LocalizedLink href="/contact" className="ld-cta-btn-primary">
                <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }} aria-hidden>mail</span>
                Get in Touch
              </LocalizedLink>
              <LocalizedLink href="/leadership" className="ld-cta-btn-muted">
                <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }} aria-hidden>arrow_back</span>
                Back to Team
              </LocalizedLink>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
