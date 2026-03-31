import type { PrismaClient } from '@prisma/client';

/**
 * Minimal O*NET rows + mappings so career recommendations work without calling the API first.
 * Run full sync from /admin/career-mappings or POST /api/admin/onet/sync when ONET_API_KEY is set.
 */
export async function seedOnetCareerData(prisma: PrismaClient): Promise<void> {
  const occupations: {
    code: string;
    title: string;
    description: string;
  }[] = [
    {
      code: '15-1232.00',
      title: 'Computer User Support Specialists',
      description:
        'Help people solve computer problems, set up software, and keep day-to-day technology running smoothly at work.',
    },
    {
      code: '15-1212.00',
      title: 'Information Security Analysts',
      description:
        'Protect systems and data from cyber threats, monitor security tools, and help organizations respond to incidents.',
    },
    {
      code: '15-1252.00',
      title: 'Software Developers',
      description:
        'Build and maintain applications, collaborate on features, and turn requirements into reliable software.',
    },
  ];

  for (const o of occupations) {
    await prisma.onetOccupation.upsert({
      where: { onetCode: o.code },
      create: {
        onetCode: o.code,
        title: o.title,
        description: o.description,
        isActive: true,
      },
      update: {
        title: o.title,
        description: o.description,
      },
    });
  }

  const mappings: {
    onetCode: string;
    programSlug: string;
    priority: number;
    experienceBand: 'beginner' | 'some_experience' | 'experienced';
    recommendationType: 'primary' | 'bridge' | 'stretch';
    whyRecommended: string;
  }[] = [
    {
      onetCode: '15-1232.00',
      programSlug: 'it-support-professional-certificate-ibm',
      priority: 1,
      experienceBand: 'beginner',
      recommendationType: 'primary',
      whyRecommended: 'Matches help-desk and support roles that start with strong customer service and troubleshooting.',
    },
    {
      onetCode: '15-1232.00',
      programSlug: 'comptia-a-professional-certificate',
      priority: 2,
      experienceBand: 'experienced',
      recommendationType: 'primary',
      whyRecommended: 'Deepens hardware and networking skills for broader IT support roles.',
    },
    {
      onetCode: '15-1212.00',
      programSlug: 'cybersecurity-professional-certificate-google',
      priority: 1,
      experienceBand: 'beginner',
      recommendationType: 'primary',
      whyRecommended: 'Aligns with entry-level security analyst skills employers ask for.',
    },
    {
      onetCode: '15-1212.00',
      programSlug: 'comptia-security-professional-certificate',
      priority: 2,
      experienceBand: 'some_experience',
      recommendationType: 'primary',
      whyRecommended: 'Builds on IT basics toward dedicated security credentials.',
    },
    {
      onetCode: '15-1252.00',
      programSlug: 'software-developer-professional-certificate-ibm',
      priority: 1,
      experienceBand: 'experienced',
      recommendationType: 'primary',
      whyRecommended: 'Supports application development roles with structured, hands-on projects.',
    },
    {
      onetCode: '15-1252.00',
      programSlug: 'ai-professional-developer-certificate-ibm',
      priority: 2,
      experienceBand: 'experienced',
      recommendationType: 'stretch',
      whyRecommended: 'Adds AI and modern software skills on top of core development.',
    },
  ];

  for (const m of mappings) {
    const existing = await prisma.careerProgramMapping.findFirst({
      where: {
        onetCode: m.onetCode,
        programSlug: m.programSlug,
        experienceBand: m.experienceBand,
      },
    });
    if (existing) {
      await prisma.careerProgramMapping.update({
        where: { id: existing.id },
        data: {
          priority: m.priority,
          recommendationType: m.recommendationType,
          whyRecommended: m.whyRecommended,
          isActive: true,
        },
      });
    } else {
      await prisma.careerProgramMapping.create({
        data: {
          onetCode: m.onetCode,
          programSlug: m.programSlug,
          priority: m.priority,
          experienceBand: m.experienceBand,
          recommendationType: m.recommendationType,
          whyRecommended: m.whyRecommended,
          isActive: true,
        },
      });
    }
  }

  await prisma.careerQuizRule.upsert({
    where: { ruleKey: 'boost_computers_q1' },
    create: {
      ruleKey: 'boost_computers_q1',
      inputSignal: { q1: 'computers' },
      boostOnetCode: '15-1232.00',
      weight: 2,
      reasonText: 'Extra weight when user selects technology interest.',
      isActive: true,
    },
    update: {
      weight: 2,
      isActive: true,
    },
  });

  console.log('Seeded O*NET occupation cache + career program mappings + quiz rules');
}
