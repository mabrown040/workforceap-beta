'use client';

import { useState, useEffect } from 'react';
import type { LearningPathway } from '@/lib/content/learningPathways';

type StepProgress = { pathwayId: string; stepIndex: number; stepTitle: string; status: string; completedAt: string | null };
type PathwayProgress = { pathwayId: string; progress: number; completed: boolean };

export default function LearningPathCard({ pathway }: { pathway: LearningPathway }) {
  const [pathwayProgress, setPathwayProgress] = useState<PathwayProgress | null>(null);
  const [stepProgress, setStepProgress] = useState<Record<number, StepProgress>>({});
  const [updating, setUpdating] = useState(false);

  const fetchProgress = () => {
    Promise.all([
      fetch('/api/member/learning-progress').then((r) => r.json()),
      fetch('/api/member/pathway-steps/progress').then((r) => r.json()),
    ]).then(([lpData, spData]) => {
      const p = lpData.progress?.find((x: { pathwayId: string }) => x.pathwayId === pathway.id);
      if (p) setPathwayProgress({ pathwayId: p.pathwayId, progress: p.progress, completed: p.completed });
      const steps = spData.progress?.[pathway.id] ?? [];
      const byIndex = Object.fromEntries(steps.map((s: StepProgress) => [s.stepIndex, s]));
      setStepProgress(byIndex);
    });
  };

  useEffect(() => {
    fetchProgress();
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
        setPathwayProgress(data.progress);
      }
    } finally {
      setUpdating(false);
    }
  };

  const handleStepComplete = async (stepIndex: number) => {
    const step = stepProgress[stepIndex];
    if (step?.status === 'completed') return;
    setUpdating(true);
    try {
      const res = await fetch(`/api/member/pathway-steps/${pathway.id}/${stepIndex}/complete`, {
        method: 'POST',
      });
      if (res.ok) fetchProgress();
    } finally {
      setUpdating(false);
    }
  };

  const completedSteps = Object.values(stepProgress).filter((s) => s.status === 'completed').length;
  const pct = pathwayProgress
    ? Math.round((completedSteps / pathway.steps.length) * 100)
    : 0;
  const isCompleted = pct >= 100;

  return (
    <div className="learning-path-card">
      <div className="learning-path-header">
        <span className="learning-path-category">{pathway.category}</span>
        <h3>{pathway.title}</h3>
      </div>
      <p className="learning-path-desc">{pathway.description}</p>
      <ul className="learning-path-steps">
        {pathway.steps.map((step, i) => {
          const sp = stepProgress[i];
          const done = sp?.status === 'completed';
          return (
            <li key={i} className={done ? 'step-completed' : ''}>
              <label className="learning-step-label">
                <input
                  type="checkbox"
                  checked={done}
                  onChange={() => handleStepComplete(i)}
                  disabled={updating}
                />
                <span>{step}</span>
              </label>
            </li>
          );
        })}
      </ul>
      <p className="learning-path-meta">~{pathway.estimatedWeeks} weeks</p>

      {pathwayProgress || completedSteps > 0 ? (
        <div className="learning-path-progress">
          <div className="learning-path-progress-bar">
            <div
              className="learning-path-progress-fill"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="learning-path-progress-actions">
            <span>{pct}% complete</span>
            {isCompleted && <span className="learning-path-done">Complete</span>}
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleStart}
          disabled={updating}
        >
          Start pathway
        </button>
      )}
    </div>
  );
}
