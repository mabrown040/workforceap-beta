export const JOB_APPLICATION_STAGES = ['APPLIED', 'INTERVIEWING', 'OFFER', 'CLOSED'] as const;
export type JobApplicationStage = (typeof JOB_APPLICATION_STAGES)[number];

export const JOB_APPLICATION_SOURCES = ['INDEED', 'LINKEDIN', 'DIRECT', 'OTHER'] as const;
export type JobApplicationSource = (typeof JOB_APPLICATION_SOURCES)[number];

export type JobApplicationDbStatus =
  | 'SAVED'
  | 'APPLIED'
  | 'PHONE_SCREEN'
  | 'INTERVIEWING'
  | 'OFFER'
  | 'ACCEPTED'
  | 'REJECTED';

export type JobApplicationKanbanItem = {
  id: string;
  status: JobApplicationDbStatus;
  createdAt: Date;
};

export function getJobApplicationStage(status: JobApplicationDbStatus): JobApplicationStage {
  switch (status) {
    case 'PHONE_SCREEN':
    case 'INTERVIEWING':
      return 'INTERVIEWING';
    case 'OFFER':
    case 'ACCEPTED':
      return 'OFFER';
    case 'REJECTED':
      return 'CLOSED';
    case 'SAVED':
    case 'APPLIED':
    default:
      return 'APPLIED';
  }
}

export function getDbStatusForStage(stage: JobApplicationStage): JobApplicationDbStatus {
  switch (stage) {
    case 'INTERVIEWING':
      return 'INTERVIEWING';
    case 'OFFER':
      return 'OFFER';
    case 'CLOSED':
      return 'REJECTED';
    case 'APPLIED':
    default:
      return 'APPLIED';
  }
}

export function buildJobApplicationKanban<T extends JobApplicationKanbanItem>(applications: T[]) {
  return applications.reduce<Record<JobApplicationStage, T[]>>(
    (acc, application) => {
      acc[getJobApplicationStage(application.status)].push(application);
      return acc;
    },
    {
      APPLIED: [],
      INTERVIEWING: [],
      OFFER: [],
      CLOSED: [],
    }
  );
}

export const JOB_APPLICATION_SOURCE_LABELS: Record<JobApplicationSource, string> = {
  INDEED: 'Indeed',
  LINKEDIN: 'LinkedIn',
  DIRECT: 'Direct',
  OTHER: 'Other',
};
