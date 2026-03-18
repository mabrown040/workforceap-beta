/**
 * Job Readiness Checklist — 13 sections, WorkforceAP career coaching methodology.
 * Used by counselor view (editable) and member view (read-only).
 */

export interface ReadinessItem {
  key: string;
  label: string;
  type: 'checkbox' | 'text' | 'textarea' | 'sites';
  placeholder?: string;
  /** For type 'sites', list of site names (each becomes a checkbox) */
  sites?: string[];
}

export interface ReadinessSection {
  section: number;
  title: string;
  items: ReadinessItem[];
}

export const READINESS_SECTIONS: ReadinessSection[] = [
  {
    section: 1,
    title: 'Career Path Identified',
    items: [
      { key: 'career_path_selected', label: 'Client has selected a career path aligned with interests, strengths, and long-term goals', type: 'checkbox' },
      { key: 'cert_supports_path', label: 'Chosen certificate supports the selected career path and job target', type: 'checkbox' },
      { key: 'job_title_1', label: 'Top job title 1', type: 'text', placeholder: 'e.g. Help Desk Technician' },
      { key: 'job_title_2', label: 'Top job title 2', type: 'text', placeholder: 'e.g. IT Support Specialist' },
      { key: 'job_title_3', label: 'Top job title 3', type: 'text', placeholder: 'e.g. Junior Systems Administrator' },
      { key: 'industry_1', label: 'Top industry 1', type: 'text', placeholder: 'e.g. Healthcare IT' },
      { key: 'industry_2', label: 'Top industry 2', type: 'text', placeholder: 'e.g. Managed Services' },
      { key: 'industry_3', label: 'Top industry 3', type: 'text', placeholder: 'e.g. Financial Services' },
    ],
  },
  {
    section: 2,
    title: 'Elevator Pitch',
    items: [
      { key: 'elevator_pitch', label: 'Client has created a 10–20 second elevator message', type: 'textarea', placeholder: 'Paste the elevator pitch here...' },
    ],
  },
  {
    section: 3,
    title: 'Certificate Training Completed or In Progress',
    items: [
      { key: 'cert_identified', label: 'Identified certification or training critical to finding a job', type: 'checkbox' },
      { key: 'cert_provider_identified', label: 'Identified who offers the certification', type: 'checkbox' },
      { key: 'cert_completed', label: 'Client has successfully completed their professional certificate program', type: 'checkbox' },
      { key: 'cert_completed_when', label: 'When completed', type: 'text', placeholder: 'Date or timeframe' },
      { key: 'cert_confirmed', label: 'Completion confirmed with strong performance and understanding', type: 'checkbox' },
    ],
  },
  {
    section: 4,
    title: 'Practical Experience Gained',
    items: [
      { key: 'labs_completed', label: 'Client completed hands-on labs, simulations, or a capstone project', type: 'checkbox' },
      { key: 'volunteer_internship', label: 'Client has relevant volunteer, internship, or part-time experience (if applicable)', type: 'checkbox' },
    ],
  },
  {
    section: 5,
    title: 'Professional Resume Prepared',
    items: [
      { key: 'resume_updated', label: 'Client has an updated, professional 1–2 page tailored resume', type: 'checkbox' },
      { key: 'resume_highlights', label: 'Resume highlights certifications, technical and soft skills, and hands-on experience', type: 'checkbox' },
      { key: 'resume_professional', label: 'Resume status: Professional', type: 'checkbox' },
      { key: 'resume_who_when', label: 'If no: who will make it professional + by when', type: 'text', placeholder: 'e.g. Counselor by 4/15' },
    ],
  },
  {
    section: 6,
    title: 'WorkInTexas Profile Created',
    items: [
      { key: 'wit_profile', label: 'Client has created a WorkInTexas profile with complete and professional information', type: 'checkbox' },
      { key: 'wit_resume', label: 'Client has uploaded a professional resume to WorkInTexas', type: 'checkbox' },
      { key: 'wit_complete', label: 'Profile includes certifications, relevant skills, professional photo, and portfolio links (if applicable)', type: 'checkbox' },
    ],
  },
  {
    section: 7,
    title: 'LinkedIn Profile Created',
    items: [
      { key: 'linkedin_profile', label: 'Client has created a LinkedIn profile with complete and professional information', type: 'checkbox' },
      { key: 'linkedin_photo', label: 'Client has uploaded a professional photo', type: 'checkbox' },
      { key: 'linkedin_complete', label: 'Profile includes certifications, relevant skills, and portfolio links (if applicable)', type: 'checkbox' },
    ],
  },
  {
    section: 8,
    title: 'Resume Uploaded to Job Sites & Staffing Companies',
    items: [
      {
        key: 'job_sites',
        label: 'Resume uploaded to job sites',
        type: 'sites',
        sites: [
          'Workforce Solutions Capital Area',
          'WorkInTexas.com',
          'Indeed',
          'Staff Force Personnel',
          'Express Employment',
          'Reliable Staffing',
          'Peak Performers',
          'A List Staffing',
          'Onin Staffing',
          'The HT Group',
          'Labor Finders Austin',
          'The Blue Collar Recruiters',
          'AustinJobs.com',
          'City of Austin Jobs',
          'State of Texas Jobs',
          'Braintrust Austin Job Board',
          'Built in Austin',
          'LinkedIn Jobs',
          'SORCE App',
          'Glassdoor',
          'ZipRecruiter',
          'Monster',
          'Instawork',
          'Joobble',
        ],
      },
    ],
  },
  {
    section: 9,
    title: 'Portfolio Built (if applicable)',
    items: [
      { key: 'portfolio_digital', label: 'Client has a digital portfolio (for UX Design, Data Analytics, AI, etc.)', type: 'checkbox' },
      { key: 'portfolio_shareable', label: 'Portfolio is shareable via link (GitHub, Google Drive, etc.)', type: 'checkbox' },
      { key: 'portfolio_link', label: 'Portfolio link', type: 'text', placeholder: 'https://...' },
    ],
  },
  {
    section: 10,
    title: 'Interview Practice Completed',
    items: [
      { key: 'interview_technical', label: 'Client has reviewed the WorkforceAP Resource Folder with 20 Common Technical Questions', type: 'checkbox' },
      { key: 'interview_career', label: 'Client has reviewed 20 Common Career Questions (tailored to their career pathway)', type: 'checkbox' },
      { key: 'interview_mock', label: 'Client has completed at least one mock interview with a counselor', type: 'checkbox' },
      { key: 'interview_feedback', label: 'Client has received feedback and practiced behavioral and technical questions', type: 'checkbox' },
    ],
  },
  {
    section: 11,
    title: 'Job Applications Submitted',
    items: [
      { key: 'apps_weekly', label: 'Client is applying to 3–5 roles weekly', type: 'checkbox' },
      { key: 'apps_aligned', label: 'Jobs include internships, apprenticeships, or entry-level positions aligned with training', type: 'checkbox' },
      { key: 'apps_reviewed', label: 'Counselor has reviewed the quality and alignment of applications', type: 'checkbox' },
    ],
  },
  {
    section: 12,
    title: 'Professional Networking Initiated',
    items: [
      { key: 'networking_events', label: 'Client has attended career fairs, webinars, or industry meetups', type: 'checkbox' },
      { key: 'networking_linkedin', label: 'Client has connected with at least 5 professionals or mentors on LinkedIn', type: 'checkbox' },
      { key: 'networking_community', label: 'Client has been invited to WorkforceAP community activities', type: 'checkbox' },
    ],
  },
  {
    section: 13,
    title: 'Continued Learning & Growth',
    items: [
      { key: 'learning_trends', label: 'Client is keeping up with industry tools, trends, and optional certifications', type: 'checkbox' },
      { key: 'learning_upskill', label: 'Counselor has discussed future upskilling or continuing education plans', type: 'checkbox' },
    ],
  },
];

/** All item keys that are checkboxes (for progress calculation) */
export function getCheckboxItemKeys(): string[] {
  const keys: string[] = [];
  for (const sec of READINESS_SECTIONS) {
    for (const item of sec.items) {
      if (item.type === 'checkbox') keys.push(item.key);
      if (item.type === 'sites' && item.sites) {
        item.sites.forEach((s) => keys.push(`site_${s.replace(/\s+/g, '_').toLowerCase()}`));
      }
    }
  }
  return keys;
}

/** Get item key for a job site checkbox */
export function getJobSiteItemKey(siteName: string): string {
  return `site_${siteName.replace(/\s+/g, '_').toLowerCase()}`;
}

/** All item keys including job sites (for total count) */
export function getAllItemKeys(): string[] {
  const keys: string[] = [];
  for (const sec of READINESS_SECTIONS) {
    for (const item of sec.items) {
      if (item.type === 'checkbox') keys.push(item.key);
      if (item.type === 'text' || item.type === 'textarea') keys.push(item.key);
      if (item.type === 'sites' && item.sites) {
        item.sites.forEach((s) => keys.push(getJobSiteItemKey(s)));
      }
    }
  }
  return keys;
}
