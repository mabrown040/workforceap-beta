-- Add ACCEPTED value to JobApplicationStatus enum
ALTER TYPE "JobApplicationStatus" ADD VALUE IF NOT EXISTS 'ACCEPTED' AFTER 'OFFER';
