import test from 'node:test';
import assert from 'node:assert/strict';
import { dataToCsv, exportFilename } from './export';
import { ELIGIBILITY_DATASHEET_COLUMNS } from '@/lib/apply/eligibilityScreeningFields';

// ---- Members export shape test ----
test('members export CSV includes expected columns', () => {
  const members = [
    {
      fullName: 'Alice Smith',
      email: 'alice@example.com',
      phone: '512-555-0100',
      profile: { profilePhone: null, city: 'Austin', state: 'TX', employmentStatus: 'Unemployed', educationLevel: 'High School' },
      programTitle: 'Healthcare Admin',
      partnerName: 'Goodwill',
      fitScore: 8,
      healthStatus: 'green',
      enrolledAt: new Date('2026-01-15'),
      assessmentScorePct: 85,
      assessmentCompleted: true,
      liveProgress: { percent: 60, coursesCompleted: 3, totalCourses: 5, coursesActive: 1 },
      totalCourses: 5,
      activeCourses: 1,
      coursesCompletedCount: 3,
      updatedAt: new Date('2026-05-10'),
      createdAt: new Date('2026-01-10'),
    },
  ];

  const csv = dataToCsv(
    [
      { key: 'name', header: 'Full Name', accessor: (r) => (r as any).fullName },
      { key: 'email', header: 'Email', accessor: (r) => (r as any).email },
      { key: 'phone', header: 'Phone', accessor: (r) => (r as any).phone ?? '' },
      { key: 'program', header: 'Program', accessor: (r) => (r as any).programTitle ?? '—' },
      { key: 'partner', header: 'Partner', accessor: (r) => (r as any).partnerName ?? '—' },
      { key: 'fitScore', header: 'Fit Score', accessor: (r) => (r as any).fitScore ?? '' },
      { key: 'health', header: 'Health', accessor: (r) => (r as any).healthStatus ?? '' },
      { key: 'enrolledAt', header: 'Enrolled', accessor: (r) => (r as any).enrolledAt },
      { key: 'assessmentScore', header: 'Assessment Score', accessor: (r) => {
        const pct = (r as any).assessmentScorePct;
        return pct != null ? `${pct}%` : '';
      }},
      { key: 'training', header: 'Training', accessor: (r) => {
        const live = (r as any).liveProgress;
        if (live) return `${live.percent}% · ${live.coursesCompleted}/${live.totalCourses} done · ${live.coursesActive} active`;
        return '—';
      }},
    ],
    members,
  );

  const lines = csv.trim().split('\r\n');
  assert.equal(lines[0], 'Full Name,Email,Phone,Program,Partner,Fit Score,Health,Enrolled,Assessment Score,Training');
  assert.ok(lines[1].includes('Alice Smith'));
  assert.ok(lines[1].includes('Healthcare Admin'));
  assert.ok(lines[1].includes('60% · 3/5 done · 1 active'));
});

// ---- WS5 eligibility datasheet columns on members-style export ----
test('eligibility screening columns appear in export header shape', () => {
  const headers = [
    'Full Name',
    'Email',
    ...ELIGIBILITY_DATASHEET_COLUMNS,
    'Eligibility Screening Submitted',
  ];
  assert.ok(headers.includes('Receiving Unemployment'));
  assert.ok(headers.includes('SNAP/WIC'));
  assert.ok(headers.includes('Partner/Ambassador Referral'));
});

// ---- Feedback export shape test ----
test('feedback export CSV includes ratings and comments', () => {
  const items = [
    { id: 'f1', user: { fullName: 'Bob', email: 'bob@example.com' }, type: 'training', rating: 5, comment: 'Very helpful!', createdAt: new Date('2026-05-13') },
    { id: 'f2', user: { fullName: 'Carol', email: 'carol@example.com' }, type: 'platform', rating: 2, comment: null, createdAt: new Date('2026-05-12') },
  ];

  const csv = dataToCsv(
    [
      { key: 'memberName', header: 'Member Name', accessor: (r: any) => r.user.fullName },
      { key: 'type', header: 'Type', accessor: (r: any) => r.type },
      { key: 'rating', header: 'Rating', accessor: (r: any) => r.rating },
      { key: 'comment', header: 'Comment', accessor: (r: any) => r.comment ?? '' },
      { key: 'createdAt', header: 'Submitted', accessor: (r: any) => r.createdAt },
    ],
    items,
  );

  const lines = csv.trim().split('\r\n');
  assert.equal(lines[0], 'Member Name,Type,Rating,Comment,Submitted');
  assert.ok(lines[1].includes('Very helpful!'));
  assert.ok(lines[2].includes('Carol'));
  assert.ok(lines[2].includes(',,')); // null comment → empty
});

