'use client';

import { useState, useEffect } from 'react';
import type { CertTrack } from '@/lib/content/certificationTracks';
import { CERTIFICATION_TRACKS } from '@/lib/content/certificationTracks';

export default function CertificationRoadmap() {
  const [earned, setEarned] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/member/certifications')
      .then((res) => res.json())
      .then((data) => {
        if (data.certifications) {
          setEarned(new Set(data.certifications.map((c: { certName: string }) => c.certName)));
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleToggle = async (certName: string, currentlyEarned: boolean) => {
    const newEarned = !currentlyEarned;
    setEarned((prev) => {
      const next = new Set(prev);
      if (newEarned) next.add(certName);
      else next.delete(certName);
      return next;
    });
    const res = await fetch('/api/member/certifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ certName, earned: newEarned }),
    });
    if (!res.ok) {
      setEarned((prev) => {
        const next = new Set(prev);
        if (newEarned) next.delete(certName);
        else next.add(certName);
        return next;
      });
    }
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div className="certification-roadmap">
      <p className="certification-intro" style={{ marginBottom: '1.5rem', color: 'var(--color-gray-600)' }}>
        Track your progress toward industry-recognized certifications. Mark certs as earned when you complete them.
      </p>
      <div className="certification-tracks">
        {CERTIFICATION_TRACKS.map((track) => (
          <CertTrackCard
            key={track.id}
            track={track}
            earned={earned}
            onToggle={handleToggle}
          />
        ))}
      </div>
    </div>
  );
}

function CertTrackCard({
  track,
  earned,
  onToggle,
}: {
  track: CertTrack;
  earned: Set<string>;
  onToggle: (certName: string, currentlyEarned: boolean) => void;
}) {
  return (
    <div className="cert-track-card">
      <h3 className="cert-track-title">{track.name}</h3>
      <ul className="cert-track-list">
        {track.certs.map((cert) => {
          const isEarned = earned.has(cert.name);
          return (
            <li key={cert.name} className={`cert-item ${isEarned ? 'cert-item-earned' : ''}`}>
              <label className="cert-item-row">
                <input
                  type="checkbox"
                  checked={isEarned}
                  onChange={() => onToggle(cert.name, isEarned)}
                  className="cert-checkbox"
                />
                <span className="cert-name">{cert.name}</span>
              </label>
              <div className="cert-meta">
                <span>{cert.cost}</span>
                <span>•</span>
                <span>{cert.timeToComplete}</span>
              </div>
              <a
                href={cert.link}
                target="_blank"
                rel="noopener noreferrer"
                className="cert-link"
              >
                Official info →
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
