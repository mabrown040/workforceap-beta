import { PrismaClient } from '@prisma/client';
import { DISCOVERED_COURSERA_PROGRAMS } from '../lib/content/courseraDiscoveredCatalog';
import { PROGRAMS } from '../lib/content/programs';

const prisma = new PrismaClient();

async function main() {
  const org = await prisma.organization.findFirst({
    where: { name: 'Workforce Advancement Project' },
  });

  if (!org) {
    console.error('Workforce Advancement Project org not found.');
    process.exit(1);
  }

  for (const program of PROGRAMS) {
    const discovered = DISCOVERED_COURSERA_PROGRAMS[program.slug];
    if (!discovered) continue;

    for (let i = 0; i < program.courses.length; i++) {
      const pCourse = program.courses[i];
      const dCourse = discovered.courses.find(c => c.slug === pCourse.slug || c.name === pCourse.name);
      
      let urlType = 'learn';
      
      await prisma.course.upsert({
        where: {
          organizationId_programSlug_courseSlug: {
            organizationId: org.id,
            programSlug: program.slug,
            courseSlug: pCourse.slug,
          }
        },
        update: {
          name: pCourse.name,
          estimatedHours: pCourse.estimatedHours,
          courseraCourseId: dCourse?.courseId,
          courseraSlug: dCourse?.slug,
          courseraUrlType: urlType,
          displayOrder: i,
        },
        create: {
          organizationId: org.id,
          programSlug: program.slug,
          courseSlug: pCourse.slug,
          name: pCourse.name,
          estimatedHours: pCourse.estimatedHours,
          courseraCourseId: dCourse?.courseId,
          courseraSlug: dCourse?.slug,
          courseraUrlType: urlType,
          displayOrder: i,
        }
      });
    }
  }

  console.log('Courses backfilled.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
