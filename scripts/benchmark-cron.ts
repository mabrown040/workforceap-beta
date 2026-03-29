import { performance } from 'perf_hooks';

const NUM_APPS = 100;
const staleApplications = Array.from({ length: NUM_APPS }).map((_, i) => ({
  id: `app-${i}`,
  status: 'PENDING',
  submittedAt: new Date(),
  createdAt: new Date(),
  user: {
    id: `user-${i}`,
    email: `user${i}@example.com`,
    fullName: `User ${i}`,
  }
}));

function addBusinessDays(date: Date, days: number): Date {
  const result = new Date(date);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    const dow = result.getDay();
    if (dow !== 0 && dow !== 6) added++;
  }
  return result;
}

const sendApplicantFollowupEmail = async (params: any) => {
  // simulate network delay
  await new Promise(resolve => setTimeout(resolve, 50));
  return { ok: true };
};

async function runSequential() {
  const start = performance.now();
  let applicantEmailsSent = 0;
  const seenUsers = new Set<string>();

  for (const app of staleApplications) {
    if (seenUsers.has(app.user.id)) continue;
    seenUsers.add(app.user.id);

    const expectedDate = addBusinessDays(
      app.submittedAt ?? app.createdAt,
      5
    ).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

    try {
      const result = await sendApplicantFollowupEmail({
        to: app.user.email,
        fullName: app.user.fullName,
        expectedDate,
      });
      if (result.ok) applicantEmailsSent++;
    } catch (err) {
      console.error(`Applicant followup failed for user ${app.user.id}:`, err);
    }
  }
  const end = performance.now();
  console.log(`Sequential: ${end - start}ms (Sent: ${applicantEmailsSent})`);
}

async function runConcurrent() {
  const start = performance.now();
  let applicantEmailsSent = 0;
  const seenUsers = new Set<string>();

  const uniqueApps = staleApplications.filter(app => {
    if (seenUsers.has(app.user.id)) return false;
    seenUsers.add(app.user.id);
    return true;
  });

  const promises = uniqueApps.map(async (app) => {
    const expectedDate = addBusinessDays(
      app.submittedAt ?? app.createdAt,
      5
    ).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

    try {
      const result = await sendApplicantFollowupEmail({
        to: app.user.email,
        fullName: app.user.fullName,
        expectedDate,
      });
      if (result.ok) return 1;
    } catch (err) {
      console.error(`Applicant followup failed for user ${app.user.id}:`, err);
    }
    return 0;
  });

  const results = await Promise.all(promises);
  applicantEmailsSent = results.reduce<number>((a, b) => a + b, 0);

  const end = performance.now();
  console.log(`Concurrent: ${end - start}ms (Sent: ${applicantEmailsSent})`);
}

async function main() {
  await runSequential();
  await runConcurrent();
}

main();
