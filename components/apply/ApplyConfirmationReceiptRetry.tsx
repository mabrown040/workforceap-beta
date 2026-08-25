'use client';

import { useEffect, useRef } from 'react';

const RECEIPT_RETRY_KEY = 'wap_apply_receipt_retry_v1';

type Props = {
  email: string;
  fullName: string;
};

/**
 * Best-effort second attempt to deliver the apply receipt email when the user
 * lands on /apply/confirmation after signup. Covers rare cases where the signup
 * route's awaited Resend call failed (API error, timeout) — not the serverless
 * freeze race, which is fixed by awaiting send before the signup response.
 */
export default function ApplyConfirmationReceiptRetry({ email, fullName }: Props) {
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const normalizedEmail = email.trim().toLowerCase();
    const name = fullName.trim();
    if (!normalizedEmail || !name) return;

    try {
      const prior = sessionStorage.getItem(RECEIPT_RETRY_KEY);
      if (prior === normalizedEmail) return;
    } catch {
      /* ignore */
    }

    void fetch('/api/apply/confirmation-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: normalizedEmail, fullName: name }),
    })
      .then(async (res) => {
        if (!res.ok) return;
        const data = (await res.json().catch(() => null)) as { ok?: boolean } | null;
        if (data?.ok) {
          try {
            sessionStorage.setItem(RECEIPT_RETRY_KEY, normalizedEmail);
          } catch {
            /* ignore */
          }
        }
      })
      .catch(() => {
        /* non-blocking */
      });
  }, [email, fullName]);

  return null;
}
