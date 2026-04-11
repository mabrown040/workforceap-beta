import { prisma } from '../db/prisma';
import { generateResumeBullet } from '../ai/proactiveResumeGenerator';
import { findBestEmployerMatch } from '../ai/proactiveJobMatcher';

export async function handleLearningCompletion(memberId: string, courseName: string) {
  // 1. Generate Resume Bullet
  const bullet = await generateResumeBullet(courseName);
  
  // 2. Append to user profile (Assuming a Resume or Profile model exists)
  // await prisma.resumeItem.create({ ... })
  console.log(`Generated bullet: ${bullet}`);

  // 3. Find Job Match
  const jobMatch = await findBestEmployerMatch(memberId, courseName);

  // 4. Create Next Best Action
  let title = 'Update your Resume';
  let desc = `You finished ${courseName}. We drafted a new resume bullet for you.`;
  let ctaLabel = 'Review Resume';
  let ctaHref = '/dashboard/resume';

  if (jobMatch) {
    title = `New Skill Match: ${jobMatch.title}`;
    desc = `Your new ${courseName} skills make you a strong fit for ${jobMatch.title} at one of our employer partners. Practice a 3-minute mock interview now.`;
    ctaLabel = 'Practice Interview';
    ctaHref = `/dashboard/ai-tools/interview-practice?jobId=${jobMatch.id}`;
  }

  await prisma.memberNextBestAction.create({
    data: {
      memberId,
      title,
      description: desc,
      ctaLabel,
      ctaHref,
      icon: 'auto_awesome',
      priority: 100,
    }
  });

  // 5. Trigger Email/SMS via Resend/Twilio here
}
