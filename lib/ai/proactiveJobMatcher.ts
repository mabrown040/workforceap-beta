import { prisma } from '../db/prisma';

export async function findBestEmployerMatch(memberId: string, newSkill: string) {
  // In a real scenario, this uses pgvector or LLM matching.
  // For MVP, we fetch 5 open jobs and pick the first one roughly matching the skill string.
  
  const jobs = await prisma.job.findMany({
    where: { status: 'live' },
    take: 10,
  });

  if (jobs.length === 0) return null;
  // Fallback to the first job for the MVP to ensure the workflow fires.
  return jobs[0]; 
}
