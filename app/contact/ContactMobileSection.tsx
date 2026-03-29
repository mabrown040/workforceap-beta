'use client';

import MobileBottomNav from '@/components/MobileBottomNav';
import ContactFormClient from './ContactFormClient';

export default function ContactMobileSection() {
  return (
    <div className="md:hidden bg-[#fcf9f8] min-h-screen pb-32">
      {/* Top Nav */}
      <header className="fixed top-0 w-full z-50 bg-[#fcf9f8]/90 backdrop-blur-xl flex justify-between items-center px-6 py-4">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[#ad2c4d]">school</span>
          <span className="text-xl font-black text-[#ad2c4d] tracking-tighter">WorkforceAP</span>
        </div>
        <span className="material-symbols-outlined text-[#584144]">account_circle</span>
      </header>

      {/* Hero */}
      <div className="px-6 pt-24 mb-8">
        <h1 className="text-4xl font-extrabold tracking-tight text-[#1c1b1b] leading-tight mb-2">
          Get in Touch
        </h1>
        <p className="text-[#584144] text-base leading-relaxed">
          We respond within 24–48 hours
        </p>
      </div>

      {/* Contact Methods Row */}
      <div className="px-6 grid grid-cols-2 gap-4 mb-8">
        <div className="bg-white p-5 rounded-xl">
          <div className="w-10 h-10 rounded-lg bg-[#8c0f37]/5 flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-[#8c0f37]">alternate_email</span>
          </div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#8c0f37] mb-1">Email</p>
          <p className="text-sm font-semibold text-[#1c1b1b] break-words">info@workforceap.org</p>
        </div>
        <div className="bg-white p-5 rounded-xl">
          <div className="w-10 h-10 rounded-lg bg-[#ffbb00]/10 flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-[#7b5800]">phone</span>
          </div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#7b5800] mb-1">Phone</p>
          <p className="text-sm font-semibold text-[#1c1b1b]">(512) 777-1808</p>
        </div>
        <div className="bg-white p-5 rounded-xl">
          <div className="w-10 h-10 rounded-lg bg-[#8c0f37]/5 flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-[#8c0f37]">location_on</span>
          </div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#8c0f37] mb-1">Location</p>
          <p className="text-sm font-semibold text-[#1c1b1b]">Austin, TX</p>
        </div>
        <div className="bg-white p-5 rounded-xl">
          <div className="w-10 h-10 rounded-lg bg-[#8c0f37]/5 flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-[#8c0f37]">schedule</span>
          </div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#8c0f37] mb-1">Hours</p>
          <p className="text-sm font-semibold text-[#1c1b1b]">Mon–Fri 9–5 CT</p>
        </div>
      </div>

      {/* Contact Form */}
      <div className="px-6 mb-10">
        <div className="bg-[#f6f3f2] p-6 rounded-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#8c0f37]/5 rounded-full -mr-16 -mt-16 blur-3xl" />
          <h2 className="text-xl font-bold text-[#1c1b1b] mb-6 relative z-10">Send Us a Message</h2>
          <div className="relative z-10">
            <ContactFormClient />
          </div>
        </div>
      </div>

      {/* Office Info */}
      <div className="px-6 mb-8">
        <div className="text-center py-6 px-4 bg-[#f6f3f2] rounded-xl">
          <p className="text-[11px] font-bold uppercase tracking-widest text-[#584144] mb-2">
            Workforce Advancement Project
          </p>
          <p className="text-sm text-[#584144]">
            Austin, TX · Serving communities nationwide
          </p>
          <p className="text-sm text-[#584144] mt-1">
            <a href="mailto:info@workforceap.org" className="text-[#8c0f37] font-semibold">
              info@workforceap.org
            </a>
            {' · '}
            <a href="tel:5127771808" className="text-[#584144]">(512) 777-1808</a>
          </p>
        </div>
      </div>

      <MobileBottomNav />
    </div>
  );
}
