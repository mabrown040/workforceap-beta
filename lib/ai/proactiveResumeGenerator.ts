import { Groq } from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function generateResumeBullet(courseName: string): Promise<string> {
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
