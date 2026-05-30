/** In-memory interview session store shared across the interview API routes. */
export const interviewSessions = new Map<
  string,
  {
    userId: string;
    questions: Array<{ question: string; type: string }>;
    responses: Array<{ question: string; answer: string }>;
    startedAt: Date;
    completedAt?: Date;
  }
>();
