'use client';

import { useState } from 'react';
import { confirmPlacement } from './placementAction';

export default function PlacementConfirmationStrip({ offers }: { offers: any[] }) {
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [confirmed, setConfirmed] = useState<Record<string, boolean>>({});

  if (!offers || offers.length === 0) return null;

  // Filter out those already confirmed in the UI session
  const activeOffers = offers.filter(o => !confirmed[o.id]);

  if (activeOffers.length === 0) return null;

  const handleConfirm = async (offerId: string) => {
    setLoading(prev => ({ ...prev, [offerId]: true }));
    try {
      await confirmPlacement(offerId);
      setConfirmed(prev => ({ ...prev, [offerId]: true }));
    } catch (err) {
      console.error(err);
      alert('Failed to confirm placement');
    }
    setLoading(prev => ({ ...prev, [offerId]: false }));
  };

  return (
    <section style={{ padding: '0 1.25rem', marginBottom: '1.25rem' }}>
      {activeOffers.map(offer => (
        <div key={offer.id} style={{ borderRadius: '1rem', overflow: 'hidden', background: 'linear-gradient(135deg, #10b981, #059669)', boxShadow: '0 6px 24px rgba(16,185,129,0.3)', marginBottom: '1rem' }}>
          <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'rgba(255,255,255,0.82)', margin: '0 0 0.35rem' }}>Job Offer</p>
                <h2 style={{ fontSize: '1.0625rem', fontWeight: 700, color: '#fff', margin: 0, lineHeight: 1.3 }}>
                  Did you accept the role at {offer.company}?
                </h2>
              </div>
              <span className="material-symbols-outlined" style={{ color: '#fff', fontVariationSettings: "'FILL' 1", flexShrink: 0, marginLeft: '0.5rem' }} aria-hidden>work</span>
            </div>
            <p style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.88)', margin: 0, lineHeight: 1.5 }}>
              Let WorkforceAP know you accepted the offer. This does not change your support, access, or placement status on its own — it just alerts the team to review and follow up.
            </p>
            <button type="button"
              onClick={() => handleConfirm(offer.id)}
              disabled={loading[offer.id]}
              style={{ display: 'block', width: '100%', background: '#fff', color: '#059669', padding: '0.75rem', borderRadius: '0.625rem', textDecoration: 'none', textAlign: 'center', fontWeight: 700, fontSize: '0.875rem', boxSizing: 'border-box', border: 'none', cursor: 'pointer' }}
            >
              {loading[offer.id] ? 'Sending update...' : 'Yes — notify my team'}
            </button>
          </div>
        </div>
      ))}
    </section>
  );
}
