import Image from 'next/image';
import { MARKETING_FULL_BLEED_HERO_SIZES } from '@/lib/marketing/heroImage';

const CLASSROOM_PHOTO = '/images/partners/concordia-classroom.webp';
const CONCORDIA_MARK = '/images/partners/concordia-hs-lockup.svg';
const WAP_MARK = '/images/partners/wap-partnership-mark.svg';

export default function ConcordiaPartnershipBanner() {
  return (
    <section
      className="chs-banner"
      aria-label="Concordia High School in partnership with Workforce Advancement Project"
    >
      <div className="chs-banner__rule" aria-hidden="true" />

      <div className="chs-banner__lockup">
        <div className="chs-banner__brand chs-banner__brand--school">
          <img
            className="chs-banner__shield"
            src={CONCORDIA_MARK}
            alt=""
            width={72}
            height={72}
          />
          <div className="chs-banner__school-name">
            <span className="chs-banner__school-title">Concordia</span>
            <span className="chs-banner__school-sub">High School</span>
          </div>
        </div>

        <div className="chs-banner__join">
          <span className="chs-banner__rule-v" aria-hidden="true" />
          <p className="chs-banner__with">In partnership with</p>
        </div>

        <div className="chs-banner__brand chs-banner__brand--wap">
          <img
            className="chs-banner__wap-mark"
            src={WAP_MARK}
            alt=""
            width={72}
            height={72}
          />
          <div className="chs-banner__wap-name">
            <span className="chs-banner__wap-title">Workforce Advancement Project</span>
            <span className="chs-banner__wap-sub">
              Career Training • Certifications • Job Placement
            </span>
          </div>
        </div>
      </div>

      <div className="chs-banner__wave" aria-hidden="true">
        <svg viewBox="0 0 1440 40" preserveAspectRatio="none">
          <defs>
            <linearGradient id="chs-wave" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#f39b2d" />
              <stop offset="100%" stopColor="#f6d15a" />
            </linearGradient>
          </defs>
          <path fill="url(#chs-wave)" d="M0 40V22C480 0 960 0 1440 22V40H0Z" />
        </svg>
      </div>

      <div className="chs-banner__photo">
        <Image
          src={CLASSROOM_PHOTO}
          alt="Concordia High School students collaborating around laptops in a classroom"
          fill
          sizes={MARKETING_FULL_BLEED_HERO_SIZES}
          priority
          quality={85}
        />
      </div>
    </section>
  );
}
