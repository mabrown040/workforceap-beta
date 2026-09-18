import Link from 'next/link';
import type { EnrollmentPartnerLink } from '@/lib/enroll/resolveEnrollmentPartner';
import { humanizeEnrollmentSchoolKey } from '@/lib/enroll/resolveEnrollmentPartner';

type Props = {
  school: string;
  partners: EnrollmentPartnerLink[];
};

export default function PartnerSchoolEnrollMissing({ school, partners }: Props) {
  const label = humanizeEnrollmentSchoolKey(school);

  return (
    <div className="enroll-school enroll-school--missing">
      <section className="stage stage--compact" aria-labelledby="enroll-missing-title">
        <div className="aura aura--1" aria-hidden="true" />
        <div className="aura aura--2" aria-hidden="true" />
        <div className="wrap">
          <div className="lede lede--missing">
            <span className="pill">School enrollment</span>
            <h1 id="enroll-missing-title">
              We could not find an enrollment page for <span className="shimmer">{label}</span>
            </h1>
            <p className="sub">
              That link may be mistyped, outdated, or not yet published. Choose your school below, or
              apply through the public path if your school is not listed.
            </p>
            <div className="acts">
              <Link className="dbtn dbtn--solid" href="/apply">
                Apply without a school link <span>→</span>
              </Link>
              <Link className="dbtn dbtn--glass" href="/programs">
                Browse programs
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="band band--surface" aria-labelledby="enroll-school-list-title">
        <div className="wrap">
          <div className="sec-head">
            <span className="eyebrow">Partner schools</span>
            <h2 id="enroll-school-list-title">
              {partners.length > 0 ? (
                <>
                  Pick your school to <span className="grad-text">continue</span>
                </>
              ) : (
                <>
                  No school pages are live <span className="grad-text">right now</span>
                </>
              )}
            </h2>
            <p>
              {partners.length > 0
                ? 'Each school page lists the certificate programs sponsored for its students.'
                : 'You can still start a WorkforceAP application, or contact us if you expected a school-specific link.'}
            </p>
          </div>

          {partners.length > 0 ? (
            <ul className="school-picker">
              {partners.map((partner) => (
                <li key={partner.slug}>
                  <Link className="school-picker__card" href={partner.enrollmentPath}>
                    <span className="school-picker__name">{partner.name}</span>
                    {partner.schoolDistrict ? (
                      <span className="school-picker__meta">{partner.schoolDistrict}</span>
                    ) : null}
                    <span className="school-picker__cta">Open enrollment →</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}

          <div className="acts acts--center missing-foot">
            <Link className="btn btn--primary" href="/contact">
              Contact WorkforceAP
            </Link>
            <Link className="btn btn--ghost" href="/">
              Back to home
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
