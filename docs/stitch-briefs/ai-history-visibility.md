# Stitch Brief: AI Tool History — Member Visibility

## What's Broken
Members can't find their past AI tool results. The history page exists at `/dashboard/ai-tools/history` but:
1. `interview_coach` and `career_counselor` are missing from `TOOL_LABELS` — show as raw enum key
2. There's no link to the history page from the AI Tools dashboard card grid
3. The history page has no link from the member dashboard home

## What To Fix

### 1. Add missing tool labels — `app/(portal)/dashboard/ai-tools/history/page.tsx`
Add to the `TOOL_LABELS` map:
```typescript
interview_coach: 'AI Interview Coach',
career_counselor: 'Lilley Career Coach',
```

### 2. Add "View History" link to AI Tools page — `app/(portal)/dashboard/ai-tools/page.tsx`
Add a "Your history →" link near the top or bottom of the AI tools grid that points to `/dashboard/ai-tools/history`.

### 3. Add AI history card to member dashboard home — `app/(portal)/dashboard/page.tsx`
Add a small "Recent AI Activity" section to the dashboard that shows the last 2-3 tool results inline with a "View all →" link to `/dashboard/ai-tools/history`.

Pull recent results server-side:
```typescript
const recentTools = await prisma.aIToolResult.findMany({
  where: { userId: user.id },
  orderBy: { createdAt: 'desc' },
  take: 3,
  select: { id: true, toolType: true, inputSummary: true, createdAt: true },
});
```

Display as a compact list: icon + tool name + date + input summary.

### 4. Interview Coach history section (already in progress via `feat/interview-session-history`)
Skip this — handled by separate PR.

## Files to Modify
- `app/(portal)/dashboard/ai-tools/history/page.tsx` — add missing labels
- `app/(portal)/dashboard/ai-tools/page.tsx` — add history link
- `app/(portal)/dashboard/page.tsx` — add recent AI activity section

Branch: `feat/ai-history-visibility`
PR against master.
