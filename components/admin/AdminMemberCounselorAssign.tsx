'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type CounselorOpt = { userId: string; fullName: string; partnerName: string };

export default function AdminMemberCounselorAssign({
  memberId,
  counselors,
  currentCounselorUserId,
}: {
  memberId: string;
  counselors: CounselorOpt[];
  currentCounselorUserId: string | null;
}) {
  const router = useRouter();
  const [counselorUserId, setCounselorUserId] = useState(currentCounselorUserId ?? '');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!counselorUserId) {
      setMsg({ type: 'err', text: 'Select a counselor.' });
      return;
    }
    setSaving(true);
    setMsg(null);
    try {
      const r = await fetch(`/api/admin/members/${memberId}/counselor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ counselorUserId }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        setMsg({ type: 'err', text: typeof data.error === 'string' ? data.error : 'Save failed' });
        return;
      }
      setMsg({
        type: 'ok',
        text: data.notificationEmailSent === true
          ? 'Assigned. The member was emailed and can message from the portal.'
          : 'Assigned. The member can message from the portal, but the notification email was not sent.',
      });
      router.refresh();
    } catch {
      setMsg({ type: 'err', text: 'Network error' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {msg ? (
        <p style={{ fontSize: '0.9rem', color: msg.type === 'ok' ? '#166534' : '#b91c1c' }} role="status">
          {msg.text}
        </p>
      ) : null}
      <div className="form-group" style={{ marginBottom: 0 }}>
        <label htmlFor="assign-counselor">Assign counselor</label>
        <select
          id="assign-counselor"
          className="form-control"
          value={counselorUserId}
          onChange={(e) => setCounselorUserId(e.target.value)}
          disabled={saving}
        >
          <option value="">Select…</option>
          {counselors.map((c) => (
            <option key={c.userId} value={c.userId}>
              {c.fullName} ({c.partnerName === 'WorkforceAP' || !c.partnerName ? 'WorkforceAP' : c.partnerName})
            </option>
          ))}
        </select>
      </div>
      <button type="submit" className="btn btn-primary btn-sm" disabled={saving || counselors.length === 0} aria-busy={saving}>
        <span aria-live="polite" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          {saving ? (
            <>
              <span className="material-symbols-outlined" style={{ fontSize: '1rem', animation: 'spin 1s linear infinite' }} aria-hidden="true">progress_activity</span>
              Saving…
            </>
          ) : (
            'Save assignment & notify member'
          )}
        </span>
      </button>
      {counselors.length === 0 ? (
        <p style={{ fontSize: '0.85rem', color: 'var(--color-on-surface-variant)' }}>
          Add counselors under <strong>Admin → Counselors</strong> (WorkforceAP or a partner).
        </p>
      ) : null}
    </form>
  );
}
