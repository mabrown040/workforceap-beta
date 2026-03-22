export type InterviewQuestion = {
  question?: string;
  type?: string;
  tip?: string;
  starHint?: string;
  exampleAnswer?: string;
};

export function parseInterviewQuestions(output: string): InterviewQuestion[] {
  try {
    const raw = typeof output === 'string' ? output : JSON.stringify(output);
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    const jsonStr = jsonMatch ? jsonMatch[0] : raw;
    const parsed = JSON.parse(jsonStr);
    const arr = Array.isArray(parsed) ? parsed : (parsed?.questions ?? []);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function formatToolOutput(output: string, toolType: string): string {
  if (toolType === 'interview_practice') {
    const questions = parseInterviewQuestions(output);
    if (questions.length === 0) return output || 'No questions available.';
    return questions
      .map((item, i) => {
        const parts = [
          item.question ? `${i + 1}. ${item.question}` : '',
          item.type ? `Type: ${item.type}` : '',
          item.tip ? `Tip: ${item.tip}` : '',
          item.starHint ? `STAR hint: ${item.starHint}` : '',
          item.exampleAnswer ? `Example answer: ${item.exampleAnswer}` : '',
        ].filter(Boolean);
        return parts.join('\n');
      })
      .join('\n\n');
  }

  if (toolType === 'linkedin_headline') {
    try {
      const arr = JSON.parse(typeof output === 'string' ? output : JSON.stringify(output));
      return Array.isArray(arr) ? arr.map((x) => (typeof x === 'string' ? x : String(x))).join('\n\n') : String(output);
    } catch {
      return typeof output === 'string' ? output : '';
    }
  }

  return typeof output === 'string' ? output : 'Unable to display.';
}
