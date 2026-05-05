import { PrismaClient } from '@prisma/client';
import { getDiscoveredProgram, PROGRAMS } from '../lib/content/programs';

const prisma = new PrismaClient();

async function main() {
  const orgs = await prisma.organization.findMany({
    select: {
      id: true,
      slug: true,
      name: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  if (orgs.length === 0) {
    console.error('No organizations found.');
    process.exit(1);
  }

  let totalCoursesBackfilled = 0;

  for (const org of orgs) {
    let orgCoursesBackfilled = 0;

    for (const program of PROGRAMS) {
      const discovered = getDiscoveredProgram(program.slug);
      if (!discovered) continue;

      for (let i = 0; i < program.courses.length; i++) {
        const pCourse = program.courses[i];
        const dCourse = discovered.courses.find((course) => course.slug === pCourse.slug || course.name === pCourse.name);
        const urlType = 'learn';

        await prisma.course.upsert({
          where: {
            organizationId_programSlug_courseSlug: {
              organizationId: org.id,
              programSlug: program.slug,
              courseSlug: pCourse.slug,
            },
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
          },
        });

        orgCoursesBackfilled += 1;
        totalCoursesBackfilled += 1;
      }
    }

    console.log(`Backfilled ${orgCoursesBackfilled} courses for ${org.slug} (${org.name}).`);
  }

  console.log(`Courses backfilled across ${orgs.length} org(s): ${totalCoursesBackfilled}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
