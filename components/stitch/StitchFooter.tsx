import Link from 'next/link';

export default function StitchFooter() {
  return (
    <footer className="wa-bg-m3d-surface-container-low wa-border-t wa-border-m3d-outline-variant/15">
      <div className="wa-mx-auto wa-max-w-7xl wa-px-6 wa-py-16">
        <div className="wa-grid wa-grid-cols-1 md:wa-grid-cols-3 wa-gap-12">
          {/* Col 1 — Brand */}
          <div>
            <p className="wa-text-lg wa-font-black wa-uppercase wa-tracking-widest wa-text-m3d-on-surface">
              WORKFORCEAP
            </p>
            <p className="wa-mt-4 wa-text-sm wa-leading-relaxed wa-text-m3d-on-surface-variant">
              Tuition-free career training programs in Austin, Texas. We connect
              motivated learners with high-demand employers through specialized,
              industry-aligned education.
            </p>
          </div>

          {/* Col 2 — Explore */}
          <div>
            <h3 className="wa-text-sm wa-font-bold wa-uppercase wa-tracking-widest wa-text-m3d-primary-fixed-dim wa-mb-4">
              Explore
            </h3>
            <ul className="wa-space-y-3">
              <li>
                <Link
                  href="/programs"
                  className="wa-text-sm wa-text-m3d-on-surface-variant hover:wa-text-m3d-on-surface wa-transition-colors"
                >
                  Programs
                </Link>
              </li>
              <li>
                <Link
                  href="/employers"
                  className="wa-text-sm wa-text-m3d-on-surface-variant hover:wa-text-m3d-on-surface wa-transition-colors"
                >
                  Partners
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="wa-text-sm wa-text-m3d-on-surface-variant hover:wa-text-m3d-on-surface wa-transition-colors"
                >
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3 — Connect */}
          <div>
            <h3 className="wa-text-sm wa-font-bold wa-uppercase wa-tracking-widest wa-text-m3d-primary-fixed-dim wa-mb-4">
              Connect
            </h3>
            <ul className="wa-space-y-3">
              <li>
                <Link
                  href="/contact"
                  className="wa-text-sm wa-text-m3d-on-surface-variant hover:wa-text-m3d-on-surface wa-transition-colors"
                >
                  Contact Us
                </Link>
              </li>
              <li>
                <a
                  href="https://www.linkedin.com/company/workforceap"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="wa-text-sm wa-text-m3d-on-surface-variant hover:wa-text-m3d-on-surface wa-transition-colors"
                >
                  LinkedIn
                </a>
              </li>
              <li>
                <a
                  href="mailto:info@workforceap.org"
                  className="wa-text-sm wa-text-m3d-on-surface-variant hover:wa-text-m3d-on-surface wa-transition-colors"
                >
                  info@workforceap.org
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="wa-border-t wa-border-m3d-outline-variant/10">
        <div className="wa-mx-auto wa-max-w-7xl wa-px-6 wa-py-4">
          <p className="wa-text-xs wa-text-m3d-on-surface-variant wa-text-center">
            &copy; 2024 WorkforceAP Austin. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
