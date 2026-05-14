'use client';

import { useState } from 'react';
import MemberFeedbackModal from './MemberFeedbackModal';

export default function MemberFeedbackButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="btn btn-outline"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.4rem',
          fontSize: '0.8125rem',
          fontWeight: 700,
        }}
      >
        <span
          className="material-symbols-outlined"
          style={{ fontSize: '1rem', fontVariationSettings: "'FILL' 1" }}
          aria-hidden="true"
        >
          feedback
        </span>
        Feedback
      </button>
      <MemberFeedbackModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
