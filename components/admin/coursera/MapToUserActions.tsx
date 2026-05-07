'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

type Suggestion = {
  userId: string;
  email: string;
  fullName: string;
  enrolledProgram: string | null;
  matchReason: 'exact_email' | 'email_local_part' | 'name_token' | 'partner_referral_email_local';
  matchScore: number;
  notes: string;
};

type Props = {
  externalEmail: string;
  externalName: string | null;
  suggestions: Suggestion[];
};

const REASON_LABEL: Record<Suggestion['matchReason'], string> = {
  exact_email: 'Exact email match',
  email_local_part: 'Same local-part',
  name_token: 'Name tokens match',
  partner_referral_email_local: 'Partner referral local-part',
};

/**
 * Per-suggestion "Map to this user" action. Calls
 * `POST /api/admin/coursera/mappings` which upserts a
 * `coursera_identity_mappings` row AND reprocesses unmatched events for the
 * user. On success, refreshes the page so the unmatched count drops.
 */
export default function MapToUserActions({ externalEmail, externalName, suggestions }: Props) {
  const router = useRouter();
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ userId: string; reprocessed: number } | null>(null);
  const [isPending, startTransition] = useTransition();

  async function map(userId: string) {
    setPendingUserId(userId);
    setError(null);
    setSuccess(null);
    try {
      // Use /map-unmatched (not /mappings) so the side effects include:
      //   1. coursera_identity_mappings upsert
      //   2. backfillUserIdForCourseraEmail — sets user_id on any existing
      //      coursera_course_progress / coursera_badge_progress rows so the
      //      learner drops out of the unmatched CSV count immediately
      //   3. replayUnresolvedXapiStatementsForIdentity — replays xAPI
      //      statements (including ones already marked processed as
      //      unmatched/error) so live training progress flows in
      //
      // The /mappings endpoint only does (1) and a partial (3); using it
      // here would leave CSV rows orphaned, per Codex P1 review on #1033.
      const isEmail = externalEmail.includes('@');
      const body: Record<string, string> = { userId };
      if (isEmail) {
        body.courseraEmail = externalEmail;
      } else {
        body.actorIdentifier = externalEmail;
      }

      const res = await fetch('/api/admin/coursera/map-unmatched', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? `Mapping failed (${res.status})`);
      }

      const data = (await res.json()) as {
        ok: boolean;
        backfill?: { courseRowsUpdated?: number; badgeRowsUpdated?: number };
        xapiReplay?: { matched?: number; processed?: number };
      };
      const backfilled =
        (data.backfill?.courseRowsUpdated ?? 0) + (data.backfill?.badgeRowsUpdated ?? 0);
      const replayMatched = data.xapiReplay?.matched ?? 0;
      setSuccess({
        userId,
        reprocessed: backfilled + replayMatched,
      });
      // ack ref to externalName so unused-prop lint stays happy when notes
      // aren't sent on actor-identifier mappings
      void externalName;
      startTransition(() => router.refresh());
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Map failed';
      setError(msg);
    } finally {
      setPendingUserId(null);
    }
  }

  if (suggestions.length === 0) {
    return (
      <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--color-on-surface-variant)' }}>
        No close matches found in the WAP user database. To bind manually, visit the{' '}
        <a href="/admin/coursera">main Coursera admin page</a> and search for the member by name or
        email.
      </p>
    );
  }

  return (
    <div style={{ display: 'grid', gap: '0.6rem' }}>
      {error ? (
        <p
          style={{
            margin: 0,
            padding: '0.5rem 0.75rem',
            borderRadius: 6,
            background: 'rgba(176, 0, 32, 0.1)',
            color: 'var(--color-error, #b00020)',
            fontSize: '0.85rem',
          }}
        >
          {error}
        </p>
      ) : null}
      {success ? (
        <p
          style={{
            margin: 0,
            padding: '0.5rem 0.75rem',
            borderRadius: 6,
            background: 'rgba(34, 197, 94, 0.12)',
            color: 'rgb(22, 163, 74)',
            fontSize: '0.85rem',
          }}
        >
          Mapped successfully. {success.reprocessed} unmatched event(s) reprocessed and bound.
        </p>
      ) : null}

      <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: '0.5rem' }}>
        {suggestions.map((s) => (
          <li
            key={s.userId}
            style={{
              padding: '0.75rem',
              borderRadius: 8,
              border: '1px solid var(--outline-variant, #e0e0e0)',
              background: 'var(--surface-container-lowest, #fff)',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.75rem',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ minWidth: 0, flex: '1 1 60%' }}>
              <p style={{ margin: 0, fontWeight: 600 }}>
                {s.fullName}{' '}
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    padding: '0.1rem 0.4rem',
                    borderRadius: 999,
                    background:
                      s.matchScore >= 90
                        ? 'rgba(34, 197, 94, 0.15)'
                        : s.matchScore >= 60
                          ? 'rgba(251, 191, 36, 0.18)'
                          : 'rgba(148, 163, 184, 0.18)',
                    color:
                      s.matchScore >= 90
                        ? 'rgb(22, 163, 74)'
                        : s.matchScore >= 60
                          ? 'rgb(180, 130, 0)'
                          : 'var(--color-on-surface-variant)',
                  }}
                >
                  score {s.matchScore} · {REASON_LABEL[s.matchReason]}
                </span>
              </p>
              <p style={{ margin: '0.15rem 0 0', fontSize: '0.85rem', color: 'var(--color-on-surface-variant)' }}>
                {s.email} {s.enrolledProgram ? `· enrolled in ${s.enrolledProgram}` : '· not enrolled'}
              </p>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.78rem', color: 'var(--color-on-surface-variant)', fontStyle: 'italic' }}>
                {s.notes}
              </p>
            </div>
            <button
              type="button"
              onClick={() => map(s.userId)}
              disabled={isPending || pendingUserId === s.userId || success?.userId === s.userId}
              className="btn btn-primary"
              style={{ fontSize: '0.85rem', padding: '0.45rem 0.9rem', alignSelf: 'flex-start' }}
            >
              {success?.userId === s.userId
                ? 'Mapped'
                : pendingUserId === s.userId
                  ? 'Mapping…'
                  : 'Map to this user'}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
