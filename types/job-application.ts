import type {
  JobApplicationSource,
  JobApplicationStatus,
} from "@/lib/jobApplications/constants";

export type {
  JobApplicationSource,
  JobApplicationStatus,
} from "@/lib/jobApplications/constants";

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
