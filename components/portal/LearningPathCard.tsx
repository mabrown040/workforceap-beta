'use client';

import { useState, useEffect } from 'react';
import { PATHWAYS, type LearningPathway } from '@/lib/content/learningPathways';

type ProgressRecord = { pathwayId: string; progress: number; completed: boolean };

export default function LearningPathCard({ pathway }: { pathway: LearningPathway }) {
  const [progress, setProgress] = useState<ProgressRecord | null>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetch('/api/member/learning-progress')
      .then((r) => r.json())
      .then((data) => {
        const p = data.progress?.find((x: ProgressRecord) => x.pathwayId === pathway.id);
        if (p) setProgress(p);
      });
  }, [pathway.id]);

  const handleStart = async () => {
    setUpdating(true);
    try {
      const res = await fetch('/api/member/learning-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pathwayId: pathway.id, progress: 0 }),
      });
      if (res.ok) {
        const data = await res.json();
        setProgress(data.progress);
      }
    } finally {
      setUpdating(false);
    }
  };

  const handleProgress = async (delta: number) => {
    if (!progress) return;
    const newProgress = Math.min(100, Math.max(0, progress.progress + delta));
    setUpdating(true);
    try {
      const res = await fetch('/api/member/learning-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pathwayId: pathway.id,
          progress: newProgress,
          completed: newProgress >= 100,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setProgress(data.progress);
      }
    } finally {
      setUpdating(false);
    }
  };

  const pct = progress?.progress ?? 0;
  const isCompleted = progress?.completed ?? false;

  return (
    <div className="learning-path-card">
      <div className="learning-path-header">
        <span className="learning-path-category">{pathway.category}</span>
        <h3>{pathway.title}</h3>
      </div>
      <p className="learning-path-desc">{pathway.description}</p>
      <ul className="learning-path-steps">
        {pathway.steps.map((step, i) => (
          <li key={i}>{step}</li>
        ))}
      </ul>
      <p className="learning-path-meta">~{pathway.estimatedWeeks} weeks</p>

      {!progress ? (
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleStart}
          disabled={updating}
        >
          Start pathway
        </button>
      ) : (
        <div className="learning-path-progress">
          <div className="learning-path-progress-bar">
            <div
              className="learning-path-progress-fill"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="learning-path-progress-actions">
            <span>{pct}%</span>
            {!isCompleted && (
              <>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => handleProgress(-25)}
                  disabled={updating || pct <= 0}
                >
                  -25%
                </button>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => handleProgress(25)}
                  disabled={updating || pct >= 100}
                >
                  +25%
                </button>
              </>
            )}
            {isCompleted && <span className="learning-path-done">Complete</span>}
          </div>
        </div>
      )}
    </div>
  );
}
