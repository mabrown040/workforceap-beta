'use client';

import { useState, useEffect } from 'react';
import { Loader2, Search } from 'lucide-react';
import { CERTIFICATION_TRACKS } from '@/lib/content/certificationTracks';
import { recommendCertsForGaps } from '@/lib/content/certToSkills';

const DEMO_RADAR = [
  { axis: 'Technical', value: 0.85 },
  { axis: 'Analytics', value: 0.72 },
  { axis: 'Communication', value: 0.61 },
  { axis: 'Leadership', value: 0.44 },
  { axis: 'Creative', value: 0.38 },
];
const DEMO_SKILLS = [
  { name: 'Programming', score: 85, importance: 'High' },
  { name: 'Critical Thinking', score: 78, importance: 'High' },
  { name: 'Systems Analysis', score: 72, importance: 'High' },
  { name: 'Active Learning', score: 65, importance: 'Medium' },
  { name: 'Communication', score: 61, importance: 'Medium' },
];

function RadarChart({ data }: { data: { axis: string; value: number }[] }) {
  const size = 240;
  const cx = size / 2, cy = size / 2, r = 90;
  const n = data.length;
  const angle = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2;
  const pt = (i: number, v: number) => ({
    x: cx + r * v * Math.cos(angle(i)),
    y: cy + r * v * Math.sin(angle(i)),
  });
  const gridLevels = [0.25, 0.5, 0.75, 1];
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow: 'visible', display: 'block', margin: '0 auto' }}>
      {gridLevels.map(level => (
        <polygon key={level}
          points={data.map((_, i) => { const p = pt(i, level); return `${p.x},${p.y}`; }).join(' ')}
          fill="none" stroke="var(--surface-container-highest)" strokeWidth="1" />
      ))}
      {data.map((_, i) => {
        const p = pt(i, 1);
        return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="var(--surface-container-highest)" strokeWidth="1" />;
      })}
      <polygon
        points={data.map((d, i) => { const p = pt(i, d.value); return `${p.x},${p.y}`; }).join(' ')}
        fill="var(--color-accent)" fillOpacity="0.2" stroke="var(--color-accent)" strokeWidth="2" />
      {data.map((d, i) => {
        const p = pt(i, 1.25);
        return <text key={i} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle"
          fontSize="11" fill="var(--color-on-surface-variant)">{d.axis}</text>;
      })}
    </svg>
  );
}

function DualRadarChart({ memberData, targetData }: { memberData: { axis: string; value: number }[]; targetData: { axis: string; value: number }[] }) {
  const size = 240;
  const cx = size / 2, cy = size / 2, r = 90;
  const axes = ['Analytics', 'Technical', 'Communication', 'Leadership', 'Creative'];
  const n = axes.length;
  const angle = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2;
  const pt = (i: number, v: number) => ({
    x: cx + r * v * Math.cos(angle(i)),
    y: cy + r * v * Math.sin(angle(i)),
  });
  const gridLevels = [0.25, 0.5, 0.75, 1];

  const getValue = (data: { axis: string; value: number }[], axis: string) =>
    data.find(d => d.axis === axis)?.value ?? 0;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow: 'visible', display: 'block', margin: '0 auto' }}>
      {gridLevels.map(level => (
        <polygon key={level}
          points={axes.map((_, i) => { const p = pt(i, level); return `${p.x},${p.y}`; }).join(' ')}
          fill="none" stroke="var(--surface-container-highest)" strokeWidth="1" />
      ))}
      {axes.map((_, i) => {
        const p = pt(i, 1);
        return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="var(--surface-container-highest)" strokeWidth="1" />;
      })}
      {/* Target occupation - accent/red */}
      <polygon
        points={axes.map((axis, i) => { const p = pt(i, getValue(targetData, axis)); return `${p.x},${p.y}`; }).join(' ')}
        fill="var(--color-accent)" fillOpacity="0.15" stroke="var(--color-accent)" strokeWidth="2" />
      {/* Member profile - blue */}
      <polygon
        points={axes.map((axis, i) => { const p = pt(i, getValue(memberData, axis)); return `${p.x},${p.y}`; }).join(' ')}
        fill="rgba(43,123,185,0.2)" stroke="var(--color-blue, #2b7bb9)" strokeWidth="2" strokeDasharray="4 2" />
      {axes.map((axis, i) => {
        const p = pt(i, 1.25);
        return <text key={i} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle"
          fontSize="11" fill="var(--color-on-surface-variant)">{axis}</text>;
      })}
    </svg>
  );
}

