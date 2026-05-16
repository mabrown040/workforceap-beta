import { Groq } from 'groq-sdk';

export async function generateResumeBullet(courseName: string): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    // Don't ship a dummy key to Groq — every call would 401 against a real
    // tenant ID, burning rate limit and masking the underlying config bug.
    return `Completed ${courseName}`;
  }
  const groq = new Groq({ apiKey });
  const response = await groq.chat.completions.create({
    model: 'llama3-8b-8192',
    max_tokens: 150,
    messages: [
      { role: 'system', content: 'You are an expert resume writer. Generate exactly one strong, action-oriented resume bullet point for a candidate who just completed the provided training or course. Return ONLY the bullet point text, no preamble or quotes.' },
      { role: 'user', content: `Course: ${courseName}` }
    ]
  });
  
  const text = response.choices[0]?.message?.content;
  if (text) {
    return text.replace(/^[-•*]\s*/, '').trim();
  }
  return `Completed ${courseName}`;
}
