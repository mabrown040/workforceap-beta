# Super Admin Message Visibility Feature

## Objective
Build a comprehensive message monitoring system that allows super admins to view ALL counselor-member communications across the platform, with escalation alerts for missed messages.

## Current State Analysis
- **Existing messaging**: `CounselorNote` table handles counselor↔member notes
- **Roles**: `member`, `admin`, `case_manager` (need to add `super_admin`)
- **No existing**: Super admin oversight, message alerts, or visibility dashboard

## Feature Requirements

### 1. Database Schema Updates (Prisma)

```prisma
// Add super_admin role to existing Role model
// Add MessageThread model for tracking conversation threads
// Add MessageAlert model for escalation tracking
// Add MessageReadReceipt for audit trail
```

New models needed:
- `MessageThread` - groups related counselor notes by member
- `MessageAlert` - tracks escalations (SLA breaches)
- `SuperAdminPreference` - notification settings per super admin

### 2. Super Admin Role Setup

Migration to add super_admin role:
```sql
INSERT INTO roles (name) VALUES ('super_admin');
```

### 3. Admin Dashboard Page: `/admin/messages`

**Layout:**
- Sidebar: Filters (Date range, Member, Counselor, Status, Has alerts)
- Main: Message thread list with preview
- Right panel: Selected thread full view

**Features:**
- Real-time message stream (WebSocket or polling)
- Thread list with:
  - Member name + avatar
  - Last message preview
  - Counselor assigned
  - Time since last message
  - Alert badge (red if >48h no response)
  - Unread indicator
- Search across all message content
- Export to CSV/PDF

### 4. Alert System

**SLA Rules:**
- Member message → Counselor has 48h to respond
- Alert triggers at 48h, escalates at 72h
- Super admin gets dashboard notification + optional email

**Alert UI:**
- Red badge on `/admin/messages` nav item
- Toast notification on login
- Filter: "Show only alerts"

### 5. API Endpoints

```typescript
// GET /api/admin/messages/threads
// Query: cursor, limit, memberId, counselorId, hasAlerts, dateFrom, dateTo
// Returns: paginated threads with last message preview

// GET /api/admin/messages/thread/[threadId]
// Returns: full message history for thread

// POST /api/admin/messages/alert/acknowledge
// Acknowledge an alert (mark as seen by super admin)

// GET /api/admin/messages/stats
// Dashboard stats: total threads, alerts pending, avg response time

// WebSocket: /ws/admin/messages
// Real-time updates for new messages/alerts
```

### 6. Security & Permissions

- Middleware check: `requireSuperAdmin()`
- Audit log all super admin message views
- No ability to SEND messages (read-only for privacy)
- Mask sensitive member data option

### 7. Email Notifications (Optional Phase 2)

- Daily digest of new alerts
- Real-time alert for urgent cases (>72h)

## File Structure

```
app/admin/messages/
├── page.tsx                    # Main dashboard
├── layout.tsx                  # Dashboard shell
├── components/
│   ├── MessageThreadList.tsx   # Thread list with filters
│   ├── MessageThreadView.tsx   # Full thread display
│   ├── AlertBadge.tsx          # Red alert indicator
│   ├── MessageFilters.tsx      # Sidebar filters
│   ├── MessageSearch.tsx       # Global search
│   └── AlertToast.tsx          # Real-time notifications
├── hooks/
│   ├── useMessages.ts          # SWR hook for message data
│   └── useWebSocket.ts         # Real-time updates
└── lib/
    └── messageQueries.ts       # Database queries

app/api/admin/messages/
├── threads/route.ts            # GET threads list
├── thread/[id]/route.ts        # GET single thread
├── alert/acknowledge/route.ts  # POST acknowledge
└── stats/route.ts              # GET dashboard stats

prisma/migrations/
└── [timestamp]_super_admin_messages/migration.sql
```

## Implementation Order

1. **Schema**: Add models + super_admin role
2. **API**: Build endpoints with pagination
3. **UI**: Thread list + filters
4. **Real-time**: WebSocket or polling
5. **Alerts**: SLA logic + notifications
6. **Polish**: Export, search, mobile responsive

## Testing Checklist

- [ ] Super admin can view all threads
- [ ] Alert triggers at 48h
- [ ] Filters work (date, member, counselor, status)
- [ ] Real-time updates show new messages
- [ ] Regular admin cannot access `/admin/messages`
- [ ] Audit logs capture views

## Key Design Decisions

1. **Read-only**: Super admins view but don't send (maintain counselor authority)
2. **Thread-based**: Group by member, not individual messages
3. **Alert priority**: Visual red badges + toast, email optional
4. **Performance**: Paginate at 50 threads, cursor-based

## Acceptance Criteria

- Super admin logs in → sees "Messages" nav item with alert count
- Clicks → sees all active member-counselor threads
- Red badge on threads >48h without counselor response
- Can filter to "Only alerts" to see escalation queue
- Search finds message content across all threads
- Mobile responsive for emergency on-call checks

---

Build this feature completely. Test with seed data. Ensure no regression to existing counselor/member messaging flow.