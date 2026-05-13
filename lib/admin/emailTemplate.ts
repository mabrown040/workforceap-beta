import { brandedEmailLayout } from '@/lib/email/template';

export type EmailTemplateVariable = {
  name: string;
  description: string;
  example: string;
};

export const EMAIL_TEMPLATE_VARIABLES: Record<string, EmailTemplateVariable[]> = {
  'welcome-member': [
    { name: 'firstName', description: "Member's first name", example: 'Maria' },
    { name: 'programName', description: 'Program they enrolled in', example: 'Customer Service Specialist' },
    { name: 'counselorName', description: 'Assigned counselor name', example: 'John Doe' },
  ],
  'application-confirmation': [
    { name: 'firstName', description: "Applicant's first name", example: 'Maria' },
  ],
  'application-accepted': [
    { name: 'firstName', description: "Applicant's first name", example: 'Maria' },
  ],
  'application-rejected': [
    { name: 'firstName', description: "Applicant's first name", example: 'Maria' },
  ],
  'enrollment-confirmed': [
    { name: 'firstName', description: "Member's first name", example: 'Maria' },
    { name: 'programName', description: 'Program name', example: 'Customer Service Specialist' },
    { name: 'counselorContact', description: 'Counselor email or phone', example: 'counselor@workforceap.org' },
    { name: 'counselorName', description: 'Counselor name', example: 'John Doe' },
  ],
  'course-enrolled': [
    { name: 'firstName', description: "Member's first name", example: 'Maria' },
    { name: 'programName', description: 'Course/program name', example: 'Customer Service Specialist' },
  ],
  'course-completed': [
    { name: 'firstName', description: "Member's first name", example: 'Maria' },
    { name: 'courseName', description: 'Course name', example: 'Communication Skills' },
  ],
  'inactive-nudge': [
    { name: 'firstName', description: "Member's first name", example: 'Maria' },
  ],
  'weekly-recap': [
    { name: 'firstName', description: "Member's first name", example: 'Maria' },
    { name: 'recapSummary', description: 'Weekly activity summary HTML', example: '<p>You completed 2 lessons.</p>' },
  ],
  'placement-survey': [
    { name: 'firstName', description: "Member's first name", example: 'Maria' },
    { name: 'programName', description: 'Program name', example: 'Customer Service Specialist' },
    { name: 'surveyUrl', description: 'Link to the survey', example: 'https://www.workforceap.org/surveys/abc123' },
  ],
  'counselor-assigned': [
    { name: 'firstName', description: "Member's first name", example: 'Maria' },
    { name: 'counselorName', description: 'Counselor name', example: 'John Doe' },
  ],
  'job-approved': [
    { name: 'jobTitle', description: 'Job title', example: 'Software Engineer' },
    { name: 'companyName', description: 'Company name', example: 'TechCorp' },
  ],
  'job-rejected': [
    { name: 'jobTitle', description: 'Job title', example: 'Software Engineer' },
    { name: 'companyName', description: 'Company name', example: 'TechCorp' },
    { name: 'reason', description: 'Rejection reason', example: 'Position filled' },
  ],
  'new-application-alert': [
    { name: 'applicantName', description: 'Applicant full name', example: 'Maria Garcia' },
    { name: 'applicantEmail', description: 'Applicant email', example: 'maria@example.com' },
    { name: 'programInterest', description: 'Program of interest', example: 'Customer Service Specialist' },
  ],
  'admin-weekly-recap': [
    { name: 'newApplicants', description: 'Count of new applicants', example: '12' },
    { name: 'placements', description: 'Count of placements', example: '3' },
    { name: 'atRiskStudents', description: 'Count of at-risk students', example: '5' },
    { name: 'pendingApplications', description: 'Count of pending applications', example: '8' },
  ],
  'partner-weekly-digest': [
    { name: 'partnerName', description: 'Partner organization name', example: 'Goodwill Austin' },
    { name: 'weekLabel', description: 'Week date range label', example: 'May 5–11' },
  ],
  'invitation': [
    { name: 'inviterName', description: 'Person who sent the invite', example: 'John Doe' },
    { name: 'role', description: 'Role being invited to', example: 'Counselor' },
    { name: 'personalMessage', description: 'Optional personal message', example: 'Join our team!' },
  ],
  'employer-welcome': [
    { name: 'companyName', description: 'Company name', example: 'TechCorp' },
    { name: 'contactName', description: 'Contact person name', example: 'Jane Smith' },
  ],
  'at-risk-digest': [
    { name: 'dateLabel', description: 'Date label for the digest', example: 'May 13, 2026' },
    { name: 'criticalCount', description: 'Number of critical members', example: '2' },
    { name: 'highCount', description: 'Number of high-risk members', example: '5' },
    { name: 'mediumCount', description: 'Number of medium-risk members', example: '8' },
  ],
};

export function getDefaultSampleData(variables: string[]): Record<string, string> {
  const sample: Record<string, string> = {};
  for (const v of variables) {
    const def = Object.values(EMAIL_TEMPLATE_VARIABLES)
      .flat()
      .find((varDef) => varDef.name === v);
    sample[v] = def?.example ?? `{${v}}`;
  }
  return sample;
}

export function renderTemplate(
  template: { subject: string; body: string },
  variables: Record<string, string>
): { subject: string; html: string } {
  let subject = template.subject;
  let body = template.body;

  for (const [key, value] of Object.entries(variables)) {
    const placeholder = new RegExp(`\\{${key}\\}`, 'g');
    subject = subject.replace(placeholder, value);
    body = body.replace(placeholder, value);
  }

  const html = brandedEmailLayout({
    title: subject,
    bodyHtml: body,
  });

  return { subject, html };
}
