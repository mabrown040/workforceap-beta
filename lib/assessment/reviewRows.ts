// Server-only: joins a member's stored preassessment answers with the answer
// key so staff surfaces (emails, admin + counselor member pages) can show the
// chosen answer and whether it was correct. Never import from a 'use client'
// file — see answer-key.ts (AUDIT-2026-05-16 §C-B3).
import 'server-only';

import { ASSESSMENT_QUESTIONS, TOTAL_POINTS, type QuestionChoice } from '@/lib/assessment/answer-key';

export type AssessmentReviewRow = {
  id: number;
  question: string;
  /** Letter the member chose, or null when unanswered. */
  answer: QuestionChoice | null;
  /** Label of the chosen option, or null when unanswered. */
  answerLabel: string | null;
  correct: boolean;
  points: number;
};

const CHOICES: readonly QuestionChoice[] = ['A', 'B', 'C', 'D'];

function normalizeAnswers(raw: unknown): Record<number, QuestionChoice> {
  const out: Record<number, QuestionChoice> = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const id = Number.parseInt(key, 10);
    if (!Number.isFinite(id)) continue;
    if (typeof value === 'string' && (CHOICES as readonly string[]).includes(value)) {
      out[id] = value as QuestionChoice;
    }
  }
  return out;
}

export function buildAssessmentReviewRows(rawAnswers: unknown): AssessmentReviewRow[] {
  const answers = normalizeAnswers(rawAnswers);
  return ASSESSMENT_QUESTIONS.map((q) => {
    const answer = answers[q.id] ?? null;
    const choice = answer ? q.choices.find((c) => c.value === answer) : undefined;
    return {
      id: q.id,
      question: q.question,
      answer,
      answerLabel: choice?.label ?? null,
      correct: answer === q.correct,
      points: q.points,
    };
  });
}

/** Plain-text answer sheet for the staff notification email. */
export function formatAssessmentReviewText(rows: AssessmentReviewRow[]): string[] {
  const earned = rows.reduce((sum, r) => sum + (r.correct ? r.points : 0), 0);
  return [
    `Answer sheet (${earned}/${TOTAL_POINTS} points):`,
    ...rows.map((r) =>
      `Q${r.id}. ${r.question} — ${
        r.answer ? `${r.answer}: ${r.answerLabel ?? ''}` : 'not answered'
      } [${r.correct ? 'correct' : 'incorrect'}, ${r.points} pt${r.points === 1 ? '' : 's'}]`,
    ),
  ];
}
