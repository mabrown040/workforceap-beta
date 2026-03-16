'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

type Goal = {
  id: string;
  goalType: string;
  title: string;
  description: string | null;
  currentMetricValue: number;
  targetMetricValue: number | null;
  status: string;
};

const GOAL_TEMPLATES = [
  { type: 'build_resume', label: 'Build my resume' },
  { type: 'practice_interviews', label: 'Practice interviews' },
  { type: 'apply_to_jobs', label: 'Apply to jobs consistently' },
  { type: 'complete_certification', label: 'Complete a certification' },
  { type: 'finish_pathway', label: 'Finish a learning pathway' },
  { type: 'linkedin_profile', label: 'Improve my LinkedIn profile' },
  { type: 'tech_readiness', label: 'Get ready for tech jobs' },
  { type: 'career_pivot', label: 'Transition into a new field' },
];

export default function GoalsModule() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [goalType, setGoalType] = useState('build_resume');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchGoals();
  }, []);

  const fetchGoals = async () => {
    const res = await fetch('/api/member/goals');
    const data = await res.json();
    if (res.ok) setGoals(data.goals ?? []);
    setLoading(false);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalTitle = (title.trim() || GOAL_TEMPLATES.find((t) => t.type === goalType)?.label) ?? goalType;
    setSaving(true);
    try {
      const res = await fetch('/api/member/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goalType,
          title: finalTitle,
        }),
      });
      if (res.ok) {
        setTitle('');
        setShowForm(false);
        fetchGoals();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async (id: string) => {
    await fetch(`/api/member/goals/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'COMPLETED' }),
    });
    fetchGoals();
  };

  const activeGoals = goals.filter((g) => g.status === 'ACTIVE');

  if (loading) return null;

  return (
    <div className="goals-module">
      <h3 className="goals-module-title">Your goals</h3>
      {activeGoals.length > 0 ? (
        <ul className="goals-list">
          {activeGoals.map((goal) => (
            <li key={goal.id} className="goals-item">
              <div className="goals-item-content">
                <span className="goals-item-title">{goal.title}</span>
                {goal.targetMetricValue != null && (
                  <span className="goals-item-progress">
                    {goal.currentMetricValue} / {goal.targetMetricValue}
                  </span>
                )}
              </div>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => handleComplete(goal.id)}
                aria-label="Mark complete"
              >
                Done
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="goals-empty">No active goals. Set 1–3 goals to stay focused.</p>
      )}

      {activeGoals.length < 3 && (
        <>
          {showForm ? (
            <form onSubmit={handleAdd} className="goals-form">
              <select
                value={goalType}
                onChange={(e) => {
                  setGoalType(e.target.value);
                  const t = GOAL_TEMPLATES.find((x) => x.type === e.target.value);
                  if (t) setTitle(t.label);
                }}
                className="form-select"
              >
                {GOAL_TEMPLATES.map((t) => (
                  <option key={t.type} value={t.type}>{t.label}</option>
                ))}
              </select>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Or type a custom goal"
                className="form-input"
              />
              <div className="goals-form-actions">
                <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
                  Add
                </button>
                <button type="button" className="btn btn-outline btn-sm" onClick={() => setShowForm(false)}>
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setShowForm(true)}>
              + Add goal
            </button>
          )}
        </>
      )}
      <p className="goals-hint">Goals shape your recommendations and weekly recap.</p>
    </div>
  );
}
