import { chatCompletion } from './groq';

export async function generateResumeBullet(courseName: string): Promise<string> {
  const text = await chatCompletion(
    [
      {
        role: 'system',
        content:
          'You are an expert resume writer. Generate exactly one strong, action-oriented resume bullet point for a candidate who just completed the provided training or course. Return ONLY the bullet point text, no preamble or quotes.',
      },
      { role: 'user', content: `Course: ${courseName}` },
    ],
    { maxTokens: 150 }
  );

  if (text) {
    return text.replace(/^[-•*]\s*/, '').trim();
  }
  return `Completed ${courseName}`;
}
