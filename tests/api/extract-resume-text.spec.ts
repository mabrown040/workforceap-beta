import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  rateLimit: vi.fn(),
}));

vi.mock('@/lib/auth/server', () => ({ getUser: mocks.getUser }));
vi.mock('@/lib/rate-limit', () => ({ checkAIToolRateLimit: mocks.rateLimit }));

import { POST } from '@/app/api/ai/extract-resume-text/route';

function requestWithFile(file: unknown): Request {
  return {
    formData: async () => ({
      get: (key: string) => (key === 'file' ? file : null),
    }),
  } as unknown as Request;
}

describe('POST /api/ai/extract-resume-text', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUser.mockResolvedValue({ id: 'member-1' });
    mocks.rateLimit.mockResolvedValue({ success: true });
  });

  it('rejects legacy DOC with the shared PDF, DOCX, or TXT guidance before reading bytes', async () => {
    let readAttempted = false;
    const response = await POST(requestWithFile({
      name: 'legacy-resume.doc',
      type: 'application/msword',
      size: 1024,
      arrayBuffer: async () => {
        readAttempted = true;
        return new ArrayBuffer(0);
      },
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      code: 'legacy_doc_unsupported',
    });
    expect(readAttempted).toBe(false);
  });

  it('returns normalized substantive TXT through the shared preparation policy', async () => {
    const text = 'Jordan Candidate\r\nExperience\r\nDatabase administration and SQL recovery.';
    const bytes = new TextEncoder().encode(text);
    const response = await POST(requestWithFile({
      name: 'resume.txt',
      type: 'text/plain',
      size: bytes.byteLength,
      arrayBuffer: async () => bytes.buffer,
    }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      text: 'Jordan Candidate\nExperience\nDatabase administration and SQL recovery.',
    });
  });
});
