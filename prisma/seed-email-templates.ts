import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEFAULT_TEMPLATES = [
  {
    key: 'welcome-member',
    name: 'Welcome — Member Enrollment Confirmed',
    subject: 'Welcome to {programName} — your enrollment is confirmed',
    body: `<p>Hi {firstName},</p>
<p>Welcome to <strong>{programName}</strong>! Your enrollment has been confirmed and we're excited to have you.</p>
<p>Your counselor <strong>{counselorName}</strong> will reach out within 24 hours to help you get started.</p>
<p>In the meantime, log into your member portal to explore your training materials.</p>`,
    variables: ['firstName', 'programName', 'counselorName'],
  },
  {
    key: 'application-confirmation',
    name: 'Application Received',
    subject: 'Application Received — Workforce Advancement Project',
    body: `<p>Hi {firstName},</p>
<p>We received your application. A member of our team will review it within 2–3 business days.</p>
<p>You can check your status anytime by logging into your portal.</p>`,
    variables: ['firstName'],
  },
  {
    key: 'application-accepted',
    name: 'Application Accepted',
    subject: 'Welcome to WorkforceAP — Your Application Was Accepted',
    body: `<p>Hi {firstName},</p>
<p>Congratulations! Your application to WorkforceAP has been accepted.</p>
<p>Log into your portal to complete onboarding and select your training program.</p>`,
    variables: ['firstName'],
  },
  {
    key: 'application-rejected',
    name: 'Application Update (Rejected)',
    subject: 'WorkforceAP Application Update',
    body: `<p>Hi {firstName},</p>
<p>Thank you for your interest in WorkforceAP. After careful review, we are unable to move forward with your application at this time.</p>
<p>If you have questions, please contact us at info@workforceap.org.</p>`,
    variables: ['firstName'],
  },
  {
    key: 'enrollment-confirmed',
    name: 'Enrollment Confirmed',
    subject: 'Welcome to {programName} — your WorkforceAP enrollment is confirmed',
    body: `<p>Hi {firstName},</p>
<p>Your enrollment in <strong>{programName}</strong> is confirmed!</p>
<p>Your counselor <strong>{counselorName}</strong> is here to support you. Reach them at {counselorContact}.</p>
<p>Log into your portal to start training.</p>`,
    variables: ['firstName', 'programName', 'counselorContact', 'counselorName'],
  },
  {
    key: 'course-enrolled',
    name: 'Course Enrolled',
    subject: "You're Enrolled: {programName}",
    body: `<p>Hi {firstName},</p>
<p>You are now enrolled in <strong>{programName}</strong>.</p>
<p>Head to your training dashboard to get started.</p>`,
    variables: ['firstName', 'programName'],
  },
  {
    key: 'course-completed',
    name: 'Course Completed',
    subject: 'Congratulations! You Completed {courseName}',
    body: `<p>Hi {firstName},</p>
<p>Great work — you completed <strong>{courseName}</strong>!</p>
<p>This is a big step forward. Check your dashboard for what's next.</p>`,
    variables: ['firstName', 'courseName'],
  },
  {
    key: 'inactive-nudge',
    name: 'Inactive Member Nudge',
    subject: 'We Miss You at WorkforceAP',
    body: `<p>Hi {firstName},</p>
<p>We noticed you haven't been active lately. Everything okay?</p>
<p>If you need support, your counselor is here to help. Otherwise, jump back in — your goals are waiting.</p>`,
    variables: ['firstName'],
  },
  {
    key: 'weekly-recap',
    name: 'Weekly Recap',
    subject: 'Your WorkforceAP Weekly Recap',
    body: `<p>Hi {firstName},</p>
{recapSummary}
<p>Keep up the momentum — you're doing great.</p>`,
    variables: ['firstName', 'recapSummary'],
  },
  {
    key: 'placement-survey',
    name: 'Post-Placement Survey',
    subject: "How's the new job going? — quick 3-minute survey",
    body: `<p>Hi {firstName},</p>
<p>You recently started a new role after completing <strong>{programName}</strong>. We'd love to hear how it's going.</p>
<p>Your feedback helps us improve the program for future members.</p>
<p><a href="{surveyUrl}">Take the 3-minute survey</a></p>`,
    variables: ['firstName', 'programName', 'surveyUrl'],
  },
  {
    key: 'counselor-assigned',
    name: 'Counselor Assigned',
    subject: 'Your WorkforceAP counselor is assigned',
    body: `<p>Hi {firstName},</p>
<p><strong>{counselorName}</strong> has been assigned as your counselor.</p>
<p>They will be your main point of contact throughout your program. Reach out anytime through the member portal.</p>`,
    variables: ['firstName', 'counselorName'],
  },
  {
    key: 'job-approved',
    name: 'Job Approved (Employer)',
    subject: 'Your job "{jobTitle}" is now live on WorkforceAP',
    body: `<p>Hi there,</p>
<p>Your job posting <strong>{jobTitle}</strong> for <strong>{companyName}</strong> has been approved and is now live on WorkforceAP.</p>
<p>You can manage it from your employer portal.</p>`,
    variables: ['jobTitle', 'companyName'],
  },
  {
    key: 'job-rejected',
    name: 'Job Rejected (Employer)',
    subject: 'Job posting "{jobTitle}" — Update',
    body: `<p>Hi there,</p>
<p>Your job posting <strong>{jobTitle}</strong> for <strong>{companyName}</strong> was not approved.</p>
<p><strong>Reason:</strong> {reason}</p>
<p>You can edit and resubmit from your employer portal.</p>`,
    variables: ['jobTitle', 'companyName', 'reason'],
  },
  {
    key: 'new-application-alert',
    name: 'New Application Alert (Admin)',
    subject: 'New Application: {applicantName}',
    body: `<p>A new application has been submitted.</p>
<ul>
  <li><strong>Name:</strong> {applicantName}</li>
  <li><strong>Email:</strong> {applicantEmail}</li>
  <li><strong>Program interest:</strong> {programInterest}</li>
</ul>
<p>Review it in the admin dashboard.</p>`,
    variables: ['applicantName', 'applicantEmail', 'programInterest'],
  },
  {
    key: 'admin-weekly-recap',
    name: 'Admin Weekly Recap',
    subject: 'Weekly Recap: {newApplicants} new applicants, {placements} placements',
    body: `<p>Here's your weekly summary:</p>
<ul>
  <li><strong>New applicants:</strong> {newApplicants}</li>
  <li><strong>Placements:</strong> {placements}</li>
  <li><strong>At-risk students:</strong> {atRiskStudents}</li>
  <li><strong>Pending applications:</strong> {pendingApplications}</li>
</ul>`,
    variables: ['newApplicants', 'placements', 'atRiskStudents', 'pendingApplications'],
  },
  {
    key: 'partner-weekly-digest',
    name: 'Partner Weekly Digest',
    subject: 'WorkforceAP weekly referral update — {partnerName}',
    body: `<p>Hi {partnerName} team,</p>
<p>Here's your referral snapshot for the week of {weekLabel}.</p>
<p>Check the partner portal for full details.</p>`,
    variables: ['partnerName', 'weekLabel'],
  },
  {
    key: 'invitation',
    name: 'User Invitation',
    subject: '{inviterName} invited you to join WorkforceAP',
    body: `<p>You've been invited to join WorkforceAP as a <strong>{role}</strong>.</p>
<p>{personalMessage}</p>
<p>Click the button below to accept your invitation and set up your account.</p>`,
    variables: ['inviterName', 'role', 'personalMessage'],
  },
  {
    key: 'employer-welcome',
    name: 'Employer Welcome',
    subject: 'Welcome to WorkforceAP — {companyName}',
    body: `<p>Hi {contactName},</p>
<p>Welcome to WorkforceAP! <strong>{companyName}</strong> is now set up on our employer portal.</p>
<p>You can post jobs, review applicants, and connect with trained candidates.</p>`,
    variables: ['companyName', 'contactName'],
  },
  {
    key: 'at-risk-digest',
    name: 'At-Risk Digest (Admin/Counselor)',
    subject: 'At-Risk Digest — {criticalCount} critical, {highCount} high ({dateLabel})',
    body: `<p>At-risk member summary for {dateLabel}:</p>
<ul>
  <li><strong>Critical:</strong> {criticalCount}</li>
  <li><strong>High:</strong> {highCount}</li>
  <li><strong>Medium:</strong> {mediumCount}</li>
</ul>
<p>Review the at-risk dashboard for details and recommended actions.</p>`,
    variables: ['dateLabel', 'criticalCount', 'highCount', 'mediumCount'],
  },
];

async function main() {
  console.log('Seeding email templates...');

  for (const t of DEFAULT_TEMPLATES) {
    await prisma.emailTemplate.upsert({
      where: { key: t.key },
      update: {},
      create: {
        key: t.key,
        name: t.name,
        subject: t.subject,
        body: t.body,
        variables: t.variables,
        active: true,
      },
    });
    console.log(`  ✓ ${t.key}`);
  }

  console.log(`Seeded ${DEFAULT_TEMPLATES.length} email templates.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
