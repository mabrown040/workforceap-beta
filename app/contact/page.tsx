import type { Metadata } from 'next';
import { buildPageMetadata } from '@/app/seo';
import Link from 'next/link';
import Footer from '@/components/Footer';
import MainNav from '@/components/MainNav';
import ContactFormClient from './ContactFormClient';

export const metadata: Metadata = buildPageMetadata({
  title: 'Contact Us | Workforce Advancement Project',
  description:
    'Contact Workforce Advancement Project for program questions, enrollment support, and partnership opportunities.',
  path: '/contact',
});

export default function ContactPage() {
  return (
    <div className="wa-min-h-screen wa-bg-white dark:wa-bg-[#141313] wa-text-gray-900 dark:wa-text-[#e6e1e1]">
      <MainNav />

      {/* Hero */}
      <section className="wa-pt-32 wa-pb-16 wa-px-6 md:wa-px-12">
        <div className="wa-max-w-5xl wa-mx-auto wa-text-center">
          <div className="wa-inline-flex wa-items-center wa-gap-2 wa-bg-[rgba(113,51,62,0.1)] dark:wa-bg-[rgba(113,51,62,0.2)] wa-border wa-border-[rgba(173,44,77,0.15)] wa-px-4 wa-py-1.5 wa-rounded-full wa-mb-6">
            <span className="wa-w-2 wa-h-2 wa-rounded-full wa-bg-[#ad2c4d] wa-inline-block" />
            <span className="wa-text-[10px] wa-font-bold wa-uppercase wa-tracking-[0.1em] wa-text-[#ad2c4d] dark:wa-text-[#ffb2bc]">Get In Touch</span>
          </div>
          <h1 className="wa-text-5xl md:wa-text-6xl wa-font-extrabold wa-tracking-tight wa-leading-none wa-mb-4">
            Contact{' '}
            <span style={{ backgroundImage: 'linear-gradient(to right, #ad2c4d, #ffb2bc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              Us
            </span>
          </h1>
          <p className="wa-text-xl wa-text-gray-600 dark:wa-text-[#debfc2] wa-max-w-2xl wa-mx-auto">
            Questions about programs? Ready to apply? We respond within 24–48 hours.
          </p>
        </div>
      </section>

      {/* Two-col layout */}
      <section className="wa-pb-24 wa-px-6 md:wa-px-12">
        <div className="wa-max-w-6xl wa-mx-auto wa-grid wa-gap-12 lg:wa-grid-cols-2 wa-items-start">

          {/* Left: Form */}
          <div className="wa-bg-gray-50 dark:wa-bg-[#1e1d1d] wa-border wa-border-gray-200 dark:wa-border-[rgba(88,65,68,0.3)] wa-rounded-2xl wa-p-8">
            <h2 className="wa-text-2xl wa-font-bold wa-mb-2">Send Us a Message</h2>
            <p className="wa-text-gray-500 dark:wa-text-[#b8a5a7] wa-mb-6 wa-text-sm">
              Fill out the form and our team will get back to you shortly.
            </p>
            <ContactFormClient />
          </div>

          {/* Right: Info */}
          <div className="wa-flex wa-flex-col wa-gap-6">
            <div className="wa-bg-gray-50 dark:wa-bg-[#1e1d1d] wa-border wa-border-gray-200 dark:wa-border-[rgba(88,65,68,0.3)] wa-rounded-2xl wa-p-8">
              <h2 className="wa-text-xl wa-font-bold wa-mb-6">Contact Information</h2>
              <div className="wa-flex wa-flex-col wa-gap-5">
                <div className="wa-flex wa-items-start wa-gap-4">
                  <span className="wa-text-2xl">📍</span>
                  <div>
                    <p className="wa-font-semibold wa-text-sm wa-uppercase wa-tracking-wide wa-text-gray-500 dark:wa-text-[#b8a5a7] wa-mb-0.5">Location</p>
                    <p className="wa-font-medium">Austin, TX</p>
                  </div>
                </div>
                <div className="wa-flex wa-items-start wa-gap-4">
                  <span className="wa-text-2xl">✉️</span>
                  <div>
                    <p className="wa-font-semibold wa-text-sm wa-uppercase wa-tracking-wide wa-text-gray-500 dark:wa-text-[#b8a5a7] wa-mb-0.5">Email</p>
                    <a href="mailto:info@workforceap.org" className="wa-font-medium wa-text-[#ad2c4d] dark:wa-text-[#ffb2bc] hover:wa-underline">
                      info@workforceap.org
                    </a>
                  </div>
                </div>
                <div className="wa-flex wa-items-start wa-gap-4">
                  <span className="wa-text-2xl">📞</span>
                  <div>
                    <p className="wa-font-semibold wa-text-sm wa-uppercase wa-tracking-wide wa-text-gray-500 dark:wa-text-[#b8a5a7] wa-mb-0.5">Phone</p>
                    <a href="tel:5127771808" className="wa-font-medium wa-text-[#ad2c4d] dark:wa-text-[#ffb2bc] hover:wa-underline">
                      (512) 777-1808
                    </a>
                  </div>
                </div>
                <div className="wa-flex wa-items-start wa-gap-4">
                  <span className="wa-text-2xl">🕐</span>
                  <div>
                    <p className="wa-font-semibold wa-text-sm wa-uppercase wa-tracking-wide wa-text-gray-500 dark:wa-text-[#b8a5a7] wa-mb-0.5">Office Hours</p>
                    <p className="wa-font-medium">Monday – Friday, 9 AM – 5 PM CT</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="wa-bg-[rgba(173,44,77,0.06)] dark:wa-bg-[rgba(173,44,77,0.1)] wa-border wa-border-[rgba(173,44,77,0.15)] wa-rounded-2xl wa-p-6">
              <p className="wa-font-semibold wa-mb-2">Ready to apply?</p>
              <p className="wa-text-sm wa-text-gray-500 dark:wa-text-[#b8a5a7] wa-mb-4">
                Skip the form and start your application directly. It takes about 10 minutes.
              </p>
              <Link
                href="/apply"
                className="wa-inline-block wa-px-6 wa-py-3 wa-bg-[#ad2c4d] wa-text-white wa-font-bold wa-rounded-lg hover:wa-bg-[#8b1f38] wa-transition-colors wa-no-underline"
              >
                Apply Now — Free for Members
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
