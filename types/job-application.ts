export type JobApplicationStatus =
  | 'SAVED'
  | 'APPLIED'
  | 'PHONE_SCREEN'
  | 'INTERVIEWING'
  | 'OFFER'
  | 'ACCEPTED'
  | 'REJECTED';

export type JobApplicationSource =
  | 'INDEED'
  | 'LINKEDIN'
  | 'DIRECT'
  | 'OTHER';

export interface JobApplication {
  id: string;
  userId: string;
  company: string;
  role: string;
  status: JobApplicationStatus;
  appliedAt: Date | null;
  source: JobApplicationSource;
  nextInterviewDate: Date | null;
  notes: string | null;
  url: string | null;
  curatedJobId: string | null;
  createdAt: Date;
  updatedAt: Date;
}
