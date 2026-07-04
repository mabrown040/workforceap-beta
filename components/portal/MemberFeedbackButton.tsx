'use client';

import { useRef, useState } from 'react';
import MemberFeedbackModal from './MemberFeedbackModal';

export default function MemberFeedbackButton() {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      <button
        ref={triggerRef}
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
      <MemberFeedbackModal
        open={open}
        onClose={() => {
          setOpen(false);
          // Return focus to the button that opened the dialog instead of
          // letting it fall back to <body> when the modal unmounts.
          triggerRef.current?.focus();
        }}
      />
    </>
  );
}
