# Stitch Brief: Interview Session History

## What We're Building
Members need to be able to review their past interview practice sessions — the questions, their answers, and the AI feedback — from the Interview Coach page.

Currently: feedback is saved to `ai_tool_results` table but there's no way to retrieve or display it.

---

## What Needs to Happen

### 1. GET endpoint — `/api/interview/history`
Add a GET handler to the existing `app/api/interview/history/route.ts` file.

Returns the member's past interview sessions, most recent first.

```typescript
// GET /api/interview/history?limit=10
// Returns: { sessions: InterviewSession[] }

interface InterviewSession {
  id: string;
  createdAt: string;
  role: string;
  interviewType: string;
  feedback: string;
  questions: string[];
  answers: string[];
  sessionId: string;
}
```

Implementation:
```typescript
export async function GET(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const limit = parseInt(new URL(req.url).searchParams.get('limit') ?? '10');

  const results = await prisma.aIToolResult.findMany({
    where: { userId: user.id, toolType: 'interview_coach' },
    orderBy: { createdAt: 'desc' },
    take: Math.min(limit, 50),
    select: { id: true, inputSummary: true, output: true, createdAt: true },
  });

  const sessions = results.map(r => {
    try {
      const data = JSON.parse(r.output);
      return {
        id: r.id,
        createdAt: r.createdAt.toISOString(),
        role: data.role || r.inputSummary,
        interviewType: data.interviewType || 'behavioral',
        feedback: data.feedback || '',
        questions: data.questions || [],
        answers: data.answers || [],
        sessionId: data.sessionId || r.id,
      };
    } catch {
      return null;
    }
  }).filter(Boolean);

  return NextResponse.json({ sessions });
}
```

### 2. Fix the POST handler — save role + interviewType in output JSON

Currently the POST handler saves `JSON.stringify({ sessionId, answers, questions, feedback })` but doesn't include `role` or `interviewType`. Update it to also save those so the GET can display them.

In `app/api/interview/history/route.ts` POST handler, change:
```typescript
JSON.stringify({ sessionId, answers, questions, feedback })
```
to:
```typescript
JSON.stringify({ sessionId, role, interviewType, answers, questions, feedback })
```

### 3. History section in Interview Coach component

Add a collapsible "Past Sessions" section below the main Interview Coach UI in `components/portal/tools/InterviewCoach.tsx`.

**Location:** Show below the feedback card when `phase === 'feedback'`, and also always visible at the bottom of the setup screen.

**Behavior:**
- Fetch sessions on component mount via `GET /api/interview/history?limit=5`
- Show up to 5 most recent sessions
- Each session card shows: date, role, interview type, feedback preview (first 100 chars)
- Tap/click to expand and see full feedback + Q&A
- "Start new session" button on each card

**UI structure:**
```
[Past Interview Sessions]
  [Session card — collapsed]
    📅 March 29, 2026
    Software Engineer · Behavioral
    "Strong use of the STAR method in your responses..."
    [View full feedback ▼]
  
  [Session card — expanded]
    📅 March 28, 2026
    Product Manager · Technical
    
    [Overall Assessment]
    "Your answers showed clear technical depth..."
    
    [Interview Q&A]
    Q1: Tell me about a time you prioritized competing features.
    A1: At my last company, we had a sprint where...
    
    Q2: How do you measure product success?
    A2: I focus on outcome metrics rather than output...
    
    [Strengths]
    • Clear communication style
    • Strong use of metrics
    
    [Areas to Improve]  
    • More concise answers (aim for 2 min max)
    • Add quantified results to technical answers
    
    [Start new session →]
  
  [View all past sessions →] (links to /dashboard/interview-coach/history if more than 5)
```

### 4. Dedicated history page (optional, lower priority)
`app/(portal)/dashboard/interview-coach/history/page.tsx` — shows all past sessions paginated.
Only build this if time allows — the inline section covers the core need.

---

## Storage Format Reference

The `output` column in `ai_tool_results` stores JSON. After this fix it will look like:

```json
{
  "sessionId": "user-id-1234567890",
  "role": "Software Engineer",
  "interviewType": "behavioral",
  "questions": ["Tell me about a challenge you overcame.", "..."],
  "answers": ["At my last job I led a migration...", "..."],
  "feedback": "Overall your responses demonstrated strong problem-solving..."
}
```

The `inputSummary` column stores: `"behavioral interview feedback for Software Engineer"`

---

## Technical Context
- Repo: `/home/claw/.openclaw/workspace/projects/workforceap-beta`
- Auth: `getUser()` from `@/lib/auth/server`
- DB: `prisma.aIToolResult` — model already exists, no schema changes needed
- Existing file: `app/api/interview/history/route.ts` — add GET handler here
- Component: `components/portal/tools/InterviewCoach.tsx` — add history section

## Files to Modify
1. `app/api/interview/history/route.ts` — add GET handler, fix POST to include role/interviewType
2. `components/portal/tools/InterviewCoach.tsx` — add past sessions section

Branch: `feat/interview-session-history`
PR: against master
