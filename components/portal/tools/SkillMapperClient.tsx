'use client';

import { useState } from 'react';
import { Loader2, Search } from 'lucide-react';

const DEMO_RADAR = [
  { axis: 'Technical', value: 0.85 },
  { axis: 'Analytical', value: 0.72 },
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

export default function SkillMapperClient() {
  const [query, setQuery] = useState('');
  const [occupations, setOccupations] = useState<{ code: string; title: string; description: string }[]>([]);
  const [selectedTitle, setSelectedTitle] = useState('');
  const [radarData, setRadarData] = useState<{ axis: string; value: number }[]>([]);
  const [skills, setSkills] = useState<{ name: string; score: number; importance: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingSkills, setLoadingSkills] = useState(false);
  const [error, setError] = useState('');
  const [usingDemo, setUsingDemo] = useState(false);

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

  return (
    <div>
      {/* Search */}
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

      {/* Occupation results */}
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

      {/* Results */}
      {radarData.length > 0 && (
        <>
          {usingDemo && (
            <div style={{ background: 'rgba(255,193,7,0.1)', border: '1px solid rgba(255,193,7,0.3)', borderRadius: '0.5rem', padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.85rem', color: 'var(--color-on-surface)' }}>
              ⚠️ Showing demo data. O*NET integration is being configured.
            </div>
          )}
          <h3 className="ai-tool-section-title">{selectedTitle}</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', marginBottom: '2rem' }}>
            {/* Radar */}
            <div style={{ flex: '1 1 240px', minWidth: 240 }}>
              <RadarChart data={radarData} />
            </div>
            {/* Skill bars */}
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
        </>
      )}
    </div>
  );
}