export default function SkillMapperClient() {
  const [activeTab, setActiveTab] = useState<'search' | 'profile'>('search');
  const [query, setQuery] = useState('');
  const [occupations, setOccupations] = useState<{ code: string; title: string; description: string }[]>([]);
  const [selectedTitle, setSelectedTitle] = useState('');
  const [radarData, setRadarData] = useState<{ axis: string; value: number }[]>([]);
  const [skills, setSkills] = useState<{ name: string; score: number; importance: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingSkills, setLoadingSkills] = useState(false);
  const [error, setError] = useState('');
  const [usingDemo, setUsingDemo] = useState(false);

  // Profile tab state
  const [memberProfile, setMemberProfile] = useState<{ axis: string; value: number }[]>([]);
  const [memberCerts, setMemberCerts] = useState<string[]>([]);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);

  useEffect(() => {
    if (activeTab === 'profile' && !profileLoaded) {
      setLoadingProfile(true);
      fetch('/api/member/skill-profile')
        .then(r => r.json())
        .then(data => {
          if (data.skillProfile) setMemberProfile(data.skillProfile);
          if (data.certNames) setMemberCerts(data.certNames);
          setProfileLoaded(true);
        })
        .catch(() => setProfileLoaded(true))
        .finally(() => setLoadingProfile(false));
    }
  }, [activeTab, profileLoaded]);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true); setError(''); setOccupations([]); setRadarData([]); setSkills([]);
    try {
      const res = await fetch(`/api/ai/skill-mapper?occupation=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data.occupations?.length) {
        setOccupations(data.occupations);
      } else {
        setError(data.error || 'No occupations found. Showing demo data.');
        setRadarData(DEMO_RADAR); setSkills(DEMO_SKILLS); setUsingDemo(true); setSelectedTitle('Software Developer (Demo)');
      }
    } catch {
      setError('Search failed. Showing demo data.');
      setRadarData(DEMO_RADAR); setSkills(DEMO_SKILLS); setUsingDemo(true); setSelectedTitle('Software Developer (Demo)');
    }
    setLoading(false);
  };

  const handleSelect = async (code: string, title: string) => {
    setSelectedTitle(title); setLoadingSkills(true); setError(''); setUsingDemo(false);
    try {
      const res = await fetch(`/api/ai/skill-mapper?code=${code}`);
      const data = await res.json();
      if (data.radarAxes) {
        setRadarData(data.radarAxes.map((a: { axis: string; value: number }) => ({ axis: a.axis, value: (a.value ?? 0) / 100 })));
        setSkills((data.skills || []).map((s: { name: string; score: number; category: string }) => ({ name: s.name, score: s.score, importance: s.score >= 70 ? 'High' : s.score >= 40 ? 'Medium' : 'Low' })));
      } else {
        setRadarData(DEMO_RADAR); setSkills(DEMO_SKILLS); setUsingDemo(true);
      }
    } catch {
      setRadarData(DEMO_RADAR); setSkills(DEMO_SKILLS); setUsingDemo(true);
    }
    setLoadingSkills(false);
  };

  const recommendations = memberProfile.length > 0 && radarData.length > 0
    ? recommendCertsForGaps(memberProfile, radarData, CERTIFICATION_TRACKS)
    : [];

  const gaps = memberProfile.length > 0 && radarData.length > 0
    ? radarData.map(target => {
        const memberAxis = memberProfile.find(m => m.axis === target.axis);
        const memberVal = (memberAxis?.value ?? 0) * 100;
        const targetVal = target.value * 100;
        return { axis: target.axis, member: memberVal, target: targetVal, gap: targetVal - memberVal };
      }).filter(g => g.gap > 0).sort((a, b) => b.gap - a.gap)
    : [];

  // Tab styles
  const tabStyle = (active: boolean) => ({
    padding: '0.5rem 1rem',
    border: 'none',
    borderBottom: active ? '2px solid var(--color-accent)' : '2px solid transparent',
    background: 'transparent',
    color: active ? 'var(--color-accent)' : 'var(--color-on-surface-variant)',
    fontWeight: active ? 700 : 400,
    fontSize: '0.875rem',
    cursor: 'pointer',
  } as React.CSSProperties);

  return (
    <div>
      {/* Tab switcher */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--surface-container-highest)', marginBottom: '1.5rem' }}>
        <button style={tabStyle(activeTab === 'search')} onClick={() => setActiveTab('search')}>
          Occupation Search
        </button>
        <button style={tabStyle(activeTab === 'profile')} onClick={() => setActiveTab('profile')}>
          My Skills Profile
        </button>
      </div>

      {/* Tab 1: Occupation Search */}
      {activeTab === 'search' && (
        <div>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search an occupation (e.g. Software Developer)"
              className="ai-tool-input"
              style={{ flex: 1, minHeight: '44px' }}
            />
            <button className="btn btn-primary" onClick={handleSearch} disabled={loading || !query.trim()}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', minHeight: '44px' }}>
              {loading ? <Loader2 size={16} className="ai-tool-submit-spinner" /> : <Search size={16} />}
              Search
            </button>
          </div>

          {error && <p style={{ color: 'var(--color-error, #d32f2f)', fontSize: '0.875rem', marginBottom: '1rem' }}>{error}</p>}

          {occupations.length > 0 && !radarData.length && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <h3 className="ai-tool-section-title">Select an occupation</h3>
              {occupations.map((occ) => (
                <button key={occ.code} onClick={() => handleSelect(occ.code, occ.title)}
                  className="btn btn-outline" style={{ textAlign: 'left', padding: '0.75rem 1rem' }}>
                  <strong>{occ.title}</strong>
                  <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-on-surface-variant)' }}>{occ.code} — {occ.description?.slice(0, 120)}</span>
                </button>
              ))}
            </div>
          )}

          {loadingSkills && <p style={{ textAlign: 'center', padding: '2rem' }}><Loader2 size={24} className="ai-tool-submit-spinner" /></p>}

          {radarData.length > 0 && (
            <>
              {usingDemo && (
                <div style={{ background: 'rgba(255,193,7,0.1)', border: '1px solid rgba(255,193,7,0.3)', borderRadius: '0.5rem', padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.85rem', color: 'var(--color-on-surface)' }}>
                  ⚠️ Showing demo data. O*NET integration is being configured.
                </div>
              )}
              <h3 className="ai-tool-section-title">{selectedTitle}</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', marginBottom: '2rem' }}>
                <div style={{ flex: '1 1 240px', minWidth: 240 }}>
                  <RadarChart data={radarData} />
                </div>
                <div style={{ flex: '1 1 280px', minWidth: 280 }}>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-on-surface)', marginBottom: '0.75rem' }}>Top Skills</h4>
                  {skills.map((s) => (
                    <div key={s.name} style={{ marginBottom: '0.75rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: '0.25rem' }}>
                        <span style={{ color: 'var(--color-on-surface)' }}>{s.name}</span>
                        <span style={{ color: 'var(--color-on-surface-variant)' }}>{s.score}%</span>
                      </div>
                      <div style={{ height: 8, borderRadius: 4, background: 'var(--surface-container-highest)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${s.score}%`, borderRadius: 4, background: 'var(--color-accent)', transition: 'width 0.4s ease' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {memberProfile.length > 0 && (
                <p style={{ fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)', marginTop: '-1rem', marginBottom: '1rem' }}>
                  💡 Switch to <strong>My Skills Profile</strong> tab to compare your certs against this occupation.
                </p>
              )}
            </>
          )}
        </div>
      )}

      {/* Tab 2: My Skills Profile */}
      {activeTab === 'profile' && (
        <div>
          {loadingProfile && (
            <p style={{ textAlign: 'center', padding: '2rem' }}><Loader2 size={24} className="ai-tool-submit-spinner" /></p>
          )}

          {!loadingProfile && memberProfile.length > 0 && (
            <>
              {/* Dual radar or single radar */}
              {radarData.length > 0 ? (
                <>
                  <h3 className="ai-tool-section-title">Your Skills vs. {selectedTitle || 'Target Occupation'}</h3>
                  <div style={{ marginBottom: '0.75rem' }}>
                    <DualRadarChart memberData={memberProfile} targetData={radarData} />
                  </div>
                  <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', marginBottom: '1.5rem', fontSize: '0.8125rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                      <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: '50%', background: 'var(--color-blue, #2b7bb9)' }} />
                      Your skills
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                      <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: '50%', background: 'var(--color-accent)' }} />
                      Target occupation
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <h3 className="ai-tool-section-title">Your Skill Profile</h3>
                  <div style={{ marginBottom: '1.5rem' }}>
                    <RadarChart data={memberProfile} />
                  </div>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)', marginBottom: '1.5rem', textAlign: 'center' }}>
                    Search an occupation in the <strong>Occupation Search</strong> tab to compare your skills.
                  </p>
                </>
              )}

              {/* Earned certs */}
              {memberCerts.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <h4 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>Earned Certifications</h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {memberCerts.map(cert => (
                      <span key={cert} style={{
                        background: 'rgba(74,155,79,0.12)', color: 'var(--color-green, #4a9b4f)',
                        borderRadius: '999px', padding: '0.25rem 0.75rem', fontSize: '0.8125rem', fontWeight: 500,
                      }}>✓ {cert}</span>
                    ))}
                  </div>
                </div>
              )}

              {memberCerts.length === 0 && (
                <div style={{ background: 'var(--surface-container)', borderRadius: '0.75rem', padding: '1rem', marginBottom: '1.5rem', fontSize: '0.875rem', color: 'var(--color-on-surface-variant)' }}>
                  No certifications recorded yet. Add your earned certs in the <a href="/dashboard/certifications" style={{ color: 'var(--color-accent)' }}>Verification Vault</a>.
                </div>
              )}

              {/* Gap analysis */}
              {gaps.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <h4 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.75rem' }}>Skill Gaps to Close</h4>
                  {gaps.map(g => (
                    <div key={g.axis} style={{ marginBottom: '0.75rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: '0.25rem' }}>
                        <span>{g.axis}</span>
                        <span style={{ color: g.gap > 30 ? 'var(--color-error, #d32f2f)' : 'var(--color-on-surface-variant)' }}>
                          {Math.round(g.member)}% → {Math.round(g.target)}% ({g.gap > 0 ? `+${Math.round(g.gap)}` : Math.round(g.gap)} needed)
                        </span>
                      </div>
                      <div style={{ height: 8, borderRadius: 4, background: 'var(--surface-container-highest)', overflow: 'hidden', position: 'relative' }}>
                        <div style={{ height: '100%', width: `${g.target}%`, borderRadius: 4, background: 'rgba(43,123,185,0.2)', position: 'absolute' }} />
                        <div style={{ height: '100%', width: `${g.member}%`, borderRadius: 4, background: 'var(--color-blue, #2b7bb9)', position: 'absolute' }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Cert recommendations */}
              {recommendations.length > 0 && (
                <div>
                  <h4 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.75rem' }}>Recommended Certifications</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                    {recommendations.map(rec => (
                      <div key={rec.certName} style={{
                        background: 'var(--surface-container)', borderRadius: '0.75rem',
                        padding: '0.875rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem',
                      }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{rec.certName}</div>
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                            <span style={{
                              background: 'rgba(173,44,77,0.1)', color: 'var(--color-accent)',
                              borderRadius: '999px', padding: '0.125rem 0.5rem', fontSize: '0.75rem', fontWeight: 500,
                            }}>{rec.track}</span>
                            <span style={{ fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)' }}>{rec.reason}</span>
                          </div>
                        </div>
                        <a href={rec.link} target="_blank" rel="noopener noreferrer" style={{
                          background: 'var(--color-accent)', color: '#fff', borderRadius: '0.5rem',
                          padding: '0.375rem 0.75rem', fontSize: '0.8125rem', fontWeight: 600,
                          textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0,
                        }}>Learn →</a>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {!loadingProfile && profileLoaded && memberProfile.every(p => p.value === 0) && memberCerts.length === 0 && (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-on-surface-variant)' }}>
              <p>No skill data yet. Earn certifications in the <a href="/dashboard/certifications" style={{ color: 'var(--color-accent)' }}>Verification Vault</a> to build your profile.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
