import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Linkedin } from 'lucide-react';
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
    <div className="leader-detail-bio">
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

export default async function LeaderBioPage({ params }: Props) {
  const { slug } = await params;
  const leader = getLeaderBySlug(slug);
  if (!leader) notFound();

  return (
    <div className="inner-page leader-detail-page">
      <section className="leader-detail-hero" aria-labelledby="leader-detail-heading">
        <div className="leader-detail-hero-inner">
          <div className="leader-detail-hero-visual">
            <Image
              src={leader.image}
              alt=""
              fill
              priority
              className="leader-detail-hero-img"
              sizes="(max-width: 767px) 100vw, 420px"
            />
          </div>
          <div className="leader-detail-hero-text">
            <h1 id="leader-detail-heading">{leader.name}</h1>
            <p className="leader-detail-hero-role">{leader.title}</p>
          </div>
        </div>
      </section>

      <div className="leader-detail-main">
        <div className="leader-detail-linkedin-wrap">
          <a
            href={leader.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            className="leader-detail-linkedin"
          >
            <Linkedin size={22} strokeWidth={2} aria-hidden />
            LinkedIn
          </a>
        </div>

        <BioBlocks blocks={leader.bioBlocks} />

        <div className="leader-detail-stats">
          {leader.stats.map((s) => (
            <div key={s.label} className="leader-detail-stat">
              <span className="leader-detail-stat-value">{s.value}</span>
              <span className="leader-detail-stat-label">{s.label}</span>
            </div>
          ))}
        </div>

        <nav className="leader-detail-back" aria-label="Team navigation">
          <Link href="/leadership">← Back to Team</Link>
        </nav>
      </div>

      <Footer />
    </div>
  );
}
