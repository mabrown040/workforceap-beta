import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('next/server', () => {
  class MockNextRequest extends Request {
    get nextUrl() {
      return new URL(this.url);
    }
  }

  class MockNextResponse extends Response {
    static json(body: unknown, init?: ResponseInit) {
      return new Response(JSON.stringify(body), {
        ...init,
        headers: { 'content-type': 'application/json', ...(init?.headers || {}) },
      });
    }
  }

  return {
    NextRequest: MockNextRequest,
    NextResponse: MockNextResponse,
  };
});

vi.mock('@/lib/db/withRequestGuc', () => ({
  withApiGuc: (handler: (request: Request) => Promise<Response>) => handler,
}));

vi.mock('@/lib/auth/server', () => ({
  resolveAuthGucContext: vi.fn(async () => ({ userId: null, orgId: null, role: 'anonymous' })),
  getUser: vi.fn(),
}));

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    $transaction: vi.fn(async (arg: any) => { const { prisma } = await import('@/lib/db/prisma'); return typeof arg === 'function' ? arg(prisma) : Promise.all(arg); }),
    mentor: {
      findFirst: vi.fn(),
    },
  },
}));

import { GET } from '@/app/api/mentor/letter/route';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';

describe('GET /api/mentor/letter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('escapes mentor fields in generated HTML and sanitizes the filename', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-123' } as any);
    vi.mocked(prisma.mentor.findFirst).mockResolvedValue({
      id: 'mentor-123',
      userId: 'user-123',
      isActive: true,
      fullName: "Eve <script>alert('x')</script>",
      title: '<img src=x onerror=alert(1)>',
      company: 'A&B "Ops"',
      sessions: [{ hoursLogged: 2.5, scheduledAt: new Date('2026-01-01') }],
    } as any);

    const res = await GET(
      new Request('http://localhost:3000/api/mentor/letter?mentorId=mentor-123') as any
    );

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Disposition')).toBe(
      'inline; filename="volunteer-letter-eve-script-alert-x-script.html"'
    );

    const body = await res.text();
    expect(body).toContain('Eve &lt;script&gt;alert(&#39;x&#39;)&lt;/script&gt;');
    expect(body).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(body).toContain('A&amp;B &quot;Ops&quot;');
    expect(body).not.toContain('<script>alert');
    expect(body).not.toContain('<img src=x');
  });
});