// ---- Crons export shape test ----
test('crons export CSV includes durations and errors', () => {
  const executions = [
    { id: 'c1', jobName: 'cleanup', status: 'SUCCESS', startedAt: new Date('2026-05-13T10:00:00Z'), completedAt: new Date('2026-05-13T10:01:00Z'), durationMs: 60000, recordsProcessed: 10, errorMessage: null },
    { id: 'c2', jobName: 'report', status: 'FAILED', startedAt: new Date('2026-05-12T10:00:00Z'), completedAt: null, durationMs: null, recordsProcessed: null, errorMessage: 'Timeout' },
  ];

  const csv = dataToCsv(
    [
      { key: 'jobName', header: 'Job Name', accessor: (r: any) => r.jobName },
      { key: 'status', header: 'Status', accessor: (r: any) => r.status },
      { key: 'durationMs', header: 'Duration (ms)', accessor: (r: any) => r.durationMs ?? '' },
      { key: 'recordsProcessed', header: 'Records', accessor: (r: any) => r.recordsProcessed ?? '' },
      { key: 'errorMessage', header: 'Error', accessor: (r: any) => r.errorMessage ?? '' },
    ],
    executions,
  );

  const lines = csv.trim().split('\r\n');
  assert.ok(lines[1].includes('cleanup,SUCCESS,60000,10,'));
  assert.ok(lines[2].includes('report,FAILED,,,Timeout'));
});

// ---- Webhook events export shape test ----
test('webhook events export CSV includes status and payload size', () => {
  const events = [
    { id: 'w1', source: 'stripe', eventType: 'invoice.paid', status: 'success', httpStatusCode: 200, payloadSize: 1024, processingTimeMs: 45, retryCount: 0, errorMessage: null, createdAt: new Date('2026-05-13') },
  ];

  const csv = dataToCsv(
    [
      { key: 'source', header: 'Source', accessor: (r: any) => r.source },
      { key: 'eventType', header: 'Event Type', accessor: (r: any) => r.eventType ?? '' },
      { key: 'status', header: 'Status', accessor: (r: any) => r.status },
      { key: 'payloadSize', header: 'Payload Size', accessor: (r: any) => r.payloadSize },
    ],
    events,
  );

  const lines = csv.trim().split('\r\n');
  assert.ok(lines[1].includes('stripe,invoice.paid,success,1024'));
});

// ---- Employers export shape test ----
test('employers export CSV includes company and tier info', () => {
  const employers = [
    { id: 'e1', companyName: 'TechCorp', contactName: 'Jane', contactEmail: 'jane@techcorp.com', user: { fullName: 'Jane Doe', email: 'jane@techcorp.com' }, status: 'active', tier: 'platinum', _count: { jobs: 5 }, placementAgreementSigned: true, hiringPipelineActive: true, createdAt: new Date('2026-01-01') },
  ];

  const csv = dataToCsv(
    [
      { key: 'company', header: 'Company', accessor: (r: any) => r.companyName },
      { key: 'contact', header: 'Contact', accessor: (r: any) => r.contactEmail ?? '' },
      { key: 'status', header: 'Status', accessor: (r: any) => r.status },
      { key: 'tier', header: 'Tier', accessor: (r: any) => r.tier ?? '' },
      { key: 'jobs', header: 'Jobs', accessor: (r: any) => r._count.jobs },
      { key: 'agreement', header: 'Agreement', accessor: (r: any) => r.placementAgreementSigned },
    ],
    employers,
  );

  const lines = csv.trim().split('\r\n');
  assert.ok(lines[1].includes('TechCorp,jane@techcorp.com,active,platinum,5,Yes'));
});

// ---- Partners export shape test ----
test('partners export CSV includes referral counts', () => {
  const partners = [
    { id: 'p1', name: 'Goodwill', slug: 'goodwill', contactName: 'Sam', contactEmail: 'sam@goodwill.org', contactPhone: null, active: true, _count: { counselors: 2, referrals: 15 }, createdAt: new Date('2026-01-01') },
  ];

  const csv = dataToCsv(
    [
      { key: 'name', header: 'Name', accessor: (r: any) => r.name },
      { key: 'contactEmail', header: 'Email', accessor: (r: any) => r.contactEmail ?? '' },
      { key: 'counselors', header: 'Counselors', accessor: (r: any) => r._count.counselors },
      { key: 'referrals', header: 'Referrals', accessor: (r: any) => r._count.referrals },
      { key: 'active', header: 'Active', accessor: (r: any) => r.active },
    ],
    partners,
  );

  const lines = csv.trim().split('\r\n');
  assert.ok(lines[1].includes('Goodwill,sam@goodwill.org,2,15,Yes'));
});

// ---- Escaping edge cases across all exports ----
test('export handles commas, quotes, and newlines safely', () => {
  const rows = [
    { note: 'Has, comma' },
    { note: 'Has "quotes"' },
    { note: 'Line\nbreak' },
    { note: 'Normal text' },
  ];

  const csv = dataToCsv([{ key: 'note', header: 'Note', accessor: (r: any) => r.note }], rows);
  const lines = csv.trim().split('\r\n');
  assert.equal(lines[1], '"Has, comma"');
  assert.equal(lines[2], '"Has ""quotes"""');
  assert.equal(lines[3], '"Line\nbreak"');
  assert.equal(lines[4], 'Normal text');
});

test('exportFilename produces date-stamped names', () => {
  const name = exportFilename('members');
  assert.match(name, /^members-\d{4}-\d{2}-\d{2}\.csv$/);
});
